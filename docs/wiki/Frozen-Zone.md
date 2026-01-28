# Frozen Zone Konzept - 'Heute'-Datum

## 📖 Übersicht

Das **Frozen Zone Konzept** trennt den Planungszeitraum in zwei Bereiche:
- **Vergangenheit (Frozen Zone):** Fixierte IST-Werte, nicht mehr änderbar
- **Zukunft (Planning Zone):** Planbare SOLL-Werte, editierbar

Dies ermöglicht realistische Planung und Plan-Ist-Vergleiche.

## 🎯 Das Problem

### Realität vs. Planung

In der Realität können vergangene Produktionen nicht mehr geändert werden:

```
❌ FALSCH: Alle Tage editierbar
01.01.2027 ───────────────────────────────── 31.12.2027
  [Edit] [Edit] [Edit] [Edit] ... [Edit] [Edit]

✅ RICHTIG: Vergangenheit fixiert
01.01.2027 ─────[ HEUTE: 15.04.2027 ]─────── 31.12.2027
  [IST]    [IST]    │    [PLAN]   [PLAN]   [PLAN]
                    │
              FROZEN ZONE      PLANNING ZONE
```

## ✅ Die Lösung: 'Heute'-Datum

### Konzept

Das System nutzt ein konfigurierbares **'Heute'-Datum** (z.B. 15.04.2027):

```typescript
// In stammdaten.json
{
  "projekt": {
    "heuteDatum": "2027-04-15"
  }
}
```

**Funktionsweise:**
1. Alle Tage **vor** 'Heute' → **Frozen Zone** (fixiert, grau)
2. Alle Tage **ab** 'Heute' → **Planning Zone** (editierbar, normal)

### Visualisierung

```
┌─────────────────────────────────────────────────────────┐
│  PRODUKTIONSPLANUNG 2027                                │
├─────────────────────────────────────────────────────────┤
│ ■ Vergangenheit (Frozen)    ☐ Zukunft (Planning)       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Jan Feb Mar │ Apr Mai Jun Jul Aug Sep Okt Nov Dez     │
│  ░░░░░░░░░░░░│                                          │
│              ↑                                          │
│         HEUTE (15.04.2027)                              │
│                                                         │
│  ■ IST-Werte  │  ☐ PLAN-Werte                          │
│  (fixiert)    │  (editierbar)                           │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Implementierung

### TypeScript Code

```typescript
// Hilfsfunktion
export function istInVergangenheit(datum: Date, heute: Date): boolean {
  return datum < heute
}

export function istInZukunft(datum: Date, heute: Date): boolean {
  return datum >= heute
}

// Anwendung in Komponenten
function ProduktionsplanungTabelle() {
  const { heuteDatum } = useKonfiguration()
  const heute = new Date(heuteDatum)
  
  return (
    <table>
      {tage.map(tag => {
        const datum = new Date(tag.datum)
        const isFrozen = istInVergangenheit(datum, heute)
        
        return (
          <tr key={tag.datum}>
            <td className={isFrozen ? 'text-gray-400' : ''}>
              {tag.datum}
            </td>
            <td>
              <input
                type="number"
                value={tag.produktion}
                disabled={isFrozen}
                className={isFrozen ? 'bg-gray-100' : 'bg-white'}
              />
            </td>
          </tr>
        )
      })}
    </table>
  )
}
```

### UI-Darstellung

**Vergangenheit (Frozen Zone):**
- ❌ Input-Felder: `disabled={true}`
- 🎨 Farbe: Grau (`text-gray-400`, `bg-gray-100`)
- 🔒 Icon: Schloss oder "Frozen"-Badge
- 📊 Werte: IST-Produktion (bereits erfolgt)

**Zukunft (Planning Zone):**
- ✅ Input-Felder: `disabled={false}`
- 🎨 Farbe: Normal (schwarz/weiß)
- ✏️ Icon: Edit-Icon oder "Plan"-Badge
- 📊 Werte: SOLL-Produktion (geplant)

## 📊 Anwendungsfälle

### 1. Programmplanung

```typescript
// zentrale-produktionsplanung.ts
export function berechneProgrammPlanung(
  konfiguration: Konfiguration
): ProgrammPlanung {
  const heute = new Date(konfiguration.projekt.heuteDatum)
  
  return {
    wochenpläne: generierePläne().map(plan => ({
      ...plan,
      isFrozen: istInVergangenheit(new Date(plan.woche), heute),
      typ: istInVergangenheit(new Date(plan.woche), heute) ? 'IST' : 'PLAN'
    }))
  }
}
```

### 2. Warehouse Management

```typescript
// warehouse-management.ts
export function berechneWarehouse(
  konfiguration: Konfiguration,
  oemPlaene: OEMPlan[]
): WarehouseData {
  const heute = new Date(konfiguration.projekt.heuteDatum)
  
  return {
    lagerbestand: berechneBestände().map(bestand => ({
      ...bestand,
      // Vergangenheit = fixierter Bestand, Zukunft = prognostiziert
      typ: istInVergangenheit(new Date(bestand.datum), heute) 
        ? 'IST-Bestand' 
        : 'PROGNOSE-Bestand'
    }))
  }
}
```

### 3. Inbound Logistik

```typescript
// inbound-china.ts
export function generiereBestellungen(
  konfiguration: Konfiguration,
  bedarf: Bedarf[]
): Bestellung[] {
  const heute = new Date(konfiguration.projekt.heuteDatum)
  
  return bedarf.map(b => {
    const bestellDatum = berechneBest

ellDatum(b)
    const isFrozen = istInVergangenheit(bestellDatum, heute)
    
    return {
      datum: bestellDatum,
      menge: b.menge,
      status: isFrozen ? 'VERBUCHT' : 'GEPLANT',
      editierbar: !isFrozen
    }
  })
}
```

## 🎓 Warum ist das wichtig?

### Für die Bewertung (Anforderungen A1 & A11)

> **A1: Wochenplanung + 'Heute'-Datum**
> 
> Das Programm ist auf Wochenbasis zu erstellen, gegenwärtiges Datum ist zu berücksichtigen.

> **A11: 'Heute'-Datum Frozen Zone**
> 
> Vergangenheit muss als fixiert dargestellt werden, Zukunft als planbar.

**Bewertungskriterien:**
- ✅ Heute-Datum konfigurierbar (nicht hardcodiert)
- ✅ Vergangenheit visuell unterscheidbar (grau/disabled)
- ✅ Zukunft editierbar (normal/enabled)
- ✅ Plan-Ist-Vergleich möglich

### Für die Präsentation

**Zeigen können:**
1. "Heute ist der 15.04.2027 - alles davor ist fixiert"
2. "Januar-März: IST-Produktion, April-Dezember: PLAN"
3. "Vergangenheit kann nicht mehr geändert werden (realistisch!)"
4. "Bei Änderung des 'Heute'-Datums verschiebt sich die Frozen Zone"

## 📈 Daten aus JSON

### Konfiguration

```json
// src/data/stammdaten.json
{
  "projekt": {
    "heuteDatum": "2027-04-15",
    "beschreibung": "Aktuelles Planungsdatum, trennt IST und PLAN"
  }
}
```

### Context

```typescript
// KonfigurationContext.tsx
const KonfigurationContext = createContext({
  heuteDatum: '2027-04-15',
  // ... weitere Werte
})

