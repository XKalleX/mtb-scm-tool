# ⏱️ Zeitparameter & Planungshorizonte

> **Für Einsteiger:** Diese Seite erklärt alle zeitlichen Aspekte der Supply Chain - von Vorlaufzeiten über Feiertage bis zu Saisonalität und Error Management.

[[◀ Zurück: Produktstruktur](./03-Produktstruktur.md)] | [[Zurück zur Wiki-Übersicht](./README.md)]

---

## 📑 Inhaltsverzeichnis

1. [Vorlaufzeit China (49 Tage)](#1-vorlaufzeit-china-49-tage)
2. [Arbeitstage vs. Kalendertage](#2-arbeitstage-vs-kalendertage)
3. [Deutsche Feiertage 2027 (NRW)](#3-deutsche-feiertage-2027-nrw)
4. [Spring Festival 2027](#4-spring-festival-2027)
5. [Saisonalität](#5-saisonalität)
6. [Error Management](#6-error-management)
7. [Losgröße (500 Sättel)](#7-losgröße-500-sättel)
8. [Navigation](#navigation)

---

## 1. Vorlaufzeit China (49 Tage)

### 1.1 Die Gesamtvorlaufzeit

Die **Vorlaufzeit** (Lead Time) ist die Zeit von der Bestellung bis zur Ankunft der Teile im Werk Dortmund.

**Gesamtvorlaufzeit: 49 Tage (7 Wochen)**

Diese setzt sich aus 4 Komponenten zusammen:

```
┌──────────────────────────────────────────────────────────────────┐
│                    VORLAUFZEIT: 49 TAGE                           │
└──────────────────────────────────────────────────────────────────┘

Tag 1-5:      [🏭 PRODUKTION]          5 Arbeitstage (AT)
              Dengwong Manufacturing, Shanghai
              - Nur Montag-Freitag
              - KEINE Wochenenden
              - KEINE Feiertage (z.B. Spring Festival)
              ↓

Tag 6-7:      [🚛 LKW CHINA]           2 Arbeitstage (AT)
              Dengwong → Hafen Shanghai
              - Nur Montag-Freitag
              - Kein Wochenende
              ↓

Tag 8-37:     [🚢 SEEFRACHT]           30 Kalendertage (KT)
              Hafen Shanghai → Hafen Hamburg
              - 24/7 unterwegs
              - AUCH Wochenenden!
              - AUCH Feiertage!
              ↓

Tag 38-39:    [🚛 LKW DEUTSCHLAND]     2 Arbeitstage (AT)
              Hafen Hamburg → Werk Dortmund
              - Nur Montag-Freitag
              - Kein Wochenende
              ↓

Tag 40-49:    [Buffer durch Wochenenden und Timing]
              
= 49 TAGE GESAMT (inkl. aller Wochenenden und Puffer)
```

### 1.2 Detaillierte Aufschlüsselung

| Schritt | Aktivität | Dauer | Einheit | Beschreibung |
|---------|-----------|-------|---------|--------------|
| 1 | Produktion | 5 | AT | Fertigung beim Zulieferer in Shanghai |
| 2 | LKW-Transport China | 2 | AT | Transport zum Hafen Shanghai |
| 3 | Seefracht | 30 | KT | Schiffstransport nach Hamburg (24/7) |
| 4 | LKW-Transport Deutschland | 2 | AT | Transport zum Werk Dortmund |
| **GESAMT** | **Vorlaufzeit** | **49** | **Tage** | **Inklusive Wochenenden und Timing** |

**AT** = Arbeitstage (Montag-Freitag, ohne Feiertage)  
**KT** = Kalendertage (durchgehend, 24/7)

### 1.3 Warum NICHT 56 Tage?

**⚠️ HÄUFIGER FEHLER - BITTE BEACHTEN!**

In einer älteren Version der Aufgabenstellung stand fälschlicherweise **56 Tage** (8 Wochen).

**❌ FALSCH: 56 Tage (veraltet)**
- Dies war ein Fehler in der MTB_v5 Aufgabenstellung
- Entsteht durch einfache Rechnung: 5+2+30+2 = 39 AT → aufgerundet auf 8 Wochen = 56 Tage

**✅ KORREKT: 49 Tage (aktuelle Version)**
- Realistischere Berechnung unter Berücksichtigung von Wochenenden
- 7 Wochen Gesamtdauer
- In JSON-Dateien hinterlegt: `gesamtVorlaufzeitTage: 49`
- Quelle: `src/data/lieferant-china.json`

**Begründung für 49 Tage:**

Die Seefracht läuft 24/7, also auch an Wochenenden. Dadurch verkürzt sich die Gesamtdauer:

```
Beispiel-Rechnung (realistisch):
───────────────────────────────────────
Montag    Tag 1: Bestellung aufgegeben
Tag 1-5:  Produktion (Mo-Fr)             = 5 AT
Tag 6-7:  LKW China (Mo-Di Folgewoche)   = 2 AT
Tag 8-37: Seefracht (Di-Do nach 30 KT)   = 30 KT (inkl. Wochenenden!)
Tag 38-39: LKW Deutschland (Do-Fr)       = 2 AT

Mittwoch  Tag 49: Ankunft im Werk Dortmund

= 49 Tage (ca. 7 Wochen)
```

### 1.4 Praktisches Beispiel

**Szenario:** Wir brauchen Sättel für die Januar-Produktion 2027.

```
01. Januar 2027: Produktion in Dortmund soll starten
↓ 49 Tage zurückrechnen
13. November 2026: Bestellung MUSS in China eingehen!

Zeitstrahl:
─────────────────────────────────────────────────────────────
13.11.2026: Bestellung in China
18.11.2026: Produktion abgeschlossen (5 AT)
20.11.2026: Am Hafen Shanghai (2 AT LKW)
20.12.2026: Im Hafen Hamburg (30 KT Schiff)
24.12.2026: Im Werk Dortmund (2 AT LKW)

Aber ACHTUNG: 
- 24.-26.12. = Weihnachten (Feiertag)
- Puffer einplanen!

→ Sichere Bestellung: 01. November 2026!
```

**Wichtige Erkenntnis:**

🔴 **OHNE 49-Tage-Planung:**
- Bestellung zu spät → Januar-Produktion fällt aus
- Kosten: ~10.000€ pro Tag Produktionsstillstand
- Kundenunzufriedenheit

🟢 **MIT 49-Tage-Planung:**
- Bestellung rechtzeitig → Produktion läuft planmäßig
- Teile sind da, wenn gebraucht
- Just-in-Time Lieferung

---

## 2. Arbeitstage vs. Kalendertage

### 2.1 Was ist der Unterschied?

In der Supply Chain gibt es **zwei Arten von Zeitangaben**:

| Typ | Abkürzung | Bedeutung | Gilt für |
|-----|-----------|-----------|----------|
| **Arbeitstage** | AT | Montag-Freitag, ohne Feiertage | Produktion, LKW-Transport, Büroarbeit |
| **Kalendertage** | KT | Durchgehend, 24/7 | Seefracht, Lagerbestand, Wartezeiten |

### 2.2 Was zählt als Arbeitstag?

**✅ Arbeitstage:**
- Montag bis Freitag
- KEINE Feiertage
- KEINE Wochenenden

**❌ KEINE Arbeitstage:**
- Samstag, Sonntag
- Gesetzliche Feiertage (Deutschland: NRW)
- Gesetzliche Feiertage (China: Shanghai)
- Spring Festival (siehe Kapitel 4)

### 2.3 Praktische Rechnung

**Beispiel: "5 Arbeitstage" bedeutet NICHT 5 Kalendertage!**

```
Produktion startet: Donnerstag, 10. Januar 2027
+ 5 Arbeitstage = ?

Tag 1 (AT): Do, 10. Januar  ✓
Tag 2 (AT): Fr, 11. Januar  ✓
            ───────────────────────
            Sa, 12. Januar  ✗ (Wochenende, übersprungen!)
            So, 13. Januar  ✗ (Wochenende, übersprungen!)
            ───────────────────────
Tag 3 (AT): Mo, 14. Januar  ✓
Tag 4 (AT): Di, 15. Januar  ✓
Tag 5 (AT): Mi, 16. Januar  ✓

Produktion fertig: Mittwoch, 16. Januar
                   ↓
= 5 Arbeitstage = 8 Kalendertage (inkl. Wochenende!)
```

### 2.4 Unterschiede Deutschland vs. China

| Kriterium | Deutschland (NRW) | China (Shanghai) |
|-----------|-------------------|------------------|
| **Wochenende** | Samstag + Sonntag | Samstag + Sonntag |
| **Arbeitswoche** | Montag-Freitag (5 Tage) | Montag-Freitag (5 Tage) |
| **Feiertage/Jahr** | 11 gesetzliche Feiertage | ~23 gesetzliche Feiertage |
| **Besonderheit** | Fronleichnam, Allerheiligen (NRW!) | Spring Festival (7-8 Tage!) |
| **Produktionsstopp** | Einzelne Tage | Spring Festival = 7-8 Tage am Stück! |

**Wichtig für Planung:**

- China hat **mehr Feiertage** als Deutschland
- **Spring Festival** ist der kritischste Punkt (7-8 Tage Komplett-Stopp!)
- Feiertage müssen in Vorlaufzeit-Berechnung eingeplant werden

---

## 3. Deutsche Feiertage 2027 (NRW)

### 3.1 Übersicht

Adventure Works produziert in **Dortmund, Nordrhein-Westfalen (NRW)**. 

**NRW hat 11 gesetzliche Feiertage**, inklusive:
- **Fronleichnam** (nicht in allen Bundesländern)
- **Allerheiligen** (nicht in allen Bundesländern)

### 3.2 Feiertage 2027 (Komplett-Liste)

| Nr. | Datum | Wochentag | Feiertag | Auswirkung |
|-----|-------|-----------|----------|------------|
| 1 | 01.01.2027 | Freitag | **Neujahr** | ❌ Keine Produktion |
| 2 | 02.04.2027 | Freitag | **Karfreitag** | ❌ Keine Produktion (in PEAK Season!) |
| 3 | 05.04.2027 | Montag | **Ostermontag** | ❌ Keine Produktion (in PEAK Season!) |
| 4 | 01.05.2027 | Samstag | **Tag der Arbeit** | ⚪ Ohnehin Wochenende |
| 5 | 13.05.2027 | Donnerstag | **Christi Himmelfahrt** | ❌ Keine Produktion |
| 6 | 24.05.2027 | Montag | **Pfingstmontag** | ❌ Keine Produktion |
| 7 | 03.06.2027 | Donnerstag | **Fronleichnam** | ❌ Keine Produktion (NRW!) |
| 8 | 03.10.2027 | Sonntag | **Tag der Deutschen Einheit** | ⚪ Ohnehin Wochenende |
| 9 | 01.11.2027 | Montag | **Allerheiligen** | ❌ Keine Produktion (NRW!) |
| 10 | 25.12.2027 | Samstag | **1. Weihnachtsfeiertag** | ⚪ Ohnehin Wochenende |
| 11 | 26.12.2027 | Sonntag | **2. Weihnachtsfeiertag** | ⚪ Ohnehin Wochenende |

**Quelle:** `src/data/feiertage-deutschland.json`

### 3.3 Kritische Feiertage für Planung

**🔴 Besonders kritisch: April 2027**

April ist der **Peak-Season-Monat** (16% der Jahresproduktion), aber:

- **02.04.2027 (Freitag):** Karfreitag → Keine Produktion
- **05.04.2027 (Montag):** Ostermontag → Keine Produktion

**Konsequenz:**
```
April 2027 hat normalerweise: ~22 Arbeitstage
ABER mit Karfreitag + Ostermontag: nur 20 Arbeitstage!

Normal: 59.200 Bikes / 22 AT = 2.691 Bikes/Tag
Real:   59.200 Bikes / 20 AT = 2.960 Bikes/Tag (+10% Druck!)

→ Kapazität: 1.040 Bikes/Tag → KEIN Problem
→ Aber: Material muss VOR Ostern da sein!
```

### 3.4 Auswirkung auf Produktion

**An Feiertagen:**
- ❌ Keine Produktion im Werk Dortmund
- ❌ Kein LKW-Transport in Deutschland
- ✅ Seefracht läuft weiter (Schiffe auf See)
- ✅ Lagerbestand bleibt unverändert

**Planungsregel:**

> An deutschen Feiertagen wird die Tagesproduktion **NICHT** nachgeholt, sondern auf die verbleibenden Arbeitstage des Monats verteilt.

---

## 4. Spring Festival 2027

### 4.1 Was ist das Spring Festival?

**Spring Festival** (春节, Chūnjié) = **Chinesisches Neujahr**

- Das wichtigste Fest in China (wie Weihnachten + Neujahr zusammen)
- **7-8 Tage** kompletter Produktionsstopp
- Ganz China steht still (Fabriken, Büros, Transport)

**Für Adventure Works: Der kritischste Zeitpunkt im Jahr!**

### 4.2 Spring Festival 2027 - Die exakten Daten

**Original-Angabe (PROJEKTERKLAERUNG.md):**
- 6. Februar - 11. Februar 2027 = **6 Tage**

**Reale Kalenderdaten (China-Feiertage JSON):**
- **06.02. - 11.02.2027 = 6 Tage** (offizielle Feiertage)

**Wichtig:** In der Praxis nutzen wir die **JSON-Daten** als Single Source of Truth:

```json
{
  "datum": "2027-02-06", "name": "Spring Festival Tag 1"
  "datum": "2027-02-07", "name": "Spring Festival (Tag 2)"
  "datum": "2027-02-08", "name": "Spring Festival (Tag 3)"
  "datum": "2027-02-09", "name": "Spring Festival (Tag 4)"
  "datum": "2027-02-10", "name": "Spring Festival (Tag 5)"
  "datum": "2027-02-11", "name": "Spring Festival (Tag 6)"
}
```

**Quelle:** `src/data/feiertage-china.json`

### 4.3 Warum so kritisch?

**Im Gegensatz zu deutschen Feiertagen:**

- ❌ **6 Tage AM STÜCK** (nicht einzelne Tage)
- ❌ **Kompletter Produktionsstopp** beim Zulieferer
- ❌ **Keine neuen Bestellungen** angenommen
- ❌ **Laufende Bestellungen pausiert** (5 AT Produktion unterbrochen!)
- ✅ **NUR Schiffe auf See fahren weiter**

```
┌────────────────────────────────────────────────────────────┐
│           SPRING FESTIVAL 2027: DIE KRITISCHE PHASE         │
└────────────────────────────────────────────────────────────┘

06.02.   07.02.   08.02.   09.02.   10.02.   11.02.
  🚫       🚫       🚫       🚫       🚫       🚫
  Tag 1    Tag 2    Tag 3    Tag 4    Tag 5    Tag 6
    └────────── Dengwong Werk: GESCHLOSSEN ──────────┘

Auswirkungen:
─────────────────────────────────────────────────────────────
❌ Produktion: STOPP (keine neuen Sättel gefertigt)
❌ Bestellungen: NICHT bearbeitet (erst ab 12.02. wieder)
⏸️ Laufende Produktion: PAUSIERT (Fortsetzung ab 12.02.)
✅ Schiffe auf See: Fahren normal weiter
```

### 4.4 Planungskonsequenzen

**Problem-Szenario:**

```
Ohne Spring Festival Planung:
──────────────────────────────────────────────────────────
25. Januar: Bestellung für März-Produktion aufgegeben
06. Feb - 11. Feb: Spring Festival → Produktion STOPPT
12. Februar: Produktion wird fortgesetzt
+ 5 AT Produktion
+ 2 AT LKW China
+ 30 KT Seefracht
+ 2 AT LKW Deutschland
= Ankunft ENDE MÄRZ statt Anfang März!

→ März-Produktion fällt aus oder verzögert sich!
→ Kosten: ca. 100.000€ Umsatzverlust
```

**Korrekte Planung:**

```
Mit Spring Festival Planung:
──────────────────────────────────────────────────────────
10. Januar: Bestellung für März MUSS raus
             ↓
15. Januar: Produktion abgeschlossen (VOR Spring Festival!)
             ↓
06. Feb - 11. Feb: Spring Festival (Ware bereits auf dem Schiff!)
             ↓
01. März: Ware trifft pünktlich in Dortmund ein

→ März-Produktion läuft planmäßig! ✅
```

**Faustregel:**

> **Für Produktion im März:** Bestellung MUSS **mindestens 49 Tage + 8 Tage Buffer** = **~60 Tage** vorher raus!  
> Also: Bestellung für März spätestens **Anfang Januar** aufgeben!

### 4.5 Impact auf Lagerplanung

**Strategie: Lager VOR Spring Festival aufbauen**

```
Januar-Planung (typisch):
──────────────────────────────────────────────────────────
Normale Bestellmenge: 14.800 Bikes × 1 Sattel = 14.800 Sättel
                      (auf 500er-Lose: 30 Bestellungen)

MIT Spring Festival Puffer:
──────────────────────────────────────────────────────────
Januar-Bedarf:   14.800 Sättel
Februar-Bedarf:  22.200 Sättel (teilweise!)
Puffer:          5.000 Sättel (Sicherheit)
                 ────────────────
GESAMT:          42.000 Sättel

= 84 Bestellungen à 500 Stück
= Lager aufbauen im Dezember!
```

**Resultat:**
- Lagerkosten steigen temporär (Dezember-Januar)
- ABER: Keine Produktionsausfälle im Februar/März
- Trade-off: Lagerkosten vs. Produktionsstillstand-Risiko

---

## 5. Saisonalität

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
- **Herbst/Winter (Oktober-Februar):** Low Season
  - Schlechtes Wetter
  - Kalt, Schnee
  - Weniger Outdoor-Aktivitäten

### 5.2 Monatliche Verteilung 2027

**Jahresproduktion: 370.000 Bikes**

| Monat | Anteil | Bikes | Bikes/Tag (ca.) | Saison-Status |
|-------|--------|-------|-----------------|---------------|
| Januar | 4% | 14.800 | 477 | ❄️ Low Season (Winter) |
| Februar | 6% | 22.200 | 793 | 📈 Steigend |
| März | 10% | 37.000 | 1.193 | 🌱 Frühling beginnt |
| **April** | **16%** | **59.200** | **1.973** | 🔥 **PEAK SEASON!** |
| Mai | 14% | 51.800 | 1.671 | ☀️ Hochsaison |
| Juni | 13% | 48.100 | 1.603 | ☀️ Hochsaison |
| Juli | 12% | 44.400 | 1.432 | ☀️ Sommer |
| August | 9% | 33.300 | 1.074 | 📉 Abnehmend |
| September | 6% | 22.200 | 740 | 🍂 Herbst |
| Oktober | 3% | 11.100 | 358 | 📉 Low Season |
| November | 4% | 14.800 | 493 | ❄️ Winter naht |
| Dezember | 3% | 11.100 | 358 | ❄️ Low Season |
| **SUMME** | **100%** | **370.000** | **1.014** | **Durchschnitt** |

**Quelle:** `src/data/saisonalitaet.json`

### 5.3 Visualisierung der Saisonalität

```
Monatliche Nachfrage (% der Jahresproduktion)
───────────────────────────────────────────────────────────

16% │                        ████
    │                        ████
14% │                   ████ ████
    │                   ████ ████
12% │              ████ ████ ████ ████
    │              ████ ████ ████ ████
10% │         ████ ████ ████ ████ ████
    │         ████ ████ ████ ████ ████
 8% │         ████ ████ ████ ████ ████
    │         ████ ████ ████ ████ ████      
 6% │    ████ ████ ████ ████ ████ ████ ████      
    │    ████ ████ ████ ████ ████ ████ ████ ████     
 4% │ ██ ████ ████ ████ ████ ████ ████ ████ ████      ██    ██
    │ ██ ████ ████ ████ ████ ████ ████ ████ ████ ██   ██    ██
 2% │ ██ ████ ████ ████ ████ ████ ████ ████ ████ ██   ██    ██
    └─┬──┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───
      J  F   M   A   M   J   J   A   S   O   N   D

🔥 PEAK: April = 16% (59.200 Bikes!)
❄️ LOW:  Oktober + Dezember = 3% (je 11.100 Bikes)
```

### 5.4 Warum ist das wichtig?

**Ohne Saisonalitäts-Planung:**
```
❌ Januar: Zu viele Teile bestellt → 10.000€ Lagerkosten
❌ April: Zu wenige Teile da → Produktionsstopp, Umsatzverlust
❌ Dezember: Wieder zu viele Teile → Kapital gebunden
```

**Mit Saisonalitäts-Planung:**
```
✅ Januar: 14.800 Bikes eingeplant → passende Bestellmenge
✅ April: 59.200 Bikes eingeplant → Material rechtzeitig da
✅ Dezember: 11.100 Bikes eingeplant → minimale Lagerkosten
```

**Praktisches Beispiel:**

```
April-Planung (Peak Season):
───────────────────────────────────────────────────────────
59.200 Bikes benötigt
= 59.200 Sättel benötigt
= 119 Bestellungen à 500 Sättel (aufgerundet)

Bestellung MUSS raus: 49 Tage vorher = Mitte Februar!

ABER: Spring Festival 5.-11. Februar!
→ Bestellung MUSS Anfang Februar raus!
→ ODER: Im Januar vorproduzieren lassen (Lager aufbauen)
```

---

## 6. Error Management

### 6.1 Das Problem

**Grundfrage:** Wie verteile ich 370.000 Bikes auf 365 Tage?

**Naive Rechnung:**
```
370.000 Bikes ÷ 365 Tage = 1.013,698630136986... Bikes/Tag
                           ↑
                        Dezimalzahl!
```

**Problem:** Computer können nur **ganzzahlige** Bikes produzieren (kein halber Bike!).

**❌ Naive Lösung 1: Immer abrunden**
```
Jeden Tag: Math.floor(1.013,698...) = 1.013 Bikes

Nach 365 Tagen: 1.013 × 365 = 369.745 Bikes
                               ──────────────
                               255 Bikes FEHLEN! ❌
```

**❌ Naive Lösung 2: Immer aufrunden**
```
Jeden Tag: Math.ceil(1.013,698...) = 1.014 Bikes

Nach 365 Tagen: 1.014 × 365 = 370.110 Bikes
                               ──────────────
                               110 Bikes ZU VIEL! ❌
```

**❌ Naive Lösung 3: Immer kaufmännisch runden**
```
Jeden Tag: Math.round(1.013,698...) = 1.014 Bikes

Nach 365 Tagen: 1.014 × 365 = 370.110 Bikes
                               ──────────────
                               Immer noch 110 zu viel! ❌
```

**Das Problem:** Systematische Rundungsfehler summieren sich auf!

### 6.2 Die Lösung: Kumulative Fehlerkorrektur

**Konzept: Error Management**

> Tracking des kumulativen Fehlers und Kompensation bei Überschreiten einer Schwelle.

**Algorithmus (Pseudocode):**

```python
# Initialisierung
fehler = 0.0  # Kumulativer Fehler
gesamt = 0    # Bisher produziert
sollWert = 370000 / 365  # 1.013,698...

# Für jeden Tag im Jahr
for tag in range(1, 366):
    # Soll-Produktion für heute (mit Saisonalität!)
    sollProduktion = sollWert * saisonFaktor[monat]
    
    # Fehler akkumulieren
    fehler += (sollProduktion - Math.round(sollProduktion))
    
    # Entscheidung treffen
    if fehler >= 0.5:
        # Fehler zu groß nach oben → aufrunden
        produktion = Math.ceil(sollProduktion)
        fehler -= 1.0  # Korrektur
    elif fehler <= -0.5:
        # Fehler zu groß nach unten → abrunden
        produktion = Math.floor(sollProduktion)
        fehler += 1.0  # Korrektur
    else:
        # Fehler im Rahmen → normal runden
        produktion = Math.round(sollProduktion)
    
    gesamt += produktion

# Validierung
assert gesamt == 370000, "Error Management fehlerhaft!"
```

### 6.3 Beispiel mit Zahlen

**Ohne Error Management:**
```
Tag 1: 1.013,698... → 1.014 (Fehler: -0,302)
Tag 2: 1.013,698... → 1.014 (Fehler: -0,302)
Tag 3: 1.013,698... → 1.014 (Fehler: -0,302)
...
Tag 365: Gesamt = 370.110 (110 zu viel!) ❌
```

**Mit Error Management:**
```
Tag 1: 1.013,698... → 1.014 (Fehler: -0,302)
Tag 2: 1.013,698... → 1.014 (Fehler: -0,604 = -0,302 × 2)
Tag 3: 1.013,698... → 1.013 (Fehler erreicht -0,5 → abrunden!)
                                Fehler wird auf +0,396 korrigiert
Tag 4: 1.013,698... → 1.014 (Fehler: +0,094)
Tag 5: 1.013,698... → 1.014 (Fehler: -0,208)
...
Tag 365: Gesamt = 370.000 EXAKT! ✅
```

### 6.4 Warum ist das wichtig?

**Fachliche Perspektive:**

- **Planung:** Jahresproduktion muss EXAKT 370.000 sein (Vertrag!)
- **Finanzen:** 110 Bikes Differenz = ~33.000€ Abweichung
- **Material:** Zu viel produziert = Material fehlt für nächstes Jahr
- **Qualität:** Zeigt technische Kompetenz (Prüfung!)

**Technische Perspektive:**

- **Anforderung A2:** Explizit gefordert!
- **Validierung:** Automatische Tests prüfen Jahressumme
- **Skalierbarkeit:** Funktioniert auch mit 1 Mio. Bikes/Jahr

**Implementierung im Code:**

Siehe: `src/lib/calculations/zentrale-produktionsplanung.ts`

```typescript
/**
 * Berechnet Tagesproduktion mit Error Management
 * Verhindert systematische Rundungsfehler über 365 Tage
 */
export function berechneTagesProduktionMitErrorManagement(
  variante: MTBVariante,
  tag: number,
  fehlerTracker: { wert: number }
): number {
  // Implementierung mit kumulativer Fehlerkorrektur
  // Resultat: Jahressumme = exakt 370.000 Bikes
}
```

---

## 7. Losgröße (500 Sättel)

### 7.1 Was ist eine Losgröße?

**Losgröße** (Batch Size / Lot Size) = Mindestmenge pro Bestellung

**Bei Dengwong Manufacturing:**
- **Losgröße: 500 Sättel**
- Mindestbestellung: 500 Stück
- Optimal: Vielfaches von 500 (500, 1.000, 1.500, ...)

**Quelle:** `src/data/lieferant-china.json` → `"losgroesse": 500`

### 7.2 Warum Losgrößen?

**Aus Zulieferer-Sicht:**

```
Setup-Kosten für Produktion:
───────────────────────────────────────────────────────────
- Maschine umrüsten: 2 Stunden
- Werkzeuge wechseln: 30 Minuten
- Qualitätsprüfung: 1 Stunde
- Verpackung vorbereiten: 30 Minuten
                          ────────────
Setup-Zeit GESAMT:        4 Stunden

Kosten: ca. 800€ pro Setup

→ Bei 50 Stück: 800€ / 50 = 16€ pro Sattel (TEUER!)
→ Bei 500 Stück: 800€ / 500 = 1,60€ pro Sattel (OK!)
→ Bei 5.000 Stück: 800€ / 5.000 = 0,16€ pro Sattel (BILLIG!)

Dengwong's Entscheidung: Mindestens 500 Stück!
```

**Economies of Scale:** Größere Losgrößen = niedrigere Stückkosten

### 7.3 Auswirkung auf Bestellungen

**Praktisches Beispiel:**

```
Tagesbedarf Adventure Works:
───────────────────────────────────────────────────────────
Januar (Low Season): 14.800 Bikes / 31 Tage = 477 Bikes/Tag
                     = 477 Sättel/Tag

Naive Bestellung: "Ich bestelle täglich 477 Sättel"
                  → Dengwong lehnt ab! (< 500)

Korrekte Bestellung: "Ich bestelle alle 2 Tage 500 Sättel"
                     = 250 Sättel/Tag im Durchschnitt
                     → Dengwong akzeptiert! ✓

ABER: In 2 Tagen brauche ich 2 × 477 = 954 Sättel!
      500 reichen nicht!

Realistische Bestellung: "Ich bestelle alle 2 Tage 1.000 Sättel"
                         (= 2 Lose à 500)
                         → Puffer eingebaut
                         → Lager baut sich auf
```

### 7.4 Trade-off: Losgrößen vs. Lagerkosten

**Das Dilemma:**

```
Kleine Losgrößen:
✅ Niedrige Lagerkosten (wenig Material auf Lager)
✅ Just-in-Time (Material kommt, wenn gebraucht)
❌ Hohe Setup-Kosten (viele kleine Bestellungen)
❌ Oft abgelehnt vom Zulieferer

Große Losgrößen:
✅ Niedrige Setup-Kosten (wenige große Bestellungen)
✅ Zulieferer zufrieden
❌ Hohe Lagerkosten (viel Material auf Lager)
❌ Kapital gebunden
```

**Optimale Strategie:**

```
Economic Order Quantity (EOQ) Formel:
───────────────────────────────────────────────────────────
EOQ = √(2 × D × S / H)

D = Demand (Jahresbedarf)      = 370.000 Sättel
S = Setup-Kosten               = 800€
H = Holding-Kosten (pro Stück) = 0,50€/Monat

EOQ = √(2 × 370.000 × 800 / 0,50) = √1.184.000.000 ≈ 34.410

Aber: Losgröße = 500!
→ Reale Bestellung: 34.410 / 500 ≈ 69 Lose à 500 = 34.500 Stück

→ Oder: Häufigere kleinere Bestellungen (z.B. alle 14 Tage 10-15 Lose)
```

**In der Praxis:**

Adventure Works bestellt:
- **Alle 14 Tage** (Lieferintervall)
- **Je nach Bedarf:** 10-30 Lose à 500 Sättel
- **Angepasst an Saisonalität:** April mehr, Dezember weniger

### 7.5 Implementierung im Code

**Bestellmengen-Berechnung:**

```typescript
// Tagesbedarf berechnen
const tagesbedarf = oemPlanung.filter(p => p.datum === heute)
  .reduce((sum, p) => sum + p.menge, 0);

// Auf Losgröße aufrunden
const losgroesse = 500;
const anzahlLose = Math.ceil(tagesbedarf / losgroesse);
const bestellmenge = anzahlLose * losgroesse;

// Beispiel:
// tagesbedarf = 740 Sättel
// anzahlLose = Math.ceil(740 / 500) = 2 Lose
// bestellmenge = 2 × 500 = 1.000 Sättel

console.log(`Tagesbedarf: ${tagesbedarf}`);
console.log(`Bestellmenge: ${bestellmenge} (${anzahlLose} Lose)`);
```

**Wichtig:**

- NICHT pro Sattel-Variante aufrunden!
- Sondern: **Tagesgesamtmenge** auf Losgröße aufrunden
- Beispiel: 200 SAT_FT + 300 SAT_RL + 240 SAT_SP = 740 gesamt → 1.000 bestellen

---

## Navigation

### Weitere Dokumentationen

- [[◀ Zurück: Produktstruktur](./03-Produktstruktur.md)] - Die 8 MTB-Varianten und 4 Sattel-Typen
- [[Zurück zur Wiki-Übersicht](./README.md)] - Alle Dokumentationen im Überblick

### Verwandte Konzepte

- **Vorlaufzeit:** Siehe auch [Supply Chain Konzepte](./02-Supply-Chain-Konzepte.md) → SOURCE-Prozess
- **Saisonalität:** Siehe auch [Supply Chain Konzepte](./02-Supply-Chain-Konzepte.md) → PLAN-Prozess
- **Feiertage:** Integriert in alle Berechnungen (siehe Code: `src/lib/helpers/feiertags-helper.ts`)
- **Error Management:** Implementiert in `src/lib/calculations/zentrale-produktionsplanung.ts`

### JSON-Datenquellen (Single Source of Truth)

```
📁 src/data/
├── lieferant-china.json           ← Vorlaufzeit, Losgröße, Transport
├── feiertage-deutschland.json     ← NRW Feiertage 2026-2028
├── feiertage-china.json            ← China Feiertage (inkl. Spring Festival)
└── saisonalitaet.json              ← Monatliche Verteilung (Jan 4% - Apr 16%)
```

### Code-Implementierungen

```
📁 src/lib/
├── calculations/
│   ├── zentrale-produktionsplanung.ts  ← Error Management
│   ├── bedarfsrechnung.ts              ← Losgrößen-Berechnung
│   └── warehouse.ts                     ← Lagerbestandsführung
└── helpers/
    ├── feiertags-helper.ts              ← Arbeitstage-Berechnung
    └── programm-aggregation.ts          ← Tag → Woche → Monat
```

---

## 🎯 Zusammenfassung

**Die 7 kritischsten Zeitparameter:**

1. ⏱️ **Vorlaufzeit: 49 Tage** (NICHT 56!) → Frühzeitige Bestellung!
2. 📅 **Arbeitstage vs. Kalendertage** → Korrekte Zeitrechnung
3. 🇩🇪 **11 deutsche Feiertage (NRW)** → Produktionsausfall einplanen
4. 🇨🇳 **Spring Festival (7-8 Tage)** → KRITISCHSTER Punkt! Buffer einbauen!
5. 📊 **April = 16% Peak** → Material rechtzeitig sichern
6. 🔢 **Error Management** → Exakt 370.000 Bikes/Jahr (keine Rundungsfehler!)
7. 📦 **Losgröße 500** → Bestellungen in Vielfachen von 500

**Erfolgsformel:**

> **Rechtzeitig planen** (49 Tage Vorlauf)  
> \+ **Saisonalität berücksichtigen** (April = Peak!)  
> \+ **Spring Festival umplanen** (Lager vorher aufbauen)  
> \+ **Error Management nutzen** (Jahressumme = exakt 370.000)  
> \= **Perfekte Supply Chain** ✅

---

**Letzte Aktualisierung:** 2024  
**Version:** 1.0  
**Status:** Vollständig dokumentiert
