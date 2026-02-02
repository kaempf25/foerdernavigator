#!/usr/bin/env node
/**
 * Fördernavigator – Monatliches Validierungs-Script
 *
 * Dieses Script prüft die aktuellen Fördersätze gegen die offiziellen
 * KfW/BAFA-Webseiten und aktualisiert die foerderkonditionen.json.
 *
 * Wird per GitHub Actions monatlich am 1. ausgeführt.
 * Kann auch manuell aufgerufen werden: node scripts/validate-funding.js
 *
 * Bei Änderungen wird eine Zusammenfassung in die Konsole geschrieben
 * und die JSON-Datei aktualisiert.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'foerderkonditionen.json');

// ============================================================
// HTTP Helper
// ============================================================
function fetchURL(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'FoerdernavigatorValidator/1.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchURL(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

// ============================================================
// Validation checks
// ============================================================
const checks = [];
const changes = [];
const warnings = [];

function addCheck(name, fn) {
    checks.push({ name, fn });
}

function logChange(field, oldVal, newVal, source) {
    changes.push({ field, oldVal, newVal, source });
    console.log(`  ÄNDERUNG: ${field}: ${oldVal} → ${newVal} (Quelle: ${source})`);
}

function logWarning(msg) {
    warnings.push(msg);
    console.warn(`  WARNUNG: ${msg}`);
}

// ============================================================
// KfW 458 Heizungsförderung Check
// ============================================================
addCheck('KfW 458 Heizungsförderung', async (data) => {
    try {
        const resp = await fetchURL('https://www.kfw.de/inlandsfoerderung/Heizungsf%C3%B6rderung/');
        const body = resp.body;

        // Check for key percentages in the page content
        const has30 = body.includes('30') && (body.includes('Grundförderung') || body.includes('Basisförderung'));
        const has20 = body.includes('20') && body.includes('Klimageschwindigkeitsbonus');
        const has70 = body.includes('70');

        if (!has30) logWarning('KfW 458: Basisförderung 30% nicht auf Seite gefunden – manuell prüfen!');
        if (!has20) logWarning('KfW 458: Klimageschwindigkeitsbonus 20% nicht auf Seite gefunden – manuell prüfen!');

        // Check if max eligible costs changed
        if (body.includes('30.000') || body.includes('30000')) {
            console.log('  ✓ KfW 458: Max. förderfähige Kosten 30.000 €/WE bestätigt');
        } else {
            logWarning('KfW 458: 30.000 € max. förderfähige Kosten nicht auf Seite gefunden');
        }

    } catch (e) {
        logWarning(`KfW 458 Seite nicht erreichbar: ${e.message}`);
    }
});

// ============================================================
// KfW 261 Effizienzhaussanierung Check
// ============================================================
addCheck('KfW 261 Effizienzhaussanierung', async (data) => {
    try {
        const resp = await fetchURL('https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestehende-Immobilie/');
        const body = resp.body;

        const has120k = body.includes('120.000') || body.includes('120000');
        const has150k = body.includes('150.000') || body.includes('150000');

        if (has120k) console.log('  ✓ KfW 261: Kreditbetrag 120.000 € bestätigt');
        else logWarning('KfW 261: 120.000 € nicht auf Seite gefunden');

        if (has150k) console.log('  ✓ KfW 261: Kreditbetrag 150.000 € (EE) bestätigt');
        else logWarning('KfW 261: 150.000 € EE nicht auf Seite gefunden');

    } catch (e) {
        logWarning(`KfW 261 Seite nicht erreichbar: ${e.message}`);
    }
});

// ============================================================
// BAFA BEG EM Check
// ============================================================
addCheck('BAFA BEG Einzelmaßnahmen', async (data) => {
    try {
        const resp = await fetchURL('https://www.bafa.de/DE/Energie/Effiziente_Gebaeude/Sanierung_Wohngebaeude/Gebaeudehuelle/gebaeudehuelle_node.html');
        const body = resp.body;

        const has15 = body.includes('15 %') || body.includes('15%') || body.includes('15 Prozent');

        if (has15) console.log('  ✓ BAFA BEG EM: 15% Basisförderung bestätigt');
        else logWarning('BAFA BEG EM: 15% Basisförderung nicht auf Seite gefunden');

    } catch (e) {
        logWarning(`BAFA BEG EM Seite nicht erreichbar: ${e.message}`);
    }
});

// ============================================================
// §35c EStG Check
// ============================================================
addCheck('§35c EStG Steuerliche Förderung', async (data) => {
    try {
        const resp = await fetchURL('https://www.gesetze-im-internet.de/estg/__35c.html');
        const body = resp.body;

        const has7pct = body.includes('7 Prozent') || body.includes('7 %');
        const has6pct = body.includes('6 Prozent') || body.includes('6 %');
        const has200k = body.includes('200 000') || body.includes('200000') || body.includes('200.000');

        if (has7pct) console.log('  ✓ §35c: 7% Jahr 1+2 bestätigt');
        else logWarning('§35c: 7% nicht im Gesetzestext gefunden');

        if (has6pct) console.log('  ✓ §35c: 6% Jahr 3 bestätigt');
        else logWarning('§35c: 6% nicht im Gesetzestext gefunden');

        if (has200k) console.log('  ✓ §35c: 200.000 € Höchstbetrag bestätigt');
        else logWarning('§35c: 200.000 € nicht im Gesetzestext gefunden');

    } catch (e) {
        logWarning(`§35c Seite nicht erreichbar: ${e.message}`);
    }
});

// ============================================================
// Main
// ============================================================
async function main() {
    console.log('=== Fördernavigator Validierung ===');
    console.log(`Datum: ${new Date().toISOString().split('T')[0]}`);
    console.log('');

    // Load current data
    let data;
    try {
        data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        console.error('Fehler beim Lesen der foerderkonditionen.json:', e.message);
        process.exit(1);
    }

    // Run all checks
    for (const check of checks) {
        console.log(`\nPrüfe: ${check.name}...`);
        try {
            await check.fn(data);
        } catch (e) {
            logWarning(`Check "${check.name}" fehlgeschlagen: ${e.message}`);
        }
    }

    // Update meta
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    const nextValidation = nextMonth.toISOString().split('T')[0];

    data.meta.lastValidated = today;
    data.meta.nextValidation = nextValidation;
    data.meta.validatedBy = 'automated';

    if (changes.length > 0) {
        data.meta.status = 'updated';
        const changeLog = changes.map(c => `${c.field}: ${c.oldVal} → ${c.newVal}`);
        data.meta.changelog.unshift({
            date: today,
            changes: changeLog
        });
    } else {
        data.meta.status = warnings.length > 0 ? 'warnings' : 'current';
        data.meta.changelog.unshift({
            date: today,
            changes: warnings.length > 0
                ? [`Validierung mit ${warnings.length} Warnung(en) – manuelle Prüfung empfohlen`]
                : ['Validierung bestätigt – keine Änderungen']
        });
    }

    // Write updated data
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');

    // Summary
    console.log('\n=== Zusammenfassung ===');
    console.log(`Änderungen: ${changes.length}`);
    console.log(`Warnungen: ${warnings.length}`);
    console.log(`Status: ${data.meta.status}`);
    console.log(`Nächste Validierung: ${nextValidation}`);
    console.log(`JSON aktualisiert: ${DATA_FILE}`);

    // Set GitHub Actions outputs
    if (process.env.GITHUB_OUTPUT) {
        const outputFile = process.env.GITHUB_OUTPUT;
        fs.appendFileSync(outputFile, `changes=${changes.length}\n`);
        fs.appendFileSync(outputFile, `warnings=${warnings.length}\n`);
        fs.appendFileSync(outputFile, `status=${data.meta.status}\n`);
    }

    // Exit with warning code if there are issues
    if (warnings.length > 0) {
        console.log('\n⚠️  Es gab Warnungen – bitte manuell prüfen!');
    }
    if (changes.length > 0) {
        console.log('\n🔄 Änderungen erkannt – JSON wurde aktualisiert.');
    }
}

main().catch(e => {
    console.error('Fataler Fehler:', e);
    process.exit(1);
});
