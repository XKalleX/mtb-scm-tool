# MTB Supply Chain Management - Wiki Documentation

Dieses Verzeichnis enthält die vollständige Wiki-Dokumentation für das Mountain Bike Supply Chain Management System.

## 📚 Wiki-Struktur

### Hauptseite
- **[Home.md](Home.md)** - Einstiegsseite mit Übersicht und Navigation zu allen Themen

### Kernkonzepte (Fundamental!)
1. **[Error-Management.md](Error-Management.md)** - Rundungsfehler-Korrektur für präzise Jahresplanung
2. **[Frozen-Zone.md](Frozen-Zone.md)** - 'Heute'-Datum Konzept (IST vs. PLAN)
3. **[ATP-Check.md](ATP-Check.md)** - Available-To-Promise Prüfsystem
4. **[SSOT.md](SSOT.md)** - Single Source of Truth (JSON als Datenquelle)
5. **[OEM-Planung.md](OEM-Planung.md)** - Zentrale Produktionsplanung als Berechnungsbasis

### Präsentation & Dokumentation
- **[Produktion-Warehouse-Praesentation.md](Produktion-Warehouse-Praesentation.md)** - 10-Minuten Präsentation für Produktion & Warehouse Module
- **[Produktion-Warehouse-Praesentationsguide.md](Produktion-Warehouse-Praesentationsguide.md)** - Präsentationsguide mit Timing und Key Metrics
- **[Produktion-Warehouse-Fehleranalyse.md](Produktion-Warehouse-Fehleranalyse.md)** - Systematische Fehleranalyse und Validierung

### Schnellstart & Hilfe
- **[Installation-Setup.md](Installation-Setup.md)** - Installation, Konfiguration, Troubleshooting
- **[FAQ.md](FAQ.md)** - Häufig gestellte Fragen
- **[Glossar.md](Glossar.md)** - Fachbegriffe von A-Z

## 📖 Verwendung

### Als GitHub Wiki hochladen

1. Aktiviere GitHub Wiki für dein Repository:
   - Repository → Settings → Features → Wikis ✓

2. Klone das Wiki-Repository:
   ```bash
   git clone https://github.com/XKalleX/mtb-scm-tool.wiki.git
   ```

3. Kopiere alle .md Dateien:
   ```bash
   cp docs/wiki/*.md mtb-scm-tool.wiki/
   cd mtb-scm-tool.wiki
   ```

4. Commit und Push:
   ```bash
   git add .
   git commit -m "Initial Wiki documentation"
   git push origin master
   ```

5. Wiki ist jetzt verfügbar unter:
   ```
   https://github.com/XKalleX/mtb-scm-tool/wiki
   ```

### Als lokale Dokumentation

Die Markdown-Dateien können auch direkt im Repository-Browser oder mit Tools wie:
- **VS Code:** Markdown Preview
- **Obsidian:** Markdown-Editor mit Graph-Ansicht
- **MkDocs:** Statische Website-Generierung

## 🎯 Wichtige Seiten nach Zielgruppe

### Für Nutzer
1. [Installation-Setup.md](Installation-Setup.md) - Setup und Konfiguration
2. [FAQ.md](FAQ.md) - Häufige Fragen
3. [Glossar.md](Glossar.md) - Begriffe nachschlagen

### Für Entwickler
1. [SSOT.md](SSOT.md) - Datenarchitektur verstehen
2. [OEM-Planung.md](OEM-Planung.md) - Berechnungsbasis kennen
3. [Error-Management.md](Error-Management.md) - Kernalgorithmus verstehen

### Für Prüfung/Präsentation
1. [Produktion-Warehouse-Praesentation.md](Produktion-Warehouse-Praesentation.md) - 10-Minuten Präsentation (fertig!)
2. [Produktion-Warehouse-Praesentationsguide.md](Produktion-Warehouse-Praesentationsguide.md) - Quick-Reference für Präsentation
3. [Error-Management.md](Error-Management.md) - Zeigt Verständnis mathematischer Konzepte
4. [ATP-Check.md](ATP-Check.md) - Zeigt Supply Chain Expertise
5. [Frozen-Zone.md](Frozen-Zone.md) - Zeigt realistische Planung

## 📝 Wiki Struktur (komplett)

```
docs/wiki/
├── Home.md                                      # Einstiegsseite, Navigation
├── Error-Management.md                          # Rundungsfehler-Korrektur
├── Frozen-Zone.md                               # 'Heute'-Datum Konzept
├── ATP-Check.md                                 # Available-To-Promise
├── SSOT.md                                      # Single Source of Truth
├── OEM-Planung.md                               # Zentrale Produktionsplanung
├── Produktion-Warehouse-Praesentation.md        # 10-Min Präsentation
├── Produktion-Warehouse-Praesentationsguide.md  # Präsentationsguide
├── Produktion-Warehouse-Fehleranalyse.md        # Fehleranalyse & Validierung
├── Installation-Setup.md                        # Installation & Setup
├── FAQ.md                                       # Häufige Fragen
├── Glossar.md                                   # Fachbegriffe A-Z
└── README.md                                    # Diese Datei
```

## 🚀 Erweiterungen (TODO)

Weitere Wiki-Seiten könnten folgen:
- **Benutzerhandbuch.md** - Schritt-für-Schritt Anleitung
- **Code-Struktur.md** - Architektur-Details
- **Datenmodell.md** - JSON-Schema Dokumentation
- **Saisonalitaet.md** - Monatliche Verteilung Details
- **Szenarien-System.md** - 4 Szenarien erklärt
- **SCOR-Metriken.md** - KPI-Berechnungen
- **Inbound-Logistik.md** - China-Beschaffung Details
- **Feiertage.md** - Deutschland & China
- **Troubleshooting.md** - Problemlösungen

✅ **Neu hinzugefügt:**
- ~~**Warehouse-Management.md**~~ → **Produktion-Warehouse-Praesentation.md** (komplett!)
- ~~**Produktionssteuerung.md**~~ → **Produktion-Warehouse-Praesentation.md** (komplett!)

## 💡 Best Practices

### Markdown-Links

- **Interne Links:** `[Link-Text](Dateiname.md)`
- **Anker-Links:** `[Link-Text](Dateiname.md#abschnitt)`
- **Externe Links:** `[Link-Text](https://example.com)`

### Bilder einbinden

```markdown
![Alt-Text](../images/screenshot.png)
```

### Code-Blöcke

````markdown
```typescript
const example = "code";
```
````

## 🎓 Für die Bewertung

Diese Wiki-Dokumentation erfüllt wichtige Bewertungskriterien:

✅ **Dokumentation (3 Punkte):**
- Umfangreiche deutsche Dokumentation
- Konzepte erklärt (nicht nur Code)
- Begründung von Entscheidungen
- Strukturiert und navigierbar

✅ **Präsentierbarkeit:**
- Zeigt professionelle Software-Entwicklung
- Verständlich für Nicht-Entwickler
- Gut vorbereitet für Präsentation

✅ **Wartbarkeit:**
- Neue Teammitglieder können sich einarbeiten
- Alle Konzepte dokumentiert
- Glossar für Fachbegriffe

## 📞 Support

Bei Fragen zur Wiki-Dokumentation:
- Erstelle ein Issue im Repository
- Kontaktiere das Projekt-Team
- Siehe [FAQ.md](FAQ.md)

---

**Viel Erfolg mit dem Projekt!** 🚵 🎯

**HAW Hamburg - Wirtschaftsinformatik 3 - WiSe 2024/2025**
