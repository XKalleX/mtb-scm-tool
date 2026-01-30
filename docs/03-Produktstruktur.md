# 🚵 Produktstruktur

> **In diesem Kapitel:** Die 8 Mountain Bike Varianten, 4 Sattel-Typen und Stücklisten im Detail.

[[◀ Zurück: Supply Chain Konzepte](./02-Supply-Chain-Konzepte.md)] | [[Weiter: Zeitparameter ▶](./04-Zeitparameter.md)]

---

## Inhaltsverzeichnis

1. [Die 8 MTB-Varianten](#1-die-8-mtb-varianten)
2. [Warum diese Verteilung?](#2-warum-diese-verteilung)
3. [Die 4 Sattel-Typen](#3-die-4-sattel-typen)
4. [Stückliste & BOMs](#4-stückliste--boms)
5. [Jahresbedarf Berechnung](#5-jahresbedarf-berechnung)

---

## 1. Die 8 MTB-Varianten

Adventure Works produziert **8 verschiedene Mountain Bike Ausstattungsvarianten**. Jede Variante hat einen prognostizierten Marktanteil basierend auf historischen Verkaufsdaten und Marktforschung.

### Übersicht aller Varianten

| ID   | Name              | Marktanteil | Jahresproduktion | Durchschn. VK | Zielgruppe |
|------|-------------------|-------------|------------------|---------------|------------|
| ALLR | MTB Allrounder    | **30%** 🏆  | 111.000 Bikes    | 1.200€        | Hobby-Fahrer, Allrounder |
| COMP | MTB Competition   | 15%         | 55.500 Bikes     | 2.800€        | Wettkampf-Fahrer |
| TRAI | MTB Trail         | 13%         | 48.100 Bikes     | 1.800€        | Trail-Spezialisten |
| PERF | MTB Performance   | 12%         | 44.400 Bikes     | 2.200€        | Ambitionierte Hobby-Fahrer |
| DOWN | MTB Downhill      | 10%         | 37.000 Bikes     | 3.500€        | Downhill-Profis |
| MARA | MTB Marathon      | 8%          | 29.600 Bikes     | 2.400€        | Langstrecken-Fahrer |
| EXTR | MTB Extreme       | 7%          | 25.900 Bikes     | 4.200€        | Extrem-Sport |
| FREE | MTB Freeride      | **5%** 📉   | 18.500 Bikes     | 3.800€        | Freestyle-Fahrer |
| **Σ** | **GESAMT**       | **100%**    | **370.000 Bikes** | ø 2.100€     | |

### Visualisierung

```
Marktanteile 2027 (370.000 Bikes gesamt)

█████████████████████████████████░░░░░░░░░░ 30% ALLR (111.000)
██████████████████░░░░░░░░░░░░░░░░░░░░░░░░ 15% COMP ( 55.500)
██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 13% TRAI ( 48.100)
█████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 12% PERF ( 44.400)
███████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 10% DOWN ( 37.000)
█████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  8% MARA ( 29.600)
████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  7% EXTR ( 25.900)
██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  5% FREE ( 18.500)
```

---

## 2. Warum diese Verteilung?

Die Marktanteile basieren auf **historischen Verkaufsdaten** der vergangenen 3 Jahre und **Marktforschung** für 2027:

### 🏆 30% Allrounder (Größte Zielgruppe)

**Warum so groß?**
- **Breite Zielgruppe:** Gelegenheitsfahrer, Familien, Pendler
- **Vielseitig einsetzbar:** Stadt + Wald + Feldwege
- **"Einstiegsmodell":** Keine Spezialisierung erforderlich
- **Preisklasse:** Mittel (1.200€) - erschwinglich für breite Masse

**Typischer Kunde:**
- Familie mit Kindern
- Wochenend-Ausflüge im Wald
- Nicht zu teuer, nicht zu spezialisiert
- "Ich will ein gutes Mountainbike, aber keine Profi-Ausrüstung"

### 🥈 15% Competition (Zweitgrößte Gruppe)

**Warum so populär?**
- **Sportliche Fahrer:** Rennrad-Umsteiger, Marathon-Teilnehmer
- **Leicht & Schnell:** Carbon-Rahmen, optimierte Geometrie
- **Wettkampf-tauglich:** Für Cross-Country Rennen
- **Preisklasse:** Hoch (2.800€) - aber gerechtfertigt durch Performance

**Typischer Kunde:**
- Ambitionierte Hobby-Sportler
- Teilnahme an lokalen Wettkämpfen
- Bereit, mehr für Performance zu zahlen
- "Ich will schnell sein und Rennen fahren"

### 📉 5% Freeride (Kleinste Gruppe)

**Warum so klein?**
- **Nische:** Freestyle-Tricks, Bikeparks, Stunts
- **Spezielle Anforderungen:** Verstärkte Rahmen, spezielle Federung
- **Höherer Preis:** 3.800€ - nur für Enthusiasten
- **Begrenzte Einsatzgebiete:** Nicht für alltägliche Nutzung

**Typischer Kunde:**
- Junge Erwachsene (18-30 Jahre)
- Bikepark-Stammkunden
- YouTube/Instagram Enthusiasten
- "Ich will die krassesten Tricks machen"

### Die anderen Varianten

**Trail (13%):** Spezialisiert auf Trail-Riding (enge Waldwege, Wurzeln)  
**Performance (12%):** Zwischen Allrounder und Competition  
**Downhill (10%):** Bergab-Spezialist (schwere, robuste Bikes)  
**Marathon (8%):** Langstrecken-Optimiert (Komfort + Effizienz)  
**Extreme (7%):** Für extreme Bedingungen (Steinschläge, große Sprünge)  

---

## 3. Die 4 Sattel-Typen

### Code-Ermäßigung: Nur Sättel

**Vollversion (nicht bei uns):**  
Jedes Bike besteht aus ~14 Hauptkomponenten:
- Rahmen (verschiedene Größen)
- Gabel (verschiedene Federweg)
- Sattel (verschiedene Modelle)
- Laufräder, Bremsen, Schaltung, etc.

**Unsere Code-Ermäßigung (vereinfacht):**

✂️ **Nur Sättel betrachtet!** (4 Varianten)

**Warum diese Vereinfachung?**
- ✅ **90% weniger Komplexität** (von 14 Bauteilen auf 4 reduziert)
- ✅ **Konzept bleibt gleich:** 1 Sattel = 1 Bike = 1:1 Verhältnis
- ✅ **Besser präsentierbar:** Fokus auf Kernkonzepte (Bedarfsrechnung, ATP-Check, etc.)
- ✅ **Zeitersparnis:** Mehr Zeit für die wichtigen Module

### Die 4 Sattel-Modelle

| Sattel-ID | Name            | Verwendet in Varianten | Einkaufspreis | Lieferzeit | Besonderheit |
|-----------|-----------------|------------------------|---------------|------------|--------------|
| **SAT_FT** | Fizik Tundra    | ALLR, FREE             | 45€           | 49 Tage    | Komfort-Sattel (breit) |
| **SAT_RL** | Raceline        | COMP, PERF             | 52€           | 49 Tage    | Sport-Sattel (schmal) |
| **SAT_SP** | Spark           | DOWN, TRAI             | 38€           | 49 Tage    | Robust (verstärkt) |
| **SAT_SL** | Speedline       | EXTR, MARA             | 48€           | 49 Tage    | Leicht (Carbon) |

### Eigenschaften im Detail

#### SAT_FT - Fizik Tundra (Komfort)

- **Breiter Sattel:** Mehr Sitzfläche = mehr Komfort
- **Gel-Polsterung:** Für längere Fahrten
- **Zielgruppe:** Allrounder + Freeride (Hobby-Fahrer)
- **Einkaufspreis:** 45€ (mittlere Preisklasse)

#### SAT_RL - Raceline (Sport)

- **Schmaler Sattel:** Weniger Gewicht, aerodynamisch
- **Härter gefedert:** Für bessere Kraftübertragung
- **Zielgruppe:** Competition + Performance (sportliche Fahrer)
- **Einkaufspreis:** 52€ (teuerste Option)

#### SAT_SP - Spark (Robust)

- **Verstärkt:** Für harte Schläge beim Downhill/Trail
- **Mittelbreite:** Kompromiss zwischen Komfort & Performance
- **Zielgruppe:** Downhill + Trail (Geländefahrer)
- **Einkaufspreis:** 38€ (günstigste Option)

#### SAT_SL - Speedline (Leicht)

- **Carbon-Konstruktion:** Minimales Gewicht
- **Langstrecken-optimiert:** Komfort für Marathon-Fahrer
- **Zielgruppe:** Extreme + Marathon (Ausdauer-Fahrer)
- **Einkaufspreis:** 48€ (mittlere Preisklasse)

---

## 4. Stückliste & BOMs

### BOM (Bill of Materials) - Was braucht jedes Bike?

```
┌─────────────────────────────────────────────────────────────────┐
│                  STÜCKLISTEN-MATRIX                             │
│                  (BOM = Bill of Materials)                      │
└─────────────────────────────────────────────────────────────────┘

MTB Variante           → Sattel benötigt
─────────────────────────────────────────────────────────────
MTB Allrounder (ALLR)  → 1x SAT_FT (Fizik Tundra)
MTB Performance (PERF) → 1x SAT_RL (Raceline)
MTB Trail (TRAI)       → 1x SAT_SP (Spark)
MTB Competition (COMP) → 1x SAT_RL (Raceline)
MTB Downhill (DOWN)    → 1x SAT_SP (Spark)
MTB Marathon (MARA)    → 1x SAT_SL (Speedline)
MTB Extreme (EXTR)     → 1x SAT_SL (Speedline)
MTB Freeride (FREE)    → 1x SAT_FT (Fizik Tundra)
```

### Wichtiges Konzept: 1:1 Verhältnis

```
1 Bike = 1 Sattel

┌─────────────┐
│   1 Bike    │
│  (fertig)   │
└──────┬──────┘
       │
       │ benötigt
       │
       ▼
┌─────────────┐
│  1 Sattel   │
│  (China)    │
└─────────────┘
```

**Das bedeutet:**
- **Kein Verschnitt:** Jeder bestellte Sattel wird verbaut
- **Einfache Berechnung:** Produktionsmenge Bikes = Bedarf Sättel
- **Keine Sicherheitsbestände:** (außer bewusst geplant)

### Mehrfachnutzung von Sätteln

**Wichtig zu verstehen:** Manche Sättel werden für **mehrere Varianten** genutzt!

```
SAT_FT (Fizik Tundra) wird verwendet für:
├─ ALLR (111.000 Bikes)
└─ FREE ( 18.500 Bikes)
   ─────────────────────
   = 129.500 Sättel/Jahr benötigt!

SAT_RL (Raceline) wird verwendet für:
├─ COMP (55.500 Bikes)
└─ PERF (44.400 Bikes)
   ─────────────────────
   = 99.900 Sättel/Jahr benötigt!

SAT_SP (Spark) wird verwendet für:
├─ DOWN (37.000 Bikes)
└─ TRAI (48.100 Bikes)
   ─────────────────────
   = 85.100 Sättel/Jahr benötigt!

SAT_SL (Speedline) wird verwendet für:
├─ EXTR (25.900 Bikes)
└─ MARA (29.600 Bikes)
   ─────────────────────
   = 55.500 Sättel/Jahr benötigt!
```

---

## 5. Jahresbedarf Berechnung

### Gesamtbedarf 2027

| Sattel-Typ | Verwendet für | Jahresbedarf | Anteil | Einkaufswert |
|------------|---------------|--------------|--------|--------------|
| **SAT_FT** | ALLR + FREE   | 129.500      | 35%    | 5.827.500€   |
| **SAT_RL** | COMP + PERF   | 99.900       | 27%    | 5.194.800€   |
| **SAT_SP** | DOWN + TRAI   | 85.100       | 23%    | 3.233.800€   |
| **SAT_SL** | EXTR + MARA   | 55.500       | 15%    | 2.664.000€   |
| **GESAMT** |               | **370.000**  | **100%** | **16.920.100€** |

**Validierung:** ✅ 370.000 Sättel = 370.000 Bikes (stimmt!)

### Monatlicher Durchschnitt

```
370.000 Sättel / 12 Monate = 30.833 Sättel/Monat

ABER: Saisonalität beachten!
→ April: 16% = 59.200 Sättel (Peak!)
→ Okt/Dez: 3% = 11.100 Sättel (Low Season)
```

Mehr zu [Saisonalität →](./04-Zeitparameter.md#saisonalität)

### Täglicher Durchschnitt

```
370.000 Sättel / 365 Tage = 1.013,69... Sättel/Tag

Problem: Dezimalzahl!
Lösung: Error Management (siehe Zeitparameter)
```

Mehr zu [Error Management →](./04-Zeitparameter.md#error-management)

### Losgröße berücksichtigen

**Wichtig:** China-Zulieferer hat **Mindestbestellmenge von 500 Stück**!

```
Beispiel April (Peak):
─────────────────────
SAT_FT Bedarf: 59.200 × 35% = 20.720 Sättel
Losgröße: 500
Bestellungen: 20.720 / 500 = 41,44
             → 42 Bestellungen (aufgerundet)
             → 42 × 500 = 21.000 Sättel
             → 280 Sättel Überbestand

SAT_RL Bedarf: 59.200 × 27% = 15.984 Sättel
Losgröße: 500
Bestellungen: 15.984 / 500 = 31,97
             → 32 Bestellungen
             → 32 × 500 = 16.000 Sättel
             → 16 Sättel Überbestand
```

**Konsequenz:** Losgrößen führen zu **geringen Überbeständen** (aber minimal)

Mehr zu [Losgrößen →](./04-Zeitparameter.md#losgröße)

---

## Zusammenfassung

### Key Takeaways

1. **8 MTB-Varianten** - von ALLR (30%) bis FREE (5%)
2. **4 Sattel-Typen** - Code-Ermäßigung vereinfacht (statt 14 Bauteile)
3. **1:1 Verhältnis** - 1 Bike = 1 Sattel (einfache Berechnung)
4. **Mehrfachnutzung** - Manche Sättel für mehrere Varianten (z.B. SAT_FT für ALLR + FREE)
5. **370.000 Bikes** = **370.000 Sättel** (Jahresbedarf 2027)
6. **Losgröße 500** - Bestellungen immer in 500er-Einheiten

### Kritische Zahlen

| Parameter | Wert | Bedeutung |
|-----------|------|-----------|
| Varianten | 8 | ALLR, COMP, TRAI, PERF, DOWN, MARA, EXTR, FREE |
| Sättel | 4 | SAT_FT, SAT_RL, SAT_SP, SAT_SL |
| Jahresproduktion | 370.000 | Gesamt 2027 |
| Größte Variante | ALLR (30%) | 111.000 Bikes |
| Kleinste Variante | FREE (5%) | 18.500 Bikes |
| Meistgebrauchter Sattel | SAT_FT (35%) | 129.500 Stück |
| Wenigst gebrauchter Sattel | SAT_SL (15%) | 55.500 Stück |

---

## Weiterführende Links

- **[Aufgabenstellung ←](./01-Aufgabenstellung.md)** - Geschäftskontext & Problem
- **[Supply Chain Konzepte ←](./02-Supply-Chain-Konzepte.md)** - SCOR, ATP/CTP
- **[Zeitparameter →](./04-Zeitparameter.md)** - Vorlaufzeiten, Saisonalität, Feiertage
- **[Szenarien →](./05-Szenarien.md)** - 4 operative Szenarien
- **[Glossar →](./07-Glossar.md)** - BOM, SKU, Losgröße erklärt

[[◀ Zurück: Supply Chain Konzepte](./02-Supply-Chain-Konzepte.md)] | [[Weiter: Zeitparameter ▶](./04-Zeitparameter.md)]
