# Single Source of Truth (SSOT)

## 📖 Übersicht

**Single Source of Truth (SSOT)** bedeutet: **Alle Daten kommen aus EINER zentralen Quelle** - den JSON-Dateien im `/src/data/` Ordner.

**Keine Hardcoding. Keine Magic Numbers. Vollständige Konfigurierbarkeit.**

## 🎯 Das Problem

### Hardcodierte Werte (FALSCH!)

```typescript
// ❌ FALSCH: Magic Numbers überall im Code
const jahresProduktion = 370000 // Was wenn sich das ändert?
const vorlaufzeit = 49           // Nicht konfigurierbar!
const losgröße = 500            // Muss bei jeder Änderung gesucht werden!

// ❌ FALSCH: Inkonsistente Werte
// Datei A: const bikes = 370000
// Datei B: const bikes = 185000  // Alte Zahl!
// Datei C: const bikes = 370_000 // Richtig, aber in 3 Dateien gepflegt
```

**Probleme:**
- ❌ Werte müssen an vielen Stellen geändert werden
- ❌ Inkonsistenzen zwischen Modulen
- ❌ Keine zentrale Konfiguration
- ❌ Fehleranfällig bei Änderungen

## ✅ Die Lösung: JSON als SSOT

### Konzept

```
┌─────────────────────────────────────────┐
│  SINGLE SOURCE OF TRUTH                 │
│  /src/data/*.json                       │
├─────────────────────────────────────────┤
│  ✓ stammdaten.json                      │
│    → Varianten, Jahresproduktion        │
│  ✓ saisonalitaet.json                   │
│    → Monatliche Verteilung              │
│  ✓ lieferant-china.json                 │
│    → Vorlaufzeit, Losgröße              │
│  ✓ stueckliste.json                     │
│    → Sattel-Varianten                   │
│  ✓ feiertage-*.json                     │
│    → Deutschland + China Feiertage      │
│  ✓ szenario-defaults.json               │
│    → Standardwerte für Szenarien        │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  KonfigurationContext                   │
│  Lädt JSON, verwaltet State             │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  Alle Module nutzen Context             │
│  → Programmplanung                      │
│  → Inbound Logistik                     │
│  → Warehouse Management                 │
│  → SCOR Metriken                        │
│  → Szenarien                            │
└─────────────────────────────────────────┘
```

## 📁 JSON-Datenquellen

### 1. stammdaten.json

**Zweck:** Projekt-Kerndaten, MTB-Varianten, Jahresproduktion

```json
{
  "projekt": {
    "name": "Mountain Bike Supply Chain Management",
    "kunde": "Adventure Works AG",
    "standort": "Dortmund",
    "planungsjahr": 2027,
    "heuteDatum": "2027-04-15"
  },
  "varianten": [
    {
      "id": "MTBAllrounder",
      "name": "MTB Allrounder",
      "anteilPrognose": 0.3
    }
    // ... 7 weitere Varianten
  ],
  "jahresproduktion": {
    "gesamt": 370000,
    "proVariante": {
      "MTBAllrounder": 111000,
      "MTBCompetition": 55500,
      // ... weitere Varianten
    }
  },
  "produktion": {
    "kapazitaetProStunde": 130,
    "stundenProSchicht": 8
  }
}
```

### 2. saisonalitaet.json

**Zweck:** Monatliche Verteilung (Saisonale Nachfrage)

```json
{
  "beschreibung": "Monatliche Verteilung der Jahresproduktion",
  "monate": [
    { "monat": 1, "name": "Januar", "anteil": 0.04, "prozent": 4 },
    { "monat": 2, "name": "Februar", "anteil": 0.05, "prozent": 5 },
    { "monat": 3, "name": "März", "anteil": 0.08, "prozent": 8 },
    { "monat": 4, "name": "April", "anteil": 0.16, "prozent": 16 },  // PEAK!
    // ... weitere Monate
    { "monat": 12, "name": "Dezember", "anteil": 0.03, "prozent": 3 }
  ],
  "summe": 1.0,
  "peakMonat": "April",
  "peakAnteil": 0.16
}
```

