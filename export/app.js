// ============================================================
// FUNDING DATA – loaded from JSON, with hardcoded fallback
// ============================================================
// JSON_URL: Change this to your GitHub Pages URL after deployment
const JSON_URL = 'data/foerderkonditionen.json';

// Default/fallback data (embedded so app works offline)
let FD = null; // Will be set after loading

const FALLBACK_DATA = {
    meta: { lastValidated: '2026-02-01', nextValidation: '2026-03-01', status: 'current' },
    kfw261: {
        maxCreditStandard: 120000, maxCreditEE: 150000,
        rates: { eh40:{base:20,ee:25}, eh55:{base:15,ee:20}, eh70:{base:10,ee:15}, eh85:{base:5,ee:10}, ehDenkmal:{base:5,ee:10} },
        bonuses: { isfp:5, wpb:10, serialMax:20 },
        baubegleitung: { efhZfhPerUnit:10000, mfhPerUnit:4000, rate:50 }
    },
    kfw458: {
        maxEligiblePerUnit: 30000, baseRate: 30,
        klimageschwindigkeitsbonus: { rate:20, eligibleOldHeating:['oil','coal','nightstorage','biomass_old','gas'] },
        einkommensbonus: { rate:30, incomeThreshold:40000 },
        maxTotalRate: 70
    },
    bafaBegEM: { baseRate:15, isfpBonus:5, maxEligiblePerUnitBase:30000, maxEligiblePerUnitISFP:60000 },
    isfp: { rate:50, costNetto:{ efh:1350, zfh:1350, mfh:2350 }, costBrutto:{ efh:1607, zfh:1607, mfh:2797 }, maxFunding:{ efh:650, zfh:650, mfh:850 } },
    baubegleitungEM: { rate:50, maxCostPerUnit:{ efhZfh:5000, mfh:2000 } },
    par35c: { year1Rate:7, year2Rate:7, year3Rate:6, maxYear1:14000, maxYear2:14000, maxYear3:12000, maxEligibleCost:200000, maxTotalReduction:40000 },
    kumulierung: { maxPublicFundingRate:60 },
    statePrograms: {
        bw:{name:'Baden-Württemberg',programs:[{name:'Klimaschutz-Plus / Kombi-Darlehen Wohnen',desc:'Zusätzlicher BW-Bonus bis 25% auf Gebäudehülle.',bonusPercent:5,maxBonus:5000,applies:'envelope'}]},
        by:{name:'Bayern',programs:[{name:'10.000-Häuser-Programm',desc:'Zusatzförderung für Heizungstausch und Gebäudehülle.',bonusPercent:3,maxBonus:3000,applies:'all'}]},
        nw:{name:'Nordrhein-Westfalen',programs:[{name:'NRW.BANK Wohneigentum modernisieren',desc:'Zinsgünstiges Darlehen. Kombinierbar mit BEG.',bonusPercent:0,maxBonus:0,applies:'all',loanOnly:true,loanDesc:'Zinsgünstiges Darlehen bis 150.000 €'}]},
        he:{name:'Hessen',programs:[{name:'WIBank Energetische Förderung',desc:'Modernisierungsfahrplan-Bonus +10%.',bonusPercent:3,maxBonus:4000,applies:'all'}]},
        ni:{name:'Niedersachsen',programs:[{name:'NBank Klimaschutz & Energieeffizienz',desc:'Für Wohngebäude zinsgünstige Darlehen.',bonusPercent:0,maxBonus:0,applies:'all',loanOnly:true,loanDesc:'Zinsgünstiges Darlehen'}]},
        sh:{name:'Schleswig-Holstein',programs:[{name:'IB.SH Energetische Sanierung',desc:'Ergänzungsdarlehen.',bonusPercent:0,maxBonus:0,applies:'all',loanOnly:true,loanDesc:'Ergänzungsdarlehen'}]},
        hh:{name:'Hamburg',programs:[{name:'IFB Hamburg Energetische Modernisierung',desc:'Zuschüsse und Darlehen.',bonusPercent:4,maxBonus:5000,applies:'all'}]},
        be:{name:'Berlin',programs:[{name:'IBB Energetische Gebäudesanierung',desc:'Zinsgünstige Darlehen.',bonusPercent:0,maxBonus:0,applies:'all',loanOnly:true,loanDesc:'Zinsgünstiges Darlehen'}]}
    }
};

// Load JSON data
async function loadFundingData() {
    try {
        const resp = await fetch(JSON_URL);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        FD = await resp.json();
        console.log('Förderdaten geladen:', FD.meta.lastValidated);
    } catch (e) {
        console.warn('Förderdaten-JSON nicht verfügbar, verwende Fallback-Daten.', e);
        FD = FALLBACK_DATA;
    }
    updateValidationDisplay();
}

function updateValidationDisplay() {
    const badge = document.getElementById('validationBadge');
    if (!badge || !FD) return;
    const lastVal = FD.meta.lastValidated || '2026-02-01';
    const nextVal = FD.meta.nextValidation || '?';
    badge.textContent = `Letzte Validierung: ${formatDate(lastVal)} · BEG / KfW / BAFA`;
    // Check staleness (>45 days)
    const daysSince = (Date.now() - new Date(lastVal).getTime()) / 86400000;
    if (daysSince > 45) {
        badge.style.background = 'rgba(243,156,18,0.3)';
        badge.textContent += ' ⚠️ Prüfung überfällig';
    }
}

function formatDate(d) {
    if (!d) return '–';
    const p = d.split('-');
    return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : d;
}

// ============================================================
// STATE
// ============================================================
const state = {
    buildingType: 'efh',
    ownership: 'owner',
    buildYear: '1957-1978',
    bundesland: 'nw',
    priorRenovation: 'none',
    currentHeating: 'gas',
    measures: [],
    renovGoal: 'einzeln',
    ehStandard: 'eh55',
    eeClass: true,
    isfp: true,
    income: 'over40k',
    unitCount: 1,
    weEigengenutzt: 1,
    weVermietet: 0,
    costs: {},
    // Geometry
    geo: { breite: 10, laenge: 12, geschosse: 2, flaeche: 204, fassade: 190, dach: 146, keller: 120, fenster: 19 },
    // Detail options
    details: { haustuer: false, hp_puffer: false, hp_fussbodenheizung: false }
};

const measureLabels = {
    wall_insulation: 'Fassadendämmung',
    roof_insulation: 'Dachdämmung',
    basement_insulation: 'Keller-/Bodenplattendämmung',
    windows: 'Fenster & Türen',
    heat_pump: 'Wärmepumpe',
    biomass: 'Biomasse-Heizung',
    solar_thermal: 'Solarthermie',
    district_heating: 'Fernwärme-Anschluss',
    ventilation: 'Lüftungsanlage',
    heating_optimization: 'Heizungsoptimierung',
    smart_home: 'Gebäudeautomation'
};

// Alle Default-Kosten BRUTTO (inkl. 19% MwSt)
const defaultCosts = {
    wall_insulation: 33900, roof_insulation: 13900, basement_insulation: 5400,
    windows: 17850, heat_pump: 33320, biomass: 26180, solar_thermal: 9520,
    district_heating: 14280, ventilation: 9520, heating_optimization: 3570, smart_home: 4760
};

const heatingMeasures = ['heat_pump', 'biomass', 'solar_thermal', 'district_heating'];
const envelopeMeasures = ['wall_insulation', 'roof_insulation', 'basement_insulation', 'windows'];
const techMeasures = ['ventilation', 'heating_optimization', 'smart_home'];

// ============================================================
// UI FUNCTIONS
// ============================================================
function selectOption(el) {
    const field = el.dataset.field;
    const value = el.dataset.value;
    el.parentElement.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    state[field] = value;
    updateState();
}

function toggleMeasure(el) {
    const measure = el.dataset.measure;
    el.classList.toggle('selected');
    if (el.classList.contains('selected')) {
        if (!state.measures.includes(measure)) state.measures.push(measure);
    } else {
        state.measures = state.measures.filter(m => m !== measure);
    }
    updateState();
}

function toggleISFP(el, val) {
    state.isfp = val;
    document.getElementById('toggleISFP_yes').classList.toggle('active', val);
    document.getElementById('toggleISFP_no').classList.toggle('active', !val);
}

function toggleEE(el, val) {
    state.eeClass = val;
    document.getElementById('toggleEE_yes').classList.toggle('active', val);
    document.getElementById('toggleEE_no').classList.toggle('active', !val);
}

function updateState() {
    state.buildYear = document.getElementById('buildYear').value;
    state.bundesland = document.getElementById('bundesland').value;
    state.currentHeating = document.getElementById('currentHeating').value;
    state.income = document.getElementById('income').value;
    state.ehStandard = document.getElementById('ehStandard').value;
    state.unitCount = state.buildingType === 'mfh' ?
        parseInt(document.getElementById('unitCount').value) || 4 :
        (state.buildingType === 'zfh' ? 2 : 1);

    // WE-Aufteilung eigengenutzt/vermietet
    const showWeSplit = state.unitCount > 1;
    document.getElementById('we-split-field').style.display = showWeSplit ? 'block' : 'none';
    // Bei EFH: ownership bestimmt alles
    if (!showWeSplit) {
        state.weEigengenutzt = state.ownership === 'owner' ? 1 : 0;
        state.weVermietet = state.ownership === 'owner' ? 0 : 1;
        document.getElementById('ownership-field').style.display = 'block';
    } else {
        state.weEigengenutzt = Math.min(parseInt(document.getElementById('weEigengenutzt').value) || 0, state.unitCount);
        state.weVermietet = state.unitCount - state.weEigengenutzt;
        document.getElementById('weVermietet').value = state.weVermietet;
        // ownership leitet sich ab
        state.ownership = state.weEigengenutzt > 0 ? 'owner' : 'landlord';
        document.getElementById('ownership-field').style.display = 'none';
    }

    // Geometry (calculated from breite × länge × geschosse)
    calcGeometry();

    // Show/hide MFH units
    document.getElementById('mfh-units-field').style.display = state.buildingType === 'mfh' ? 'block' : 'none';

    // Show/hide Effizienzhaus options
    document.getElementById('effizienzhaus-options').style.display = state.renovGoal === 'effizienzhaus' ? 'block' : 'none';

    // Show/hide income bonus field (only for owner + heating)
    const hasHeating = state.measures.some(m => heatingMeasures.includes(m));
    document.getElementById('income-field').style.display = (state.ownership === 'owner' && hasHeating) ? 'block' : 'none';

    // Show/hide detail panels
    document.querySelectorAll('.measure-detail').forEach(el => {
        const measure = el.id.replace('detail_', '');
        el.style.display = state.measures.includes(measure) ? 'block' : 'none';
    });

    // Fassadendämmung: Materialien + Dicken initialisieren
    if (state.measures.includes('wall_insulation')) {
        updateWallMaterialOptions();
        updateWallThicknessOptions();
    }

    // Kellerdämmung: Optionen + Materialien initialisieren
    if (state.measures.includes('basement_insulation')) {
        updateBasementOptions();
        updateBasementMaterialOptions();
    }

    // Recalculate costs based on details
    recalcCosts();

    // Generate cost inputs
    generateCostInputs();
}

// ============================================================
// GEOMETRY ESTIMATION FROM BREITE × LÄNGE × GESCHOSSE
// ============================================================
function calcGeometry() {
    const b = parseFloat(document.getElementById('geoBreite')?.value) || 10;
    const l = parseFloat(document.getElementById('geoLaenge')?.value) || 12;
    const g = parseInt(document.getElementById('geoGeschosse')?.value) || 2;
    const geschosshoehe = 2.7; // typische Geschosshöhe
    const dachNeigung = 35; // Grad, typisches Satteldach

    // Grundfläche
    const grundflaeche = b * l;

    // Wohnfläche: Grundfläche × Geschosse × 0.85 (Abzug Wände, Treppen)
    const flaeche = Math.round(grundflaeche * g * 0.85);

    // Fassadenfläche: Umfang × Gesamthöhe – ca. 20% Fensteranteil
    const umfang = 2 * (b + l);
    const gesamthoehe = g * geschosshoehe;
    const fassadeBrutto = umfang * gesamthoehe;
    const fensterAnteil = 0.20;
    const fassade = Math.round(fassadeBrutto * (1 - fensterAnteil));

    // Dachfläche: Satteldach mit Neigung
    const dachTiefe = (b / 2) / Math.cos(dachNeigung * Math.PI / 180);
    const dach = Math.round(2 * dachTiefe * l);

    // Kellerdecke ≈ Grundfläche
    const keller = Math.round(grundflaeche);

    // Fensteranzahl: ca. 1 Fenster pro 10-12 m² Wohnfläche
    const fenster = Math.round(flaeche / 11);

    state.geo.breite = b;
    state.geo.laenge = l;
    state.geo.geschosse = g;
    state.geo.flaeche = flaeche;
    state.geo.fassade = fassade;
    state.geo.dach = dach;
    state.geo.keller = keller;
    state.geo.fenster = fenster;

    // Schätzung anzeigen
    const el = document.getElementById('geoEstimate');
    if (el) {
        el.innerHTML = `<strong>Geschätzte Gebäudedaten:</strong> ca. ${formatNumber(flaeche)} m² Wohnfläche · ${formatNumber(fassade)} m² Fassade · ${formatNumber(dach)} m² Dachfläche · ${formatNumber(keller)} m² Kellerdecke · ca. ${fenster} Fenster`;
    }
}

// ============================================================
// MATERIAL-DATEN MIT LAMBDA-WERTEN UND AUSFÜHRUNGSART-ZUORDNUNG
// ============================================================
const WALL_MATERIALS = {
    // WDVS-Materialien (Plattenware)
    eps:          { label: 'EPS (Styropor) – WLG 035, Standard', lambda: 0.035, types: ['wdvs', 'innendaemmung'] },
    eps032:       { label: 'EPS (Styropor) – WLG 032, verbessert', lambda: 0.032, types: ['wdvs', 'innendaemmung'] },
    mineralwolle: { label: 'Mineralwolle – WLG 035, nicht brennbar', lambda: 0.035, types: ['wdvs', 'vhf', 'innendaemmung'] },
    mw032:        { label: 'Mineralwolle – WLG 032, verbessert', lambda: 0.032, types: ['wdvs', 'vhf', 'innendaemmung'] },
    pur:          { label: 'PUR/PIR – WLG 024, schlank', lambda: 0.024, types: ['wdvs', 'vhf', 'innendaemmung'] },
    holzfaser:    { label: 'Holzfaserplatte – WLG 040, ökologisch', lambda: 0.040, types: ['wdvs', 'vhf', 'innendaemmung'] },
    holzfaser045: { label: 'Holzfaserplatte – WLG 045, Standard', lambda: 0.045, types: ['wdvs', 'vhf'] },
    resol:        { label: 'Resolhartschaum – WLG 021, sehr schlank', lambda: 0.021, types: ['wdvs'] },
    resol023:     { label: 'Resolhartschaum – WLG 023', lambda: 0.023, types: ['wdvs'] },
    // Kerndämmung-Materialien (Einblasdämmstoffe) – nur λ ≤ 0,035 (BEG-förderfähig)
    eps_granulat:   { label: 'EPS-Granulat – WLG 033, hydrophob', lambda: 0.033, types: ['kerndaemmung'] },
    glaswolle_gran: { label: 'Glaswolle-Granulat (Supafil) – WLG 034', lambda: 0.034, types: ['kerndaemmung'] },
    pur_schaum:     { label: 'PUR-Ortschaum – WLG 028, beste Dämmwirkung', lambda: 0.028, types: ['kerndaemmung'] }
};

// ============================================================
// TYPISCHE WANDAUFBAUTEN NACH BAUJAHR (für U-Wert-Berechnung)
// ============================================================
// Wärmeübergangswiderstände nach DIN EN ISO 6946
const Rsi = 0.13;  // Innenseite (horizontaler Wärmestrom)
const Rse = 0.04;  // Außenseite (horizontaler Wärmestrom)