export function useKonfiguration() {
  return useContext(KonfigurationContext)
}
```

## 💡 Best Practices

### 1. Immer aus Context laden

```typescript
// ✅ RICHTIG
const { heuteDatum } = useKonfiguration()
const heute = new Date(heuteDatum)

// ❌ FALSCH: Hardcodiert
const heute = new Date('2027-04-15') // Nicht konfigurierbar!
```

### 2. Konsistente Nutzung

```typescript
// Alle Module nutzen das gleiche 'Heute'-Datum
const heute = new Date(konfiguration.projekt.heuteDatum)

// NICHT verschiedene Daten in verschiedenen Modulen!
```

### 3. UI-Feedback

```typescript
// Klare visuelle Unterscheidung
<div className={isFrozen ? 'frozen-zone' : 'planning-zone'}>
  {isFrozen && <span className="badge">IST</span>}
  {!isFrozen && <span className="badge">PLAN</span>}
  <input disabled={isFrozen} />
</div>
```

### 4. Validierung

```typescript
// Keine Bestellungen in der Vergangenheit zulassen
if (istInVergangenheit(bestellDatum, heute)) {
  throw new Error('Bestellungen können nicht rückwirkend geändert werden')
}
```

## 🔄 Dynamische Anpassung

Das 'Heute'-Datum kann in den Einstellungen geändert werden:

```typescript
// Einstellungen-Seite
function EinstellungenPage() {
  const { heuteDatum, setHeuteDatum } = useKonfiguration()
  
  return (
    <div>
      <label>Heutiges Datum:</label>
      <input
        type="date"
        value={heuteDatum}
        onChange={e => setHeuteDatum(e.target.value)}
      />
      <p>
        Frozen Zone: 01.01.2027 - {heuteDatum}
        Planning Zone: {heuteDatum} - 31.12.2027
      </p>
    </div>
  )
}
```

**Effekt:** Sofortige Aktualisierung aller Berechnungen und UI-Elemente!

## 🔗 Verwandte Konzepte

- [OEM Planung](OEM-Planung.md) - Nutzt Frozen Zone für Plan-Ist-Vergleich
- [ATP-Check](ATP-Check.md) - Prüft nur Zukunft (Planning Zone)
- [SSOT](SSOT.md) - 'Heute'-Datum aus JSON-Konfiguration

## 🛠️ Für Entwickler

### Datum-Vergleich

```typescript
// Vorsicht: Date-Objekte vergleichen Zeit UND Datum!
const heute = new Date('2027-04-15')
const datum = new Date('2027-04-15T14:30:00')

// ❌ FALSCH: Zeit wird auch verglichen
datum < heute // false (wegen Uhrzeit!)

// ✅ RICHTIG: Nur Datum vergleichen
const heuteDate = new Date(heute.toDateString())
const datumDate = new Date(datum.toDateString())
datumDate < heuteDate // false (gleich!)
datumDate <= heuteDate // true (kleiner oder gleich)
```

### Helper-Funktionen

```typescript
// lib/helpers/frozen-zone.ts
export function normalizeDatum(datum: Date): Date {
  return new Date(datum.toDateString())
}

export function istInFrozenZone(datum: Date, heute: Date): boolean {
  const datumNorm = normalizeDatum(datum)
  const heuteNorm = normalizeDatum(heute)
  return datumNorm < heuteNorm
}

export function istInPlanningZone(datum: Date, heute: Date): boolean {
  const datumNorm = normalizeDatum(datum)
  const heuteNorm = normalizeDatum(heute)
  return datumNorm >= heuteNorm
}
```

---

**Siehe auch:**
- [Code: zentrale-produktionsplanung.ts](../../src/lib/calculations/zentrale-produktionsplanung.ts)
- [JSON: stammdaten.json](../../src/data/stammdaten.json)
- [Home](Home.md) | [Zurück zu Kernkonzepten](Home.md#-kernkonzepte)
