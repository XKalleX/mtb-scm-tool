# 📚 PROJEKTERKLAERUNG - Mountain Bike Supply Chain Management System
## Von Null bis Experte - Eine vollständige Reise durch das Projekt

> **Ziel dieser Dokumentation:** Selbst wenn du noch NIE von Supply Chain Management gehört hast, wirst du nach dieser Dokumentation ALLES verstehen - bis ins kleinste Detail!

---

# 🎯 TEIL 1: DIE AUFGABENSTELLUNG
## Verstehe das Problem, bevor wir zur Lösung kommen

---

## Kapitel 1: Was ist Adventure Works AG?

### 1.1 Das Unternehmen

**Adventure Works AG** ist ein fiktives, aber realistisches Unternehmen, das in unserem Projekt **Mountain Bikes** (Mountainbikes) herstellt. Stell dir vor:

- **Standort:** Dortmund, Deutschland
- **Branche:** Fahrradherstellung (spezialisiert auf Mountain Bikes)
- **Produktionsvolumen:** 370.000 Fahrräder pro Jahr
- **Art:** OEM-Hersteller (Original Equipment Manufacturer - mehr dazu gleich)

### 1.2 Was bedeutet "OEM"?

**OEM (Original Equipment Manufacturer)** - Lass mich das mit einem Beispiel erklären:

**Analogie:** Stell dir vor, du backst Kuchen:
- Du kaufst **nicht** alle Zutaten einzeln beim Bauern (Mehl, Eier, Zucker)
- Du kaufst die **fertigen Zutaten** im Supermarkt
- Du **montierst** sie nur noch zusammen zum Kuchen

**Bei Adventure Works:**
- Sie produzieren **nicht** alle Einzelteile selbst (keine Rahmenfabrik, keine Gabelherstellung)
- Sie **kaufen** fertige Komponenten von Zulieferern:
  - **Sättel** aus China
  - *(In der Vollversion: Auch Gabeln, Rahmen aus Spanien/Deutschland)*
- Sie **montieren** diese Teile zu fertigen Mountain Bikes

**Warum ist das wichtig?**
- OEM bedeutet: Das Hauptproblem ist **NICHT** die Produktion der Teile
- Das Hauptproblem ist: **Wie bekomme ich die richtigen Teile zur richtigen Zeit am richtigen Ort?**
- Das nennt man **Supply Chain Management** (Lieferkettenmanagement)

### 1.3 Das Geschäftsmodell

Adventure Works produziert **8 verschiedene Mountain Bike Varianten** (mehr Details später). Sie:

1. **Prognostizieren** die Nachfrage für ein ganzes Jahr (2027)
2. **Planen** die Produktion
3. **Bestellen** Komponenten bei Zulieferern (z.B. Sättel aus China)
4. **Warten** auf Lieferung (49 Tage Vorlaufzeit!)
5. **Montieren** die Bikes in Dortmund
6. **Verkaufen** sie (in unserer vereinfachten Version direkt, ohne Outbound-Logistik)

---

## Kapitel 2: Warum braucht Adventure Works ein SCM-System?

### 2.1 Das Problem ohne SCM-System

Stell dir vor, Adventure Works hätte **KEIN** System:

**Szenario 1: Zu wenig Teile bestellt**
- ❌ April ist Peak-Season (höchste Nachfrage)
- ❌ Sie haben nur genug Sättel für durchschnittliche Nachfrage bestellt
- ❌ Jetzt fehlen 10.000 Sättel
- ❌ Sie können 10.000 Bikes nicht bauen
- ❌ Kunden sind unzufrieden
- ❌ **Umsatzverlust:** ca. 3-5 Millionen Euro!

**Szenario 2: Zu viele Teile bestellt**
- ❌ Sie haben für November viele Teile bestellt (niedrige Nachfrage)
- ❌ Die Teile liegen im Lager und kosten Geld
- ❌ **Lagerkosten:** Pro Sattel 0.50€ pro Monat
- ❌ Bei 50.000 überzähligen Sätteln = 25.000€ pro Monat verschwendet
- ❌ Kapital ist gebunden (kein Cashflow)

**Szenario 3: Falsche Zeitplanung**
- ❌ Sie bestellen im Dezember Teile für Januar
- ❌ **ABER:** China-Zulieferer braucht 49 Tage Vorlaufzeit!
- ❌ Die Teile kommen zu spät
- ❌ Produktion steht still
- ❌ **Kosten:** 10.000€ pro Tag Produktionsstillstand

**Szenario 4: Spring Festival vergessen**
- ❌ 28. Januar - 4. Februar 2027: **Spring Festival in China**
- ❌ Zulieferer macht 8 Tage Pause
- ❌ Bestellungen werden nicht bearbeitet
- ❌ Wenn nicht eingeplant → **Produktionsstillstand** im März!

### 2.2 Die Lösung: Ein SCM-System

Ein **Supply Chain Management System** löst all diese Probleme:

✅ **Bedarfsplanung:** Berechnet exakt, wie viele Teile wann benötigt werden  
✅ **Bestellplanung:** Berücksichtigt Vorlaufzeiten und bestellt rechtzeitig  
✅ **Feiertags-Management:** Plant um Spring Festival & deutsche Feiertage herum  
✅ **Szenario-Simulation:** "Was passiert, wenn...?" (z.B. Maschinenausfall in China)  
✅ **Echtzeit-Monitoring:** Warnt bei Engpässen und Problemen  
✅ **Optimierung:** Minimiert Lagerkosten bei maximaler Liefertreue  

**Das Ergebnis:**
- 💰 Millionen Euro gespart (weniger Lagerkosten, weniger Produktionsstillstand)
- 😊 Kunden zufrieden (Bikes pünktlich verfügbar)
- 📊 Transparenz (Management sieht sofort: Was läuft gut? Was nicht?)
- 🚀 Wettbewerbsvorteil (schneller & günstiger als Konkurrenz)

---

## Kapitel 3: Die fundamentalen Supply Chain Konzepte

### 3.1 Was ist eine "Supply Chain"?

**Supply Chain** (Lieferkette) - Der Weg eines Produkts von der Rohware zum Kunden.

**Analogie: Burger-Produktion** 🍔

1. **Tier 3 (Rohstoffe):** Bauer züchtet Rind
2. **Tier 2 (Vorprodukte):** Metzger macht Burger-Patty
3. **Tier 1 (Komponenten):** Großhändler liefert Patty an Restaurant
4. **OEM (Hersteller):** Restaurant grillt Burger
5. **Distribution:** Lieferservice bringt Burger zu dir
6. **Endkunde:** Du isst den Burger

**Bei Adventure Works Mountain Bikes:**


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

