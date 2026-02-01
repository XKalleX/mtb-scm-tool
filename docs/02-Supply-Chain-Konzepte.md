# 🔗 Supply Chain Konzepte

> **Für Einsteiger:** Diese Seite erklärt die fundamentalen Supply Chain Konzepte, die du für das Verständnis des Systems brauchst - von Grundlagen bis zu SCOR-Metriken.

[[◀ Zurück: Aufgabenstellung](./01-Aufgabenstellung.md)] | [[Weiter: Produktstruktur ▶](./03-Produktstruktur.md)]

---

## Inhaltsverzeichnis

1. [Was ist eine Supply Chain?](#1-was-ist-eine-supply-chain)
2. [SCOR-Modell: Die 5 Prozesse](#2-scor-modell-die-5-prozesse)
   - [PLAN (Planen)](#21-plan-planen)
   - [SOURCE (Beschaffen)](#22-source-beschaffen)
   - [MAKE (Produzieren)](#23-make-produzieren)
   - [DELIVER (Liefern)](#24-deliver-liefern)
   - [RETURN (Rückgabe)](#25-return-rückgabe)
3. [SCOR-Metriken: Erfolg messen](#3-scor-metriken-erfolg-messen)
4. [ATP vs CTP](#4-atp-vs-ctp)
5. [FCFS-Regel](#5-fcfs-regel-first-come-first-serve)
6. [Weiterführende Themen](#6-weiterführende-themen)

---

## 1. Was ist eine Supply Chain?

### Definition

**Supply Chain** (Lieferkette) ist der gesamte Weg eines Produkts von der Rohware bis zum Endkunden.

### Analogie: Burger-Produktion 🍔

Um es verständlich zu machen, denken wir an die Herstellung eines Burgers:

1. **Tier 3 (Rohstoffe):** Bauer züchtet Rind
2. **Tier 2 (Vorprodukte):** Metzger macht Burger-Patty
3. **Tier 1 (Komponenten):** Großhändler liefert Patty an Restaurant
4. **OEM (Hersteller):** Restaurant grillt und montiert Burger
5. **Distribution:** Lieferservice bringt Burger zu dir
6. **Endkunde:** Du isst den Burger

Jede Stufe ist abhängig von der vorherigen - wenn der Großhändler zu spät liefert, kann das Restaurant keine Burger machen!

### Adventure Works Supply Chain

Bei unserem Mountain Bike Hersteller sieht die Supply Chain so aus:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ADVENTURE WORKS SUPPLY CHAIN                       │
└──────────────────────────────────────────────────────────────────────┘

[1] TIER 1 ZULIEFERER              [2] OEM PRODUKTION        [3] KUNDE
    (China)                             (Dortmund)               
                                                               
┌─────────────────┐                ┌─────────────────┐       
│  Dengwong Mfg.  │   Sättel       │  Adventure      │       
│  Shanghai       │ ─────────────> │  Works AG       │ ──────> Händler
│                 │   49 Tage      │  (Montage)      │       
└─────────────────┘   Vorlauf      └─────────────────┘       
                                                               
  Produktion:                        Kapazität:               
  - SAT_FT (Fizik Tundra)           - 130 Bikes/Stunde      
  - SAT_RL (Raceline)               - 8h Schichten           
  - SAT_SP (Spark)                  - 1.040 Bikes/Tag        
  - SAT_SL (Speedline)              - ~370.000/Jahr          
                                                               
  Constraints:                       Input:                   
  - Spring Festival (8 Tage)        - Sättel aus China       
  - Losgröße: 500 Stück             - (Rest vereinfacht)     
  - Lieferintervall: 14 Tage                                 
```

### Warum ist das wichtig?

Die Supply Chain ist ein **komplexes System**:

- ⏱️ **Timing ist kritisch:** 49 Tage Vorlaufzeit bedeuten, Bestellungen für März müssen im Januar raus
- 🎯 **Jedes Glied zählt:** Wenn ein Zulieferer ausfällt, steht die ganze Produktion still
- 💰 **Kosten überall:** Transport, Lager, Produktion - alles muss optimiert werden
- 📊 **Transparenz nötig:** Wo sind meine Teile? Wann kommen sie an?

---

## 2. SCOR-Modell: Die 5 Prozesse

Das **SCOR-Modell** (Supply Chain Operations Reference) ist der internationale Standard für Supply Chain Management. Es definiert **5 Hauptprozesse**:

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  PLAN   │───>│ SOURCE  │───>│  MAKE   │───>│ DELIVER │───>│ RETURN  │
│         │    │         │    │         │    │         │    │         │
│ Planen  │    │Beschaffen│   │Produzieren│  │ Liefern │    │Rückgabe │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### 2.1 PLAN (Planen)

#### Was ist das?

Die **strategische Ebene** - "Was sollen wir produzieren und wann?"

PLAN ist das Gehirn der Supply Chain. Hier werden alle Entscheidungen getroffen:
- Wie viele Bikes produzieren wir?
- Wann produzieren wir welche Varianten?
- Wie verteilen wir die Produktion über das Jahr?

#### Bei Adventure Works

**Aufgaben:**
- **Jahresplanung:** 370.000 Bikes müssen verteilt werden auf 365 Tage
- **Saisonalität berücksichtigen:** April = 16% (Peak!), Dezember = 3% (Low Season)
- **Variantenplanung:** 8 verschiedene MTB-Typen balancieren
- **Ressourcenplanung:** Kapazität, Personal, Material

**Beispiel konkret:**

```
Jahr 2027: 370.000 Bikes gesamt
├─ Januar:   4% =  14.800 Bikes (Winter, wenig Nachfrage)
├─ Februar:  6% =  22.200 Bikes (Vorbereitung Frühjahr)
├─ März:    10% =  37.000 Bikes (steigend)
├─ April:   16% =  59.200 Bikes ← PEAK SEASON!
├─ Mai:     14% =  51.800 Bikes (Hochsaison)
├─ Juni:    12% =  44.400 Bikes (weiter hoch)
├─ Juli:    10% =  37.000 Bikes (Sommerpause beginnt)
├─ August:   8% =  29.600 Bikes (Urlaub)
├─ September:7% =  25.900 Bikes (niedriger)
├─ Oktober:  6% =  22.200 Bikes (Herbst)
├─ November: 7% =  25.900 Bikes (leicht steigend)
└─ Dezember: 3% =  11.100 Bikes (Weihnachten, niedrig)
```

#### Wichtiges Konzept: Error Management

**Problem:**  
370.000 Bikes ÷ 365 Tage = 1.013,698... Bikes/Tag (Dezimalzahl!)

Du kannst aber keine 0,698 Bikes bauen - nur ganze Bikes!

**❌ Naive Lösung (falsch):**
```
Jeden Tag 1.014 Bikes bauen
→ Nach 365 Tagen: 365 × 1.014 = 370.110 Bikes
→ Problem: 110 Bikes zu viel! ❌
```

**✅ Error Management (richtig):**
```
Kumulativen Fehler mitführen und ausgleichen:
- Tag 1: 1.013,698 → Runde auf 1.014 (Fehler: +0,302)
- Tag 2: 1.013,698 → Runde auf 1.014 (Fehler: +0,604)
- Tag 3: 1.013,698 → Runde auf 1.013 (Fehler: -0,094, Ausgleich!)
- Tag 4: ...

→ Nach 365 Tagen: EXAKT 370.000 Bikes ✅
```

Mehr dazu: [04-Zeitparameter.md](./04-Zeitparameter.md)

#### Warum wichtig?

- ❌ **Ohne PLAN:** Chaos, Fehlproduktion, unzufriedene Kunden
- ✅ **Mit PLAN:** Strukturierte Produktion, optimierte Auslastung, niedrige Kosten

---

### 2.2 SOURCE (Beschaffen)

#### Was ist das?

Der **Einkauf und die Beschaffung** von Komponenten von Zulieferern.

SOURCE sorgt dafür, dass alle benötigten Teile **zur richtigen Zeit**, **in der richtigen Menge** und **zum richtigen Preis** verfügbar sind.

#### Bei Adventure Works

**Lieferant:**
- **Name:** Dengwong Manufacturing Ltd.
- **Standort:** Shanghai, China
- **Produkt:** 4 Sattel-Varianten (SAT_FT, SAT_RL, SAT_SP, SAT_SL)

**Parameter:**
- **Vorlaufzeit:** 49 Tage (detailliert unten)
- **Losgröße:** Mindestens 500 Sättel pro Bestellung
- **Lieferintervall:** Alle 14 Tage möglich
- **Bestellfenster:** Nur an Arbeitstagen (Mo-Fr, keine Feiertage)

#### Die 49 Tage Vorlaufzeit im Detail

Die **49 Tage** sind eine Kombination aus Produktion und Transport:

```
┌────────────────────────────────────────────────────────────────┐
│  VORLAUFZEIT CHINA → DEUTSCHLAND: 49 TAGE                      │
└────────────────────────────────────────────────────────────────┘

Tag 1-5:   [Produktion in China]          5 Arbeitstage (AT)
           └─ Dengwong Manufacturing fertigt Sättel
           └─ ACHTUNG: Nur Mo-Fr, keine Feiertage!
           └─ Spring Festival = Produktionsstopp!
           
Tag 6-7:   [LKW China → Hafen Shanghai]   2 Arbeitstage (AT)
           └─ Transport von Werk zu Hafen
           └─ Verladung auf Schiff
           
Tag 8-37:  [Seefracht Shanghai → Hamburg] 30 Kalendertage (KT)
           └─ Containerschiff über Pazifik
           └─ Läuft 24/7, auch Wochenenden!
           └─ Keine Verzögerung durch Feiertage
           
Tag 38-39: [LKW Hamburg → Dortmund]       2 Arbeitstage (AT)
           └─ Hafen Hamburg → Adventure Works Werk
           └─ Warenannahme & Qualitätskontrolle
           
───────────────────────────────────────────────────────────────
GESAMT:    5 AT + 2 AT + 30 KT + 2 AT = 49 TAGE
```

**Wichtig zu verstehen:**

- **Arbeitstage (AT):** Nur Montag-Freitag, **ohne** Feiertage
  - LKW-Fahrer haben am Wochenende frei
  - Produktionswerke geschlossen (Samstag/Sonntag)
  - Feiertage (deutsch/chinesisch) verlängern die Dauer!

- **Kalendertage (KT):** 24/7, **inklusive** Wochenenden
  - Schiff fährt durchgehend
  - Keine Unterbrechung

**Beispiel-Rechnung:**

```
Bestellung am: Montag, 5. Januar 2027
├─ Tag 1-5 (Produktion): 5. Jan - 9. Jan (Mo-Fr)
├─ Tag 6-7 (LKW China): 12. Jan - 13. Jan (Mo-Di, nach Wochenende)
├─ Tag 8-37 (Seefracht): 14. Jan - 12. Feb (30 volle Tage)
└─ Tag 38-39 (LKW DE): 13. Feb - 16. Feb (Fr-Mo, über Wochenende)

Ankunft: Montag, 16. Februar 2027 (nach 49 Tagen)
```

Mehr dazu: [04-Zeitparameter.md](./04-Zeitparameter.md)

#### Kritisches Problem: Spring Festival

**Chinesisches Neujahr 2027: 6. Februar - 11. Februar (6 Tage)**

```
┌────────────────────────────────────────────────────────────┐
│  SPRING FESTIVAL - PRODUKTIONSSTOPP IN CHINA              │
└────────────────────────────────────────────────────────────┘

6. Februar - 11. Februar 2027 (6 Tage)

Was passiert:
🚫 Keine Produktion beim Zulieferer
🚫 Keine neuen Bestellungen angenommen
⏸️  Laufende Bestellungen pausiert
✅ Schiffe auf See fahren weiter (kein Problem)

Konsequenz für Planung:
⚠️  Bestellungen für Anfang März müssen VOR dem 10. Januar raus!
⚠️  Sonst: Produktionsstillstand in Deutschland!

Beispiel:
❌ FALSCH: Bestellung am 20. Januar für März
   → Produktion würde 21.-25. Jan starten
   → ABER: 28. Jan beginnt Spring Festival
   → Produktion unterbrochen → Lieferung zu spät!

✅ RICHTIG: Bestellung am 2. Januar für März
   → Produktion 2.-6. Januar (vor Festival)
   → Transport startet 9. Januar
   → Ankunft rechtzeitig vor März!
```

Mehr dazu: [06-Feiertage-und-Constraints.md](./06-Feiertage-und-Constraints.md)

#### Losgröße und Bestellintervall

**Losgröße: 500 Sättel**

Der Zulieferer akzeptiert nur Bestellungen von mindestens 500 Stück:

```
Tagesbedarf: 740 Sättel/Tag (für alle Varianten zusammen)

Option 1: Jeden Tag bestellen (nicht möglich!)
❌ 740 < 500 → Zu wenig, Zulieferer lehnt ab

Option 2: Alle 2 Tage bestellen
✓ 740 × 2 = 1.480 Sättel
✓ 1.480 ≥ 500 → Akzeptiert!
→ Wir bestellen 1.500 Sättel (3× Losgröße)
```

**Lieferintervall: 14 Tage**

Mindestens 14 Tage müssen zwischen zwei Lieferungen liegen:

```
Bestellung 1: 5. Januar  → Ankunft 23. Februar
Bestellung 2: 19. Januar → Ankunft 9. März (>14 Tage nach Bestellung 1 ✓)
```

#### Warum wichtig?

- ⏱️ **49 Tage sind LANG:** Keine Flexibilität, vorausschauende Planung nötig
- 📦 **Losgrößen zwingen zu Überbestellung:** Mehr Lagerkosten
- 🎯 **Spring Festival ist kritisch:** Kann ganze Supply Chain lahmlegen

---

### 2.3 MAKE (Produzieren)

#### Was ist das?

Die eigentliche **Montage und Fertigung** der Mountain Bikes.

Bei Adventure Works werden keine Einzelteile hergestellt, sondern **fertige Komponenten montiert** (OEM-Prinzip).

#### Bei Adventure Works

**Produktionsstandort:**
- **Werk:** Dortmund, Deutschland
- **Kapazität:** 130 Bikes pro Stunde
- **Schichtmodell:** 8-Stunden-Schicht (1 Schicht/Tag)
- **Tageskapazität:** 130 × 8 = 1.040 Bikes pro Tag
- **Jahreskapazität:** ~370.000 Bikes (bei Vollauslastung)

**Montage-Durchlaufzeit:**
- **325 Minuten** pro Bike (von Start bis Finish)
- Das heißt NICHT, dass nur 14 Bikes/Tag gebaut werden können!
- **Fließband-Produktion:** Mehrere Bikes gleichzeitig in verschiedenen Stadien

**Analogie: Autowaschanlage**
```
Eine Wäsche dauert 10 Minuten, ABER:
- Auto 1 startet 0:00 → fertig 0:10
- Auto 2 startet 0:01 → fertig 0:11
- Auto 3 startet 0:02 → fertig 0:12
→ Output: 60 Autos/Stunde (nicht nur 6!)
```

#### Der Produktionsprozess

```
┌─────────────────────────────────────────────────────────────┐
│  PRODUKTIONSABLAUF ADVENTURE WORKS                          │
└─────────────────────────────────────────────────────────────┘

1. [Auftrag eingeht]
   └─ Kunde bestellt 1.000 MTB Allrounder
   
2. [Material-Check]
   └─ Prüfung: Sind alle Teile verfügbar?
      ├─ SAT_FT (Fizik Tundra): 2.500 im Lager ✓
      ├─ Rahmen: (vereinfacht, nicht betrachtet)
      └─ Weitere Teile: (vereinfacht)
   
3. [ATP-Check] ← KRITISCHSTER SCHRITT!
   └─ Available-To-Promise-Prüfung:
      ├─ Material verfügbar? ✓
      ├─ Kapazität frei? ✓
      └─ Termin machbar? ✓
   
4. [Produktionsfreigabe]
   └─ Auftrag wird eingeplant
   
5. [Montage - 325 Minuten]
   ├─ Station 1: Rahmen + Gabel
   ├─ Station 2: Laufräder montieren
   ├─ Station 3: Bremsen + Schaltung
   ├─ Station 4: Sattel + Lenker
   └─ Station 5: Qualitätskontrolle
   
6. [Fertigstellung]
   └─ Bike bereit für Auslieferung
```

#### ATP-Check: Das Herzstück der Produktion

**ATP = Available To Promise** - "Können wir versprechen, das zu produzieren?"

Der ATP-Check ist die wichtigste Kontrolle vor jeder Produktion. Er verhindert, dass wir Aufträge annehmen, die wir nicht erfüllen können.

**Beispiel 1: ATP-Check erfolgreich**

```
Kundenauftrag:
- Variante: MTB Allrounder
- Menge: 1.000 Bikes
- Gewünschter Termin: 15. April 2027
- Heute: 10. April 2027

ATP-Check durchführen:

1️⃣ Material verfügbar?
   Benötigt: 1.000 × SAT_FT (Fizik Tundra)
   Lagerbestand: 2.500 SAT_FT
   Status: ✅ 2.500 ≥ 1.000 (genug Material)

2️⃣ Kapazität verfügbar?
   Benötigt: 1.000 Bikes ÷ 130 Bikes/h = 7,69 Stunden
   Verfügbar: 8 Stunden/Tag
   Status: ✅ 8h ≥ 7,69h (schaffen wir in einer Schicht)

3️⃣ Termin realistisch?
   Kunde will: 15. April
   Heute: 10. April
   Durchlaufzeit: ~1 Tag (325 Min ≈ 5,4h Fließband)
   Puffer: 5 Tage
   Status: ✅ 5 Tage > 1 Tag (genug Zeit)

ERGEBNIS: ✅ ATP = 15. April (Auftrag kann zugesagt werden!)
```

**Beispiel 2: ATP-Check fehlgeschlagen (Material fehlt)**

```
Kundenauftrag:
- Variante: MTB Competition
- Menge: 2.000 Bikes
- Gewünschter Termin: 20. April 2027
- Heute: 15. April 2027

ATP-Check durchführen:

1️⃣ Material verfügbar?
   Benötigt: 2.000 × SAT_RL (Raceline)
   Lagerbestand: 800 SAT_RL
   Status: ❌ 800 < 2.000 (MATERIAL FEHLT!)

Was nun? 2 Optionen:

Option A: Nachbestellen in China
├─ Bestellung heute: 15. April
├─ Vorlaufzeit: 49 Tage
├─ Ankunft: 3. Juni
└─ ❌ VIEL ZU SPÄT! (Kunde wollte 20. April)

Option B: FCFS-Regel anwenden
├─ Wir können nur 800 Bikes zusagen (Material reicht)
├─ Restliche 1.200 Bikes später (wenn Nachschub da ist)
└─ ⚠️  Kunde wird informiert: Teillieferung
```

**Beispiel 3: ATP-Check fehlgeschlagen (Kapazität fehlt)**

```
Kundenauftrag:
- Verschiedene Varianten
- Menge: 1.500 Bikes
- Gewünschter Termin: Morgen (!)
- Heute: 10. April 2027

ATP-Check durchführen:

1️⃣ Material verfügbar?
   Status: ✅ Alle Sättel im Lager

2️⃣ Kapazität verfügbar?
   Benötigt: 1.500 Bikes ÷ 130 Bikes/h = 11,54 Stunden
   Verfügbar: 8 Stunden/Tag
   Status: ❌ 8h < 11,54h (KAPAZITÄT REICHT NICHT!)

Was nun?

Option A: Überstunden fahren
├─ Zusätzliche 4 Stunden am Abend
├─ Kosten: 1,5× höherer Stundenlohn
└─ ⚠️  Entscheidung muss Management treffen

Option B: Über 2 Tage verteilen
├─ Tag 1: 1.040 Bikes
├─ Tag 2: 460 Bikes
└─ ❌ Liefertermin kann nicht gehalten werden

Option C: FCFS-Regel
├─ Priorisierung nach Bestelleingang
├─ Ältere Aufträge zuerst
└─ Neuer Auftrag muss warten
```

#### Warum wichtig?

- ✅ **ATP verhindert Überversprechen:** Keine Zusagen, die wir nicht halten können
- 📊 **Transparenz:** Kunde weiß sofort, was machbar ist
- ⚖️ **Ressourcen-Optimierung:** Kapazität und Material optimal nutzen
- 💰 **Kostenersparnis:** Keine Notfall-Bestellungen oder Rush-Orders

Mehr zu ATP: [08-ATP-und-CTP.md](./08-ATP-und-CTP.md)

---

### 2.4 DELIVER (Liefern)

#### Was ist das?

In der **Vollversion** umfasst DELIVER die Distribution der fertigen Bikes zu **6 internationalen Märkten**:
- Deutschland
- Frankreich
- Spanien
- Italien
- Österreich
- Schweiz

Mit Berücksichtigung von:
- Regionaler Nachfrage
- Transportkosten
- Zollabwicklung
- Lagerhaltung in lokalen Distribution Centers

#### In unserer Code-Ermäßigung

✂️ **DELIVER-Prozess ENTFÄLLT**

**Warum?**
- 90% weniger Komplexität
- Fokus auf die Kernprozesse (PLAN, SOURCE, MAKE)
- Bessere Präsentierbarkeit
- Konzentration auf die schwierigsten Konzepte

**Vereinfachung:**
- Bikes werden direkt ab Werk Dortmund verkauft
- Keine Outbound-Logistik
- Keine Marktverteilung

**Was das bedeutet:**
- Wir können uns voll auf Beschaffung und Produktion konzentrieren
- Das sind die Bereiche mit den größten Herausforderungen (49 Tage Vorlaufzeit!)
- Die Supply Chain endet bei uns mit der fertigen Produktion

---

### 2.5 RETURN (Rückgabe)

#### Was ist das?

In der **Vollversion** umfasst RETURN:
- Reklamationen von Kunden
- Retouren und Umtausch
- Garantiefälle
- Rücksendung an Zulieferer (fehlerhafte Teile)

#### In unserer Code-Ermäßigung

✂️ **RETURN-Prozess ENTFÄLLT**

**Warum?**
- Fokus auf Kernkonzepte
- Retouren sind ein nachgelagerter Prozess
- In der Praxis < 5% der Fälle
- Würde Komplexität erhöhen ohne Lerneffekt

**Was das bedeutet:**
- Wir gehen von perfekter Qualität aus
- Keine Rückläufer in der Planung
- Alle produzierten Bikes werden verkauft

---

## 3. SCOR-Metriken: Erfolg messen

Ein SCM-System ist nur gut, wenn man seinen **Erfolg messen** kann. Das SCOR-Modell definiert **5 Performance-Kategorien** mit jeweils mehreren KPIs (Key Performance Indicators).

```
┌──────────────────────────────────────────────────────────┐
│  DIE 5 SCOR-KATEGORIEN                                   │
├──────────────────────────────────────────────────────────┤
│  1. Reliability     → Können wir liefern?                │
│  2. Responsiveness  → Wie schnell sind wir?              │
│  3. Agility         → Wie flexibel sind wir?             │
│  4. Cost            → Was kostet uns das?                │
│  5. Assets          → Wie effizient nutzen wir Kapital?  │
└──────────────────────────────────────────────────────────┘
```

### 3.1 Reliability (Zuverlässigkeit)

**Frage:** *"Bekommen Kunden, was wir versprochen haben?"*

#### KPI 1: Perfect Order Fulfillment (POF)

**Definition:** Prozentsatz der Aufträge, die **perfekt** erfüllt wurden.

**"Perfekt" bedeutet:**
- ✓ Richtige Menge geliefert
- ✓ Richtige Variante geliefert
- ✓ Zur richtigen Zeit geliefert
- ✓ In richtiger Qualität (keine Mängel)

**Berechnung:**
```
POF = (Anzahl perfekter Aufträge / Gesamtzahl Aufträge) × 100%
```

**Beispiel:**
```
Monat April 2027:
├─ 200 Aufträge insgesamt
├─ 188 perfekt erfüllt
├─ 12 hatten Probleme:
│   ├─ 5× zu spät geliefert
│   ├─ 4× falsche Menge
│   ├─ 2× falsche Variante
│   └─ 1× Qualitätsmangel
│
└─ POF = 188 / 200 = 94%

Benchmark:
- Ziel: ≥95% (Adventure Works intern)
- Branche: 92% (Durchschnitt Fahrradindustrie)
- Best-in-Class: 98%

Status: 🟡 Gelb (knapp unter Ziel)
```

**Warum wichtig?**
- Direkter Impact auf Kundenzufriedenheit
- Jede nicht-perfekte Lieferung kostet Vertrauen
- Wiederkauf-Rate sinkt bei POF < 90%

#### KPI 2: Order Accuracy (Auftragsgenauigkeit)

**Definition:** Prozentsatz der Aufträge ohne Mengen- oder Variantenfehler.

**Berechnung:**
```
Order Accuracy = (Korrekte Aufträge / Gesamtzahl) × 100%
```

**Beispiel:**
```
100 Aufträge:
├─ 96 korrekt (richtige Menge, richtige Variante)
└─ 4 Fehler (falsche Menge oder Variante)

Order Accuracy = 96%

Ziel: ≥98%
```

---

### 3.2 Responsiveness (Reaktionsfähigkeit)

**Frage:** *"Wie schnell können wir liefern?"*

#### KPI 3: Order Cycle Time

**Definition:** Durchschnittliche Zeit von Bestelleingang bis Lieferung.

**Bei Adventure Works:**
```
Order Cycle Time = Durchschnitt über alle Aufträge

Beispiel 1: Material auf Lager
├─ Bestellung: 1. März
├─ ATP-Check: 1. März (sofort)
├─ Produktion: 2. März (1 Tag)
└─ Lieferung: 3. März
→ Cycle Time: 2 Tage ✅

Beispiel 2: Material muss bestellt werden
├─ Bestellung: 1. März
├─ Material fehlt!
├─ Nachbestellung China: 1. März
├─ Ankunft Material: 19. April (49 Tage)
├─ Produktion: 20. April (1 Tag)
└─ Lieferung: 21. April
→ Cycle Time: 51 Tage ❌

Durchschnitt Adventure Works: ~39 Tage
- Ziel: ≤49 Tage (China-Vorlauf als Benchmark)
- Best-in-Class: <30 Tage
```

**Warum wichtig?**
- Kürzere Cycle Time = zufriedenere Kunden
- Wettbewerbsvorteil (schneller als Konkurrenz)
- Höhere Flexibilität bei Marktänderungen

#### KPI 4: Production Cycle Time

**Definition:** Zeit von Produktionsstart bis fertiges Bike.

**Bei Adventure Works:**
```
Production Cycle Time = 325 Minuten (Durchlaufzeit)
                      ≈ 5,4 Stunden

Das ist die reine Produktionszeit pro Bike.
(Gesamtkapazität: 130 Bikes/h durch Fließband-Parallelität)

Ziel: <400 Minuten
Status: ✅ Grün (deutlich unter Ziel)
```

---

### 3.3 Agility (Flexibilität)

**Frage:** *"Wie gut reagieren wir auf Änderungen?"*

#### KPI 5: Upside Flexibility

**Definition:** Wie viel % mehr Produktion können wir in welcher Zeit bereitstellen?

**Bei Adventure Works:**
```
Szenario: Marketing-Kampagne führt zu +25% Nachfrage

Normalproduktion: 1.000 Bikes/Tag
Erhöhte Nachfrage: 1.250 Bikes/Tag (+250)

Wie erreichen wir das?
├─ Option 1: Überstunden
│   ├─ +2 Stunden pro Tag
│   ├─ 10h statt 8h
│   ├─ Kapazität: 130 × 10 = 1.300 Bikes/Tag ✓
│   └─ Kosten: +30% Lohnkosten (Überstundenzuschlag)
│
├─ Option 2: 2. Schicht einführen
│   ├─ Braucht: Personal anwerben + einarbeiten
│   ├─ Dauer: ~30 Tage
│   └─ ❌ Zu langsam für kurzfristige Aktion
│
└─ Option 3: Material-Engpass?
    ├─ Brauchen: +25% mehr Sättel
    ├─ Vorlaufzeit: 49 Tage
    └─ ⚠️  Muss 49 Tage vorher eingeplant sein!

Upside Flexibility Adventure Works:
- Kurzfristig (0-7 Tage): +20% möglich (Überstunden)
- Mittelfristig (8-30 Tage): +40% möglich (Material vorbestellen)
- Langfristig (>30 Tage): +100% möglich (2. Schicht)

Ziel: +20% in ≤20 Tagen
Status: 🟡 Gelb (21 Tage, knapp darüber)
```

#### KPI 6: Upside Adaptability

**Definition:** Maximale nachhaltige Produktionssteigerung in Tagen.

**Beispiel:**
```
Frage: Wie lange dauert es, Produktion dauerhaft zu verdoppeln?

Schritte:
├─ Personal einstellen: 30 Tage
├─ Personal schulen: 14 Tage
├─ 2. Schicht einführen: 7 Tage
├─ Material-Supply hochfahren: 49 Tage (limitierend!)
└─ Kapazität verdoppelt: Nach 49 Tagen

Upside Adaptability: 49 Tage für +100%
```

**Warum wichtig?**
- Märkte sind dynamisch (Trends, Wetter, Konkurrenz)
- Wer schneller reagiert, gewinnt Marktanteile
- Zu geringe Agility = verpasste Chancen

---

### 3.4 Cost (Kosten)

**Frage:** *"Was kostet uns die Supply Chain?"*

#### KPI 7: Total Supply Chain Cost

**Definition:** Prozentsatz vom Umsatz, der für Supply Chain draufgeht.

**Was zählt dazu?**
```
Total SC Cost umfasst:

1. Materialkosten (größter Posten!)
   ├─ Sättel von China: 45€ - 52€ pro Stück
   ├─ (Vereinfacht: weitere Komponenten)
   └─ ~60% der Gesamtkosten

2. Transportkosten
   ├─ LKW China → Hafen Shanghai
   ├─ Seefracht Shanghai → Hamburg: ~2.000€/Container
   └─ LKW Hamburg → Dortmund
   └─ ~5% der Gesamtkosten

3. Lagerkosten
   ├─ Lagerhaltung: 0,50€ pro Sattel/Monat
   ├─ Versicherung
   └─ Kapitalbindung
   └─ ~8% der Gesamtkosten

4. Produktionskosten
   ├─ Arbeitslöhne Montage
   ├─ Maschinenstunden
   └─ Energiekosten
   └─ ~20% der Gesamtkosten

5. SCM-System & Overhead
   ├─ Software-Lizenzen
   ├─ Personal (Planung, Einkauf)
   └─ ~7% der Gesamtkosten
```

**Berechnung:**
```
Beispiel Adventure Works 2027:

Umsatz pro Jahr: 100.000.000€ (100 Mio.)
SC-Kosten gesamt: 12.500.000€ (12,5 Mio.)

Total SC Cost = 12.500.000 / 100.000.000 = 12,5%

Benchmark:
- Ziel: ≤13% (Adventure Works intern)
- Branche: 14% (Durchschnitt)
- Best-in-Class: 10%

Status: ✅ Grün (unter Ziel)
```

**Warum wichtig?**
- Jedes Prozent weniger = mehr Gewinn
- Bei 100 Mio. Umsatz: 1% = 1 Mio. € Ersparnis!
- Optimierung ohne Qualitätsverlust ist der Schlüssel

#### KPI 8: Cost of Goods Sold (COGS)

**Definition:** Direkte Kosten pro produziertem Bike.

**Berechnung:**
```
COGS = Material + direkte Arbeit + direkte Overhead

Beispiel MTB Allrounder:
├─ Sattel (SAT_FT): 45€
├─ (Vereinfacht: weitere Teile): 150€
├─ Arbeit (Montage): 25€
└─ Overhead (Energie, etc.): 10€
────────────────────────────
COGS: 230€ pro Bike

Verkaufspreis: 450€
Gewinnmarge: 450 - 230 = 220€ (48,9%)

Ziel: COGS ≤250€
Status: ✅ Grün
```

---

### 3.5 Assets (Vermögenswerte)

**Frage:** *"Wie effizient nutzen wir unser Kapital?"*

#### KPI 9: Cash-to-Cash Cycle Time

**Definition:** Tage von "Geld ausgeben" bis "Geld wiederkommen".

**Der komplette Zyklus:**
```
┌────────────────────────────────────────────────────────────┐
│  CASH-TO-CASH CYCLE (ADVENTURE WORKS)                     │
└────────────────────────────────────────────────────────────┘

Tag 0:   💸 Wir BEZAHLEN Zulieferer
         ├─ Rechnung: 50.000€ für 10.000 Sättel
         └─ Geld ist WEG aus unserer Kasse

Tag 1-49: Warten auf Lieferung
         └─ Kapital "eingefroren", nicht nutzbar

Tag 50:  📦 Teile kommen an
         └─ Immer noch kein Geld zurück

Tag 50:  🏭 Produktion (1 Tag)
         └─ Weitere Kosten (Arbeit, Energie)

Tag 51:  ✅ Bikes fertig
         └─ An Händler verkauft & Rechnung gestellt
         └─ Aber: Händler zahlt nicht sofort!

Tag 51-56: Zahlungsziel Händler (5 Tage)
         └─ Standardvertrag: Zahlung innerhalb 5 Tage

Tag 56:  💰 Händler ZAHLT uns
         └─ Rechnung: 120.000€ für 1.000 Bikes
         └─ Geld ist ZURÜCK in unserer Kasse

────────────────────────────────────────────────────────────
Cash-to-Cash Cycle Time: 56 Tage
```

**Berechnung:**
```
C2C = Days Inventory Outstanding (DIO)
    + Days Sales Outstanding (DSO)
    - Days Payable Outstanding (DPO)

DIO = Ø Lagerdauer Material = 49 Tage (Vorlaufzeit)
DSO = Ø Zahlungsziel Kunden = 5 Tage
DPO = Ø Zahlungsziel Lieferanten = 0 Tage (sofort)

C2C = 49 + 5 - 0 = 54 Tage

(Vereinfacht: ~56 Tage in unserem System)

Ziel: ≤60 Tage
Status: ✅ Grün
```

**Warum wichtig?**
- Kürzerer Cycle = mehr Cashflow = mehr finanzielle Freiheit
- Lange Cycles = Liquiditätsrisiko
- Bei 56 Tagen: 12,5 Mio. € gebunden!

**Verbesserungspotential:**
```
Option 1: Zahlungsziel beim Zulieferer aushandeln
├─ Statt sofort zahlen: 30 Tage Ziel
├─ DPO = 30 Tage
└─ C2C = 49 + 5 - 30 = 24 Tage (!!!)

Option 2: Schnellerer Transport
├─ Luftfracht statt Seefracht
├─ Vorlaufzeit: 20 Tage statt 49
├─ ABER: 10× höhere Kosten
└─ Meist nicht wirtschaftlich
```

#### KPI 10: Inventory Days of Supply

**Definition:** Wie viele Tage können wir mit aktuellem Lagerbestand produzieren?

**Berechnung:**
```
Inventory Days = Lagerbestand / Tagesbedarf

Beispiel SAT_FT (Fizik Tundra):
├─ Lagerbestand: 5.000 Stück
├─ Tagesbedarf: 350 Stück (für ALLR + FREE)
└─ Inventory Days = 5.000 / 350 = 14,3 Tage

Das bedeutet:
- Wir können 14 Tage produzieren ohne Nachschub
- Sicherheitspuffer gegen Lieferverzögerungen

Ziel: 10-20 Tage (Balance zwischen Sicherheit und Kosten)
- <10 Tage: Riskant (zu wenig Puffer)
- >20 Tage: Teuer (zu viel Lagerkosten)

Status: ✅ Grün (in optimaler Range)
```

**Warum wichtig?**
- Zu wenig Lager = Produktionsausfälle
- Zu viel Lager = hohe Lagerkosten + Kapitalbindung
- Optimum finden ist entscheidend

---

## 4. ATP vs CTP

### Was ist der Unterschied?

**ATP (Available To Promise)** und **CTP (Capable To Promise)** sind zwei Methoden, um Liefertermine zuzusagen.

```
┌─────────────────────────────────────────────────────────────┐
│  ATP vs CTP - DER UNTERSCHIED                               │
└─────────────────────────────────────────────────────────────┘

ATP: "Was können wir mit AKTUELLEM Bestand versprechen?"
├─ Prüft: Material im Lager JETZT
├─ Prüft: Kapazität verfügbar JETZT
└─ Ergebnis: "Ja, können wir sofort" oder "Nein, geht nicht"

CTP: "Was können wir versprechen, WENN wir Material bestellen?"
├─ Prüft: Material bestellen möglich?
├─ Prüft: Wann kommt Material an? (+49 Tage)
├─ Prüft: Kapazität nach Materialeintreffen
└─ Ergebnis: "Ja, aber erst am [Datum X]"
```

### Beispiel im Vergleich

**Kundenanfrage:**
- Variante: MTB Competition
- Menge: 1.500 Bikes
- Gewünschter Termin: 1. Mai 2027
- Heute: 20. April 2027

#### ATP-Check (Available To Promise)

```
1️⃣ Material verfügbar?
   Benötigt: 1.500 × SAT_RL
   Lagerbestand: 800 × SAT_RL
   Status: ❌ FEHLT (nur 800 verfügbar)

ERGEBNIS ATP: 
❌ "Wir können nur 800 Bikes zum 1. Mai liefern"
❌ "Für 1.500 Bikes: Nicht machbar mit aktuellem Bestand"
```

#### CTP-Check (Capable To Promise)

```
1️⃣ Material beschaffen möglich?
   Benötigt: 1.500 × SAT_RL
   Lagerbestand: 800 × SAT_RL
   Fehlmenge: 700 × SAT_RL
   
2️⃣ Nachbestellung:
   Heute: 20. April
   Bestellung: 700 Sättel (2× Losgröße = 1.000)
   Vorlaufzeit: 49 Tage
   Ankunft: 8. Juni
   
3️⃣ Produktion:
   Material vollständig: 8. Juni
   Produktion: 9. Juni (1 Tag)
   
ERGEBNIS CTP:
✅ "Wir können 800 Bikes zum 1. Mai liefern" (ATP)
✅ "Die restlichen 700 Bikes am 9. Juni" (CTP)

Alternative für Kunde:
🔄 "ALLE 1.500 Bikes zusammen am 9. Juni?"
```

### Wann welche Methode?

**ATP nutzen:**
- ✅ Wenn du schnelle Zusage brauchst
- ✅ Wenn Kunde sofort liefern will
- ✅ Für Standard-Aufträge ohne Vorlaufzeit
- ✅ "Express-Bestellungen"

**CTP nutzen:**
- ✅ Wenn Kunde flexibel ist
- ✅ Für Großaufträge (Material kann bestellt werden)
- ✅ Für langfristige Planung (mehrere Monate im Voraus)
- ✅ "Wir finden einen Termin"

**Adventure Works Strategie:**
```
1. Immer zuerst ATP prüfen (schnellste Option)
   ├─ Wenn ATP erfolgreich: Zusage sofort!
   └─ Wenn ATP fehlschlägt: ↓

2. Dann CTP prüfen (mit Nachbestellung)
   ├─ Kunde fragen: "Wartezeit akzeptabel?"
   ├─ Wenn ja: CTP-Termin zusagen
   └─ Wenn nein: FCFS-Priorisierung

3. Bei Material-Engpass: FCFS-Regel
   └─ Älteste Bestellung = höchste Priorität
```

Mehr Details: [08-ATP-und-CTP.md](./08-ATP-und-CTP.md)

---

## 5. FCFS-Regel (First-Come-First-Serve)

### Was ist FCFS?

**First-Come-First-Serve** - "Wer zuerst kommt, mahlt zuerst"

Eine einfache **Priorisierungsregel** bei Engpässen: Aufträge werden in der Reihenfolge ihres Eingangs abgearbeitet.

### Warum FCFS?

In der **Vollversion** des SCM-Systems würde man einen **Solver** nutzen:
- Optimierung nach Deckungsbeitrag
- Optimierung nach Priorität
- Optimierung nach Liefertermin
- Komplexe mathematische Modelle (Linear Programming)

In unserer **Code-Ermäßigung** nutzen wir FCFS:
- ✂️ 90% weniger Komplexität
- ✅ Leicht verständlich
- ✅ Fair für alle Kunden
- ✅ Einfach zu implementieren

### Beispiel

**Situation:**
- Lagerbestand SAT_FT: 1.000 Stück
- 3 Aufträge kommen am gleichen Tag:

```
Auftrag A: 800 × MTB Allrounder (SAT_FT)
Auftrag B: 500 × MTB Freeride (SAT_FT)
Auftrag C: 300 × MTB Allrounder (SAT_FT)

Gesamt benötigt: 1.600 SAT_FT
Verfügbar: 1.000 SAT_FT
Fehlmenge: 600 SAT_FT
```

**Lösung mit FCFS:**

```
1. Sortieren nach Eingangszeit:
   ├─ 08:00 Uhr: Auftrag A (800 Stück)
   ├─ 10:00 Uhr: Auftrag B (500 Stück)
   └─ 14:00 Uhr: Auftrag C (300 Stück)

2. Abarbeiten in Reihenfolge:
   ├─ Auftrag A: 800 Stück → ✅ Vollständig erfüllt
   │   └─ Restbestand: 1.000 - 800 = 200 Stück
   │
   ├─ Auftrag B: 500 Stück benötigt
   │   ├─ Nur 200 verfügbar
   │   ├─ ⚠️  Teillieferung: 200 Stück sofort
   │   └─ 📅 Rest (300 Stück) wartet auf Nachschub
   │
   └─ Auftrag C: 300 Stück benötigt
       ├─ ❌ Kein Material mehr
       └─ 📅 Wartet auf Nachschub (nach Auftrag B)

3. Nachbestellung:
   ├─ Bestellung: 1.000 Sättel (2× Losgröße)
   ├─ Vorlaufzeit: 49 Tage
   └─ Ankunft: In 49 Tagen
   
4. Nach Nachschub-Ankunft:
   ├─ 1. Priorität: Auftrag B (300 Stück offen)
   └─ 2. Priorität: Auftrag C (300 Stück offen)
```

### Alternative: Solver-Optimierung (nicht implementiert)

**Wie würde ein Solver entscheiden?**

```
Annahme: Verschiedene Deckungsbeiträge

Auftrag A: 800 × ALLR, Gewinn 200€/Bike = 160.000€
Auftrag B: 500 × FREE, Gewinn 250€/Bike = 125.000€
Auftrag C: 300 × ALLR, Gewinn 200€/Bike = 60.000€

Solver-Optimierung (nach Gewinn):
1. Auftrag A: 160.000€ → Höchste Priorität
2. Auftrag B: 125.000€ → Zweite Priorität
3. Auftrag C: 60.000€ → Letzte Priorität

ABER: Ist das fair?
- Kunde C hat evt. schon lange gewartet
- Fokus auf Gewinn kann Kundenbindung schaden
- Komplexität steigt enorm
```

### Warum FCFS für uns besser ist

**Vorteile:**
- ✅ **Fair:** Alle Kunden gleichbehandelt
- ✅ **Transparent:** Jeder weiß, woran er ist
- ✅ **Einfach:** Keine komplexen Berechnungen
- ✅ **Implementierbar:** In wenigen Stunden programmiert
- ✅ **Präsentierbar:** Leicht zu erklären

**Nachteile:**
- ❌ Keine Optimierung nach Gewinn
- ❌ Keine Berücksichtigung von Prioritäten
- ❌ Nicht optimal für Business

**Fazit:** Für ein Lehr-Projekt perfekt! Für die Realität würde man einen Solver nutzen.

Mehr dazu: [09-FCFS-und-Priorisierung.md](./09-FCFS-und-Priorisierung.md)

---

## 6. Weiterführende Themen

Jetzt verstehst du die Grundlagen! In den nächsten Kapiteln vertiefen wir einzelne Aspekte:

### Nächste Schritte:

1. **[Produktstruktur](./03-Produktstruktur.md)**
   - Die 8 MTB-Varianten im Detail
   - Stücklisten und Sattel-Zuordnung
   - Marktanteile und Nachfrageverteilung

2. **[Zeitparameter](./04-Zeitparameter.md)**
   - Vorlaufzeiten detailliert
   - Arbeitstage vs Kalendertage
   - Feiertags-Berechnung
   - Error Management bei Rundungen

3. **[Saisonalität](./05-Saisonalitaet.md)**
   - Monatliche Nachfrageverteilung
   - Warum April 16% und Dezember 3%?
   - Impact auf Produktionsplanung

4. **[Feiertage und Constraints](./06-Feiertage-und-Constraints.md)**
   - Spring Festival 2027
   - Deutsche Feiertage (NRW)
   - Losgrößen und Lieferintervalle
   - Kapazitätsgrenzen

5. **[Szenarien-Analyse](./07-Szenarien.md)**
   - Marketing-Kampagne (+25% Nachfrage)
   - Maschinenausfall in China (5 Tage)
   - Wasserschaden im Lager (30% Verlust)
   - Schiffsverzögerung (+7 Tage Transport)

6. **[ATP und CTP](./08-ATP-und-CTP.md)**
   - Detaillierte Algorithmen
   - Beispiele aus der Praxis
   - Implementierung

7. **[FCFS und Priorisierung](./09-FCFS-und-Priorisierung.md)**
   - FCFS-Algorithmus
   - Vergleich mit Solver-Optimierung
   - Vor- und Nachteile

8. **[Implementierung](./10-Implementierung.md)**
   - Code-Struktur
   - TypeScript-Details
   - JSON-Datenmodelle

---

[[◀ Zurück: Aufgabenstellung](./01-Aufgabenstellung.md)] | [[Weiter: Produktstruktur ▶](./03-Produktstruktur.md)]

---

**Stand:** Letzte Aktualisierung basierend auf PROJEKTERKLAERUNG.md  
**Autor:** WI3 Supply Chain Management Team  
**Zweck:** Didaktische Aufbereitung der Supply Chain Konzepte für Anfänger