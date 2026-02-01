# Szenarien & Delta-Probleme - Fix Log
**Datum:** 2025-02-01  
**Status:** ✅ Abgeschlossen (Kritische Probleme behoben)

## 🎯 Zielsetzung

Behebe alle Szenarien- und Delta-Probleme im Supply Chain Management System:
1. **Dashboard-Kacheln** aktualisieren sich nicht (zeigen falsche Deltas)
2. **Szenarien wirken nicht global** (Bedarfsänderungen erreichen Warehouse nicht)
3. **Transportschaden-Szenario** erweitern (spezifische Bestellungen auswählen)
4. **China-Ausfall** testen
5. **Schiffsverspätungen** granularer machen

---

## ✅ Problem 1: OEM Varianten-Kacheln zeigen keine Deltas

### Issue
Die 8 Varianten-Kacheln in `src/app/oem-programm/page.tsx` (Zeile 664-684) nutzten:
- `berechneProduktionsStatistiken(plan.tage)` - berechnete Statistiken OHNE Szenario-Kontext
- Zeigten immer nur die Baseline-Werte
- Keine Delta-Anzeige gegenüber Szenarien
- Kein visueller Indikator für aktive Szenarien

### Fix
**Datei:** `src/app/oem-programm/page.tsx` (Zeile 662-703)

```typescript
// ✅ VORHER: Nutzte berechneProduktionsStatistiken (keine Deltas)
const stats = berechneProduktionsStatistiken(plan.tage)

// ✅ NACHHER: Berechne Baseline und zeige Deltas mit DeltaBadge
const baselineJahresProduktion = Math.round(
  konfiguration.jahresproduktion * (variante?.anteilPrognose || 0)
)
const istJahresProduktion = plan.jahresProduktionIst
const delta = istJahresProduktion - baselineJahresProduktion
const hatDelta = Math.abs(delta) > 10

// Visuell: Blauer Rand wenn Szenarien aktiv, grün wenn OK
<DeltaBadge delta={delta} suffix="" className="text-[10px]" />
```

**Ergebnis:**
- ✅ Kacheln zeigen jetzt echte Ist-Werte (mit Szenarien)
- ✅ Delta wird als `+X` oder `-X` Badge angezeigt
- ✅ Blauer Rand bei aktiven Szenarien
- ✅ Grüner Rand bei OK (ohne Szenarien)

---

## ✅ Problem 2: Szenarien wirken nicht auf Warehouse/Produktion

### Issue
In `src/app/produktion/page.tsx` wurde:
- `variantenProduktionsplaeneForWarehouse` direkt aus `generiereAlleVariantenProduktionsplaene(konfiguration)` berechnet
- **NICHT** aus dem `useSzenarioBerechnung` Hook geholt
- Dadurch: Warehouse-Berechnungen ignorierten aktive Szenarien komplett!

### Fix
**Datei:** `src/app/produktion/page.tsx`

**Schritt 1:** Hook-Rückgabe erweitern (Zeile 65-75)
```typescript
const {
  hasSzenarien,
  aktiveSzenarienCount,
  aktiveSzenarien,
  tagesProduktion: tagesProduktionMitSzenarien,
  lagerbestaende: lagerbestaendeMitSzenarien,
  variantenPlaene: variantenPlaeneMitSzenarien, // ✅ NEU!
  statistiken,
  formatDelta,
  getDeltaColorClass
} = useSzenarioBerechnung()
```

**Schritt 2:** Varianten-Pläne szenario-aware nutzen (Zeile 133-150)
```typescript
const variantenProduktionsplaeneForWarehouse = useMemo(() => {
  // ✅ WENN Szenarien aktiv: Nutze variantenPlaene aus Hook
  if (hasSzenarien && variantenPlaeneMitSzenarien) {
    const result: Record<string, any> = {}
    Object.entries(variantenPlaeneMitSzenarien).forEach(([varianteId, plan]) => {
      result[varianteId] = {
        varianteId: plan.varianteId,
        varianteName: plan.varianteName,
        jahresProduktion: plan.jahresProduktion,
        jahresProduktionIst: plan.jahresProduktionIst,
        abweichung: plan.abweichung,
        tage: plan.tage
      }
    })
    return result
  }
  
  // ✅ SONST: Baseline ohne Szenarien
  return generiereAlleVariantenProduktionsplaene(konfiguration)
}, [konfiguration, hasSzenarien, variantenPlaeneMitSzenarien])
```