### 3.2 Die 5 Supply Chain Prozesse (SCOR-Modell)

Das **SCOR-Modell** (Supply Chain Operations Reference) definiert 5 Hauptprozesse:

#### 3.2.1 PLAN (Planen)

**Was:** Die strategische Ebene - "Was sollen wir produzieren?"

**Bei Adventure Works:**
- **Jahresplanung:** 370.000 Bikes müssen verteilt werden auf 365 Tage
- **Saisonalität:** April = 16% (Peak!), Oktober = 3% (Low Season)
- **Variantenplanung:** Wie viele Allrounder? Wie viele Downhill?

**Beispiel konkret:**
```
Jahr 2027: 370.000 Bikes
├─ Januar:   4% =  14.800 Bikes (Winter, wenig Nachfrage)
├─ Februar:  6% =  22.200 Bikes (Vorbereitung Frühjahr)
├─ März:    10% =  37.000 Bikes (steigend)
├─ April:   16% =  59.200 Bikes ← PEAK SEASON!
├─ Mai:     14% =  51.800 Bikes (Hochsaison)
...
└─ Dezember: 3% =  11.100 Bikes (Weihnachten, niedrig)
```

**Wichtiges Konzept: Error Management**

Problem: 370.000 / 365 Tage = 1.013,698... Bikes/Tag (Dezimalzahl!)

❌ **Naive Lösung:** Immer 1.014 Bikes/Tag → Jahresende: 370.110 Bikes (110 zu viel!)  
✅ **Error Management:** Tracking der Rundungsfehler → Exakt 370.000 am Jahresende

#### 3.2.2 SOURCE (Beschaffen)

**Was:** Einkauf und Beschaffung von Komponenten

**Bei Adventure Works:**
- **Woher:** Sättel von Dengwong Manufacturing Ltd., Shanghai, China
- **Vorlaufzeit:** 49 Tage (5 AT Produktion + 2 AT LKW + 30 KT Schiff + 2 AT LKW)
- **Losgröße:** Mindestens 500 Sättel pro Bestellung
- **Lieferintervall:** Alle 14 Tage möglich

**Die 49 Tage im Detail:**

```
Tag 1-5:   [Produktion in China]    Montag-Freitag (Arbeitstage)
           → Zulieferer fertigt Sättel
           → ABER: Kein Samstag/Sonntag, keine Feiertage!
           
Tag 6-7:   [LKW China → Hafen]       Arbeitstage
           → Dengwong Werk → Hafen Shanghai
           
Tag 8-37:  [Seefracht]                Kalendertage (24/7!)
           → Hafen Shanghai → Hafen Hamburg
           → 30 Tage durchgehend, auch Wochenende
           
Tag 38-39: [LKW Hafen → Werk]        Arbeitstage
           → Hafen Hamburg → Werk Dortmund
           
= 49 Tage GESAMT
```

**Wichtig zu verstehen:**
- **Arbeitstage (AT):** Nur Montag-Freitag, ohne Feiertage (z.B. LKW-Transport)
- **Kalendertage (KT):** 24/7, auch Wochenende (z.B. Schiff auf See)

**Kritisches Problem: Spring Festival**


**28. Januar - 4. Februar 2027: Spring Festival (Chinesisches Neujahr)**
- 🚫 **Keine Produktion** beim Zulieferer (8 Tage)
- 🚫 **Keine neuen Bestellungen** angenommen
- ⏸️ **Laufende Bestellungen** pausiert
- ✅ Schiffe auf See fahren weiter

**Konsequenz für Planung:**
- Bestellungen für Anfang März müssen **VOR** dem 10. Januar raus!
- Sonst Produktionsstillstand in Deutschland!

#### 3.2.3 MAKE (Produzieren)

**Was:** Die eigentliche Montage/Fertigung

**Bei Adventure Works:**
- **Standort:** Werk Dortmund
- **Kapazität:** 130 Bikes pro Stunde
- **Schicht:** 8 Stunden (= 1.040 Bikes/Tag möglich)
- **Durchlaufzeit Montage:** 325 Minuten pro Bike (von Start bis Finish)

**Der Produktionsprozess:**
```
1. [Material-Check] - Sind alle Teile da?
                      ↓ Ja
2. [ATP-Check] - Available To Promise
                 "Können wir versprechen, das zu bauen?"
                 - Sättel verfügbar? ✓
                 - Kapazität frei? ✓
                 - Termin machbar? ✓
                      ↓ Ja
3. [Montage] - 325 Minuten
              - Rahmen + Gabel + Sattel + Räder + ...
                      ↓
4. [Fertig] - Bike bereit für Auslieferung
```

**ATP-Check (Available To Promise) - Das wichtigste Konzept!**

Stell dir vor, ein Kunde will am 15. April 1.000 Allrounder Bikes bestellen.

**Der ATP-Check fragt:**

1️⃣ **Material verfügbar?**
   - Brauchen: 1.000 SAT_FT Sättel
   - Lagerbestand: 2.500 SAT_FT
   - ✅ Check bestanden (genug da)

2️⃣ **Kapazität verfügbar?**
   - Brauchen: 1.000 Bikes ÷ 130 Bikes/h = 7,7 Stunden
   - Verfügbar: 8 Stunden/Tag
   - ✅ Check bestanden (schaffen wir)

3️⃣ **Termin realistisch?**
   - Kunde will: 15. April
   - Heute: 10. April
   - Durchlaufzeit: 1 Tag (325 Min ≈ 5,4h)
   - ✅ Check bestanden (genug Zeit)

**Ergebnis:** ✅ **Wir können zusagen!** (ATP = Promise Date: 15. April)

**Was, wenn Material fehlt?**

Angenommen, nur 800 SAT_FT im Lager:

1️⃣ **Material-Check:** ❌ Fehlt! (brauchen 1.000, haben 800)

**2 Optionen:**

**Option A: Nachbestellen (aber Vorlaufzeit!)**
- Heute bestellen in China
- Ankunft erst in 49 Tagen
- ❌ Viel zu spät!

**Option B: FCFS-Regel (First-Come-First-Serve)**
- Wir können nur 800 Bikes versprechen
- Die restlichen 200 kommen später (wenn neue Lieferung da ist)
- **Transparenz:** Kunde weiß sofort, was machbar ist

#### 3.2.4 DELIVER (Liefern)

**In der Vollversion:** Distribution zu 6 internationalen Märkten  
**In unserer Code-Ermäßigung:** ✂️ **ENTFALLEN** (vereinfacht)

Warum entfallen?
- 90% weniger Komplexität
- Fokus auf die Kernkonzepte (PLAN, SOURCE, MAKE)
- Projekt bleibt überschaubar und präsentierbar

