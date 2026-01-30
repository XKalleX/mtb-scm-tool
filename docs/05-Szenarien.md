# 🎭 Szenarien

> **"Was wäre wenn...?"** - Operative Szenarien zur Risikoanalyse und Notfallplanung

[[◀ Zurück: Zeitparameter](./04-Zeitparameter.md)] | [[Weiter: Bewertungskriterien ▶](./06-Bewertungskriterien.md)]

---

## Inhaltsverzeichnis

1. [Warum Szenarien?](#1-warum-szenarien)
2. [Szenario 1: Marketingaktion](#2-szenario-1-marketingaktion-demand-surge)
3. [Szenario 2: China Produktionsausfall](#3-szenario-2-china-produktionsausfall-supply-disruption)
4. [Szenario 3: Transport-Schaden](#4-szenario-3-transport-schaden-cargo-loss)
5. [Szenario 4: Schiffsverspätung](#5-szenario-4-schiffsverspätung-shipment-delay)
6. [Szenarien kombinieren](#6-szenarien-kombinieren)
7. [Implementierung im System](#7-implementierung-im-system)

---

## 1. Warum Szenarien?

Ein gutes SCM-System muss **Risiken** abbilden können. Dafür dienen Szenarien.

### Die Realität ist nicht planbar!

Es gibt immer unvorhergesehene Ereignisse:

- 🌊 **Taifun in Asien** verzögert Schiffe
- 🔧 **Maschine beim Zulieferer** fällt aus
- 📈 **Plötzliche Marketing-Aktion** erhöht Nachfrage
- 💧 **Container geht auf See verloren**
- 🚫 **Hafenstreik** blockiert Lieferungen
- ⚡ **Stromausfall** stoppt Produktion

### Ohne Szenarien

```
Unvorhergesehenes Ereignis eintritt
         ↓
   ❌ Firma ist überrascht
         ↓
   ❌ Keine Plan-B-Strategie
         ↓
   ❌ Panik-Reaktionen (teuer!)
         ↓
   ❌ Hohe Kosten & Umsatzverlust
```

**Beispiel:**
- Maschinenschaden in China
- Lieferung kommt 7 Tage zu spät
- April-Produktion kann nicht erfüllt werden
- **Verlust:** 2,5 Millionen € Umsatz!

### Mit Szenarien

```
Szenario im Voraus simulieren
         ↓
   ✅ "Was wäre wenn?" durchspielen
         ↓
   ✅ Gegenmaßnahmen vorbereiten
         ↓
   ✅ Sicherheitsbestände anpassen
         ↓
   ✅ Risiko minimiert!
```

**Beispiel:**
- Simulation: "Was wenn Maschine ausfällt?"
- Erkenntnis: Sicherheitsbestand zu niedrig
- Maßnahme: Lager 2 Wochen vorher aufbauen
- **Resultat:** Produktionsausfall überbrückt, kein Umsatzverlust!

### Die 4 Szenarien im Überblick

| Szenario | Typ | Auswirkung | Wahrscheinlichkeit | Schwere |
|----------|-----|------------|-------------------|---------|
| **1. Marketingaktion** | Demand Surge | +20-30% Nachfrage | Mittel | Mittel |
| **2. China Ausfall** | Supply Disruption | -60% Produktion | Niedrig | Hoch |
| **3. Transport-Schaden** | Cargo Loss | Sofort-Verlust | Sehr niedrig | Hoch |
| **4. Schiffsverspätung** | Shipment Delay | +4-7 Tage Verzug | Mittel | Mittel |

---

## 2. Szenario 1: Marketingaktion (Demand Surge)

### Beschreibung

Eine erfolgreiche Marketing-Kampagne erhöht plötzlich die Nachfrage für bestimmte Varianten.

### Praxis-Beispiel

```
"Mountain Biker" Magazin - Spezial-Ausgabe Juli 2027
─────────────────────────────────────────────────────
Thema: "Die besten Allrounder-Bikes unter 1.500€"
MTB Allrounder von Adventure Works wird Testsieger ⭐⭐⭐⭐⭐

Normalerweise:
├─ Juli: 12% Jahresproduktion = 44.400 Bikes
├─ Davon Allrounder (30%): 13.320 Bikes

Mit Kampagne (+20% Nachfrage):
├─ Juli mit Boost: 53.280 Bikes gesamt
├─ Davon Allrounder (+20%): 15.984 Bikes
└─ Delta: +2.664 Allrounder Bikes!

Umsatz-Potential: 2.664 Bikes × 350€ Gewinn = +932.400€ 💰
```

### Konfigurierbare Parameter

```typescript
interface MarketingAktionSzenario {
  startDatum: Date;           // z.B. 2027-07-01
  endDatum: Date;             // z.B. 2027-07-14 (2 Wochen)
  nachfrageErhoehung: number; // z.B. +20% (0.20)
  betroffeneVarianten: string[]; // z.B. ["ALLR"] oder "alle"
  region?: string;            // Optional: bestimmte Region
}
```

### Impact-Analyse

#### OHNE Szenario-Planung ❌

```
1. Marketing-Kampagne überraschend erfolgreich
2. Nachfrage steigt plötzlich um 20%
3. Nur für normale Nachfrage eingekauft
4. Lagerbestand reicht nicht (fehlen 2.664 Sättel)
5. ATP-Check schlägt fehl für neue Aufträge
6. Können nur 13.320 liefern statt 15.984
7. 2.664 Bikes fehlen = ca. 932.400€ Umsatzverlust!
8. Kunden unzufrieden (liefern zu spät)
```

**SCOR-Metriken Impact:**
- Perfect Order Fulfillment: ↓ 94% → 79% (🔴 kritisch!)
- Order Cycle Time: ↑ +30 Tage (Nachbestellung)
- Agility: ↓ (schlechte Reaktionsfähigkeit)

#### MIT Szenario-Planung ✅

```
1. Szenario im April simuliert ("Was wenn +20% im Juli?")
2. Erkenntnis: Sicherheitsbestand zu niedrig
3. Extra-Bestellung in China im Mai (49 Tage Vorlauf)
4. 3.000× SAT_FT extra bestellt (mit Puffer)
5. Lager im Juni auf 5.000 Stück aufgebaut
6. Juli: Kampagne läuft, Nachfrage steigt
7. Lager reicht! ATP-Check erfolgreich
8. Alle 15.984 Allrounder lieferbar ✅
9. Voller Umsatz + zufriedene Kunden!
```

**SCOR-Metriken Impact:**
- Perfect Order Fulfillment: ✅ 94% (gehalten!)
- Agility: ↑ (hervorragende Reaktion)
- Cash-to-Cash: → (neutral, geplanter Mehrbestand)

### Gegenmaßnahmen

| Maßnahme | Vorlauf | Kosten | Effektivität |
|----------|---------|--------|--------------|
| **Sicherheitsbestand erhöhen** | 49 Tage | +20.000€ | 🟢 Hoch |
| **Just-in-Time Express** | 14 Tage | +50.000€ | 🟡 Mittel |
| **Priorität anpassen (FCFS)** | Sofort | Keine | 🟡 Mittel |
| **Überproduktion im Vormonat** | 30 Tage | +10.000€ | 🟢 Hoch |

---

## 3. Szenario 2: China Produktionsausfall (Supply Disruption)

### Beschreibung

Maschinenausfall, Stromausfall oder technisches Problem beim einzigen Zulieferer in China.

### Praxis-Beispiel

```
15. März 2027: Produktionsanlage bei Dengwong Mfg. fällt aus
───────────────────────────────────────────────────────────
Grund: Maschinenschaden an Hauptproduktionslinie
Dauer: 7 Tage (15. März - 21. März)
Kapazität: -60% (nur Notbetrieb mit alter Maschine)

Normal-Betrieb:
├─ Produktion: 740 Sättel/Tag
└─ 7 Tage = 5.180 Sättel

Notbetrieb (-60%):
├─ Produktion: 296 Sättel/Tag (740 × 0.4)
├─ 7 Tage = 2.072 Sättel
└─ Verlust: 5.180 - 2.072 = 3.108 Sättel fehlen! 🔴

Wert: 3.108 Sättel × 45€ ≈ 140.000€ Material
      3.108 Bikes nicht baubar = ~1,1 Mio. € Umsatz!
```

### Konfigurierbare Parameter

```typescript
interface ProduktionsausfallSzenario {
  startDatum: Date;          // z.B. 2027-03-15
  dauerTage: number;         // z.B. 7 Tage
  kapazitaetsReduktion: number; // z.B. -60% (0.60)
  betroffenerZulieferer: "China"; // Nur China in Code-Ermäßigung
  betroffenesProdukt?: string; // Optional: bestimmte Sattel-Typen
}
```

### Impact-Analyse

#### Zeitstrahl-Betrachtung

```
┌────────────────────────────────────────────────────────┐
│              AUSWIRKUNG AUF LIEFERKETTE                │
└────────────────────────────────────────────────────────┘

Tag 0 (15. März):    Maschinenausfall beginnt
                     ↓
Tag 1-7:             Nur 40% Produktion (Notbetrieb)
                     3.108 Sättel fehlen
                     ↓
Tag 8 (22. März):    Maschine repariert, Normal-Betrieb
                     ↓
Tag 57 (10. Mai):    Erste normale Lieferung nach Ausfall
                     (49 Tage Vorlauf ab 22. März)
                     ↓
März-Mai:            KRITISCH! Lagerbestand läuft leer
                     ↓
April-Peak:          PROBLEM! Höchste Nachfrage (16%)
                     aber niedrigster Lagerbestand
                     ↓
10. Mai:             Erst dann normale Lieferungen wieder
```

#### SCOR-Metriken Impact

**Vor Ausfall (Normal):**
- Perfect Order Fulfillment: 94%
- Order Cycle Time: 39 Tage
- Inventory Days of Supply: 45 Tage

**Während Ausfall (15. März - 10. Mai):**
- Perfect Order Fulfillment: ↓ 94% → 67% (🔴 kritisch!)
- Order Cycle Time: ↑ 39 → 56 Tage (+17 Tage)
- Inventory Days of Supply: ↓ 45 → 12 Tage (🔴 gefährlich!)

### Gegenmaßnahmen

1. **Sicherheitsbestand erhöhen (präventiv)**
   - Kosten: ~200.000€ (extra Lagerkosten)
   - Vorteil: Ausfall überbrücken (7-14 Tage)
   - Best Practice: ✅ 2 Wochen Puffer

2. **Alternative Zulieferer** *(in Vollversion)*
   - In Code-Ermäßigung: ✂️ **Nicht verfügbar**
   - Würde Risiko drastisch reduzieren

3. **Produktionspriorität anpassen (FCFS)**
   - Kosten: Keine
   - Vorteil: Wichtigste Varianten zuerst
   - Nachteil: Andere Varianten verzögert

4. **Express-Lieferung per Flugzeug**
   - Kosten: ~80.000€ (10× teurer!)
   - Vorteil: Nur 5 Tage statt 49 Tage
   - Nur für Notfall!

---

## 4. Szenario 3: Transport-Schaden (Cargo Loss)

### Beschreibung

Container geht auf Seefracht verloren durch Sturm, Unfall oder andere Katastrophen.

### Praxis-Beispiel

```
20. Februar 2027: Schwerer Sturm im Südchinesischen Meer
──────────────────────────────────────────────────────────
Situation: Container mit 1.000 Sätteln geht über Bord
Schiff: MV "Ocean Carrier" (Shanghai → Hamburg)
Wert: 1.000 Sättel × 45€ ≈ 45.000€ Material
      + 1.000 Bikes nicht baubar = ~350.000€ Umsatz!

Container-Inhalt (Mix):
├─ 300× SAT_FT (Fizik Tundra)
├─ 250× SAT_RL (Raceline)
├─ 250× SAT_SP (Spark)
└─ 200× SAT_SL (Speedline)

⚠️ Versicherung deckt Material (45.000€)
❌ NICHT gedeckt: Umsatzverlust (350.000€)
```

### Konfigurierbare Parameter

```typescript
interface TransportSchadenSzenario {
  datum: Date;                    // z.B. 2027-02-20
  verlustMenge: number;           // z.B. 1.000 Stück
  betroffeneTeile: {              // Verteilung
    SAT_FT: number;  // 300
    SAT_RL: number;  // 250
    SAT_SP: number;  // 250
    SAT_SL: number;  // 200
  };
  versicherung: boolean;          // true (nur Material gedeckt)
  ersatzlieferungVerfuegbar: boolean; // true/false
}
```

### Impact-Analyse

#### Lagerbestand vor/nach Verlust

```
Geplanter Lagerbestand 21. Februar (ohne Schaden):
┌──────────┬───────────┬────────────┬────────────┐
│ Sattel   │ Bestand   │ Verlust    │ Neu        │
├──────────┼───────────┼────────────┼────────────┤
│ SAT_FT   │ 1.500     │ -300       │ 1.200  🟡  │
│ SAT_RL   │ 1.200     │ -250       │   950  🟡  │
│ SAT_SP   │   800     │ -250       │   550  🔴  │
│ SAT_SL   │   600     │ -200       │   400  🔴  │
└──────────┴───────────┴────────────┴────────────┘

🟢 Sicher (>1.000)  🟡 Knapp (500-1.000)  🔴 Kritisch (<500)
```

#### März-Produktion (nach Verlust)

```
März-Bedarf Allrounder:
├─ Benötigt: 3.000× SAT_FT (10% × 30% × 370k / 12)
├─ Verfügbar: 1.200× SAT_FT
├─ Fehlend: 1.800× SAT_FT
└─ ❌ Können nur 40% der Allrounder bauen!

März-Bedarf Trail:
├─ Benötigt: 1.300× SAT_SP (10% × 13% × 370k / 12)
├─ Verfügbar: 550× SAT_SP
├─ Fehlend: 750× SAT_SP
└─ ❌ Können nur 42% der Trail-Bikes bauen!
```

**Konsequenz:**
- 2.550 Bikes NICHT baubar im März
- Umsatzverlust: ~900.000€
- Perfect Order Fulfillment: ↓ 94% → 72%

### Gegenmaßnahmen

1. **Express-Nachbestellung (Flugzeug)**
   - Dauer: 5 Tage (statt 49)
   - Kosten: +400% (80.000€ statt 20.000€)
   - Verfügbar ab: 25. Februar (noch Zeit für März!)

2. **Varianten-Priorität anpassen**
   - FCFS-Regel anwenden
   - Wichtigste Kunden zuerst bedienen
   - Kommunikation: Andere Varianten verzögert

3. **Überstunden in Dortmund**
   - Produktion auf 10h/Tag erhöhen
   - Kosten: +20% Lohnkosten
   - Vorteil: Mehr Bikes aus vorhandenem Material

---

## 5. Szenario 4: Schiffsverspätung (Shipment Delay)

### Beschreibung

Seefracht verzögert sich durch Wetter, Hafenstau oder technische Probleme.

### Praxis-Beispiel

```
12. Februar 2027: Taifun "Haiyan" verzögert Schiffe
─────────────────────────────────────────────────────
Geplante Route: Shanghai → Hamburg (30 Kalendertage)
Geplante Ankunft: 16. Februar 2027
Verspätung: +4 Tage (Umweg wegen Sturm)
Neue Ankunft: 20. Februar 2027

Auswirkung:
├─ Bestellung: 22. Januar (+ 5 AT Produktion = 27. Jan)
├─ Abfahrt Shanghai: 29. Januar
├─ SOLL Hamburg: 16. Februar (28 KT See + 2 AT LKW)
└─ IST Hamburg: 20. Februar (+4 Tage Verzug)
```

### Konfigurierbare Parameter

```typescript
interface SchiffVerzoegerungSzenario {
  urspruenglicheAnkunft: Date;  // z.B. 2027-02-16
  verzoegerungTage: number;     // z.B. 4 Tage
  neueAnkunft: Date;            // z.B. 2027-02-20
  grund: string;                // z.B. "Taifun" oder "Hafenstau"
  betroffeneSchifffahrt: string; // z.B. "MV Ocean Carrier"
}
```

### Impact-Analyse

#### Produktion Timeline

```
┌──────────────────────────────────────────────────────────┐
│           PRODUKTION MIT/OHNE VERSPÄTUNG                 │
└──────────────────────────────────────────────────────────┘

SOLL (ohne Verspätung):
16. Feb: Sättel kommen an
         ↓
17. Feb: Produktion für Woche 7
18. Feb: Produktion läuft normal
19. Feb: Produktion läuft normal
         ↓
Gesamt Woche 7: 5.200 Bikes ✅

IST (mit +4 Tage Verspätung):
16. Feb: ❌ KEINE Sättel! (Material fehlt)
17. Feb: ❌ Produktion STOPP
18. Feb: ❌ Produktion STOPP
19. Feb: ❌ Produktion STOPP
20. Feb: ✅ Sättel kommen (4 Tage zu spät)
21. Feb: Produktion startet wieder
         ↓
Verlust: 4 Tage × 1.040 Bikes = 4.160 Bikes! 🔴
Wert: ~1,5 Mio. € Umsatz verloren
```

#### SCOR-Metriken Impact

**Order Cycle Time:**
```
Normal:  Bestellung → 49 Tage → Lieferung
Mit Delay: Bestellung → 53 Tage → Lieferung (+8%)
```

**Responsiveness:**
- ↓ Schlechter (längere Wartezeit)
- Ziel 49 Tage → Ist 53 Tage (❌ verfehlt)

**Agility:**
- Wird getestet: Wie gut reagieren wir?
- Mit Puffer: ✅ Gut (kein Produktionsstopp)
- Ohne Puffer: ❌ Schlecht (4 Tage Stillstand)

### Gegenmaßnahmen

1. **Puffer-Tage einplanen (präventiv)**
   ```
   Regel: Lager IMMER 5 Tage VOR Produktionsbedarf auffüllen
   
   Beispiel:
   ├─ Produktion geplant: 18. Februar
   ├─ Lager auffüllen bis: 13. Februar (5 Tage Puffer)
   ├─ Bestellung starten: 25. November (49 Tage + 5 Puffer)
   └─ Selbst bei 4 Tage Verzug: Noch 1 Tag Puffer ✅
   ```

2. **Alternative Transportrouten**
   - Flugzeug (teuer, aber schnell): 5 Tage
   - Express-Schiff (schneller, teurer): 21 Tage
   - Standard-Schiff (günstig): 30 Tage

3. **Produktionsflexibilität**
   - Andere Varianten vorziehen (mit verfügbarem Material)
   - Überstunden später (wenn Material da)
   - FCFS-Regel anpassen

---

## 6. Szenarien kombinieren

### Worst-Case-Szenario

Mehrere Szenarien können gleichzeitig auftreten!

```
┌────────────────────────────────────────────────────────┐
│         BEISPIEL: KOMBINIERTE SZENARIEN                │
└────────────────────────────────────────────────────────┘

Januar:     Spring Festival (8 Tage kein China-Betrieb)
            + Schiffsverspätung (+4 Tage)
            = 12 Tage Verzug gesamt! 🔴

März:       Maschinenausfall in China (7 Tage, -60%)
            + Marketingaktion startet unerwartet
            = Doppel-Engpass! 🔴🔴

April:      Container-Verlust (1.000 Sättel)
            + April-Peak (16% Jahresproduktion)
            = Katastrophe! 🔴🔴🔴
```

### Risiko-Analyse Matrix

| Kombination | Wahrscheinlichkeit | Impact | Gesamt-Risiko |
|-------------|-------------------|---------|---------------|
| Spring Festival + Schiffsverspätung | Mittel | Hoch | 🔴 HOCH |
| Ausfall + Marketingaktion | Niedrig | Sehr Hoch | 🔴 HOCH |
| Container-Verlust + April-Peak | Sehr niedrig | Katastrophal | 🔴 KRITISCH |
| Normale Verspätung + normale Nachfrage | Hoch | Niedrig | 🟡 MITTEL |

---

## 7. Implementierung im System

### Szenario-Manager UI

Das System hat einen **Szenarien-Manager** (Floating Button rechts):

```
┌─────────────────────────────────────┐
│      📊 SZENARIEN-MANAGER           │
├─────────────────────────────────────┤
│                                     │
│ Aktive Szenarien: 2                │
│                                     │
│ 1. ✅ Marketingaktion               │
│    Start: 01.07.2027                │
│    +20% Nachfrage (ALLR)            │
│    [Bearbeiten] [Löschen]           │
│                                     │
│ 2. ✅ Schiffsverspätung             │
│    Ankunft: 20.02 (statt 16.02)    │
│    +4 Tage Verzug                   │
│    [Bearbeiten] [Löschen]           │
│                                     │
│ [+ Neues Szenario hinzufügen]      │
│                                     │
│ [Simulation starten]                │
└─────────────────────────────────────┘
```

### JSON-basierte Konfiguration

Szenarien werden in JSON gespeichert:

```json
{
  "szenarien": [
    {
      "id": "szenario-1",
      "typ": "Marketingaktion",
      "aktiv": true,
      "parameter": {
        "startDatum": "2027-07-01",
        "endDatum": "2027-07-14",
        "nachfrageErhoehung": 0.20,
        "betroffeneVarianten": ["ALLR"]
      }
    },
    {
      "id": "szenario-2",
      "typ": "ProduktionsAusfall",
      "aktiv": true,
      "parameter": {
        "startDatum": "2027-03-15",
        "dauerTage": 7,
        "kapazitaetsReduktion": 0.60
      }
    }
  ]
}
```

### Global State Management

**Wichtig:** Szenarien sind **global wirksam** über alle Tabs!

```
Dashboard → Szenario aktivieren
    ↓
Programmplanung → Nachfrage angepasst ✓
    ↓
Inbound → Bestellungen angepasst ✓
    ↓
Produktion → ATP-Check berücksichtigt Szenarien ✓
    ↓
Reporting → SCOR-Metriken zeigen Impact ✓
```

Mehr zu [Bewertungskriterien A13 →](./06-Bewertungskriterien.md#a13-szenarien-global-wirksam)

---

## Zusammenfassung

### Key Takeaways

1. **4 Szenarien implementiert:** Marketingaktion, Produktionsausfall, Transport-Schaden, Schiffsverspätung
2. **Simulation vor Realität:** "Was wäre wenn?" durchspielen
3. **Gegenmaßnahmen vorbereiten:** Sicherheitsbestände, Puffer, Express-Optionen
4. **SCOR-Metriken Impact:** Szenarien zeigen Auswirkung auf KPIs
5. **Kombinierbar:** Mehrere Szenarien gleichzeitig möglich
6. **Global wirksam:** Szenarien beeinflussen alle Module

### Kritische Erkenntnisse

| Szenario | Häufigste Fehler | Best Practice |
|----------|-----------------|---------------|
| **Marketingaktion** | Zu wenig Puffer | 5-7 Tage Sicherheitsbestand |
| **Produktionsausfall** | Keine Alternative | 2 Wochen Puffer vor Peak |
| **Transport-Schaden** | Keine Express-Option | Versicherung + Backup-Plan |
| **Schiffsverspätung** | Zu knappe Planung | +5 Tage Puffer einrechnen |

---

## Weiterführende Links

- **[Aufgabenstellung ←](./01-Aufgabenstellung.md)** - Warum Szenarien wichtig sind
- **[Zeitparameter ←](./04-Zeitparameter.md)** - Vorlaufzeiten & Feiertage
- **[Bewertungskriterien →](./06-Bewertungskriterien.md)** - A13: Szenarien-Anforderung
- **[Glossar →](./07-Glossar.md)** - ATP, FCFS, Szenario-Begriffe

[[◀ Zurück: Zeitparameter](./04-Zeitparameter.md)] | [[Weiter: Bewertungskriterien ▶](./06-Bewertungskriterien.md)]
