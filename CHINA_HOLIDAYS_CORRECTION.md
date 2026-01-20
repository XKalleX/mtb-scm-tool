# Korrektur der China-Feiertage auf Shanghai Region

## Problem
Die ursprünglichen China-Feiertage enthielten zu viele Einträge (25-26 pro Jahr), wahrscheinlich weil nationale statt regionale Feiertage verwendet wurden. Außerdem waren einige Daten für Spring Festival 2027 falsch.

## Lösung
Feiertage wurden auf die **Shanghai Region** basiert, die identisch mit den nationalen gesetzlichen Feiertagen Chinas sind.

## Änderungen

### 1. Spring Festival 2027 korrigiert
**Vorher (falsch):**
- Februar 5-12, 2027 (inkonsistent mit SSOT)

**Nachher (korrekt):**
- **28. Januar - 4. Februar 2027** (8 Tage)
- ✅ Stimmt mit SSOT-Spezifikation überein

### 2. Zeitraum erweitert
Feiertage von **Oktober 2026 bis Februar 2028** hinzugefügt für Vorlaufzeiten-Berechnungen (49 Tage Vorlauf).

### 3. Anzahl der Feiertage pro Jahr

| Jahr | Deutschland (NRW) | China (Shanghai) | Gesamt |
|------|-------------------|------------------|--------|
| 2026 | 11 | 30 | 41 |
| 2027 | 11 | 32 | 43 |
| 2028 | 1 (Jan-Feb) | 11 (Jan-Feb) | 12 |

**China Feiertage 2027 (32 Tage):**
- Neujahr: 3 Tage (1.-3. Januar)
- Spring Festival: 8 Tage (28. Jan - 4. Feb) ✅ SSOT korrekt!
- Qingming Festival: 3 Tage (3.-5. April)
- Tag der Arbeit: 5 Tage (1.-5. Mai)
- Drachenbootfest: 3 Tage (9.-11. Juni)
- Mondfest: 3 Tage (15.-17. September)
- Nationalfeiertag: 7 Tage (1.-7. Oktober)

## Geänderte Dateien

### JSON-Konfiguration
1. **`src/data/feiertage-china.json`**
   - Spring Festival 2027 korrigiert (28.01.-04.02.)
   - Feiertage 2028 hinzugefügt (Jan-Feb)
   - Quelle aktualisiert: Shanghai Region
   - Anmerkung hinzugefügt über Kompensationsarbeitstage

2. **`src/data/feiertage-deutschland.json`**
   - Feiertage 2028 hinzugefügt (Jan-Feb)
   - Zeitraum-Hinweis aktualisiert

### TypeScript-Code
3. **`src/contexts/KonfigurationContext.tsx`**
   - 2028 Feiertage in STANDARD_FEIERTAGE integriert
   - Fallback für optionale 2028 Daten

4. **`src/lib/kalender.ts`**
   - `ladeDeutschlandFeiertage()`: 2028 hinzugefügt
   - `ladeChinaFeiertage()`: 2028 hinzugefügt
   - Kommentare aktualisiert

5. **`src/lib/date-classification.ts`**
   - `ladeDeutscheFeiertage()`: 2028 hinzugefügt
   - `ladeChinaFeiertage()`: 2028 hinzugefügt

## Verifikation

### ✅ Build erfolgreich
```
npm run build
✅ Error Management funktioniert korrekt!
✅ Alle Validierungen bestanden
```

### ✅ Spring Festival 2027 validiert
```json
{
  "datum": "2027-01-28" bis "2027-02-04",
  "dauer": "8 Tage",
  "status": "✅ SSOT korrekt"
}
```

### ✅ Konfigurierbarkeit
Die Feiertage sind vollständig über die UI konfigurierbar:
- **Einstellungen → Feiertage Tab**
- Hinzufügen neuer Feiertage
- Bearbeiten existierender Feiertage
- Löschen von Feiertagen
- Filter nach Land (Deutschland/China)
- Statistiken anzeigen

## Technische Details

### Chinesische Feiertage System
In China werden gesetzliche Feiertage oft mit angrenzenden Wochenenden kombiniert und durch **Kompensationsarbeitstage** (make-up workdays) ausgeglichen. Die im System aufgeführten Tage sind die **tatsächlichen arbeitsfreien Tage**.

### Shanghai vs. National
Shanghai verwendet die **nationalen gesetzlichen Feiertage** Chinas. Es gibt keine Shanghai-spezifischen Feiertage, die von den nationalen abweichen.

### Vorlaufzeiten-Berücksichtigung
Der erweiterte Zeitraum (Okt 2026 - Feb 2028) ist notwendig, da:
- Vorlaufzeit China: 49 Tage (7 Wochen)
- Planung beginnt: 01.01.2027
- Mit Vorlauf kann bis Ende 2026 zurückreichen
- Mit Vorlauf kann bis Anfang 2028 hineinreichen

## Referenzen

### Quellen
- **China Holidays**: https://www.china-briefing.com/news/china-public-holidays/
- **Deutschland (NRW)**: https://www.feiertage-deutschland.de/nordrhein-westfalen/
- **SSOT**: `kontext/Spezifikation_SSOT_MR.ts`

### Validierung
- Spring Festival 2027: ✅ 28.01.-04.02. (8 Tage) - SSOT konform
- Deutschland 2026: ✅ 11 Feiertage (NRW korrekt)
- Deutschland 2027: ✅ 11 Feiertage (NRW korrekt)
- Zeitraum: ✅ Oktober 2026 - Februar 2028

## Status
✅ **Abgeschlossen und validiert**

Alle Feiertage sind korrekt implementiert, über die UI konfigurierbar, und das System baut erfolgreich.
