# OEM Planung als Berechnungsbasis

## 📖 Übersicht

Die **OEM Planung** (Zentrale Produktionsplanung) ist die **EINZIGE Berechnungsbasis** für alle anderen Module im System. 

**Kritische Regel:** ALLE Berechnungen müssen auf der OEM Planung basieren - wie Zahnräder, die präzise ineinandergreifen.

## 🎯 Das Problem

### Standalone-Berechnungen (FALSCH!)

```typescript
// ❌ FALSCH: Inbound berechnet eigene Mengen
function berechneBestellungen() {
  const bikes = 370000
  const tage = 365
  const bedarf = bikes / tage * saisonFaktor
  // Problem: Nicht synchron mit OEM!
}

// ❌ FALSCH: Warehouse berechnet eigene Bestände
function berechneLagerbestand() {
  const verbrauch = schätzungBasierendAufSaisonalität()
  // Problem: Imaginäre Daten, keine Basis!
}
```

**Probleme:**
- ❌ Inkonsistente Daten zwischen Modulen
- ❌ OEM sagt "1.000 Bikes", Inbound bestellt für "1.100 Bikes"
- ❌ Lagerbestände stimmen nicht mit Produktion überein
- ❌ Keine gemeinsame "Single Version of Truth"

## ✅ Die Lösung: OEM als zentrale Basis

### Konzept

```
┌──────────────────────────────────────────┐
│  OEM PLANUNG (Zentrale Produktionsplan) │ ← SINGLE SOURCE!
│  zentrale-produktionsplanung.ts          │
│                                          │
│  • 370.000 Bikes / 365 Tage             │
│  • Error Management (±0 Abweichung)     │
│  • Saisonalität berücksichtigt          │
│  • Feiertage berücksichtigt             │
└──────────────────────────────────────────┘
              │
              ├──────────────────────────────┐
              │                              │
              ↓                              ↓
┌─────────────────────────┐   ┌────────────────────────┐
│  INBOUND LOGISTIK       │   │  WAREHOUSE MANAGEMENT  │
│  Bestellungen berechnen │   │  Lagerbestände führen  │
│  BASIEREND AUF OEM!     │   │  BASIEREND AUF OEM!    │
└─────────────────────────┘   └────────────────────────┘
              │                              │
              └──────────────┬───────────────┘
                             ↓
              ┌────────────────────────────┐
              │  PRODUKTIONSSTEUERUNG      │
              │  IST-Produktion berechnen  │
              │  BASIEREND AUF OEM + MAT!  │
              └────────────────────────────┘
```

### Datenfluss

```typescript
// 1. OEM Planung generieren (EINMAL!)
const oemPlaene = generiereAlleVariantenProduktionsplaene(konfiguration)

// 2. Inbound basiert auf OEM
const bestellungen = generiereTaeglicheBestellungen(
  oemPlaene,  // ← Nutzt OEM als Basis!
  konfiguration
)

// 3. Warehouse basiert auf OEM + Bestellungen
const warehouse = berechneIntegriertesWarehouse(
  konfiguration,
  oemPlaene,      // ← Nutzt OEM für Verbrauch!
  bestellungen    // ← Nutzt Bestellungen für Zugänge!
)

// 4. Produktion basiert auf OEM + Warehouse
const produktion = berechneProduktionssteuerung(
  oemPlaene,    // ← SOLL aus OEM
  warehouse,    // ← Material-Verfügbarkeit
  konfiguration
)
```

## 🔧 OEM Planung Implementierung

### Dateistandort

**Code:** `/src/lib/calculations/zentrale-produktionsplanung.ts`

### Kernfunktion

