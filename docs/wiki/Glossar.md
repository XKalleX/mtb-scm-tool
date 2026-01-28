# Glossar - Fachbegriffe

Ein umfassendes Glossar aller Fachbegriffe im MTB Supply Chain Management System.

---

## 🔤 A

### Anforderung (A1-A13)
Die 13 Bewertungskriterien der Aufgabenstellung. Jede Anforderung muss erfüllt sein für die volle Punktzahl.

Siehe: [Home](Home.md#-anforderungen-a1-a13)

### Arbeitstage (AT)
Montag bis Freitag (exklusive Feiertage und Wochenenden). Wichtig für Vorlaufzeit-Berechnungen.

**Beispiel:** 2 AT = 2 Arbeitstage (kann 4 Kalendertage sein bei Wochenende)

### ATP-Check
**Available-To-Promise** - Prüfsystem vor Produktionsstart: Material verfügbar? Kapazität frei? Liefertermin einhaltbar?

Siehe: [ATP-Check](ATP-Check.md)

---

## 🔤 B

### Bedarfsrechnung
Berechnung des Material-Bedarfs basierend auf OEM Produktionsplanung. Berücksichtigt Vorlaufzeit und Losgrößen.

**Datei:** `src/lib/calculations/bedarfs-backlog-rechnung.ts`

### Bestellung
Auftragserteilung an China-Zulieferer für Sättel. Mindestmenge: 500 Stück (Losgröße).

---

## 🔤 C

### Code-Ermäßigung
Vereinfachungen zur Komplexitätsreduktion:
- Nur 1 Zulieferer (China)
- Nur Sättel (keine Gabeln/Rahmen)
- Kein Outbound zu Märkten
- FCFS statt Solver

Siehe: [FAQ](FAQ.md#was-bedeutet-ermäßigung--code-version)

---

## 🔤 D

### Durchlaufzeit
Zeit von Auftragserteilung bis Wareneingang. Bei China: 49 Tage (7 Wochen).

**Berechnung:** 2 AT (Bearbeitung) + 2 AT (LKW Hafen) + 30 KT (Schiff) + 2 AT (Hamburg) + 2 AT (LKW Dortmund) = 49 Tage

---

## 🔤 E

### Error Management
Kumulative Fehlerkorrektur bei Rundung von Dezimalzahlen. Verhindert systematische Abweichungen über das Jahr.

**Beispiel:** 370.000 / 365 = 1.013,698... → Mit Error Mgmt: Exakt 370.000 am Jahresende!

Siehe: [Error Management](Error-Management.md)

---

## 🔤 F

### FCFS
**First-Come-First-Serve** - Priorisierungs-Regel bei Engpässen. Älteste Aufträge haben Priorität (statt Solver-Optimierung).

### Feiertage
- **Deutschland (NRW):** 11 Feiertage, produktionsfrei in Dortmund
- **China:** Spring Festival (8 Tage), Produktionsstopp beim Zulieferer

**Dateien:** `feiertage-deutschland.json`, `feiertage-china.json`

### Frozen Zone
Vergangenheit (vor 'Heute'-Datum) mit fixierten IST-Werten. Nicht mehr änderbar, grau dargestellt.

Siehe: [Frozen Zone](Frozen-Zone.md)

---

## 🔤 G

---

## 🔤 H

### Heute-Datum
Konfigurierbares Datum (z.B. 15.04.2027) das Vergangenheit (Frozen Zone) von Zukunft (Planning Zone) trennt.

**Quelle:** `stammdaten.json` → `projekt.heuteDatum`

---

## 🔤 I

### Inbound Logistik
Beschaffung von Materialien (Sättel) vom China-Zulieferer. Berücksichtigt 49 Tage Vorlaufzeit und Losgröße 500.

**Datei:** `src/lib/calculations/inbound-china.ts`

### IST-Werte
Realisierte Produktions- oder Liefermengen (Vergangenheit). Im Gegensatz zu PLAN-Werten (Zukunft).

---

## 🔤 J

### Jahresproduktion
**370.000 Mountain Bikes** im Jahr 2027. Verteilt auf 8 MTB-Varianten nach Prognose-Anteil.

**Quelle:** `stammdaten.json` → `jahresproduktion.gesamt`

---

## 🔤 K

### Kalendertage (KT)
Alle Tage inklusive Wochenenden und Feiertage. Wichtig bei Seefracht (30 KT).

**Beispiel:** 30 KT = 30 Tage (ca. 4 Wochen, unabhängig von Arbeitstagen)

### Kapazität
Produktionskapazität: **130 Bikes/Stunde** × **8 Stunden/Schicht** = **1.040 Bikes/Tag** (Dortmund)

**Quelle:** `stammdaten.json` → `produktion.kapazitaetProStunde`

### KonfigurationContext
React Context der alle JSON-Daten lädt und system-weit bereitstellt. Zentrale Schnittstelle zu SSOT.

**Datei:** `src/contexts/KonfigurationContext.tsx`

---

## 🔤 L

### Lagerbestand
Verfügbare Sättel im Warehouse (Dortmund). Berechnet aus Zugängen (Lieferungen) minus Abgängen (Produktion).

### Losgröße
Mindestbestellmenge: **500 Sättel** pro Bestellung beim China-Zulieferer. Optimiert Transport-Kosten.

**Quelle:** `lieferant-china.json` → `losgröße.menge`

---

## 🔤 M

### Material-Check
Teil des ATP-Checks. Prüft ob ausreichend Sättel für geplante Produktion verfügbar sind.

### MTB-Variante
8 Mountain Bike Typen: Allrounder (30%), Competition (15%), Downhill (10%), Extreme (7%), Freeride (5%), Marathon (8%), Performance (12%), Trail (13%)

**Quelle:** `stammdaten.json` → `varianten`

---

## 🔤 N

---

## 🔤 O

### OEM Planung
**Original Equipment Manufacturer** - Zentrale Produktionsplanung, EINZIGE Berechnungsbasis für alle Module.

**Datei:** `src/lib/calculations/zentrale-produktionsplanung.ts`

Siehe: [OEM Planung](OEM-Planung.md)

---

## 🔤 P

### Perfect Order Fulfillment
SCOR-Metrik RL.1.1: Prozentsatz der vollständig erfüllten Aufträge. Ziel: 95%, Ist: 94,2%

### Planning Zone
Zukunft (ab 'Heute'-Datum) mit planbaren SOLL-Werten. Editierbar, normal dargestellt.

### Produktionssteuerung
Kombination aus OEM Planung (SOLL) und Warehouse (Material-Verfügbarkeit) für IST-Produktion.

---

## 🔤 Q

---

## 🔤 R

### Rundungsfehler
Problem bei 370.000 / 365 = 1.013,698... Bikes/Tag. Ohne Korrektur: ±100 Bikes Abweichung/Jahr.

**Lösung:** Error Management

---

## 🔤 S

### Saisonalität
Monatliche Verteilung der Nachfrage. **April = Peak-Monat (16%)**, Dezember = niedrig (3%).

**Quelle:** `saisonalitaet.json`

### Sattel
Einziges Bauteil im System (Code-Ermäßigung). 4 Varianten: Comfort, Sport, Pro, Extreme.

**Quelle:** `stueckliste.json`

### SCOR
**Supply Chain Operations Reference Model** - Standardisiertes Framework für SC-Performance-Messung.

**5 Kategorien:** Reliability, Responsiveness, Agility, Cost, Assets

Siehe: [SCOR-Metriken](SCOR-Metriken.md)

### SOLL-Werte
Geplante Produktions- oder Liefermengen (Zukunft). Im Gegensatz zu IST-Werten (Vergangenheit).

### Spring Festival
Chinesisches Neujahr 2027: **28.01. - 04.02.2027 (8 Tage)**. Kompletter Produktionsstopp beim Zulieferer.

**Quelle:** `feiertage-china.json`

### SSOT
**Single Source of Truth** - Alle Daten kommen aus EINER Quelle: JSON-Dateien in `/src/data/`.

**Prinzip:** Keine Hardcoding, vollständige Konfigurierbarkeit.

Siehe: [SSOT](SSOT.md)

### Szenario
Simulierbare Störung: Marketingaktion, Maschinenausfall, Wasserschaden, Schiffsverspätung. Global wirksam über alle Module.

**Quelle:** `szenario-defaults.json`

---

## 🔤 T

### Tagesproduktion
Produktion pro Tag, berechnet aus Jahresproduktion / 365 Tage, unter Berücksichtigung Saisonalität und Error Management.

**Beispiel:** MTB Allrounder April: ~460 Bikes/Tag (16% von 111.000 / 30 Tage)

---

## 🔤 U

---

## 🔤 V

### Variante
Siehe: MTB-Variante

### Vorlaufzeit
Zeit zwischen Bestellaufgabe und Lieferung. **China: 49 Tage (7 Wochen)**.

**Quelle:** `lieferant-china.json` → `vorlaufzeit.gesamt`

---

## 🔤 W

### Warehouse
Lager in Dortmund für Sättel. Berechnet Bestände aus Zugängen (Lieferungen) minus Abgängen (Produktion).

**Datei:** `src/lib/calculations/warehouse-management.ts`

### Wochenplanung
Aggregation der Tagesproduktion auf Wochenbasis (52 Wochen). Erfüllt Anforderung A1.

---

## 🔤 X

---

## 🔤 Y

---

## 🔤 Z

### Zentrale Produktionsplanung
Siehe: OEM Planung

### Zulieferer
**Dengwong Bicycle Parts Ltd. (China)** - Einziger Lieferant im System (Code-Ermäßigung).

**Quelle:** `lieferant-china.json`

---

## 📊 Wichtige Zahlen

| Begriff | Wert | Quelle |
|---------|------|--------|
| Jahresproduktion | 370.000 Bikes | `stammdaten.json` |
| Planungszeitraum | 365 Tage | 01.01.2027 - 31.12.2027 |
| MTB-Varianten | 8 | Allrounder bis Trail |
| Vorlaufzeit China | 49 Tage | 7 Wochen |
| Losgröße | 500 Sättel | Mindestbestellmenge |
| Produktionskapazität | 1.040 Bikes/Tag | 130/Std × 8 Std |
| Peak-Monat | April | 16% vom Jahresvolumen |
| Spring Festival | 8 Tage | 28.01. - 04.02.2027 |
| Sattel-Varianten | 4 | Comfort, Sport, Pro, Extreme |
| SCOR-Metriken | 10+ | Aus 5 Kategorien |
| Liefertreue (Ziel) | 95% | Perfect Order Fulfillment |
| Liefertreue (Ist) | 94,2% | Mit ATP-Check |

---

## 🔤 Abkürzungen

| Abkürzung | Bedeutung |
|-----------|-----------|
| **AT** | Arbeitstage |
| **ATP** | Available-To-Promise |
| **FCFS** | First-Come-First-Serve |
| **KT** | Kalendertage |
| **KPI** | Key Performance Indicator |
| **MTB** | Mountain Bike |
| **OEM** | Original Equipment Manufacturer |
| **SC** | Supply Chain |
| **SCOR** | Supply Chain Operations Reference |
| **SSOT** | Single Source of Truth |
| **WI3** | Wirtschaftsinformatik 3 (Kurs) |

---

## 📚 Externe Begriffe

### APICS
**Association for Supply Chain Management** - Organisation hinter dem SCOR-Modell.

### HAW Hamburg
**Hochschule für Angewandte Wissenschaften Hamburg** - Universität des WI3-Kurses.

### Just-in-Time (JIT)
Produktionsphilosophie: Material kommt genau dann an, wenn es benötigt wird. Sicherheitsbestand = 0.

### Adventure Works AG
Fiktiver Kunde (aus Microsoft-Demo-Datenbanken), verwendet in Aufgabenstellung.

---

**Weitere Erklärungen:** Siehe [FAQ](FAQ.md) oder spezifische Wiki-Seiten.

**Zurück zu:** [Home](Home.md)
