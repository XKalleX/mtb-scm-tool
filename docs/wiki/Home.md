# Mountain Bike Supply Chain Management System - Wiki

Willkommen zur umfassenden Dokumentation des **MTB Supply Chain Management Systems** für die Adventure Works AG!

## 📚 Übersicht

Dieses Wiki dokumentiert alle Grundkonzepte, Features und technischen Details des Supply Chain Management Tools, das im Rahmen des WI3-Kurses an der HAW Hamburg entwickelt wurde.

**Projektdaten:**
- **Kunde:** Adventure Works AG
- **Produktionsvolumen:** 370.000 Mountain Bikes pro Jahr
- **Planungszeitraum:** 01.01.2027 - 31.12.2027 (365 Tage)
- **MTB-Varianten:** 8 (Allrounder, Competition, Downhill, Extreme, Freeride, Marathon, Performance, Trail)
- **Ziel:** 15 Punkte (Note 1+ / A+)

## 🎯 Schnellstart

### Für Nutzer
- [Installation & Setup](Installation-Setup.md) - Erste Schritte
- [Benutzerhandbuch](Benutzerhandbuch.md) - Funktionen nutzen
- [FAQ](FAQ.md) - Häufige Fragen

### Für Entwickler
- [Code-Struktur](Code-Struktur.md) - Architektur-Übersicht
- [Datenmodell](Datenmodell.md) - JSON-Struktur & SSOT
- [Berechnungslogik](Berechnungslogik.md) - Kernalgorithmen

## 🧠 Kernkonzepte

Diese Konzepte sind fundamental für das Verständnis des Systems:

### 1. [Error Management](Error-Management.md)
Kumulative Fehlerkorrektur verhindert Rundungsabweichungen bei der täglichen Produktionsplanung (370.000 Bikes auf 365 Tage).

**Warum wichtig?** Ohne Error Management würden über das Jahr ~100 Bikes zu viel/wenig produziert werden.

### 2. [Frozen Zone Konzept](Frozen-Zone.md)
Trennung zwischen Vergangenheit (fixiert) und Zukunft (planbar) anhand des 'Heute'-Datums.

**Warum wichtig?** Realistische Planung - vergangene Produktionen können nicht mehr geändert werden.

### 3. [ATP-Check System](ATP-Check.md)
Available-To-Promise prüft vor jedem Produktionsstart: Sind Bauteile verfügbar? Ist Kapazität frei?

**Warum wichtig?** Verhindert Überplanung und negative Lagerbestände (94,6% Liefertreue erreicht).

### 4. [Single Source of Truth (SSOT)](SSOT.md)
Alle Daten stammen aus JSON-Dateien, keine Hardcoding. Änderungen wirken sich sofort system-weit aus.

**Warum wichtig?** Vollständige Konfigurierbarkeit, keine Magic Numbers im Code.

### 5. [OEM Planung als Basis](OEM-Planung.md)
Zentrale Produktionsplanung ist die EINZIGE Berechnungsbasis. Alle anderen Module (Inbound, Warehouse, Produktion) nutzen diese.

**Warum wichtig?** Konsistente Daten über alle Module - wie Zahnräder, die ineinandergreifen.

## 🚀 Features

### Supply Chain Module
- [Programmplanung](Programmplanung.md) - Wochenbasierte OEM-Planung mit Excel-Tabellen
- [Inbound Logistik](Inbound-Logistik.md) - China-Beschaffung (49 Tage Vorlaufzeit)
- **[Produktion & Warehouse](Produktion-und-Warehouse.md)** - Ausführliche Dokumentation der Produktionssteuerung und Warehouse Management (Fließtext, präsentationsreif)
- [Warehouse Management](Warehouse-Management.md) - Lagerbestandsführung mit ATP-Check
- [Produktionssteuerung](Produktionssteuerung.md) - Montageplanung mit Material-Check

### Planung & Simulation
- [Saisonalität](Saisonalitaet.md) - Monatliche Verteilung (April = 16% Peak)
- [Szenarien-System](Szenarien-System.md) - 4 simulierbare Störungen (global wirksam)
- [SCOR-Metriken](SCOR-Metriken.md) - 10+ KPIs aus 5 Kategorien
- [Feiertage-Management](Feiertage.md) - Deutschland (NRW) + China (Spring Festival)

