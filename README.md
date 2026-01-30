
# Mountain Bike Supply Chain Management System

> **Supply Chain Management System für Adventure Works AG** - WI3 Projektaufgabe HAW Hamburg

Ein vollständiges SCM-System zur Planung und Steuerung der Mountain Bike Produktion (370.000 Bikes/Jahr) mit vereinfachter China-Beschaffung.

## 📚 Dokumentation

**Neu hier? Start hier:** [📖 Projekt-Wiki](./docs/README.md)

Das komplette Wiki mit allen Details:

- **[Aufgabenstellung](./docs/01-Aufgabenstellung.md)** - Geschäftsproblem & Kontext
- **[Supply Chain Konzepte](./docs/02-Supply-Chain-Konzepte.md)** - SCOR, ATP/CTP, Metriken
- **[Produktstruktur](./docs/03-Produktstruktur.md)** - 8 MTB-Varianten, 4 Sättel
- **[Zeitparameter](./docs/04-Zeitparameter.md)** - Vorlaufzeiten, Feiertage, Saisonalität
- **[Szenarien](./docs/05-Szenarien.md)** - 4 operative Szenarien
- **[Bewertungskriterien](./docs/06-Bewertungskriterien.md)** - A1-A13 Anforderungen
- **[Glossar](./docs/07-Glossar.md)** - Alle Fachbegriffe erklärt

## 🎯 Kernfunktionen

| Modul | Beschreibung |
|-------|-------------|
| **Programmplanung** | Wochenbasierte Planung für 370.000 Bikes/Jahr mit Saisonalität |
| **Inbound China** | Bestellplanung mit 49 Tagen Vorlaufzeit & Losgrößen |
| **Produktion** | ATP-Check, Kapazitätsplanung, Frozen Zone |
| **Reporting** | 10+ SCOR-Metriken aus 5 Kategorien |
| **Szenarien** | Global wirksame Simulationen (Marketingaktion, Ausfall, etc.) |
| **Visualisierung** | Interaktive Charts & Excel-ähnliche Tabellen |

## 💡 Wichtigste Zahlen

```
370.000 Bikes/Jahr    │  8 MTB-Varianten   │  4 Sattel-Typen
49 Tage Vorlaufzeit   │  April = 16% Peak  │  Losgröße: 500
```

## 🏗️ Technologie-Stack

**Frontend:** Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Recharts  
**Backend:** TypeScript Business Logic, JSON-Stammdaten  
**Development:** Node.js 23+, npm/pnpm, ESLint

## 🎓 Code-Ermäßigungen (Vereinfachungen)

Um die Komplexität zu reduzieren (90% weniger Code):

- ✅ **1 Zulieferer:** Nur China (statt Deutschland, Spanien, China)
- ✅ **4 Komponenten:** Nur Sättel (statt 14 Bauteile mit Gabeln & Rahmen)
- ✅ **Kein Outbound:** Keine Distribution zu 6 Märkten
- ✅ **FCFS-Regel:** First-Come-First-Serve (statt Excel-Solver)

**Vorteil:** Fokus auf Kernkonzepte mit gleichen Lernzielen!

Mehr Details: [📋 Aufgabenstellung](./docs/01-Aufgabenstellung.md)

---

## 🚀 Installation und Setup

### Voraussetzungen

```bash
Node.js >= 23.0.0
npm >= 10.0.0 oder pnpm >= 8.0.0
```

### Quick Start

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

Anwendung öffnet sich unter `http://localhost:3000`

### Verfügbare Scripts

```bash
npm run dev       # Development Server
npm run build     # Production Build
npm run start     # Production Server
npm run lint      # ESLint Check
```

## 📖 Projektstruktur

```
mtb-scm-tool/
├── docs/                    # 📚 Wiki-Dokumentation
│   ├── README.md           # Wiki Home
│   ├── 01-Aufgabenstellung.md
│   ├── 02-Supply-Chain-Konzepte.md
│   ├── 03-Produktstruktur.md
│   ├── 04-Zeitparameter.md
│   ├── 05-Szenarien.md
│   ├── 06-Bewertungskriterien.md
│   └── 07-Glossar.md
├── src/
│   ├── data/               # 📊 JSON Stammdaten (SSOT)
│   ├── contexts/           # 🔄 React Context (KonfigurationContext)
│   ├── lib/                # 🧮 Berechnungen & Helpers
│   ├── components/         # 🎨 React Components
│   └── app/                # 📱 Next.js App Router
└── kontext/                # 📋 Original-Aufgabenstellung
```

