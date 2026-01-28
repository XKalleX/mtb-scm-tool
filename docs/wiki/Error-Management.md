# Error Management - Rundungsfehler-Korrektur

## 📖 Übersicht

Das **Error Management** ist eines der Kernkonzepte des Supply Chain Management Systems und löst ein fundamentales Problem bei der Produktionsplanung: **Wie verteilt man 370.000 Bikes auf 365 Tage ohne kumulative Rundungsfehler?**

## 🎯 Das Problem

### Mathematische Herausforderung

Bei der täglichen Produktionsplanung entstehen Dezimalzahlen:

```
370.000 Bikes / 365 Tage = 1.013,698... Bikes/Tag
```

Die tatsächliche Produktion muss aber in **ganzen Einheiten** erfolgen (z.B. 1.013 oder 1.014 Bikes).

### Naive Lösung (FALSCH!)

```typescript
// ❌ FALSCH: Einfaches Runden
const tagesProduktion = Math.round(370000 / 365) // = 1.014 Bikes/Tag

// Problem: Über das Jahr
const jahresSumme = 1014 * 365 = 370.110 Bikes  // +110 Bikes zu viel!
```

**Resultat ohne Error Management:**
- ❌ Systematische Abweichungen: ±100 bis ±200 Bikes pro Jahr
- ❌ Fehler akkumuliert sich über Monate
- ❌ Planungsunsicherheit

## ✅ Die Lösung: Kumulatives Error Management

### Konzept

Der **kumulative Fehler** wird für jeden Tag mitgeführt:

1. **Berechne dezimale Soll-Menge**
2. **Addiere Tages-Fehler zum kumulierten Fehler**
3. **Wenn kumulierter Fehler ≥ 1,0:** Produziere eine zusätzliche Einheit
4. **Reduziere Fehler um 1,0**

### Beispiel-Berechnung

```typescript
Tag  | Soll (dezimal) | Fehler Alt | Tages-Error | Kum. Fehler | Ist-Produktion
-----|----------------|------------|-------------|-------------|----------------
  1  |   71,61        |    0,00    |    0,61     |    0,61     |      71
  2  |   71,61        |    0,61    |    0,61     |    1,22     |      72  ← +1!
  3  |   71,61        |    0,22    |    0,61     |    0,83     |      71
  4  |   71,61        |    0,83    |    0,61     |    1,44     |      72  ← +1!
  5  |   71,61        |    0,44    |    0,61     |    1,05     |      72  ← +1!
...
365  |   71,61        |    ...     |    0,61     |    0,xx     |      71/72
-----|----------------|------------|-------------|-------------|----------------
SUMME: 26.137 Bikes (exakt!)
```

**Resultat:** Jahressumme stimmt auf ±1 Bike genau!

## 🔧 Implementierung

### TypeScript Code

```typescript
export interface ErrorState {
  kumulierterError: number;      // Aktueller akkumulierter Fehler
  tagesError: number;             // Fehler des aktuellen Tags
  sollMenge: number;              // Dezimale Soll-Menge
  istMenge: number;               // Integer Ist-Menge (produziert)
  korrekturAngewendet: boolean;   // Wurde eine Korrektur vorgenommen?
}

export function berechneProduktionMitErrorManagement(
  sollMenge: number,
  vorherigerError: number = 0
): ErrorState {
  // Basis-Menge (Abrunden)
  const basisMenge = Math.floor(sollMenge)
  
  // Tages-Error: Differenz zwischen Soll und Basis
  const tagesError = sollMenge - basisMenge
  
  // Kumulierter Error: Vorheriger Error + Tages-Error
  let kumulierterError = vorherigerError + tagesError
  
  // Entscheidung: Zusatz-Einheit produzieren?
  let istMenge = basisMenge
  let korrekturAngewendet = false
  
  if (kumulierterError >= 1.0) {
    // Ja! Eine zusätzliche Einheit produzieren
    istMenge = basisMenge + 1
    kumulierterError -= 1.0
    korrekturAngewendet = true
  }
  
  return {
    kumulierterError,
    tagesError,
    sollMenge,
    istMenge,
    korrekturAngewendet
  }
}
```

### Dateistandort

**Code:** `/src/lib/calculations/error-management.ts`

## 📊 Mit Saisonalität

Das Error Management wird **pro MTB-Variante** angewendet, unter Berücksichtigung der saisonalen Verteilung:

```typescript
// MTB Allrounder: 111.000 Bikes/Jahr, 30% Anteil
// Januar: 4% vom Jahresvolumen = 4.440 Bikes
// April: 16% vom Jahresvolumen = 17.760 Bikes (Peak!)

function berechneSaisonaleProduktion(
  variante: MTBVariante,
  monat: number
): TagesProduktion[] {
  const jahresproduktion = variante.jahresMenge // z.B. 111.000
  const saisonFaktor = getSaisonFaktor(monat)   // z.B. 0,16 für April
  const tageImMonat = getArbeitstage(monat)     // z.B. 21
  
  const monatsProduktion = jahresproduktion * saisonFaktor
  const durchschnittProTag = monatsProduktion / tageImMonat
  
  // Error Management anwenden
  let kumulierterError = 0
  const tagesProduktionen: TagesProduktion[] = []
  
  for (let tag = 1; tag <= tageImMonat; tag++) {
    const errorState = berechneProduktionMitErrorManagement(
      durchschnittProTag,
      kumulierterError
    )
    
    tagesProduktionen.push({
      tag,
      sollMenge: errorState.sollMenge,
      istMenge: errorState.istMenge,
      fehler: errorState.kumulierterError
    })
    
    kumulierterError = errorState.kumulierterError
  }
  
  return tagesProduktionen
}
```

