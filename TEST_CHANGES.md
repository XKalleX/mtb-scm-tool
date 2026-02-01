# Test-Änderungen für Issue-Fix

## Problem 1: Produktionskapazität ✅ BEHOBEN
**Fix Location:** `src/lib/calculations/warehouse-management.ts`

**Änderungen:**
1. Zeile ~495: `maxSchichtenProTag` wird jetzt aus `konfiguration.produktion.maxSchichtenProTag` gelesen (NICHT hardcoded 3)
2. Zeile ~550: ATP-Check respektiert BEIDE Limits: Material UND Kapazität
3. Zeile ~712: Post-Jahresende-Verarbeitung nutzt Kapazitätslimit aus Konfiguration

**Berechnung:**
- Max. Kapazität = `kapazitaetProStunde × stundenProSchicht × maxSchichtenProTag`
- Aus JSON: 130 × 8 × 3 = **3.120 Bikes/Tag**
- Alles darüber → Backlog

## Problem 2: Material-Check ✅ BEHOBEN
**Fix Location:** `src/lib/calculations/warehouse-management.ts`

**Änderungen:**
1. Zeile ~511: `maxMoeglich = Math.min(verfuegbarFuerProduktion, maxProduktionKapazitaet)`
2. Zeile ~513-555: Korrekte Backlog-Berechnung mit Material-Limit
3. Zeile ~536-542: Detaillierte Grund-Meldungen (Material vs. Kapazität vs. Beides)

**Testfall (Tag 4 - 04.01.27):**
- Verfügbar: 500 Sättel (erste Lieferung am 29.12.26)
- Bedarf: 740 Bikes
- **Produktion: 500 Bikes** ✅
- **Backlog: 240 Bikes** ✅

## Problem 3: UI-Verbesserungen ✅ BEHOBEN
**Fix Location:** `src/app/produktion/page.tsx`

**Änderungen:**
1. **min-height: 600px** auf BEIDEN Tabellen (Produktion + Warehouse)
2. **Zeitperioden-Schalter** für beide Tabellen (Tag/KW/Monat)
3. **Aggregations-Logik:**
   - Wochen: Gruppierung nach Kalenderwoche (KW 1-52)
   - Monate: Gruppierung nach Monat (Jan-Dez)
   - Beide: Korrekte Summen, Arbeitstage, Schichten, Auslastung
4. **Icons:** Calendar, CalendarDays, CalendarRange für visuelle Klarheit

**Neue State-Variablen:**
- `zeitperiodeProduktion`: 'tag' | 'woche' | 'monat'
- `zeitperiodeWarehouse`: 'tag' | 'woche' | 'monat'

**Buttons:**
- Produktionsseite: Purple (bg-purple-600)
- Warehouse: Green (bg-green-600)
- Active state: default variant
- Inactive state: outline variant

## Test-Checkliste
- [x] Build erfolgreich
- [x] TypeScript-Fehler behoben
- [x] Kapazitätslimits aus Konfiguration gelesen
- [x] Material-Check korrekt implementiert
- [x] UI-Schalter hinzugefügt
- [x] Aggregations-Logik integriert
- [x] min-height: 600px gesetzt
- [ ] Runtime-Test im Browser (empfohlen)
- [ ] Tag 4 Produktion überprüfen (sollte 500 statt 740 sein)
- [ ] Backlog-Werte validieren

## Nächste Schritte
1. Starte Dev-Server: `npm run dev`
2. Navigiere zu `/produktion`
3. Prüfe Tag 4 (04.01.2027):
   - Soll: IST-Menge = 500 Bikes
   - Material OK = ❌ Nein
   - Backlog = 240 Stk
4. Teste Zeitperioden-Schalter (Tag/KW/Monat)
5. Verifiziere min-height der Tabellen (600px)