// Typische Bestandswände nach Baujahr (ohne Dämmung)
// R_wand = Wärmewiderstand der Wandkonstruktion ohne Rsi/Rse
const WALL_BY_BUILDYEAR = {
    'pre1957': {
        name: 'Vollziegelmauerwerk 38 cm',
        R_wand: 0.54,
        U_bestand: 1.41,
        beschreibung: 'Typisch: Vollziegel 38 cm, verputzt',
        schichten: [
            { name: 'Innenputz', dicke: 15, lambda: 0.70, R: 0.02 },
            { name: 'Vollziegelmauerwerk', dicke: 380, lambda: 0.70, R: 0.54 },
            { name: 'Außenputz', dicke: 20, lambda: 0.87, R: 0.02 }
        ]
    },
    '1957-1978': {
        name: 'Zweischaliges Mauerwerk mit Luftschicht',
        R_wand: 0.65,
        R_luftschicht: 0.18,
        U_bestand: 1.22,
        beschreibung: 'Typisch: Klinker + 40-60mm Luftschicht + Hochlochziegel, verputzt',
        schichten: [
            { name: 'Innenputz', dicke: 15, lambda: 0.70, R: 0.02 },
            { name: 'Hochlochziegel (Innenschale)', dicke: 175, lambda: 0.50, R: 0.35 },
            { name: 'Luftschicht (ungedämmt)', dicke: 50, lambda: null, R: 0.18 },
            { name: 'Klinker-Vormauerwerk (Außenschale)', dicke: 115, lambda: 0.96, R: 0.12 }
        ]
    },
    '1979-1994': {
        name: 'Mauerwerk mit leichter Dämmung',
        R_wand: 1.10,
        U_bestand: 0.79,
        beschreibung: 'Typisch: Mauerwerk + 40-60mm Dämmung (1. WSchV)',
        schichten: [
            { name: 'Innenputz', dicke: 15, lambda: 0.70, R: 0.02 },
            { name: 'Hochlochziegel', dicke: 240, lambda: 0.50, R: 0.48 },
            { name: 'Bestandsdämmung (PS/MW)', dicke: 50, lambda: 0.04, R: 1.25 },
            { name: 'Putzträgerplatte + Außenputz', dicke: 15, lambda: 0.87, R: 0.02 }
        ]
    },
    '1995-2001': {
        name: 'Mauerwerk mit Dämmung (2. WSchV)',
        R_wand: 1.85,
        U_bestand: 0.50,
        beschreibung: 'Typisch: Mauerwerk + 80-100mm Dämmung (2. WSchV)',
        schichten: [
            { name: 'Innenputz', dicke: 15, lambda: 0.70, R: 0.02 },
            { name: 'Hochlochziegel', dicke: 240, lambda: 0.50, R: 0.48 },
            { name: 'Bestandsdämmung (EPS)', dicke: 80, lambda: 0.04, R: 2.00 },
            { name: 'Armierungsschicht + Oberputz', dicke: 10, lambda: 0.87, R: 0.01 }
        ]
    },
    '2002-2014': {
        name: 'Mauerwerk mit EnEV-Dämmung',
        R_wand: 2.70,
        U_bestand: 0.35,
        beschreibung: 'Typisch: Mauerwerk + 120-140mm Dämmung (EnEV)',
        schichten: [
            { name: 'Innenputz', dicke: 15, lambda: 0.70, R: 0.02 },
            { name: 'Hochlochziegel', dicke: 240, lambda: 0.50, R: 0.48 },
            { name: 'Bestandsdämmung (EPS)', dicke: 120, lambda: 0.035, R: 3.43 },
            { name: 'Armierungsschicht + Oberputz', dicke: 10, lambda: 0.87, R: 0.01 }
        ]
    },
    'post2014': {
        name: 'Mauerwerk mit GEG-Dämmung',
        R_wand: 4.50,
        U_bestand: 0.21,
        beschreibung: 'Typisch: Mauerwerk + 160-200mm Dämmung (EnEV 2016/GEG)',
        schichten: [
            { name: 'Innenputz', dicke: 15, lambda: 0.70, R: 0.02 },
            { name: 'Hochlochziegel', dicke: 240, lambda: 0.50, R: 0.48 },
            { name: 'Bestandsdämmung (EPS 032)', dicke: 180, lambda: 0.032, R: 5.63 },
            { name: 'Armierungsschicht + Oberputz', dicke: 10, lambda: 0.87, R: 0.01 }
        ]
    }
};

// WDVS-Systemaufbau (zusätzliche Schichten bei Außendämmung)
const WDVS_SYSTEM = [
    { name: 'Klebemörtel', dicke: 5 },
    { name: 'Dämmplatte', dicke: null }, // wird dynamisch gesetzt
    { name: 'Armierungsgewebe + Armierungsmörtel', dicke: 5 },
    { name: 'Oberputz (mineralisch/Silikonharz)', dicke: 3 }
];

// VHF-Systemaufbau (Vorgehängte hinterlüftete Fassade)
const VHF_SYSTEM = [
    { name: 'Unterkonstruktion (Alu/Holz)', dicke: 30 },
    { name: 'Mineralwolle-Dämmung', dicke: null }, // wird dynamisch gesetzt
    { name: 'Winddichtungsbahn', dicke: 1 },
    { name: 'Hinterlüftung', dicke: 30 },
    { name: 'Fassadenbekleidung (Faserzement/Holz/Metall)', dicke: 10 }
];

// Innendämmung-Systemaufbau
const INNENDAEMMUNG_SYSTEM = [
    { name: 'Klebemörtel', dicke: 3 },
    { name: 'Calciumsilikat-/Holzfaserplatte', dicke: null }, // wird dynamisch gesetzt
    { name: 'Feinspachtel + Armierung', dicke: 3 },
    { name: 'Innenputz/Anstrich', dicke: 2 }
];

// Typische Dachaufbauten nach Baujahr
const ROOF_BY_BUILDYEAR = {
    'pre1957':    { name: 'Dachstuhl ohne Dämmung', R_dach: 0.20, U_bestand: 2.70 },
    '1957-1978':  { name: 'Dach mit minimaler Dämmung', R_dach: 0.50, U_bestand: 1.49 },
    '1979-1994':  { name: 'Dach mit 60-80mm Dämmung', R_dach: 2.00, U_bestand: 0.46 },
    '1995-2001':  { name: 'Dach mit 100-120mm Dämmung', R_dach: 3.20, U_bestand: 0.30 },
    '2002-2014':  { name: 'Dach mit 160-180mm Dämmung', R_dach: 5.00, U_bestand: 0.19 },
    'post2014':   { name: 'Dach mit 200-240mm Dämmung', R_dach: 6.50, U_bestand: 0.15 }
};

// Typische Kellerdecken nach Baujahr
const BASEMENT_BY_BUILDYEAR = {
    'pre1957':    { name: 'Kappendecke/Holzbalken', R_decke: 0.30, U_bestand: 2.13 },
    '1957-1978':  { name: 'Betondecke ohne Dämmung', R_decke: 0.17, U_bestand: 2.94 },
    '1979-1994':  { name: 'Betondecke mit 30-40mm Dämmung', R_decke: 1.00, U_bestand: 0.85 },
    '1995-2001':  { name: 'Betondecke mit 50-60mm Dämmung', R_decke: 1.60, U_bestand: 0.56 },
    '2002-2014':  { name: 'Betondecke mit 80-100mm Dämmung', R_decke: 2.70, U_bestand: 0.35 },
    'post2014':   { name: 'Betondecke mit 120mm+ Dämmung', R_decke: 3.50, U_bestand: 0.27 }
};

// Oberste Geschossdecke nach Baujahr
const CEILING_BY_BUILDYEAR = {
    'pre1957':    { name: 'Holzbalkendecke ohne Dämmung', R_decke: 0.25, U_bestand: 2.38 },
    '1957-1978':  { name: 'Betondecke ohne Dämmung', R_decke: 0.15, U_bestand: 3.13 },
    '1979-1994':  { name: 'Decke mit 60-80mm Dämmung', R_decke: 2.00, U_bestand: 0.46 },
    '1995-2001':  { name: 'Decke mit 100-120mm Dämmung', R_decke: 3.20, U_bestand: 0.30 },
    '2002-2014':  { name: 'Decke mit 140-160mm Dämmung', R_decke: 4.50, U_bestand: 0.21 },
    'post2014':   { name: 'Decke mit 180-200mm Dämmung', R_decke: 5.50, U_bestand: 0.18 }
};

/**
 * Berechnet den U-Wert nach Sanierung
 * @param {number} R_bestand - Wärmewiderstand der Bestandskonstruktion (ohne Rsi/Rse)
 * @param {number} d_daemmung - Dämmstoffdicke in Metern
 * @param {number} lambda - Wärmeleitfähigkeit des Dämmstoffs in W/(m·K)
 * @param {boolean} isKerndaemmung - Bei Kerndämmung wird Luftschicht ersetzt
 * @param {number} R_luftschicht - Wärmewiderstand der ersetzten Luftschicht (nur bei Kerndämmung)
 * @returns {object} - { U_alt, U_neu, R_gesamt, verbesserung }
 */
function calcUValue(R_bestand, d_daemmung, lambda, isKerndaemmung = false, R_luftschicht = 0.18) {
    const R_daemmung = d_daemmung / lambda;

    let R_gesamt_alt = Rsi + R_bestand + Rse;
    let R_gesamt_neu;

    if (isKerndaemmung) {
        // Bei Kerndämmung: Luftschicht wird durch Dämmung ersetzt
        R_gesamt_neu = Rsi + (R_bestand - R_luftschicht) + R_daemmung + Rse;
    } else {
        // Bei Außen-/Innendämmung: Dämmung wird hinzugefügt
        R_gesamt_neu = Rsi + R_bestand + R_daemmung + Rse;
    }

    const U_alt = 1 / R_gesamt_alt;
    const U_neu = 1 / R_gesamt_neu;
    const verbesserung = Math.round((1 - U_neu / U_alt) * 100);

    return {
        U_alt: Math.round(U_alt * 100) / 100,
        U_neu: Math.round(U_neu * 100) / 100,
        R_gesamt: Math.round(R_gesamt_neu * 100) / 100,
        R_daemmung: Math.round(R_daemmung * 100) / 100,
        verbesserung: verbesserung
    };
}

// Hilfsfunktion: Schichtaufbau als HTML-Tabelle generieren
function renderSchichtaufbau(schichten, titel, highlight = null) {
    let html = `<div style="margin-bottom:0.8rem;"><strong>${titel}</strong></div>`;
    html += `<table style="width:100%; border-collapse:collapse; font-size:0.75rem; margin-bottom:0.5rem;">`;
    html += `<tr style="background:#e8f5e9;"><th style="padding:4px 6px; text-align:left; border:1px solid #ddd;">Schicht</th><th style="padding:4px 6px; text-align:right; border:1px solid #ddd;">Dicke</th><th style="padding:4px 6px; text-align:right; border:1px solid #ddd;">R-Wert</th></tr>`;

    // Rsi (Wärmeübergang innen)
    html += `<tr style="background:#f0f0f0;"><td style="padding:3px 6px; border:1px solid #ddd; font-style:italic;">Rsi (Wärmeübergang innen)</td><td style="padding:3px 6px; text-align:right; border:1px solid #ddd;">–</td><td style="padding:3px 6px; text-align:right; border:1px solid #ddd;">0,13</td></tr>`;

    let R_summe = Rsi;
    schichten.forEach((s, i) => {
        const isHighlight = highlight && s.name.includes(highlight);
        const bgColor = isHighlight ? '#fff3cd' : (i % 2 === 0 ? '#fff' : '#fafafa');
        const R_val = s.R ? s.R.toFixed(2).replace('.', ',') : '–';
        const dicke = s.dicke ? `${s.dicke} mm` : '–';
        R_summe += s.R || 0;
        html += `<tr style="background:${bgColor};${isHighlight ? 'font-weight:600;' : ''}">`;
        html += `<td style="padding:3px 6px; border:1px solid #ddd;">${s.name}</td>`;
        html += `<td style="padding:3px 6px; text-align:right; border:1px solid #ddd;">${dicke}</td>`;
        html += `<td style="padding:3px 6px; text-align:right; border:1px solid #ddd;">${R_val}</td>`;
        html += `</tr>`;
    });

    // Rse (Wärmeübergang außen)
    html += `<tr style="background:#f0f0f0;"><td style="padding:3px 6px; border:1px solid #ddd; font-style:italic;">Rse (Wärmeübergang außen)</td><td style="padding:3px 6px; text-align:right; border:1px solid #ddd;">–</td><td style="padding:3px 6px; text-align:right; border:1px solid #ddd;">0,04</td></tr>`;
    R_summe += Rse;

    // Summenzeile
    const U_wert = (1 / R_summe).toFixed(2).replace('.', ',');
    html += `<tr style="background:#1a6b3c; color:white; font-weight:600;"><td style="padding:4px 6px; border:1px solid #ddd;">Gesamt</td><td style="padding:4px 6px; text-align:right; border:1px solid #ddd;"></td><td style="padding:4px 6px; text-align:right; border:1px solid #ddd;">R=${R_summe.toFixed(2).replace('.', ',')} → U=${U_wert}</td></tr>`;
    html += `</table>`;
    return html;
}

// Schichtaufbau nach Sanierung generieren
function getSchichtenNachher(wallData, wType, wThick, matData, lambda) {
    const bestandSchichten = wallData.schichten || [];
    let neuSchichten = [];

    if (wType === 'kerndaemmung') {
        // Bei Kerndämmung: Luftschicht wird durch Dämmung ersetzt
        bestandSchichten.forEach(s => {
            if (s.name.includes('Luftschicht')) {
                const cavity = parseInt(document.getElementById('wall_cavity')?.value) || 60;
                const R_daemm = (cavity / 1000) / lambda;
                neuSchichten.push({
                    name: `Kerndämmung (${matData ? matData.label.split('–')[0].trim() : 'Dämmstoff'})`,
                    dicke: cavity,
                    lambda: lambda,
                    R: R_daemm
                });
            } else {
                neuSchichten.push({...s});
            }
        });
    } else if (wType === 'wdvs') {
        // WDVS: Komplettes System auf Außenseite
        const R_daemm = (wThick / 1000) / lambda;
        // Innere Schichten beibehalten (ohne Außenputz)
        bestandSchichten.forEach((s, i) => {
            if (i < bestandSchichten.length - 1) { // Letzter ist meist Außenputz
                neuSchichten.push({...s});
            }
        });
        // WDVS-Systemaufbau hinzufügen
        neuSchichten.push({ name: 'Klebemörtel', dicke: 5, lambda: 0.87, R: 0.01 });
        neuSchichten.push({
            name: `Dämmplatte (${matData ? matData.label.split('–')[0].trim() : 'EPS'})`,
            dicke: wThick,
            lambda: lambda,
            R: R_daemm
        });
        neuSchichten.push({ name: 'Armierungsgewebe + Armierungsmörtel', dicke: 5, lambda: 0.87, R: 0.01 });
        neuSchichten.push({ name: 'Oberputz (mineralisch/Silikonharz)', dicke: 3, lambda: 0.87, R: 0.00 });
    } else if (wType === 'vhf') {
        // VHF: Vorgehängte hinterlüftete Fassade
        const R_daemm = (wThick / 1000) / lambda;
        bestandSchichten.forEach((s, i) => {
            if (i < bestandSchichten.length - 1) {
                neuSchichten.push({...s});
            }
        });
        neuSchichten.push({ name: 'Unterkonstruktion (Alu/Holz)', dicke: 30, lambda: null, R: 0.00 });
        neuSchichten.push({
            name: `Mineralwolle-Dämmung (${matData ? matData.label.split('–')[0].trim() : 'MW'})`,
            dicke: wThick,
            lambda: lambda,
            R: R_daemm
        });
        neuSchichten.push({ name: 'Winddichtungsbahn', dicke: 1, lambda: null, R: 0.00 });
        neuSchichten.push({ name: 'Hinterlüftung (Luftschicht)', dicke: 30, lambda: null, R: 0.00 }); // bewegt, zählt nicht
        neuSchichten.push({ name: 'Fassadenbekleidung', dicke: 10, lambda: null, R: 0.00 });
    } else if (wType === 'innendaemmung') {
        // Innendämmung: System auf Innenseite
        const R_daemm = (wThick / 1000) / lambda;
        // Erst Innendämmung, dann Bestand
        neuSchichten.push({ name: 'Innenputz/Anstrich (neu)', dicke: 2, lambda: 0.70, R: 0.00 });
        neuSchichten.push({ name: 'Feinspachtel + Armierung', dicke: 3, lambda: 0.87, R: 0.00 });
        neuSchichten.push({
            name: `Innendämmplatte (${matData ? matData.label.split('–')[0].trim() : 'CaSi'})`,
            dicke: wThick,
            lambda: lambda,
            R: R_daemm
        });
        neuSchichten.push({ name: 'Klebemörtel', dicke: 3, lambda: 0.87, R: 0.00 });
        // Bestand ohne alten Innenputz
        bestandSchichten.forEach((s, i) => {
            if (i > 0) { // Ersten (Innenputz) überspringen
                neuSchichten.push({...s});
            }
        });
    }

    return neuSchichten;
}

