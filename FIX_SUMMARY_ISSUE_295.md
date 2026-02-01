# Fix für Issue #295: Produktions- und Warehouse-Logik Korrekturen

## Problem-Zusammenfassung

1. **Wochenenden/Feiertage zeigten Ist-Menge an** - An Nicht-Arbeitstagen wurde fälschlicherweise eine Ist-Produktion angezeigt
2. **Material OK zeigte "Ja" statt "-"** - An Wochenenden/Feiertagen sollte "-" angezeigt werden (N/A)
3. **Backlog-Berechnung inkorrekt** - Backlog wurde an Nicht-Arbeitstagen falsch behandelt
4. **Plan/Ist Spalten-Probleme** - Hingen mit den anderen Fehlern zusammen

## Implementierte Fixes

### 1. zentrale-produktionsplanung.ts (Zeile 353-390)

**Problem**: `istMenge` wurde auch für Nicht-Arbeitstage auf `planMenge` gesetzt

**Fix**:
```typescript
if (istArbeitstag) {
  // Produktionsberechnung für Arbeitstage
  // ...
  istMenge = planMenge  // Initial, wird durch Warehouse korrigiert
} else {
  // ✅ KRITISCHER FIX (Issue #295): An Wochenenden und Feiertagen KEINE Produktion!
  istMenge = 0
}
```

**Ergebnis**: An Wochenenden/Feiertagen ist `istMenge = 0`, was korrekt ist

### 2. warehouse-management.ts (Zeile 1248-1268)

**Problem**: Warehouse-Korrektur berücksichtigte nicht ob es ein Arbeitstag ist

**Fix**:
```typescript
// ✅ KRITISCHER FIX (Issue #295): Prüfe ob Arbeitstag!
const istArbeitstag = warehouseTag.istArbeitstag

// Für jede Variante
Object.entries(korrigiertePlaene).forEach(([varianteId, plan]) => {
  const produktionsTag = planDateLookup[varianteId][datumStr]
  if (!produktionsTag) return
  
  // ✅ KRITISCHER FIX (Issue #295): An Nicht-Arbeitstagen istMenge = 0 setzen
  if (!istArbeitstag) {
    produktionsTag.istMenge = 0
    produktionsTag.abweichung = 0 - produktionsTag.planMenge
    produktionsTag.materialVerfuegbar = produktionsTag.planMenge === 0
    return // Keine weitere Verarbeitung an Nicht-Arbeitstagen
  }
  // ... Rest der Logik nur für Arbeitstage
})
```

**Ergebnis**: Warehouse-Korrektur überschreibt nicht die korrekte `istMenge = 0` an Nicht-Arbeitstagen

### 3. warehouse-management.ts (Zeile 834-864)

**Problem**: ATP-Check (`Material OK`) zeigte "Ja" oder "Nein" auch an Nicht-Arbeitstagen

**Fix**:
```typescript
// ✅ KRITISCHER FIX (Issue #295): atpErfuellt NUR für Arbeitstage relevant!
if (istArbeitstag) {
  if (verbrauch > 0) {
    atpErfuellt = true  // Material war verfügbar
  } else if (benoetigt > 0 || backlogVorher > 0) {
    atpErfuellt = false  // Material fehlte
  } else {
    atpErfuellt = true  // Kein Bedarf = kein Problem
  }
} else {
  // An Wochenenden/Feiertagen: atpErfuellt = false, aber kein Grund
  // Dies ermöglicht der UI "-" anzuzeigen statt "Nein"
  atpErfuellt = false
  atpGrund = undefined
}
```

**Ergebnis**: An Nicht-Arbeitstagen wird `atpErfuellt = false` ohne Grund gesetzt, UI zeigt "-"

### 4. produktion/page.tsx (Zeile 290-301)

**Problem**: `materialVerfuegbar` wurde auf `false` gesetzt für Nicht-Arbeitstage, UI zeigte "Nein"

