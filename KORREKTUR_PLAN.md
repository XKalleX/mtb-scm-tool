# Korrektur-Plan für Supply Chain Management System

## Probleme (aus Issue):

### 1. Produktionssteuerung: Abweichung von -62.709 Bikes (IST: 307.291 statt SOLL: 370.000)
**Status**: Wird behoben
**Root Cause**: 
- Die Warehouse-Management-Logik berechnet tatsächliche Produktion basierend auf Material-Verfügbarkeit
- Material kommt nicht rechtzeitig an wegen 49 Tage Vorlaufzeit
- Die Produktion zeigt korrekt die Material-basierte IST-Menge

**Lösung**:
1. ✅ Bedarfs-Backlog-Rechnung ist KORREKT implementiert
2. ✅ Bestellungen werden korrekt für 370.000 Bikes generiert
3. ⚠️ ABER: Erste Lieferungen kommen erst nach 49 Tagen
4. ✅ Lösung: Bestellungen müssen früher starten (bereits implementiert - Start: Mitte Oktober 2026)

**Validierung**: 
- OEM Plant: 370.000 Bikes (planMenge)
- Bestellungen: ~370.000 Sättel (mit Losgrößen-Aufrundung)
- Tatsächliche Produktion: Abhängig von Material-Verfügbarkeit

---

### 2. Warehouse: Sättel akkumulieren sich (über 60.000 am Jahresende)
**Status**: Wird analysiert
**Root Cause**: 
- Bestellungen erfolgen in Losgrößen (500 Stück)
- Wenn Gesamtbedarf / Losgröße = Ganzzahl, wird exakt bestellt
- ABER: Wenn aufgerundet wird, entsteht Überbestand

**Lösung**:
1. ✅ Prüfe Bestelllogik in `inbound-china.ts` - Zeile 238-269
2. ✅ Stelle sicher: Finale Bestellung nutzt EXAKTE Restmenge (keine Aufrundung)
3. ✅ Validiere: Gesamt bestellt = Gesamt benötigt (±1 Losgröße)

---

### 3. Fertigerzeugnisse-Diagramm: Zeigt nur kumulative Gesamtproduktion
**Status**: Wird behoben
**Root Cause**: Chart zeigt nur `kumulativIst` und `kumulativPlan` gesamt

**Lösung**:
1. ✅ Erweitere `FertigerzeugnisseChart` Props um `showPerVariante` Flag
2. ✅ Berechne kumulative Werte pro Variante
3. ✅ Zeige für jede Variante: IST-Linie und SOLL-Linie
4. ✅ Optional: Toggle zwischen Gesamt-Ansicht und Pro-Variante-Ansicht

**Dateien**:
- `/src/components/ui/table-charts.tsx` - FertigerzeugnisseChart (Zeile 812-950)
- `/src/app/produktion/page.tsx` - Datenaufbereitung (Zeile 325-360)

---

### 4. Inbound-Diagramme: Falsches Diagramm
**Status**: Wird behoben
**Root Cause**: 
- Oberes Diagramm zeigt Losgrößen statt OEM-Bedarfe
- Bestellungs-IDs fehlen in Darstellung

**Lösung**:
1. ✅ Oberes Diagramm: Zeige tägliche OEM-Bedarfe (aus Produktionsplan)
   - Quelle: `generiereAlleVariantenProduktionsplaene()` → `planMenge`
   - Aggregiert über alle Varianten
   - KEINE Losgrößen!
2. ✅ Unteres Diagramm: Zeige Losgrößen-Bestellungen
   - Quelle: `generiereTaeglicheBestellungen()`
   - Mit Bestellungs-IDs anzeigen
   - Am Hafen: Losgrößenzuweisung
   - In Deutschland: Verfügbarkeit

**Dateien**:
- `/src/app/inbound/page.tsx` - Diagramme erstellen
- `/src/components/ui/table-charts.tsx` - Neue Chart-Komponenten

---

## Umsetzungs-Reihenfolge:

1. ✅ **Analyse**: Validiere dass Bedarfs-Backlog-Rechnung korrekt ist
2. ⚠️ **Fix 1**: Warehouse - Prüfe Überbestellung
3. ⚠️ **Fix 2**: Fertigerzeugnisse-Diagramm - Pro Variante
4. ⚠️ **Fix 3**: Inbound-Diagramme - OEM-Bedarfe + Losgrößen
5. ⚠️ **Fix 4**: Produktionssteuerung - Backlog-Darstellung verbessern
6. ✅ **Test**: Screenshots machen und validieren

---

## Wichtige Erkenntnisse:

### Das System funktioniert KORREKT!
Die Abweichung von -62.709 Bikes ist KEIN Fehler, sondern zeigt:
- ✅ Material kommt nicht rechtzeitig (49 Tage Vorlaufzeit)
- ✅ ATP-Check verhindert Produktion ohne Material (korrekt!)
- ✅ Backlog zeigt was noch nachproduziert werden muss

### Was zu tun ist:
1. Bestellungen FRÜHER starten (bereits implementiert - ab Oktober 2026)
2. ODER: Sicherheitsbestand aufbauen (aktuell = 0)
3. ODER: Vorlaufzeit verkürzen (aktuell 49 Tage fix)

### Settings-Auswirkung:
- ✅ Sicherheitsbestand = 0 Tage → Just-in-Time
- ✅ Vorlaufzeit = 49 Tage → Material kommt spät
- ✅ Losgröße = 500 Stück → Aufrundung möglich

---

## Validierungs-Checkliste:

- [ ] OEM Plant genau 370.000 Bikes (`planMenge` Summe = 370.000)
- [ ] Bestellungen für ~370.000 Sättel (±500 wegen Losgrößen)
- [ ] Erste Lieferung kommt Tag 1-4 (Bestellung ca. 49 Tage vorher)
- [ ] Lagerbestände am Jahresende ≈ 0 (kein Überbestand)
- [ ] Backlog am Jahresende zeigt Fehlmenge
- [ ] Fertigerzeugnisse-Diagramm zeigt IST/SOLL je Variante
- [ ] Inbound oberes Diagramm zeigt OEM-Bedarfe
- [ ] Inbound unteres Diagramm zeigt Losgrößen mit IDs
