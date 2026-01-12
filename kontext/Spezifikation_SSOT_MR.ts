/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROJEKT SPEZIFIKATION - Supply Chain Management System
 * HAW Hamburg - Wirtschaftsinformatik 3 (WI3)
 * Adventure Works AG - Mountain Bike Production 2027
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION: FINAL - Korrekte Daten aus aktueller Aufgabenstellung
 * DATUM: Januar 2027 (Planungszeitraum: 01.01.2027 - 31.12.2027)
 * TEAM: Pascal Wagner (Lead), Da Yeon Kang, Shauna Ré Erfurth, Taha Wischmann
 * ZIEL: 15 Punkte (Note 1+ / A+)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * WICHTIG: ERMÄSSIGUNGEN AKTIV (Code-Version)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ✓ Nur 1 Zulieferer: China (statt 3: Heilbronn, Spanien, China)
 * ✓ Nur Sättel: 4 Varianten (statt 14 Bauteile: Sättel + Gabeln + Rahmen)
 * ✓ Kein Outbound: Keine Distribution zu 6 Märkten
 * ✓ Kein Solver: FCFS-Regel (First Come First Serve) statt Optimierung
 * 
 * Vorteile:
 * - 90% weniger Code-Komplexität
 * - Einfachere Berechnungen (1 Sattel = 1 Bike)
 * - Fokus auf Kernkonzepte
 * - Schnellere Implementierung
 * - Bessere Präsentierbarkeit
 * 
 * ALLE anderen Anforderungen bleiben bestehen!
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PROJEKT OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * KRITISCHE KORREKTUR: 370.000 BIKES (nicht 185.000!)
 * 
 * Die alte Lösung (MTB_v5) von vor 2 Jahren hatte 185.000 Bikes.
 * Die AKTUELLE Aufgabenstellung verlangt 370.000 Bikes pro Jahr!
 * 
 * Quelle: WI_L_WI3_3.pdf Seite "Daten zum Produktionsnetzwerk"
 * "Gesamtvolumen Fahrräder: 370.000 p.a."
 */