#### 3.2.5 RETURN (Rückgabe)

**In der Vollversion:** Reklamationen, Retouren  
**In unserer Code-Ermäßigung:** ✂️ **ENTFALLEN** (vereinfacht)

### 3.3 Die SCOR-Metriken - Wie misst man Erfolg?

Ein SCM-System MUSS messbare Kennzahlen liefern. Das SCOR-Modell definiert **5 Kategorien** von Kennzahlen (KPIs = Key Performance Indicators):

#### 3.3.1 Reliability (Zuverlässigkeit)

**Frage:** *"Kriegen wir, was wir versprochen haben?"*

**KPI: Perfect Order Fulfillment (POF)**
- **Definition:** Prozentsatz der Aufträge, die perfekt erfüllt wurden
- **Perfekt bedeutet:** 
  - ✓ Richtige Menge
  - ✓ Richtige Variante
  - ✓ Zur richtigen Zeit
  - ✓ In richtiger Qualität

**Beispiel:**
```
100 Aufträge:
- 94 perfekt erfüllt
- 6 hatten Probleme (zu spät, falsche Menge, etc.)

POF = 94% 

Ziel: ≥95% (Adventure Works Vorgabe)
Status: 🟡 Gelb (nahe am Ziel, aber nicht erreicht)
```

**Warum wichtig?**
- Kunden-Zufriedenheit hängt direkt davon ab
- Jede nicht-perfekte Lieferung kostet Vertrauen & Geld

#### 3.3.2 Responsiveness (Reaktionsfähigkeit)

**Frage:** *"Wie schnell sind wir?"*

**KPI: Order Cycle Time**
- **Definition:** Zeit von Bestellung bis Lieferung
- **Bei Adventure Works:** Durchschnitt 39 Tage
- **Ziel:** ≤49 Tage (wegen China-Vorlaufzeit)

**Beispiel:**
```
Kunde bestellt am 1. März
→ Wir prüfen Lager (sofort)
→ Teile sind da (Glück!)
→ Produktion am 2. März (1 Tag)
→ Lieferung am 3. März

Order Cycle Time = 2 Tage ✅

ABER wenn Teile fehlen:
→ Nachbestellen in China (49 Tage)
→ Produktion (1 Tag)
→ Lieferung (1 Tag)

Order Cycle Time = 51 Tage ❌
```

**Warum wichtig?**
- Kürzere Cycle Time = zufriedenere Kunden
- Wettbewerbsvorteil (schneller als Konkurrenz)

#### 3.3.3 Agility (Flexibilität)

**Frage:** *"Wie gut reagieren wir auf Änderungen?"*

**KPI: Upside Adaptability**
- **Definition:** Wie schnell können wir Produktion um X% erhöhen?
- **Bei Adventure Works:** 21 Tage für +20% Nachfrage
- **Ziel:** ≤20 Tage

**Szenario: Plötzliche Marketing-Aktion**
```
Zeitschrift "Mountain Biker" Spezial-Ausgabe
→ Nachfrage für MTB Allrounder +30% im Juli

Ohne Agility:
❌ Produktion kann nicht mithalten
❌ Kunden bekommen keine Bikes
❌ Umsatz-Chance verpasst

Mit hoher Agility:
✅ Binnen 3 Wochen hochgefahren
✅ Alle Kunden beliefert
✅ Extra-Umsatz generiert!
```

**Warum wichtig?**
- Märkte sind dynamisch (Trends, Wetter, Konkurrenz)
- Wer schneller reagiert, gewinnt

#### 3.3.4 Cost (Kosten)

**Frage:** *"Was kostet uns die Supply Chain?"*

**KPI: Total Supply Chain Cost**
- **Definition:** Prozentsatz vom Umsatz, der für SC draufgeht
- **Bei Adventure Works:** 12,5% vom Umsatz
- **Ziel:** ≤13% (Branchenstandard)

**Was zählt alles dazu?**
```
Supply Chain Kosten:
├─ Materialkosten (größter Posten)
│  └─ Sättel von China
├─ Transportkosten
│  ├─ LKW China → Hafen Shanghai
│  ├─ Seefracht Shanghai → Hamburg
│  └─ LKW Hamburg → Dortmund
├─ Lagerkosten
│  └─ 0.50€ pro Sattel pro Monat
├─ Produktionskosten
│  ├─ Arbeitslöhne Montage
│  ├─ Maschinenstunden
│  └─ Energiekosten
└─ SCM-System Kosten
   └─ Software, Personal, Planung
```

**Beispielrechnung:**
```
Umsatz pro Jahr: 100 Mio. €
SC-Kosten: 12,5 Mio. €

Ratio: 12,5 / 100 = 12,5% ✅ (unter Ziel 13%)
```

**Warum wichtig?**
- Jedes Prozent weniger = mehr Gewinn
- Optimierung ohne Qualitätsverlust ist der Schlüssel

#### 3.3.5 Assets (Vermögenswerte)

**Frage:** *"Wie effizient nutzen wir unser Kapital?"*

**KPI: Cash-to-Cash Cycle Time**
- **Definition:** Tage von "Geld ausgeben" bis "Geld wiederkommen"
- **Bei Adventure Works:** 56 Tage
- **Ziel:** ≤60 Tage

**Der Cashflow-Zyklus erklärt:**
```
Tag 0:   Wir BEZAHLEN Zulieferer (Geld RAUS!) 💸
         └─ Rechnung: 50.000€ für 10.000 Sättel
         
Tag 1-49: Warten auf Lieferung (Geld gebunden)
         └─ Kapital "eingefroren", kann nicht genutzt werden
         
Tag 50:  Teile kommen an + Produktion
         
Tag 51:  Bikes fertig + an Händler verkauft
         
Tag 56:  Händler ZAHLT uns (Geld REIN!) 💰
         └─ Rechnung: 120.000€ für 1.000 Bikes
         
Cash-to-Cash: 56 Tage
```

**Warum wichtig?**
- Kürzerer Cycle = mehr Cashflow = mehr finanzielle Freiheit
- Lange Cycles sind riskant (Liquiditätsprobleme)

---

## Kapitel 4: Die 8 Mountain Bike Varianten im Detail

Adventure Works produziert **8 verschiedene MTB-Ausstattungsvarianten**. Jede Variante hat einen prognostizierten Marktanteil.

### 4.1 Übersicht der Varianten

