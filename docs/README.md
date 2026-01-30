# 📚 Mountain Bike SCM - Projekt Wiki

> **Willkommen!** Diese Dokumentation erklärt das Mountain Bike Supply Chain Management System von Grund auf - selbst wenn du noch nie von SCM gehört hast, wirst du nach dieser Lektüre alles verstehen!

## 🎯 Über dieses Projekt

**Adventure Works AG** - Ein fiktives, aber realistisches Unternehmen, das **370.000 Mountain Bikes pro Jahr** produziert. Dieses System verwaltet die gesamte Supply Chain von der Beschaffung (China) bis zur Produktion (Dortmund).

**Entwickelt für:** WI3 Kurs, HAW Hamburg  
**Zielnote:** 15 Punkte (Note 1+)  
**Besonderheit:** Vereinfachte Code-Version mit Fokus auf Kernkonzepte

## 📖 Wiki Navigation

### Grundlagen & Kontext

1. **[Aufgabenstellung](./01-Aufgabenstellung.md)** 📋
   - Was ist Adventure Works AG?
   - Das Geschäftsproblem
   - Warum brauchen wir ein SCM-System?

2. **[Supply Chain Konzepte](./02-Supply-Chain-Konzepte.md)** 🔗
   - Was ist eine Supply Chain?
   - SCOR-Modell (PLAN, SOURCE, MAKE)
   - ATP/CTP-Checks
   - SCOR-Metriken (Reliability, Responsiveness, Agility, Cost, Assets)

### Technische Details

3. **[Produktstruktur](./03-Produktstruktur.md)** 🚵
   - 8 MTB-Varianten (ALLR, COMP, DOWN, etc.)
   - 4 Sattel-Typen (Code-Ermäßigung)
   - Stücklisten und BOMs

4. **[Zeitparameter](./04-Zeitparameter.md)** ⏱️
   - Vorlaufzeiten (49 Tage China)
   - Arbeitstage vs. Kalendertage
   - Spring Festival 2027
   - Deutsche Feiertage (NRW)
   - Saisonalität & Error Management

5. **[Szenarien](./05-Szenarien.md)** 🎭
   - Marketingaktion (+30% Nachfrage)
   - China Produktionsausfall
   - Transport-Schaden
   - Schiffsverspätung

### Bewertung & Referenz

6. **[Bewertungskriterien](./06-Bewertungskriterien.md)** ✅
   - Alle 13 Anforderungen (A1-A13)
   - Prüfungskriterien
   - Tipps für 15 Punkte

7. **[Glossar](./07-Glossar.md)** 📖
   - Alle Fachbegriffe erklärt
   - ATP, CTP, SCOR, OEM, etc.
   - Häufige Fehlerquellen

## 🚀 Quick Start

```bash
# Installation
npm install

# Development Server starten
npm run dev

# Öffne http://localhost:3000
```

## 💡 Wichtigste Zahlen

| Parameter | Wert | Bedeutung |
|-----------|------|-----------|
| **Jahresproduktion** | 370.000 Bikes | Total für 2027 |
| **China Vorlaufzeit** | 49 Tage | 5 AT + 2 AT + 30 KT + 2 AT |
| **Peak Season** | April | 16% der Jahresproduktion |
| **Low Season** | Okt/Dez | Jeweils 3% |
| **Spring Festival** | 28.01.-04.02.2027 | 8 Tage Produktionsstopp |
| **Losgröße** | 500 Sättel | Mindestbestellmenge |
| **Varianten** | 8 MTB-Typen | ALLR 30% bis FREE 5% |
| **Komponenten** | 4 Sattel-Typen | SAT_FT, SAT_RL, SAT_SP, SAT_SL |

## 🎓 Code-Ermäßigungen (Vereinfachungen)

Das Projekt nutzt **Code-Ermäßigungen** um die Komplexität zu reduzieren:

✅ **Nur 1 Zulieferer:** China (statt 3: Deutschland, Spanien, China)  
✅ **Nur Sättel:** 4 Varianten (statt 14 Bauteile inkl. Gabeln & Rahmen)  
✅ **Kein Outbound:** Keine Distribution zu 6 Märkten  
✅ **FCFS statt Solver:** First-Come-First-Serve Priorisierung  

**Vorteil:** 90% weniger Komplexität bei gleichen Lernzielen!

## 📊 Modulübersicht

Das System besteht aus 6 Hauptmodulen:

1. **Dashboard** - Übersicht & KPIs
2. **Programmplanung** - Wochenbasierte OEM-Planung (370.000 Bikes)
3. **Stückliste** - 4 Sattel-Varianten × 8 MTB-Typen
4. **Inbound China** - Bestellplanung mit 49 Tagen Vorlauf
5. **Produktion** - ATP-Check & Kapazitätsplanung
6. **Reporting** - SCOR-Metriken & Visualisierungen

## 🔑 Kernkonzepte

### 1. Error Management
Verhindert systematische Rundungsfehler bei der Verteilung von 370.000 Bikes auf 365 Tage.

### 2. Frozen Zone
Trennung von Vergangenheit (fixiert) und Zukunft (planbar) durch das "Heute"-Datum.

### 3. ATP-Check
Available-To-Promise: Prüft Material, Kapazität und Termine vor Produktionszusage.

### 4. FCFS-Regel
First-Come-First-Serve: Priorisierung bei Engpässen (Alternative zum Solver).

### 5. Losgrößen-Bestellung
Realistische Bestellungen in 500er-Einheiten (keine tägliche Glättung).

## 👥 Team

- **Pascal Wagner** - Supply Chain Lead & Full Stack Development
- **Da Yeon Kang** - Inbound Specialist
- **Shauna Ré Erfurth** - Production & Warehouse Manager
- **Taha Wischmann** - Distribution Manager

## 📚 Weiterführende Links

- [Technische Dokumentation](../README.md) - Installation & Setup
- [Aufgabenstellung PDF](../kontext/Aufgabenstellung.pdf) - Original-Aufgabe
- [SCOR Model Reference](https://www.ascm.org/) - APICS Supply Chain Council

## 🆘 Support

**Fragen?** Starte hier:

1. 📋 [Aufgabenstellung](./01-Aufgabenstellung.md) - Grundlagen verstehen
2. 🔗 [Supply Chain Konzepte](./02-Supply-Chain-Konzepte.md) - Theorie lernen
3. 📖 [Glossar](./07-Glossar.md) - Begriffe nachschlagen
4. ✅ [Bewertungskriterien](./06-Bewertungskriterien.md) - Anforderungen checken

---

**© 2024 HAW Hamburg - Wirtschaftsinformatik 3**  
Entwickelt für akademische Zwecke im Rahmen der WI3-Projektaufgabe.
