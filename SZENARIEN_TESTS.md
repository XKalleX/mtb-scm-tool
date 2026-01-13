# Szenarien Tests - Dokumentation

## Übersicht

Die Szenario-Tests validieren die korrekte Funktionsweise aller 4 Szenario-Typen und deren globale Wirksamkeit im System.

## Test-Datei

`src/__tests__/szenarien.test.ts`

## Wie Tests ausführen

### Option 1: Im Browser (Empfohlen für Entwicklung)

1. Starten Sie den Dev-Server: `npm run dev`
2. Öffnen Sie die Browser-Konsole (F12)
3. Importieren und führen Sie die Tests aus:

```javascript
// In Browser-Konsole
import tests from './src/__tests__/szenarien.test.ts'
tests.runAll()
```

### Option 2: Manuelle Tests über UI

1. Starten Sie die Anwendung
2. Klicken Sie auf den grünen Floating Button (unten rechts)
3. Fügen Sie verschiedene Szenarien hinzu
4. Überprüfen Sie, ob:
   - Banner auf allen Seiten erscheint
   - Berechnungen sich ändern
   - Metriken korrekt aktualisiert werden

## Test-Szenarien

### Test 1: Marketingaktion (Einzelszenario)

**Parameter:**
- Start KW: 28
- Dauer: 4 Wochen
- Erhöhung: 20%

**Erwartetes Verhalten:**
- ✅ Produktionsmenge steigt um ~1,5% (4/52 Wochen * 20%)
- ✅ Materialverfügbarkeit sinkt (erhöhte Belastung)
- ✅ Auslastung steigt

### Test 2: Maschinenausfall (Einzelszenario)

**Parameter:**
- Start: 15.03.2027
- Dauer: 7 Tage
- Reduktion: 60%

**Erwartetes Verhalten:**
- ✅ Produktionsmenge sinkt
- ✅ Materialverfügbarkeit sinkt deutlich
- ✅ Liefertreue sinkt
- ✅ Planerfüllungsgrad sinkt

### Test 3: Wasserschaden (Einzelszenario)

**Parameter:**
- Datum: 20.02.2027
- Verlustmenge: 1000 Teile
- Betroffene Teile: Gemischte Komponenten

**Erwartetes Verhalten:**
- ✅ Materialverfügbarkeit sinkt
- ✅ Liefertreue sinkt
- ✅ Lagerumschlag sinkt

### Test 4: Schiffsverspätung (Einzelszenario)

**Parameter:**
- Ursprüngliche Ankunft: 16.02.2027
- Verspätung: 4 Tage
- Neue Ankunft: 20.02.2027

**Erwartetes Verhalten:**
- ✅ Durchlaufzeit steigt um 4 Tage
- ✅ Liefertreue sinkt
- ✅ Materialverfügbarkeit sinkt leicht

### Test 5: Kombinierte Szenarien

**Szenarien:**
1. Marketingaktion (+20%, 4 Wochen)
2. Maschinenausfall (-40%, 5 Tage)

**Erwartetes Verhalten:**
- ✅ Beide Effekte sind sichtbar
- ✅ Materialverfügbarkeit stark beeinträchtigt (Ausfall-Dominanz)
- ✅ Produktionsmenge kann steigen oder sinken (abhängig von Dominanz)

### Test 6: Baseline (Keine Szenarien)

**Parameter:**
- Keine Szenarien aktiv

**Erwartetes Verhalten:**
- ✅ Alle Werte = Baseline
- ✅ Delta = 0
- ✅ Keine Änderungen gegenüber Standard

## Validierungskriterien

### ✅ Korrektheit der Berechnungen

- [x] Marketingaktion erhöht Produktion proportional
- [x] Maschinenausfall reduziert Material und Produktion
- [x] Wasserschaden reduziert Material sofort
- [x] Schiffsverspätung erhöht Durchlaufzeit korrekt
- [x] Kombinierte Szenarien wirken kumulativ
- [x] Ohne Szenarien = Baseline-Werte

### ✅ Globale Wirksamkeit

- [x] Banner erscheint auf allen Seiten
- [x] Dashboard zeigt Szenario-Effekte
- [x] OEM Programm (Warnung vorhanden, vollständige Integration geplant)
- [x] Inbound zeigt Auswirkungen
- [x] Produktion zeigt Auswirkungen
- [x] Reporting zeigt Live-Berechnungen mit Szenarien

### ✅ JSON-Standardwerte

- [x] Sidebar lädt Werte aus `szenario-defaults.json`
- [x] Alle Parameter sind editierbar
- [x] Keine hardcodierten Werte in Komponenten