// Dachdämmstoffe mit Lambda-Werten
const ROOF_MATERIALS = {
    mineralwolle: { label: 'Mineralwolle – WLG 035', lambda: 0.035 },
    holzfaser:    { label: 'Holzfaserplatte – WLG 042', lambda: 0.042 },
    pur:          { label: 'PUR/PIR – WLG 024', lambda: 0.024 },
    zellulose:    { label: 'Zellulose – WLG 040', lambda: 0.040 },
    eps:          { label: 'EPS – WLG 035', lambda: 0.035 }
};

const BASEMENT_MATERIALS = {
    // Kellerdecke von unten: leichte Platten, einfach zu montieren
    eps:         { label: 'EPS/Styropor – WLG 035, günstig & leicht', lambda: 0.035, types: ['kellerdecke', 'kellerdecke_oben'] },
    xps:         { label: 'XPS – WLG 035, feuchtebeständig & druckfest', lambda: 0.035, types: ['kellerdecke', 'kellerdecke_oben', 'perimeter'] },
    mineralwolle:{ label: 'Mineralwolle – WLG 035, nicht brennbar', lambda: 0.035, types: ['kellerdecke', 'kellerdecke_oben'] },
    pur:         { label: 'PUR/PIR – WLG 024, schlank & effizient', lambda: 0.024, types: ['kellerdecke', 'kellerdecke_oben'] },
    holzfaser:   { label: 'Holzfaserplatte – WLG 040, ökologisch', lambda: 0.040, types: ['kellerdecke', 'kellerdecke_oben'] },
    // Perimeterdämmung: muss druckfest + wasserbeständig sein
    schaumglas:  { label: 'Schaumglas (Foamglas) – WLG 040, druckfest & wasserdicht', lambda: 0.040, types: ['perimeter'] },
    eps_perimeter:{ label: 'EPS Perimeter – WLG 035, druckfest & hydrophob', lambda: 0.035, types: ['perimeter'] },
    // Bodenplatte von oben: druckfest unter Estrich (hohe Druckbelastung!)
    eps_boden:   { label: 'EPS Trittschall/Bodendämmplatte – WLG 035, druckfest', lambda: 0.035, types: ['bodenplatte'] },
    pur_boden:   { label: 'PUR/PIR Bodendämmplatte – WLG 024, schlank unter Estrich', lambda: 0.024, types: ['bodenplatte'] },
    xps_boden:   { label: 'XPS Bodendämmplatte – WLG 035, druckfest & feuchteresistent', lambda: 0.035, types: ['bodenplatte'] }
};

function updateBasementOptions() {
    const situation = document.getElementById('basement_situation').value;
    const typeSel = document.getElementById('basement_type');
    const bodenExtraField = document.getElementById('basement_boden_extra_field');
    const thicknessField = document.getElementById('basement_thickness_field');
    const situationHint = document.getElementById('basement_situation_hint');

    typeSel.innerHTML = '';
    let options = [];

    if (situation === 'unbeheizt') {
        options = [
            { value: 'kellerdecke', label: 'Kellerdecke von unten dämmen (Standardverfahren)' },
            { value: 'kellerdecke_oben', label: 'Kellerdecke von oben dämmen (bei Bodenaufbau-Erneuerung)' }
        ];
        bodenExtraField.style.display = 'none';
        document.getElementById('basement_incl_bodenplatte').checked = false;
        if (situationHint) situationHint.textContent = 'Häufigster Fall: Der Keller wird nicht beheizt. Die Kellerdecke ist die thermische Grenze. Sehr kosteneffektiv!';
    } else if (situation === 'beheizt') {
        options = [
            { value: 'perimeter', label: 'Perimeterdämmung (Kellerwände von außen, inkl. Erdarbeiten)' },
            { value: 'kellerdecke', label: 'Nur Kellerdecke von unten (falls Keller teilbeheizt)' }
        ];
        bodenExtraField.style.display = 'block';
        if (situationHint) situationHint.textContent = 'Beheizter Keller: Die Kellerwände müssen in die thermische Hülle einbezogen werden. Perimeterdämmung + Bodenplatte empfohlen.';
    } else { // kein_keller
        options = [
            { value: 'bodenplatte', label: 'Bodenplattendämmung von oben (Dämmung + neuer Estrich)' }
        ];
        bodenExtraField.style.display = 'none';
        document.getElementById('basement_incl_bodenplatte').checked = false;
        if (situationHint) situationHint.textContent = 'Ohne Keller: Dämmplatten werden auf die Bodenplatte gelegt, darüber neuer Estrich + Bodenbelag. Raumhöhe verringert sich um ca. 8–14 cm.';
    }

    options.forEach((o, i) => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        if (i === 0) opt.selected = true;
        typeSel.appendChild(opt);
    });

    // Dickenfeld bei Perimeter ausblenden (Komplettpreis)
    const bType = typeSel.value;
    thicknessField.style.display = (bType === 'perimeter') ? 'none' : 'block';
}

function updateBasementMaterialOptions() {
    const bType = document.getElementById('basement_type').value;
    const sel = document.getElementById('basement_material');
    const prevVal = sel.value;
    sel.innerHTML = '';
    let firstVal = null;
    let prevStillAvailable = false;
    for (const [key, mat] of Object.entries(BASEMENT_MATERIALS)) {
        if (mat.types.includes(bType)) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = mat.label;
            sel.appendChild(opt);
            if (!firstVal) firstVal = key;
            if (key === prevVal) prevStillAvailable = true;
        }
    }
    sel.value = prevStillAvailable ? prevVal : firstVal;

    // Dickenfeld bei Perimeter ausblenden
    const thicknessField = document.getElementById('basement_thickness_field');
    if (thicknessField) thicknessField.style.display = (bType === 'perimeter') ? 'none' : 'block';

    // Hinweistext je nach Ausführungsart
    const hint = document.getElementById('basement_type_hint');
    if (hint) {
        const hints = {
            kellerdecke: 'Dämmplatten werden von unten an die Kellerdecke geklebt/gedübelt. Ca. 25–65 €/m².',
            kellerdecke_oben: 'Nur sinnvoll wenn EG-Bodenaufbau ohnehin erneuert wird. Ca. 85–120 €/m².',
            perimeter: '⚠️ Inkl. Erdarbeiten, Abdichtung und Drainage. Ca. 195–310 €/m². Komplettpreis – keine Dickenauswahl nötig.',
            bodenplatte: 'Druckfeste Dämmplatten auf die Bodenplatte + neuer Estrich + Bodenbelag. Ca. 90–160 €/m². Raumhöhe verringert sich!'
        };
        hint.textContent = hints[bType] || '';
    }
}

// Materialien nach Ausführungsart filtern und in <select> einfügen
function updateWallMaterialOptions() {
    const wType = document.getElementById('wall_type').value;
    const sel = document.getElementById('wall_material');
    const prevVal = sel.value;
    sel.innerHTML = '';
    let firstVal = null;
    let prevStillAvailable = false;
    for (const [key, mat] of Object.entries(WALL_MATERIALS)) {
        if (mat.types.includes(wType)) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = mat.label;
            sel.appendChild(opt);
            if (!firstVal) firstVal = key;
            if (key === prevVal) prevStillAvailable = true;
        }
    }
    sel.value = prevStillAvailable ? prevVal : firstVal;

    // Kerndämmung: Dicke-Feld ausblenden, Hohlschicht-Feld einblenden
    const thicknessField = document.getElementById('wall_thickness_field');
    const cavityField = document.getElementById('wall_cavity_field');
    if (wType === 'kerndaemmung') {
        thicknessField.style.display = 'none';
        cavityField.style.display = '';
    } else {
        thicknessField.style.display = '';
        cavityField.style.display = 'none';
    }
}

// Dämmstoffdicken dynamisch an Lambda-Wert des Materials anpassen
function updateWallThicknessOptions() {
    const wType = document.getElementById('wall_type').value;
    if (wType === 'kerndaemmung') return; // Kerndämmung hat eigenes Feld

    const wMat = document.getElementById('wall_material').value;
    const matData = WALL_MATERIALS[wMat];
    if (!matData) return;

    const lambda = matData.lambda;
    const targetU = 0.20; // BEG-Anforderung
    // Mindestdicke für U ≤ 0,20: d = lambda / U (in Metern), *1000 für mm
    const dMin = Math.ceil((lambda / targetU) * 1000);
    // Auf 10mm aufrunden
    const dMinRounded = Math.ceil(dMin / 10) * 10;

    const sel = document.getElementById('wall_thickness');
    const prevVal = parseInt(sel.value) || 160;
    sel.innerHTML = '';

    // Optionen generieren: eine unter Förder-Minimum, Förder-Minimum, zwei darüber
    const steps = [];
    // Schritt 1: eine Stufe unter Minimum (GEG-Minimum / nicht förderfähig)
    const belowMin = Math.max(60, dMinRounded - 40);
    if (belowMin < dMinRounded) {
        steps.push({ mm: belowMin, label: `${belowMin} mm (unter Förder-Anforderung)` });
    }
    // Schritt 2: knapp am Minimum
    if (dMinRounded - 20 > belowMin && dMinRounded - 20 >= 60) {
        steps.push({ mm: dMinRounded - 20, label: `${dMinRounded - 20} mm (knapp unter U ≤ 0,20)` });
    }
    // Schritt 3: Förder-Minimum (empfohlen)
    steps.push({ mm: dMinRounded, label: `${dMinRounded} mm (Empfohlen – erreicht U ≤ 0,20)` });
    // Schritt 4: darüber
    steps.push({ mm: dMinRounded + 20, label: `${dMinRounded + 20} mm (Gute Fördervoraussetzung)` });
    steps.push({ mm: dMinRounded + 60, label: `${dMinRounded + 60} mm (Passivhaus-Niveau)` });

    let bestMatch = dMinRounded;
    for (const s of steps) {
        const opt = document.createElement('option');
        opt.value = s.mm;
        opt.textContent = s.label;
        if (s.mm === dMinRounded) opt.selected = true;
        sel.appendChild(opt);
        // Versuche vorherige Auswahl beizubehalten falls passend
        if (Math.abs(s.mm - prevVal) < Math.abs(bestMatch - prevVal)) bestMatch = s.mm;
    }
    // Falls vorheriger Wert nahe genug, diesen auswählen
    if (Math.abs(bestMatch - prevVal) <= 20) sel.value = bestMatch;

    // Hinweistext aktualisieren
    const hint = document.getElementById('wall_thickness_hint');
    if (hint) {
        hint.innerHTML = `Für BEG-Förderung: U-Wert ≤ 0,20 W/(m²K) erforderlich. Bei ${matData.label.split('–')[0].trim()} (λ=${lambda}) = mind. ${dMinRounded} mm.`;
    }
}

// ============================================================
// COST ESTIMATION FROM GEOMETRY + MATERIALS
// ============================================================
// Alle Preise BRUTTO (inkl. 19% MwSt) – das zahlt der Endkunde
// Kerndämmung-Preise nach Dämmatlas (15-30 €/m², PUR-Schaum 100-130 €/m²)
const PRICES = {
    wall: {
        wdvs:           { eps: 155, eps032: 170, mineralwolle: 179, mw032: 195, pur: 226, holzfaser: 214, holzfaser045: 195, resol: 262, resol023: 245 },
        kerndaemmung:   { eps_granulat: 22, glaswolle_gran: 25, pur_schaum: 115 },
        vhf:            { mineralwolle: 262, mw032: 280, pur: 298, holzfaser: 286, holzfaser045: 268 },
        innendaemmung:  { eps: 107, eps032: 119, mineralwolle: 119, mw032: 131, pur: 155, holzfaser: 143 }
    },
    roof: {
        // Zwischensparren: Preise nach Dämmatlas (Dämmsack ca. 50€, Einblas <20€)
        zwischensparren: { zellulose: 45, eps: 60, mineralwolle: 70, holzfaser: 100, pur: 110 },
        // Aufsparren: Dämmatlas sagt "bis 350€" - aktuelle Preise passen
        aufsparren:      { zellulose: 179, eps: 190, mineralwolle: 214, pur: 238, holzfaser: 250 },
        // OGD: Dämmatlas sagt "bis 75€" - aktuelle Preise passen
        ogd:             { zellulose: 36, eps: 42, mineralwolle: 48, holzfaser: 65, pur: 71 },
        // Flachdach: Dämmatlas Einblas 20-25€, Panel höher
        flachdach:       { zellulose: 25, eps: 80, mineralwolle: 90, holzfaser: 110, pur: 120 }
    },
    basement: {
        // Kellerdecke von unten: günstigste Variante (Preise €/m² inkl. Material + Montage, brutto)
        kellerdecke:      { eps: 35, xps: 42, mineralwolle: 45, pur: 65, holzfaser: 50 },
        // Kellerdecke von oben: teurer wegen Fußbodenaufbau
        kellerdecke_oben: { eps: 85, xps: 95, mineralwolle: 90, pur: 120, holzfaser: 100 },
        // Perimeterdämmung: inkl. Erdarbeiten, Abdichtung, Drainage (sehr aufwändig!)
        perimeter:        { xps: 220, schaumglas: 310, eps_perimeter: 195 },
        // Bodenplatte von oben: Dämmung auf Bodenplatte + neuer Estrich (Sanierung)
        bodenplatte:      { eps_boden: 95, pur_boden: 130, xps_boden: 105 }
    },
    window: {
        glazing: { '2fach': 0, '3fach': 0, '3fach_plus': 95 },
        frame: { kunststoff: 417, holz: 595, holz_alu: 774, alu: 714 },
        size: { small: 0.8, medium: 1.3, large: 2.5, mixed: 1.5 },
        perSqm: { '2fach': 333, '3fach': 452, '3fach_plus': 548 },
        haustuer: 5950
    },
    hp: {
        luft_split: { 6:14280, 9:17850, 12:21420, 16:28560, 24:41650 },
        luft_mono:  { 6:16660, 9:20230, 12:24990, 16:32130, 24:45220 },
        sole:       { 6:21420, 9:26180, 12:30940, 16:38080, 24:53550 },
        wasser:     { 6:23800, 9:28560, 12:33320, 16:40460, 24:57120 },
        puffer: 2380,
        fbh_per_sqm: 77
    },
    biomass: {
        pellet:       { 10:19040, 15:23800, 20:28560, 30:38080 },
        hackschnitzel: { 10:21420, 15:27370, 20:33320, 30:45220 },
        scheitholz:   { 10:11900, 15:15470, 20:19040, 30:23800 },
        kombi:        { 10:23800, 15:29750, 20:35700, 30:47600 }
    },
    solar: {
        ww:      { flach: 5950, vakuum: 8330 },
        heizung: { flach: 11900, vakuum: 16660 }
    },
    district: { short: 9520, medium: 14280, long: 21420 },
    ventilation: { dezentral: 4760, zentral: 11900 },
    heating_optimization: 3570,
    smart_home: 4760
};