```typescript
/**
 * ZENTRALE PRODUKTIONSPLANUNG - SINGLE SOURCE OF TRUTH
 * 
 * Diese Funktion ist die EINZIGE Quelle für Produktionsmengen.
 * ALLE anderen Berechnungen (Inbound, Warehouse, Produktion) 
 * müssen diese Planung als Basis nutzen!
 */
export function generiereAlleVariantenProduktionsplaene(
  konfiguration: Konfiguration
): OEMPlan[] {
  const { varianten, jahresproduktion, saisonalitaet } = konfiguration
  const pläne: OEMPlan[] = []
  
  // Pro MTB-Variante einen Plan generieren
  for (const variante of varianten) {
    const variantenPlan = generiereVariantenPlan(
      variante,
      jahresproduktion.proVariante[variante.id],
      saisonalitaet
    )
    pläne.push(variantenPlan)
  }
  
  return pläne
}

function generiereVariantenPlan(
  variante: MTBVariante,
  jahresMenge: number,
  saisonalitaet: Saisonalitaet[]
): OEMPlan {
  const tagesPläne: TagesPlan[] = []
  let kumulierterError = 0
  
  // Tag für Tag durchgehen (365 Tage)
  for (let tag = 1; tag <= 365; tag++) {
    const datum = new Date(2027, 0, tag)
    const monat = datum.getMonth() + 1
    
    // Saisonaler Faktor
    const saisonFaktor = saisonalitaet.find(s => s.monat === monat)?.anteil || 0.08
    
    // Soll-Produktion für diesen Tag
    const sollProduktionDezimal = (jahresMenge / 365) * (saisonFaktor * 12)
    
    // Error Management anwenden
    const { istMenge, kumulierterError: neuerError } = 
      berechneProduktionMitErrorManagement(sollProduktionDezimal, kumulierterError)
    
    tagesPläne.push({
      datum: datum.toISOString().split('T')[0],
      sollProduktion: sollProduktionDezimal,
      planProduktion: istMenge,
      variante: variante.id
    })
    
    kumulierterError = neuerError
  }
  
  return {
    variante: variante.id,
    jahresMenge,
    tagesPläne,
    jahresSumme: tagesPläne.reduce((sum, t) => sum + t.planProduktion, 0)
  }
}
```

## 📊 Wie andere Module OEM nutzen

### 1. Inbound Logistik

```typescript
// inbound-china.ts
export function generiereTaeglicheBestellungen(
  oemPlaene: OEMPlan[],
  konfiguration: Konfiguration
): Bestellung[] {
  const { vorlaufzeitTage, losgröße } = konfiguration
  const bestellungen: Bestellung[] = []
  
  // Für jeden Tag: Bedarf aus OEM ableiten
  for (let tag = 1; tag <= 365; tag++) {
    const datum = new Date(2027, 0, tag)
    
    // Bedarf = Summe aller Varianten an diesem Tag (aus OEM!)
    const tagesBedarf = oemPlaene.reduce((sum, plan) => {
      const tagPlan = plan.tagesPläne.find(t => t.datum === datum.toISOString().split('T')[0])
      return sum + (tagPlan?.planProduktion || 0)
    }, 0)
    
    // Bestellung berechnen (Losgröße berücksichtigen)
    if (tagesBedarf > 0) {
      const bestellDatum = new Date(datum)
      bestellDatum.setDate(bestellDatum.getDate() - vorlaufzeitTage) // -49 Tage
      
      const losgrößenAnzahl = Math.ceil(tagesBedarf / losgröße)
      const bestellMenge = losgrößenAnzahl * losgröße
      
      bestellungen.push({
        bestellDatum: bestellDatum.toISOString().split('T')[0],
        lieferDatum: datum.toISOString().split('T')[0],
        menge: bestellMenge,
        quelle: 'OEM-Bedarf' // ← Dokumentiert Herkunft!
      })
    }
  }
  
  return bestellungen
}
```

**Wichtig:** 
- ✅ Nutzt `oemPlaene` als Parameter
- ✅ Berechnet Bedarf NICHT neu, sondern liest aus OEM
- ✅ Dokumentiert Quelle: "OEM-Bedarf"

### 2. Warehouse Management