## 🎯 Bewertungskriterien (A1-A13)

### ✅ Erfüllte Anforderungen

| ID | Anforderung | Status | Details |
|----|-------------|--------|---------|
| **A1** | Wochenplanung + 'Heute'-Datum | ✅ | [→ A1](./docs/06-Bewertungskriterien.md#a1) |
| **A2** | Saisonalität + Error Management | ✅ | [→ A2](./docs/06-Bewertungskriterien.md#a2) |
| **A3** | Feiertage Deutschland (NRW) | ✅ | [→ A3](./docs/06-Bewertungskriterien.md#a3) |
| **A4** | Sinnvoller Workflow | ✅ | [→ A4](./docs/06-Bewertungskriterien.md#a4) |
| **A5** | Auftragsverbuchung China | ✅ | [→ A5](./docs/06-Bewertungskriterien.md#a5) |
| **A6** | Vorlaufzeit 49 Tage korrekt | ✅ | [→ A6](./docs/06-Bewertungskriterien.md#a6) |
| **A7** | Losgröße 500 Sättel | ✅ | [→ A7](./docs/06-Bewertungskriterien.md#a7) |
| **A8** | Maschinenausfall-Szenario | ✅ | [→ A8](./docs/06-Bewertungskriterien.md#a8) |
| **A9** | Spring Festival (8 Tage) | ✅ | [→ A9](./docs/06-Bewertungskriterien.md#a9) |
| **A10** | Ende-zu-Ende Supply Chain | ✅ | [→ A10](./docs/06-Bewertungskriterien.md#a10) |
| **A11** | 'Heute'-Datum global | ✅ | [→ A11](./docs/06-Bewertungskriterien.md#a11) |
| **A12** | Marktverteilung | ✂️ | Entfallen (Code-Ermäßigung) |
| **A13** | Szenarien + FCFS-Regel | ✅ | [→ A13](./docs/06-Bewertungskriterien.md#a13) |

**Vollständige Details:** [📋 Bewertungskriterien](./docs/06-Bewertungskriterien.md)

## 📊 SCOR-Metriken

Implementierte KPIs aus allen 5 SCOR-Kategorien:

- **Reliability:** Perfect Order Fulfillment (94.6%), On-Time Delivery
- **Responsiveness:** Order Cycle Time (39 Tage), Production Cycle Time
- **Agility:** Flexibility (87%), Upside Adaptability (21 Tage)
- **Cost:** Total SC Cost (12.5%), COGS (67%)
- **Assets:** Cash-to-Cash (56 Tage), Inventory Days (39 Tage)

Mehr Details: [🔗 Supply Chain Konzepte](./docs/02-Supply-Chain-Konzepte.md#scor-metriken)

---

## 👥 Team & Kontakt

**Projekt-Team:**
- Pascal Wagner - Supply Chain Lead & Full Stack Development
- Da Yeon Kang - Inbound Specialist
- Shauna Ré Erfurth - Production & Warehouse Manager
- Taha Wischmann - Distribution Manager

**Zielnote:** 15 Punkte (1+)

**HAW Hamburg** - Wirtschaftsinformatik 3 | WiSe 2024/2025

## 📚 Weitere Ressourcen

- 📖 **[Komplettes Wiki](./docs/README.md)** - Alle Details von Grund auf
- 📋 **[Bewertungskriterien](./docs/06-Bewertungskriterien.md)** - A1-A13 Checkliste
- 📚 **[Glossar](./docs/07-Glossar.md)** - Alle Fachbegriffe
- 🎭 **[Szenarien](./docs/05-Szenarien.md)** - Operative Szenarien
- 📄 **Aufgabenstellung PDF** - `kontext/Aufgabenstellung.pdf`

## 🆘 Support

**Bei Fragen:**

1. 📖 Start im [Wiki](./docs/README.md) - Grundlagen verstehen
2. 📚 Im [Glossar](./docs/07-Glossar.md) nachschlagen - Begriffe klären
3. ✅ [Bewertungskriterien](./docs/06-Bewertungskriterien.md) checken - Anforderungen prüfen
4. 💻 Inline-Kommentare lesen - Code ist auf Deutsch dokumentiert

## 📝 Lizenz

Dieses Projekt wurde für akademische Zwecke entwickelt.

© 2024 HAW Hamburg - Wirtschaftsinformatik 3