// Thickness price multiplier (base = 160mm for wall)
function thicknessMultiplier(mm, base) {
    return mm / base;
}

function recalcCosts() {
    const g = state.geo;

    // Wall insulation – mit vollständiger U-Wert-Berechnung und Schichtaufbau
    if (state.measures.includes('wall_insulation')) {
        const wType = document.getElementById('wall_type')?.value || 'wdvs';
        const wMat = document.getElementById('wall_material')?.value || 'mineralwolle';
        const buildYear = document.getElementById('buildYear')?.value || '1957-1978';
        const basePrice = (PRICES.wall[wType] && PRICES.wall[wType][wMat]) || 150;
        const wallData = WALL_BY_BUILDYEAR[buildYear];
        const matData = WALL_MATERIALS[wMat];
        const lambda = matData ? matData.lambda : 0.035;

        let tMult, pricePerSqm, uCalc, wThick;
        let schichtenVorher = wallData.schichten || [];
        let schichtenNachher = [];

        if (wType === 'kerndaemmung') {
            const cavity = parseInt(document.getElementById('wall_cavity')?.value) || 60;
            wThick = cavity;
            tMult = 1;
            pricePerSqm = basePrice;

            const R_luftschicht = wallData.R_luftschicht || 0.18;
            uCalc = calcUValue(wallData.R_wand, cavity / 1000, lambda, true, R_luftschicht);

            // Schichten nachher: Luftschicht durch Dämmung ersetzen
            schichtenNachher = getSchichtenNachher(wallData, wType, wThick, matData, lambda);
        } else {
            wThick = parseInt(document.getElementById('wall_thickness')?.value) || 160;
            tMult = thicknessMultiplier(wThick, 160);
            pricePerSqm = Math.round(basePrice * tMult);

            uCalc = calcUValue(wallData.R_wand, wThick / 1000, lambda, false);

            // Schichten nachher: Dämmung hinzufügen
            schichtenNachher = getSchichtenNachher(wallData, wType, wThick, matData, lambda);
        }

        const total = Math.round(g.fassade * pricePerSqm);
        state.costs.wall_insulation = total;

        // Verfahrensname für Anzeige
        const verfahrenNamen = {
            'wdvs': 'Wärmedämmverbundsystem (WDVS)',
            'vhf': 'Vorgehängte hinterlüftete Fassade (VHF)',
            'kerndaemmung': 'Kerndämmung (Einblasdämmung)',
            'innendaemmung': 'Innendämmung'
        };

        // Förderhinweis
        const foerderHinweis = uCalc.U_neu <= 0.20
            ? '<span style="color:#27ae60; font-weight:600;">✓ BEG-Anforderung (U ≤ 0,20) erfüllt!</span>'
            : (wType === 'kerndaemmung'
                ? '<span style="color:#e67e22;">BEG fördert Kerndämmung bei vollständiger Füllung.</span>'
                : `<span style="color:#e67e22;">⚠ Für BEG mind. ${Math.ceil(lambda / (1/(Rsi + wallData.R_wand + Rse) - 0.20) * 1000 / 10) * 10} mm erforderlich.</span>`);

        // HTML für Schichtaufbau-Anzeige
        const schichtHtml = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:1rem;">
                <div>${renderSchichtaufbau(schichtenVorher, '🏠 Wandaufbau VORHER (Bestand)')}</div>
                <div>${renderSchichtaufbau(schichtenNachher, '🔧 Wandaufbau NACHHER (saniert)', 'Dämmplatte')}</div>
            </div>
        `;

        const preview = document.getElementById('wall_cost_preview');
        if (preview) preview.innerHTML = `
            <strong>Geschätzte Kosten:</strong> ${formatNumber(g.fassade)} m² × ca. ${formatNumber(pricePerSqm)} €/m² = <strong>${formatCurrency(total)}</strong>
            <div style="margin-top:0.8rem; padding:0.8rem; background:linear-gradient(135deg, #f8f9fa 0%, #e8f5e9 100%); border-radius:8px;">
                <div style="font-size:0.85rem; margin-bottom:0.8rem;">
                    <strong>Verfahren:</strong> ${verfahrenNamen[wType] || wType}<br>
                    <strong>U-Wert:</strong> ${uCalc.U_alt.toFixed(2)} → <strong style="color:#1a6b3c;">${uCalc.U_neu.toFixed(2)} W/(m²K)</strong> <span style="color:#27ae60;">(−${uCalc.verbesserung}%)</span>
                </div>
                ${foerderHinweis}
                ${schichtHtml}
            </div>`;
    }

    // Roof – mit vollständiger U-Wert-Berechnung
    if (state.measures.includes('roof_insulation')) {
        const rType = document.getElementById('roof_type')?.value || 'zwischensparren';
        const rMat = document.getElementById('roof_material')?.value || 'mineralwolle';
        const rThick = parseInt(document.getElementById('roof_thickness')?.value) || 200;
        const buildYear = document.getElementById('buildYear')?.value || '1957-1978';
        const basePrice = (PRICES.roof[rType] && PRICES.roof[rType][rMat]) || 80;
        const tMult = thicknessMultiplier(rThick, 200);
        const total = Math.round(g.dach * basePrice * tMult);
        state.costs.roof_insulation = total;

        // U-Wert-Berechnung
        const roofData = (rType === 'ogd') ? CEILING_BY_BUILDYEAR[buildYear] : ROOF_BY_BUILDYEAR[buildYear];
        const matData = ROOF_MATERIALS[rMat];
        const lambda = matData ? matData.lambda : 0.035;
        const uCalc = calcUValue(roofData.R_dach || roofData.R_decke, rThick / 1000, lambda, false);

        const targetU = (rType === 'ogd') ? 0.14 : 0.14; // BEG: U ≤ 0,14 für Dach und OGD
        const foerderHinweis = uCalc.U_neu <= targetU
            ? '✓ BEG-Anforderung (U ≤ 0,14) erfüllt!'
            : `⚠ Für BEG mind. ${Math.ceil(lambda / (1/(Rsi + (roofData.R_dach || roofData.R_decke) + Rse) - targetU) * 1000 / 10) * 10} mm empfohlen.`;

        const verfahrenName = {
            'zwischensparren': 'Zwischensparrendämmung',
            'aufsparren': 'Aufsparrendämmung',
            'ogd': 'Oberste Geschossdecke',
            'flachdach': 'Flachdachdämmung'
        }[rType] || rType;

        let uWertHinweis = `<strong>U-Wert vorher:</strong> ${uCalc.U_alt.toFixed(2)} W/(m²K) → <strong>U-Wert nachher:</strong> ${uCalc.U_neu.toFixed(2)} W/(m²K) (−${uCalc.verbesserung}%)<br>`
            + `<span style="color:#666;">Bestand: ${roofData.name}<br>`
            + `${verfahrenName} ${rThick} mm ${matData ? matData.label.split('–')[0].trim() : ''} (λ=${lambda})</span><br>`
            + `<span style="color:${uCalc.U_neu <= targetU ? '#27ae60' : '#e67e22'};">${foerderHinweis}</span>`;

        // Solarpflicht bei Neueindeckung prüfen
        const solarPflichtBL = {
            bw: { name:'Baden-Württemberg', seit:'01/2023', anteil:'60% der Dachfläche', alt:'PV oder Solarthermie' },
            be: { name:'Berlin', seit:'01/2023', anteil:'30% der Nettodachfläche', alt:'PV, Solarthermie oder Fassaden-PV' },
            hb: { name:'Bremen', seit:'07/2024', anteil:'50% der Bruttodachfläche', alt:'PV' },
            hh: { name:'Hamburg', seit:'01/2025', anteil:'30% der Nettodachfläche', alt:'PV' },
            ni: { name:'Niedersachsen', seit:'01/2025', anteil:'50% der Dachfläche', alt:'PV' },
            nw: { name:'NRW', seit:'01/2026', anteil:'30% der Nettodachfläche', alt:'PV' }
        };
        const isNeueindeckung = (rType === 'aufsparren' || rType === 'flachdach');
        const solarInfo = solarPflichtBL[state.bundesland];
        let solarHinweis = '';
        if (isNeueindeckung && solarInfo) {
            solarHinweis = `<br><span style="font-size:0.78rem; color:#c0392b;">⚠️ <strong>Solarpflicht in ${solarInfo.name}!</strong> Bei Neueindeckung müssen mind. ${solarInfo.anteil} mit ${solarInfo.alt} belegt werden (seit ${solarInfo.seit}).</span>`;
        }

        const preview = document.getElementById('roof_cost_preview');
        if (preview) preview.innerHTML = `<strong>Geschätzte Kosten:</strong> ${formatNumber(g.dach)} m² × ca. ${formatNumber(Math.round(basePrice * tMult))} €/m² = <strong>${formatCurrency(total)}</strong>
            <div style="margin-top:0.5rem; padding:0.6rem; background:#f8f9fa; border-radius:6px; font-size:0.78rem;">${uWertHinweis}</div>${solarHinweis}`;
    }

    // Basement / Bodenplatte
    if (state.measures.includes('basement_insulation')) {
        const bType = document.getElementById('basement_type')?.value || 'kellerdecke';
        const bMat = document.getElementById('basement_material')?.value || 'eps';
        const bThick = parseInt(document.getElementById('basement_thickness')?.value) || 80;
        const isPerimeter = (bType === 'perimeter');
        const inclBoden = document.getElementById('basement_incl_bodenplatte')?.checked || false;

        const basePrice = (PRICES.basement[bType] && PRICES.basement[bType][bMat]) || 35;
        const tMult = isPerimeter ? 1 : thicknessMultiplier(bThick, 80);
        const pricePerSqm = Math.round(basePrice * tMult);

        // Grundfläche für Berechnung
        const grundflaeche = g.keller; // Kellerdecke ≈ Grundfläche

        // Perimeterdämmung: Fläche = Umfang × Kellerhöhe (ca. 2,4m)
        let periFlaeche = 0;
        if (isPerimeter) {
            const umfang = 2 * (state.geo.breite + state.geo.laenge);
            periFlaeche = Math.round(umfang * 2.4); // ca. 2,4m Kellerhöhe
        }
        const mainFlaeche = isPerimeter ? periFlaeche : grundflaeche;
        let total = Math.round(mainFlaeche * pricePerSqm);

        // Zusätzliche Bodenplattendämmung bei beheiztem Keller
        let bodenTotal = 0;
        let bodenPricePerSqm = 0;
        if (inclBoden && isPerimeter) {
            bodenPricePerSqm = (PRICES.basement.bodenplatte && PRICES.basement.bodenplatte.xps_boden) || 105;
            const bodenTMult = thicknessMultiplier(bThick, 80);
            bodenPricePerSqm = Math.round(bodenPricePerSqm * bodenTMult);
            bodenTotal = Math.round(grundflaeche * bodenPricePerSqm);
            total += bodenTotal;
        }

        state.costs.basement_insulation = total;
        const preview = document.getElementById('basement_cost_preview');
        let html = '';
        if (isPerimeter) {
            html = `<strong>Geschätzte Kosten Perimeterdämmung:</strong><br>
                ${formatNumber(periFlaeche)} m² Kellerwand × ca. ${formatNumber(pricePerSqm)} €/m² = <strong>${formatCurrency(Math.round(periFlaeche * pricePerSqm))}</strong>
                <br><span style="font-size:0.78rem;">Umfang ${formatNumber(2*(state.geo.breite+state.geo.laenge))} m × 2,4 m Kellerhöhe = ${formatNumber(periFlaeche)} m² · Inkl. Erdarbeiten, Abdichtung, Drainage.</span>`;
            if (inclBoden) {
                html += `<br><br><strong>+ Bodenplattendämmung:</strong><br>
                    ${formatNumber(grundflaeche)} m² × ca. ${formatNumber(bodenPricePerSqm)} €/m² = <strong>${formatCurrency(bodenTotal)}</strong>`;
            }
            html += `<br><br><strong style="font-size:1.05rem;">Gesamt: ${formatCurrency(total)}</strong>`;
        } else {
            // U-Wert-Berechnung für Kellerdecke/Bodenplatte
            const buildYear = document.getElementById('buildYear')?.value || '1957-1978';
            const basementData = BASEMENT_BY_BUILDYEAR[buildYear];
            const matData = BASEMENT_MATERIALS[bMat];
            const lambda = matData ? matData.lambda : 0.035;
            const uCalc = calcUValue(basementData.R_decke, bThick / 1000, lambda, false);

            const targetU = 0.25; // BEG: U ≤ 0,25 für Kellerdecke/Bodenplatte
            const foerderHinweis = uCalc.U_neu <= targetU
                ? '✓ BEG-Anforderung (U ≤ 0,25) erfüllt!'
                : `⚠ Für BEG mind. ${Math.ceil(lambda / (1/(Rsi + basementData.R_decke + Rse) - targetU) * 1000 / 10) * 10} mm empfohlen.`;

            const verfahrenName = {
                'kellerdecke': 'Kellerdeckendämmung von unten',
                'kellerdecke_oben': 'Kellerdeckendämmung von oben',
                'bodenplatte': 'Bodenplattendämmung'
            }[bType] || bType;

            let hinweis = `<strong>U-Wert vorher:</strong> ${uCalc.U_alt.toFixed(2)} W/(m²K) → <strong>U-Wert nachher:</strong> ${uCalc.U_neu.toFixed(2)} W/(m²K) (−${uCalc.verbesserung}%)<br>`
                + `<span style="color:#666;">Bestand: ${basementData.name}<br>`
                + `${verfahrenName} ${bThick} mm ${matData ? matData.label.split('–')[0].trim() : ''} (λ=${lambda})</span><br>`
                + `<span style="color:${uCalc.U_neu <= targetU ? '#27ae60' : '#e67e22'};">${foerderHinweis}</span>`;

            html = `<strong>Geschätzte Kosten:</strong> ${formatNumber(grundflaeche)} m² × ca. ${formatNumber(pricePerSqm)} €/m² = <strong>${formatCurrency(total)}</strong>
                <div style="margin-top:0.5rem; padding:0.6rem; background:#f8f9fa; border-radius:6px; font-size:0.78rem;">${hinweis}</div>`;
        }
        if (preview) preview.innerHTML = html;
    }

    // Windows
    if (state.measures.includes('windows')) {
        const wGlazing = document.getElementById('window_glazing')?.value || '3fach';
        const wFrame = document.getElementById('window_frame')?.value || 'kunststoff';
        const wSize = document.getElementById('window_size')?.value || 'medium';
        const avgArea = PRICES.window.size[wSize] || 1.3;
        const pricePerSqm = PRICES.window.perSqm[wGlazing] || 380;
        const frameBase = PRICES.window.frame[wFrame] || 350;
        const perWindow = Math.round(avgArea * pricePerSqm + frameBase);
        let total = g.fenster * perWindow;
        if (state.details.haustuer) total += PRICES.window.haustuer;
        state.costs.windows = total;
        const preview = document.getElementById('window_cost_preview');
        if (preview) preview.innerHTML = `<strong>Geschätzte Kosten:</strong> ${formatNumber(g.fenster)} Fenster × ca. ${formatCurrency(perWindow)}/Stk = ${formatCurrency(g.fenster * perWindow)}${state.details.haustuer ? ` + Haustür ${formatCurrency(PRICES.window.haustuer)}` : ''} = <strong>${formatCurrency(total)}</strong><br>
            <span style="font-size:0.78rem;">${wGlazing === '2fach' ? '⚠️ 2-fach Verglasung ist nicht förderfähig (Uw > 0,95)!' : `${wFrame === 'holz_alu' ? 'Holz-Alu: Premium-Variante, sehr langlebig.' : ''}`}</span>`;
    }

    // Heat pump
    if (state.measures.includes('heat_pump')) {
        const hpType = document.getElementById('hp_type')?.value || 'luft_mono';
        const hpKW = document.getElementById('hp_leistung')?.value || '12';
        let total = (PRICES.hp[hpType] && PRICES.hp[hpType][hpKW]) || 21000;
        if (state.details.hp_puffer) total += PRICES.hp.puffer;
        if (state.details.hp_fussbodenheizung) total += Math.round(g.flaeche * PRICES.hp.fbh_per_sqm);
        state.costs.heat_pump = total;
        const preview = document.getElementById('hp_cost_preview');
        if (preview) {
            let parts = [`WP ${hpType.replace('_',' ')}, ${hpKW} kW: ${formatCurrency((PRICES.hp[hpType] && PRICES.hp[hpType][hpKW]) || 21000)}`];
            if (state.details.hp_puffer) parts.push(`Pufferspeicher: ${formatCurrency(PRICES.hp.puffer)}`);
            if (state.details.hp_fussbodenheizung) parts.push(`FBH ${formatNumber(g.flaeche)} m²: ${formatCurrency(Math.round(g.flaeche * PRICES.hp.fbh_per_sqm))}`);
            preview.innerHTML = `<strong>Geschätzte Kosten:</strong> ${parts.join(' + ')} = <strong>${formatCurrency(total)}</strong><br>
                <span style="font-size:0.78rem;">${hpType.startsWith('sole') || hpType === 'wasser' ? 'Sole/Wasser-WP: höhere Invest., aber niedrigere Betriebskosten + ggf. +5% Effizienzbonus.' : `⚠️ Ab 01/2026: Förderung nur für leise Luft-WP! Max. Schallleistung: ${parseInt(hpKW) <= 6 ? '55 dB(A)' : parseInt(hpKW) <= 12 ? '60 dB(A)' : '68 dB(A)'} bei ${hpKW} kW. Achten Sie auf das Produktdatenblatt!`}</span>`;
        }
    }

    // Biomass
    if (state.measures.includes('biomass')) {
        const bioType = document.getElementById('bio_type')?.value || 'pellet';
        const bioKW = document.getElementById('bio_leistung')?.value || '15';
        const total = (PRICES.biomass[bioType] && PRICES.biomass[bioType][bioKW]) || 20000;
        state.costs.biomass = total;
        const preview = document.getElementById('bio_cost_preview');
        if (preview) preview.innerHTML = `<strong>Geschätzte Kosten:</strong> ${bioType} ${bioKW} kW = <strong>${formatCurrency(total)}</strong><br>
            <span style="font-size:0.78rem;">Inkl. Pufferspeicher, Montage. ${bioType === 'pellet' ? 'Pelletlager (ca. 2-4 m²) einplanen.' : ''}</span>`;
    }

    // Solar thermal
    if (state.measures.includes('solar_thermal')) {
        const sType = document.getElementById('solar_type')?.value || 'ww';
        const sKoll = document.getElementById('solar_kollektor')?.value || 'flach';
        const total = (PRICES.solar[sType] && PRICES.solar[sType][sKoll]) || 5000;
        state.costs.solar_thermal = total;
        const preview = document.getElementById('solar_cost_preview');
        if (preview) preview.innerHTML = `<strong>Geschätzte Kosten:</strong> ${sType === 'ww' ? 'Warmwasser' : 'WW + Heizung'}, ${sKoll === 'vakuum' ? 'Vakuumröhren' : 'Flachkollektor'} = <strong>${formatCurrency(total)}</strong>`;
    }

    // District heating
    if (state.measures.includes('district_heating')) {
        const dDist = document.getElementById('district_distance')?.value || 'short';
        const total = PRICES.district[dDist] || 12000;
        state.costs.district_heating = total;
        const preview = document.getElementById('district_cost_preview');
        if (preview) preview.innerHTML = `<strong>Geschätzte Kosten:</strong> Anschluss (${dDist === 'short' ? 'kurz' : dDist === 'medium' ? 'mittel' : 'lang'}) = <strong>${formatCurrency(total)}</strong>`;
    }

    // Ventilation
    if (state.measures.includes('ventilation')) {
        const vType = document.getElementById('vent_type')?.value || 'dezentral';
        let total = PRICES.ventilation[vType] || 4000;
        if (vType === 'zentral') total = Math.round(total * (g.flaeche / 140)); // scale by size
        state.costs.ventilation = total;
        const preview = document.getElementById('vent_cost_preview');
        if (preview) preview.innerHTML = `<strong>Geschätzte Kosten:</strong> ${vType === 'zentral' ? 'Zentral mit Kanälen' : 'Dezentral (Einzelgeräte)'} = <strong>${formatCurrency(total)}</strong><br>
            <span style="font-size:0.78rem;">${vType === 'zentral' ? 'Zentrale Anlage ist bei Neubau/Kernsanierung optimal. WRG ≥ 80% für max. Effizienz.' : 'Dezentral: Einfacher Einbau im Bestand, geringere Kosten.'}</span>`;
    }

    // Simple measures
    if (state.measures.includes('heating_optimization')) state.costs.heating_optimization = PRICES.heating_optimization;
    if (state.measures.includes('smart_home')) state.costs.smart_home = PRICES.smart_home;

    updateTotalCost();
}

function toggleDetail(el, key, val) {
    state.details[key] = val;
    const yesBtn = document.getElementById(key + '_yes');
    const noBtn = document.getElementById(key + '_no');
    if (yesBtn) yesBtn.classList.toggle('active', val);
    if (noBtn) noBtn.classList.toggle('active', !val);
    recalcCosts();
}

function toggleDetailCard(el) {
    const key = el.dataset.detail;
    el.classList.toggle('selected');
    state.details[key] = el.classList.contains('selected');
    recalcCosts();
}

function generateCostInputs() {
    const container = document.getElementById('cost-inputs');
    if (!container) return;
    let html = '';
    if (state.measures.length === 0) {
        html = '<div class="info-box">Bitte wählen Sie in Schritt 2 mindestens eine Maßnahme aus.</div>';
    } else {
        state.measures.forEach(m => {
            const currentVal = state.costs[m] || defaultCosts[m] || 10000;
            state.costs[m] = currentVal;
            html += `
                <div class="field">
                    <label>${measureLabels[m]}</label>
                    <div class="cost-input-group">
                        <input type="text" id="cost_${m}" value="${formatNumber(currentVal)}" inputmode="numeric"
                            onfocus="this.value=this.value.replace(/\\./g,'')"
                            onblur="parseCostInput(this,'${m}')"
                            onkeydown="if(event.key==='Enter'){this.blur();}">
                        <span class="cost-suffix">€</span>
                    </div>
                </div>`;
        });
    }
    container.innerHTML = html;
    updateTotalCost();
}

function updateTotalCost() {
    const total = state.measures.reduce((s, m) => s + (state.costs[m] || 0), 0);
    const el = document.getElementById('totalCostDisplay');
    if (el) el.textContent = formatCurrency(total);
}

function parseCostInput(input, measure) {
    const raw = input.value.replace(/\./g, '').replace(/,/g, '').replace(/[^\d]/g, '');
    const val = parseInt(raw) || 0;
    state.costs[measure] = val;
    input.value = val > 0 ? formatNumber(val) : '0';
    updateTotalCost();
}

function formatNumber(n) {
    return Math.round(n).toLocaleString('de-DE');
}

function formatCurrency(n) {
    return Math.round(n).toLocaleString('de-DE') + ' €';
}

function formatPercent(n) {
    return n + ' %';
}

// ============================================================
// STEP NAVIGATION
// ============================================================
let currentStep = 1;

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Falls in iFrame eingebettet: Elternseite zum iFrame scrollen
    try {
        if (window.parent !== window) {
            window.parent.postMessage({ type: 'scrollToIframe' }, '*');
        }
    } catch(e) {}
    // Fallback: document.documentElement
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

function goToStep(step) {
    if (step > currentStep + 1) return; // no skipping ahead
    if (step === 4) {
        calculateAndShow();
        return;
    }
    currentStep = step;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${step}`).classList.add('active');
    updateStepper();
    if (step === 3) generateCostInputs();
    scrollToTop();
}

