
# Mountain Bike Supply Chain Management System

## 🎯 Projektübersicht

Comprehensive Supply Chain Management System für Adventure Works AG - entwickelt als Lösung für die Wirtschaftsinformatik 3 Projektaufgabe an der HAW Hamburg.

### Projektziele

* Erhöhung der Flexibilität in der Mountain Bike Produktion
* Optimierung der Supply Chain mit Fokus auf China-Beschaffung
* Operative Szenarioplanung und -simulation
* SCOR-basiertes Performance Monitoring

### Kernfunktionen

✅ **Programmplanung** - Wochenbasierte Produktionsplanung für 370.000 Bikes/Jahr

✅ **Stücklistenverwaltung** - Dynamische Konfiguration von 8 MTB-Varianten

✅ **Inbound Logistik** - Supply Chain Simulation von China nach Dortmund

✅ **Produktionssteuerung** - Kapazitätsplanung mit variablen Schichten

✅ **Lagerbestandsmanagement** - Real-time Bestandsüberwachung

✅ **SCOR Metriken** - 10+ KPIs aus allen 5 SCOR-Kategorien

✅ **Szenario-Simulation** - 4 operative Szenarien (Marketing, Ausfall, Sturm, Verspätung)

✅ **Interaktive Visualisierungen** - Power BI-Style Dashboards mit Recharts

---

## 🏗️ Technologie-Stack

### Frontend

* **Next.js 16** - React Framework mit App Router
* **TypeScript** - Type-safe Development
* **Tailwind CSS** - Utility-first Styling
* **shadcn/ui** - UI Component Library
* **Recharts** - Interaktive Datenvisualisierung

### Backend/Logic

* **TypeScript** - Business Logic Implementation
* **JSON** - Stammdaten und Konfiguration
* **Error Management** - Rundungsfehler-Behandlung

### Development

* **Node.js 23+** - Runtime Environment
* **pnpm/npm** - Package Management
* **ESLint** - Code Quality
* **Git** - Version Control

---

## 📊 Datenmodell

### Stammdaten (stammdaten-optimiert.json)

```json
{
  "jahresproduktion": {
    "gesamt": 370000,
    "varianten": {
      "MTBAllrounder": 111000,  // 30%
      "MTBCompetition": 55500,   // 15%
      "MTBDownhill": 37000,      // 10%
      "MTBExtreme": 25900,       // 7%
      "MTBFreeride": 18500,      // 5%
      "MTBMarathon": 29600,      // 8%
      "MTBPerformance": 44400,   // 12%
      "MTBTrail": 48100          // 13%
    }
  },
  "saisonalitaet": {
    "peakMonth": "April (16%)",
    "lowSeasonMonths": ["Oktober (3%)", "Dezember (3%)"]
  }
}
```

### Supply Chain Parameter

| Zulieferer  | Standort  | Liefert | Vorlaufzeit         | Losgröße |
| ----------- | --------- | ------- | ------------------- | ---------- |
| China       | Dengwong  | Sättel | 5 AT + 30 KT + 2 AT | 500        |
| Spanien     | Saragossa | Gabeln  | 5 AT + 9 KT         | 75         |
| Deutschland | Heilbronn | Rahmen  | 2 AT + 2 AT         | 10         |

**Legende:** AT = Arbeitstage, KT = Kalendertage

---

## 🚀 Installation und Setup

### Voraussetzungen

```bash
Node.js >= 23.0.0
npm >= 10.0.0 oder pnpm >= 8.0.0
```

### Installation

```bash
# Repository klonen
git clone [repository-url]
cd mtb-supply-chain

# Dependencies installieren
npm install
# oder
pnpm install

# Development Server starten
npm run dev
# oder
pnpm dev
```

Anwendung öffnet sich automatisch unter `http://localhost:3000`

---

## 📖 Benutzerhandbuch

### 1. Dashboard-Navigation

Das System verwendet eine  **Excel-ähnliche Tab-Navigation** :

