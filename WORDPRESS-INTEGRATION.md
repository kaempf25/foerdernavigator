# WordPress-Integration: AK Energy Consulting Fördernavigator

## Übersicht

Der Fördernavigator wird auf GitHub Pages gehostet und in Ihre WordPress-Seite
(www.ak-energyconsulting.de) per iframe eingebettet. Die Förderdaten werden
monatlich automatisch validiert.

## Schritt 1: GitHub Repository erstellen

1. Gehen Sie zu https://github.com/new
2. Repository-Name: `foerdernavigator`
3. Öffentlich (Public) – nötig für GitHub Pages
4. Repository erstellen

## Schritt 2: Code hochladen

```bash
cd FOERDERNAVIGATOR
git remote add origin https://github.com/IHR-USERNAME/foerdernavigator.git
git push -u origin main
```

## Schritt 3: GitHub Pages aktivieren

1. Im Repository: Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `main`, Ordner: `/docs`
4. Speichern

Nach wenigen Minuten ist der Fördernavigator erreichbar unter:
`https://IHR-USERNAME.github.io/foerdernavigator/`

## Schritt 4: In WordPress einbetten

### Option A: Iframe (empfohlen)

Erstellen Sie eine neue Seite in WordPress und fügen Sie einen **Custom HTML** Block ein:

```html
<div style="max-width:1000px; margin:0 auto;">
    <iframe
        src="https://IHR-USERNAME.github.io/foerdernavigator/"
        width="100%"
        height="2400"
        style="border:none; border-radius:12px; overflow:hidden;"
        loading="lazy"
        title="AK Energy Consulting Fördernavigator">
    </iframe>
</div>
```

Passen Sie `IHR-USERNAME` an Ihren GitHub-Benutzernamen an.

### Option B: Eigene Domain (optional)

Wenn Sie den Fördernavigator unter `foerdernavigator.ak-energyconsulting.de` hosten möchten:

1. DNS CNAME-Eintrag: `foerdernavigator` → `IHR-USERNAME.github.io`
2. In GitHub Pages Settings: Custom domain = `foerdernavigator.ak-energyconsulting.de`
3. HTTPS aktivieren (Enforce HTTPS)

Dann iframe-URL anpassen auf: `https://foerdernavigator.ak-energyconsulting.de/`

### Option C: Direkt als HTML in WordPress

Falls Sie das HTML direkt in WordPress verwenden möchten (ohne iframe):

1. Installieren Sie das Plugin "WPCode" oder "Custom CSS & JS"
2. Kopieren Sie den gesamten Inhalt von `docs/index.html`
3. Fügen Sie ihn als Custom HTML Snippet ein
4. Passen Sie die JSON-URL an:
   ```javascript
   const JSON_URL = 'https://IHR-USERNAME.github.io/foerdernavigator/data/foerderkonditionen.json';
   ```

## Schritt 5: JSON-URL in index.html anpassen

Nach dem Deployment die JSON_URL in `docs/index.html` ändern:

```javascript
// Zeile am Anfang des <script>-Blocks:
const JSON_URL = 'https://IHR-USERNAME.github.io/foerdernavigator/data/foerderkonditionen.json';
```

## Automatische Validierung

Der GitHub Actions Workflow läuft automatisch am 1. jedes Monats:

- Prüft KfW, BAFA und §35c Webseiten auf Änderungen
- Aktualisiert `data/foerderkonditionen.json`
- Bei Warnungen wird automatisch ein GitHub Issue erstellt
- Sie werden per E-Mail benachrichtigt (GitHub Notifications)

### Manuell validieren

1. Im Repository: Actions → "Monatliche Förder-Validierung"
2. "Run workflow" klicken

### Lokal validieren

```bash
node scripts/validate-funding.js
```

## Förderdaten manuell aktualisieren

Wenn sich Fördersätze ändern, bearbeiten Sie `data/foerderkonditionen.json`:

```bash
# Datei bearbeiten
nano data/foerderkonditionen.json

# In docs/ kopieren
cp data/foerderkonditionen.json docs/data/foerderkonditionen.json

# Committen und pushen
git add data/ docs/data/
git commit -m "Fördersätze aktualisiert: [Beschreibung]"
git push
```

Die Änderungen sind nach wenigen Minuten auf der Webseite sichtbar.

## Dateien-Übersicht

| Datei | Beschreibung |
|---|---|
| `docs/index.html` | Fördernavigator (GitHub Pages) |
| `docs/data/foerderkonditionen.json` | Förderdaten für den Navigator |
| `data/foerderkonditionen.json` | Master-Datei für Förderdaten |
| `scripts/validate-funding.js` | Validierungs-Script |
| `.github/workflows/validate-funding.yml` | Monatlicher Cron-Job |
| `index.html` | Lokale Entwicklungs-Kopie |

## Troubleshooting

**Fördernavigator zeigt "Fallback-Daten":**
→ JSON_URL falsch oder JSON nicht erreichbar. URL im Browser testen.

**GitHub Pages zeigt 404:**
→ Settings → Pages prüfen. Branch und Ordner korrekt?

**Iframe wird in WordPress nicht angezeigt:**
→ Prüfen ob Ihr Theme iframes erlaubt. Ggf. CSP-Header anpassen.

**Validierung erstellt falsche Warnungen:**
→ Webseiten-Struktur kann sich ändern. Script in `scripts/validate-funding.js` anpassen.