**Fix**:
```typescript
// ✅ KRITISCHER FIX (Issue #295): materialVerfuegbar Logik
materialVerfuegbar: !templateTag.istArbeitstag 
  ? true  // ✅ An Nicht-Arbeitstagen: true (damit UI "-" zeigt, nicht "Nein")
  : !hatMaterialEngpass,
```

**Kombiniert mit UI-Logik** (Zeile 1169-1176):
```typescript
format: (val, row) => {
  // An Nicht-Arbeitstagen zeigen wir "-"
  if (row && row.istArbeitstag === false) return '-'
  // Boolean zu Ja/Nein konvertieren
  if (val === true) return '✅ Ja'
  if (val === false) return '❌ Nein'
  return '-'
}
```

**Ergebnis**: An Nicht-Arbeitstagen zeigt die UI "-" statt "❌ Nein"

### 5. warehouse-management.ts (Zeile 740-746)

**Problem**: Backlog-Variablen waren innerhalb des `if (istArbeitstag)` Blocks definiert

**Fix**:
```typescript
// Variablen AUSSERHALB des if-Blocks definieren
let verbrauch = 0
let benoetigt = 0
const backlogVorher = produktionsBacklog[bauteilId]
let nichtProduziertHeute = 0
let nachgeholt = 0

if (istArbeitstag && tagImJahr >= 1 && tagImJahr <= 365) {
  // Backlog-Berechnung für Arbeitstage
  // ...
}
// An Nicht-Arbeitstagen bleiben die Werte auf 0 bzw. backlogVorher
```

**Ergebnis**: Backlog-Werte sind auch für Nicht-Arbeitstage verfügbar (bleiben unverändert)

## Validierung

### Test-Szenarien

1. **Wochenende (Sonntag, 04.04.2027, Tag 94)**:
   - ✅ istMenge = 0
   - ✅ Material OK = "-"
   - ✅ Backlog = unverändert vom Vortag

2. **Feiertag (Ostermontag, 05.04.2027, Tag 95)**:
   - ✅ istMenge = 0
   - ✅ Material OK = "-"
   - ✅ Backlog = unverändert vom Vortag

3. **Arbeitstag (Dienstag, 06.04.2027, Tag 96)**:
   - ✅ istMenge basiert auf Material-Verfügbarkeit
   - ✅ Material OK = "✅ Ja" oder "❌ Nein" (je nach Verfügbarkeit)
   - ✅ Backlog wird aktualisiert

### Build-Ergebnis

```
✓ Compiled successfully
✓ Generating static pages (9/9)
✓ Finalizing page optimization

Route (app)
├ ○ /produktion   ← Produktions-Seite erfolgreich gebaut
└ ...
```

## Zusammenfassung

**Alle 4 Probleme aus Issue #295 wurden behoben:**

1. ✅ **Wochenenden/Feiertage zeigen KEINE Ist-Menge mehr** - `istMenge = 0` an Nicht-Arbeitstagen
2. ✅ **Material OK zeigt "-" statt "Ja/Nein"** - Korrekte UI-Darstellung für N/A
3. ✅ **Backlog-Berechnung funktioniert korrekt** - Bleibt unverändert an Nicht-Arbeitstagen
4. ✅ **Plan/Ist Spalten korrekt** - Folgen aus den obigen Fixes

## Geänderte Dateien

1. `src/lib/calculations/zentrale-produktionsplanung.ts` - Kern-Fix für istMenge
2. `src/lib/calculations/warehouse-management.ts` - Warehouse-Korrektur + ATP-Check
3. `src/app/produktion/page.tsx` - UI-Darstellung für Material OK

## Keine Breaking Changes

- Alle Änderungen sind rückwärtskompatibel
- Build erfolgreich ohne Warnungen
- Keine Änderungen an API-Signaturen
- TypeScript-Typen unverändert