### 3. lieferant-china.json

**Zweck:** Vorlaufzeit, Losgröße, Transport-Details

```json
{
  "name": "Dengwong Bicycle Parts Ltd.",
  "land": "China",
  "standort": "Dengwong",
  "liefert": ["Sattel Comfort", "Sattel Sport", "Sattel Pro", "Sattel Extreme"],
  "vorlaufzeit": {
    "gesamt": 49,
    "einheit": "Tage",
    "beschreibung": "7 Wochen Gesamtvorlaufzeit",
    "details": {
      "auftragBearbeitungArbeitstage": 2,
      "transportZumHafenArbeitstage": 2,
      "seeFrachtKalendertage": 30,
      "entladungHamburgArbeitstage": 2,
      "lkwTransportDortmundArbeitstage": 2,
      "summeArbeitstage": 8,
      "summeKalendertage": 30,
      "gesamtTage": 49
    }
  },
  "losgröße": {
    "menge": 500,
    "einheit": "Stück",
    "beschreibung": "Mindestbestellmenge 500 Sättel pro Bestellung"
  }
}
```

### 4. stueckliste.json

**Zweck:** Sattel-Varianten (Ermäßigung: nur Sättel, keine Gabeln/Rahmen)

```json
{
  "beschreibung": "Stückliste für Mountain Bikes (Code-Ermäßigung: nur Sättel)",
  "sattel": [
    {
      "id": "SattelComfort",
      "name": "Sattel Comfort",
      "verwendungFürVarianten": ["MTBAllrounder", "MTBTrail"]
    },
    {
      "id": "SattelSport",
      "name": "Sattel Sport",
      "verwendungFürVarianten": ["MTBMarathon", "MTBPerformance"]
    },
    {
      "id": "SattelPro",
      "name": "Sattel Pro",
      "verwendungFürVarianten": ["MTBCompetition", "MTBFreeride"]
    },
    {
      "id": "SattelExtreme",
      "name": "Sattel Extreme",
      "verwendungFürVarianten": ["MTBDownhill", "MTBExtreme"]
    }
  ],
  "ermässigung": {
    "aktiv": true,
    "beschreibung": "Nur Sättel modelliert, keine Gabeln oder Rahmen"
  }
}
```

### 5. feiertage-deutschland.json

**Zweck:** Deutsche Feiertage (NRW)

```json
{
  "land": "Deutschland",
  "bundesland": "Nordrhein-Westfalen",
  "jahr": 2027,
  "feiertage": [
    { "datum": "2027-01-01", "name": "Neujahr", "produktionsfrei": true },
    { "datum": "2027-04-02", "name": "Karfreitag", "produktionsfrei": true },
    { "datum": "2027-04-05", "name": "Ostermontag", "produktionsfrei": true },
    { "datum": "2027-05-01", "name": "Tag der Arbeit", "produktionsfrei": true },
    // ... weitere Feiertage
  ]
}
```

### 6. feiertage-china.json

**Zweck:** Chinesische Feiertage (Spring Festival!)

```json
{
  "land": "China",
  "jahr": 2027,
  "feiertage": [
    {
      "name": "Spring Festival 2027",
      "von": "2027-01-28",
      "bis": "2027-02-04",
      "dauer": 8,
      "produktionsstopp": true,
      "beschreibung": "Chinesisches Neujahr - kompletter Produktionsstopp beim Zulieferer"
    }
  ]
}
```

### 7. szenario-defaults.json

**Zweck:** Standardwerte für die 4 Szenarien

```json
{
  "szenarien": [
    {
      "typ": "Marketing",
      "name": "Marketingaktion",
      "defaults": {
        "startKW": 28,
        "dauerWochen": 4,
        "erhöhungProzent": 20
      }
    },
    {
      "typ": "Produktion",
      "name": "Maschinenausfall China",
      "defaults": {
        "startDatum": "2027-06-15",
        "dauerTage": 7,
        "reduktionProzent": 60
      }
    }
    // ... weitere Szenarien
  ]
}
```

