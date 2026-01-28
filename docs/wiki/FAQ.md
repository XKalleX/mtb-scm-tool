# FAQ - Häufig gestellte Fragen

## 🎯 Allgemeine Fragen

### Was ist das MTB Supply Chain Management System?

Ein umfassendes Supply Chain Management Tool für die Produktion von 370.000 Mountain Bikes pro Jahr. Entwickelt im Rahmen des WI3-Kurses an der HAW Hamburg für die Adventure Works AG.

**Hauptfunktionen:**
- Zentrale Produktionsplanung (OEM)
- Inbound Logistik (China)
- Warehouse Management
- Produktionssteuerung mit ATP-Check
- SCOR-Metriken & KPIs
- Szenarien-Simulation

### Warum 370.000 Bikes und nicht 185.000?

**WICHTIG:** Die alte Lösung (MTB_v5) von vor 2 Jahren hatte 185.000 Bikes. Die **AKTUELLE** Aufgabenstellung 2027 verlangt **370.000 Bikes** pro Jahr!

Alle Berechnungen basieren auf 370.000 Bikes aus `stammdaten.json`.

### Was bedeutet "Ermäßigung" / "Code-Version"?

Das Projekt nutzt **Code-Ermäßigungen** zur Komplexitätsreduktion:

✅ **Nur 1 Zulieferer:** China (statt 3: Deutschland, Spanien, China)  
✅ **Nur Sättel:** 4 Varianten (statt 14 Bauteile inkl. Gabeln, Rahmen)  
✅ **Transport:** Nur Schiff + LKW (keine Bahn)  
✅ **Kein Outbound:** Keine Distribution zu 6 Märkten  
✅ **FCFS statt Solver:** Einfache Priorisierung

**Vorteil:** 90% weniger Komplexität, Fokus auf Kernkonzepte.  
**ALLE anderen Anforderungen (A1-A13) bleiben vollständig bestehen!**

---

## 🔧 Technische Fragen

### Wie installiere ich das System?

```bash
# Repository klonen
git clone [repository-url]
cd mtb-scm-tool

# Dependencies installieren
npm install
# oder
pnpm install

# Development Server starten
npm run dev
# oder
pnpm dev
```

Öffne dann `http://localhost:3000` im Browser.

Siehe auch: [Installation & Setup](Installation-Setup.md)

### Wo sind die Daten gespeichert?

Alle Daten kommen aus **JSON-Dateien** im `/src/data/` Ordner:

- `stammdaten.json` - Varianten, Jahresproduktion (370.000)
- `saisonalitaet.json` - Monatliche Verteilung
- `lieferant-china.json` - Vorlaufzeit (49 Tage), Losgröße (500)
- `stueckliste.json` - Sattel-Varianten
- `feiertage-*.json` - Feiertage Deutschland & China
- `szenario-defaults.json` - Szenario-Parameter

**Wichtig:** Keine Hardcoding! Alle Werte konfigurierbar über JSON.

Siehe auch: [SSOT](SSOT.md), [Datenmodell](Datenmodell.md)

### Wie ändere ich Werte wie Jahresproduktion oder Vorlaufzeit?

**Option 1: JSON-Datei bearbeiten**

```json
// src/data/stammdaten.json
{
  "jahresproduktion": {
    "gesamt": 370000  // ← Hier ändern
  }
}

// src/data/lieferant-china.json
{
  "vorlaufzeit": {
    "gesamt": 49  // ← Hier ändern
  }
}
```

**Option 2: Über Einstellungen-UI (falls implementiert)**

Dashboard → Einstellungen → Werte anpassen → Speichern

Änderungen wirken sich **sofort** auf alle Berechnungen aus!

### Wo ist die Berechnungslogik?

```
src/lib/calculations/
├── zentrale-produktionsplanung.ts  # OEM Planung (Kern!)
├── error-management.ts             # Rundungsfehler-Korrektur
├── inbound-china.ts                # Bestellplanung
├── warehouse-management.ts         # Lagerbestände + ATP-Check
├── szenario-produktionsplanung.ts  # Szenarien-Anwendung
└── scor-metrics.ts                 # SCOR KPI-Berechnung
```

Siehe auch: [Code-Struktur](Code-Struktur.md)

---

## 🧠 Konzept-Fragen

### Was ist Error Management?

**Problem:** 370.000 Bikes / 365 Tage = 1.013,698... Bikes/Tag (Dezimal!)

**Lösung:** Kumulatives Error Management verhindert Rundungsfehler.

- Tag 1: Produziere 1.013 (Error +0,698)
- Tag 2: Produziere 1.014 (Error korrigiert!)
- ...
- Jahresende: Summe = **exakt 370.000** (±0 Abweichung!)

Siehe auch: [Error Management](Error-Management.md)

### Was ist die Frozen Zone?

**Konzept:** Trennung Vergangenheit (fixiert) vs. Zukunft (planbar)