```typescript
// warehouse-management.ts
export function berechneIntegriertesWarehouse(
  konfiguration: Konfiguration,
  oemPlaene: OEMPlan[],
  bestellungen: Bestellung[]
): WarehouseData {
  let lagerbestand = 0
  const tagesbestände: TagesBestand[] = []
  
  for (let tag = 1; tag <= 365; tag++) {
    const datum = new Date(2027, 0, tag)
    const datumStr = datum.toISOString().split('T')[0]
    
    // 1. Zugänge (Lieferungen)
    const zugänge = bestellungen
      .filter(b => b.lieferDatum === datumStr)
      .reduce((sum, b) => sum + b.menge, 0)
    
    lagerbestand += zugänge
    
    // 2. Abgänge (Produktion aus OEM!)
    const verbrauch = oemPlaene.reduce((sum, plan) => {
      const tagPlan = plan.tagesPläne.find(t => t.datum === datumStr)
      return sum + (tagPlan?.planProduktion || 0)
    }, 0)
    
    lagerbestand -= verbrauch
    
    tagesbestände.push({
      datum: datumStr,
      zugänge,
      abgänge: verbrauch,  // ← Aus OEM!
      bestand: lagerbestand
    })
  }
  
  return { tagesbestände }
}
```

**Wichtig:**
- ✅ Verbrauch aus `oemPlaene`, NICHT neu berechnet
- ✅ Konsistenz: Verbrauch = OEM-Plan
- ✅ Keine imaginären Daten

### 3. Produktionssteuerung

```typescript
// Produktion kombiniert OEM (SOLL) mit Warehouse (Verfügbarkeit)
export function berechneProduktionssteuerung(
  oemPlaene: OEMPlan[],
  warehouse: WarehouseData,
  konfiguration: Konfiguration
): Produktionsdaten {
  const produktionsTage: ProduktionsTag[] = []
  
  for (let tag = 1; tag <= 365; tag++) {
    const datum = new Date(2027, 0, tag)
    const datumStr = datum.toISOString().split('T')[0]
    
    // SOLL aus OEM
    const sollProduktion = oemPlaene.reduce((sum, plan) => {
      const tagPlan = plan.tagesPläne.find(t => t.datum === datumStr)
      return sum + (tagPlan?.planProduktion || 0)
    }, 0)
    
    // Material-Verfügbarkeit aus Warehouse
    const lagerbestand = warehouse.tagesbestände.find(t => t.datum === datumStr)?.bestand || 0
    
    // ATP-Check
    const istProduktion = Math.min(sollProduktion, lagerbestand)
    
    produktionsTage.push({
      datum: datumStr,
      sollProduktion,  // ← Aus OEM
      istProduktion,   // ← Nach ATP-Check
      materialVerfügbar: lagerbestand >= sollProduktion
    })
  }
  
  return { produktionsTage }
}
```

**Wichtig:**
- ✅ SOLL kommt aus `oemPlaene`
- ✅ IST wird durch ATP-Check begrenzt
- ✅ Klare Trennung SOLL (OEM) vs. IST (realisiert)

## 🎓 Warum ist das wichtig?

### Für die Bewertung

**Software-Qualität:**
- ✅ Konsistente Datenflüsse
- ✅ Keine Redundanz (DRY-Prinzip)
- ✅ Single Version of Truth
- ✅ Wartbar und erweiterbar

**Fachliche Korrektheit:**
- ✅ Realistische Supply Chain (alle Zahlen konsistent)
- ✅ Keine Inkonsistenzen zwischen Modulen
- ✅ Präzise Planung (alle Zahnräder greifen ineinander)

### Für die Präsentation

**Zeigen können:**
1. "OEM plant 1.013 Bikes/Tag → Inbound bestellt dafür → Warehouse verwaltet das"
2. "Alle Module nutzen die GLEICHE Berechnungsbasis"
3. "Änderung in OEM → Sofort in allen Modulen sichtbar"
4. "Keine imaginären Daten - alles basiert auf OEM"

## 💡 Best Practices

### 1. OEM zuerst berechnen

```typescript
// ✅ RICHTIG: Reihenfolge beachten
const oemPlaene = generiereAlleVariantenProduktionsplaene(konfiguration)
const bestellungen = generiereTaeglicheBestellungen(oemPlaene, konfiguration)
const warehouse = berechneIntegriertesWarehouse(konfiguration, oemPlaene, bestellungen)
const produktion = berechneProduktionssteuerung(oemPlaene, warehouse, konfiguration)

// ❌ FALSCH: Falsche Reihenfolge
const bestellungen = generiereTaeglicheBestellungen() // OEM fehlt!
```

