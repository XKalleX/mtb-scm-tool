# 📋 Aufgabenstellung

> **Für Einsteiger:** Diese Seite erklärt das Geschäftsproblem und warum Adventure Works ein Supply Chain Management System braucht.

[[◀ Zurück zur Wiki-Übersicht](./README.md)] | [[Weiter: Supply Chain Konzepte ▶](./02-Supply-Chain-Konzepte.md)]

---

## 1. Was ist Adventure Works AG?

### Das Unternehmen

**Adventure Works AG** ist ein fiktives, aber realistisches Unternehmen, das **Mountain Bikes** herstellt:

- **Standort:** Dortmund, Deutschland
- **Branche:** Fahrradherstellung (spezialisiert auf Mountain Bikes)
- **Produktionsvolumen:** 370.000 Fahrräder pro Jahr (2027)
- **Art:** OEM-Hersteller (Original Equipment Manufacturer)

### Was bedeutet "OEM"?

**OEM (Original Equipment Manufacturer)** - Erklärung mit Beispiel:

**Analogie: Kuchen backen** 🎂

- Du kaufst **nicht** alle Zutaten einzeln beim Bauern (Mehl, Eier, Zucker)
- Du kaufst die **fertigen Zutaten** im Supermarkt
- Du **montierst** sie nur noch zusammen zum Kuchen

**Bei Adventure Works:**

- Sie produzieren **nicht** alle Einzelteile selbst (keine Rahmenfabrik, keine Gabelherstellung)
- Sie **kaufen** fertige Komponenten von Zulieferern:
  - **Sättel** aus China (Dengwong Manufacturing Ltd.)
  - *(In der Vollversion: Auch Gabeln, Rahmen aus Spanien/Deutschland)*
- Sie **montieren** diese Teile zu fertigen Mountain Bikes

**Warum ist das wichtig?**

- OEM bedeutet: Das Hauptproblem ist **NICHT** die Produktion der Teile
- Das Hauptproblem ist: **Wie bekomme ich die richtigen Teile zur richtigen Zeit am richtigen Ort?**
- Das nennt man **[Supply Chain Management](./02-Supply-Chain-Konzepte.md)** (Lieferkettenmanagement)

### Das Geschäftsmodell

Adventure Works produziert **[8 verschiedene Mountain Bike Varianten](./03-Produktstruktur.md)**. Der Prozess:

1. **Prognostizieren** die Nachfrage für ein ganzes Jahr (2027)
2. **Planen** die Produktion (Programmplanung)
3. **Bestellen** Komponenten bei Zulieferern (z.B. Sättel aus China)
4. **Warten** auf Lieferung ([49 Tage Vorlaufzeit](./04-Zeitparameter.md#vorlaufzeit-china)!)
5. **Montieren** die Bikes in Dortmund
6. **Verkaufen** sie (in unserer vereinfachten Version direkt, ohne Outbound-Logistik)

---

## 2. Warum braucht Adventure Works ein SCM-System?

### Das Problem ohne SCM-System

Stell dir vor, Adventure Works hätte **KEIN** System:

#### Szenario 1: Zu wenig Teile bestellt

- ❌ April ist Peak-Season (höchste Nachfrage - [16% der Jahresproduktion](./04-Zeitparameter.md#saisonalität))
- ❌ Sie haben nur genug Sättel für durchschnittliche Nachfrage bestellt
- ❌ Jetzt fehlen 10.000 Sättel
- ❌ Sie können 10.000 Bikes nicht bauen
- ❌ Kunden sind unzufrieden
- ❌ **Umsatzverlust:** ca. 3-5 Millionen Euro!

**Beispielrechnung:**
```
10.000 fehlende Bikes × 350€ Stückgewinn = 3.500.000€ Verlust
```

#### Szenario 2: Zu viele Teile bestellt

- ❌ Sie haben für November viele Teile bestellt (niedrige Nachfrage - nur 4% der Jahresproduktion)
- ❌ Die Teile liegen im Lager und kosten Geld
- ❌ **Lagerkosten:** Pro Sattel 0.50€ pro Monat
- ❌ Bei 50.000 überzähligen Sätteln = 25.000€ pro Monat verschwendet
- ❌ Kapital ist gebunden (kein Cashflow)

**Beispielrechnung:**
```
50.000 Sättel × 0.50€/Monat × 6 Monate = 150.000€ Lagerkosten
50.000 Sättel × 45€ Einkaufspreis = 2.250.000€ gebundenes Kapital!
```

#### Szenario 3: Falsche Zeitplanung

- ❌ Sie bestellen im Dezember Teile für Januar-Produktion
- ❌ **ABER:** China-Zulieferer braucht [49 Tage Vorlaufzeit](./04-Zeitparameter.md#vorlaufzeit-china)!
- ❌ Die Teile kommen erst im Februar an (zu spät)
- ❌ Produktion steht im Januar still
- ❌ **Kosten:** 10.000€ pro Tag Produktionsstillstand

**Beispielrechnung:**
```
20 Arbeitstage Stillstand × 10.000€/Tag = 200.000€ direkter Verlust
+ Imageschaden + verlorene Kunden = unbezahlbar!
```

#### Szenario 4: Spring Festival vergessen

- ❌ **28. Januar - 4. Februar 2027:** [Spring Festival in China](./04-Zeitparameter.md#spring-festival-2027)
- ❌ Zulieferer macht 8 Tage Pause (chinesisches Neujahr)
- ❌ Bestellungen werden nicht bearbeitet
- ❌ Produktion in China steht komplett still
- ❌ Wenn nicht eingeplant → **Produktionsstillstand** in Deutschland im März!

**Das Problem:**
```
Bestellung am 20. Januar → Normalerweise Lieferung am 9. März
ABER: 8 Tage Spring Festival Verzögerung
→ Tatsächliche Lieferung: 17. März
→ 8 Tage Produktionsausfall in Dortmund!
```

### Die Lösung: Ein SCM-System

Ein **Supply Chain Management System** löst all diese Probleme:

✅ **Bedarfsplanung:** Berechnet exakt, wie viele Teile wann benötigt werden  
✅ **Bestellplanung:** Berücksichtigt Vorlaufzeiten und bestellt rechtzeitig  
✅ **Feiertags-Management:** Plant um Spring Festival & deutsche Feiertage herum  
✅ **Szenario-Simulation:** "Was passiert, wenn...?" ([4 operative Szenarien](./05-Szenarien.md))  
✅ **Echtzeit-Monitoring:** Warnt bei Engpässen und Problemen  
✅ **Optimierung:** Minimiert Lagerkosten bei maximaler Liefertreue  

### Das Ergebnis mit SCM-System

| Bereich | Vorher (ohne System) | Nachher (mit System) | Einsparung |
|---------|---------------------|----------------------|------------|
| **Lagerkosten** | 500.000€/Jahr | 180.000€/Jahr | **-64%** ✅ |
| **Fehlmengen** | 8 pro Jahr | 1-2 pro Jahr | **-75%** ✅ |
| **Liefertreue** | 82% | 94.2% | **+12%** ✅ |
| **Produktionsstillstände** | 15 Tage/Jahr | 2-3 Tage/Jahr | **-80%** ✅ |
| **Planungsaufwand** | 40h/Woche | 8h/Woche | **-80%** ✅ |

**Gesamtertrag:**
- 💰 **Direkte Einsparungen:** ~500.000€ pro Jahr
- 😊 **Kunden zufrieden:** Bikes pünktlich verfügbar
- 📊 **Transparenz:** Management sieht sofort: Was läuft gut? Was nicht?
- 🚀 **Wettbewerbsvorteil:** Schneller & günstiger als Konkurrenz

---

## 3. Die Projektaufgabe (WI3 Kurs)

### Ziel der Aufgabe

Entwickle ein **funktionsfähiges SCM-System** für Adventure Works AG, das:

1. **Programmplanung** - 370.000 Bikes auf 365 Tage verteilen (mit [Saisonalität](./04-Zeitparameter.md#saisonalität))
2. **Bedarfsrechnung** - Automatische Berechnung des Komponenten-Bedarfs
3. **Bestellplanung** - Berücksichtigung von Vorlaufzeiten & Feiertagen
4. **Produktionssteuerung** - [ATP-Check](./02-Supply-Chain-Konzepte.md#atp-check) & Kapazitätsplanung
5. **Szenario-Simulation** - [4 operative Szenarien](./05-Szenarien.md) durchspielen
6. **Performance-Monitoring** - [SCOR-Metriken](./02-Supply-Chain-Konzepte.md#scor-metriken) berechnen

### Code-Ermäßigungen (Vereinfachungen)

Um die Komplexität zu reduzieren, wurden folgende Ermäßigungen genehmigt:

| Vollversion | Code-Ermäßigung | Ersparnis |
|-------------|----------------|-----------|
| **3 Zulieferer** (Deutschland, Spanien, China) | **1 Zulieferer** (nur China) | -66% Komplexität |
| **14 Bauteile** (Rahmen, Gabeln, Sättel, etc.) | **4 Sättel** (nur Sättel) | -71% Komponenten |
| **3 Transportmittel** (LKW, Bahn, Schiff) | **2 Transportmittel** (LKW + Schiff, keine Bahn) | -33% Transport-Logik |
| **Outbound zu 6 Märkten** | **Kein Outbound** | -100% Distribution |
| **Excel-Solver Optimierung** | **FCFS-Regel** (First-Come-First-Serve) | Vereinfachte Priorisierung |

**Vorteil:** 90% weniger Komplexität bei gleichen Lernzielen! ✅

**Alle anderen Anforderungen** ([A1-A13](./06-Bewertungskriterien.md)) **bleiben vollständig bestehen!**

---

## 4. Die Supply Chain im Überblick

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ADVENTURE WORKS SUPPLY CHAIN                       │
│                         (Vereinfachte Version)                        │
└──────────────────────────────────────────────────────────────────────┘

[1] TIER 1 ZULIEFERER              [2] OEM PRODUKTION        [3] VERKAUF
    (China)                             (Dortmund)               
                                                               
┌─────────────────┐                ┌─────────────────┐       
│  Dengwong Mfg.  │   Sättel       │  Adventure      │       
│  Shanghai       │ ─────────────> │  Works AG       │ ──────> Händler
│                 │   49 Tage      │  (Montage)      │       
└─────────────────┘   Vorlauf      └─────────────────┘       
                                                               
  Produktion:                        Kapazität:               
  • SAT_FT (Fizik Tundra)           • 130 Bikes/Stunde      
  • SAT_RL (Raceline)               • 8h Schichten           
  • SAT_SP (Spark)                  • 1.040 Bikes/Tag        
  • SAT_SL (Speedline)              • ~370.000/Jahr          
                                                               
  Constraints:                       Input:                   
  • Spring Festival (8 Tage)        • Sättel aus China       
  • Losgröße: 500 Stück             • (Vereinfacht)     
  • Lieferintervall: 14 Tage                                 
```

**Kritische Erfolgsfaktoren:**

1. ⏱️ **49 Tage Vorlaufzeit** - Bestellungen müssen rechtzeitig erfolgen
2. 🎯 **Saisonalität** - April = 16% Peak, Oktober = 3% Low Season
3. 🎉 **Spring Festival** - 8 Tage Produktionsstopp in China
4. 📦 **Losgröße 500** - Mindestbestellmenge pro Sattel-Typ
5. ✅ **ATP-Check** - Material + Kapazität + Termin prüfen

---

## Weiterführende Links

- **[Supply Chain Konzepte →](./02-Supply-Chain-Konzepte.md)** - SCOR-Modell, ATP/CTP, Metriken
- **[Produktstruktur →](./03-Produktstruktur.md)** - 8 MTB-Varianten, 4 Sattel-Typen
- **[Zeitparameter →](./04-Zeitparameter.md)** - Vorlaufzeiten, Feiertage, Saisonalität
- **[Szenarien →](./05-Szenarien.md)** - 4 operative Szenarien
- **[Bewertungskriterien →](./06-Bewertungskriterien.md)** - A1-A13 Anforderungen
- **[Glossar →](./07-Glossar.md)** - Alle Fachbegriffe

[[◀ Zurück zur Wiki-Übersicht](./README.md)] | [[Weiter: Supply Chain Konzepte ▶](./02-Supply-Chain-Konzepte.md)]