function updateStepper() {
    document.querySelectorAll('.step-item').forEach((el, i) => {
        const s = i + 1;
        el.classList.remove('active', 'completed');
        if (s === currentStep) el.classList.add('active');
        else if (s < currentStep) el.classList.add('completed');
    });
    document.querySelectorAll('.step-connector').forEach((el, i) => {
        el.classList.toggle('active', i + 1 < currentStep);
    });
}

// ============================================================
// CALCULATION ENGINE
// ============================================================
function calculateAndShow() {
    if (state.measures.length === 0) {
        alert('Bitte wählen Sie mindestens eine Maßnahme aus.');
        goToStep(2);
        return;
    }

    currentStep = 4;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-4').classList.add('active');
    updateStepper();

    const results = calculateFunding();
    renderResults(results);
    scrollToTop();
}

function calculateFunding() {
    const units = state.unitCount;
    const isOwner = state.ownership === 'owner';
    const isWPB = isWorstPerformingBuilding();
    const hasISFP = state.isfp;
    const isEffizienzhaus = state.renovGoal === 'effizienzhaus';

    const results = {
        programs: [],
        totalCost: 0,
        totalFunding: 0,
        totalFundingPercent: 0,
        eigenanteil: 0,
        nebenkosten: { isfp: 0, isfpFoerderung: 0, bau: 0, bauFoerderung: 0, gesamt: 0, eigenanteil: 0 },
        taxAlternative: null,
        statePrograms: [],
        tips: [],
        timeline: [],
        bonuses: []
    };

    results.totalCost = state.measures.reduce((s, m) => s + (state.costs[m] || 0), 0);

    if (isEffizienzhaus) {
        calculateEffizienzhausFunding(results, units, isWPB, hasISFP);
    } else {
        calculateEinzelmassnahmenFunding(results, units, isOwner, isWPB, hasISFP);
    }

    // State programs
    calculateStateFunding(results);

    // Tax alternative
    calculateTaxAlternative(results);

    // Apply cumulation limit
    const maxFunding = results.totalCost * FD.kumulierung.maxPublicFundingRate / 100;
    if (results.totalFunding > maxFunding) {
        results.totalFunding = maxFunding;
    }

    // Calculate Nebenkosten (iSFP + Baubegleitung) Eigenanteil
    const nk = results.nebenkosten;
    nk.gesamt = nk.isfp + nk.bau;
    nk.eigenanteil = nk.gesamt - nk.isfpFoerderung - nk.bauFoerderung;

    // Eigenanteil = Baukosten - Förderung + ungeförderte Nebenkosten
    results.eigenanteil = Math.max(0, results.totalCost - results.totalFunding + nk.eigenanteil);
    results.totalFundingPercent = results.totalCost > 0 ? Math.round((results.totalFunding / results.totalCost) * 100) : 0;

    // Generate tips
    generateTips(results, isOwner, isWPB, hasISFP);

    // Timeline
    results.timeline = [
        { step: '1. Energieberatung', desc: 'Zertifizierten Energieberater beauftragen (dena-Expertenliste). iSFP erstellen lassen.' },
        { step: '2. Angebote einholen', desc: 'Handwerker-Angebote einholen. WICHTIG: Noch keine Aufträge vergeben!' },
        { step: '3. Förderantrag stellen', desc: 'Online-Antrag bei KfW/BAFA VOR Auftragsvergabe. Verträge nur mit auflösender Bedingung.' },
        { step: '4. Bewilligung abwarten', desc: 'Nach Zusage: Aufträge erteilen und Maßnahmen durchführen.' },
        { step: '5. Verwendungsnachweis', desc: 'Nach Abschluss: Rechnungen und Bestätigungen einreichen.' },
        { step: '6. Auszahlung', desc: 'Zuschuss wird ausgezahlt bzw. Tilgungszuschuss gutgeschrieben.' }
    ];

    return results;
}

function isWorstPerformingBuilding() {
    return (state.buildYear === 'pre1957' || state.buildYear === '1957-1978') &&
           state.priorRenovation === 'none';
}

function calculateEffizienzhausFunding(results, units, isWPB, hasISFP) {
    const ehRates = FD.kfw261.rates;
    const std = state.ehStandard;
    const hasEE = state.eeClass;
    let rate = hasEE ? ehRates[std].ee : ehRates[std].base;
    let maxCredit = hasEE ? FD.kfw261.maxCreditEE : FD.kfw261.maxCreditStandard;
    maxCredit *= units;

    let bonuses = [];
    if (hasISFP) {
        rate += FD.kfw261.bonuses.isfp;
        bonuses.push(`+${FD.kfw261.bonuses.isfp}% iSFP-Bonus`);
    }
    if (isWPB) {
        rate += FD.kfw261.bonuses.wpb;
        bonuses.push(`+${FD.kfw261.bonuses.wpb}% Worst Performing Building`);
    }

    // Serial renovation bonus for EH40/EH55
    const serialBonus = (std === 'eh40' || std === 'eh55') ? 15 : 0;
    // WPB + serial capped at serialMax (20)
    if (serialBonus > 0 && isWPB) {
        const extraSerial = FD.kfw261.bonuses.serialMax - FD.kfw261.bonuses.wpb;
        rate += extraSerial;
        bonuses.push(`+${extraSerial}% Serielles Sanieren (mit WPB gedeckelt auf +${FD.kfw261.bonuses.serialMax}% gesamt)`);
    }

    const creditUsed = Math.min(results.totalCost, maxCredit);
    const tilgungszuschuss = Math.round(creditUsed * rate / 100);

    const stdNames = {
        eh40: 'Effizienzhaus 40',
        eh55: 'Effizienzhaus 55',
        eh70: 'Effizienzhaus 70',
        eh85: 'Effizienzhaus 85',
        ehDenkmal: 'Effizienzhaus Denkmal'
    };

    const ehBaseRate = hasEE ? ehRates[std].ee : ehRates[std].base;
    let ehCalcParts = [`Basis-Tilgungszuschuss ${stdNames[std]}${hasEE ? ' EE/NH' : ''}: ${ehBaseRate}%`];
    if (hasISFP) ehCalcParts.push('+ 5% iSFP-Bonus');
    if (isWPB) ehCalcParts.push('+ 10% WPB-Bonus');
    if (serialBonus > 0 && isWPB) ehCalcParts.push('+ Serielles Sanieren (WPB+Seriell gedeckelt auf +20%)');

    const ehCalc = `Rechenweg: Ihre Gesamtkosten: ${formatCurrency(results.totalCost)}. ` +
        `Max. Kreditbetrag: ${formatCurrency(hasEE ? 150000 : 120000)}/WE × ${units} WE = ${formatCurrency(maxCredit)}. ` +
        `Genutzter Kredit: ${formatCurrency(creditUsed)}. ` +
        `Fördersatz: ${ehCalcParts.join(' ')} = ${rate}%. ` +
        `${formatCurrency(creditUsed)} × ${rate}% = <strong>${formatCurrency(tilgungszuschuss)}</strong>`;

    results.programs.push({
        type: 'kfw',
        name: `KfW 261 – ${stdNames[std]}${hasEE ? ' EE' : ''}`,
        desc: `Zinsgünstiger Kredit mit ${rate}% Tilgungszuschuss`,
        amount: tilgungszuschuss,
        rate: rate,
        maxEligible: creditUsed,
        details: `Max. Kredit: ${formatCurrency(maxCredit)} (${formatCurrency(hasEE ? 150000 : 120000)}/WE × ${units} WE). Tilgungszuschuss: ${rate}%.`,
        bonuses: bonuses,
        calculation: ehCalc
    });

    // Baubegleitung
    const bauCostPerUnit = (state.buildingType === 'efh' || state.buildingType === 'zfh') ? FD.kfw261.baubegleitung.efhZfhPerUnit : FD.kfw261.baubegleitung.mfhPerUnit;
    const bauTotal = bauCostPerUnit * units;
    const bauFunding = Math.round(bauTotal * FD.kfw261.baubegleitung.rate / 100);

    results.programs.push({
        type: 'kfw',
        name: 'KfW Baubegleitung (Energieberatung)',
        desc: '50% Zuschuss für Fachplanung & Baubegleitung',
        amount: bauFunding,
        rate: 50,
        maxEligible: bauTotal,
        details: `${formatCurrency(bauCostPerUnit)}/WE × ${units} WE = ${formatCurrency(bauTotal)} förderfähig.`,
        bonuses: [],
        calculation: `Rechenweg: Max. Kosten Baubegleitung: ${formatCurrency(bauCostPerUnit)}/WE × ${units} WE = ${formatCurrency(bauTotal)}. Davon 50% = <strong>${formatCurrency(bauFunding)}</strong>`
    });

    results.totalFunding = tilgungszuschuss + bauFunding;
    results.bonuses = bonuses;
}