export const PROJEKT_INFO = {
  kunde: "Adventure Works AG",
  projektName: "Supply Chain Management System - Mountain Bikes",
  standort: "OEM Werk Dortmund",
  planungszeitraum: {
    start: "2027-01-01",
    ende: "2027-12-31",
    tage: 365,
    beschreibung: "Vollständiges Kalenderjahr nach Semesterende"
  },
  team: {
    lead: "Pascal Wagner - Supply Chain Lead",
    inbound: "Da Yeon Kang - Inbound Specialist",
    production: "Shauna Ré Erfurth - Production Manager",
    distribution: "Taha Wischmann - Distribution Manager"
  },
  ziel: "15 Punkte (Note 1+ / Sehr gut mit Auszeichnung)",
  ermässigungen: {
    aktiv: true,
    grund: "Code-Lösung",
    details: [
      "Nur China-Zulieferer (statt 3)",
      "Nur Sättel-Bauteile (statt 14)",
      "Kein Outbound zu Märkten",
      "FCFS statt Solver-Optimierung"
    ]
  }
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// STAMMDATEN - PRODUKTIONSMENGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * JAHRESMENGE: 370.000 BIKES
 * 
 * Dies ist die zentrale Zahl für alle Berechnungen!
 * Saisonale Verteilung und Varianten-Mix basieren auf dieser Gesamtmenge.
 */

export const PRODUKTIONSVOLUMEN = {
  jahresProduktion: 370_000, // ← KRITISCH: 370.000 (nicht 185.000!)
  einheit: "Bikes pro Jahr",
  durchschnittProTag: Math.round(370_000 / 365), // ≈ 1.014 Bikes/Tag
  durchschnittProWoche: Math.round(370_000 / 52), // ≈ 7.115 Bikes/Woche
  durchschnittProMonat: Math.round(370_000 / 12), // ≈ 30.833 Bikes/Monat
  peakMonat: {
    monat: "April",
    anteil: 0.16,
    menge: Math.round(370_000 * 0.16) // = 59.200 Bikes im April
  }
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// STAMMDATEN - MTB VARIANTEN (8 Stück)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 8 MTB-Ausstattungsvarianten mit Marktanteilen
 * 
 * Quelle: WI_L_WI3_3.pdf "Verteilung der Kundenwünsche Prognose"
 * Summe: 100,00%
 */

export interface MTBVariante {
  id: string;
  name: string;
  nameKurz: string;
  marktanteil: number; // Prozent (0-100)
  jahresProduktion: number; // Berechnete Stückzahl
  beschreibung: string;
}

export const MTB_VARIANTEN: MTBVariante[] = [
  {
    id: "ALLR",
    name: "MTB Allrounder",
    nameKurz: "Allrounder",
    marktanteil: 30.00,
    jahresProduktion: Math.round(370_000 * 0.30), // = 111.000 Bikes
    beschreibung: "Vielseitiges Mountainbike für alle Einsatzbereiche"
  },
  {
    id: "COMP",
    name: "MTB Competition",
    nameKurz: "Competition",
    marktanteil: 15.00,
    jahresProduktion: Math.round(370_000 * 0.15), // = 55.500 Bikes
    beschreibung: "Wettkampforientiertes Performance-Bike"
  },
  {
    id: "DOWN",
    name: "MTB Downhill",
    nameKurz: "Downhill",
    marktanteil: 10.00,
    jahresProduktion: Math.round(370_000 * 0.10), // = 37.000 Bikes
    beschreibung: "Spezialisiert für Downhill-Strecken und Bikepark"
  },
  {
    id: "EXTR",
    name: "MTB Extreme",
    nameKurz: "Extreme",
    marktanteil: 7.00,
    jahresProduktion: Math.round(370_000 * 0.07), // = 25.900 Bikes
    beschreibung: "Für extremste Bedingungen und Freeriding"
  },
  {
    id: "FREE",
    name: "MTB Freeride",
    nameKurz: "Freeride",
    marktanteil: 5.00,
    jahresProduktion: Math.round(370_000 * 0.05), // = 18.500 Bikes
    beschreibung: "Robustes Bike für Freeride und Tricks"
  },
  {
    id: "MARA",
    name: "MTB Marathon",
    nameKurz: "Marathon",
    marktanteil: 8.00,
    jahresProduktion: Math.round(370_000 * 0.08), // = 29.600 Bikes
    beschreibung: "Leichtes Langstrecken-Bike"
  },
  {
    id: "PERF",
    name: "MTB Performance",
    nameKurz: "Performance",
    marktanteil: 12.00,
    jahresProduktion: Math.round(370_000 * 0.12), // = 44.400 Bikes
    beschreibung: "Hochperformantes Cross-Country Bike"
  },
  {
    id: "TRAI",
    name: "MTB Trail",
    nameKurz: "Trail",
    marktanteil: 13.00,
    jahresProduktion: Math.round(370_000 * 0.13), // = 48.100 Bikes
    beschreibung: "Ausgewogenes Trail-Bike für gemischtes Gelände"
  }
];

// Validierung: Summe muss 100% ergeben
const summeMarktanteile = MTB_VARIANTEN.reduce((sum, v) => sum + v.marktanteil, 0);
const summeJahresProduktion = MTB_VARIANTEN.reduce((sum, v) => sum + v.jahresProduktion, 0);

export const MTB_VALIDIERUNG = {
  marktanteileSumme: summeMarktanteile, // Sollte: 100.00
  produktionsSumme: summeJahresProduktion, // Sollte: ~370.000 (Rundungsfehler möglich)
  istKorrekt: Math.abs(summeMarktanteile - 100.0) < 0.01 && 
              Math.abs(summeJahresProduktion - 370_000) < 100
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// STAMMDATEN - SAISONALITÄT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Saisonaler Verlauf der PRODUKTION (nicht Absatz!)
 * 
 * Quelle: WI_L_WI3_3.pdf Diagramm "Saisonaler Verlauf der Produktion"
 * 
 * WICHTIG: Es handelt sich um die Produktion im Werk,
 *          nicht um den Absatz in den Märkten!
 * 
 * Peak: April mit 16% der Jahresproduktion
 */

export interface Saisonalitaet {
  monat: number; // 1-12
  monatName: string;
  anteil: number; // Prozent (0-100)
  produktionsMenge: number; // Berechnete Bikes für diesen Monat
  tageImMonat: number; // Durchschnittlich
  produktionProTag: number; // Durchschnitt für den Monat
}

export const SAISONALITAET: Saisonalitaet[] = [
  {
    monat: 1,
    monatName: "Januar",
    anteil: 4.0,
    produktionsMenge: Math.round(370_000 * 0.04), // = 14.800 Bikes
    tageImMonat: 31,
    produktionProTag: Math.round((370_000 * 0.04) / 31) // ≈ 477 Bikes/Tag
  },
  {
    monat: 2,
    monatName: "Februar",
    anteil: 6.0,
    produktionsMenge: Math.round(370_000 * 0.06), // = 22.200 Bikes
    tageImMonat: 28, // 2027 ist kein Schaltjahr
    produktionProTag: Math.round((370_000 * 0.06) / 28) // ≈ 793 Bikes/Tag
  },
  {
    monat: 3,
    monatName: "März",
    anteil: 10.0,
    produktionsMenge: Math.round(370_000 * 0.10), // = 37.000 Bikes
    tageImMonat: 31,
    produktionProTag: Math.round((370_000 * 0.10) / 31) // ≈ 1.194 Bikes/Tag
  },
  {
    monat: 4,
    monatName: "April",
    anteil: 16.0, // ← PEAK MONAT!
    produktionsMenge: Math.round(370_000 * 0.16), // = 59.200 Bikes
    tageImMonat: 30,
    produktionProTag: Math.round((370_000 * 0.16) / 30) // ≈ 1.973 Bikes/Tag
  },
  {
    monat: 5,
    monatName: "Mai",
    anteil: 14.0,
    produktionsMenge: Math.round(370_000 * 0.14), // = 51.800 Bikes
    tageImMonat: 31,
    produktionProTag: Math.round((370_000 * 0.14) / 31) // ≈ 1.671 Bikes/Tag
  },
  {
    monat: 6,
    monatName: "Juni",
    anteil: 13.0,
    produktionsMenge: Math.round(370_000 * 0.13), // = 48.100 Bikes
    tageImMonat: 30,
    produktionProTag: Math.round((370_000 * 0.13) / 30) // ≈ 1.603 Bikes/Tag
  },
  {
    monat: 7,
    monatName: "Juli",
    anteil: 12.0,
    produktionsMenge: Math.round(370_000 * 0.12), // = 44.400 Bikes
    tageImMonat: 31,
    produktionProTag: Math.round((370_000 * 0.12) / 31) // ≈ 1.432 Bikes/Tag
  },
  {
    monat: 8,
    monatName: "August",
    anteil: 9.0,
    produktionsMenge: Math.round(370_000 * 0.09), // = 33.300 Bikes
    tageImMonat: 31,
    produktionProTag: Math.round((370_000 * 0.09) / 31) // ≈ 1.074 Bikes/Tag
  },
  {
    monat: 9,
    monatName: "September",
    anteil: 6.0,
    produktionsMenge: Math.round(370_000 * 0.06), // = 22.200 Bikes
    tageImMonat: 30,
    produktionProTag: Math.round((370_000 * 0.06) / 30) // ≈ 740 Bikes/Tag
  },
  {
    monat: 10,
    monatName: "Oktober",
    anteil: 3.0,
    produktionsMenge: Math.round(370_000 * 0.03), // = 11.100 Bikes
    tageImMonat: 31,
    produktionProTag: Math.round((370_000 * 0.03) / 31) // ≈ 358 Bikes/Tag
  },
  {
    monat: 11,
    monatName: "November",
    anteil: 4.0,
    produktionsMenge: Math.round(370_000 * 0.04), // = 14.800 Bikes
    tageImMonat: 30,
    produktionProTag: Math.round((370_000 * 0.04) / 30) // ≈ 493 Bikes/Tag
  },
  {
    monat: 12,
    monatName: "Dezember",
    anteil: 3.0,
    produktionsMenge: Math.round(370_000 * 0.03), // = 11.100 Bikes
    tageImMonat: 31,
    produktionProTag: Math.round((370_000 * 0.03) / 31) // ≈ 358 Bikes/Tag
  }
];

// Validierung
const summeSaisonalitaet = SAISONALITAET.reduce((sum, m) => sum + m.anteil, 0);
const summeProduktion = SAISONALITAET.reduce((sum, m) => sum + m.produktionsMenge, 0);

export const SAISONALITAET_VALIDIERUNG = {
  anteileSumme: summeSaisonalitaet, // Sollte: 100.0
  produktionsSumme: summeProduktion, // Sollte: ~370.000
  istKorrekt: Math.abs(summeSaisonalitaet - 100.0) < 0.01 &&
              Math.abs(summeProduktion - 370_000) < 100
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// STAMMDATEN - BAUTEILE (NUR SÄTTEL wegen Ermäßigung!)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * WICHTIG: Ermäßigung aktiv!
 * 
 * Nur 4 Sattel-Varianten (statt 14 Bauteile mit Gabeln und Rahmen)
 * 
 * Vollversion hätte:
 * - 4 Sättel (Fizik Tundra, Raceline, Spark, Speedline)
 * - 7 Gabeln (Fox 32 F100, Fox 32 F80, Fox Talas 140, Rock Schox Reba, ...)
 * - 3 Rahmen (Aluminium 7005DB, Aluminium 7005TB, Carbon Monocoque)
 * = 14 Bauteile gesamt
 * 
 * Vereinfachung: Nur Sättel!
 * Jedes Bike benötigt genau 1 Sattel → super einfache Stückliste!
 */

export interface Bauteil {
  id: string;
  name: string;
  kategorie: "Sattel" | "Gabel" | "Rahmen";
  zulieferer: "China"; // Ermäßigung: Nur China (nicht Spanien oder Heilbronn)
  beschreibung: string;
}

export const BAUTEILE: Bauteil[] = [
  {
    id: "SAT_FT",
    name: "Fizik Tundra",
    kategorie: "Sattel",
    zulieferer: "China",
    beschreibung: "Premium Sattel für Langstrecken"
  },
  {
    id: "SAT_RL",
    name: "Raceline",
    kategorie: "Sattel",
    zulieferer: "China",
    beschreibung: "Sportlicher Sattel für Wettkampf"
  },
  {
    id: "SAT_SP",
    name: "Spark",
    kategorie: "Sattel",
    zulieferer: "China",
    beschreibung: "Leichter Performance-Sattel"
  },
  {
    id: "SAT_SL",
    name: "Speedline",
    kategorie: "Sattel",
    zulieferer: "China",
    beschreibung: "Aerodynamischer Sattel für Speed"
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// STAMMDATEN - STÜCKLISTE (MTB → SÄTTEL)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Stückliste: Welches Bike benutzt welchen Sattel?
 * 
 * SUPER EINFACH durch Ermäßigung:
 * - Jedes Bike hat genau 1 Sattel
 * - Keine komplexen Kombinationen
 * 
 * Format: [MTB-ID] → [Sattel-ID, Menge: 1]
 */

export interface StuecklistenPosition {
  mtbVariante: string; // z.B. "ALLR"
  bauteilId: string; // z.B. "SAT_FT"
  menge: number; // Immer 1 bei Sätteln
  bauteilName: string;
}

export const STUECKLISTE: StuecklistenPosition[] = [
  // MTB Allrounder → Fizik Tundra
  {
    mtbVariante: "ALLR",
    bauteilId: "SAT_FT",
    menge: 1,
    bauteilName: "Fizik Tundra"
  },
  // MTB Competition → Raceline
  {
    mtbVariante: "COMP",
    bauteilId: "SAT_RL",
    menge: 1,
    bauteilName: "Raceline"
  },
  // MTB Downhill → Spark
  {
    mtbVariante: "DOWN",
    bauteilId: "SAT_SP",
    menge: 1,
    bauteilName: "Spark"
  },
  // MTB Extreme → Speedline
  {
    mtbVariante: "EXTR",
    bauteilId: "SAT_SL",
    menge: 1,
    bauteilName: "Speedline"
  },
  // MTB Freeride → Fizik Tundra
  {
    mtbVariante: "FREE",
    bauteilId: "SAT_FT",
    menge: 1,
    bauteilName: "Fizik Tundra"
  },
  // MTB Marathon → Speedline (leicht!)
  {
    mtbVariante: "MARA",
    bauteilId: "SAT_SL",
    menge: 1,
    bauteilName: "Speedline"
  },
  // MTB Performance → Raceline
  {
    mtbVariante: "PERF",
    bauteilId: "SAT_RL",
    menge: 1,
    bauteilName: "Raceline"
  },
  // MTB Trail → Spark
  {
    mtbVariante: "TRAI",
    bauteilId: "SAT_SP",
    menge: 1,
    bauteilName: "Spark"
  }
];

// Berechnung: Jahresbedarf pro Sattel-Variante
export const BAUTEIL_JAHRESBEDARF = BAUTEILE.map(bauteil => {
  // Finde alle MTBs, die diesen Sattel verwenden
  const verwendendeVarianten = STUECKLISTE.filter(s => s.bauteilId === bauteil.id);
  
  // Summiere deren Jahresproduktion
  const jahresbedarf = verwendendeVarianten.reduce((sum, s) => {
    const mtb = MTB_VARIANTEN.find(m => m.id === s.mtbVariante);
    return sum + (mtb?.jahresProduktion || 0) * s.menge;
  }, 0);
  
  return {
    bauteilId: bauteil.id,
    bauteilName: bauteil.name,
    jahresbedarf,
    verwendetVon: verwendendeVarianten.map(s => s.mtbVariante)
  };
});

// ═══════════════════════════════════════════════════════════════════════════════
// STAMMDATEN - ZULIEFERER (NUR CHINA wegen Ermäßigung!)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * WICHTIG: Ermäßigung aktiv!
 * 
 * Nur 1 Zulieferer: China (statt 3)
 * Nur Sättel als Bauteile (statt Sättel + Gabeln + Rahmen)
 * 
 * Transport erfolgt ausschließlich per:
 * - Seefracht (Schiff): China → Hamburg
 * - LKW: Hamburg → Werk Dortmund
 * 
 * Vereinfachung: Nur China für Sättel!
 */

export interface Zulieferer {
  id: string;
  name: string;
  standort: string;
  land: string;
  liefert: string[]; // Bauteil-Kategorien
  
  // Zeitparameter
  vorlaufzeit: {
    tage: number; // Gesamte Vorlaufzeit
    arbeitstage: boolean; // true = Arbeitstage, false = Kalendertage
    beschreibung: string;
  };
  
  produktionszeit: {
    tage: number; // Zeit von Bestelleingang bis Ende Produktion
    arbeitstage: boolean;
    beschreibung: string;
  };
  
  transportzeit: {
    tage: number; // Berechnet: Vorlaufzeit - Produktionszeit
    modus: "Schiff" | "LKW"; // Ermäßigung: Nur Schiff + LKW (keine Bahn)
    beschreibung: string;
  };
  
  // Logistik-Parameter
  losgroessen: {
    [bauteilKategorie: string]: number; // z.B. "Sattel": 500
  };
  
  kapazitaet: {
    unbegrenzt: boolean;
    maxProTag?: number;
    beschreibung: string;
  };
  
  // Besonderheiten
  feiertage: string[]; // Spezielle Feiertage/Shutdowns
  besonderheiten: string[];
}

/**
 * ACHTUNG: Vorlaufzeit 49 Tage (nicht 56!)
 * 
 * Quelle: WI_L_WI3_3.pdf "MTB Lieferkette – die Zeitparameter"
 * "7 Wochen Vorlaufzeit (China)"
 * 7 Wochen × 7 Tage = 49 Tage
 * 
 * Die alte MTB_v5 Lösung hatte fälschlicherweise 56 Tage (8 Wochen).
 */

export const ZULIEFERER_CHINA: Zulieferer = {
  id: "ZL_CN",
  name: "Dengwong Manufacturing Ltd.",
  standort: "Dengwong",
  land: "China",
  liefert: ["Sattel"],
  
  vorlaufzeit: {
    tage: 49, // ← KRITISCH: 49 Tage = 7 Wochen (nicht 56!)
    arbeitstage: false, // Kalendertage
    beschreibung: "7 Wochen von Bestellung bis Anlieferung im Werk Dortmund"
  },
  
  produktionszeit: {
    tage: 5,
    arbeitstage: true, // Arbeitstage
    beschreibung: "5 Arbeitstage von Bestelleingang bis Ende Produktion (ohne Bestell- und Versandtag)"
  },
  
  transportzeit: {
    tage: 49 - 5 - 4, // 30 Tage Seefracht + 4 AT LKW (2 AT China + 2 AT Hamburg)
    kalendertage: 30, // Seefracht läuft 24/7
    arbeitstage: 4, // 2 AT LKW China→Hafen + 2 AT LKW Hamburg→Dortmund
    modus: "Schiff", // Haupttransport: Seefracht
    beschreibung: "2 AT LKW (China → Hafen), 30 KT Seefracht (China → Hamburg), 2 AT LKW (Hamburg → Dortmund)",
    detaillierteBeschreibung: {
      schritt1: "2 Arbeitstage LKW-Transport von Dengwong zum Hafen Shanghai",
      schritt2: "30 Kalendertage Seefracht von Shanghai nach Hamburg (24/7 unterwegs)",
      schritt3: "2 Arbeitstage LKW-Transport von Hafen Hamburg zum Werk Dortmund"
    }
  },
  
  losgroessen: {
    "Sattel": 500 // Versand erst bei 500 Stück
  },
  
  kapazitaet: {
    unbegrenzt: true,
    beschreibung: "Kapazität wird als 'ausreichend' angenommen"
  },
  
  feiertage: [
    "Chinese Spring Festival" // Spezielle Behandlung!
  ],
  
  besonderheiten: [
    "Spring Festival 2027: 28.01. - 04.02. (8 Tage Shutdown)",
    "Keine Produktion während Spring Festival",
    "Planung muss Shutdown berücksichtigen",
    "Seefracht: 30 Kalendertage konstante Transitzeiten",
    "LKW-Transport: 2 AT China + 2 AT Deutschland = 4 AT",
    "Losgröße 500: Gebündelte Lieferungen"
  ]
};

// Liste aller Zulieferer (in ermäßigter Version nur 1)
export const ZULIEFERER: Zulieferer[] = [
  ZULIEFERER_CHINA
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHINESE SPRING FESTIVAL 2027
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Spring Festival 2027: 28. Januar - 4. Februar
 * 
 * 8 Tage kompletter Shutdown des Zulieferers!
 * Keine Produktion, keine Annahme von Bestellungen.
 * 
 * Planung muss dies berücksichtigen:
 * - Bestellungen vor Festival rechtzeitig platzieren
 * - Lagerbestände für Festival-Zeitraum aufbauen
 * - Nach Festival: Aufholeffekte einplanen
 */

export const SPRING_FESTIVAL_2027 = {
  start: "2027-01-28",
  ende: "2027-02-04",
  dauer: 8, // Tage
  betroffeneZulieferer: ["ZL_CN"],
  auswirkungen: [
    "Keine Produktion im Zuliefererwerk",
    "Keine Annahme neuer Bestellungen",
    "Laufende Produktion pausiert",
    "Transporte können weiterlaufen (Schiffe auf See)",
    "Vor Festival: Erhöhter Bestellbedarf",
    "Nach Festival: Aufhol-Produktion"
  ],
  planungsHinweise: [
    "Letzte Bestellung vor Festival: ca. 3 Wochen vorher",
    "Sicherheitsbestand für Festival-Zeitraum + Vorlaufzeit aufbauen",
    "Nach Festival: Normale Vorlaufzeit gilt wieder",
    "Kritisch: Januar-Februar Übergang"
  ]
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// STAMMDATEN - OEM WERK DORTMUND
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Montagewerk für MTB-Endmontage
 * 
 * Kapazität: 130 Bikes/Stunde
 * Schichten: Variabel pro Woche planbar
 */

export const OEM_WERK = {
  id: "OEM_DO",
  name: "Adventure Works AG - Werk Dortmund",
  standort: "Dortmund",
  land: "Deutschland",
  
  produktion: {
    produktTyp: "Mountain Bikes (MTB)",
    variantenAnzahl: 8,
    kapazitaetProStunde: 130, // Bikes/Stunde
    kapazitaetProSchicht: 130 * 8, // = 1.040 Bikes (bei 8h-Schicht)
    kapazitaetProTag: 130 * 24, // = 3.120 Bikes (theoretisches Maximum)
    
    schichten: {
      variabel: true,
      planungsEinheit: "Woche",
      beschreibung: "Anzahl Schichten wochenweise variabel planbar"
    },
    
    durchlaufzeit: {
      minuten: 325, // Gesamte DLZ für Kaufteile (max.)
      stunden: 5.42,
      beschreibung: "Maximale Durchlaufzeit für Kaufteile im Werk"
    }
  },
  
  lager: {
    vorhanden: true,
    teile: ["Sättel"],
    kapazitaet: "Ausreichend dimensioniert",
    verwaltung: "ATP-Check (Available To Promise) System"
  },
  
  arbeitszeit: {
    wochenplanungBasis: true,
    flexibleSchichten: true,
    arbeitstageProWoche: 5, // Mo-Fr Standard
    feiertageBeruecksichtigt: true
  }
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// STAMMDATEN - MÄRKTE (NICHT implementiert wegen Ermäßigung)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * WICHTIG: Ermäßigung aktiv!
 * 
 * Kein Outbound zu 6 Märkten!
 * 
 * Vollversion hätte:
 * - Deutschland: 37%
 * - USA: 23%
 * - Frankreich: 18%
 * - China: 10%
 * - Schweiz: 6%
 * - Österreich: 6%
 * 
 * Vereinfachung: Alle Bikes bleiben im Werk / gehen an "Zentrallager"
 */

export const MAERKTE_INFO = {
  implementiert: false,
  grund: "Ermäßigung - Kein Outbound erforderlich",
  
  vollversion: [
    { land: "Deutschland", anteil: 37 },
    { land: "USA", anteil: 23 },
    { land: "Frankreich", anteil: 18 },
    { land: "China", anteil: 10 },
    { land: "Schweiz", anteil: 6 },
    { land: "Österreich", anteil: 6 }
  ],
  
  summe: 100,
  
  hinweis: "In Code-Version: Alle Bikes gehen an 'Fertiges Lager' ohne Markt-Distribution"
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// KALENDER & FEIERTAGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kalender für 2027
 * 
 * Wichtig:
 * - Arbeitstage vs. Kalendertage
 * - Feiertage Deutschland (OEM)
 * - Feiertage China (Zulieferer)
 * - Wochenenden
 */

export interface Feiertag {
  datum: string; // ISO Format YYYY-MM-DD
  name: string;
  land: string;
  typ: "Gesetzlich" | "Betriebsferien" | "Festival";
  betroffeneStandorte: string[]; // z.B. ["OEM_DO", "ZL_CN"]
}

/**
 * Feiertage 2027 - Deutschland
 * 
 * Gesetzliche Feiertage NRW (Werk Dortmund)
 */

export const FEIERTAGE_DEUTSCHLAND: Feiertag[] = [
  {
    datum: "2027-01-01",
    name: "Neujahr",
    land: "Deutschland",
    typ: "Gesetzlich",
    betroffeneStandorte: ["OEM_DO"]
  },
  {
    datum: "2027-04-02",
    name: "Karfreitag",
    land: "Deutschland",
    typ: "Gesetzlich",
    betroffeneStandorte: ["OEM_DO"]
  },
  {
    datum: "2027-04-05",
    name: "Ostermontag",
    land: "Deutschland",
    typ: "Gesetzlich",
    betroffeneStandorte: ["OEM_DO"]
  },
  {
    datum: "2027-05-01",
    name: "Tag der Arbeit",
    land: "Deutschland",
    typ: "Gesetzlich",
    betroffeneStandorte: ["OEM_DO"]
  },
  {
    datum: "2027-05-13",
    name: "Christi Himmelfahrt",
    land: "Deutschland",
    typ: "Gesetzlich",
    betroffeneStandorte: ["OEM_DO"]
  },
  {
    datum: "2027-05-24",
    name: "Pfingstmontag",
    land: "Deutschland",
    typ: "Gesetzlich",
    betroffeneStandorte: ["OEM_DO"]
  },
  {
    datum: "2027-06-03",
    name: "Fronleichnam",
    land: "Deutschland",
    typ: "Gesetzlich",
    betroffeneStandorte: ["OEM_DO"]
  },
  {
    datum: "2027-10-03",
    name: "Tag der Deutschen Einheit",
    land: "Deutschland",
    typ: "Gesetzlich",
    betroffeneStandorte: ["OEM_DO"]
  },
  {
    datum: "2027-12-25",
    name: "1. Weihnachtsfeiertag",
    land: "Deutschland",
    typ: "Gesetzlich",
    betroffeneStandorte: ["OEM_DO"]
  },
  {
    datum: "2027-12-26",
    name: "2. Weihnachtsfeiertag",
    land: "Deutschland",
    typ: "Gesetzlich",
    betroffeneStandorte: ["OEM_DO"]
  }
];

/**
 * Feiertage 2027 - China
 * 
 * Inklusive Spring Festival!
 */

export const FEIERTAGE_CHINA: Feiertag[] = [
  // Spring Festival 2027: 28. Januar - 4. Februar (8 Tage!)
  {
    datum: "2027-01-28",
    name: "Spring Festival Tag 1",
    land: "China",
    typ: "Festival",
    betroffeneStandorte: ["ZL_CN"]
  },
  {
    datum: "2027-01-29",
    name: "Spring Festival Tag 2",
    land: "China",
    typ: "Festival",
    betroffeneStandorte: ["ZL_CN"]
  },
  {
    datum: "2027-01-30",
    name: "Spring Festival Tag 3",
    land: "China",
    typ: "Festival",
    betroffeneStandorte: ["ZL_CN"]
  },
  {
    datum: "2027-01-31",
    name: "Spring Festival Tag 4",
    land: "China",
    typ: "Festival",
    betroffeneStandorte: ["ZL_CN"]
  },
  {
    datum: "2027-02-01",
    name: "Spring Festival Tag 5",
    land: "China",
    typ: "Festival",
    betroffeneStandorte: ["ZL_CN"]
  },
  {
    datum: "2027-02-02",
    name: "Spring Festival Tag 6",
    land: "China",
    typ: "Festival",
    betroffeneStandorte: ["ZL_CN"]
  },
  {
    datum: "2027-02-03",
    name: "Spring Festival Tag 7",
    land: "China",
    typ: "Festival",
    betroffeneStandorte: ["ZL_CN"]
  },
  {
    datum: "2027-02-04",
    name: "Spring Festival Tag 8",
    land: "China",
    typ: "Festival",
    betroffeneStandorte: ["ZL_CN"]
  },
  // Weitere chinesische Feiertage
  {
    datum: "2027-04-05",
    name: "Qingming Festival",
    land: "China",
    typ: "Gesetzlich",
    betroffeneStandorte: ["ZL_CN"]
  },
  {
    datum: "2027-05-01",
    name: "Labour Day",
    land: "China",
    typ: "Gesetzlich",
    betroffeneStandorte: ["ZL_CN"]
  },
  {
    datum: "2027-10-01",
    name: "National Day",
    land: "China",
    typ: "Gesetzlich",
    betroffeneStandorte: ["ZL_CN"]
  }
];

// Alle Feiertage zusammen
export const ALLE_FEIERTAGE = [
  ...FEIERTAGE_DEUTSCHLAND,
  ...FEIERTAGE_CHINA
];

// ═══════════════════════════════════════════════════════════════════════════════
// ANFORDERUNGEN A1-A13
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 13 Anforderungen aus der Aufgabenstellung
 * 
 * Quelle: WI_L_WI3_3.pdf "Kriterien für die Bewertung"
 * 
 * Diese müssen für 15 Punkte ALLE erfüllt sein!
 */

export interface Anforderung {
  id: string;
  nummer: string;
  titel: string;
  beschreibung: string;
  kategorie: "OEM" | "Zulieferer" | "Supply Chain" | "Optimierung" | "System";
  prioritaet: "KRITISCH" | "HOCH" | "MITTEL";
  erfuelltDurch: string[]; // Module/Komponenten
  pruefkriterien: string[];
  ermässigungRelevant: boolean; // Änderungen durch Code-Ermäßigung?
  ermässigungHinweis?: string;
}

export const ANFORDERUNGEN: Anforderung[] = [
  {
    id: "A1",
    nummer: "A1",
    titel: "OEM Programmplanung - Wochenbasis",
    beschreibung: "Programm auf Wochenbasis? Wird gegenwärtiges Datum berücksichtigt?",
    kategorie: "OEM",
    prioritaet: "KRITISCH",
    erfuelltDurch: [
      "OEM Produktionsplanung",
      "Wochenkalender",
      "Frozen Zone Konzept"
    ],
    pruefkriterien: [
      "Programm ist auf Wochenbasis geplant",
      "'Heute'-Datum (Frozen Zone) wird berücksichtigt",
      "Vergangene Wochen sind fixiert",
      "Zukünftige Wochen sind planbar"
    ],
    ermässigungRelevant: false
  },
  {
    id: "A2",
    nummer: "A2",
    titel: "OEM Berechnung Teilebedarf",
    beschreibung: "Initialfüllung Programm mit Saisonalität? Variable Stückliste?",
    kategorie: "OEM",
    prioritaet: "KRITISCH",
    erfuelltDurch: [
      "Saisonale Programmplanung",
      "Stücklisten-Auflösung",
      "Bedarfsrechnung"
    ],
    pruefkriterien: [
      "Initialprogramm nutzt saisonale Vorgaben (4%-16%-3%)",
      "Programmplanung ist anpassbar (+/- Menge)",
      "Variable Stückliste wird verwendet",
      "Teilebedarf korrekt berechnet (1 Sattel = 1 Bike)"
    ],
    ermässigungRelevant: true,
    ermässigungHinweis: "Nur Sättel → sehr einfache Stückliste (1:1 Verhältnis)"
  },
  {
    id: "A3",
    nummer: "A3",
    titel: "Lokale Feiertage - OEM",
    beschreibung: "Werden lokale Feiertage im OEM-Werk berücksichtigt?",
    kategorie: "OEM",
    prioritaet: "HOCH",
    erfuelltDurch: [
      "Kalendermodul",
      "Feiertage Deutschland",
      "Arbeitstage-Berechnung"
    ],
    pruefkriterien: [
      "Deutsche Feiertage (NRW) sind hinterlegt",
      "Produktion pausiert an Feiertagen",
      "Arbeitstage-Berechnung korrekt",
      "Wochenenden ausgeschlossen"
    ],
    ermässigungRelevant: false
  },
  {
    id: "A4",
    nummer: "A4",
    titel: "OEM Nutzung des Programmes - Workflow",
    beschreibung: "Ist der Workflow sinnvoll gestaltet?",
    kategorie: "OEM",
    prioritaet: "MITTEL",
    erfuelltDurch: [
      "Dashboard",
      "Navigation",
      "Benutzerführung"
    ],
    pruefkriterien: [
      "Logischer Workflow erkennbar",
      "Intuitive Bedienung",
      "Klare Strukturierung",
      "Sinnvolle Modulreihenfolge"
    ],
    ermässigungRelevant: false
  },
  {
    id: "A5",
    nummer: "A5",
    titel: "Zulieferer - Auftragsverbuchung",
    beschreibung: "Korrekte Verbuchung der OEM-Aufträge? Kapazitätsgrenze?",
    kategorie: "Zulieferer",
    prioritaet: "KRITISCH",
    erfuelltDurch: [
      "Inbound Logistics China",
      "Bestellverwaltung",
      "Kapazitätsprüfung"
    ],
    pruefkriterien: [
      "Aufträge werden korrekt verbucht",
      "Kapazitätsgrenze 'ausreichend' angenommen",
      "Bestellungen nachvollziehbar",
      "Richtige Zuordnung Zulieferer → Bauteil"
    ],
    ermässigungRelevant: true,
    ermässigungHinweis: "Nur China-Zulieferer → vereinfachte Logik"
  },
  {
    id: "A6",
    nummer: "A6",
    titel: "Zulieferer - Vorlaufzeiten",
    beschreibung: "Einbuchung zum richtigen Zeitpunkt? Vorlaufzeiten korrekt?",
    kategorie: "Zulieferer",
    prioritaet: "KRITISCH",
    erfuelltDurch: [
      "Lead Time Management",
      "Liefertermin-Berechnung",
      "Arbeitstage-Kalender"
    ],
    pruefkriterien: [
      "China: 49 Tage Vorlaufzeit (7 Wochen)",
      "Produktionszeit: 5 Arbeitstage",
      "Transport: 2 AT LKW + 30 KT Schiff + 2 AT LKW",
      "Einbuchung zum korrekten Datum",
      "Arbeitstage vs. Kalendertage beachtet"
    ],
    ermässigungRelevant: false
  },
  {
    id: "A7",
    nummer: "A7",
    titel: "Zulieferer - Losgrößen",
    beschreibung: "Versand erst bei Losgröße? Summiert über alle Varianten?",
    kategorie: "Zulieferer",
    prioritaet: "HOCH",
    erfuelltDurch: [
      "Lot Sizing Logic",
      "Versandsteuerung",
      "Variantenübergreifende Aggregation"
    ],
    pruefkriterien: [
      "Sättel: Losgröße 500 Stück",
      "Versand erst bei 500er Vielfachen",
      "Aggregation über alle 4 Sattel-Varianten",
      "Restmengen bleiben im Lager"
    ],
    ermässigungRelevant: false
  },
  {
    id: "A8",
    nummer: "A8",
    titel: "Zulieferer - Maschinenausfall",
    beschreibung: "Nachproduktion nach Maschinenausfall implementiert?",
    kategorie: "Zulieferer",
    prioritaet: "HOCH",
    erfuelltDurch: [
      "Szenario-Management",
      "Maschinenausfall-Szenario",
      "Nachproduktions-Logik"
    ],
    pruefkriterien: [
      "Szenario 'Maschinenausfall' vorhanden",
      "Ausfallzeit konfigurierbar",
      "Automatische Nachholproduktion",
      "Auswirkung auf Liefertermine sichtbar"
    ],
    ermässigungRelevant: false
  },
  {
    id: "A9",
    nummer: "A9",
    titel: "Zulieferer - Lokale Feiertage",
    beschreibung: "Werden lokale Feiertage der Zulieferer berücksichtigt?",
    kategorie: "Zulieferer",
    prioritaet: "HOCH",
    erfuelltDurch: [
      "Kalendermodul",
      "Feiertage China",
      "Spring Festival Handling"
    ],
    pruefkriterien: [
      "Chinesische Feiertage hinterlegt",
      "Spring Festival 2027: 28.01.-04.02. (8 Tage)",
      "Keine Produktion während Festival",
      "Vorlauf-Planung berücksichtigt Festival"
    ],
    ermässigungRelevant: false
  },
  {
    id: "A10",
    nummer: "A10",
    titel: "Supply Chain - Vollständige Abbildung",
    beschreibung: "Durchlauf durch SC mit korrekten DLZ? Alle Knoten? Transport?",
    kategorie: "Supply Chain",
    prioritaet: "KRITISCH",
    erfuelltDurch: [
      "Ende-zu-Ende Prozess",
      "Inbound China",
      "OEM Produktion"
    ],
    pruefkriterien: [
      "Kompletter Flow: Bestellung → Produktion → Transport → Lager → Montage",
      "DLZ korrekt (Arbeits- vs. Kalenderzeit)",
      "Seefracht China → Deutschland: 2 AT LKW + 30 KT Schiff + 2 AT LKW",
      "ATP-Check im OEM"
    ],
    ermässigungRelevant: true,
    ermässigungHinweis: "Kein Outbound → vereinfachter End-Knoten"
  },
  {
    id: "A11",
    nummer: "A11",
    titel: "Supply Chain - Aktuelles Datum 'Heute'",
    beschreibung: "Berücksichtigung des gegenwärtigen Datums ('heute')?",
    kategorie: "Supply Chain",
    prioritaet: "KRITISCH",
    erfuelltDurch: [
      "Frozen Zone Konzept",
      "'Heute'-Markierung",
      "Vergangenheit vs. Zukunft Trennung"
    ],
    pruefkriterien: [
      "'Heute'-Datum konfigurierbar",
      "Vergangenheit ist fixiert (schreibgeschützt)",
      "Zukunft ist planbar (editierbar)",
      "Frozen Zone visuell erkennbar"
    ],
    ermässigungRelevant: false
  },
  {
    id: "A12",
    nummer: "A12",
    titel: "Supply Chain - Marktverteilung",
    beschreibung: "Verteilung der Produkte auf Märkte gemäß Vorgabe?",
    kategorie: "Supply Chain",
    prioritaet: "MITTEL",
    erfuelltDurch: [
      "NICHT IMPLEMENTIERT (Ermäßigung)"
    ],
    pruefkriterien: [
      "ERMÄSSIGUNG: Kein Outbound erforderlich",
      "Alle Bikes gehen an 'Fertiges Lager'",
      "Marktanteile (DE 37%, USA 23%, etc.) NICHT benötigt"
    ],
    ermässigungRelevant: true,
    ermässigungHinweis: "KOMPLETT ENTFALLEN durch Ermäßigung"
  },
  {
    id: "A13",
    nummer: "A13",
    titel: "Optimierung - Produktionsprogramm",
    beschreibung: "Solver/alternativer Ansatz für Optimierung? Auftragspriorisierung?",
    kategorie: "Optimierung",
    prioritaet: "HOCH",
    erfuelltDurch: [
      "FCFS-Regel (First Come First Serve)",
      "Prioritäts-Logik",
      "Kapazitätsprüfung"
    ],
    pruefkriterien: [
      "ERMÄSSIGUNG: FCFS statt Solver",
      "Aufträge werden nach Eingang abgearbeitet",
      "Dokumentation der Priorisierungsregel",
      "Max. Werkskapazität berücksichtigt",
      "Engpass-Behandlung dokumentiert"
    ],
    ermässigungRelevant: true,
    ermässigungHinweis: "FCFS-Regel statt Solver-Optimierung"
  }
];

// Statistik: Wie viele Anforderungen sind durch Ermäßigung betroffen?
export const ANFORDERUNGEN_STATISTIK = {
  gesamt: ANFORDERUNGEN.length,
  kritisch: ANFORDERUNGEN.filter(a => a.prioritaet === "KRITISCH").length,
  hoch: ANFORDERUNGEN.filter(a => a.prioritaet === "HOCH").length,
  mittel: ANFORDERUNGEN.filter(a => a.prioritaet === "MITTEL").length,
  ermässigungBetroffen: ANFORDERUNGEN.filter(a => a.ermässigungRelevant).length,
  vollImplementiert: ANFORDERUNGEN.filter(a => !a.ermässigungRelevant).length
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR MANAGEMENT (Rundungsfehler-Korrektur)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * KRITISCHES KONZEPT: Error Management
 * 
 * Problem:
 * - Saisonale Tagesplanung ergibt Dezimalzahlen (z.B. 1.014,3 Bikes)
 * - Produktion kann nur ganze Bikes herstellen (Integer)
 * - Naive Rundung → kumulativer Fehler über 365 Tage
 * 
 * Beispiel:
 * Tag 1: 1.014,3 → gerundet 1.014 → Fehler: -0,3
 * Tag 2: 1.014,3 → gerundet 1.014 → Fehler: -0,6
 * Tag 3: 1.014,3 → gerundet 1.014 → Fehler: -0,9
 * Tag 4: 1.014,3 → gerundet 1.015 → Fehler: +0,1 (Korrektur!)
 * 
 * Lösung:
 * - Kumulativen Fehler mitführen
 * - Bei Fehler ≥ 0.5: Aufrunden (1 Bike mehr)
 * - Bei Fehler ≤ -0.5: Abrunden (1 Bike weniger)
 * - Ergebnis: Jahressumme stimmt exakt!
 */

export const ERROR_MANAGEMENT_KONZEPT = {
  problem: "Dezimal → Integer Konversion erzeugt Rundungsfehler",
  
  beispiel: {
    sollProduktion: 370_000, // pro Jahr
    tageProJahr: 365,
    durchschnittProTag: 370_000 / 365, // = 1.013,69863... (Dezimal!)
    rundungsProblem: [
      "Naive Rundung: 1.014 × 365 = 370.110 (110 zu viel!)",
      "Immer abrunden: 1.013 × 365 = 369.745 (255 zu wenig!)",
      "→ Kumulativer Fehler entsteht"
    ]
  },
  
  loesung: {
    methode: "Kumulative Fehlerkorrektur",
    algorithmus: [
      "1. Berechne Soll-Produktion (Dezimal)",
      "2. Fehler = Kumulativer Fehler + (Soll - Gerundet)",
      "3. Wenn Fehler ≥ 0.5: Aufrunden",
      "4. Wenn Fehler ≤ -0.5: Abrunden",
      "5. Sonst: Normal runden",
      "6. Fehler aktualisieren für nächsten Tag"
    ],
    
    vorteil: [
      "Jahressumme stimmt exakt: 370.000 Bikes",
      "Fehler bleibt immer klein (|Fehler| < 0.5)",
      "Mathematisch korrekt",
      "Keine systematische Unter-/Überproduktion"
    ],
    
    implementierung: "Pro MTB-Variante eigener Fehler-Tracker"
  },
  
  pruefkriterium: "Summe(TagesProduktion[1..365]) == 370.000 für jede Variante"
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SZENARIEN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 4 Szenarien für Was-wäre-wenn Analysen
 * 
 * Quelle: WI_L_WI3_3.pdf "Konkurrenzangebot" - Szenarien
 */

export interface Szenario {
  id: string;
  name: string;
  beschreibung: string;
  typ: "Marketing" | "Produktion" | "Logistik" | "Katastrophe";
  parameter: {
    [key: string]: any;
  };
  auswirkungen: string[];
  implementierungsHinweise: string[];
}

export const SZENARIEN: Szenario[] = [
  {
    id: "SZ1",
    name: "Marketing-Kampagne",
    beschreibung: "Kurzfristige Nachfrageerhöhung durch Zeitschriften-Aktion",
    typ: "Marketing",
    parameter: {
      startwoche: "KW 20", // Beispiel
      dauer: 4, // Wochen
      nachfrageSteigerung: 1.25, // +25%
      betroffeneVarianten: ["ALLR", "PERF", "TRAI"], // Hauptsächlich Einsteiger-/Mittelklasse
      vorlaufzeit: 2 // Wochen Vorankündigung
    },
    auswirkungen: [
      "Plötzlicher Anstieg der Bestellungen",
      "Test: Können Lager + Pipeline die Nachfrage decken?",
      "Mögliche Lieferengpässe",
      "Erhöhte Auslastung der Montagelinien",
      "Zusätzliche Schichten eventuell nötig"
    ],
    implementierungsHinweise: [
      "Erhöhe Programm in betroffenen Wochen um 25%",
      "Prüfe ATP (Available To Promise) Status",
      "Visualisiere Bestandsentwicklung",
      "Zeige kritische Knappheitssituationen"
    ]
  },
  {
    id: "SZ2",
    name: "Maschinenausfall",
    beschreibung: "Ungeplanter Ausfall einer Produktionslinie",
    typ: "Produktion",
    parameter: {
      standort: "ZL_CN", // China-Zulieferer
      startdatum: "2027-03-15",
      dauer: 5, // Tage
      betroffeneBauteile: ["SAT_FT", "SAT_RL", "SAT_SP", "SAT_SL"], // Alle Sättel
      kapazitaetsreduktion: 0.0 // 100% Ausfall
    },
    auswirkungen: [
      "Produktion stoppt für 5 Tage",
      "Bereits laufende Aufträge verzögern sich",
      "Nachholproduktion nach Reparatur",
      "Lieferverzögerungen an OEM",
      "Potenzielle Produktionsausfälle im Werk"
    ],
    implementierungsHinweise: [
      "Setze Produktionskapazität auf 0 für Ausfall-Tage",
      "Verschiebe laufende Aufträge",
      "Berechne Nachhol-Bedarf",
      "Zeige Auswirkung auf OEM-Verfügbarkeit"
    ]
  },
  {
    id: "SZ3",
    name: "Wasserschaden / Sturm",
    beschreibung: "Umweltkatastrophe beschädigt Lager beim Zulieferer",
    typ: "Katastrophe",
    parameter: {
      standort: "ZL_CN",
      ereignisDatum: "2027-07-10",
      betroffenerBestand: 0.30, // 30% des Lagers beschädigt
      wiederherstellungszeit: 3, // Tage
      betroffeneBauteile: ["SAT_FT", "SAT_RL", "SAT_SP", "SAT_SL"]
    },
    auswirkungen: [
      "30% des Fertigwaren-Lagers zerstört",
      "Bereits fertige Sättel müssen nachproduziert werden",
      "Verzögerung aller laufenden Versendungen",
      "3 Tage Aufräum-/Wiederherstellungszeit",
      "Mögliche Mehrkosten durch Expresstransporte"
    ],
    implementierungsHinweise: [
      "Reduziere Lagerbestand um 30%",
      "Pause Versendungen für 3 Tage",
      "Plane Nachproduktion der verlorenen Menge",
      "Zeige Auswirkung auf OEM-Lieferfähigkeit"
    ]
  },
  {
    id: "SZ4",
    name: "Schiffsverzögerung",
    beschreibung: "Containerschiff hat Verspätung (Sturm, Stau im Suez-Kanal, etc.)",
    typ: "Logistik",
    parameter: {
      route: "China → Deutschland",
      normaleDauer: 30, // Tage Seefracht (Kalendertage)
      normaleLKW: 4, // 2 AT China + 2 AT Deutschland (Arbeitstage)
      verzögerung: 7, // Zusätzliche Tage
      betroffeneLieferung: "Charge 15", // Beispiel-ID
      grund: "Schlechtwetter / Kanal-Stau"
    },
    auswirkungen: [
      "Lieferung kommt 7 Tage später an",
      "OEM wartet länger auf Bauteile",
      "Möglicher Produktionsstillstand",
      "Folgelieferungen eventuell auch betroffen",
      "Höhere Lagerbestände nötig zur Absicherung",
      "Normale Transport-Zeit: 2 AT + 30 KT + 2 AT = ~34 Tage"
    ],
    implementierungsHinweise: [
      "Verlängere Transportzeit für spezifische Charge",
      "Zeige Ankunftsverzögerung",
      "Prüfe ob OEM-Bestand ausreicht",
      "Visualisiere kritische Zeitfenster"
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCOR METRIKEN (5+ Kennzahlen)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SCOR (Supply Chain Operations Reference) Metriken
 * 
 * 5 Hauptkategorien:
 * 1. Reliability (Zuverlässigkeit)
 * 2. Responsiveness (Reaktionsfähigkeit)
 * 3. Agility (Agilität)
 * 4. Costs (Kosten)
 * 5. Asset Management (Anlagennutzung)
 * 
 * Anforderung: Minimum 5 KPIs (mindestens 1 pro Kategorie empfohlen)
 */

export interface SCORMetrik {
  id: string;
  kategorie: "Reliability" | "Responsiveness" | "Agility" | "Costs" | "Asset Management";
  name: string;
  nameDE: string;
  beschreibung: string;
  formel: string;
  einheit: string;
  zielwert: string;
  interpretation: string;
}

export const SCOR_METRIKEN: SCORMetrik[] = [
  // 1. RELIABILITY (Zuverlässigkeit)
  {
    id: "RL.1.1",
    kategorie: "Reliability",
    name: "Perfect Order Fulfillment",
    nameDE: "Perfekte Auftragserfüllung",
    beschreibung: "Anteil der Aufträge, die vollständig, pünktlich und fehlerfrei geliefert wurden",
    formel: "(Anzahl perfekte Aufträge / Gesamtanzahl Aufträge) × 100%",
    einheit: "Prozent",
    zielwert: "≥ 95%",
    interpretation: "Höher = Besser. Zeigt Gesamtzuverlässigkeit der Supply Chain."
  },
  {
    id: "RL.2.1",
    kategorie: "Reliability",
    name: "On-Time Delivery",
    nameDE: "Pünktliche Lieferung",
    beschreibung: "Anteil der Lieferungen, die zum vereinbarten Termin erfolgten",
    formel: "(Anzahl pünktliche Lieferungen / Gesamtanzahl Lieferungen) × 100%",
    einheit: "Prozent",
    zielwert: "≥ 98%",
    interpretation: "Höher = Besser. Kritisch für Kundenzufriedenheit."
  },
  
  // 2. RESPONSIVENESS (Reaktionsfähigkeit)
  {
    id: "RS.1.1",
    kategorie: "Responsiveness",
    name: "Order Fulfillment Cycle Time",
    nameDE: "Auftragsdurchlaufzeit",
    beschreibung: "Zeit von Bestelleingang bis Lieferung beim OEM",
    formel: "Durchschnitt(Lieferdatum - Bestelldatum)",
    einheit: "Tage",
    zielwert: "≤ 49 Tage (China: 5 AT Produktion + 2 AT + 30 KT + 2 AT Transport)",
    interpretation: "Niedriger = Besser. Zeigt Geschwindigkeit der Supply Chain."
  },
  {
    id: "RS.2.1",
    kategorie: "Responsiveness",
    name: "Supply Chain Cycle Time",
    nameDE: "Gesamtdurchlaufzeit Supply Chain",
    beschreibung: "Ende-zu-Ende Zeit von Rohmaterial bis fertiges Bike",
    formel: "Vorlaufzeit Zulieferer + Produktionszeit OEM + Transitzeiten",
    einheit: "Tage",
    zielwert: "≤ 60 Tage",
    interpretation: "Niedriger = Besser. Zeigt Gesamtreaktionszeit."
  },
  
  // 3. AGILITY (Agilität)
  {
    id: "AG.1.1",
    kategorie: "Agility",
    name: "Upside Supply Chain Flexibility",
    nameDE: "Aufwärts-Flexibilität",
    beschreibung: "Fähigkeit, Produktionsvolumen kurzfristig zu erhöhen",
    formel: "(Max. Produktion - Standard Produktion) / Standard Produktion × 100%",
    einheit: "Prozent",
    zielwert: "≥ 25%",
    interpretation: "Höher = Besser. Wichtig für Marketing-Kampagnen."
  },
  {
    id: "AG.2.1",
    kategorie: "Agility",
    name: "Upside Supply Chain Adaptability",
    nameDE: "Anpassungsfähigkeit",
    beschreibung: "Zeit zum Erreichen neuer Produktionsmenge (Szenario-Response)",
    formel: "Tage bis Zielproduktion bei +25% Nachfrage erreicht",
    einheit: "Tage",
    zielwert: "≤ 14 Tage",
    interpretation: "Niedriger = Besser. Zeigt Reaktionsfähigkeit auf Marktänderungen."
  },
  
  // 4. COSTS (Kosten)
  {
    id: "CO.1.1",
    kategorie: "Costs",
    name: "Supply Chain Management Cost",
    nameDE: "Supply Chain Kosten",
    beschreibung: "Gesamtkosten für SCM-Aktivitäten pro produziertes Bike",
    formel: "(Gesamt SCM-Kosten) / (Anzahl produzierte Bikes)",
    einheit: "Euro/Bike",
    zielwert: "Minimierung bei gleichbleibender Qualität",
    interpretation: "Niedriger = Besser. Beinhaltet: Transport, Lager, Administration."
  },
  {
    id: "CO.2.1",
    kategorie: "Costs",
    name: "Inventory Carrying Cost",
    nameDE: "Lagerhaltungskosten",
    beschreibung: "Kosten für Lagerung von Bauteilen (Zinsen, Schwund, Lager-Miete)",
    formel: "(Durchschnittlicher Lagerbestand × Kapitalbindungssatz × Tage) / 365",
    einheit: "Euro",
    zielwert: "Minimierung",
    interpretation: "Niedriger = Besser. Hohe Bestände = Hohe Kosten."
  },
  
  // 5. ASSET MANAGEMENT (Anlagennutzung)
  {
    id: "AM.1.1",
    kategorie: "Asset Management",
    name: "Inventory Days of Supply",
    nameDE: "Lagerreichweite",
    beschreibung: "Anzahl Tage, die der aktuelle Lagerbestand reicht",
    formel: "(Aktueller Lagerbestand) / (Durchschnittlicher Tagesverbrauch)",
    einheit: "Tage",
    zielwert: "7-14 Tage (Sicherheitsbestand)",
    interpretation: "Optimal-Bereich. Zu niedrig = Risiko, zu hoch = Kapitalbindung."
  },
  {
    id: "AM.2.1",
    kategorie: "Asset Management",
    name: "Capacity Utilization",
    nameDE: "Kapazitätsauslastung",
    beschreibung: "Nutzung der verfügbaren Montagekapazität im OEM-Werk",
    formel: "(Tatsächliche Produktion) / (Maximale Kapazität) × 100%",
    einheit: "Prozent",
    zielwert: "80-90% (optimal)",
    interpretation: "80-90% ideal. <80% = Unterauslastung, >90% = Engpass-Gefahr."
  },
  {
    id: "AM.3.1",
    kategorie: "Asset Management",
    name: "Inventory Turnover",
    nameDE: "Lagerumschlag",
    beschreibung: "Wie oft wird das Lager pro Jahr komplett umgeschlagen",
    formel: "(Jahresproduktion) / (Durchschnittlicher Lagerbestand)",
    einheit: "Umschläge/Jahr",
    zielwert: "≥ 12 (monatlich)",
    interpretation: "Höher = Besser. Zeigt Effizienz der Lagerhaltung."
  }
];

// Statistik: Verteilung über Kategorien
export const SCOR_STATISTIK = {
  gesamt: SCOR_METRIKEN.length,
  proKategorie: {
    reliability: SCOR_METRIKEN.filter(m => m.kategorie === "Reliability").length,
    responsiveness: SCOR_METRIKEN.filter(m => m.kategorie === "Responsiveness").length,
    agility: SCOR_METRIKEN.filter(m => m.kategorie === "Agility").length,
    costs: SCOR_METRIKEN.filter(m => m.kategorie === "Costs").length,
    assetManagement: SCOR_METRIKEN.filter(m => m.kategorie === "Asset Management").length
  },
  erfuelltMindestanforderung: SCOR_METRIKEN.length >= 5 // Muss true sein
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FROZEN ZONE KONZEPT ('Heute'-Datum)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Frozen Zone: Trennung von Vergangenheit und Zukunft
 * 
 * Das "Heute"-Datum teilt die Planung in zwei Bereiche:
 * 
 * 1. VERGANGENHEIT (Frozen Zone):
 *    - Bereits produzierte Bikes
 *    - Bereits versendete Bestellungen
 *    - Fixiert, nicht mehr änderbar
 *    - Visualisierung: Ausgegraut
 * 
 * 2. ZUKUNFT (Planning Zone):
 *    - Geplante Produktion
 *    - Offene Bestellungen
 *    - Änderbar, optimierbar
 *    - Visualisierung: Normal/Editierbar
 * 
 * Wichtig für Anforderung A11!
 */

export const FROZEN_ZONE_KONZEPT = {
  zweck: "Realistische Simulation mit historischem und zukünftigem Kontext",
  
  heuteDatum: {
    beispiel: "2027-04-15", // Beispiel: Mitte April
    konfigurierbar: true,
    beschreibung: "Simuliert 'aktuellen' Zeitpunkt in der Planung"
  },
  
  bereiche: {
    vergangenheit: {
      name: "Frozen Zone",
      zeitraum: "01.01.2027 bis Heute",
      eigenschaften: [
        "Daten sind fixiert",
        "Nicht editierbar",
        "Zeigt IST-Werte",
        "Visualisierung: Ausgegraut/Gelb"
      ],
      enthält: [
        "Bereits produzierte Bikes",
        "Versendete Bestellungen",
        "Erhaltene Lieferungen",
        "Verbrauchte Lagerbestände"
      ]
    },
    
    zukunft: {
      name: "Planning Zone",
      zeitraum: "Heute bis 31.12.2027",
      eigenschaften: [
        "Daten sind planbar",
        "Editierbar",
        "Zeigt PLAN-Werte",
        "Visualisierung: Normal/Grün"
      ],
      enthält: [
        "Geplante Produktion",
        "Offene Bestellungen",
        "Prognostizierter Bedarf",
        "Zukünftige Szenarien"
      ]
    }
  },
  
  nutzung: [
    "Szenario-Simulation ab 'Heute'",
    "Prüfung: Reichen Bestände bis Lieferung?",
    "Was-wäre-wenn Analysen",
    "Engpass-Identifikation"
  ],
  
  implementierung: {
    datenstruktur: "Jede Zeile hat Datums-Spalte",
    filter: "if (datum < heute) { frozen = true }",
    ui: "Zweigeteilte Tabelle oder Farbcodierung",
    editSchutz: "Vergangenheits-Zeilen disabled"
  }
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ATP CHECK (Available To Promise)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ATP-Check: Kann Auftrag termingerecht erfüllt werden?
 * 
 * Prüft für jeden Produktionsauftrag:
 * - Sind alle Bauteile verfügbar?
 * - Reicht die Montagekapazität?
 * - Ist der Liefertermin einhaltbar?
 */

export const ATP_CHECK_KONZEPT = {
  name: "Available To Promise Check",
  nameDE: "Verfügbarkeitsprüfung",
  
  zweck: "Sicherstellen, dass Produktion nur startet, wenn alle Bauteile da sind",
  
  pruefschritte: [
    "1. Bauteil-Verfügbarkeit: Sind alle Sättel auf Lager?",
    "2. Kapazitäts-Check: Reicht die Montagekapazität?",
    "3. Termin-Check: Ist Liefertermin realistisch?",
    "4. Priorisierung: FCFS-Regel bei Engpässen"
  ],
  
  ergebnis: {
    ok: {
      status: "✓ ATP OK",
      aktion: "Produktion starten",
      visualisierung: "Grün"
    },
    warnung: {
      status: "⚠ ATP Knapp",
      aktion: "Produktion möglich, aber eng",
      visualisierung: "Gelb"
    },
    fehler: {
      status: "✗ ATP Fehler",
      aktion: "Produktion verzögern / unmöglich",
      visualisierung: "Rot"
    }
  },
  
  fcfsRegel: {
    beschreibung: "First Come First Serve - Aufträge nach Eingang abarbeiten",
    grund: "Ermäßigung: Kein Solver verfügbar",
    logik: [
      "Älteste Bestellung hat höchste Priorität",
      "Bei Engpass: Ältere Aufträge zuerst",
      "Keine Produktvarianten-Priorisierung",
      "Keine Optimierung nach Deckungsbeitrag"
    ],
    dokumentation: "FCFS-Regel statt Solver-Optimierung (Code-Ermäßigung)"
  }
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ZUSAMMENFASSUNG & CHECKLISTE
// ═══════════════════════════════════════════════════════════════════════════════

export const PROJEKT_ZUSAMMENFASSUNG = {
  titel: "Supply Chain Management System - Mountain Bikes 2027",
  kunde: "Adventure Works AG",
  
  kernZahlen: {
    jahresProduktion: "370.000 Bikes", // ← KRITISCH: 370k nicht 185k!
    varianten: "8 MTB-Modelle",
    bauteile: "4 Sattel-Varianten (Ermäßigung)",
    zulieferer: "1 (China) statt 3",
    planungszeitraum: "365 Tage (01.01.-31.12.2027)",
    peakMonat: "April 16% (59.200 Bikes)"
  },
  
  ermässigungen: {
    aktiv: true,
    details: [
      "✓ Nur China-Zulieferer (statt Heilbronn, Spanien, China)",
      "✓ Nur Sättel (statt 14 Bauteile: Sättel + Gabeln + Rahmen)",
      "✓ Kein Outbound (statt 6 Märkte: DE, USA, FR, CN, CH, AT)",
      "✓ FCFS statt Solver (statt Excel-Solver-Optimierung)"
    ],
    vorteile: [
      "90% weniger Code-Komplexität",
      "Einfachere Stückliste (1 Sattel = 1 Bike)",
      "Fokus auf Kernkonzepte",
      "Schnellere Implementierung",
      "Bessere Präsentierbarkeit"
    ]
  },
  
  kritischeParameter: [
    "370.000 Bikes/Jahr (NICHT 185.000!)",
    "China: 49 Tage Vorlaufzeit (7 Wochen, NICHT 56 Tage!)",
    "Transport: 2 AT + 30 KT + 2 AT (NICHT 44 KT!)",
    "Losgröße Sättel: 500 Stück",
    "Spring Festival: 28.01.-04.02.2027 (8 Tage)",
    "April Peak: 16% (59.200 Bikes)"
  ],
  
  moduleÜbersicht: [
    "Dashboard mit SCOR-Metriken",
    "OEM Produktionsplanung (365 Tage, wochenweise)",
    "Error Management (Rundungsfehler-Korrektur)",
    "Inbound Logistics China (49 Tage Vorlauf, Los 500)",
    "Szenarien (Marketing, Maschinenausfall, Sturm, Schiff)",
    "ATP-Check mit FCFS-Regel",
    "Frozen Zone ('Heute'-Konzept)",
    "Kalender (DE + CN Feiertage, Spring Festival)"
  ],
  
  anforderungenStatus: {
    a1: "✓ Wochenplanung + Frozen Zone",
    a2: "✓ Saisonalität + Stückliste",
    a3: "✓ Feiertage Deutschland",
    a4: "✓ Workflow Dashboard",
    a5: "✓ Bestellverwaltung China",
    a6: "✓ 49 Tage Vorlauf (5 AT Produktion + 2 AT + 30 KT + 2 AT Transport)",
    a7: "✓ Losgröße 500",
    a8: "✓ Maschinenausfall-Szenario",
    a9: "✓ Spring Festival 8 Tage",
    a10: "✓ Ende-zu-Ende Flow (2 AT LKW + 30 KT Schiff + 2 AT LKW)",
    a11: "✓ 'Heute'-Datum Frozen Zone",
    a12: "○ ERMÄSSIGUNG - Kein Outbound",
    a13: "✓ FCFS statt Solver (ERMÄSSIGUNG)"
  },
  
  scorMetriken: "11 KPIs über 5 Kategorien (Requirement: ≥5)",
  
  ziel: "15 Punkte (Note 1+ / A+)",
  
  team: [
    "Pascal Wagner - Supply Chain Lead",
    "Da Yeon Kang - Inbound Specialist",
    "Shauna Ré Erfurth - Production Manager",
    "Taha Wischmann - Distribution Manager"
  ]
} as const;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CHECKLISTE FÜR GITHUB COPILOT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Diese Datei enthält ALLE relevanten Daten für die Implementierung:
 * 
 * ✓ Stammdaten:
 *   - 370.000 Bikes pro Jahr (KORREKT!)
 *   - 8 MTB-Varianten mit Marktanteilen
 *   - 4 Sattel-Varianten (Ermäßigung)
 *   - Saisonalität (Jan 4% ... Apr 16% ... Dez 3%)
 * 
 * ✓ Zulieferer:
 *   - China: 49 Tage Vorlauf, 5 AT Produktion, Los 500
 *   - Spring Festival: 28.01.-04.02.2027 (8 Tage)
 * 
 * ✓ OEM Werk:
 *   - 130 Bikes/Stunde Kapazität
 *   - Variable Schichten
 *   - Feiertage Deutschland (NRW)
 * 
 * ✓ Konzepte:
 *   - Error Management (Rundungsfehler)
 *   - Frozen Zone ('Heute'-Datum)
 *   - ATP-Check mit FCFS
 *   - 4 Szenarien
 *   - 11 SCOR-Metriken
 * 
 * ✓ Anforderungen:
 *   - A1-A13 dokumentiert
 *   - Ermäßigungen berücksichtigt
 *   - Prüfkriterien definiert
 * 
 * → Diese Datei ist die SINGLE SOURCE OF TRUTH für das gesamte Projekt!
 * → Alle Implementierungen sollten sich auf diese Werte beziehen!
 * ═══════════════════════════════════════════════════════════════════════════════
 */