# 📖 Glossar - Supply Chain Management Fachbegriffe

> **Alle wichtigen Begriffe erklärt - von A bis Z**

---

## 📍 Navigation

← [06-Bewertungskriterien.md](06-Bewertungskriterien.md) | [🏠 Hauptseite](README.md) | [01-Aufgabenstellung.md](01-Aufgabenstellung.md) →

---

## 📑 Inhaltsverzeichnis (alphabetisch)

[**A**](#a) | [**B**](#b) | [**C**](#c) | [**D**](#d) | [**E**](#e) | [**F**](#f) | [**G**](#g) | [**I**](#i) | [**J**](#j) | [**K**](#k) | [**L**](#l) | [**M**](#m) | [**N**](#n) | [**O**](#o) | [**P**](#p) | [**R**](#r) | [**S**](#s) | [**T**](#t) | [**V**](#v) | [**W**](#w) | [**Z**](#z)

---

## A

### **Arbeitstage (AT)**

**Definition:** Tage, an denen tatsächlich gearbeitet wird (Montag-Freitag, ohne Feiertage).

**Beispiel:** 
```
01.01.2027 (Neujahr) = Feiertag → KEIN Arbeitstag
02.01.2027 (Samstag) = Wochenende → KEIN Arbeitstag
03.01.2027 (Sonntag) = Wochenende → KEIN Arbeitstag
04.01.2027 (Montag) = Normaler Tag → ARBEITSTAG
```

**Wichtig:** Bei Vorlaufzeit-Berechnung zählen NUR Arbeitstage!
- China-Zulieferer: 2 AT Bestellbearbeitung + 30 KT Seetransport + 2 AT LKW = 49 Gesamttage
- Material-Check: NUR an Arbeitstagen, Wochenenden zeigen "-" (nicht "Nein")

**Siehe auch:** [Kalendertage (KT)](#kalendertage-kt), [Vorlaufzeit](#vorlaufzeit)

---

### **ATP (Available To Promise)**

**Definition:** Verfügbarkeitsprüfung, die garantiert, dass ein Produkt zum versprochenen Termin geliefert werden kann.

**Prüfung umfasst:**
1. ✅ **Bauteil-Verfügbarkeit:** Sind alle Komponenten (Sättel) im Lager?
2. ✅ **Kapazitäts-Check:** Ist die Produktionskapazität frei?
3. ✅ **Termin-Check:** Kann der Liefertermin eingehalten werden?

**Beispiel:**
```
Produktionsauftrag: 100 Allrounder MTBs am 15.01.2027

ATP-Check:
✅ Sättel verfügbar: 150 Stück im Lager
✅ Kapazität frei: 200 Bikes/Tag möglich
✅ Termin machbar: Ja
→ Status: PRODUKTIONSSTART OK
```

**Unterschied zu CTP:** ATP ist konservativer (nur existierende Bestände), CTP berücksichtigt auch zukünftige Lieferungen.

**Siehe auch:** [CTP](#ctp-capable-to-promise), [FCFS](#fcfs-first-come-first-serve), [Sicherheitsbestand](#sicherheitsbestand)

---

## B

### **Bedarfsrechnung**

**Definition:** Berechnung, wann welche Bauteile in welcher Menge benötigt werden.

**Ablauf:**
1. **OEM Planung:** Wann werden wie viele Bikes produziert?
2. **Stückliste:** Welche Teile braucht jedes Bike?
3. **Bedarfsermittlung:** Multiplikation der beiden
4. **Vorlaufzeit:** Bestellung rechtzeitig auslösen

**Beispiel:**
```
Tag 15: 300 Allrounder geplant
Stückliste: 1 Sattel pro Bike
→ Bedarf: 300 Sättel am Tag 15

Vorlaufzeit: 49 Tage
→ Bestellung muss am Tag -34 (November 2026) erfolgen!
```

**Siehe auch:** [Stückliste](#stückliste-bom), [Vorlaufzeit](#vorlaufzeit), [OEM](#oem-original-equipment-manufacturer)

---

### **BOM (Bill of Materials)**

**Siehe:** [Stückliste](#stückliste-bom)

---

## C

### **CTP (Capable To Promise)**

**Definition:** Erweiterte Verfügbarkeitsprüfung, die auch **zukünftige** Lieferungen und Kapazitäten berücksichtigt.

**Unterschied zu ATP:**
- **ATP:** "Kann ich das JETZT produzieren?" (nur aktueller Bestand)
- **CTP:** "Kann ich das bis zu diesem Termin schaffen?" (inkl. eintreffende Lieferungen)

**Beispiel:**
```
Kundenauftrag: 500 Bikes am 20.01.2027

ATP-Check (15.01.):
❌ Nur 300 Sättel im Lager → NICHT machbar

CTP-Check (15.01.):
✅ 300 Sättel aktuell + 500 Sättel Lieferung am 17.01.
✅ Gesamt: 800 Sättel verfügbar bis 20.01.
→ Status: MACHBAR
```

**Siehe auch:** [ATP](#atp-available-to-promise)

---

## D

### **Deckungsbeitrag**

**Definition:** Gewinn pro verkauftem Bike nach Abzug variabler Kosten (Material, Transport).

**Berechnung:**
```
Deckungsbeitrag = Verkaufspreis - Variable Kosten
```

**Beispiel (Competition MTB):**
```
Verkaufspreis: 800€
Variable Kosten:
  - Sattel: 15€
  - Andere Teile: 285€
  - Transport: 50€
  - Gesamt: 350€

Deckungsbeitrag = 800€ - 350€ = 450€ pro Bike
```

**Wichtig im Projekt:**
- Bei **Solver-Optimierung** (Vollversion): Maximiere Deckungsbeitrag
- Bei **FCFS** (Ermäßigung): Keine Optimierung nach Deckungsbeitrag

**Siehe auch:** [FCFS](#fcfs-first-come-first-serve)

---

## E

### **Error Management**

**Definition:** Technik zur Vermeidung systematischer Rundungsfehler bei Tagesproduktionsberechnung.

**Problem:**
```
370.000 Bikes / 365 Tage = 1.013,698... Bikes/Tag
→ Naive Rundung: 1.014 * 365 = 370.110 Bikes
→ Fehler: +110 Bikes pro Jahr! ❌
```

**Lösung (kumulativ):**
```javascript
let fehler = 0.0;

for (let tag = 1; tag <= 365; tag++) {
  const soll = (370000 / 365) * saisonFaktor;
  fehler += (soll - Math.round(soll));
  
  // Korrektur bei Überschreitung ±0.5
  let produktion;
  if (fehler >= 0.5) {
    produktion = Math.ceil(soll);  // Aufrunden
    fehler -= 1.0;
  } else if (fehler <= -0.5) {
    produktion = Math.floor(soll); // Abrunden
    fehler += 1.0;
  } else {
    produktion = Math.round(soll);
  }
}

// Garantie: Summe = exakt 370.000! ✅
```

**Wichtig:** MUSS für jede MTB-Variante separat geführt werden!

**Siehe auch:** [Saisonalität](#saisonalität), [OEM Planung](#oem-original-equipment-manufacturer)

---

### **Ermäßigungen**

**Definition:** Code-Vereinfachungen, die Komplexität reduzieren ohne Kernkonzepte zu verlieren.

**Aktive Ermäßigungen im Projekt:**

| **Aspekt** | **Vollversion** | **Ermäßigung (Code)** |
|------------|----------------|----------------------|
| Zulieferer | 3 (China, Spanien, Deutschland) | 1 (nur China) |
| Bauteile | Sättel, Gabeln, Rahmen | Nur Sättel (4 Varianten) |
| Transport | Schiff, Bahn, LKW | Nur Schiff + LKW |
| Märkte | 6 (Europa, USA, Asien, ...) | Keine (kein Outbound) |
| Optimierung | Excel Solver | FCFS (First-Come-First-Serve) |

**Vorteil:** 
- 90% weniger Komplexität
- Fokus auf Kernkonzepte (ATP, Error Management, Frozen Zone)
- Bessere Präsentierbarkeit

**WICHTIG:** Alle anderen Anforderungen (A1-A13) bleiben vollständig!

**Siehe auch:** [FCFS](#fcfs-first-come-first-serve)

---

## F

### **FCFS (First-Come-First-Serve)**

**Definition:** Priorisierungs-Strategie bei Engpässen - älteste Bestellung hat höchste Priorität.

**Prinzip:**
```
Bestellung A: 10.01.2027 → Priorität 1
Bestellung B: 12.01.2027 → Priorität 2
Bestellung C: 15.01.2027 → Priorität 3

Bei Teilengpass: A wird ZUERST beliefert
```

**Beispiel:**
```
Verfügbare Sättel: 500 Stück
Bestellung A (10.01.): 300 Bikes → 300 Sättel
Bestellung B (12.01.): 400 Bikes → 400 Sättel
Gesamt benötigt: 700 Sättel

FCFS-Lösung:
✅ A bekommt 300 Sättel (vollständig erfüllt)
⚠️ B bekommt 200 Sättel (nur 50% erfüllt)
→ Restliche 200 Sättel für B: Warten auf nächste Lieferung
```

**Alternative (Vollversion):** Excel Solver optimiert nach Deckungsbeitrag

**Siehe auch:** [ATP](#atp-available-to-promise), [Deckungsbeitrag](#deckungsbeitrag)

---

### **Feiertage**

**Definition:** Tage ohne Arbeit, die bei Vorlaufzeit und Produktion berücksichtigt werden müssen.

**Deutschland (NRW):**
```
01.01. - Neujahr
06.04. - Karfreitag
09.04. - Ostermontag
01.05. - Tag der Arbeit
17.05. - Christi Himmelfahrt
28.05. - Pfingstmontag
03.10. - Tag der Deutschen Einheit
25.12. - 1. Weihnachtstag
26.12. - 2. Weihnachtstag
```

**China:**
```
28.01. - 04.02.2027: Spring Festival (8 Tage!)
```

**Auswirkungen:**
- ❌ Keine Produktion beim Zulieferer
- ❌ Keine Bestellannahme
- ❌ Keine LKW-Transporte
- ✅ Seetransport läuft weiter (Schiff ist unterwegs)

**Siehe auch:** [Spring Festival](#spring-festival), [Arbeitstage](#arbeitstage-at)

---

### **Frozen Zone**

**Definition:** Zeitraum in der Vergangenheit, in dem keine Änderungen mehr möglich sind (fixierte Daten).

**Konzept:**
```
01.01.2027 ────────[ HEUTE ]──────── 31.12.2027
              │
    VERGANGENHEIT       ZUKUNFT
    (Frozen Zone)    (Planning Zone)
    - IST-Werte         - PLAN-Werte
    - Fixiert           - Änderbar
    - Grau/Gelb         - Normal/Grün
```

**Beispiel (Heute = 15.04.2027):**
```
10.04.2027: Frozen Zone → Produktion = 1.200 Bikes (fixiert)
15.04.2027: HEUTE
20.04.2027: Planning Zone → Produktion = 1.300 Bikes (änderbar)
```

**UI-Darstellung:**
- ✏️ **Disabled Input:** Felder in Vergangenheit ausgegraut
- 🟡 **Gelbe Markierung:** Visualisierung der Frozen Zone
- 📊 **IST vs. PLAN:** Vergangenheit = IST, Zukunft = PLAN

**Anforderung:** A11 (Explizit gefordert!)

**Siehe auch:** [OEM Planung](#oem-original-equipment-manufacturer)

---

## G

### **Gesamtvorlaufzeit**

**Siehe:** [Vorlaufzeit](#vorlaufzeit)

---

## I

### **Inbound Logistik**

**Definition:** Transport von Bauteilen vom Zulieferer zum OEM-Werk (Adventure Works).

**Route (China → Dortmund):**
```
1. Zulieferer (China): Bestellbearbeitung (2 AT)
2. Transport zum Hafen: Inkl. in LKW-Phase
3. Seetransport: China → Hamburg (30 KT)
4. LKW-Transport: Hamburg → Dortmund (2 AT)

Gesamt: 2 AT + 30 KT + 2 AT = 49 Tage
```

**Wichtig:**
- Seetransport = Kalendertage (KT) - läuft auch am Wochenende!
- LKW-Transport = Arbeitstage (AT) - nur Mo-Fr

**Siehe auch:** [Vorlaufzeit](#vorlaufzeit), [Outbound Logistik](#outbound-logistik)

---

## J

### **Jahresproduktion**

**Definition:** Gesamtanzahl produzierter Bikes im Jahr 2027.

**Wert:** 370.000 Bikes (NICHT 185.000 - das war die alte Aufgabe!)

**Verteilung auf Varianten:**
```
Allrounder:  30% = 111.000 Bikes
Competition: 15% =  55.500 Bikes
Downhill:    10% =  37.000 Bikes
Trail:       15% =  55.500 Bikes
Enduro:      10% =  37.000 Bikes
Cross:       10% =  37.000 Bikes
Fat Bike:     5% =  18.500 Bikes
E-MTB:        5% =  18.500 Bikes
──────────────────────────────
Gesamt:     100% = 370.000 Bikes
```

**Quelle:** `src/data/stammdaten.json`

**Siehe auch:** [MTB-Varianten](#mtb-varianten), [Saisonalität](#saisonalität)

---

## K

### **Kalendertage (KT)**

**Definition:** Alle Tage inklusive Wochenenden und Feiertagen (durchlaufende Tage).

**Beispiel:**
```
Seetransport China → Hamburg: 30 Kalendertage
→ Läuft durch, auch an Wochenenden und Feiertagen
→ Schiff fährt 24/7
```

**Vergleich:**
- **Arbeitstage (AT):** Nur Mo-Fr, ohne Feiertage
- **Kalendertage (KT):** Alle Tage ohne Ausnahme

**Siehe auch:** [Arbeitstage](#arbeitstage-at), [Vorlaufzeit](#vorlaufzeit)

---

### **Kapazitätsauslastung**

**Definition:** Verhältnis von tatsächlicher Produktion zu maximaler Produktionskapazität.

**Berechnung:**
```
Kapazitätsauslastung = (IST-Produktion / Max. Kapazität) * 100%
```

**Beispiel:**
```
Tageskapazität: 2.000 Bikes/Tag
IST-Produktion: 1.400 Bikes/Tag

Auslastung = (1.400 / 2.000) * 100% = 70%
```

**Interpretation:**
- **< 70%:** Unterauslastung (Fixkosten nicht optimal verteilt)
- **70-90%:** Optimal (Reserve für Spitzen)
- **> 95%:** Kritisch (kein Puffer bei Störungen)

**SCOR-Metrik:** Asset Management Category

**Siehe auch:** [SCOR-Modell](#scor-modell), [Produktionskapazität](#produktionskapazität)

---

## L

### **Lagerbestand**

**Definition:** Anzahl verfügbarer Bauteile im Warehouse (Lager) zu einem bestimmten Zeitpunkt.

**Berechnung:**
```
Lagerbestand[Tag N] = 
  Lagerbestand[Tag N-1] 
  + Eingehende Lieferungen[Tag N]
  - Verbrauch für Produktion[Tag N]
```

**Beispiel:**
```
Tag 10: 1.000 Sättel im Lager
Tag 11: 
  + 500 Sättel Lieferung
  - 300 Sättel Verbrauch (300 Bikes produziert)
  = 1.200 Sättel Endbestand
```

**Kritisch:**
- ❌ **Negativer Bestand:** NIEMALS erlaubt! (ATP-Check verhindert dies)
- ⚠️ **Hoher Bestand:** Bindet Kapital, kostet Lagermiete
- ✅ **Optimaler Bestand:** Just-in-Time (Sicherheitsbestand = 0 in diesem Projekt)

**Siehe auch:** [ATP](#atp-available-to-promise), [Sicherheitsbestand](#sicherheitsbestand)

---

### **Lagerkosten**

**Definition:** Kosten für die Aufbewahrung von Bauteilen im Warehouse.

**Berechnung:**
```
Lagerkosten = Durchschnittlicher Lagerbestand * Lagerkostensatz * Zeitraum
```

**Beispiel:**
```
Durchschnitt: 5.000 Sättel
Lagerkostensatz: 0,50€ pro Sattel/Monat
Zeitraum: 12 Monate

Jährliche Lagerkosten = 5.000 * 0,50€ * 12 = 30.000€
```

**SCOR-Metrik:** Inventory Carrying Cost (Cost Category)

**Siehe auch:** [SCOR-Modell](#scor-modell)

---

### **Liefertreue (Perfect Order Fulfillment)**

**Definition:** Prozentsatz der Aufträge, die vollständig, pünktlich und fehlerfrei geliefert wurden.

**Berechnung:**
```
Liefertreue = (Perfekte Aufträge / Gesamt Aufträge) * 100%
```

**Perfekter Auftrag bedeutet:**
- ✅ Vollständige Menge geliefert
- ✅ Zum vereinbarten Termin
- ✅ Keine Qualitätsmängel
- ✅ Korrekte Dokumentation

**Beispiel:**
```
Gesamt: 1.000 Aufträge
Perfekt erfüllt: 946 Aufträge
Teilweise erfüllt: 54 Aufträge

Liefertreue = (946 / 1.000) * 100% = 94,6%
```

**Benchmark:**
- **< 90%:** Kritisch
- **90-95%:** Akzeptabel
- **> 95%:** Exzellent

**SCOR-Metrik:** #1 in Reliability Category (wichtigste KPI!)

**Siehe auch:** [SCOR-Modell](#scor-modell), [On-Time Delivery](#on-time-delivery)

---

### **Losgröße**

**Definition:** Feste Bestellmenge, in der Bauteile beim Zulieferer bestellt werden.

**China-Zulieferer:** 500 Sättel pro Los (Minimum Order Quantity)

**Beispiel:**
```
Tagesbedarf: 740 Sättel

Naive Bestellung: 740 Sättel → NICHT möglich! ❌
Korrekt: 2 Lose = 1.000 Sättel → Überhang 260 Sättel ✅
```

**Berechnung:**
```javascript
const losgroesse = 500;
const bedarf = 740;
const anzahlLose = Math.ceil(bedarf / losgroesse); // 2 Lose
const bestellmenge = anzahlLose * losgroesse;       // 1.000 Sättel
```

**Wichtig:**
- Losgröße gilt für **TAGESGESAMTMENGE** aller Varianten
- NICHT pro einzelne Variante aufrunden!
- Führt zu realistischen, "unrunden" Zahlen

**Siehe auch:** [Bedarfsrechnung](#bedarfsrechnung), [Inbound Logistik](#inbound-logistik)

---

## M

### **Material-Check**

**Definition:** Tägliche Prüfung, ob ausreichend Bauteile für die geplante Produktion vorhanden sind.

**Ablauf:**
```
Für jeden Produktionstag:
1. Lese geplante Produktion aus OEM Planung
2. Prüfe Lagerbestand für benötigte Bauteile
3. Entscheidung:
   ✅ "Ja"  - Genug Material, Produktion startet
   ❌ "Nein" - Zu wenig Material, Produktion pausiert
   - "-"    - Wochenende/Feiertag (keine Produktion)
```

**Beispiel:**
```
Tag 15 (Mittwoch):
  Geplant: 300 Allrounder
  Benötigt: 300 Sättel
  Lager: 450 Sättel
  → Material-Check: ✅ "Ja"

Tag 16 (Donnerstag):
  Geplant: 500 Allrounder
  Benötigt: 500 Sättel
  Lager: 150 Sättel (nach Tag 15)
  → Material-Check: ❌ "Nein"

Tag 17 (Samstag):
  → Material-Check: "-" (Wochenende)
```

**Wichtig:** Bei "Nein" greift FCFS-Priorisierung!

**Siehe auch:** [ATP](#atp-available-to-promise), [FCFS](#fcfs-first-come-first-serve)

---

### **MTB-Varianten**

**Definition:** Die 8 verschiedenen Mountain Bike Typen, die Adventure Works produziert.

**Übersicht:**

| **Variante** | **Code** | **Jahresanteil** | **Jahresproduktion** | **Preis** |
|-------------|----------|------------------|----------------------|-----------|
| Allrounder  | ALLR     | 30%              | 111.000 Bikes        | 600€      |
| Competition | COMP     | 15%              | 55.500 Bikes         | 800€      |
| Downhill    | DOWN     | 10%              | 37.000 Bikes         | 1.000€    |
| Trail       | TRAI     | 15%              | 55.500 Bikes         | 700€      |
| Enduro      | ENDU     | 10%              | 37.000 Bikes         | 900€      |
| Cross       | CROS     | 10%              | 37.000 Bikes         | 650€      |
| Fat Bike    | FATB     | 5%               | 18.500 Bikes         | 750€      |
| E-MTB       | EMTB     | 5%               | 18.500 Bikes         | 1.500€    |

**Charakteristika:**
- **Allrounder:** Bestseller (30%), Einsteigermodell
- **Competition:** Rennsport, leicht, teuer
- **Downhill:** Extrem robust, für Abfahrten
- **E-MTB:** Elektroantrieb, höchster Preis

**Quelle:** `src/data/stammdaten.json`

**Siehe auch:** [Jahresproduktion](#jahresproduktion), [Stückliste](#stückliste-bom)

---

## N

### **Netto-Bedarf**

**Definition:** Tatsächlich zu bestellende Menge unter Berücksichtigung vorhandener Lagerbestände.

**Berechnung:**
```
Netto-Bedarf = Brutto-Bedarf - Verfügbarer Lagerbestand
```

**Beispiel:**
```
Brutto-Bedarf: 1.000 Sättel (für Produktion)
Lagerbestand: 300 Sättel
Netto-Bedarf: 1.000 - 300 = 700 Sättel

Mit Losgröße 500:
→ 2 Lose bestellen = 1.000 Sättel
```

**Siehe auch:** [Bedarfsrechnung](#bedarfsrechnung), [Losgröße](#losgröße)

---

## O

### **OEM (Original Equipment Manufacturer)**

**Definition:** Hersteller, der fertige Produkte aus zugekauften Komponenten montiert (NICHT selbst produziert).

**Analogie:**
```
❌ KEIN OEM: Bäcker backt Brot aus Mehl, Wasser, Hefe (selbst hergestellt)
✅ OEM: IKEA-Küche aus zugekauften Schränken zusammengebaut
```

**Adventure Works als OEM:**
- ❌ Produziert KEINE Sättel, Gabeln, Rahmen selbst
- ✅ Kauft fertige Komponenten von Zulieferern
- ✅ Montiert sie zu Mountain Bikes

**Vorteil:**
- Spezialisierung auf Kernkompetenz (Montage, Design)
- Geringere Investitionskosten (keine Produktionsanlagen für Teile)
- Flexibilität bei Zuliefererwahl

**Siehe auch:** [Bedarfsrechnung](#bedarfsrechnung), [Inbound Logistik](#inbound-logistik)

---

### **OEM Planung**

**Definition:** Zentrale Produktionsplanung, die festlegt, wann welche MTB-Variante in welcher Menge produziert wird.

**Basis für:**
- ✅ Bedarfsrechnung (Wann müssen Teile bestellt werden?)
- ✅ Warehouse (Wie entwickelt sich Lagerbestand?)
- ✅ Produktionssteuerung (Was wird tatsächlich gebaut?)
- ✅ SCOR-Metriken (Wie gut läuft die Supply Chain?)

**Wichtig:** ALLE Berechnungen MÜSSEN auf OEM Planung basieren! Keine Standalone-Daten!

**Datenquellen:**
- Jahresproduktion: 370.000 Bikes (`stammdaten.json`)
- Saisonalität: Monatliche Verteilung (`saisonalitaet.json`)
- Error Management: Kumulative Fehlerkorrektur

**Siehe auch:** [Error Management](#error-management), [Saisonalität](#saisonalität)

---

### **On-Time Delivery**

**Definition:** Prozentsatz der Lieferungen, die zum vereinbarten Termin erfolgen.

**Berechnung:**
```
On-Time Delivery = (Pünktliche Lieferungen / Gesamt Lieferungen) * 100%
```

**Beispiel:**
```
Gesamt: 500 Lieferungen
Pünktlich: 485 Lieferungen
Verspätet: 15 Lieferungen

On-Time = (485 / 500) * 100% = 97%
```

**Toleranz:** ±1 Tag gilt noch als "pünktlich"

**SCOR-Metrik:** Reliability Category

**Siehe auch:** [Liefertreue](#liefertreue-perfect-order-fulfillment), [SCOR-Modell](#scor-modell)

---

### **Outbound Logistik**

**Definition:** Transport von fertigen Bikes vom OEM-Werk zu den Märkten/Kunden.

**In diesem Projekt:**
- ❌ **NICHT implementiert** (Ermäßigung!)
- Ursprünglich: 6 Märkte (Europa, USA, Asien, Südamerika, Afrika, Ozeanien)
- Vereinfacht: Direktverkauf ohne Outbound-Distribution

**Siehe auch:** [Ermäßigungen](#ermäßigungen), [Inbound Logistik](#inbound-logistik)

---

## P

### **Produktionskapazität**

**Definition:** Maximale Anzahl Bikes, die pro Tag produziert werden können.

**Adventure Works:**
- Tageskapazität: **2.000 Bikes/Tag** (Arbeitstage)
- Jahreskapazität: 2.000 * ~250 AT = ~500.000 Bikes

**Auslastung:**
```
Durchschnitt: 370.000 / 250 AT ≈ 1.480 Bikes/Tag
Auslastung: 1.480 / 2.000 = 74% → Optimal! ✅
```

**Wichtig bei Szenarien:**
- Maschinenausfall → Kapazität sinkt temporär
- Überlastung → Produktion muss verschoben werden

**Siehe auch:** [Kapazitätsauslastung](#kapazitätsauslastung), [Szenarien](#szenarien)

---

## R

### **Rundungsfehler**

**Siehe:** [Error Management](#error-management)

---

## S

### **Saisonalität**

**Definition:** Schwankende Nachfrage über das Jahr hinweg (natürlicher Zyklus).

**Mountain Bikes:**
- ❄️ **Winter (Dez-Feb):** Niedrig (3-4%)
- 🌱 **Frühling (Mär-Mai):** Steigend (10-16%) → **PEAK im April!**
- ☀️ **Sommer (Jun-Aug):** Hoch (12-14%)
- 🍂 **Herbst (Sep-Nov):** Fallend (8-5%)

**Monatliche Verteilung:**
```
Januar:    4% =  14.800 Bikes
Februar:   5% =  18.500 Bikes
März:     10% =  37.000 Bikes
April:    16% =  59.200 Bikes ← PEAK!
Mai:      14% =  51.800 Bikes
Juni:     12% =  44.400 Bikes
Juli:     13% =  48.100 Bikes
August:   12% =  44.400 Bikes
September: 8% =  29.600 Bikes
Oktober:   6% =  22.200 Bikes
November:  5% =  18.500 Bikes
Dezember:  3% =  11.100 Bikes
─────────────────────────────
Gesamt:  100% = 370.000 Bikes
```

**Quelle:** `src/data/saisonalitaet.json`

**Auswirkung:**
- Bestellungen müssen 49 Tage VOR Peak erfolgen!
- April-Peak → Bestellungen bereits Ende Februar!

**Siehe auch:** [Error Management](#error-management), [Vorlaufzeit](#vorlaufzeit)

---

### **SCOR-Modell**

**Definition:** Supply Chain Operations Reference Model - Standardframework zur Bewertung von Supply Chains.

**5 Kategorien mit Metriken:**

#### **1. Reliability (Zuverlässigkeit)**
- Perfect Order Fulfillment (94,6%)
- On-Time Delivery (97%)

#### **2. Responsiveness (Reaktionsfähigkeit)**
- Order Cycle Time (2-3 Tage)
- Supply Chain Cycle Time (49 Tage)

#### **3. Agility (Agilität)**
- Upside Supply Chain Flexibility (20%)
- Upside Supply Chain Adaptability (30 Tage)

#### **4. Costs (Kosten)**
- Supply Chain Management Cost (8-12% vom Umsatz)
- Inventory Carrying Cost (0,50€/Sattel/Monat)

#### **5. Asset Management (Anlagenverwaltung)**
- Cash-to-Cash Cycle Time (30-60 Tage)
- Inventory Days of Supply (15 Tage)
- Capacity Utilization (74%)

**Ziel:** Minimum 5 KPIs, optimal 10-11 implementieren

**Siehe auch:** Detail-Seite [06-Bewertungskriterien.md](06-Bewertungskriterien.md)

---

### **Sicherheitsbestand**

**Definition:** Reserve-Lagerbestand zur Abfederung von Unsicherheiten (Lieferverzögerungen, Bedarfsschwankungen).

**In diesem Projekt:**
```
Sicherheitsbestand = 0 ← WICHTIG!
```

**Begründung:**
- Just-in-Time Philosophie
- Keine Unsicherheiten (deterministische Planung)
- Kapital soll nicht gebunden werden

**Normalerweise:**
```
Sicherheitsbestand = Z-Wert * σ * √Vorlaufzeit

Beispiel:
Z = 1,65 (95% Service Level)
σ = 100 Sättel/Tag (Standardabweichung)
Vorlaufzeit = 49 Tage

Sicherheit = 1,65 * 100 * √49 = 1.155 Sättel
```

**Siehe auch:** [Lagerbestand](#lagerbestand), [ATP](#atp-available-to-promise)

---

### **Spring Festival**

**Definition:** Chinesisches Neujahrsfest - wichtigster Feiertag in China mit 8 Tagen Produktionsstopp.

**2027 Termine:**
```
28.01.2027 (Donnerstag) bis 04.02.2027 (Donnerstag)
→ 8 Kalendertage
```

**Auswirkungen:**
- ❌ **Zulieferer-Produktion:** Komplett gestoppt
- ❌ **Bestellannahme:** Keine neuen Bestellungen
- ⏸️ **Laufende Bestellungen:** Pausiert (Vorlaufzeit verlängert sich)
- ✅ **Seetransport:** Läuft normal weiter (Schiff ist bereits unterwegs)

**Planung:**
```
Strategie: VOR Festival Lagerbestand aufbauen!

Kritischer Zeitraum:
- Bestellungen für Februar müssen SPÄTESTENS 10.01. erfolgen
- Sonst kommen sie zu spät (Spring Festival verzögert Produktion)
```

**Anforderung:** A9 (Explizit gefordert!)

**Siehe auch:** [Feiertage](#feiertage), [Vorlaufzeit](#vorlaufzeit)

---

### **SSOT (Single Source of Truth)**

**Definition:** Ein einziges, autoritatives System für alle Daten - verhindert Inkonsistenzen.

**Im Projekt:**
```
✅ SSOT: JSON-Dateien in src/data/*.json
❌ NICHT: TypeScript-Dateien, Hardcoded Werte

Zentrale Verwaltung:
- KonfigurationContext.tsx lädt JSON
- Alle Berechnungen nutzen Context
- Keine Magic Numbers im Code
```

**Beispiel:**
```typescript
// ✅ KORREKT: Aus Context
const { jahresProduktion } = useKonfiguration();

// ❌ FALSCH: Hardcoded
const bikes = 370000;
```

**Siehe auch:** [KonfigurationContext](#konfigurationcontext)

---

### **Stückliste (BOM)**

**Definition:** Liste aller Bauteile, die für ein Produkt benötigt werden.

**Adventure Works (Ermäßigung):**
```
1x Mountain Bike = 1x Sattel

Varianten:
- Allrounder  → Sattel Typ A
- Competition → Sattel Typ B
- Downhill    → Sattel Typ C
- Trail       → Sattel Typ A
- Enduro      → Sattel Typ C
- Cross       → Sattel Typ B
- Fat Bike    → Sattel Typ D
- E-MTB       → Sattel Typ A

Gesamt: 4 verschiedene Sattel-Typen
```

**Quelle:** `src/data/stueckliste.json`

**Vollversion (nicht implementiert):**
- Zusätzlich: Gabeln, Rahmen, Bremsen, etc.

**Siehe auch:** [Bedarfsrechnung](#bedarfsrechnung), [Ermäßigungen](#ermäßigungen)

---

### **Szenarien**

**Definition:** "Was-wäre-wenn"-Simulationen zur Risikoanalyse und Resilienz-Test.

**4 Szenarien:**

#### **1. Marketing-Kampagne**
```
Typ: Nachfrage-Schock
Auswirkung: +25% Nachfrage
Dauer: 4 Wochen
Beispiel: Super Bowl Werbung → 15.000 extra Bikes
```

#### **2. Maschinenausfall China**
```
Typ: Produktionsstörung
Auswirkung: 5 Tage kein Output beim Zulieferer
Datum: Konfigurierbar
Beispiel: Stromausfall → Lieferverzögerung
```

#### **3. Wasserschaden Warehouse**
```
Typ: Katastrophe
Auswirkung: 30% Lagerbestand zerstört
Datum: Konfigurierbar
Beispiel: Hochwasser → Teileverlust
```

#### **4. Schiffsverzögerung**
```
Typ: Logistik-Störung
Auswirkung: +7 Tage Seetransport
Dauer: 2 Wochen
Beispiel: Suez-Kanal blockiert → Verspätung
```

**Quelle:** `src/data/szenario-defaults.json`

**Siehe auch:** Detail-Seite [05-Szenarien.md](05-Szenarien.md)

---

## T

### **Tagesproduktion**

**Definition:** Anzahl produzierter Bikes an einem bestimmten Tag.

**Berechnung (mit Error Management):**
```javascript
// Pro MTB-Variante
const jahresMenge = 111000; // Allrounder (30%)
const saisonFaktor = 0.16;  // April (Peak)
const sollProduktion = (jahresMenge / 365) * saisonFaktor * 30; // April

// Mit Error Management
const tagesProduktion = berechneProduktionMitErrorManagement(
  sollProduktion, 
  fehlerTracker
);
```

**Beispiel (Allrounder, April):**
```
Jahresproduktion: 111.000 Bikes
April-Anteil: 16%
Tage im April: 30

Durchschnitt April: (111.000 * 0.16) / 30 ≈ 592 Bikes/Tag
→ Mit Error Management: 590-594 Bikes/Tag (variiert!)
```

**Siehe auch:** [Error Management](#error-management), [OEM Planung](#oem-planung)

---

## V

### **Vorlaufzeit (Lead Time)**

**Definition:** Zeitspanne von Bestellauslösung bis Warenankunft beim Empfänger.

**China-Zulieferer (Gesamt: 49 Tage):**
```
Phase 1: Bestellbearbeitung
  - Dauer: 2 AT (Arbeitstage)
  - Tätigkeit: Auftragsbestätigung, Produktion

Phase 2: Seetransport  
  - Dauer: 30 KT (Kalendertage)
  - Route: China → Hamburg (Hafen)
  - Läuft 24/7 (auch Wochenende!)

Phase 3: LKW-Transport
  - Dauer: 2 AT (Arbeitstage)
  - Route: Hamburg → Dortmund
  - Nur Mo-Fr

Gesamt: 2 AT + 30 KT + 2 AT = 49 Tage
```

**Beispiel:**
```
Bestellung: 01.12.2026 (Montag)

Phase 1: 01.12. + 02.12. = 2 AT (Fr. 02.12. fertig)
Phase 2: 03.12. - 01.01.2027 = 30 KT (Do. 01.01.)
Phase 3: 04.01. + 05.01. = 2 AT (Mo. 05.01. Ankunft)

Ankunft: 19.01.2027 (ca. Tag 19 des Jahres)
```

**⚠️ KRITISCH:** Alte Aufgabe hatte 56 Tage (FALSCH!) → Jetzt 49 Tage!

**Quelle:** `src/data/lieferant-china.json`

**Siehe auch:** [Arbeitstage](#arbeitstage-at), [Kalendertage](#kalendertage-kt), [Spring Festival](#spring-festival)

---

## W

### **Warehouse**

**Definition:** Zentrallager für Bauteile (Sättel) in Dortmund.

**Funktionen:**
1. **Lagerung:** Aufbewahrung eingehender Bauteile
2. **Ausgabe:** Bereitstellung für Produktion
3. **Bestandsführung:** Tracking von Ein-/Ausgängen

**Berechnung:**
```
Lagerbestand[Tag N] = 
  Anfangsbestand[Tag 1] +
  Σ(Eingehende Lieferungen[1..N]) -
  Σ(Verbrauch für Produktion[1..N])
```

**Wichtig:**
- ❌ Kein imaginärer Anfangsbestand! (Tag 1 = 0)
- ✅ Erste Lieferung nach 49 Tagen (Tag 4-5)
- ✅ ATP-Check verhindert negative Bestände

**Siehe auch:** [Lagerbestand](#lagerbestand), [ATP](#atp-available-to-promise)

---

## Z

### **Zulieferer**

**Definition:** Externes Unternehmen, das Bauteile (Komponenten) an Adventure Works liefert.

**In diesem Projekt (Ermäßigung):**
```
1 Zulieferer: China
Produkt: Sättel (4 Varianten)
Vorlaufzeit: 49 Tage
Losgröße: 500 Sättel
```

**Vollversion (nicht implementiert):**
- China: Sättel
- Spanien: Gabeln
- Deutschland: Rahmen

**Eigenschaften China-Zulieferer:**
- Langer Vorlaufzeit (49 Tage)
- Günstige Preise
- Hohe Mindestmenge (500 Stück)
- Spring Festival Pause (8 Tage)

**Quelle:** `src/data/lieferant-china.json`

**Siehe auch:** [Vorlaufzeit](#vorlaufzeit), [Losgröße](#losgröße), [Spring Festival](#spring-festival)

---

## 📚 Zusätzliche Begriffe

### **KonfigurationContext**

**Definition:** React Context für zentrale Verwaltung aller Einstellungen und JSON-Daten.

**Funktionen:**
- Lädt alle JSON-Dateien (`stammdaten.json`, `saisonalitaet.json`, etc.)
- Stellt Daten via Hook bereit: `useKonfiguration()`
- Verwaltet globale Einstellungen (Heute-Datum, Szenarien)
- Berechnet keine Werte (nur Datenhaltung)

**Verwendung:**
```typescript
import { useKonfiguration } from '@/contexts/KonfigurationContext';

function MyComponent() {
  const { 
    jahresProduktion,    // 370.000
    varianten,           // 8 MTB-Typen
    saisonalitaet,       // Monatliche Verteilung
    lieferant,           // China-Daten
    feiertage            // DE + China
  } = useKonfiguration();
  
  // Nutze Daten...
}
```

**Siehe auch:** [SSOT](#ssot-single-source-of-truth)

---

### **SzenarienContext**

**Definition:** React Context für Verwaltung aktiver Szenarien (global über alle Tabs).

**Funktionen:**
- Szenarien aktivieren/deaktivieren
- Parameter konfigurieren (Datum, Intensität)
- Global wirksam (nicht tab-spezifisch!)

**Verwendung:**
```typescript
import { useSzenarien } from '@/contexts/SzenarienContext';

function MyComponent() {
  const { aktiveSzenarien, aktiviereSzenario } = useSzenarien();
  
  // Check aktive Szenarien
  if (aktiveSzenarien.includes('maschinenausfall')) {
    // Anpassen Berechnungen...
  }
}
```

**Siehe auch:** [Szenarien](#szenarien)

---

### **Planning Zone**

**Definition:** Zukunftszeitraum, in dem Änderungen noch möglich sind (Gegenteil von Frozen Zone).

**Siehe auch:** [Frozen Zone](#frozen-zone)

---

### **IST vs. PLAN**

**Definition:** Unterscheidung zwischen tatsächlich realisierten Werten (Vergangenheit) und geplanten Werten (Zukunft).

**Beispiel:**
```
10.04.2027 (Vergangenheit):
  PLAN: 1.300 Bikes
  IST:  1.200 Bikes (tatsächlich produziert)
  Abweichung: -100 Bikes (Material-Engpass)

20.04.2027 (Zukunft):
  PLAN: 1.300 Bikes
  IST: - (noch nicht eingetreten)
```

**Siehe auch:** [Frozen Zone](#frozen-zone), [Material-Check](#material-check)

---

## 🎯 Häufige Fehlerquellen

### ❌ **Falsche Jahresproduktion**
```
FALSCH: 185.000 Bikes (alte Aufgabe)
RICHTIG: 370.000 Bikes (aktuelle Aufgabe 2027)
```

### ❌ **Falsche Vorlaufzeit**
```
FALSCH: 56 Tage (8 Wochen)
RICHTIG: 49 Tage (7 Wochen)
```

### ❌ **Imaginäre Anfangsbestände**
```
FALSCH: Tag 1 = 10.000 Sättel im Lager
RICHTIG: Tag 1 = 0 Sättel (erste Lieferung nach 49 Tagen)
```

### ❌ **Tägliche glatte Bestellungen**
```
FALSCH: Jeden Tag 740 Sättel bestellen
RICHTIG: Losgrößen-basiert (500, 1000, 1500, ...)
```

### ❌ **Material-Check an Wochenenden**
```
FALSCH: Samstag = "Nein" (keine Produktion)
RICHTIG: Samstag = "-" (kein Check, da kein Arbeitstag)
```

### ❌ **Losgröße pro Variante**
```
FALSCH: Jede Variante einzeln aufrunden (300 → 500)
RICHTIG: Tagesgesamtmenge aufrunden (740 → 1000)
```

### ❌ **Sicherheitsbestand > 0**
```
FALSCH: 1.000 Sättel Sicherheitsbestand
RICHTIG: 0 Sättel (Just-in-Time Philosophie)
```

---

## 📖 Verwandte Seiten

- 📋 [01-Aufgabenstellung.md](01-Aufgabenstellung.md) - Projektübersicht
- 🔗 [02-Supply-Chain-Konzepte.md](02-Supply-Chain-Konzepte.md) - Kernkonzepte erklärt
- 🏍️ [03-Produktstruktur.md](03-Produktstruktur.md) - MTB-Varianten & Stückliste
- ⏱️ [04-Zeitparameter.md](04-Zeitparameter.md) - Vorlaufzeiten & Feiertage
- 🎲 [05-Szenarien.md](05-Szenarien.md) - Was-wäre-wenn-Simulationen
- 📊 [06-Bewertungskriterien.md](06-Bewertungskriterien.md) - SCOR & 15-Punkte-Strategie
- 🏠 [README.md](README.md) - Wiki-Hauptseite

---

## 💡 Hinweise zur Nutzung

**Für Studenten:**
- ✅ Nutze dieses Glossar beim Lernen der Konzepte
- ✅ Verwende die Beispiele in deiner Präsentation
- ✅ Erkläre Begriffe mit den Analogien (leichter verständlich!)

**Für Entwickler:**
- ✅ Halte Begriffe konsistent im Code
- ✅ Nutze deutsche Terminologie (wie im Glossar)
- ✅ Verweise in Kommentaren auf Glossar-Einträge

**Für Prüfer:**
- ✅ Zeigt Verständnis der Fachkonzepte
- ✅ Dokumentiert alle wichtigen Begriffe
- ✅ Erleichtert Nachvollziehbarkeit der Implementierung

---

**📚 Ende des Glossars**

*Letzte Aktualisierung: Januar 2025*