| ID   | Name              | Marktanteil | Jahresproduktion | Zielgruppe |
|------|-------------------|-------------|------------------|------------|
| ALLR | MTB Allrounder    | 30%         | 111.000 Bikes    | Hobby-Fahrer, Allrounder |
| PERF | MTB Performance   | 12%         | 44.400 Bikes     | Ambitionierte Hobby-Fahrer |
| TRAI | MTB Trail         | 13%         | 48.100 Bikes     | Trail-Spezialisten |
| COMP | MTB Competition   | 15%         | 55.500 Bikes     | Wettkampf-Fahrer |
| DOWN | MTB Downhill      | 10%         | 37.000 Bikes     | Downhill-Profis |
| MARA | MTB Marathon      | 8%          | 29.600 Bikes     | Langstrecken-Fahrer |
| EXTR | MTB Extreme       | 7%          | 25.900 Bikes     | Extrem-Sport |
| FREE | MTB Freeride      | 5%          | 18.500 Bikes     | Freestyle-Fahrer |
| **Σ** | **GESAMT**       | **100%**    | **370.000 Bikes** | |

### 4.2 Warum diese Verteilung?

Die Marktanteile basieren auf **historischen Verkaufsdaten** und **Marktforschung**:

**30% Allrounder:**
- Größte Zielgruppe
- Gelegenheitsfahrer, Familien
- Vielseitig einsetzbar (Stadt + Wald)
- "Einstiegsmodell" ohne Spezialisierung

**15% Competition:**
- Zweitgrößte Gruppe
- Sportliche Fahrer, Rennrad-Umsteiger
- Leicht, schnell, Carbon-Rahmen

**5% Freeride:**
- Kleinste Gruppe
- Nische: Freestyle-Tricks, Bikeparks
- Höherer Preis, spezielle Anforderungen

### 4.3 Die Stückliste - Was braucht jedes Bike?

**Vollversion (nicht bei uns):**
Jedes Bike besteht aus ~14 Hauptkomponenten:
- Rahmen (verschiedene Größen)
- Gabel (verschiedene Federweg)
- Sattel (verschiedene Modelle)
- Laufräder
- Bremsen
- Schaltung
- usw.

**Unsere Code-Ermäßigung (vereinfacht):**

✂️ **Nur Sättel betrachtet!** (4 Varianten)

**Warum diese Vereinfachung?**
- 90% weniger Komplexität
- Konzept bleibt gleich (1 Sattel = 1 Bike = 1:1 Verhältnis)
- Besser präsentierbar

**Die 4 Sattel-Modelle:**

| Sattel-ID | Name            | Verwendet in Varianten | Preis |
|-----------|-----------------|------------------------|-------|
| SAT_FT    | Fizik Tundra    | ALLR, FREE             | 45€   |
| SAT_RL    | Raceline        | COMP, PERF             | 52€   |
| SAT_SP    | Spark           | DOWN, TRAI             | 38€   |
| SAT_SL    | Speedline       | EXTR, MARA             | 48€   |

**Stücklisten-Matrix:**

```
MTB Variante    → Sattel benötigt
────────────────────────────────────
MTB Allrounder  → 1x SAT_FT (Fizik Tundra)
MTB Performance → 1x SAT_RL (Raceline)
MTB Trail       → 1x SAT_SP (Spark)
MTB Competition → 1x SAT_RL (Raceline)
MTB Downhill    → 1x SAT_SP (Spark)
MTB Marathon    → 1x SAT_SL (Speedline)
MTB Extreme     → 1x SAT_SL (Speedline)
MTB Freeride    → 1x SAT_FT (Fizik Tundra)
```

**Wichtig zu verstehen:**
- **1 Bike = 1 Sattel** (1:1 Verhältnis)
- Manche Sättel werden für mehrere Varianten genutzt
- Z.B. SAT_FT für ALLR (111.000) + FREE (18.500) = **129.500 Stück/Jahr**

**Jahresbedarf pro Sattel-Typ:**

```
SAT_FT (Fizik Tundra):
  = ALLR (111.000) + FREE (18.500)
  = 129.500 Stück/Jahr

SAT_RL (Raceline):
  = COMP (55.500) + PERF (44.400)
  = 99.900 Stück/Jahr

SAT_SP (Spark):
  = DOWN (37.000) + TRAI (48.100)
  = 85.100 Stück/Jahr

SAT_SL (Speedline):
  = EXTR (25.900) + MARA (29.600)
  = 55.500 Stück/Jahr

GESAMT: 370.000 Sättel = 370.000 Bikes ✓
```

---

## Kapitel 5: Saisonalität - Der natürliche Rhythmus

### 5.1 Was ist Saisonalität?

**Saisonalität** bedeutet: Die Nachfrage schwankt über das Jahr. Nicht jeden Monat werden gleich viele Bikes verkauft!

**Analogie: Eiscreme-Verkauf** 🍦
- **Sommer (Juni-August):** Viel Nachfrage (heiß, Leute wollen Eis)
- **Winter (Dezember-Februar):** Wenig Nachfrage (kalt, keiner will Eis)

**Bei Mountain Bikes:**
- **Frühling/Frühsommer (März-Juni):** Peak Season!
  - Wetter wird besser
  - Leute wollen raus in die Natur
  - Bikeparks öffnen
  
 Rechnung:**

```
"5 Arbeitstage" bedeutet NICHT 5 Kalendertage!

Beispiel: Produktion startet Donnerstag, 10. Jan
+ Tag 1 (AT): Do, 10. Jan
+ Tag 2 (AT): Fr, 11. Jan
+ (Wochenende Sa/So übersprungen!)
+ Tag 3 (AT): Mo, 13. Jan
+ Tag 4 (AT): Di, 14. Jan
+ Tag 5 (AT): Mi, 15. Jan

= 5 AT = 8 KT (inkl. Wochenende)
```

---

## Kapitel 7: Die 4 Szenarien - "Was wäre wenn...?"

Ein gutes SCM-System muss **Risiken** abbilden können. Dafür dienen Szenarien.

### 7.1 Warum Szenarien?

**Die Realität ist nicht planbar!** Es gibt immer unvorhergesehene Ereignisse:

- 🌊 Taifun in Asien verzögert Schiffe
- 🔧 Maschine beim Zulieferer fällt aus
- 📈 Plötzliche Marketing-Aktion erhöht Nachfrage
- 💧 Container geht auf See verloren

**Ohne Szenarien:**
- ❌ Firma ist überrascht
- ❌ Keine Plan-B-Strategie
- ❌ Panik-Reaktionen
- ❌ Hohe Kosten

**Mit Szenarien:**
- ✅ Simulation im Voraus
- ✅ Erkennen: Was passiert bei X?
- ✅ Gegenmaßnahmen vorbereiten
- ✅ Risiko minimieren

### 7.2 Szenario 1: Marketingaktion (Demand Surge)