## 🛠️ Technische Dokumentation

### Architektur
- [Code-Struktur](Code-Struktur.md) - Module, Komponenten, Contexts
- [Datenmodell](Datenmodell.md) - JSON-Schema & TypeScript-Interfaces
- [State Management](State-Management.md) - KonfigurationContext & SzenarienContext

### Berechnungen
- [Zentrale Produktionsplanung](Zentrale-Produktionsplanung.md) - Tagesproduktion mit Error Management
- [Bedarfsrechnung](Bedarfsrechnung.md) - Losgrößen-basierte Bestellplanung (500 Stück)
- [Supply Chain Metriken](Supply-Chain-Metriken.md) - KPI-Berechnung nach SCOR

## 📊 Spezielle Themen

### Ermäßigungen (Code-Version)
Dieses Projekt nutzt **Code-Ermäßigungen** zur Komplexitätsreduktion:

✅ **Nur 1 Zulieferer:** China (keine anderen Länder)  
✅ **Nur Sättel:** 4 Varianten (keine Gabeln, keine Rahmen)  
✅ **Transport:** Nur Schiff (China→Hamburg) + LKW (Hamburg→Dortmund)  
✅ **Kein Outbound:** Keine Distribution zu 6 internationalen Märkten  
✅ **FCFS statt Solver:** First-Come-First-Serve Priorisierung

**Vorteil:** 90% weniger Komplexität, Fokus auf Kernkonzepte, bessere Präsentierbarkeit.

**ALLE anderen Anforderungen (A1-A13) bleiben vollständig bestehen!**

### Kritische Zahlen
- ✅ **Jahresproduktion:** 370.000 Bikes (NICHT 185.000!)
- ✅ **China-Vorlaufzeit:** 49 Tage (7 Wochen, NICHT 56!)
- ✅ **Losgröße:** 500 Sättel pro Bestellung
- ✅ **Saisonalität:** Januar 4% → April 16% (Peak!) → Dezember 3%
- ✅ **Spring Festival:** 28.01.-04.02.2027 (8 Tage Produktionsstopp)

## 🎓 Anforderungen (A1-A13)

Das System erfüllt alle 13 Anforderungen der Aufgabenstellung:

- [x] **A1:** Wochenplanung + 'Heute'-Datum (Frozen Zone)
- [x] **A2:** Saisonalität + Stückliste + Error Management
- [x] **A3:** Feiertage Deutschland (NRW)
- [x] **A4:** Sinnvoller Workflow
- [x] **A5:** Auftragsverbuchung China
- [x] **A6:** Vorlaufzeit 49 Tage korrekt
- [x] **A7:** Losgröße 500 Sättel
- [x] **A8:** Maschinenausfall-Szenario
- [x] **A9:** Spring Festival (8 Tage)
- [x] **A10:** Ende-zu-Ende Supply Chain
- [x] **A11:** 'Heute'-Datum Frozen Zone
- [x] **A12:** ~~Marktverteilung~~ (ERMÄSSIGUNG - entfallen)
- [x] **A13:** FCFS-Priorisierung (statt Solver)

## 👥 Team

**Projekt-Team:**
- **Pascal Wagner** - Supply Chain Lead, Full Stack Development
- **Da Yeon Kang** - Inbound Specialist
- **Shauna Ré Erfurth** - Production & Warehouse Manager
- **Taha Wischmann** - Distribution Manager

## 📚 Weitere Ressourcen

- [Glossar](Glossar.md) - Fachbegriffe erklärt
- [FAQ](FAQ.md) - Häufig gestellte Fragen
- [Troubleshooting](Troubleshooting.md) - Problemlösungen

## 🔗 Quick Links

**Externe Dokumentation:**
- [SCOR Model](https://www.apics.org/) - Supply Chain Operations Reference
- [HAW Hamburg](https://www.haw-hamburg.de/) - Hochschule für Angewandte Wissenschaften

**Projekt-Dateien:**
- [README.md](../../README.md) - Projekt-Übersicht
- [Spezifikation](../../kontext/Spezifikation_SSOT_MR.ts) - Vollständige Anforderungsdokumentation

---

**Letzte Aktualisierung:** Januar 2027  
**Version:** 1.0  
**Lizenz:** Akademisches Projekt - HAW Hamburg WI3