## 🔧 Implementierung

### KonfigurationContext

```typescript
// src/contexts/KonfigurationContext.tsx
import stammdaten from '@/data/stammdaten.json'
import saisonalitaet from '@/data/saisonalitaet.json'
import lieferant from '@/data/lieferant-china.json'
import stueckliste from '@/data/stueckliste.json'
import feiertageDeutschland from '@/data/feiertage-deutschland.json'
import feiertageChina from '@/data/feiertage-china.json'
import szenarioDefaults from '@/data/szenario-defaults.json'

interface KonfigurationContextType {
  // Stammdaten
  projekt: typeof stammdaten.projekt
  varianten: typeof stammdaten.varianten
  jahresproduktion: number
  
  // Saisonalität
  saisonalitaet: typeof saisonalitaet.monate
  
  // Lieferant
  lieferant: typeof lieferant
  vorlaufzeitTage: number
  losgröße: number
  
  // Stückliste
  sattelVarianten: typeof stueckliste.sattel
  
  // Feiertage
  feiertageDeutschland: typeof feiertageDeutschland.feiertage
  feiertageChina: typeof feiertageChina.feiertage
  
  // Szenarien
  szenarioDefaults: typeof szenarioDefaults.szenarien
}

export const KonfigurationContext = createContext<KonfigurationContextType>({
  projekt: stammdaten.projekt,
  varianten: stammdaten.varianten,
  jahresproduktion: stammdaten.jahresproduktion.gesamt,
  saisonalitaet: saisonalitaet.monate,
  lieferant: lieferant,
  vorlaufzeitTage: lieferant.vorlaufzeit.gesamt,
  losgröße: lieferant.losgröße.menge,
  sattelVarianten: stueckliste.sattel,
  feiertageDeutschland: feiertageDeutschland.feiertage,
  feiertageChina: feiertageChina.feiertage,
  szenarioDefaults: szenarioDefaults.szenarien
})

export function useKonfiguration() {
  return useContext(KonfigurationContext)
}
```

### Nutzung in Berechnungen

```typescript
// ✅ RICHTIG: Aus Context laden
import { useKonfiguration } from '@/contexts/KonfigurationContext'

function berechneProgrammPlanung() {
  const { jahresproduktion, saisonalitaet, varianten } = useKonfiguration()
  
  const tagesProduktion = jahresproduktion / 365 // 1.013,698...
  const aprilAnteil = saisonalitaet.find(m => m.monat === 4)?.anteil // 0,16
  
  // ... Berechnungen mit konfigurierbaren Werten
}

// ❌ FALSCH: Hardcodiert
function berechneProgrammPlanung() {
  const jahresproduktion = 370000 // Nicht konfigurierbar!
  const aprilAnteil = 0.16         // Magic Number!
}
```

## 🎓 Warum ist das wichtig?

### Vorteile

1. **Zentrale Wartung**
   - Änderung in JSON → Automatisch überall aktualisiert
   - Keine Suche nach hardcodierten Werten

2. **Konsistenz**
   - Alle Module nutzen die gleichen Werte
   - Keine Inkonsistenzen zwischen Berechnungen

3. **Konfigurierbarkeit**
   - Werte können über UI geändert werden
   - Einstellungen-Seite für alle Parameter

4. **Testbarkeit**
   - JSON-Dateien können für Tests ersetzt werden
   - Verschiedene Szenarien einfach testbar

5. **Präsentierbarkeit**
   - "Alle Werte konfigurierbar, keine Magic Numbers!"
   - Zeigt professionelle Software-Architektur

### Für die Bewertung

