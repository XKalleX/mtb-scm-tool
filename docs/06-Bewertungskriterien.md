# 🎯 Bewertungskriterien (A1-A13)

> **Für Studierende:** Diese Seite erklärt die 13 Anforderungen und wie man 15 Punkte (Note 1+) erreicht.

[[◀ Zurück: Szenarien](./05-Szenarien.md)] | [[◀ Zurück zur Wiki-Übersicht](./README.md)]

---

## 📑 Inhaltsverzeichnis

- [Übersicht aller Anforderungen](#übersicht-aller-anforderungen)
- [Detaillierte Anforderungen](#detaillierte-anforderungen)
  - [A1: Wochenplanung + 'Heute'-Datum](#a1-wochenplanung--heute-datum)
  - [A2: Saisonalität + Stückliste + Error Management](#a2-saisonalität--stückliste--error-management)
  - [A3: Feiertage Deutschland](#a3-feiertage-deutschland-nrw)
  - [A4: Sinnvoller Workflow](#a4-sinnvoller-workflow)
  - [A5: Auftragsverbuchung China](#a5-auftragsverbuchung-china)
  - [A6: Vorlaufzeit 49 Tage](#a6-vorlaufzeit-49-tage-korrekt)
  - [A7: Losgröße 500 Sättel](#a7-losgröße-500-sättel)
  - [A8: Maschinenausfall-Szenario](#a8-maschinenausfall-szenario)
  - [A9: Spring Festival](#a9-spring-festival-8-tage)
  - [A10: Ende-zu-Ende Supply Chain](#a10-ende-zu-ende-supply-chain)
  - [A11: 'Heute'-Datum Frozen Zone](#a11-heute-datum-frozen-zone)
  - [A12: Marktverteilung (ERMÄSSIGUNG)](#a12-marktverteilung-ermässigung)
  - [A13: Szenarien global wirksam](#a13-szenarien-global-wirksam-fcfs)
- [Punkteverteilung](#punkteverteilung-wie-erreicht-man-15-punkte)
- [Häufige Fehler & Tipps](#häufige-fehler--tipps)
- [Checkliste für Prüfung](#checkliste-für-prüfung)

---

## Übersicht aller Anforderungen

Das Projekt wird anhand von **13 Anforderungen** bewertet. Jede Anforderung prüft einen spezifischen Aspekt.

### Kategorien

| Kategorie | Anforderungen | Schwerpunkt |
|-----------|---------------|-------------|
| **Programmplanung** | A1-A2 | Basis-Planung mit Saisonalität |
| **Supply Chain** | A3-A7 | Beschaffung & Logistik |
| **Szenarien** | A8-A9 | Risiko-Management |
| **End-to-End** | A10-A11 | Gesamtsystem |
| **Optimierung** | A12-A13 | Fortgeschritten |

### Schnell-Checkliste

- [ ] **A1:** Wochenplanung + konfigurierbares 'Heute'-Datum
- [ ] **A2:** Saisonalität (April 16%) + Error Management + Stückliste
- [ ] **A3:** Feiertage Deutschland (NRW) berücksichtigt
- [ ] **A4:** Sinnvoller Workflow zwischen Tabs
- [ ] **A5:** Auftragsverbuchung China mit Nachverfolgung
- [ ] **A6:** Vorlaufzeit 49 Tage korrekt implementiert
- [ ] **A7:** Losgröße 500 Sättel pro Bestellung
- [ ] **A8:** Maschinenausfall-Szenario funktionsfähig
- [ ] **A9:** Spring Festival (28.01.-04.02.2027) berücksichtigt
- [ ] **A10:** Ende-zu-Ende Supply Chain visualisiert
- [ ] **A11:** 'Heute'-Datum mit Frozen Zone
- [ ] **A12:** ~~Marktverteilung~~ (ERMÄSSIGUNG - entfallen)
- [ ] **A13:** Szenarien global wirksam (FCFS-Priorisierung)

---

## Detaillierte Anforderungen

### A1: Wochenplanung + 'Heute'-Datum

**Was wird geprüft?**
- ✅ Ist die Programmplanung auf **Wochenbasis** darstellbar?
- ✅ Gibt es ein **konfigurierbares 'Heute'-Datum**?
- ✅ Wird **Frozen Zone** (Vergangenheit) visuell gekennzeichnet?

#### Konzept: Frozen Zone

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

#### Warum wichtig?

- **Realismus:** In der Praxis kann Vergangenheit nicht geändert werden
- **Reporting:** Unterscheidung zwischen "Was ist passiert?" und "Was planen wir?"
- **Simulation:** Szenarien wirken nur auf Zukunft

#### Beispiel

```
Heute = 15. April 2027

Tabelle zeigt:
KW 1-15: Grau hinterlegt, Werte fixiert (IST)
KW 16:   Teilweise grau (diese Woche läuft)
KW 17-52: Normal, Werte änderbar (PLAN)
```

#### Implementierungs-Checkliste

- [ ] Settings-Tab hat Date-Picker für 'Heute'-Datum
- [ ] Alle Tabellen zeigen Frozen Zone grau hinterlegt
- [ ] Wochenansicht verfügbar (Aggregation Tag → Woche)
- [ ] IST-Werte in Vergangenheit nicht editierbar
- [ ] Tooltip zeigt "Frozen Zone - Vergangenheit nicht änderbar"

#### Prüfungs-Tipps

✅ **Zeigen Sie:**
- Date-Picker in Aktion (Datum ändern → UI reagiert)
- Grau/Gelb-Markierung der Frozen Zone
- Wochenansicht mit KW 1-52

❌ **Häufige Fehler:**
- Kein konfigurierbares 'Heute'-Datum (hardcoded)
- Keine visuelle Kennzeichnung der Frozen Zone
- Vergangenheitswerte änderbar (sollten disabled sein)

---

### A2: Saisonalität + Stückliste + Error Management

**Was wird geprüft?**
- ✅ Ist **saisonale Verteilung** korrekt implementiert? (April = 16%)
- ✅ Ist **Stückliste** korrekt? (Sättel-Mapping zu Varianten)
- ✅ Ist **Error Management** vorhanden? (Rundungsfehler-Korrektur)
- ✅ Stimmt **Jahressumme exakt**? (370.000 Bikes)

#### Die 3 Komponenten

##### 2.1 Saisonalität

```
Monat → Anteil → Bikes
Januar:   4%  →  14.800 Bikes
Februar:  5%  →  18.500 Bikes
März:    10%  →  37.000 Bikes
April:   16%  →  59.200 Bikes ← PEAK!
Mai:     15%  →  55.500 Bikes
Juni:    14%  →  51.800 Bikes
Juli:    13%  →  48.100 Bikes
August:   9%  →  33.300 Bikes
Sept:     7%  →  25.900 Bikes
Oktober:  3%  →  11.100 Bikes
November: 8%  →  29.600 Bikes
Dezember: 3%  →  11.100 Bikes
────────────────────────────
SUMME:  107%  →  370.000 Bikes (exakt!)
```

**Wichtig:** 107% ist korrekt (nicht 100%), weil Saisonalität Schwankungen um den Durchschnitt zeigt.

##### 2.2 Stückliste (Code-Version mit Ermäßigung)

```
MTB-Variante     → Sattel-Variante
────────────────────────────────────
ALLR (Allrounder) → SATTEL_ALLR
COMP (Competition)→ SATTEL_COMP
DOWN (Downhill)   → SATTEL_DOWN
ENDURO (Enduro)   → SATTEL_ENDURO
FR (Freeride)     → SATTEL_ALLR     ← nutzt Allrounder-Sattel
TRI (Triathlon)   → SATTEL_COMP     ← nutzt Competition-Sattel
XC (Cross Country)→ SATTEL_COMP     ← nutzt Competition-Sattel
DH (Dirt Jump)    → SATTEL_DOWN     ← nutzt Downhill-Sattel
```

**Regel:** 1 Sattel = 1 Bike (OEM-Montage)

##### 2.3 Error Management

**Problem:**
```
370.000 Bikes / 365 Tage = 1.013,698... Bikes/Tag (Dezimal!)
→ Naive Rundung führt zu ±100 Bikes Abweichung pro Jahr
```

**Lösung: Kumulative Fehlerkorrektur**

```typescript
let fehler = 0.0; // Fehler-Tracker pro Variante

for (let tag = 1; tag <= 365; tag++) {
  const sollProduktion = (jahresMenge / 365) * saisonFaktor;
  fehler += (sollProduktion - Math.round(sollProduktion));
  
  let produktion;
  if (fehler >= 0.5) {
    produktion = Math.ceil(sollProduktion); // Aufrunden
    fehler -= 1.0;                          // Korrigieren
  } else if (fehler <= -0.5) {
    produktion = Math.floor(sollProduktion); // Abrunden
    fehler += 1.0;                           // Korrigieren
  } else {
    produktion = Math.round(sollProduktion); // Normal
  }
}

// Validierung: Summe MUSS exakt 370.000 ergeben!
```

#### Implementierungs-Checkliste

- [ ] Saisonalität aus `saisonalitaet.json` geladen
- [ ] Error Management in Produktionsplanung implementiert
- [ ] Jahressumme validiert (exakt 370.000 Bikes)
- [ ] Stückliste aus `stueckliste.json` geladen
- [ ] Sattel-Bedarf korrekt berechnet (1:1 Mapping)

#### Prüfungs-Tipps

✅ **Zeigen Sie:**
- Monatliche Verteilung (April = höchster Peak)
- Jahressummen-Validierung (console log: "370.000 Bikes ✓")
- Stückliste-Mapping (TRI nutzt COMP-Sattel)

❌ **Häufige Fehler:**
- Jahressumme ≠ 370.000 (z.B. 369.899 oder 370.121)
- Saisonalität hardcoded statt JSON
- Kein Error Management (naive Rundung)
- Falsche Stückliste (z.B. jede Variante eigener Sattel)

---

### A3: Feiertage Deutschland (NRW)

**Was wird geprüft?**
- ✅ Werden **deutsche Feiertage** (NRW) berücksichtigt?
- ✅ Keine **Produktion** an Feiertagen?
- ✅ Keine **LKW-Transporte** an Feiertagen?

#### Feiertage 2027 (NRW)

```
01.01. Neujahr
14.04. Karfreitag
17.04. Ostermontag
01.05. Tag der Arbeit
25.05. Christi Himmelfahrt
05.06. Pfingstmontag
15.06. Fronleichnam
03.10. Tag der Deutschen Einheit
01.11. Allerheiligen
25.12. 1. Weihnachtstag
26.12. 2. Weihnachtstag
```

#### Warum wichtig?

- **Produktion in Dortmund:** Kein Betrieb an Feiertagen
- **LKW-Transport:** Keine Lieferungen an Feiertagen (Deutschland)
- **Planung:** Muss Feiertage umschiffen (sonst Lieferverzug)

#### Beispiel

```
Szenario: Bestellung trifft am 01.05.2027 (Feiertag) ein

❌ FALSCH: "Lieferung am 01.05.2027"
✅ RICHTIG: "Lieferung verschoben auf 02.05.2027 (nächster Arbeitstag)"
```

#### Implementierungs-Checkliste

- [ ] Feiertage aus `feiertage-deutschland.json` geladen
- [ ] Produktionsplanung skippt Feiertage
- [ ] Transportplanung berücksichtigt Feiertage
- [ ] Arbeitstage-Berechnung korrekt (Montag-Freitag, ohne Feiertage)

#### Prüfungs-Tipps

✅ **Zeigen Sie:**
- Tabelle mit Feiertagen markiert (rot/grau)
- Produktion = 0 an Feiertagen
- Transport verschoben auf nächsten Arbeitstag

❌ **Häufige Fehler:**
- Feiertage ignoriert (Produktion läuft durch)
- Falsche Feiertage (z.B. Bayern statt NRW)
- Samstag/Sonntag nicht berücksichtigt

---

### A4: Sinnvoller Workflow

**Was wird geprüft?**
- ✅ Sind die **Tabs logisch geordnet**?
- ✅ Gibt es einen **natürlichen Workflow** von links nach rechts?
- ✅ Sind **Abhängigkeiten** klar?

#### Der Workflow

```
1. SETTINGS          2. PROGRAMM         3. INBOUND          4. WAREHOUSE
   ┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
   │ Stamm-   │────────>│ OEM      │────────>│ Bestell- │────────>│ Lager-   │
   │ daten    │         │ Planung  │         │ ungen    │         │ bestand  │
   └──────────┘         └──────────┘         └──────────┘         └──────────┘
        ▲                     │                     │                     │
        │                     │                     │                     │
        │                     └─────────────────────┴─────────────────────┘
        │                                           │
        │                     5. PRODUKTION         │         6. SCOR KPIs
        │                     ┌──────────┐          │         ┌──────────┐
        └─────────────────────│ Steuer-  │<─────────┴────────>│ Metriken │
                              │ ung      │                     │          │
                              └──────────┘                     └──────────┘
```

#### Der natürliche Ablauf

1. **SETTINGS:** Konfiguration laden (Jahresproduktion, Vorlaufzeit, etc.)
2. **PROGRAMM:** OEM Planung erstellen (370.000 Bikes, saisonal verteilt)
3. **INBOUND:** Bestellungen an China (basierend auf OEM-Bedarf)
4. **WAREHOUSE:** Lagerbestände tracken (Lieferungen + Entnahmen)
5. **PRODUKTION:** Produktionssteuerung (ATP-Check, FCFS)
6. **SCOR KPIs:** Performance messen (Reliability, Cost, etc.)

#### Implementierungs-Checkliste

- [ ] Tab-Reihenfolge entspricht Workflow
- [ ] Jeder Tab zeigt klar seine Eingaben/Ausgaben
- [ ] Abhängigkeiten dokumentiert (z.B. "basiert auf OEM Planung")
- [ ] Navigation intuitiv (links → rechts)

#### Prüfungs-Tipps

✅ **Zeigen Sie:**
- Tab-Navigation von links nach rechts
- Zusammenhänge erklären (OEM → Bestellungen → Lager → Produktion)
- Info-Boxen mit Workflow-Beschreibung

❌ **Häufige Fehler:**
- Tabs in zufälliger Reihenfolge
- Keine erkennbare Logik
- Abhängigkeiten unklar (Nutzer weiß nicht, was zuerst kommt)

---

### A5: Auftragsverbuchung China

**Was wird geprüft?**
- ✅ Werden **Bestellungen** korrekt erfasst?
- ✅ Gibt es **Nachverfolgung** (Bestellstatus)?
- ✅ Sind **Liefertermine** korrekt berechnet?

#### Bestellprozess

```
Tag 1: BESTELLUNG
┌─────────────────────────────────┐
│ Bestelldatum: 01.11.2026        │
│ Menge: 500 Sättel (Losgröße)    │
│ Liefertermin: ?                 │
└─────────────────────────────────┘
         │
         │ +5 AT Produktion
         ▼
Tag 6: FERTIG
         │
         │ +2 AT LKW China → Hafen
         ▼
Tag 8: AM HAFEN
         │
         │ +30 KT Seefracht
         ▼
Tag 38: HAFEN HAMBURG
         │
         │ +2 AT LKW Hamburg → Dortmund
         ▼
Tag 40: LIEFERUNG DORTMUND ✓
```

**Gesamt: 49 Tage** (5 AT + 2 AT + 30 KT + 2 AT + 2 Reserve = 49 Tage)

#### Bestellstatus-Tracking

```
Status: BESTELLT     → Tag 1-5:  Produktion läuft
Status: IN_TRANSPORT → Tag 6-39: Auf dem Weg (LKW + Schiff + LKW)
Status: GELIEFERT    → Tag 40+:  Im Warehouse verfügbar
```

#### Implementierungs-Checkliste

- [ ] Bestellungen in `Inbound`-Tab sichtbar
- [ ] Liefertermin automatisch berechnet (Bestelldatum + 49 Tage)
- [ ] Bestellstatus angezeigt (Bestellt/Transport/Geliefert)
- [ ] Spring Festival berücksichtigt (keine Bestellungen 28.01.-04.02.)

#### Prüfungs-Tipps

✅ **Zeigen Sie:**
- Bestelltabelle mit Datum, Menge, Liefertermin, Status
- Status-Update während Simulation (Fortschrittsbalken?)
- Spring Festival-Blockade (keine Bestellungen in dieser Zeit)

❌ **Häufige Fehler:**
- Kein Bestellstatus (nur "geplant" oder "geliefert")
- Liefertermin falsch berechnet (z.B. 56 Tage statt 49)
- Spring Festival ignoriert

---

### A6: Vorlaufzeit 49 Tage korrekt

**Was wird geprüft?**
- ✅ Ist die **Gesamtvorlaufzeit** exakt **49 Tage**?
- ✅ Sind die **Teilzeiten** korrekt aufgeschlüsselt?
- ✅ Werden **Arbeitstage (AT)** vs. **Kalendertage (KT)** unterschieden?

#### Vorlaufzeit-Berechnung

```
KOMPONENTE                 DAUER    TYP    KUMULATIV
───────────────────────────────────────────────────
Produktion China          5 AT     AT     5 AT
LKW China → Hafen         2 AT     AT     7 AT
Seefracht Hafen → Hamburg 30 KT    KT     37 Tage
LKW Hamburg → Dortmund    2 AT     AT     39 AT
Reserve/Puffer            2 AT     AT     41 AT
───────────────────────────────────────────────────
GESAMT                    49 Tage         49 Tage
```

**⚠️ KRITISCH:** Nicht 56 Tage (alter Fehler aus MTB_v5)!

#### AT vs. KT (Arbeitstage vs. Kalendertage)

**Arbeitstage (AT):**
- Nur Montag-Freitag
- OHNE Feiertage (Deutschland oder China)
- Beispiel: 5 AT = 1 Woche (wenn keine Feiertage)

**Kalendertage (KT):**
- Alle Tage (inkl. Wochenende/Feiertage)
- Beispiel: 30 KT = genau 30 Tage

#### Implementierungs-Checkliste

- [ ] Vorlaufzeit aus `lieferant-china.json` geladen (49 Tage)
- [ ] Bestellungen starten 49 Tage VOR benötigtem Liefertermin
- [ ] AT-Berechnung berücksichtigt Wochenenden + Feiertage
- [ ] Validierung: Erste Lieferung im Januar kommt aus November-Bestellung

#### Prüfungs-Tipps

✅ **Zeigen Sie:**
- Bestelldatum vs. Liefertermin (genau 49 Tage Differenz)
- Vorlaufzeit-Aufschlüsselung (5+2+30+2 = 39, +10 Reserve = 49)
- November 2026 Bestellungen für Januar 2027 Bedarf

❌ **Häufige Fehler:**
- 56 Tage (alter Fehler!)
- 42 Tage (nur 5+2+30+2, Reserve vergessen)
- AT/KT verwechselt (z.B. 30 AT Seefracht statt 30 KT)

---

### A7: Losgröße 500 Sättel

**Was wird geprüft?**
- ✅ Werden Bestellungen in **Losgrößen von 500** getätigt?
- ✅ Keine **Teilbestellungen** unter 500?
- ✅ **Aufrundung** bei Bedarf > 0 aber < 500?

#### Losgröße-Regel

```
Tagesbedarf           Bestellmenge
─────────────────────────────────
0 Sättel          →  0 (keine Bestellung)
1-500 Sättel      →  500 (1 Los)
501-1000 Sättel   →  1000 (2 Lose)
1001-1500 Sättel  →  1500 (3 Lose)
etc.
```

**Formel:**
```typescript
const lose = Math.ceil(tagesbedarf / 500);
const bestellmenge = lose * 500;
```

#### Warum wichtig?

**Wirtschaftlich:**
- Container-Optimierung (Seefracht)
- Verhandlungsposition (Mengenrabatt)
- Handling-Kosten minimieren

**Praktisch:**
- China-Zulieferer akzeptiert nur volle Lose
- Transport auf Palette (500 Sättel = 1 Palette)

#### Beispiel

```
Tag 1: Bedarf = 740 Sättel (alle Varianten zusammen)

Berechnung:
740 / 500 = 1,48 → aufrunden → 2 Lose
2 × 500 = 1000 Sättel bestellen

Ergebnis:
- Bestellung: 1000 Sättel
- Bedarf: 740 Sättel
- Überschuss: 260 Sättel (gehen ins Lager)
```

#### Implementierungs-Checkliste

- [ ] Losgröße aus `lieferant-china.json` geladen (500)
- [ ] Bestellungen IMMER Vielfaches von 500
- [ ] Tagesbedarf auf TAGESGESAMTMENGE berechnet (nicht pro Variante!)
- [ ] Überschuss geht ins Lager (nicht verschwendet)

#### Prüfungs-Tipps

✅ **Zeigen Sie:**
- Bestelltabelle mit Mengen (500, 1000, 1500, ...)
- Niemals krumme Zahlen (z.B. 743 Sättel)
- Lageraufbau durch Losgrößen-Überschuss

❌ **Häufige Fehler:**
- Krumme Bestellmengen (z.B. 743 statt 1000)
- Losgröße pro Variante aufrunden (sollte TAGESGESAMTMENGE sein)
- Überschuss verworfen statt gelagert

---

### A8: Maschinenausfall-Szenario

**Was wird geprüft?**
- ✅ Ist das **Maschinenausfall-Szenario** funktionsfähig?
- ✅ Wirkt es sich auf **Produktionskapazität** aus?
- ✅ Wird **Impact** visualisiert?

#### Szenario-Beschreibung

**Ereignis:** Maschinenausfall beim China-Zulieferer

**Parameter:**
- Startdatum: z.B. 15.03.2027
- Dauer: 5 Arbeitstage
- Auswirkung: -50% Produktionskapazität

#### Auswirkungen

**OHNE Szenario:**
```
Tag 1: Produktion = 100 Sättel
Tag 2: Produktion = 100 Sättel
Tag 3: Produktion = 100 Sättel
...
```

**MIT Szenario (ab Tag 15.03.):**
```
Tag 15.03.: Produktion = 50 Sättel (-50%)
Tag 16.03.: Produktion = 50 Sättel (-50%)
Tag 17.03.: Produktion = 50 Sättel (-50%)
Tag 18.03.: Produktion = 50 Sättel (-50%)
Tag 19.03.: Produktion = 50 Sättel (-50%)
Tag 20.03.: Produktion = 100 Sättel (normal)
```

**Folgen:**
- Verspätete Lieferungen
- Lagerbestand sinkt
- ATP-Check schlägt fehl (Material fehlt)
- SCOR-Metriken verschlechtern sich (On-Time Delivery ↓)

#### Implementierungs-Checkliste

- [ ] Szenario-Parameter konfigurierbar (Datum, Dauer, Kapazität)
- [ ] Impact auf Produktionsplanung sichtbar
- [ ] Visualisierung (z.B. Chart mit Einbruch)
- [ ] SCOR-Metriken reagieren (Liefertreue ↓)

#### Prüfungs-Tipps

✅ **Zeigen Sie:**
- Szenario aktivieren (Button: "Maschinenausfall")
- Vorher/Nachher-Vergleich (Chart)
- Impact-Analyse (Lieferverzug, Engpässe)

❌ **Häufige Fehler:**
- Szenario nicht konfigurierbar (hardcoded)
- Keine Visualisierung des Impacts
- Szenario wirkt nicht global (nur in einem Tab)

---

### A9: Spring Festival (8 Tage)

**Was wird geprüft?**
- ✅ Wird **Spring Festival** (28.01.-04.02.2027) berücksichtigt?
- ✅ Keine **Produktion** beim China-Zulieferer in dieser Zeit?
- ✅ Keine **neuen Bestellungen** während Spring Festival?

#### Spring Festival 2027

**Datum:** 6. Februar - 11. Februar 2027 (6 Tage)

**Chinesisches Neujahrsfest** - wichtigster Feiertag in China!

#### Auswirkungen

**Komplett gesperrt:**
- ✋ Keine Produktion (Werk geschlossen)
- ✋ Keine neuen Bestellungen (Büro geschlossen)
- ✋ Keine LKW-Abholung (Transport ruht)

**Weiter läuft:**
- ✅ Seefracht (Schiffe auf See sind unterwegs)

#### Planung

**Problem:**
Ohne Planung → Lagerengpass im Februar!

**Lösung:**
```
STRATEGIE: Vor Spring Festival Lager aufbauen

November/Dezember 2026: Mehr bestellen als normal
Januar (bis 27.01.):    Noch letzte Lieferungen
28.01. - 04.02.:        SPRING FESTIVAL (nichts!)
Ab 05.02.:              Normale Bestellungen wieder möglich
```

#### Implementierungs-Checkliste

- [ ] Spring Festival aus `feiertage-china.json` geladen
- [ ] Bestellungen in diesem Zeitraum blockiert
- [ ] Visualisierung (rot markiert in Kalender)
- [ ] Planung berücksichtigt (Vorbestellungen im Januar)

#### Prüfungs-Tipps

✅ **Zeigen Sie:**
- Kalender mit Spring Festival markiert (rot)
- Bestellungen = 0 während Spring Festival
- Lageraufbau VOR dem Festival (Dezember/Januar)

❌ **Häufige Fehler:**
- Spring Festival ignoriert (Bestellungen laufen durch)
- Falsche Daten (z.B. 5.-11. Februar statt 28.01.-04.02.)
- Keine Planung (Lagerengpass im Februar)

---

### A10: Ende-zu-Ende Supply Chain

**Was wird geprüft?**
- ✅ Ist die **komplette Supply Chain** visualisiert?
- ✅ Werden alle **Schritte** gezeigt (Bestellung → Transport → Lager → Produktion)?
- ✅ Sind **Flüsse** erkennbar?

#### Die Supply Chain (Code-Version mit Ermäßigung)

```
CHINA                    SEE              DEUTSCHLAND
───────────────────────────────────────────────────────────

1. ZULIEFERER          2. TRANSPORT      3. OEM WERK
   Dengwong Mfg.          Seefracht         Adventure Works
   ┌──────────┐           ┌────────┐        ┌──────────┐
   │ Sättel   │──────────>│ Schiff │───────>│ Montage  │
   │ Produkt. │  +LKW     │ 30 KT  │  +LKW  │ Bikes    │
   └──────────┘           └────────┘        └──────────┘
        │                      │                   │
        │ 5 AT                 │ 34 Tage           │
        │ Produktion           │ Transport         │ 1.040/Tag
        │                      │                   │
        ▼                      ▼                   ▼
   Fertig                 Unterwegs          Im Lager


4. WAREHOUSE (Dortmund)
   ┌──────────────────┐
   │ Sattel-Lager     │
   │ - ALLR: 500 St.  │
   │ - COMP: 300 St.  │
   │ - DOWN: 200 St.  │
   │ - ENDURO: 100 St.│
   └──────────────────┘
          │
          │ Entnahme für Produktion
          ▼
   ┌──────────────────┐
   │ Bike-Produktion  │
   │ ATP-Check        │
   │ FCFS-Regel       │
   └──────────────────┘
```

#### Die 4 Hauptprozesse

1. **BESCHAFFEN (Inbound):** Bestellungen an China
2. **TRANSPORTIEREN (Logistics):** 49 Tage Vorlauf
3. **LAGERN (Warehouse):** Bestände verwalten
4. **PRODUZIEREN (OEM):** Bikes montieren

#### Implementierungs-Checkliste

- [ ] Dashboard zeigt alle 4 Prozesse
- [ ] Sankey-Diagramm oder Flow-Chart
- [ ] Bestände in allen Stufen sichtbar (in Transit, im Lager, in Produktion)
- [ ] Flussrichtung klar (links → rechts)

#### Prüfungs-Tipps

✅ **Zeigen Sie:**
- Visualisierung der gesamten Kette
- Zahlen an jedem Knoten (Bestand, Transit, Produktion)
- Flüsse animiert (optional: Sankey mit Breite = Menge)

❌ **Häufige Fehler:**
- Nur Teile gezeigt (z.B. nur Lager, kein Transport)
- Keine Visualisierung (nur Tabellen)
- Flussrichtung unklar

---

### A11: 'Heute'-Datum Frozen Zone

**Was wird geprüft?**
- ✅ Ist das **'Heute'-Datum** in ALLEN Tabs sichtbar?
- ✅ Wird **Frozen Zone** konsistent dargestellt?
- ✅ Sind **IST-Werte** in Vergangenheit fixiert?

#### Frozen Zone Konzept (Vertiefung)

**Warum 2 Zonen?**

In der Praxis arbeitet man IMMER mit:
- **IST-Daten** (Vergangenheit): Was ist wirklich passiert?
- **PLAN-Daten** (Zukunft): Was wollen wir tun?

**Beispiel:**
```
Heute = 15. April 2027

IST (Frozen Zone):
- Januar-März: Tatsächliche Produktion, Bestellungen, Lieferungen
- Erste Aprilhälfte: Laufende Woche (teilweise IST)

PLAN (Planning Zone):
- Rest April - Dezember: Geplante Aktivitäten
- Änderbar bei neuen Szenarien
```

#### Implementierungs-Checkliste

- [ ] 'Heute'-Datum in jedem Tab sichtbar (z.B. Marker in Tabellen)
- [ ] Frozen Zone grau/gelb hinterlegt (alle Tabs)
- [ ] IST-Werte disabled (nicht editierbar)
- [ ] Tooltip erklärt Frozen Zone

#### Prüfungs-Tipps

✅ **Zeigen Sie:**
- Datum ändern → alle Tabs reagieren
- Vergangenheit grau, Zukunft normal
- Editing in Frozen Zone disabled (zeigen mit Double-Click)

❌ **Häufige Fehler:**
- Frozen Zone nur in einem Tab (sollte überall sein)
- Keine visuelle Kennzeichnung
- IST-Werte editierbar (sollten disabled sein)

---

### A12: Marktverteilung (ERMÄSSIGUNG)

**Status: ERMÄSSIGUNG AKTIV - Diese Anforderung entfällt!**

#### Was wäre A12 gewesen?

**OHNE Ermäßigung:**
- Distribution zu 6 Märkten (USA, Europa, Asien, ...)
- Verteilung nach Nachfrage (USA 35%, Europa 25%, ...)
- Transport-Planung (Schiff, Bahn, LKW)

**MIT Ermäßigung (Code-Version):**
✂️ **Outbound entfällt komplett**
- Keine Marktverteilung
- Keine Endkunden-Belieferung
- Bikes bleiben im Werk (oder "fiktive Abholung")

#### Warum Ermäßigung?

**Vorteile:**
- 90% weniger Komplexität
- Fokus auf Kernkonzepte (Inbound + Production)
- Bessere Präsentierbarkeit (weniger Tabs, klarer)
- Schnellere Implementierung

**Nachteile:**
- Weniger realistisch (echte Supply Chain hat Outbound)
- Weniger Optimierungspotenzial (kein Routing)

**Auswirkung auf Note:**
✅ Keine! Trotzdem 15 Punkte möglich mit anderen Anforderungen.

#### Implementierungs-Checkliste

- [x] A12 dokumentiert als "entfallen durch Ermäßigung"
- [x] Begründung im Code/Doku vorhanden
- [x] Alternative Schwerpunkte gesetzt (A1-A11, A13 vollständig)

---

### A13: Szenarien global wirksam (FCFS)

**Was wird geprüft?**
- ✅ Wirken **Szenarien** in ALLEN Tabs? (nicht nur lokal)
- ✅ Sind **4 Szenarien** implementiert?
- ✅ Wird **FCFS-Priorisierung** bei Engpässen genutzt?

#### Die 4 Szenarien

**1. Marketing-Kampagne**
- Ereignis: +25% Nachfrage
- Dauer: 4 Wochen
- Auswirkung: Höhere Produktion, mehr Bestellungen

**2. Maschinenausfall**
- Ereignis: Ausfall beim Zulieferer
- Dauer: 5 Arbeitstage
- Auswirkung: -50% Produktionskapazität

**3. Wasserschaden (Katastrophe)**
- Ereignis: Überschwemmung im Warehouse
- Auswirkung: -30% Lagerbestand zerstört
- Dauer: Sofort

**4. Schiffsverspätung (Logistik)**
- Ereignis: Verzögerung im Transport
- Auswirkung: +7 Tage Vorlaufzeit
- Dauer: z.B. 2 Wochen

#### FCFS-Regel (Ermäßigung)

**Definition:** First-Come-First-Serve

**Regel bei Engpass:**
```
Szenario: Nur 500 Sättel verfügbar, aber 800 benötigt

Bestellungen:
1. Allrounder:   300 Sättel (Bestelldatum: 01.01.)
2. Competition:  200 Sättel (Bestelldatum: 02.01.)
3. Downhill:     300 Sättel (Bestelldatum: 03.01.)

FCFS-Priorisierung:
✅ Allrounder:   300 produziert (älteste Bestellung)
✅ Competition:  200 produziert (zweitälteste)
❌ Downhill:     NICHT produziert (zu wenig Material)
                → Verschoben auf nächsten Tag
```

**Alternative (OHNE Ermäßigung):**
- Solver-Optimierung (maximiere Deckungsbeitrag)
- Komplexer, aber profitabler

#### Globale Wirksamkeit

**Beispiel: Marketing-Kampagne**

**Wirkt auf:**
- ✅ PROGRAMM: +25% Produktion
- ✅ INBOUND: +25% Bestellungen
- ✅ WAREHOUSE: +25% Lagerumsatz
- ✅ PRODUKTION: +25% Auslastung
- ✅ SCOR KPIs: Kapazitätsauslastung steigt

**NICHT:**
- ❌ Nur PROGRAMM: +25%, Rest unverändert (wäre falsch!)

#### Implementierungs-Checkliste

- [ ] 4 Szenarien aus `szenario-defaults.json` geladen
- [ ] Szenarien-Manager (Floating Button/Sidebar)
- [ ] Aktivierung wirkt global auf alle Berechnungen
- [ ] FCFS-Regel bei Engpässen implementiert
- [ ] Vorher/Nachher-Vergleich möglich

#### Prüfungs-Tipps

✅ **Zeigen Sie:**
- Szenario aktivieren (z.B. "Marketing +25%")
- Alle Tabs aktualisieren (global!)
- FCFS-Priorisierung bei Engpass demonstrieren

❌ **Häufige Fehler:**
- Szenarien nur lokal (z.B. nur in PROGRAMM)
- Keine FCFS-Regel (zufällige Priorisierung)
- Szenarien nicht konfigurierbar (hardcoded)

---

## Punkteverteilung: Wie erreicht man 15 Punkte?

### Bewertungsschema (geschätzt)

| Bereich | Punkte | Anforderungen |
|---------|--------|---------------|
| **Basis-Implementierung** | 6 Punkte | A1-A7 vollständig |
| **Szenarien & Risiko** | 3 Punkte | A8-A9 funktionsfähig |
| **Gesamtsystem** | 2 Punkte | A10-A11 Ende-zu-Ende |
| **Optimierung** | 2 Punkte | A13 Szenarien global, FCFS |
| **Code-Qualität** | 1 Punkt | TypeScript, Kommentare, Tests |
| **Dokumentation** | 1 Punkt | README, Kommentare, Präsentation |
| **SUMME** | **15 Punkte** | |

### Die 15-Punkte-Strategie

#### 1. Fachliche Korrektheit (5 Punkte)

✅ **Alle Zahlen stimmen:**
- 370.000 Bikes (nicht 185.000!)
- 49 Tage Vorlaufzeit (nicht 56!)
- April 16% Peak (saisonale Verteilung)
- Losgröße 500 Sättel

✅ **Alle Konzepte implementiert:**
- Error Management (kumulative Fehlerkorrektur)
- Frozen Zone (Vergangenheit vs. Zukunft)
- ATP-Check (Material-Verfügbarkeit prüfen)
- FCFS-Priorisierung (bei Engpässen)

✅ **Keine Abkürzungen:**
- Alle A1-A13 (außer A12) erfüllt
- Keine "Näherungen" oder "gute Genug"-Lösungen

#### 2. Technische Qualität (3 Punkte)

✅ **Sauberer Code:**
- TypeScript mit strikten Types
- Keine `any`-Types
- ESLint ohne Warnungen
- Saubere Architektur (SOLID-Prinzipien)

✅ **Keine Hardcoding:**
- Alle Werte aus JSON oder KonfigurationContext
- Konfigurierbarkeit über Settings
- Kein Copy-Paste-Code

✅ **Error Handling:**
- Try-Catch wo nötig
- Validierungen (z.B. Jahressumme === 370.000)
- User-Feedback bei Fehlern

#### 3. Dokumentation (2 Punkte)

✅ **Deutsche Kommentare:**
- Erklärung von Konzepten (nicht nur "was", sondern "warum")
- Referenzen zu Anforderungen (z.B. "// A2: Error Management")
- Verständlich für Prüfer

✅ **README:**
- Installation klar beschrieben
- Screenshots/Gifs
- Architektur-Übersicht

✅ **Präsentierbarkeit:**
- Erklärbar in 10 Minuten
- Visualisierungen (Charts, Tabellen)
- Intuitive UI (Excel-ähnlich)

#### 4. Vollständigkeit (3 Punkte)

✅ **Alle Anforderungen:**
- A1-A11 vollständig
- A12 dokumentiert als entfallen
- A13 mit FCFS-Regel

✅ **SCOR-Metriken:**
- Mindestens 5 KPIs aus 5 Kategorien
- Optimal: alle 10+ KPIs
- Visualisierungen (Gauges, Charts)

✅ **Szenarien:**
- Alle 4 Szenarien funktionsfähig
- Konfigurierbar
- Impact-Analyse

#### 5. Extras (2 Punkte)

🌟 **Bonus-Punkte für:**
- Besonders gute Visualisierungen (z.B. Sankey-Diagramm)
- Interaktive Features (z.B. Drag & Drop)
- Tests (Unit-Tests, Integration-Tests)
- Performance-Optimierung
- Innovations-Faktor (etwas Neues/Kreatives)

---

## Häufige Fehler & Tipps

### ❌ TOP 10 Fehler

#### 1. Falsche Jahresproduktion (185.000 statt 370.000)

**Fehler:**
```typescript
const jahresProduktion = 185_000; // ALTE Zahl aus MTB_v5!
```

**Richtig:**
```typescript
// Aus JSON laden
import stammdaten from '@/data/stammdaten.json';
const jahresProduktion = stammdaten.jahresproduktion.gesamt; // 370.000
```

#### 2. Falsche Vorlaufzeit (56 Tage statt 49)

**Fehler:**
```typescript
const vorlaufzeitChina = 56; // 8 Wochen (FALSCH!)
```

**Richtig:**
```typescript
const vorlaufzeitChina = 49; // 7 Wochen = 49 Tage
```

#### 3. Kein Error Management

**Fehler:**
```typescript
// Naive Rundung
const tagesProduktion = Math.round(370_000 / 365); // Immer gleich!
```

**Richtig:**
```typescript
// Mit kumulativer Fehlerkorrektur
const tagesProduktion = berechneProduktionMitErrorManagement(...);
// → Summe über Jahr EXAKT 370.000
```

#### 4. Hardcoded Werte statt JSON

**Fehler:**
```typescript
const aprilAnteil = 0.16; // Hardcoded!
```

**Richtig:**
```typescript
const { saisonalitaet } = useKonfiguration();
const aprilAnteil = saisonalitaet.find(m => m.monat === 4)?.anteil;
```

#### 5. Spring Festival ignoriert

**Fehler:**
```typescript
// Bestellungen laufen durch, auch während Spring Festival
```

**Richtig:**
```typescript
if (istSpringFestival(datum)) {
  return null; // Keine Bestellung möglich
}
```

#### 6. Frozen Zone nicht implementiert

**Fehler:**
```typescript
// Alle Daten editierbar, kein 'Heute'-Datum
```

**Richtig:**
```typescript
const { heuteDatum } = useKonfiguration();
const istVergangenheit = datum < heuteDatum;
// UI: disabled={istVergangenheit}
```

#### 7. Losgrößen ignoriert

**Fehler:**
```typescript
// Krumme Bestellmengen
const bestellung = 743; // FALSCH!
```

**Richtig:**
```typescript
const lose = Math.ceil(bedarf / 500);
const bestellung = lose * 500; // 1000 (2 Lose)
```

#### 8. Szenarien nur lokal wirksam

**Fehler:**
```typescript
// Szenario ändert nur PROGRAMM-Tab, Rest unverändert
```

**Richtig:**
```typescript
// Szenario wirkt global über KonfigurationContext
// Alle Berechnungen nutzen Context → automatisch überall wirksam
```

#### 9. ATP-Check fehlt

**Fehler:**
```typescript
// Produktion startet, auch wenn Material fehlt
```

**Richtig:**
```typescript
const atpResult = checkATP(auftrag);
if (!atpResult.materialVerfuegbar) {
  return { status: 'VERZÖGERT', grund: 'Material fehlt' };
}
```

#### 10. Keine SCOR-Metriken

**Fehler:**
```typescript
// Nur Tabellen, keine KPIs
```

**Richtig:**
```typescript
// 10+ KPIs aus 5 Kategorien
const scorMetriken = berechneSCORMetriken(daten);
// Visualisierung: Gauges, Charts, Ampeln
```

---

### ✅ TOP 10 Tipps für 15 Punkte

#### 1. JSON als Single Source of Truth

**Immer:**
```typescript
import { useKonfiguration } from '@/contexts/KonfigurationContext';
const { jahresProduktion, varianten, saisonalitaet } = useKonfiguration();
```

**Nie:**
```typescript
const bikes = 370000; // Hardcoded!
```

#### 2. Deutsche Terminologie verwenden

**Immer:**
```typescript
const programmPlanung = berechneProgramm();
const fehlerKorrektur = kumulativerFehler;
```

**Nie:**
```typescript
const programPlanning = calculateProgram();
const errorCorrection = cumulativeError;
```

#### 3. Umfangreiche Kommentare

**Immer:**
```typescript
/**
 * 🎯 ANFORDERUNG A2: Error Management
 * 
 * Kumulative Fehlerkorrektur verhindert systematische Rundungsfehler.
 * Ohne Korrektur würden ca. 100 Bikes zu viel/wenig produziert.
 */
```

#### 4. Validierungen einbauen

**Immer:**
```typescript
const summe = tagesProduktion.reduce((s, t) => s + t, 0);
if (Math.abs(summe - 370_000) > 10) {
  throw new Error('Jahressumme stimmt nicht!');
}
```

#### 5. Frozen Zone überall zeigen

**Immer:**
```typescript
// In JEDEM Tab
const { heuteDatum } = useKonfiguration();
const istVergangenheit = datum < heuteDatum;
className={istVergangenheit ? 'bg-gray-200' : ''}
```

#### 6. Szenarien global implementieren

**Immer:**
```typescript
// Szenarien-State in KonfigurationContext
const { aktiveSzenarien } = useKonfiguration();
// Alle Berechnungen berücksichtigen aktiveSzenarien
```

#### 7. SCOR-Metriken prominent zeigen

**Immer:**
```typescript
// Dashboard mit 10+ KPIs
<div className="grid grid-cols-5 gap-4">
  <SCORMetricCard category="Reliability" />
  <SCORMetricCard category="Responsiveness" />
  ...
</div>
```

#### 8. Excel-ähnliche UI nutzen

**Immer:**
```typescript
// Editable Tables mit Double-Click, Frozen Zone, etc.
<EditableExcelTable
  data={programm}
  frozenDate={heuteDatum}
  onEdit={handleEdit}
/>
```

#### 9. Präsentierbarkeit prüfen

**Vor Abgabe:**
- Erkläre jemandem das System in 10 Minuten
- Zeige die wichtigsten Features
- Navigiere natürlich durch Tabs (links → rechts)

#### 10. Prüfungs-Checkliste abarbeiten

**Systematisch:**
- [ ] Alle A1-A13 durchgehen
- [ ] Jede Anforderung demonstrieren können
- [ ] Code-Stellen für jede Anforderung kennen
- [ ] Zahlen auswendig kennen (370k, 49 Tage, etc.)

---

## Checkliste für Prüfung

### 🎯 1 Woche vor Prüfung

- [ ] Alle Anforderungen A1-A13 durchgegangen
- [ ] Jede Anforderung kann demonstriert werden
- [ ] Code-Qualität geprüft (ESLint, TypeScript-Errors)
- [ ] README aktualisiert (Installation, Screenshots)
- [ ] SCOR-Metriken vollständig (10+ KPIs)
- [ ] Szenarien alle funktionsfähig (4 Stück)
- [ ] Zahlen auswendig (370k, 49 Tage, April 16%, etc.)

### 🎯 1 Tag vor Prüfung

- [ ] Präsentation vorbereitet (10-15 Minuten)
- [ ] Demo-Szenario geplant (was zeige ich wann?)
- [ ] Backup erstellt (Git-Repository gesichert)
- [ ] System getestet (npm run build, npm run dev)
- [ ] Screenshots/Videos erstellt (für Präsentation)

### 🎯 Während Prüfung (Demo-Reihenfolge)

**1. Übersicht (2 Minuten):**
- Dashboard zeigen
- Kurze Erklärung: "Supply Chain für 370k Bikes"
- Tabs erklären (Settings → PROGRAMM → ... → SCOR)

**2. Anforderungen A1-A2 (3 Minuten):**
- Settings: 'Heute'-Datum ändern → Frozen Zone zeigt sich
- PROGRAMM: Saisonalität (April Peak), Error Management (Jahressumme)
- Wochenansicht (Aggregation)

**3. Anforderungen A3-A7 (3 Minuten):**
- Inbound: Bestellungen mit 49 Tage Vorlaufzeit, Losgröße 500
- Warehouse: Lagerbestände, ATP-Check
- Feiertage: Deutschland (NRW) + Spring Festival markiert

**4. Anforderungen A8-A9 (2 Minuten):**
- Szenario aktivieren: Maschinenausfall → Impact zeigen
- Spring Festival: Bestellungen blockiert 28.01.-04.02.

**5. Anforderungen A10-A11 (2 Minuten):**
- Ende-zu-Ende Visualisierung (Sankey/Flow)
- Frozen Zone in allen Tabs konsistent

**6. Anforderung A13 (1 Minute):**
- Szenario global wirksam (z.B. Marketing +25% → alle Tabs aktualisiert)
- FCFS-Regel bei Engpass

**7. SCOR-Metriken (2 Minuten):**
- 10+ KPIs zeigen
- Erklären: Reliability, Responsiveness, etc.

**8. Fragen beantworten (Rest):**
- Code-Stellen zeigen können
- Konzepte erklären (ATP, Error Management, etc.)

### 🎯 Wichtige Code-Stellen kennen

**Für jede Anforderung:**

| Anforderung | Code-Stelle | Datei |
|-------------|-------------|-------|
| A1 | Frozen Zone Logic | `EditableExcelTable.tsx` |
| A2 | Error Management | `zentrale-produktionsplanung.ts` |
| A3 | Feiertags-Check | `feiertags-helper.ts` |
| A4 | Tab-Workflow | `app/page.tsx` (Tab-Reihenfolge) |
| A5 | Bestellungen | `bedarfsrechnung.ts` |
| A6 | Vorlaufzeit | `lieferant-china.json` (49 Tage) |
| A7 | Losgröße | `bedarfsrechnung.ts` (Math.ceil) |
| A8 | Maschinenausfall | `SzenarienContext.tsx` |
| A9 | Spring Festival | `feiertage-china.json` |
| A10 | Supply Chain | `Dashboard.tsx` (Sankey) |
| A11 | Frozen Zone | `KonfigurationContext.tsx` |
| A13 | Szenarien global | `SzenarienContext.tsx` |

---

## 🎓 Zusammenfassung

### Was ist das Wichtigste?

1. **Alle Zahlen müssen stimmen** (370k, 49 Tage, April 16%)
2. **Alle Konzepte müssen implementiert sein** (Error Mgmt, Frozen Zone, ATP, FCFS)
3. **Keine Hardcoding** (alles aus JSON/Context)
4. **Deutsche Terminologie** (erleichtert Präsentation)
5. **Umfangreiche Dokumentation** (zeigt Verständnis)

### Wie erreiche ich 15 Punkte?

- ✅ **Fachlich korrekt:** Alle Zahlen, alle Konzepte
- ✅ **Technisch sauber:** TypeScript, keine Errors, keine Hardcoding
- ✅ **Gut dokumentiert:** Kommentare, README, Präsentation
- ✅ **Präsentierbar:** Excel-UI, intuitive Navigation, erklärbar
- ✅ **Vollständig:** A1-A13 (außer A12), SCOR-Metriken, Szenarien

### Letzter Tipp

**Qualität vor Geschwindigkeit!**

Lieber weniger Features, aber dafür:
- Alle korrekt implementiert
- Alle gut dokumentiert
- Alle präsentierbar

Ein System mit A1-A11+A13 vollständig implementiert ist besser als A1-A13 halbfertig.

---

**Viel Erfolg bei der Prüfung!** 🚀🎯

[[◀ Zurück: Szenarien](./05-Szenarien.md)] | [[◀ Zurück zur Wiki-Übersicht](./README.md)]