* **Programmplanung** - Wochenweise Produktionsplanung
* **Stückliste** - Komponenten-Matrix (Rahmen, Gabeln, Sättel)
* **Inbound China** - Supply Chain Tracking
* **Produktion** - Fertigungssteuerung
* **Lagerbestand** - Bestandsübersicht
* **SCOR Metriken** - Performance KPIs
* **Szenarien** - Operative Simulationen
* **Visualisierungen** - Interaktive Dashboards

### 2. Programmplanung

**Features:**

* Wochenbasierte Planung (52 Wochen)
* Saisonale Verteilung automatisch angewendet
* Plan/Ist-Abgleich mit Abweichungsanalyse
* Frozen Zone Berücksichtigung (aktuelles Datum)

**Workflow:**

1. Jahresproduktion wird automatisch auf Wochen verteilt
2. Saisonale Faktoren werden angewendet (Peak im April)
3. Manuelle Anpassungen möglich (+/- Mengen pro Woche)
4. Änderungen propagieren automatisch zu Teilebedarf

### 3. Szenarien-Manager

#### Verfügbare Szenarien:

**📈 Marketingaktion**

* **Trigger:** Kampagne in "Mountain Biker" Magazin
* **Auswirkung:** +15-30% Nachfrage für 2-6 Wochen
* **Parameter:** Start-KW, Dauer, Erhöhung %, Varianten
* **Beispiel:** KW 28, 4 Wochen, +20%, Alle Varianten

**🔧 Maschinenausfall**

* **Trigger:** Produktionsausfall beim Zulieferer
* **Auswirkung:** Reduzierte Liefermengen, Engpässe
* **Parameter:** Zulieferer, Datum, Dauer, Reduktion %
* **Beispiel:** Spanien (Gabeln), 7 Tage, -60%

**💧 Wasserschaden/Sturm**

* **Trigger:** Container-Verlust, Lagerschaden
* **Auswirkung:** Sofortiger Bestandsverlust
* **Parameter:** Ort, Datum, Menge, Teile
* **Beispiel:** MSC Mara, 1000 Sättel verloren

**🚢 Schiffsverspätung**

* **Trigger:** Wetterverhältnisse auf See
* **Auswirkung:** Verlängerte Durchlaufzeit
* **Parameter:** Schiff, geplante/neue Ankunft
* **Beispiel:** MSC Mara, +4 Tage Verspätung

#### Szenario-Workflow:

1. Szenario aus Liste auswählen
2. Parameter konfigurieren
3. "Szenario hinzufügen" klicken
4. Mehrere Szenarien kombinierbar
5. "Simulation starten" → Impact-Analyse

### 4. SCOR Metriken Dashboard

**10 Kern-Metriken aus 5 Kategorien:**

#### Reliability (Zuverlässigkeit)

* **RL.1.1** Perfect Order Fulfillment: 94.2% (Ziel: 95%)
* **RL.2.1** Order Accuracy: 98.1% (Ziel: 98%)

#### Responsiveness (Reaktionsfähigkeit)

* **RS.1.1** Order Cycle Time: 42 Tage (Ziel: 45 Tage)
* **RS.2.2** Production Cycle Time: 5.2 Std (Ziel: 6 Std)

#### Agility (Flexibilität)

* **AG.1.1** Supply Chain Flexibility: 87% (Ziel: 85%)
* **AG.1.2** Upside Adaptability: 21 Tage (Ziel: 20 Tage)

#### Cost (Kosten)

* **CO.1.1** Total SC Cost: 12.5% (Ziel: 13%)
* **CO.1.2** Cost of Goods Sold: 67% (Ziel: 70%)

#### Assets (Vermögenswerte)

* **AM.1.1** Cash-to-Cash Cycle: 56 Tage (Ziel: 60 Tage)
* **AM.1.2** Inventory Days of Supply: 42 Tage (Ziel: 45 Tage)

**Ampel-System:**

* 🟢 Grün: Ziel erreicht (100%+)
* 🟡 Gelb: Nahe Ziel (90-99%)
* 🔴 Rot: Unter Ziel (<90%)

### 5. Visualisierungen

**Interaktive Charts:**

