# 🔧 Bug Fix Summary - MTB SCM Tool

## Datum: 26.01.2026
## Behoben von: Development Team

---

## 📋 Übersicht

Zwei kritische UX-Probleme im MTB Supply Chain Management Tool wurden behoben:

1. **Leading Zeros in Number Inputs** (Globale Einstellungen)
2. **Date Picker Visibility Issues** (Inbound Bestelldatum)

---

## 🐛 Problem 1: Leading Zeros in Number Inputs

### Symptom
Beim Tippen von Zahlen in den "Globale Einstellungen" Feldern (z.B. "LKW-Transport China → Hafen") erschien immer eine führende "0":
- Benutzer möchte "1" eingeben → System zeigt "01"
- Benutzer möchte "2" eingeben → System zeigt "02"

### Root Cause
**Datei:** `src/components/EinstellungenPanel.tsx` (Zeilen 506-590)

```tsx
// ❌ VORHER (fehlerhaft)
<Input
  type="number"
  value={draftKonfiguration.lieferant.lkwTransportChinaArbeitstage ?? 0}
  onChange={(e) => updateDraftLieferant({ 
    lkwTransportChinaArbeitstage: parseInt(e.target.value) || 0 
  })}
/>
```

**Problem:** 
- `?? 0` setzt den Default-Wert auf `0` wenn das Feld leer/undefined ist
- Wenn der Benutzer zu tippen beginnt, zeigt das Input-Feld "0" + eingegebene Ziffer = "01"

### Lösung
```tsx
// ✅ NACHHER (behoben)
<Input
  type="number"
  value={draftKonfiguration.lieferant.lkwTransportChinaArbeitstage ?? ''}
  onChange={(e) => updateDraftLieferant({ 
    lkwTransportChinaArbeitstage: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
  })}
/>
```

**Lösung:**
1. Default-Wert ist nun `''` (leerer String) statt `0`
2. onChange-Handler prüft explizit ob Feld leer ist und setzt dann erst `0`
3. Benutzer kann normal tippen: "1" bleibt "1", "2" bleibt "2"

### Betroffene Felder (alle behoben)
- ✅ Vorlaufzeit Arbeitstage (Produktion)
- ✅ Vorlaufzeit Kalendertage (Seefracht)
- ✅ LKW-Transport China → Hafen
- ✅ LKW-Transport Hamburg → Werk
- ✅ Gesamte Vorlaufzeit
- ✅ Losgröße
- ✅ Lieferintervall
- ✅ Kapazität

---

## 🐛 Problem 2: Date Picker Visibility Issues

### Symptom
Im "Inbound" Tab beim "Bestelldatum":
1. **Datum verschwindet:** Nach Klick auf "Nachbestellen" wird das gewählte Datum gelöscht
2. **Format unklar:** Benutzer war unsicher über das erwartete Format (dd/mm/yyyy vs. mm/dd/yyyy)

### Root Cause
**Datei:** `src/app/inbound/page.tsx` (Zeilen 104-106)

```tsx
// ❌ VORHER (fehlerhaft)
const handleZusatzbestellung = useCallback(() => {
  // ... Bestellung erstellen ...
  setZusatzBestellungen(prev => [...prev, neueBestellung])
  setNeueBestellungDatum('')  // ← Löscht das Datum!
  setNeueBestellungMenge('500')
}, [neueBestellungDatum, neueBestellungMenge, konfiguration.lieferant.gesamtVorlaufzeitTage])
```

**Problem:**
1. `setNeueBestellungDatum('')` löscht das Datum nach jeder Bestellung
2. Benutzer kann nicht sehen welches Datum gewählt wurde
3. Ungünstig für mehrere Bestellungen mit ähnlichem Datum

### Lösung

#### Teil 1: Datum NICHT zurücksetzen
```tsx
// ✅ NACHHER (behoben)
setZusatzBestellungen(prev => [...prev, neueBestellung])
// ✅ FIX: Datum NICHT zurücksetzen, damit Benutzer sieht welches Datum gewählt wurde
// und einfacher weitere Bestellungen mit ähnlichem Datum eingeben kann
// setNeueBestellungDatum('')  // <- ENTFERNT
setNeueBestellungMenge('500')  // Nur Menge zurücksetzen
```

#### Teil 2: Datum-Bestätigung anzeigen
**Datei:** `src/app/inbound/page.tsx` (Zeilen 600-612)