**Beschreibung:**  
Eine erfolgreiche Marketing-Kampagne erhöht plötzlich die Nachfrage für bestimmte Varianten.

**Beispiel aus der Praxis:**
```
"Mountain Biker" Magazin - Spezial-Ausgabe Juli 2027
Thema: "Die besten Allrounder-Bikes"
MTB Allrounder von Adventure Works wird Testsieger

Resultat:
→ Juli normalerweise: 12% Jahresproduktion = 44.400 Bikes
→ Juli mit Kampagne: +20% Nachfrage = 53.280 Bikes (+8.880!)
```

**Parameter konfigurierbar:**
- **Start-Datum:** Wann beginnt die Kampagne? (z.B. 1. Juli)
- **End-Datum:** Wann endet sie? (z.B. 14. Juli)
- **Erhöhung (%):** Wie stark steigt Nachfrage? (z.B. +20%)
- **Betroffene Varianten:** Alle oder nur bestimmte? (z.B. nur Allrounder)

**Impact-Analyse:**

```
OHNE Szenario-Planung:
❌ Zu wenig Sättel bestellt
❌ Lagerbestand reicht nicht
❌ ATP-Check schlägt fehl
❌ Wir können nur 44.400 liefern statt 53.280
❌ 8.880 Bikes fehlen = ca. 2,6 Mio. € Umsatzverlust!

MIT Szenario-Planung:
✅ Frühzeitig erkannt (Simulation)
✅ Extra-Bestellung in China (im Mai, 49 Tage vorher)
✅ Lager im Juni aufgebaut
✅ Juli: Alle 53.280 Bikes lieferbar
✅ Voller Umsatz!
```

**SCOR-Metriken-Impact:**
- Agility: ↑ (schnelle Reaktion)
- Perfect Order Fulfillment: ↑ (alle Aufträge erfüllt)
- Cash-to-Cash: → (neutral)

### 7.3 Szenario 2: China Produktionsausfall (Supply Disruption)

**Beschreibung:**  
Maschinenausfall, Stromausfall oder technisches Problem beim Zulieferer in China.

**Beispiel:**
```
15. März 2027: Produktionsanlage bei Dengwong fällt aus
Dauer: 7 Tage
Kapazität: -60% (nur Notbetrieb möglich)

Impact:
→ Normalerweise: 500 Sättel/Tag Produktion
→ Mit Ausfall: 200 Sättel/Tag (-60%)
→ Verlust: 7 Tage × 300 Sättel = 2.100 Sättel fehlen
```

**Parameter konfigurierbar:**
- **Start-Datum:** Wann beginnt der Ausfall? (z.B. 15. März)
- **Dauer (Tage):** Wie lange? (z.B. 7 Tage)
- **Reduktion (%):** Wie stark? (z.B. -60%)

**Impact-Analyse:**

```
Bestellung vom 15. März:
+ Produktion soll starten: 15. März
+ Ausfall: 15. März - 21. März (7 Tage)
+ Produktion startet tatsächlich: 22. März
+ 49 Tage ab 22. März = Ankunft 10. Mai (statt 3. Mai)

= 7 Tage Verspätung!

Konsequenz für April-Peak:
❌ Sättel kommen zu spät
❌ April-Produktion kann nicht erfüllt werden
❌ Perfect Order Fulfillment sinkt drastisch
```

**Gegenmaßnahmen (im System simulierbar):**
1. **Sicherheitsbestand erhöhen** (vor März Lager aufbauen)
2. **Alternative Zulieferer aktivieren** (in Vollversion)
3. **Produktionspriorität anpassen** (FCFS-Regel)

**SCOR-Metriken-Impact:**
- Reliability: ↓ (POF sinkt)
- Responsiveness: ↓ (längere Cycle Times)
- Cost: ↑ (Notmaßnahmen teuer)

### 7.4 Szenario 3: Transport-Schaden (Cargo Loss)

**Beschreibung:**  
Container geht auf Seefracht verloren (Sturm, Unfall, etc.).

**Beispiel:**
```
20. Februar 2027: Sturm auf See
Container mit 1.000 Sätteln geht über Bord
Mix aus allen 4 Sattel-Typen

Sofortiger Bestandsverlust:
- 300× SAT_FT
- 250× SAT_RL
- 250× SAT_SP
- 200× SAT_SL
```

**Parameter konfigurierbar:**
- **Datum:** Wann passiert der Schaden? (z.B. 20. Feb)
- **Verlust-Menge:** Wie viele Teile? (z.B. 1.000 Stück)
- **Betroffene Teile:** Welche? (z.B. "Gemischte Sättel")

**Impact-Analyse:**

```
Geplanter Lagerbestand 21. Feb:
- SAT_FT: 1.500 Stück

Nach Verlust:
- SAT_FT: 1.200 Stück (-300)

März-Produktion Allrounder:
- Benötigt: 3.000× SAT_FT
- Verfügbar: 1.200× SAT_FT
- Fehlend: 1.800× SAT_FT

❌ Können nur 40% der Allrounder bauen!
```

**Gegenmaßnahmen:**
1. **Express-Nachbestellung** (höhere Kosten)
2. **Varianten-Priorität anpassen** (FCFS)
3. **Kundenkommunikation** (Lieferverzug transparent machen)

**SCOR-Metriken-Impact:**
- Reliability: ↓↓ (stark betroffen)
- Cost: ↑ (Express-Lieferung)
- Assets: ↓ (Lagerbestand reduziert)

### 7.5 Szenario 4: Schiffsverspätung (Shipment Delay)

**Beschreibung:**  
Seefracht verzögert sich durch Wetter, Hafenstau oder technische Probleme.

**Beispiel:**
```
Geplante Ankunft Hamburg: 16. Februar 2027
Grund: Taifun in Asien
Verspätung: +4 Tage
Neue Ankunft: 20. Februar 2027
```

**Parameter konfigurierbar:**
- **Ursprüngliche Ankunft:** Wann sollte es kommen? (z.B. 16. Feb)
- **Verspätung (Tage):** Wie lange? (z.B. 4 Tage)
- **Neue Ankunft:** Wann kommt es wirklich? (z.B. 20. Feb)

**Impact-Analyse:**

```
Produktion für 18. Februar geplant:
- Sättel sollten da sein: 16. Feb
- Kommen aber: 20. Feb
- Verspätung: 4 Tage

Auswirkung:
→ 18. Feb: KEINE Produktion möglich (Material fehlt)
→ 19. Feb: KEINE Produktion möglich
→ 20. Feb: Produktion kann starten

Verlust: 2 Tage Produktion = 2.080 Bikes!
```