function calculateEinzelmassnahmenFunding(results, units, isOwner, isWPB, hasISFP) {
    let totalFunding = 0;

    // Separate heating measures from other measures
    const selectedHeating = state.measures.filter(m => heatingMeasures.includes(m));
    const selectedEnvelope = state.measures.filter(m => envelopeMeasures.includes(m));
    const selectedTech = state.measures.filter(m => techMeasures.includes(m));
    const nonHeating = [...selectedEnvelope, ...selectedTech];

    // === KfW 458: Heizungsförderung (only for heating replacement) ===
    // Boni (Klima, Einkommen) nur für eigengenutzte WE; Grundförderung für alle
    if (selectedHeating.length > 0) {
        const heatingCost = selectedHeating.reduce((s, m) => s + (state.costs[m] || 0), 0);
        const maxEligible = FD.kfw458.maxEligiblePerUnit * units;
        const eligibleCost = Math.min(heatingCost, maxEligible);
        const weEigen = state.weEigengenutzt;
        const weVerm = state.weVermietet;

        // Rate für eigengenutzte WE
        let rateEigen = FD.kfw458.baseRate; // 30%
        let bonusesEigen = [];
        const speedEligible = FD.kfw458.klimageschwindigkeitsbonus.eligibleOldHeating;
        if (speedEligible.includes(state.currentHeating)) {
            rateEigen += FD.kfw458.klimageschwindigkeitsbonus.rate;
            bonusesEigen.push(`+${FD.kfw458.klimageschwindigkeitsbonus.rate}% Klimageschwindigkeitsbonus`);
        }
        if (weEigen > 0 && state.income === 'under40k') {
            rateEigen += FD.kfw458.einkommensbonus.rate;
            bonusesEigen.push(`+${FD.kfw458.einkommensbonus.rate}% Einkommensbonus`);
        }
        rateEigen = Math.min(rateEigen, FD.kfw458.maxTotalRate); // max 70%

        // Rate für vermietete WE: nur Grundförderung (+ ggf. Effizienzbonus)
        let rateVerm = FD.kfw458.baseRate; // 30%

        // Kosten anteilig auf WE
        const kostenProWE = eligibleCost / units;
        const foerderungEigen = weEigen > 0 ? Math.round(kostenProWE * weEigen * rateEigen / 100) : 0;
        const foerderungVerm = weVerm > 0 ? Math.round(kostenProWE * weVerm * rateVerm / 100) : 0;
        const heatingFunding = foerderungEigen + foerderungVerm;

        // Effektiver Gesamtsatz
        const effectiveRate = eligibleCost > 0 ? Math.round(heatingFunding / eligibleCost * 100) : 0;

        let heatingNames = selectedHeating.map(m => measureLabels[m]).join(', ');
        let allBonuses = weEigen > 0 ? bonusesEigen : [];

        // Rechenweg
        let calcStr = `Rechenweg: Heizungskosten: ${formatCurrency(heatingCost)}. Max. förderfähig: ${formatCurrency(FD.kfw458.maxEligiblePerUnit)}/WE × ${units} WE = ${formatCurrency(maxEligible)}. Angesetzt: ${formatCurrency(eligibleCost)}.`;
        if (weEigen > 0 && weVerm > 0) {
            calcStr += `<br>Kosten pro WE: ${formatCurrency(Math.round(kostenProWE))}.`;
            calcStr += `<br><strong>Eigengenutzt (${weEigen} WE):</strong> ${formatCurrency(Math.round(kostenProWE * weEigen))} × ${rateEigen}% = ${formatCurrency(foerderungEigen)} (30% Basis${bonusesEigen.length > 0 ? ' + ' + bonusesEigen.join(' + ') : ''})`;
            calcStr += `<br><strong>Vermietet (${weVerm} WE):</strong> ${formatCurrency(Math.round(kostenProWE * weVerm))} × ${rateVerm}% = ${formatCurrency(foerderungVerm)} (nur Grundförderung)`;
            calcStr += `<br>Gesamt: <strong>${formatCurrency(heatingFunding)}</strong> (effektiv ${effectiveRate}%)`;
        } else {
            const singleRate = weEigen > 0 ? rateEigen : rateVerm;
            calcStr += ` ${formatCurrency(eligibleCost)} × ${singleRate}% = <strong>${formatCurrency(heatingFunding)}</strong>`;
        }

        results.programs.push({
            type: 'kfw',
            name: `KfW 458 – Heizungsförderung`,
            desc: `${heatingNames} – ${weEigen > 0 && weVerm > 0 ? 'eff. ' + effectiveRate + '%' : (weEigen > 0 ? rateEigen + '%' : rateVerm + '%')} Zuschuss`,
            amount: heatingFunding,
            rate: effectiveRate,
            maxEligible: eligibleCost,
            details: `Grundförderung ${FD.kfw458.baseRate}% für alle WE.${weEigen > 0 && bonusesEigen.length > 0 ? ' Boni nur für ' + weEigen + ' eigengenutzte WE.' : ''}${weVerm > 0 ? ' Vermietete WE (' + weVerm + '): nur Grundförderung.' : ''} Max. förderfähig: ${formatCurrency(maxEligible)}.`,
            bonuses: allBonuses,
            calculation: calcStr
        });

        totalFunding += heatingFunding;
    }

    // === BAFA BEG EM: Einzelmaßnahmen (envelope + tech) ===
    if (nonHeating.length > 0) {
        const nonHeatingCost = nonHeating.reduce((s, m) => s + (state.costs[m] || 0), 0);
        const maxPerUnit = hasISFP ? FD.bafaBegEM.maxEligiblePerUnitISFP : FD.bafaBegEM.maxEligiblePerUnitBase;
        const maxEligible = maxPerUnit * units;
        const eligibleCost = Math.min(nonHeatingCost, maxEligible);

        let rate = FD.bafaBegEM.baseRate;
        let bonuses = [];

        if (hasISFP) {
            rate += FD.bafaBegEM.isfpBonus;
            bonuses.push(`+${FD.bafaBegEM.isfpBonus}% iSFP-Bonus`);
        }

        const envFunding = Math.round(eligibleCost * rate / 100);

        const envCalc = `Rechenweg: Kosten Gebäudehülle/Technik: ${formatCurrency(nonHeatingCost)}. ` +
            `Max. förderfähig: ${formatCurrency(maxPerUnit)}/WE × ${units} WE = ${formatCurrency(maxEligible)}${hasISFP ? ' (verdoppelt durch iSFP von ' + formatCurrency(FD.bafaBegEM.maxEligiblePerUnitBase) + ' auf ' + formatCurrency(FD.bafaBegEM.maxEligiblePerUnitISFP) + '/WE)' : ''}. ` +
            `Angesetzter Betrag: ${formatCurrency(eligibleCost)}. ` +
            `Fördersatz: 15% Basis${hasISFP ? ' + 5% iSFP-Bonus = 20%' : ''}. ` +
            `${formatCurrency(eligibleCost)} × ${rate}% = <strong>${formatCurrency(envFunding)}</strong>`;

        results.programs.push({
            type: 'bafa',
            name: 'BAFA BEG EM – Einzelmaßnahmen',
            desc: `Gebäudehülle & Anlagentechnik – ${rate}% Zuschuss`,
            amount: envFunding,
            rate: rate,
            maxEligible: eligibleCost,
            details: `Fördersatz ${rate}%. Max. förderfähig: ${formatCurrency(maxEligible)} (${formatCurrency(maxPerUnit)}/WE × ${units} WE).${hasISFP ? ' Erhöhte Kostenobergrenze dank iSFP.' : ''}`,
            bonuses: bonuses,
            calculation: envCalc
        });

        totalFunding += envFunding;
    }

    // Energieberatung / iSFP – Förderung bezieht sich auf Netto-Honorar, Kunde zahlt brutto
    if (hasISFP) {
        const bt = state.buildingType || 'efh';
        const isfpNetto = FD.isfp.costNetto[bt] || FD.isfp.costNetto.efh;
        const isfpBrutto = FD.isfp.costBrutto[bt] || FD.isfp.costBrutto.efh;
        const maxFunding = (bt === 'mfh') ? FD.isfp.maxFunding.mfh : FD.isfp.maxFunding.efh;
        const beratungFunding = Math.min(Math.round(isfpNetto * FD.isfp.rate / 100), maxFunding);
        results.nebenkosten.isfp = isfpBrutto; // Brutto = was der Kunde zahlt
        results.nebenkosten.isfpFoerderung = beratungFunding;
        results.programs.push({
            type: 'bafa',
            name: 'BAFA Energieberatung (iSFP)',
            desc: '50% Zuschuss auf Netto-Honorar des Energieberaters',
            amount: beratungFunding,
            rate: 50,
            maxEligible: isfpNetto,
            details: `iSFP-Kosten: ${formatCurrency(isfpNetto)} netto (${formatCurrency(isfpBrutto)} brutto). Förderung: 50% auf netto, max. ${formatCurrency(maxFunding)}. Ihr Eigenanteil: ${formatCurrency(isfpBrutto - beratungFunding)}.`,
            bonuses: [],
            calculation: `Rechenweg: Netto-Honorar ${formatCurrency(isfpNetto)} × 50% = ${formatCurrency(Math.round(isfpNetto * 0.5))} → gedeckelt auf max. ${formatCurrency(maxFunding)} = <strong>${formatCurrency(beratungFunding)}</strong><br><span style="font-size:0.8rem;">Hinweis: Förderung bezieht sich auf das Netto-Honorar. Sie zahlen brutto ${formatCurrency(isfpBrutto)}, Ihr Eigenanteil: ${formatCurrency(isfpBrutto - beratungFunding)}.</span>`
        });
        totalFunding += beratungFunding;
    }

    // Fachplanung & Baubegleitung bei Einzelmaßnahmen: 50% Zuschuss auf 5% der Investitionskosten
    if (nonHeating.length > 0 || selectedHeating.length > 0) {
        const investTotal = state.measures.reduce((s, m) => s + (state.costs[m] || 0), 0);
        const bauEstimate = Math.round(investTotal * 0.05); // 5% der Investitionssumme
        const bauRate = FD.baubegleitungEM.rate;
        const bauFunding = Math.round(bauEstimate * bauRate / 100);
        results.nebenkosten.bau = bauEstimate;
        results.nebenkosten.bauFoerderung = bauFunding;
        results.programs.push({
            type: 'bafa',
            name: 'BAFA Fachplanung & Baubegleitung',
            desc: `${bauRate}% Zuschuss auf Baubegleitungskosten (ca. 5% der Investitionssumme)`,
            amount: bauFunding,
            rate: bauRate,
            maxEligible: bauEstimate,
            details: `Investitionssumme: ${formatCurrency(investTotal)}. Baubegleitung (5%): ${formatCurrency(bauEstimate)}. Förderung: ${bauRate}%. Ihr Eigenanteil: ${formatCurrency(bauEstimate - bauFunding)}.`,
            bonuses: [],
            calculation: `Rechenweg: Investitionssumme ${formatCurrency(investTotal)} × 5% = ${formatCurrency(bauEstimate)} Baubegleitungskosten → davon ${bauRate}% = <strong>${formatCurrency(bauFunding)}</strong>`
        });
        totalFunding += bauFunding;
    }

    results.totalFunding = totalFunding;
}

function calculateStateFunding(results) {
    const bl = state.bundesland;
    const sp = FD.statePrograms;
    if (!sp || !sp[bl]) return;

    sp[bl].programs.forEach(prog => {
        if (prog.loanOnly) {
            results.statePrograms.push({
                name: prog.name,
                desc: prog.desc,
                amount: 0,
                isLoan: true,
                loanDesc: prog.loanDesc,
                bundesland: sp[bl].name
            });
            return;
        }

        let applies = false;
        if (prog.applies === 'all') applies = state.measures.length > 0;
        else if (prog.applies === 'envelope') applies = state.measures.some(m => envelopeMeasures.includes(m));
        else if (prog.applies === 'heating') applies = state.measures.some(m => heatingMeasures.includes(m));

        if (!applies) return;

        const relevantCost = results.totalCost;
        const bonus = Math.min(Math.round(relevantCost * prog.bonusPercent / 100), prog.maxBonus);

        if (bonus > 0) {
            results.statePrograms.push({
                name: prog.name,
                desc: prog.desc,
                amount: bonus,
                isLoan: false,
                bundesland: sp[bl].name
            });

            // Check cumulation limit
            const currentTotal = results.totalFunding + bonus;
            const maxAllowed = results.totalCost * FD.kumulierung.maxPublicFundingRate / 100;
            const actualBonus = Math.min(bonus, maxAllowed - results.totalFunding);
            if (actualBonus > 0) {
                results.totalFunding += actualBonus;
                results.programs.push({
                    type: 'state',
                    name: `${prog.name} (${sp[bl].name})`,
                    desc: prog.desc,
                    amount: actualBonus,
                    rate: prog.bonusPercent,
                    maxEligible: relevantCost,
                    details: `Landesförderung: ${prog.bonusPercent}%, max. ${formatCurrency(prog.maxBonus)}. Ggf. reduziert durch 60%-Kumulierungsgrenze.`,
                    bonuses: []
                });
            }
        }
    });
}

function calculateTaxAlternative(results) {
    // §35c EStG: 7% Year 1+2, 6% Year 3 = 20% over 3 years, max 200k eligible, max 40k tax reduction
    // NUR für selbstgenutzte WE! Bei gemischter Nutzung: anteilig.
    if (state.weEigengenutzt === 0) {
        results.taxAlternative = { eligible: false, reason: 'Steuerliche Förderung nach §35c nur für selbstgenutztes Wohneigentum. Ihre WE sind komplett vermietet.' };
        return;
    }

    const buildYearOld = ['pre1957', '1957-1978', '1979-1994', '1995-2001', '2002-2014'];
    if (!buildYearOld.includes(state.buildYear)) {
        results.taxAlternative = { eligible: false, reason: 'Gebäude muss mindestens 10 Jahre alt sein.' };
        return;
    }

    // Bei gemischter Nutzung: nur anteilige Kosten für eigengenutzte WE
    const eigenAnteil = state.unitCount > 1 ? state.weEigengenutzt / state.unitCount : 1;
    const totalCost = results.totalCost;
    const eigenCost = Math.round(totalCost * eigenAnteil);
    const eligibleCost = Math.min(eigenCost, FD.par35c.maxEligibleCost);

    const year1 = Math.min(Math.round(eligibleCost * FD.par35c.year1Rate / 100), FD.par35c.maxYear1);
    const year2 = Math.min(Math.round(eligibleCost * FD.par35c.year2Rate / 100), FD.par35c.maxYear2);
    const year3 = Math.min(Math.round(eligibleCost * FD.par35c.year3Rate / 100), FD.par35c.maxYear3);
    const totalTax = year1 + year2 + year3;

    let note = 'Steuerermäßigung nach §35c EStG über 3 Jahre. Kann NICHT mit KfW/BAFA für dieselbe Maßnahme kombiniert werden.';
    if (eigenAnteil < 1) {
        note += ` Nur der Anteil Ihrer ${state.weEigengenutzt} eigengenutzten WE (${Math.round(eigenAnteil * 100)}% = ${formatCurrency(eigenCost)}) ist §35c-fähig. Die Kosten der vermieteten WE können als Werbungskosten bei V+V abgesetzt werden.`;
    }

    results.taxAlternative = {
        eligible: true,
        totalReduction: totalTax,
        year1, year2, year3,
        eligibleCost,
        eigenAnteil,
        effectiveRate: totalCost > 0 ? Math.round((totalTax / totalCost) * 100) : 0,
        note
    };
}