### 2. OEM als Parameter übergeben

```typescript
// ✅ RICHTIG: OEM als Parameter
export function berechneModul(
  oemPlaene: OEMPlan[],
  konfiguration: Konfiguration
) {
  // Nutzt oemPlaene
}

// ❌ FALSCH: OEM intern neu berechnen
export function berechneModul(konfiguration: Konfiguration) {
  const oemPlaene = generiereAlleVariantenProduktionsplaene(konfiguration) // Dupliziert!
}
```

### 3. Quelle dokumentieren

```typescript
// ✅ RICHTIG: Dokumentiere Herkunft
const bedarf = {
  menge: 1000,
  quelle: 'OEM-Planung Tag 42',  // ← Nachvollziehbar!
  datum: '2027-02-11'
}

// ❌ FALSCH: Keine Dokumentation
const bedarf = 1000 // Woher kommt das?
```

### 4. Keine Standalone-Berechnungen

```typescript
// ❌ VERBOTEN: Standalone-Berechnung
function berechneBedarfOhneOEM() {
  const bikes = 370000 / 365
  return bikes // Nicht synchron mit OEM!
}

// ✅ RICHTIG: Aus OEM lesen
function berechneBedarfAusOEM(oemPlaene: OEMPlan[], datum: string) {
  return oemPlaene.reduce((sum, plan) => {
    const tag = plan.tagesPläne.find(t => t.datum === datum)
    return sum + (tag?.planProduktion || 0)
  }, 0)
}
```

## 🔗 Verwandte Konzepte

- [Error Management](Error-Management.md) - Wird in OEM Planung angewendet
- [SSOT](SSOT.md) - OEM als Single Source of Truth für Mengen
- [ATP-Check](ATP-Check.md) - Nutzt OEM für SOLL-Produktion
- [Warehouse Management](Warehouse-Management.md) - Nutzt OEM für Verbrauch

## 🛠️ Für Entwickler

### OEM in eigenem Modul nutzen

```typescript
// Neues Modul: Versand-Planung
export function berechneVersandPlanung(
  oemPlaene: OEMPlan[],
  konfiguration: Konfiguration
): VersandPlan {
  // OEM gibt fertige Bikes pro Tag vor
  return oemPlaene.map(plan => ({
    variante: plan.variante,
    versandMengen: plan.tagesPläne.map(tag => ({
      datum: tag.datum,
      // Fertige Bikes = OEM Plan-Produktion
      verfügbar: tag.planProduktion,
      versand: berechneVersandFürTag(tag.planProduktion)
    }))
  }))
}
```

### OEM-Daten validieren

```typescript
// Validierung nach OEM-Generierung
export function validiereOEMPlaene(oemPlaene: OEMPlan[]): ValidationResult {
  const errors: string[] = []
  
  // Jahressumme pro Variante korrekt?
  for (const plan of oemPlaene) {
    const summe = plan.tagesPläne.reduce((sum, t) => sum + t.planProduktion, 0)
    if (Math.abs(summe - plan.jahresMenge) > 1) {
      errors.push(`${plan.variante}: Summe ${summe} ≠ Jahresmenge ${plan.jahresMenge}`)
    }
  }
  
  // Gesamt-Jahressumme = 370.000?
  const gesamtSumme = oemPlaene.reduce((sum, p) => sum + p.jahresSumme, 0)
  if (Math.abs(gesamtSumme - 370000) > 8) { // ±1 pro Variante = max ±8
    errors.push(`Gesamtsumme ${gesamtSumme} ≠ 370.000`)
  }
  
  return { isValid: errors.length === 0, errors }
}
```

---

**Siehe auch:**
- [Code: zentrale-produktionsplanung.ts](../../src/lib/calculations/zentrale-produktionsplanung.ts)
- [Code: inbound-china.ts](../../src/lib/calculations/inbound-china.ts)
- [Code: warehouse-management.ts](../../src/lib/calculations/warehouse-management.ts)
- [Home](Home.md) | [Zurück zu Kernkonzepten](Home.md#-kernkonzepte)