**Gegenmaßnahmen:**
1. **Puffer-Tage einplanen** (Lager 5 Tage vorher auffüllen)
2. **Alternative Transportrouten** (teurer, aber schneller)
3. **Produktionsflexibilität** (andere Varianten vorziehen)

**SCOR-Metriken-Impact:**
- Responsiveness: ↓ (Order Cycle Time steigt)
- Agility: Wird getestet (wie gut reagieren wir?)
- Cost: ↑ (Notmaßnahmen)

---

## Kapitel 8: Die Bewertungskriterien - Wie erreiche ich 15 Punkte?

### 8.1 Übersicht der Anforderungen (A1-A13)

Das Projekt wird anhand von **13 Anforderungen** bewertet. Jede Anforderung prüft einen spezifischen Aspekt.

**Kategorien:**
- **Programmplanung** (A1-A2): Basis-Planung
- **Supply Chain** (A3-A7): Beschaffung & Logistik
- **Szenarien** (A8-A9): Risiko-Management
- **End-to-End** (A10-A11): Gesamtsystem
- **Optimierung** (A12-A13): Fortgeschritten

### 8.2 Anforderung A1: Wochenplanung + 'Heute'-Datum

**Was wird geprüft?**
- Ist die Programmplanung auf **Wochenbasis**?
- Gibt es ein **konfigurierbares 'Heute'-Datum**?
- Wird **Frozen Zone** (Vergangenheit) berücksichtigt?

**Konzept: Frozen Zone**

```
01.01.2027 ─────────[ HEUTE: 15.04.2027 ]─────────── 31.12.2027
                            │
         VERGANGENHEIT      │        ZUKUNFT
         (Frozen Zone)      │     (Planning Zone)
                            │
     01.01. - 14.04.        │    15.04. - 31.12.
     ──────────────────     │    ───────────────
     • IST-Werte            │    • PLAN-Werte
     • Nicht änderbar       │    • Änderbar
     • Grau dargestellt     │    • Normal dargestellt
```

**Warum wichtig?**
- **Realismus:** In der Praxis kann Vergangenheit nicht geändert werden
- **Reporting:** Unterscheidung zwischen "Was ist passiert?" und "Was planen wir?"
- **Simulation:** Szenarien wirken nur auf Zukunft

**Beispiel:**

```
Heute = 15. April 2027

Tabelle zeigt:
KW 1-15: Grau hinterlegt, Werte fixiert (IST)
KW 16:    Teilweise grau (diese Woche läuft)
KW 17-52: Normal, Werte änderbar (PLAN)
```

**Prüfung:**
- ✅ Wochenansicht vorhanden?
- ✅ 'Heute'-Datum konfigurierbar?
- ✅ Frozen Zone visuell erkennbar?
- ✅ IST-Werte vs. PLAN-Werte getrennt?

### 8.3 Anforderung A2: Saisonalität + Stückliste + Error Management

**Was wird geprüft?**
- Ist **saisonale Verteilung** korrekt implementiert? (April = 16%)
- Ist **Stückliste** korrekt? (Sättel-Mapping)
- Ist **Error Management** vorhanden? (Rundungsfehler-Korrektur)
- Stimmt **Jahressumme exakt**? (370.000 Bikes)

**Die 3 Komponenten:**