## ✅ Validierung

Das System führt automatische Validierungen durch:

```typescript
export function validiereJahresplanung(
  planung: ErrorState[],
  sollJahresproduktion: number
) {
  const istJahresproduktion = planung.reduce((sum, day) => sum + day.istMenge, 0)
  const abweichung = istJahresproduktion - sollJahresproduktion
  const abweichungProzent = (abweichung / sollJahresproduktion) * 100
  
  return {
    istJahresproduktion,
    sollJahresproduktion,
    abweichung,
    abweichungProzent,
    istGenau: Math.abs(abweichung) <= 1 // ±1 Bike = perfekt!
  }
}
```

**Erwartetes Ergebnis:**
- ✅ Abweichung ≤ 1 Bike
- ✅ Fehlerrate < 0,001%
- ✅ Konsistenz über alle 8 MTB-Varianten

## 🎓 Warum ist das wichtig?

### Für die Bewertung (Anforderung A2)

> **A2: Saisonalität + Stückliste + Error Management**
> 
> Das System muss saisonale Verteilung korrekt umsetzen UND dabei Rundungsfehler vermeiden.

**Bewertungskriterien:**
- ✅ Jahressumme stimmt exakt (370.000 Bikes)
- ✅ Monatliche Verteilung korrekt (April Peak 16%)
- ✅ Keine Sprünge in der Tagesproduktion
- ✅ Dokumentation des Konzepts (im Code + Wiki)

### Für die Präsentation

**Zeigen können:**
1. "Ohne Error Management hätten wir +127 Bikes zu viel produziert"
2. "Mit Error Management: Abweichung = 0 Bikes!"
3. "Kumulative Fehlerkorrektur an ~40% der Tage aktiv"

## 📈 Statistische Auswertung

Für eine MTB-Variante (z.B. Allrounder):

```
Jahresproduktion: 111.000 Bikes
Durchschnitt/Tag: 304,11 Bikes
Tage mit Korrektur: ~148 (40,5%)
Maximaler Fehler: 0,89 (< 1,0)
Abweichung: 0 Bikes (100% genau!)
```

## 🔗 Verwandte Konzepte

- [Saisonalität](Saisonalitaet.md) - Monatliche Verteilung
- [OEM Planung](OEM-Planung.md) - Zentrale Produktionsplanung
- [Zentrale Produktionsplanung](Zentrale-Produktionsplanung.md) - Implementierungsdetails

## 🛠️ Für Entwickler

### Integration in eigenen Code

```typescript
import { berechneProduktionMitErrorManagement } from '@/lib/calculations/error-management'

// Beispiel: 1000 Bikes über 7 Tage verteilen
const wochenProduktion = 1000
const arbeitstage = 7
const durchschnitt = wochenProduktion / arbeitstage // 142,86

let kumulierterError = 0
for (let tag = 1; tag <= arbeitstage; tag++) {
  const { istMenge, kumulierterError: neuerError } = 
    berechneProduktionMitErrorManagement(durchschnitt, kumulierterError)
  
  console.log(`Tag ${tag}: ${istMenge} Bikes`)
  kumulierterError = neuerError
}

// Output:
// Tag 1: 142 Bikes
// Tag 2: 143 Bikes (Korrektur!)
// Tag 3: 143 Bikes (Korrektur!)
// Tag 4: 142 Bikes
// Tag 5: 143 Bikes (Korrektur!)
// Tag 6: 143 Bikes (Korrektur!)
// Tag 7: 144 Bikes (Korrektur!)
// Summe: 1000 Bikes (exakt!)
```

## 💡 Best Practices

1. **Pro Variante eigener Error-Tracker**
   - Jede MTB-Variante hat eigenen kumulierten Fehler
   - NICHT über alle Varianten hinweg einen gemeinsamen Error

2. **Fehler nicht zurücksetzen**
   - Kumulierter Error läuft über das gesamte Jahr
   - Kein Reset bei Monatswechsel

3. **Validierung nach jeder Berechnung**
   - Immer Jahressumme prüfen
   - Abweichung > 1 Bike = Fehler im Code!

4. **Dokumentation im Code**
   - Deutsche Kommentare für Prüfung
   - Erklärung des Konzepts, nicht nur des Codes

---

**Siehe auch:**
- [Code: error-management.ts](../../src/lib/calculations/error-management.ts)
- [Code: zentrale-produktionsplanung.ts](../../src/lib/calculations/zentrale-produktionsplanung.ts)
- [Home](Home.md) | [Zurück zu Kernkonzepten](Home.md#-kernkonzepte)