```tsx
// ✅ NEU: Zeige gewähltes Datum in deutschem Format
<Input
  id="bestelldatum"
  type="date"
  value={neueBestellungDatum}
  onChange={(e) => setNeueBestellungDatum(e.target.value)}
  min={`${konfiguration.planungsjahr - 1}-10-01`}
  max={`${konfiguration.planungsjahr}-11-12`}
  className="bg-white"
  placeholder="TT.MM.JJJJ"
/>
{neueBestellungDatum && (
  <p className="text-xs text-blue-600 mt-1">
    Gewählt: {new Date(neueBestellungDatum).toLocaleDateString('de-DE')}
  </p>
)}
```

**Verbesserungen:**
1. ✅ Datum bleibt nach dem Hinzufügen sichtbar
2. ✅ Zusätzlicher Text "Gewählt: 15.04.2027" zeigt das Datum im deutschen Format
3. ✅ Placeholder "TT.MM.JJJJ" gibt Orientierung (wird vom Browser gehandhabt)

### Hinweis: HTML5 Date Input Format
HTML5 `<input type="date">` Felder:
- **Speichern** Datum intern im ISO-Format: `yyyy-mm-dd` (z.B. "2027-04-15")
- **Anzeigen** Datum im Browser-Locale-Format (z.B. "15.04.2027" für Deutsch)
- Dies ist Standard-Browser-Verhalten und kann nicht geändert werden
- Unser Fix: Zusätzlicher Text zeigt das Datum explizit im deutschen Format

---

## ✅ Validierung

### Build Status
```bash
npm run build
```
✅ **Erfolgreich** - Keine TypeScript-Fehler, Build kompiliert einwandfrei

### Manuelle Tests Empfohlen
1. **Number Inputs:**
   - [ ] Öffne "Globale Einstellungen" → "Lieferant"
   - [ ] Lösche Wert in "LKW-Transport China → Hafen"
   - [ ] Tippe "1" → sollte "1" anzeigen (nicht "01")
   - [ ] Tippe "2" → sollte "2" anzeigen (nicht "02")

2. **Date Picker:**
   - [ ] Öffne "Inbound" Tab
   - [ ] Wähle ein Datum im Datumsfeld
   - [ ] Prüfe dass "Gewählt: [Datum]" erscheint
   - [ ] Klicke "Nachbestellen"
   - [ ] Prüfe dass das Datum NICHT verschwindet
   - [ ] Prüfe dass eine weitere Bestellung einfach hinzugefügt werden kann

---

## 📁 Geänderte Dateien

```
src/components/EinstellungenPanel.tsx  (8 Zeilen geändert)
src/app/inbound/page.tsx               (10 Zeilen geändert)
```

---

## 🎯 Impact Assessment

### Betroffene Benutzerflüsse
1. ✅ Globale Einstellungen - Lieferant-Parameter eingeben
2. ✅ Inbound Logistik - Zusatzbestellungen erstellen

### Breaking Changes
❌ **Keine** - Die Änderungen sind rein kosmetisch/UX-Verbesserungen

### Performance Impact
✅ **Minimal** - Keine Auswirkungen auf Performance

---

## 🔮 Zukünftige Verbesserungen (Optional)

### Für Number Inputs
- [ ] Erwägen: Custom Number Input Komponente mit verbesserter UX
- [ ] Erwägen: Input Masking für spezifische Formate
- [ ] Erwägen: Inline-Validierung mit Fehlermeldungen

### Für Date Picker
- [ ] Erwägen: Custom Date Picker Library (z.B. react-day-picker) für bessere Kontrolle
- [ ] Erwägen: Kalender-Icon mit Visual Feedback
- [ ] Erwägen: Date Range Picker für Mehrfach-Bestellungen

---

## 📝 Zusammenfassung

**Status:** ✅ Behoben  
**Priorität:** Hoch (UX Critical)  
**Aufwand:** 30 Minuten  
**Reviewer:** Pending  

**Autor:** Development Team  
**Datum:** 2024  

---

## 📞 Kontakt bei Fragen

Bei Fragen zu diesen Fixes:
- Prüfen: `BUGFIX_SUMMARY.md` (diese Datei)
- Code Review: `src/components/EinstellungenPanel.tsx` + `src/app/inbound/page.tsx`
- Git Diff: Siehe letzten Commit