**Software-Qualität:**
- ✅ Saubere Architektur (SSOT-Prinzip)
- ✅ Wartbarkeit (zentrale Datenpflege)
- ✅ Erweiterbarkeit (neue JSON-Dateien hinzufügen)
- ✅ Dokumentation (JSON selbst-dokumentierend)

## 💡 Best Practices

### 1. Immer Context nutzen

```typescript
// ✅ RICHTIG: In React-Komponenten
function MeinKomponent() {
  const { jahresproduktion, vorlaufzeitTage } = useKonfiguration()
  // ...
}

// ✅ RICHTIG: In Berechnungen (Parameter übergeben)
export function berechneInbound(konfiguration: Konfiguration) {
  const vorlaufzeit = konfiguration.vorlaufzeitTage
  // ...
}

// ❌ FALSCH: Direkter JSON-Import in Komponenten
import stammdaten from '@/data/stammdaten.json' // Umgeht Context!
```

### 2. TypeScript-Typen aus JSON ableiten

```typescript
// ✅ RICHTIG: Type-safe
import stammdaten from '@/data/stammdaten.json'

type MTBVariante = typeof stammdaten.varianten[0]
type SaisonalitaetsMonat = typeof saisonalitaet.monate[0]

// Jetzt sind alle Properties type-safe!
```

### 3. Validierung beim Laden

```typescript
// KonfigurationContext.tsx
function validateKonfiguration() {
  // Jahresproduktion = Summe aller Varianten?
  const summeVarianten = Object.values(stammdaten.jahresproduktion.proVariante)
    .reduce((sum, menge) => sum + menge, 0)
  
  if (summeVarianten !== stammdaten.jahresproduktion.gesamt) {
    throw new Error('Jahresproduktion stimmt nicht mit Varianten-Summe überein!')
  }
  
  // Saisonalität = 100%?
  const summeSaison = saisonalitaet.monate
    .reduce((sum, m) => sum + m.anteil, 0)
  
  if (Math.abs(summeSaison - 1.0) > 0.01) {
    throw new Error('Saisonalität ergibt nicht 100%!')
  }
}
```

### 4. Dokumentation in JSON

```json
{
  "beschreibung": "Diese Datei enthält...",
  "version": "1.0",
  "letzteAktualisierung": "2027-01-15",
  "hinweise": {
    "kritisch": "Jahresproduktion 370.000 NICHT ändern ohne Abstimmung!",
    "vorlaufzeit": "49 Tage = 7 Wochen, siehe Logistik-Dokumentation"
  }
}
```

## 🔗 Verwandte Konzepte

- [Datenmodell](Datenmodell.md) - JSON-Schema & Interfaces
- [State Management](State-Management.md) - KonfigurationContext Details
- [Code-Struktur](Code-Struktur.md) - Architektur-Übersicht

## 🛠️ Für Entwickler

### Neue JSON-Datei hinzufügen

```typescript
// 1. JSON-Datei erstellen
// /src/data/neue-daten.json
{
  "beispielWert": 42
}

// 2. In KonfigurationContext importieren
import neueDaten from '@/data/neue-daten.json'

// 3. Context erweitern
interface KonfigurationContextType {
  // ... bestehende Properties
  neueDaten: typeof neueDaten
}

// 4. In Provider bereitstellen
<KonfigurationContext.Provider value={{
  // ... bestehende Values
  neueDaten
}}>

// 5. Nutzen
const { neueDaten } = useKonfiguration()
```

### JSON Schema Validierung (optional)

```bash
npm install -D ajv ajv-cli
```

```json
// schema/stammdaten.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "jahresproduktion": {
      "type": "object",
      "properties": {
        "gesamt": { "type": "number", "minimum": 0 }
      },
      "required": ["gesamt"]
    }
  },
  "required": ["jahresproduktion"]
}
```

---

**Siehe auch:**
- [JSON-Dateien](../../src/data/)
- [KonfigurationContext](../../src/contexts/KonfigurationContext.tsx)
- [Home](Home.md) | [Zurück zu Kernkonzepten](Home.md#-kernkonzepte)