function generateTips(results, isOwner, isWPB, hasISFP) {
    const tips = [];

    if (!hasISFP && state.renovGoal === 'einzeln') {
        const extraFunding = Math.round(results.totalCost * 0.05);
        const bt = state.buildingType || 'efh';
        const isfpBruttoTip = FD.isfp.costBrutto[bt] || FD.isfp.costBrutto.efh;
        const isfpMaxTip = (bt === 'mfh') ? FD.isfp.maxFunding.mfh : FD.isfp.maxFunding.efh;
        tips.push({
            title: 'iSFP erstellen lassen',
            text: `Ein individueller Sanierungsfahrplan (ca. ${formatCurrency(isfpBruttoTip)} brutto) bringt Ihnen +5% Förderbonus und verdoppelt die förderfähigen Kosten von 30.000 € auf 60.000 €/WE. Geschätzte Mehrförderung: ca. ${formatCurrency(extraFunding)}. Die iSFP-Erstellung wird mit 50% auf netto bezuschusst (max. ${formatCurrency(isfpMaxTip)}).`,
            priority: 'high'
        });
    }

    if (isWPB) {
        tips.push({
            title: 'Worst Performing Building Bonus nutzen',
            text: 'Ihr Gebäude qualifiziert sich als "Worst Performing Building" (Baujahr vor 1979, unsaniert). Dies bringt bei einer Effizienzhaussanierung +10% Tilgungszuschuss.',
            priority: 'high'
        });
    }

    if (isOwner && state.income !== 'under40k' && state.measures.some(m => heatingMeasures.includes(m))) {
        tips.push({
            title: 'Einkommensbonus prüfen',
            text: 'Bei einem zu versteuernden Einkommen ≤ 40.000 € erhalten Sie +30% Einkommensbonus beim Heizungstausch. Prüfen Sie Ihren Steuerbescheid.',
            priority: 'medium'
        });
    }

    // Schallschutz-Tipp bei Luft-Wärmepumpe
    if (state.measures.includes('heat_pump')) {
        const hpType = document.getElementById('hp_type')?.value || 'luft_mono';
        const hpKW = parseInt(document.getElementById('hp_leistung')?.value) || 12;
        if (hpType.startsWith('luft')) {
            const maxDB = hpKW <= 6 ? 55 : hpKW <= 12 ? 60 : 68;
            tips.push({
                title: 'Neue Schallschutz-Anforderungen ab 2026',
                text: `Seit 01.01.2026 gelten verschärfte Schallgrenzwerte für die BEG-Förderung: Ihre ${hpKW}-kW-Luft-WP darf max. ${maxDB} dB(A) Schallleistung haben (10 dB unter EU-Ecodesign). Lassen Sie sich vom Installateur das Produktdatenblatt zeigen. Tipp: Wärmepumpen mit Invertertechnik und optimierter Schalldämpfung wählen.`,
                priority: 'high'
            });
        }
    }

    const speedEligible = ['oil', 'coal', 'nightstorage', 'biomass_old', 'gas'];
    if (state.measures.some(m => heatingMeasures.includes(m)) && speedEligible.includes(state.currentHeating)) {
        tips.push({
            title: 'Klimageschwindigkeitsbonus sichern',
            text: 'Der +20% Klimageschwindigkeitsbonus gilt bis 2028. Ab 2029 sinkt er alle 2 Jahre um 3%. Jetzt handeln lohnt sich!',
            priority: 'medium'
        });
    }

    if (state.renovGoal === 'einzeln' && state.measures.length >= 3) {
        tips.push({
            title: 'Effizienzhaussanierung prüfen',
            text: 'Bei mehreren Maßnahmen kann eine Komplettsanierung zum Effizienzhaus deutlich höhere Förderung bringen (bis 45% Tilgungszuschuss auf bis zu 150.000 €/WE).',
            priority: 'medium'
        });
    }

    // Tipp: Maßnahmen auf mehrere Jahre aufteilen
    if (state.renovGoal === 'einzeln') {
        const maxPerWE = hasISFP ? 60000 : 30000;
        const totalEligible = results.totalCost;
        const units = state.unitCount || 1;
        if (totalEligible > maxPerWE * units) {
            const ueberschuss = totalEligible - maxPerWE * units;
            tips.push({
                title: 'Maßnahmen auf mehrere Jahre aufteilen',
                text: `Ihre förderfähigen Kosten (${formatCurrency(totalEligible)}) übersteigen das jährliche Maximum von ${formatCurrency(maxPerWE)}/WE um ${formatCurrency(ueberschuss)}. Der Fördertopf steht Ihnen jedes Kalenderjahr neu zur Verfügung! Teilen Sie die Maßnahmen verschiedener Gewerke auf 2+ Jahre auf, um die volle Förderung auszuschöpfen. Beispiel: Jahr 1 Gebäudehülle, Jahr 2 Heizungstausch.`,
                priority: 'high'
            });
        }
    }

    // Solarpflicht-Tipp bei Dachsanierung mit Neueindeckung
    if (state.measures.includes('roof_insulation')) {
        const rType = document.getElementById('roof_type')?.value || 'zwischensparren';
        const solarBL = { bw:'Baden-Württemberg', be:'Berlin', hb:'Bremen', hh:'Hamburg', ni:'Niedersachsen', nw:'Nordrhein-Westfalen' };
        if ((rType === 'aufsparren' || rType === 'flachdach') && solarBL[state.bundesland]) {
            tips.push({
                title: `Solarpflicht in ${solarBL[state.bundesland]} beachten!`,
                text: `Bei einer vollständigen Neueindeckung des Daches gilt in ${solarBL[state.bundesland]} die Solarpflicht. Sie müssen PV oder Solarthermie mit installieren. Planen Sie diese Zusatzkosten ein – gleichzeitig profitieren Sie von Einspeisevergütung und Eigenverbrauch.`,
                priority: 'high'
            });
        }
    }

    if (results.taxAlternative && results.taxAlternative.eligible) {
        const taxBetter = results.taxAlternative.totalReduction > results.totalFunding;
        if (taxBetter) {
            tips.push({
                title: 'Steuerliche Förderung prüfen',
                text: `In Ihrem Fall könnte die steuerliche Förderung nach §35c EStG (${formatCurrency(results.taxAlternative.totalReduction)}) günstiger sein als die direkte Förderung (${formatCurrency(results.totalFunding)}).`,
                priority: 'high'
            });
        }
    }

    tips.push({
        title: 'Antrag VOR Auftragsvergabe',
        text: 'Stellen Sie den Förderantrag immer VOR der Auftragsvergabe. Verträge dürfen nur mit auflösender/aufschiebender Bedingung geschlossen werden.',
        priority: 'high'
    });

    if (state.measures.some(m => heatingMeasures.includes(m))) {
        tips.push({
            title: 'Ergänzungskredit KfW 358/359',
            text: 'Bei Liquiditätsbedarf können Sie zusätzlich den KfW-Ergänzungskredit (bis 120.000 €, ab 0,01% Zinsen) beantragen.',
            priority: 'low'
        });
    }

    // Vermieter-Tipps
    if (state.weVermietet > 0) {
        tips.push({
            title: 'Vermietete WE: Kosten als Werbungskosten absetzbar',
            text: `Die Sanierungskosten für Ihre ${state.weVermietet} vermietete(n) WE können Sie als Werbungskosten bei den Einkünften aus Vermietung und Verpachtung (V+V) geltend machen. Bei umfangreichen Maßnahmen ggf. auf mehrere Jahre verteilen (§ 82b EStDV).`,
            priority: 'medium'
        });
        tips.push({
            title: 'Modernisierungsumlage möglich',
            text: 'Als Vermieter können Sie bis zu 10% der für die Wohnung aufgewendeten Modernisierungskosten (abzgl. Förderung) als Mieterhöhung umlegen. Bei Nutzung von BEG-Förderung max. 10% abzgl. Förderbetrag.',
            priority: 'low'
        });
    }

    if (state.weEigengenutzt > 0 && state.weVermietet > 0) {
        tips.push({
            title: 'Gemischte Nutzung: Getrennte Anträge',
            text: `Bei Ihrem Gebäude mit ${state.weEigengenutzt} eigengenutzter und ${state.weVermietet} vermieteter WE: Boni (Klima, Einkommen) können nur für die eigengenutzte WE per Zusatzantrag bei der KfW beantragt werden. Der Basisantrag deckt die Grundförderung für alle WE ab.`,
            priority: 'high'
        });
    }

    results.tips = tips;
}