**2.1 Saisonalität:**
```
Monat → Anteil → Berechnung
Januar: 4% → 370.000 × 0,04 = 14.800 Bikes
ismus: Vergangenheit kann nicht geändert werden
- Reporting: Trennung IST/PLAN
- Szenarien: Wirken nur auf Zukunft

### 9.9 Error Management (Rundungsfehler-Korrektur)

**Definition:** Technik zur Vermeidung systematischer Rundungsfehler

**Problem:**
370.000 Bikes / 365 Tage = 1.013,698... (Dezimalzahl)
→ Naive Rundung führt zu Jahres-Abweichung

**Lösung:**
Tracking des kumulativen Fehlers + Kompensation

**Wichtigkeit:**
- Zeigt mathematisches Verständnis
- Sichert exakte Jahressumme
- Verhindert Planungsabweichungen

### 9.10 FCFS (First-Come-First-Serve)

**Definition:** Priorisierungs-Regel nach Bestelldatum

**Prinzip:**
Älteste Bestellung = höchste Priorität

**Vorteil:**
- Einfach
- Gerecht
- Transparent
- Keine Optimierung nötig

**Nachteil:**
- Nicht optimal (höherer Profit möglich)
- Großkunden nicht bevorzugt

**Alternative:** Solver-Optimierung (komplexer)

---

## Kapitel 10: Zusammenfassung der Aufgabenstellung

### 10.1 Das große Bild

Adventure Works AG muss für das Jahr 2027:

**1. PLANEN:**
- 370.000 Mountain Bikes produzieren
- 8 Varianten berücksichtigen
- Saisonalität einbeziehen (April = Peak!)
- Error Management sicherstellen (exakte Zahlen)

**2. BESCHAFFEN:**
- Sättel von China-Zulieferer bestellen
- 49 Tage Vorlaufzeit berücksichtigen
- Losgröße 500 einhalten
- Spring Festival (8 Tage) umplanen
- Feiertage Deutschland berücksichtigen

**3. PRODUZIEREN:**
- Kapazität: 1.040 Bikes/Tag
- ATP-Check vor jedem Produktionsstart
- FCFS-Priorisierung bei Engpässen
- Deutsche Feiertage berücksichtigen

**4. MONITOREN:**
- SCOR-Metriken erfassen (10+ KPIs)
- Reliability, Responsiveness, Agility, Cost, Assets
- Visualisierungen erstellen
- Probleme frühzeitig erkennen

**5. SIMULIEREN:**
- 4 Szenarien implementieren
  - Marketingaktion (+Nachfrage)
  - Maschinenausfall (-Kapazität)
  - Transport-Schaden (-Bestand)
  - Schiffsverspätung (+Vorlaufzeit)
- Impact-Analyse
- Gegenmaßnahmen planen

### 10.2 Die Code-Ermäßigungen (90% weniger Komplexität)

**Was wurde vereinfacht?**

✂️ **Nur 1 Zulieferer:** China (statt 3: Deutschland, Spanien, China)  
✂️ **Nur Sättel:** 4 Varianten (statt 14 Bauteile mit Gabeln, Rahmen)  
✂️ **Nur Schiff+LKW:** Seefracht + LKW (keine Bahn)  
✂️ **Kein Outbound:** Keine Distribution zu 6 Märkten  
✂️ **FCFS statt Solver:** Einfache Priorisierung  

**Was bleibt gleich? (ALLES ANDERE!)**

✅ Alle Anforderungen A1-A13 (bis auf A12)  
✅ Alle Konzepte (ATP, SCOR, Error Management, Frozen Zone)  
✅ Alle Berechnungen (Saisonalität, Vorlaufzeit, etc.)  
✅ Alle Szenarien  
✅ Alle SCOR-Metriken  

**Vorteil:**
- Fokus auf Kernkonzepte
- Bessere Präsentierbarkeit
- Schnellere Implementierung
- Trotzdem volle Punktzahl (15) möglich!

### 10.3 Die kritischen Zahlen (zum Merken!)

**Produktionsvolumen:**
- **370.000 Bikes/Jahr** (NICHT 185.000!)
- 8 Varianten
- Allrounder = 30% (größte Gruppe)

**Saisonalität:**
- **April = 16%** (Peak!)
- Oktober/Dezember = 3% (Low Season)

**Vorlaufzeit China:**
- **49 Tage GESAMT** (NICHT 56!)
- 5 AT Produktion
- 2 AT LKW China
- 30 KT Seefracht
- 2 AT LKW Deutschland

**Losgröße:**
- **500 Sättel** pro Los (Minimum)

**Spring Festival 2027:**
- **5. - 11. Februar** (7 Tage)
- Kompletter Produktionsstopp in China

**Kapazität Dortmund:**
- 130 Bikes/Stunde
- 1.040 Bikes/Tag (8h Schicht)
- 370.000 Bikes/Jahr (355 Arbeitstage)

**SCOR-Metriken:**
- 10+ KPIs aus 5 Kategorien
- Ziel: Alle grün (≥95% vom Target)

### 10.4 Die 15-Punkte-Strategie

**Um 15 Punkte zu erreichen, muss das System:**

1. **Fachlich korrekt** sein
   - Alle Zahlen stimmen
   - Alle Konzepte implementiert
   - Keine Shortcuts bei Anforderungen

2. **Technisch sauber** sein
   - TypeScript mit strikten Types
   - Saubere Architektur
   - Keine hardcodierten Werte
   - Error Handling

3. **Gut dokumentiert** sein
   - Deutsche Kommentare
   - Konzepte erklärt
   - Entscheidungen begründet

4. **Präsentierbar** sein
   - Excel-ähnliche UI (vertraut)
   - Intuitive Navigation
   - Erklärbar in 10 Minuten

5. **Vollständig** sein
   - Alle A1-A13 erfüllt (bis auf A12)
   - Alle Szenarien funktionsfähig
   - Alle SCOR-Metriken

---

## Kapitel 11: Häufige Fehlerquellen (und wie man sie vermeidet)

### 11.1 Falsche Jahresproduktion (185.000 statt 370.000)

**Fehlerquelle:**
Alte Lösung von vor 2 Jahren hatte 185.000 Bikes

**❌ Falsch:**
```typescript
const jahresProduktion = 185_000; // ALTE Zahl!
```

**✅ Richtig:**
```typescript
// Aus JSON laden
import stammdaten from '@/data/stammdaten.json';
const jahresProduktion = stammdaten.jahresproduktion.gesamt; // 370.000
```

**Prüfung:**
- Alle Berechnungen mit 370.000?
- Saisonalität auf 370.000 basiert?

### 11.2 Falsche Vorlaufzeit (56 Tage statt 49)

**Fehlerquelle:**
8 Wochen = 56 Tage (ABER: korrekter Wert ist 49!)

**❌ Falsch:**
```typescript
const vorlaufzeit = 8 * 7; // 56 Tage (FALSCH!)
```

**✅ Richtig:**
```typescript
// Aus JSON laden
import lieferant from '@/data/lieferant-china.json';
const vorlaufzeit = lieferant.gesamtVorlaufzeitTage; // 49
```

**Warum 49 und nicht 56?**
- 5 + 2 + 30 + 2 = 39 Tage Prozesszeit
- + Puffer für Wochenenden/Feiertage
- = 49 Tage real

### 11.3 Fehlendes Error Management

**Fehlerquelle:**
Naive Rundung ohne Fehlerkorrektur

**❌ Falsch:**
```typescript
const tagesProduktion = Math.round(370_000 / 365); // Immer gleich!
// Jahressumme: 365 × 1.014 = 370.110 (110 zu viel!)
```

**✅ Richtig:**
```typescript
let fehler = 0.0;
for (let tag = 1; tag <= 365; tag++) {
  const soll = (370_000 / 365) * saisonFaktor;
  fehler += (soll - Math.round(soll));
  
  if (fehler >= 0.5) {
    produktion = Math.ceil(soll);
    fehler -= 1.0;
  } else if (fehler <= -0.5) {
    produktion = Math.floor(soll);
    fehler += 1.0;
  } else {
    produktion = Math.round(soll);
  }
}
// Jahressumme: EXAKT 370.000 ✅
```

### 11.4 Spring Festival vergessen

**Fehlerquelle:**
Nicht berücksichtigt → Produktion im März fällt aus!

**❌ Falsch:**
```typescript
// Bestellung am 1. Februar
// + 49 Tage = 21. März
// ABER: 5.-11. Feb = Spring Festival (keine Produktion!)
```

**✅ Richtig:**
```typescript
// Prüfen: Liegt Produktion im Spring Festival?
if (produktionDatum >= '2027-02-05' && produktionDatum <= '2027-02-11') {
  // Produktion pausiert
  // Verschieben auf 12. Februar
  // Neue Ankunft: 2. April (statt 21. März)
}
```

### 11.5 Losgröße pro Typ statt Gesamt

**Fehlerquelle:**
Losgröße auf jeden Sattel-Typ einzeln, nicht auf Tagesgesamtmenge

**❌ Falsch:**
```typescript
// Tagesbedarf:
// SAT_FT: 200, SAT_RL: 180, SAT_SP: 190, SAT_SL: 170

// Falsch: Pro Typ aufrunden
Bestellung:
- SAT_FT: 500 (aufgerundet von 200)
- SAT_RL: 500 (aufgerundet von 180)
- SAT_SP: 500 (aufgerundet von 190)
- SAT_SL: 500 (aufgerundet von 170)
GESAMT: 2.000 Sättel (viel zu viel!)
```

**✅ Richtig:**
```typescript
// Richtig: Gesamt aufrunden
Tagesgesamtbedarf: 200 + 180 + 190 + 170 = 740 Sättel
Auf Losgröße: 740 → 1.000 (2× 500)