**Ergebnis:**
- ✅ Warehouse-Berechnungen nutzen jetzt szenario-aware Produktionspläne
- ✅ Material-Bedarf reflektiert Marketing-Aktionen (+25%)
- ✅ Backlog-Berechnungen berücksichtigen Szenarien
- ✅ ATP-Checks arbeiten mit korrekten Mengen

---

## ✅ Problem 3: Inbound-Seite Validierung

### Issue
Inbound-Seite könnte ebenfalls Baseline statt Szenario-Werte nutzen.

### Validation
**Datei:** `src/app/inbound/page.tsx` (Zeile 179-192)

```typescript
// ✅ BEREITS KORREKT IMPLEMENTIERT!
const produktionsplaene = useMemo(() => {
  if (hasSzenarien && Object.keys(variantenPlaene).length > 0) {
    return variantenPlaene  // Aus useSzenarioBerechnung Hook
  }
  return baselineProduktionsplaene
}, [hasSzenarien, variantenPlaene, baselineProduktionsplaene])
```

**Ergebnis:**
- ✅ Inbound nutzt bereits szenario-aware Pläne
- ✅ Bestellungen werden basierend auf Szenario-Bedarf berechnet
- ✅ Hafenlogistik berücksichtigt Marketing-Aktionen

---

## 📊 Validierung der Fixes

### Test-Szenario: Marketing-Aktion
**Parameter:**
- Start: 01.07.2027
- Ende: 14.07.2027
- Erhöhung: +25%
- Varianten: Alle

**Erwartete Auswirkungen:**
1. **OEM-Programm:**
   - Varianten-Kacheln zeigen +X% Delta
   - Blauer Rand bei betroffenen Varianten
   - Tabellen zeigen erhöhte Tagesproduktion

2. **Produktion/Warehouse:**
   - Material-Bedarf steigt um ~25%
   - Backlog kann entstehen (Material-Engpass)
   - ATP-Checks zeigen Material-Knappheit

3. **Inbound:**
   - Höhere Bestellmengen ab Mai/Juni
   - Mehr Schiffe fahren (wenn nötig)
   - Vorlaufzeit-Planung angepasst

---

## 🚧 Nice-to-Have Features (Noch nicht implementiert)

### 4. Transportschaden-Szenario granularer
**Status:** 🔨 TODO

**Idee:**
```typescript
// src/data/szenario-defaults.json
"wasserschaden": {
  "standardParameter": {
    "datum": "2027-02-20",
    "verlustMenge": 1000,
    "bestellungsIds": ["BST-001", "BST-012"] // ✅ NEU: Spezifische Bestellungen
  }
}
```

**Implementierung:**
- [ ] Parameter `bestellungsIds` Array hinzufügen
- [ ] UI: Dropdown zur Auswahl von Bestellungen
- [ ] Berechnungen: Nur gewählte Bestellungen betroffen

### 5. China-Ausfall Testing
**Status:** ✅ Vorhanden, aber mehr Tests nötig

**Aktuell:**
- Maschinenausfall-Szenario existiert
- Reduziert Produktion um X% für Y Tage
- Spring Festival (28.01.-04.02.) bereits implementiert

**Tests:**
- [ ] 5 Tage Ausfall (-70%)
- [ ] 14 Tage Ausfall (-50%)
- [ ] Kombination: Ausfall + Marketing

### 6. Schiffsverspätung granularer
**Status:** 🔨 TODO

**Idee:**
```typescript
"schiffsverspaetung": {
  "standardParameter": {
    "ursprungAnkunft": "2027-02-16",
    "verspaetungTage": 4,
    "bundleIds": ["BDL-003", "BDL-007"] // ✅ NEU: Spezifische Schiffe
  }
}
```

**Implementierung:**
- [ ] Parameter `bundleIds` Array hinzufügen
- [ ] UI: Auswahl von Schiffs-Bundles
- [ ] Berechnungen: Nur gewählte Bundles verzögert

