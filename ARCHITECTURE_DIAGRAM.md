# Dynamic Date System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│                     (Settings Panel)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ setPlanungsjahr(2028)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  KonfigurationContext                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ setPlanungsjahr(jahr) {                                    │ │
│  │   const neueFeiertage = ladeFeiertageFuerPlanungsjahr()   │ │
│  │   const neuesHeuteDatum = getDefaultHeuteDatum(jahr)      │ │
│  │   updateState({ planungsjahr, feiertage, heuteDatum })    │ │
│  │ }                                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────┬───────────────────┬────────────────────────────┘
                 │                   │
                 │                   │
    ┌────────────▼─────────┐  ┌─────▼──────────────┐
    │  holiday-generator   │  │   constants.ts     │
    │  .ts                 │  │                    │
    │                      │  │ getDefaultHeute    │
    │ For each year:       │  │ Datum(jahr)        │
    │ 1. Check JSON        │  │ → '2028-04-15'    │
    │ 2. Generate if       │  │                    │
    │    missing           │  │ getPlanungsjahr()  │
    │                      │  │ → from localStorage│
    └──────────┬───────────┘  └─────┬──────────────┘
               │                    │
               │                    │
               └────────┬───────────┘
                        │
                        ▼
           ┌────────────────────────┐
           │     kalender.ts        │
           │  (Calendar System)     │
           │                        │
           │ • generiereJahres      │
           │   kalender(jahr?)      │
           │ • istSpringFestival()  │
           │ • istArbeitstag()      │
           │ • berechneBestelldatum │
           └───────────┬────────────┘
                       │
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────────┐      ┌──────────────────────┐
│ date-classification│      │   Calculations       │
│      .ts           │      │                      │
│                    │      │ • oem-programm.ts   │
│ • istDeutscher     │      │ • inbound-china.ts  │
│   Feiertag()       │      │ • warehouse-mgmt.ts │
│ • istChinesischer  │      │ • ...               │
│   Feiertag()       │      │                     │
│ • getDateRow       │      │ All use dynamic     │
│   Background       │      │ dates from context  │
│   Classes()        │      │                     │
└─────────┬──────────┘      └──────────┬──────────┘
          │                            │
          └────────────┬───────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │    UI Components     │
            │                      │
            │ • Tables             │
            │ • Charts             │
            │ • Dashboards         │
            │                      │
            │ All reflect new year │
            └──────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                                  │
│  ┌──────────────────┐  ┌─────────────────────────────────────┐ │
│  │   JSON Files     │  │   Dynamic Generation                │ │
│  │  (2026-2028)     │  │   (Any Year)                       │ │
│  │                  │  │                                     │ │
│  │ • feiertage-     │  │ • Gaussian Easter formula          │ │
│  │   deutschland    │  │ • Spring Festival lookup           │ │
│  │ • feiertage-     │  │ • Standard fixed dates             │ │
│  │   china          │  │                                     │ │
│  │                  │  │ Fallback when JSON unavailable     │ │
│  └──────────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

                           LEGEND
┌─────────────────────────────────────────────────────────────────┐
│ → : Data Flow                                                    │
│ ▼ : Control Flow                                                 │
│ │ : Dependency                                                   │
│ ┌─┐ : Module/Component                                          │
└─────────────────────────────────────────────────────────────────┘
```

## Key Interactions

### 1. Year Change Flow
```
User Input → KonfigurationContext → holiday-generator → kalender → UI
```

### 2. Holiday Resolution
```
Request Holiday(2027) → Check JSON → If exists: Use JSON
                                  → If not: Generate dynamically
```

### 3. Date Calculation
```
Component needs date → kalender.ts → getPlanungsjahr() → localStorage
                                  → Calculate with current year
```

### 4. Cascade Effect
```
setPlanungsjahr(2028) triggers:
├── Regenerate holidays (2027-2029)
├── Update 'heute' date (2028-04-15)
└── Trigger re-render of all components
    └── All calculations use new values automatically
```

## Module Dependencies

```
constants.ts (Base)
    ↓
holiday-generator.ts (Pure Functions)
    ↓
kalender.ts (Calendar Logic)
    ↓
date-classification.ts (UI Helpers)
    ↓
KonfigurationContext.tsx (State Management)
    ↓
Calculation Modules (oem-programm, inbound-china, etc.)
    ↓
UI Components (Tables, Charts, Dashboards)
```

## Data Flow Diagram

```
┌─────────────┐
│ localStorage│
│ (Browser)   │
└──────┬──────┘
       │ Load on init
       ▼
┌─────────────────────────────┐
│ KonfigurationContext        │
│ • planungsjahr: 2028        │
│ • heuteDatum: '2028-04-15'  │
│ • feiertage: [...3 years]   │
└──────┬──────────────────────┘
       │ Provide via Context
       ▼
┌─────────────────────────────┐
│ useKonfiguration() Hook     │
│ (All components have access)│
└──────┬──────────────────────┘
       │ Read values
       ▼
┌─────────────────────────────┐
│ Calculation Functions       │
│ • getPlanungsjahr()         │
│ • generiereJahreskalender() │
│ • istArbeitstag()           │
└──────┬──────────────────────┘
       │ Return results
       ▼
┌─────────────────────────────┐
│ UI Rendering                │
│ • Tables with dates         │
│ • Charts with timelines     │
│ • Holiday highlighting      │
└─────────────────────────────┘
```

## Holiday Resolution Strategy

```
┌─────────────────────────────────┐
│ Need holidays for year 2028     │
└────────────┬────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │ Check JSON files   │
    └────┬───────┬───────┘
         │       │
    YES  │       │  NO
         │       │
         ▼       ▼
┌────────────┐  ┌─────────────────────┐
│ Use JSON   │  │ Call holiday-       │
│ data       │  │ generator.ts        │
│ (faster)   │  │                     │
│            │  │ Generate:           │
│ Accurate   │  │ • German: Easter    │
│ Real dates │  │ • Chinese: Lookup   │
└────────────┘  └─────────────────────┘
     │                    │
     └─────────┬──────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Return holidays      │
    │ for 3 years:         │
    │ • 2027               │
    │ • 2028 (main)        │
    │ • 2029               │
    └──────────────────────┘
```

## Spring Festival Special Handling

```
┌────────────────────────────────┐
│ Check if date is Spring        │
│ Festival                       │
└────────┬───────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Extract year from date           │
│ e.g., 2028-01-27 → 2028         │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ getSpringFestivalPeriode(2028)   │
│                                  │
│ Lookup in table:                 │
│ 2024: 2024-02-10                │
│ 2025: 2025-01-29                │
│ ...                              │
│ 2028: 2028-01-27 ✓ Found       │
│ ...                              │
│ 2033: 2033-01-31                │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Return: {                        │
│   start: Date(2028-01-26),       │
│   ende: Date(2028-02-01)         │
│ }                                │
└──────────────────────────────────┘
```
