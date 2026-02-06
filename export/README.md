# AK Energy Consulting Fördernavigator

Ein interaktiver Förderrechner für energetische Gebäudesanierungen in Deutschland.

## Dateistruktur

```
FOERDERNAVIGATOR/
├── index.html          # Komplette Standalone-Version (EMPFOHLEN)
├── styles.css          # CSS-Styles (ca. 1000 Zeilen)
├── app.js              # JavaScript-Logik (ca. 2300 Zeilen)
└── README.md           # Diese Dokumentation
```

## Für Strato-Hosting

Laden Sie nur **index.html** hoch - diese enthält alles in einer Datei.

## Features

- Fassadendämmung (WDVS, Kerndämmung, VHF, Innendämmung)
- Dachdämmung
- Kellerdämmung
- Fenster & Türen
- Wärmepumpen
- Biomasse-Heizungen
- Solarthermie
- Automatische U-Wert-Berechnung mit Schichtaufbau

## Kerndämmung (nur BEG-förderfähig λ ≤ 0,035)

| Material | Lambda |
|----------|--------|
| EPS-Granulat | 0,033 |
| Glaswolle-Granulat | 0,034 |
| PUR-Ortschaum | 0,028 |

## Validierung

Letzte Prüfung: 01.02.2026

Quellen: KfW, BAFA, Energiewechsel.de