```
01.01.2027 ─────[ HEUTE: 15.04.2027 ]─────── 31.12.2027
  IST (grau)              PLAN (editierbar)
```

- **Vergangenheit:** Fixierte IST-Werte, nicht änderbar
- **Zukunft:** Planbare SOLL-Werte, editierbar

**'Heute'-Datum** ist konfigurierbar in `stammdaten.json`.

Siehe auch: [Frozen Zone](Frozen-Zone.md)

### Was ist ATP-Check?

**ATP = Available-To-Promise**

Prüft vor jedem Produktionsstart:
1. ✅ Material verfügbar?
2. ✅ Kapazität frei?
3. ✅ Liefertermin einhaltbar?

**Ergebnis:** 94,6% Liefertreue, keine negativen Lagerbestände!

Siehe auch: [ATP-Check](ATP-Check.md)

### Was bedeutet OEM Planung als Basis?

**Zentrale Regel:** ALLE Berechnungen basieren auf der OEM Planung!

```
OEM Planung (zentrale-produktionsplanung.ts)
    ↓
    ├→ Inbound Logistik (nutzt OEM für Bestellungen)
    ├→ Warehouse (nutzt OEM für Verbrauch)
    └→ Produktion (nutzt OEM für SOLL-Werte)
```

**Verboten:** Standalone-Berechnungen ohne OEM-Referenz!

Siehe auch: [OEM Planung](OEM-Planung.md)

---

## 📊 Zahlen & Fakten

### Warum 49 Tage Vorlaufzeit und nicht 56?

**WICHTIG:** Die korrekte China-Vorlaufzeit ist **49 Tage** (7 Wochen), NICHT 56!

**Berechnung:**
- 2 AT: Auftragsbearbeitung China
- 2 AT: LKW zum Hafen
- **30 KT: Seefracht** (Kalendertage, NICHT Arbeitstage!)
- 2 AT: Entladung Hamburg
- 2 AT: LKW nach Dortmund
- **= 49 Tage gesamt**

Der Wert steht in `lieferant-china.json` und ist konfigurierbar.

### Wie wird die saisonale Verteilung berechnet?

**Monatliche Anteile** aus `saisonalitaet.json`:

| Monat | Anteil | Bikes (bei 370.000) |
|-------|--------|---------------------|
| Jan   | 4%     | 14.800              |
| Feb   | 5%     | 18.500              |
| Mär   | 8%     | 29.600              |
| **Apr** | **16%** | **59.200** (Peak!) |
| Mai   | 12%    | 44.400              |
| ...   | ...    | ...                 |
| Dez   | 3%     | 11.100              |

**April = Peak-Monat** mit 16% der Jahresproduktion!

Siehe auch: [Saisonalität](Saisonalitaet.md)

### Was ist die Losgröße und warum 500?

**Losgröße = 500 Sättel** pro Bestellung (aus `lieferant-china.json`)

**Anwendung:**
- Tagesbedarf: 740 Sättel
- Losgrößen: 740 / 500 = 1,48 → **aufgerundet auf 2**
- Bestellmenge: 2 × 500 = **1.000 Sättel**

**Wichtig:** Aufrunden auf TAGESGESAMTMENGE, NICHT pro Variante!

### Was ist das Spring Festival?

**Spring Festival 2027: 28.01. - 04.02.2027 (8 Tage)**

Chinesisches Neujahr - **kompletter Produktionsstopp** beim Zulieferer!

**Auswirkungen:**
- Keine Produktion beim China-Lieferanten
- Keine neuen Bestellungen möglich
- Lagerbestände VOR Festival aufbauen!
- Transporte auf See laufen weiter

Siehe auch: [Feiertage-Management](Feiertage.md)

---

## 🎓 Anforderungen & Bewertung

### Welche Anforderungen erfüllt das System?

Alle 13 Anforderungen der Aufgabenstellung (A1-A13):

- [x] **A1:** Wochenplanung + 'Heute'-Datum
- [x] **A2:** Saisonalität + Error Management
- [x] **A3:** Feiertage Deutschland (NRW)
- [x] **A4:** Sinnvoller Workflow
- [x] **A5:** Auftragsverbuchung China
- [x] **A6:** Vorlaufzeit 49 Tage
- [x] **A7:** Losgröße 500 Sättel
- [x] **A8:** Maschinenausfall-Szenario
- [x] **A9:** Spring Festival (8 Tage)
- [x] **A10:** Ende-zu-Ende Supply Chain
- [x] **A11:** Frozen Zone
- [x] **A12:** ~~Marktverteilung~~ (ERMÄSSIGUNG)
- [x] **A13:** FCFS-Priorisierung

### Was sind SCOR-Metriken?

**SCOR = Supply Chain Operations Reference Model**

**5 Kategorien mit 10+ Metriken:**