// ============================================================
// RENDER RESULTS
// ============================================================
function renderResults(r) {
    const container = document.getElementById('results-content');
    let html = '';

    // Validation banner
    const validDate = formatDate(FD.meta.lastValidated);
    const nextValidation = formatDate(FD.meta.nextValidation);
    const daysSinceVal = (Date.now() - new Date(FD.meta.lastValidated).getTime()) / 86400000;
    const staleClass = daysSinceVal > 45 ? ' validation-stale' : '';
    html += `
    <div class="validation-banner${staleClass}">
        <div><span class="validation-dot"></span><strong>Förderdaten validiert:</strong> ${validDate} &middot; Nächste Prüfung: ${nextValidation}${daysSinceVal > 45 ? ' ⚠️ Prüfung überfällig!' : ''}</div>
        <div style="font-size:0.78rem;color:var(--text-light);">Quellen: KfW, BAFA, BMWi &middot; Alle Angaben ohne Gewähr</div>
    </div>`;

    // Hero result
    const gesamtInkl = r.totalCost + r.nebenkosten.gesamt;
    const foerderquoteInkl = gesamtInkl > 0 ? Math.round((r.totalFunding / gesamtInkl) * 100) : 0;
    html += `
    <div class="result-hero savings-pulse count-animate">
        <div class="big-label">Ihre maximale Förderung</div>
        <div class="big-number">${formatCurrency(r.totalFunding)}</div>
        <div class="big-label">${foerderquoteInkl}% der Gesamtkosten von ${formatCurrency(gesamtInkl)} inkl. Nebenkosten</div>
    </div>`;
    html += `
    <div class="result-cards">
        <div class="result-card">
            <div class="rc-value">${formatCurrency(gesamtInkl)}</div>
            <div class="rc-label">Gesamtkosten inkl. Nebenkosten</div>
        </div>
        <div class="result-card">
            <div class="rc-value" style="color:var(--success);">${formatCurrency(r.totalFunding)}</div>
            <div class="rc-label">Gesamtförderung</div>
        </div>
        <div class="result-card">
            <div class="rc-value" style="color:var(--warning);">${formatCurrency(r.eigenanteil)}</div>
            <div class="rc-label">Ihr Eigenanteil</div>
        </div>
        <div class="result-card">
            <div class="rc-value">${foerderquoteInkl}%</div>
            <div class="rc-label">Förderquote (inkl. Nebenkosten)</div>
        </div>
    </div>`;

    // Donut chart
    const fundingParts = r.programs.filter(p => p.amount > 0);
    html += renderDonut(fundingParts, r.eigenanteil, r.totalCost);

    // Programs detail
    html += `<div class="card">
        <div class="card-title">Ihre Förderprogramme im Detail</div>
        <div class="card-subtitle">Optimale Kombination für Ihre Maßnahmen</div>
        <ul class="program-list">`;

    r.programs.forEach(p => {
        if (p.amount <= 0) return;
        const badgeClass = p.type === 'kfw' ? 'badge-kfw' : p.type === 'bafa' ? 'badge-bafa' : 'badge-state';
        const itemClass = p.type;
        html += `
        <li class="program-item ${itemClass}">
            <div class="program-header">
                <div>
                    <span class="program-badge ${badgeClass}">${p.type.toUpperCase()}</span>
                    <span class="program-name">${p.name}</span>
                </div>
                <div class="program-amount">${formatCurrency(p.amount)}</div>
            </div>
            <div class="program-details">${p.desc}</div>
            <div class="program-details">${p.details}</div>
            ${p.bonuses.length > 0 ? `<div class="program-tip">${p.bonuses.join(' | ')}</div>` : ''}
            ${p.calculation ? `<div class="calculation-box">${p.calculation}</div>` : ''}
        </li>`;
    });

    html += '</ul></div>';

    // === Gesamtrechnung Zusammenfassung ===
    html += `<div class="card">
        <div class="card-title">Gesamtrechnung – So setzt sich Ihre Förderung zusammen</div>
        <div class="card-subtitle">Transparenter Rechenweg Schritt für Schritt</div>
        <div class="tax-explanation" style="background:#f0f7f3; border-left-color:var(--primary);">`;

    let runningTotal = 0;
    r.programs.forEach(p => {
        if (p.amount <= 0) return;
        runningTotal += p.amount;
        html += `<div class="calc-line"><span>${p.name}</span><span>+ ${formatCurrency(p.amount)}</span></div>`;
    });
    html += `<div class="calc-line" style="margin-top:0.3rem; padding-top:0.5rem; border-top:2px solid var(--primary); border-bottom:none;">
        <span><strong>Summe Förderung (vor Kumulierungsgrenze)</strong></span><span><strong>${formatCurrency(runningTotal)}</strong></span></div>`;

    if (r.totalFunding < runningTotal) {
        const kumLimit = FD.kumulierung.maxPublicFundingRate;
        html += `<div class="calc-line" style="color:var(--warning); border-bottom:none;">
            <span>${kumLimit}%-Kumulierungsgrenze (${formatCurrency(r.totalCost)} × ${kumLimit}%)</span><span>max. ${formatCurrency(Math.round(r.totalCost * kumLimit / 100))}</span></div>`;
    }
    html += `<div class="calc-line" style="font-size:1.05rem; border-bottom:none; color:var(--primary);">
        <span><strong>Tatsächliche Gesamtförderung</strong></span><span><strong>${formatCurrency(r.totalFunding)}</strong></span></div>`;
    html += `<div class="calc-line" style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px dashed #ccc; border-bottom:none;">
        <span>Kosten Baumaßnahmen</span><span>${formatCurrency(r.totalCost)}</span></div>`;
    const nk = r.nebenkosten;
    if (nk.gesamt > 0) {
        html += `<div class="calc-line" style="border-bottom:none;">
            <span>+ Nebenkosten (Energieberatung + Baubegleitung)</span><span>+ ${formatCurrency(nk.gesamt)}</span></div>`;
        html += `<div class="calc-line" style="border-bottom:none; font-weight:600;">
            <span>Gesamtkosten inkl. Nebenkosten</span><span>${formatCurrency(r.totalCost + nk.gesamt)}</span></div>`;
    }
    html += `<div class="calc-line" style="border-bottom:none;">
        <span>– Gesamtförderung</span><span>– ${formatCurrency(r.totalFunding)}</span></div>`;
    html += `<div class="calc-line" style="font-size:1.05rem; border-bottom:none; color:var(--warning);">
        <span><strong>= Ihr Eigenanteil</strong></span><span><strong>${formatCurrency(r.eigenanteil)}</strong></span></div>`;
    if (nk.eigenanteil > 0) {
        html += `<div class="calc-line" style="border-bottom:none; font-size:0.82rem; color:#666;">
            <span>davon Eigenanteil Nebenkosten (iSFP: ${formatCurrency(nk.isfp - nk.isfpFoerderung)}, GEB: ${formatCurrency(nk.bau - nk.bauFoerderung)})</span><span>${formatCurrency(nk.eigenanteil)}</span></div>`;
    }

    html += '</div></div>';

    // State programs info
    if (r.statePrograms.length > 0) {
        html += `<div class="card">
            <div class="card-title">Landesförderung – ${FD.statePrograms[state.bundesland]?.name || state.bundesland}</div>
            <div class="card-subtitle">Ergänzende Programme Ihres Bundeslandes</div>`;
        r.statePrograms.forEach(sp => {
            html += `<div class="info-box">
                <strong>${sp.name}</strong><br>
                ${sp.desc}
                ${sp.isLoan ? `<br><em>${sp.loanDesc}</em>` : `<br>Zusätzliche Förderung: <strong>${formatCurrency(sp.amount)}</strong>`}
            </div>`;
        });
        html += '</div>';
    }

    // Bar chart visualization
    html += renderBarChart(r);

    // Tax comparison
    if (r.taxAlternative && r.taxAlternative.eligible) {
        html += renderTaxComparison(r);
    }

    // Tips
    if (r.tips.length > 0) {
        html += `<div class="card">
            <div class="card-title">Tipps zur Fördermaximierung</div>
            <div class="card-subtitle">So holen Sie das Maximum heraus</div>`;
        r.tips.forEach(tip => {
            const cls = tip.priority === 'high' ? 'tip-box' : 'info-box';
            html += `<div class="${cls}">
                <div class="tip-box-title">${tip.title}</div>
                <p>${tip.text}</p>
            </div>`;
        });
        html += '</div>';
    }

    // Timeline
    html += `<div class="card">
        <div class="card-title">Antragsschritte & Fristen</div>
        <div class="card-subtitle">So gehen Sie vor</div>
        <div class="timeline">`;
    r.timeline.forEach(t => {
        html += `<div class="timeline-item">
            <div class="timeline-step">${t.step}</div>
            <div class="timeline-desc">${t.desc}</div>
        </div>`;
    });
    html += '</div>';

    html += `<div class="warning-box" style="margin-top:1rem;">
        <strong>Wichtig:</strong> Alle Förderanträge müssen VOR der Auftragsvergabe gestellt werden.
        Verträge mit Handwerkern dürfen nur unter dem Vorbehalt der Förderzusage geschlossen werden (auflösende Bedingung).
    </div>`;
    html += '</div>';

    // Gewerk-Tipps
    html += renderGewerkTips();

    container.innerHTML = html;

    // Animate bars
    setTimeout(() => {
        document.querySelectorAll('.bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 100);
}

function renderDonut(parts, eigen, total) {
    if (total === 0) return '';
    const colors = {
        kfw: '#0066cc',
        bafa: '#e74c3c',
        state: '#f39c12',
        tax: '#8e44ad'
    };
    const eigenColor = '#bdc3c7';

    let segments = parts.map(p => ({
        label: p.name.split('–')[0].trim(),
        value: p.amount,
        color: colors[p.type] || '#95a5a6'
    }));
    segments.push({ label: 'Eigenanteil', value: eigen, color: eigenColor });

    const circumference = 2 * Math.PI * 70; // r=70
    let offset = 0;
    let arcs = '';
    segments.forEach(seg => {
        const pct = seg.value / total;
        const dash = circumference * pct;
        arcs += `<circle cx="90" cy="90" r="70" fill="none" stroke="${seg.color}" stroke-width="25"
            stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}"
            style="transition: stroke-dasharray 1s ease-out, stroke-dashoffset 1s ease-out;" />`;
        offset += dash;
    });

    let legend = segments.map(seg =>
        `<div class="donut-legend-item">
            <div class="donut-color" style="background:${seg.color}"></div>
            <span>${seg.label}: <strong>${formatCurrency(seg.value)}</strong> (${Math.round(seg.value / total * 100)}%)</span>
        </div>`
    ).join('');

    return `<div class="donut-container">
        <svg class="donut-svg" viewBox="0 0 180 180">${arcs}</svg>
        <div class="donut-legend">${legend}</div>
    </div>`;
}

function renderBarChart(r) {
    if (r.programs.length === 0) return '';
    const maxVal = r.totalCost;
    let bars = '';

    r.programs.forEach(p => {
        if (p.amount <= 0) return;
        const pct = Math.max(5, Math.round(p.amount / maxVal * 100));
        const label = p.name.split('–')[0].trim();
        bars += `<div class="bar-row">
            <div class="bar-label">${label}</div>
            <div class="bar-track">
                <div class="bar-fill ${p.type}" data-width="${pct}%" style="width:0%">${formatCurrency(p.amount)}</div>
            </div>
        </div>`;
    });

    const eigenPct = Math.max(5, Math.round(r.eigenanteil / maxVal * 100));
    bars += `<div class="bar-row">
        <div class="bar-label">Eigenanteil</div>
        <div class="bar-track">
            <div class="bar-fill eigen" data-width="${eigenPct}%" style="width:0%">${formatCurrency(r.eigenanteil)}</div>
        </div>
    </div>`;

    return `<div class="card">
        <div class="card-title">Kostenverteilung</div>
        <div class="bar-chart">${bars}</div>
    </div>`;
}

function renderTaxComparison(r) {
    const tax = r.taxAlternative;
    const directBetter = r.totalFunding >= tax.totalReduction;

    // Investitionskosten je Maßnahme aufschlüsseln
    let costBreakdownHtml = '';
    let totalMeasureCost = 0;
    state.measures.forEach(m => {
        const cost = state.costs[m] || 0;
        if (cost > 0) {
            totalMeasureCost += cost;
            costBreakdownHtml += `<div class="calc-line" style="border-bottom:none;"><span>${measureLabels[m] || m}</span><span>${formatCurrency(cost)}</span></div>`;
        }
    });

    return `<div class="card">
        <div class="card-title">Alternative: Steuerliche Förderung nach §35c EStG</div>
        <div class="card-subtitle">Statt KfW/BAFA können Sie die Kosten auch steuerlich absetzen – lohnt sich das?</div>

        <div class="tax-explanation" style="background:#f0f7f3; border-left-color:var(--primary);">
            <strong>Ihre Investitionskosten nach Maßnahme:</strong><br><br>
            ${costBreakdownHtml}
            <div class="calc-line" style="margin-top:0.3rem; padding-top:0.5rem; border-top:2px solid var(--primary); border-bottom:none;">
                <span><strong>Gesamte Investitionskosten</strong></span><span><strong>${formatCurrency(totalMeasureCost)}</strong></span></div>
            ${tax.eligibleCost < totalMeasureCost ? `<div class="calc-line" style="border-bottom:none; color:var(--text-light); font-size:0.85rem;">
                <span>Davon §35c-fähig (nur eigengenutzt)</span><span>${formatCurrency(tax.eligibleCost)}</span></div>` : ''}
            ${tax.eligibleCost > 200000 ? `<div class="calc-line" style="border-bottom:none; color:var(--warning); font-size:0.85rem;">
                <span>Obergrenze §35c: max. 200.000 € pro Objekt</span><span>${formatCurrency(200000)}</span></div>` : ''}
        </div>

        <div class="tax-explanation" style="margin-top:0.8rem;">
            <strong>So berechnet sich die steuerliche Förderung:</strong><br><br>
            Von Ihren Investitionskosten (${formatCurrency(tax.eligibleCost)}) erstattet das Finanzamt über 3 Jahre insgesamt 20%:<br><br>
            <div class="calc-line"><span>Jahr 1: ${formatCurrency(tax.eligibleCost)} × 7%</span><span>${formatCurrency(tax.year1)}</span></div>
            <div class="calc-line"><span>Jahr 2: ${formatCurrency(tax.eligibleCost)} × 7%</span><span>${formatCurrency(tax.year2)}</span></div>
            <div class="calc-line"><span>Jahr 3: ${formatCurrency(tax.eligibleCost)} × 6%</span><span>${formatCurrency(tax.year3)}</span></div>
            <div class="calc-line" style="margin-top:0.3rem; padding-top:0.5rem; border-top:2px solid var(--primary); border-bottom:none;">
                <span><strong>Steuerermäßigung gesamt (20%)</strong></span><span><strong>${formatCurrency(tax.totalReduction)}</strong></span></div>
            <br>
            <span style="font-size:0.85rem; color:var(--text-light);">
                Die 20% werden direkt von Ihrer Steuerschuld abgezogen – das ist ein echter Zuschuss vom Finanzamt, verteilt über 3 Steuerjahre.
                Kein Energieberater nötig, aber ein Fachunternehmer muss die Arbeiten bescheinigen.
            </span>
        </div>

        <div class="card" style="margin-top:1rem; background:${directBetter ? '#f0f7f3' : '#fef9e7'}; border-left:4px solid ${directBetter ? 'var(--primary)' : 'var(--warning)'};">
            <strong style="font-size:1.1rem;">Vergleich: Was bringt Ihnen mehr?</strong>
            <table class="comparison-table" style="margin-top:0.8rem;">
                <thead>
                    <tr>
                        <th></th>
                        <th style="${directBetter ? 'background:var(--primary);color:white;' : ''}">Direkte Förderung (KfW/BAFA)</th>
                        <th style="${!directBetter ? 'background:var(--primary);color:white;' : ''}">Steuerlich (§35c EStG)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="highlight-row">
                        <td><strong>Ihr Vorteil</strong></td>
                        <td><strong style="font-size:1.1rem; ${directBetter ? 'color:var(--success);' : ''}">${formatCurrency(r.totalFunding)}</strong></td>
                        <td><strong style="font-size:1.1rem; ${!directBetter ? 'color:var(--success);' : ''}">${formatCurrency(tax.totalReduction)}</strong></td>
                    </tr>
                    <tr>
                        <td>Effektive Förderquote</td>
                        <td>${r.totalFundingPercent}% (${formatCurrency(r.totalFunding)} von ${formatCurrency(r.totalCost)})</td>
                        <td>${r.totalCost > 0 ? Math.round(tax.totalReduction / r.totalCost * 100) : 20}% (${formatCurrency(tax.totalReduction)} von ${formatCurrency(r.totalCost)})</td>
                    </tr>
                    <tr>
                        <td>Auszahlung</td>
                        <td>Sofort nach Bewilligung</td>
                        <td>Verteilt über 3 Steuerjahre</td>
                    </tr>
                    <tr>
                        <td>Energieberater</td>
                        <td>Ja, erforderlich (wird gefördert)</td>
                        <td>Nein, nur Fachunternehmer</td>
                    </tr>
                    <tr>
                        <td>Antrag</td>
                        <td>Vor Baubeginn bei KfW/BAFA</td>
                        <td>Nachträglich per Steuererklärung</td>
                    </tr>
                    <tr>
                        <td>Investitionskosten</td>
                        <td colspan="2" style="text-align:center;">${formatCurrency(totalMeasureCost)} (Ihre geplanten Maßnahmen)</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-top:0.8rem; padding:0.8rem; border-radius:8px; background:${directBetter ? 'rgba(26,107,60,0.08)' : 'rgba(243,156,18,0.08)'};">
                <strong>${directBetter ? '✅ Empfehlung: Direktförderung über KfW/BAFA' : '⚠️ Prüfen Sie die steuerliche Variante mit Ihrem Steuerberater'}</strong><br>
                <span style="font-size:0.9rem;">${directBetter
                    ? `Die direkte Förderung bringt Ihnen <strong>${formatCurrency(r.totalFunding - tax.totalReduction)} mehr</strong> als die steuerliche Variante – und das Geld kommt sofort.`
                    : `Die steuerliche Förderung bringt Ihnen <strong>${formatCurrency(tax.totalReduction - r.totalFunding)} mehr</strong> als die Direktförderung – allerdings verteilt über 3 Jahre.`
                }</span>
            </div>
        </div>

        <div class="info-box" style="margin-top:0.8rem;">
            <strong>💡 Profi-Tipp: Splitting-Strategie</strong><br>
            Sie können verschiedene Maßnahmen auf verschiedene Förderwege aufteilen.
            Beispiel: Heizungstausch über KfW 458 (höhere Förderung), Dachdämmung über §35c (einfacher).
            Voraussetzung: Klare Kostentrennung in den Rechnungen.
        </div>
    </div>`;
}

function renderGewerkTips() {
    const selectedEnvelope = state.measures.filter(m => envelopeMeasures.includes(m));
    const selectedHeating = state.measures.filter(m => heatingMeasures.includes(m));

    if (selectedEnvelope.length === 0 && selectedHeating.length === 0) return '';

    let html = `<div class="card">
        <div class="card-title">Gewerk-spezifische Hinweise</div>
        <div class="card-subtitle">Wichtiges für Planung und Ausführung</div>`;

    if (state.measures.includes('wall_insulation')) {
        html += `<div class="info-box">
            <strong>Fassadendämmung:</strong> Achten Sie auf einen U-Wert ≤ 0,20 W/(m²K) für die volle Förderung.
            Lassen Sie den Energieberater die Dämmstoffdicke berechnen. WDVS, vorgehängte hinterlüftete Fassade und Einblasdämmung sind förderfähig.
        </div>`;
    }
    if (state.measures.includes('windows')) {
        html += `<div class="info-box">
            <strong>Fenster:</strong> Uw-Wert ≤ 0,95 W/(m²K) erforderlich. 3-fach-Verglasung empfohlen.
            Auch Haustüren sind förderfähig (UD ≤ 1,3 W/(m²K)). Rollladenkasten-Dämmung kann einbezogen werden.
        </div>`;
    }
    if (state.measures.includes('roof_insulation')) {
        html += `<div class="info-box">
            <strong>Dachdämmung:</strong> U-Wert ≤ 0,14 W/(m²K) für Dachflächen. Alternativ: Oberste Geschossdecke dämmen (U ≤ 0,14).
            Dampfbremse und Luftdichtheit beachten – häufiger Fehler bei der Ausführung.
        </div>`;
    }
    if (state.measures.includes('heat_pump')) {
        html += `<div class="info-box">
            <strong>Wärmepumpe:</strong> Seit 01/2026: Luft-WP müssen 10 dB unter EU-Ecodesign liegen (≤6 kW: max. 55 dB, 6–12 kW: max. 60 dB, 12–30 kW: max. 68 dB). Sonst keine Förderung!
            Sole-Wasser und Wasser-Wasser-WP erhalten ggf. +5% Effizienzbonus. Achten Sie auf die Jahresarbeitszahl (JAZ ≥ 3,0).
        </div>`;
    }
    if (state.measures.includes('biomass')) {
        html += `<div class="info-box">
            <strong>Biomasse-Heizung:</strong> Pellet- und Hackschnitzelheizungen sind förderfähig.
            Achten Sie auf Emissionsgrenzwerte und einen ausreichenden Pufferspeicher. Kombinierbar mit Solarthermie.
        </div>`;
    }
    if (state.measures.includes('ventilation')) {
        html += `<div class="info-box">
            <strong>Lüftungsanlage:</strong> Anlagen mit Wärmerückgewinnung (WRG ≥ 80%) sind besonders effizient.
            Zentrale und dezentrale Systeme sind förderfähig. Wichtig bei gut gedämmten Gebäuden.
        </div>`;
    }

    html += '</div>';
    return html;
}

// ============================================================
// VISITOR COUNTER (localStorage + optional API)
// ============================================================
function initCounter() {
    // Local counter as fallback
    let count = parseInt(localStorage.getItem('fn_visits') || '0') + 1;
    localStorage.setItem('fn_visits', count);

    const tooltip = document.getElementById('counterTooltip');

    // Try external counter API (countapi alternative via simple JSON endpoint)
    // If you host a counter endpoint, replace this URL:
    const COUNTER_API = null; // e.g. 'https://api.countapi.xyz/hit/ak-energyconsulting/foerdernavigator'

    if (COUNTER_API) {
        fetch(COUNTER_API)
            .then(r => r.json())
            .then(d => {
                if (tooltip) tooltip.textContent = `Seitenaufrufe: ${(d.value || d.count || count).toLocaleString('de-DE')}`;
            })
            .catch(() => {
                if (tooltip) tooltip.textContent = `Seitenaufrufe (lokal): ${count.toLocaleString('de-DE')}`;
            });
    } else {
        if (tooltip) tooltip.textContent = `Seitenaufrufe (lokal): ${count.toLocaleString('de-DE')}`;
    }
}

// ============================================================
// INIT – Load JSON data first, then initialize
// ============================================================
(async function init() {
    await loadFundingData();
    updateState();
    initCounter();
})();