Bestellung: 1.000 Sättel GESAMT
Verteilung nach Bedarf:
- SAT_FT: 270 (~27%)
- SAT_RL: 244 (~24%)
- SAT_SP: 257 (~26%)
- SAT_SL: 229 (~23%)
```

### 11.6 Hardcodierte Werte statt JSON

**Fehlerquelle:**
Magic Numbers im Code

**❌ Falsch:**
```typescript
const aprilAnteil = 16; // Woher kommt diese Zahl?
const vorlaufzeit = 49; // Nicht konfigurierbar!
```

**✅ Richtig:**
```typescript
// Aus KonfigurationContext
const { saisonalitaet, lieferant } = useKonfiguration();
const aprilAnteil = saisonalitaet.find(m => m.monat === 4)?.anteil;
const vorlaufzeit = lieferant.gesamtVorlaufzeitTage;
```

---

## Kapitel 12: Schlussbetrachtung

### 12.1 Was du jetzt gelernt hast

Nach dieser ausführlichen Erklärung der Aufgabenstellung verstehst du jetzt:

✅ **Geschäftsmodell:**
- Was macht Adventure Works?
- Warum brauchen sie SCM?
- Was ist OEM?

✅ **Supply Chain:**
- 5 SCOR-Prozesse (PLAN, SOURCE, MAKE, DELIVER, RETURN)
- Vorlaufzeiten & Durchlaufzeiten
- Arbeitstage vs. Kalendertage

✅ **Kernkonzepte:**
- ATP-Check (Available To Promise)
- Error Management (Rundungsfehler-Korrektur)
- Frozen Zone ('Heute'-Datum)
- FCFS-Priorisierung

✅ **Zeitparameter:**
- 370.000 Bikes/Jahr (NICHT 185.000)
- 49 Tage Vorlaufzeit (NICHT 56)
- April = 16% Peak (höchste Nachfrage)
- Spring Festival 5.-11. Feb (8 Tage Stopp)

✅ **Varianten & Komponenten:**
- 8 MTB-Varianten (Allrounder 30% größter)
- 4 Sattel-Typen (vereinfacht)
- Stückliste: 1 Bike = 1 Sattel

✅ **Feiertage:**
- 11 deutsche Feiertage (NRW)
- Spring Festival China (kritischster Punkt!)

✅ **Szenarien:**
- Marketingaktion (Demand Surge)
- Maschinenausfall (Supply Disruption)
- Transport-Schaden (Cargo Loss)
- Schiffsverspätung (Shipment Delay)

✅ **SCOR-Metriken:**
- 5 Kategorien: Reliability, Responsiveness, Agility, Cost, Assets
- 10+ KPIs zu erfassen
- Ampel-System (Grün/Gelb/Rot)

✅ **Anforderungen:**
- 13 Anforderungen (A1-A13)
- A12 entfallen (Code-Ermäßigung)
- Alle anderen MÜSSEN erfüllt sein für 15 Punkte

✅ **Ermäßigungen:**
- Nur China (nicht 3 Länder)
- Nur Sättel (nicht 14 Bauteile)
- Kein Outbound
- FCFS statt Solver
- 90% weniger Komplexität

### 12.2 Die Kernherausforderungen

**Die 3 größten Herausforderungen des Projekts:**

**1. Zeitplanung (49 Tage Vorlaufzeit)**
- Bestellung muss 49 Tage VOR Bedarf raus
- Spring Festival berücksichtigen
- Feiertage einplanen
- → **Kritischster Erfolgsfaktor!**

**2. Saisonalität (April-Peak)**
- 16% der Jahresproduktion in einem Monat
- Lageraufbau im März notwendig
- Kapazität am Limit
- → **Größtes Risiko für Engpässe!**

**3. Error Management (Exakte Zahlen)**
- 370.000 Bikes EXAKT (nicht 370.110)
- Kumulativer Rundungsfehler-Tracking
- Pro Variante eigener Fehler-Tracker
- → **Technisch anspruchsvollster Teil!**

### 12.3 Der Weg zur 15-Punkte-Lösung

**5 Erfolgsfaktoren:**

**1. Fachliche Tiefe**
- ALLE Konzepte verstanden (nicht nur oberflächlich)
- ALLE Zahlen korrekt (370.000, 49 Tage, 16%)
- ALLE Anforderungen erfüllt (A1-A13 außer A12)

**2. Technische Qualität**
- TypeScript strikte Types
- Keine hardcodierten Werte (alles aus JSON)
- Error Handling
- Saubere Architektur

**3. Deutsche Dokumentation**
- Umfangreiche Kommentare
- Konzepte erklärt (WARUM, nicht nur WAS)
- Für Prüfung/Präsentation optimiert

**4. Präsentierbarkeit**
- Excel-ähnliche UI (vertraut)
- Intuitive Navigation
- Erklärbar in 10 Minuten
- Visuelle Klarheit

**5. Vollständigkeit**
- Keine Abkürzungen
- Alle Szenarien funktionsfähig
- Alle SCOR-Metriken
- End-to-End nachvollziehbar

---

## 📝 ENDE TEIL 1: AUFGABENSTELLUNG

**Das war eine extrem ausführliche Erklärung der Aufgabenstellung!**

Du hast jetzt ein **fundiertes Verständnis** von:
- Dem Geschäftsmodell von Adventure Works
- Supply Chain Management Grundlagen
- SCOR-Modell und Metriken
- Alle 8 MTB-Varianten und 4 Sattel-Typen
- Vorlaufzeiten, Feiertage, Saisonalität
- Die 4 Szenarien
- Alle 13 Anforderungen (A1-A13)
- Kritische Konzepte (ATP, Error Management, Frozen Zone, FCFS)
- Häufige Fehlerquellen
- Die 15-Punkte-Strategie

**Wortanzahl Teil 1:** ~7.500 Wörter (nur Aufgabenstellung!)

---

## ⏭️ NÄCHSTER SCHRITT

Wenn du bereit bist, schreibe einfach **"weiter"** und ich erkläre dir:

# TEIL 2: DIE UMSETZUNG

- Wie wurde das System implementiert?
- Welche Technologien wurden gewählt?
- Wie funktioniert die Architektur?
- Welche Module gibt es?
- Wie greifen sie ineinander?
- Wie wurde Error Management umgesetzt?
- Wie funktioniert der ATP-Check?
- Wie werden Szenarien simuliert?
- Wie wurden die SCOR-Metriken berechnet?
- Und vieles mehr...

**Schreibe "weiter" für Teil 2!** 🚀

---

*Dokumentation erstellt am: 28. Januar 2025*  
*Projekt: Mountain Bike Supply Chain Management System*  
*Team: Pascal Wagner, Da Yeon Kang, Shauna Ré Erfurth, Taha Wischmann*  
*Ziel: 15 Punkte (Note 1+ / A+)*  
*HAW Hamburg - Wirtschaftsinformatik 3*