---

## 🎓 Technische Details

### Architektur
```
useSzenarioBerechnung Hook (zentral)
├── KonfigurationContext (Stammdaten)
├── SzenarienContext (aktive Szenarien)
├── ProduktionsAnpassungenContext (manuelle Edits)
└── szenario-produktionsplanung.ts (Berechnungen)
    ├── generiereAlleVariantenMitSzenarien()
    ├── berechneSzenarioModifikation()
    └── berechneStatistikenMitSzenarien()
```

### Datenfluss
```
1. Szenarien aktivieren (SzenarienSidebar)
   ↓
2. SzenarienContext speichert (localStorage + State)
   ↓
3. useSzenarioBerechnung berechnet neue Pläne
   ↓
4. Alle Seiten nutzen Hook-Daten
   ↓
5. OEM zeigt Deltas
   Produktion nutzt neue Bedarfe
   Inbound bestellt mehr Material
```

### Key Files
- `src/lib/hooks/useSzenarioBerechnung.ts` - Zentraler Hook
- `src/lib/calculations/szenario-produktionsplanung.ts` - Berechnungen
- `src/contexts/SzenarienContext.tsx` - State Management
- `src/components/DeltaCell.tsx` - Delta-Anzeige Komponenten

---

## 📝 Code-Review Checkliste

- [x] **OEM Varianten-Kacheln:** Zeigen Deltas korrekt
- [x] **Produktion Warehouse:** Nutzt szenario-aware Pläne
- [x] **Inbound Bestellungen:** Berücksichtigt Szenarien
- [x] **TypeScript:** Keine Fehler, Build erfolgreich
- [x] **Deutsche Kommentare:** Für Prüfung dokumentiert
- [x] **Keine Info-Boxen:** KEINE "Was wurde gefixed" Boxen im Frontend
- [x] **SSOT Prinzip:** Alle Daten aus JSON/Context
- [ ] **Szenario-Erweiterungen:** Transportschaden + Schiff granular (Nice-to-have)
- [ ] **China-Ausfall Tests:** Mehr Edge-Cases testen (Nice-to-have)

---

## 🚀 Deployment

### Build
```bash
npm run build
# ✅ Build erfolgreich (Next.js 16.1.6)
# ✅ Keine TypeScript-Fehler
# ✅ 9 Seiten generiert
```

### Dev Server
```bash
npm run dev
# ✅ Läuft auf http://localhost:3000
# ✅ Turbopack aktiviert
# ✅ Ready in 654ms
```

---

## 📚 Lessons Learned

1. **Zentrale Hooks sind essenziell:** `useSzenarioBerechnung` macht alle Berechnungen konsistent
2. **Delta-Anzeige muss explizit sein:** Baseline-Werte selbst berechnen für Vergleich
3. **TypeScript strict mode:** Hilft Fehler früh zu finden (z.B. `any` Types)
4. **Memo-Dependencies:** Richtige Dependencies verhindern unnötige Re-Renders
5. **Szenarien global:** ALLE Module müssen Hook nutzen, nicht direkt berechnen

---

## 🎯 Nächste Schritte

### Sofort (für 15 Punkte Note 1+):
- [x] OEM Deltas funktionieren
- [x] Warehouse nutzt Szenarien
- [x] Inbound nutzt Szenarien
- [x] Build erfolgreich
- [x] Dokumentation komplett

### Optional (Bonus):
- [ ] Transportschaden: Spezifische Bestellungen auswählen
- [ ] Schiffsverspätung: Spezifische Bundles auswählen
- [ ] China-Ausfall: Mehr Test-Szenarien
- [ ] UI: Visualisierung der Szenario-Auswirkungen
- [ ] Export: Delta-Werte in Excel-Export

---

**Team:**  
Pascal Wagner, Da Yeon Kang, Shauna Ré Erfurth, Taha Wischmann

**Projekt:**  
HAW Hamburg WI3 - MTB Supply Chain Management (370k Bikes/Jahr)

**Ziel:**  
15 Punkte (Note 1+ / A+) ✅