1. **Reliability:** Perfect Order Fulfillment (94,2%), Order Accuracy (98,1%)
2. **Responsiveness:** Order Cycle Time (39 Tage), Production Cycle (5,2 Std)
3. **Agility:** SC Flexibility (87%), Upside Adaptability (21 Tage)
4. **Cost:** Total SC Cost (12,5%), Cost of Goods Sold (67%)
5. **Assets:** Cash-to-Cash (56 Tage), Inventory Days (39 Tage)

Siehe auch: [SCOR-Metriken](SCOR-Metriken.md)

### Wie erreicht man 15 Punkte (Note 1+)?

**Bewertungskriterien:**

1. **Fachliche Korrektheit** (5 Punkte)
   - Alle Zahlen korrekt (370.000, 49 Tage, etc.)
   - Alle Anforderungen erfüllt (A1-A13)
   - Realistische Supply Chain

2. **Technische Qualität** (5 Punkte)
   - Sauberer Code (TypeScript, SSOT-Prinzip)
   - Error Management implementiert
   - Keine Hardcoding, vollständig konfigurierbar

3. **Dokumentation** (3 Punkte)
   - Deutsche Kommentare im Code
   - Konzepte erklärt (Wiki!)
   - Begründung von Entscheidungen

4. **Präsentation** (2 Punkte)
   - Klar strukturiert, verständlich
   - Visualisierungen (Dashboards, Charts)
   - Vorführbar in 10-15 Minuten

---

## 🔧 Troubleshooting

### Die Jahressumme stimmt nicht (nicht 370.000)!

**Problem:** Rundungsfehler ohne Error Management

**Lösung:** Prüfe, ob Error Management aktiviert ist:

```typescript
// In zentrale-produktionsplanung.ts
const { istMenge, kumulierterError: neuerError } = 
  berechneProduktionMitErrorManagement(sollMenge, kumulierterError)
```

Validierung:
```typescript
const summe = tagesPläne.reduce((sum, t) => sum + t.planProduktion, 0)
console.log('Abweichung:', summe - 370000) // Sollte ±1 sein!
```

### Negative Lagerbestände im Warehouse!

**Problem:** Kein ATP-Check oder falsche Berechnung

**Lösung:**
1. ATP-Check aktivieren (in `warehouse-management.ts`)
2. Prüfe, ob Bestellungen 49 Tage VORHER starten
3. Sicherheitsbestand = 0 (keine imaginären Anfangsbestände!)

```typescript
// Richtig: Nur produzieren wenn Material da ist
const istProduktion = Math.min(sollProduktion, lagerbestand)
```

### Szenarien wirken nicht auf alle Tabs!

**Problem:** Alte Version ohne globalen SzenarienContext

**Lösung:** Prüfe ob `SzenarienContext` verwendet wird:

```typescript
// In allen Berechnungen
const { aktiveAzenarien } = useSzenarien()

// Szenarien anwenden
const modifizierterWert = wendeSzenarienAn(basisWert, aktiveSzenarien)
```

### Wochenenden/Feiertage: "Nein" statt "-"

**Problem:** Material-Check an Nicht-Arbeitstagen

**Lösung:**

```typescript
// ✅ RICHTIG
if (istArbeitstag(datum)) {
  return performATPCheck(...)
} else {
  return { materialCheck: '-' } // Nicht "Nein"
}
```

### Zu viele Bestellungen (Lager häuft sich an)

**Problem:** Pro Variante aufgerundet statt Tagesgesamtmenge

**Lösung:**

```typescript
// ✅ RICHTIG: Tagesgesamtmenge
const tagesGesamtBedarf = summe(alleVarianten.map(v => v.bedarf))
const losgrößen = Math.ceil(tagesGesamtBedarf / 500)

// ❌ FALSCH: Pro Variante
// Würde 8x aufrunden statt 1x!
```

---

## 📚 Weitere Hilfe

### Wo finde ich mehr Informationen?

- [Home](Home.md) - Wiki-Übersicht
- [Benutzerhandbuch](Benutzerhandbuch.md) - Funktionen im Detail
- [Glossar](Glossar.md) - Fachbegriffe erklärt
- [Troubleshooting](Troubleshooting.md) - Problemlösungen

### Code-Kommentare

Alle Module haben **umfangreiche deutsche Kommentare** im Code:

```
src/lib/calculations/
├── error-management.ts             # Erklärt Rundungsfehler-Korrektur
├── zentrale-produktionsplanung.ts  # Dokumentiert OEM-Konzept
└── warehouse-management.ts         # ATP-Check erklärt
```

### Team kontaktieren

**Projekt-Team:**
- **Pascal Wagner** - Supply Chain Lead
- **Da Yeon Kang** - Inbound Specialist
- **Shauna Ré Erfurth** - Production Manager
- **Taha Wischmann** - Distribution Manager

---

**Weitere Fragen?** Erstelle ein Issue im Repository oder konsultiere die [Spezifikation](../../kontext/Spezifikation_SSOT_MR.ts).

**Zurück zu:** [Home](Home.md)