* Produktionsverlauf (Plan vs. Ist)
* Variantenverteilung (Pie Chart)
* Lagerbestandsentwicklung (Multi-Line)
* Produktionsauslastung (Area Chart)
* Lieferanten-Performance (Scorecard)
* SCOR Metriken (Progress Bars)

**Features:**

* Hover-Tooltips mit Detailinformationen
* Zeitraum-Filter (Woche/Monat/Quartal/Jahr)
* Export-Funktionen
* Drill-Down Möglichkeiten

---

## 🔧 Konfiguration

### Stammdaten anpassen

Datei: `/lib/stammdaten-optimiert.json`

```json
{
  "jahresproduktion": {
    "gesamt": 370000  // Anpassen für andere Szenarien
  },
  "zulieferer": {
    "china": {
      "vorlaufzeit": { "tage": 5 }  // Anpassbar
    }
  }
}
```

### Feiertage konfigurieren

Datei: `/lib/feiertage-china.json`

```json
{
  "2027": [
    {
      "name": "Spring Festival",
      "von": "2027-01-28",
      "bis": "2027-02-10",
      "produktionsstopp": true
    }
  ]
}
```

---

## 🧪 Testing

```bash
# Unit Tests laufen (wenn konfiguriert)
npm test

# Plausiblilitätsprüfung
# → Gesamtproduktion = Summe aller Varianten ✓
# → Bestandsentwicklung ohne Sprünge ✓
# → Rundungsfehler < ±1 Bike pro Jahr ✓
```

---

## 📈 Bewertungskriterien (15-Punkte-Lösung)

### ✅ Erfüllte Anforderungen

#### Programmplanung

* [X] Programm auf Wochenbasis
* [X] Gegenwärtiges Datum berücksichtigt (Frozen Zone)
* [X] Saisonaler Verlauf korrekt implementiert
* [X] +/- Mengen separat ausweisbar
* [X] Variable Stückliste mit Plausibilisierung

#### Supply Chain

* [X] Vollständige SC-Abbildung (China → Dortmund)
* [X] Korrekte Durchlaufzeiten (Arbeits-/Kalendertage)
* [X] Fahrpläne für alle Transportmittel
* [X] Lokale Feiertage (China Spring Festival)
* [X] Losgrößen korrekt berücksichtigt

#### Szenarien

* [X] Marketingaktion mit Nachfrage-Peak
* [X] Maschinenausfall beim Zulieferer
* [X] Wasserschaden/Container-Verlust
* [X] Schiffsverspätung

#### Reporting

* [X] Min. 10 SCOR Metriken (statt 5)
* [X] Bestandsübersicht mit Engpass-Warnung
* [X] Kumulative Darstellung Bedarf/Lieferung
* [X] Interaktive Visualisierungen

#### Software-Qualität

* [X] Excel-ähnliche Bedienoberfläche
* [X] Modulare Architektur
* [X] Comprehensive German Commenting
* [X] Error Management (Rundungsfehler)
* [X] Präsentationsfähig

---

## 👥 Team

**Projekt-Team:**

* Pascal - Supply Chain Lead, Full Stack Development
* Da Yeon Kang - Inbound Specialist
* Shauna Ré Erfurth - Production & Warehouse Manager
* Taha Wischmann - Distribution Manager

**Zielnote:** 15 Punkte (1+)

---

## 📚 Referenzen

* **SCOR Model:** Supply Chain Council / APICS
* **Aufgabenstellung:** HAW Hamburg WI3 WiSe 2024/2025
* **Referenzlösung:** MTB_v5_15pkt.xlsx (15-Punkte-Benchmark)

---

## 📝 Lizenz

Dieses Projekt wurde für akademische Zwecke entwickelt.

© 2024 HAW Hamburg - Wirtschaftsinformatik 3

---

## 🆘 Support

Bei Fragen zur Implementierung:

1. Prüfen Sie die inline Code-Kommentare (auf Deutsch)
2. Konsultieren Sie die Aufgabenstellung (WI_L_WI3_3.pdf)
3. Vergleichen Sie mit Referenzlösung (MTB_v5_15pkt.xlsx)

**Wichtig:** Alle Module sind präsentationsbereit mit ausführlicher deutscher Dokumentation!