### ✅ UI/UX

- [x] Szenarien nur über Sidebar erreichbar
- [x] Keine separate Szenarien-Seite mehr
- [x] Floating Button immer sichtbar
- [x] Banner zeigt aktive Szenarien klar

## Manuelle Test-Checkliste

### Vorbereitung
- [ ] App gestartet (`npm run dev`)
- [ ] Browser geöffnet (http://localhost:3000)
- [ ] Konsole geöffnet (F12)

### Test-Durchführung

#### 1. Baseline-Zustand
- [ ] Dashboard öffnen
- [ ] Produktionsmenge notieren: ___________
- [ ] Materialverfügbarkeit notieren: ___________
- [ ] Liefertreue notieren: ___________
- [ ] Kein Banner sichtbar ✓

#### 2. Marketingaktion hinzufügen
- [ ] Grünen Floating Button klicken
- [ ] "Marketingaktion" auswählen
- [ ] Standardwerte prüfen (vorausgefüllt)
- [ ] Werte beliebig ändern (z.B. 25% statt 20%)
- [ ] Hinzufügen klicken
- [ ] Banner erscheint auf Dashboard ✓
- [ ] Zur Reporting-Seite navigieren
- [ ] Banner auch dort sichtbar ✓
- [ ] Metriken haben sich geändert ✓

#### 3. Maschinenausfall hinzufügen
- [ ] Zweites Szenario hinzufügen
- [ ] Banner zeigt "2 aktive Szenarien" ✓
- [ ] Alle Seiten durchgehen:
  - [ ] Dashboard - Banner ✓
  - [ ] OEM Programm - Banner ✓
  - [ ] Inbound - Banner ✓
  - [ ] Produktion - Banner ✓
  - [ ] Reporting - Banner mit Details ✓

#### 4. Szenarien entfernen
- [ ] Sidebar öffnen
- [ ] Erstes Szenario löschen
- [ ] Banner zeigt "1 aktives Szenario" ✓
- [ ] Alle löschen
- [ ] Banner verschwindet ✓
- [ ] Werte zurück auf Baseline ✓

#### 5. JSON-Werte testen
- [ ] `src/data/szenario-defaults.json` öffnen
- [ ] Wert ändern (z.B. startKW: 30)
- [ ] App neu laden
- [ ] Sidebar öffnen, Marketingaktion wählen
- [ ] Neuer Standardwert wird angezeigt ✓

## Ergebnis

**Datum:** _____________  
**Tester:** _____________

**Alle Tests bestanden:** ☐ Ja  ☐ Nein

**Anmerkungen:**
```
_________________________________________________
_________________________________________________
_________________________________________________
```

## Bekannte Einschränkungen

### OEM Programm - Szenarien-Integration
Die OEM Programm-Seite zeigt aktuell eine Warnung, dass Szenarien noch nicht vollständig in die tagesgenaue Produktionsplanung integriert sind. Dies ist eine zukünftige Erweiterung und betrifft nicht die globale Wirksamkeit auf Metriken-Ebene.

**Status:** Orange Warning-Box vorhanden ✓  
**Geplant:** Vollständige Integration in zukünftiger Version

### Performance
Bei sehr vielen gleichzeitigen Szenarien (>10) kann die Berechnung leicht verzögert sein. Dies ist normal und hat keine Auswirkung auf die Korrektheit.

## Troubleshooting

### Banner erscheint nicht
1. Browser-Cache leeren (Strg+Shift+R)
2. Prüfen ob Szenarien wirklich "aktiv" sind (Sidebar)
3. localStorage prüfen: `localStorage.getItem('mtb-szenarien')`

### Berechnungen ändern sich nicht
1. Szenarien in Context prüfen
2. Browser-Konsole auf Fehler prüfen
3. Re-Build durchführen: `npm run build`

### JSON-Werte werden nicht geladen
1. JSON-Syntax prüfen (validator.json.org)
2. Import in Komponente prüfen
3. TypeScript-Fehler im Build prüfen

## Weiterführende Informationen

- Spezifikation: `kontext/Spezifikation_SSOT_MR.ts`
- Berechnungen: `src/lib/calculations/supply-chain-metrics.ts`
- Context: `src/contexts/SzenarienContext.tsx`
- Sidebar: `src/components/SzenarienSidebar.tsx`
- Banner: `src/components/ActiveScenarioBanner.tsx`
- JSON: `src/data/szenario-defaults.json`

---

**HAW Hamburg WI3 Projekt - MTB Supply Chain Management 2027**  
Team: Pascal Wagner, Da Yeon Kang, Shauna Ré Erfurth, Taha Wischmann
