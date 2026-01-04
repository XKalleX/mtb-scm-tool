/**
 * ========================================
 * TYPE DEFINITIONS - MTB SUPPLY CHAIN 2027
 * ========================================
 * 
 * Vereinfachte Version für Code-Lösung:
 * - Nur China als Lieferant
 * - Kein Outbound (keine Märkte)
 * - Kein Solver (einfache Produktionsregeln)
 * 
 * HAW Hamburg WI3 Projekt
 */

// ==========================================
// PRODUKT & STÜCKLISTE
// ==========================================

/**
 * MTB Produktvariante (8 Varianten gesamt)
 */
export interface MTBVariante {
  id: string;                    // z.B. "MTBAllrounder"
  name: string;                  // Vollständiger Name
  kategorie: string;             // z.B. "Allrounder", "Competition"
  verkaufspreis: number;         // in EUR
  herstellkosten: number;        // in EUR
  gewicht: number;               // in kg
  farben: string[];              // Verfügbare Farben
}

/**
 * Stückliste (Bill of Materials - BOM)
 * WICHTIG: Alle Komponenten kommen von China!
 */
export interface Stueckliste {
  varianteId: string;
  komponenten: {
    [komponentenId: string]: {
      name: string;              // z.B. "Fox32 F100 Gabel"
      menge: number;             // Anzahl pro Bike
      einheit: string;           // z.B. "Stück"
    }
  };
}

// ==========================================
// KALENDER & ZEITPLANUNG
// ==========================================

/**
 * Kalendertag mit allen relevanten Informationen
 */
export interface Kalendertag {
  datum: Date;
  tag: number;                   // Tag im Jahr (1-365)
  wochentag: number;             // 0=Sonntag, 6=Samstag
  kalenderwoche: number;
  monat: number;                 // 1-12
  istArbeitstag: boolean;        // True wenn kein Wochenende/Feiertag
  feiertage: Feiertag[];         // Array von Feiertagen an diesem Tag
}

/**
 * Feiertag (nur China relevant)
 */
export interface Feiertag {
  datum: Date;
  name: string;
  typ: 'gesetzlich' | 'regional' | 'betrieblich';
}

// ==========================================
// OEM PRODUKTIONSPROGRAMMPLANUNG
// ==========================================

/**
 * Tägliche Produktionsplanung für eine Variante
 */
export interface TagesProduktionsplan {
  datum: Date;
  varianteId: string;
  sollMenge: number;             // Dezimal (z.B. 71.61)
  istMenge: number;              // Integer (71 oder 72)
  kumulierterError: number;      // Für Error-Management
  istMarketing: boolean;         // Sonder-Auftrag von Marketing?
  marketingMenge?: number;       // Zusätzliche Menge
}

/**
 * Saisonale Nachfrage pro Monat (in % der Jahresproduktion)
 */
export interface SaisonalitaetMonat {
  monat: number;                 // 1-12
  anteil: number;                // in % (z.B. 16 für April-Peak)
}

/**
 * Marketing-Sonderauftrag (Szenario 1)
 */
export interface MarketingAuftrag {
  id: string;
  menge: number;
  varianteId: string;
  aktuellesDatum: Date;          // "Heute" im System
  wunschtermin: Date;
  status: 'offen' | 'produziert' | 'geliefert';
}

// ==========================================
// INBOUND LOGISTIK (NUR CHINA!)
// ==========================================

/**
 * China-Lieferant (einziger Lieferant)
 */
export interface LieferantChina {
  id: 'CHN';
  name: string;
  land: 'China';
  vorlaufzeitKalendertage: number;  // 35 Tage Schiff-Transport
  vorlaufzeitArbeitstage: number;   // 21 Arbeitstage Bearbeitung
  losgroesse: number;               // 2000 Stück Mindestbestellung
  kapazitaet: number;               // Max. Produktion pro Tag
  lieferintervall: number;          // Alle 14 Tage
  besonderheiten: string[];         // Spring Festival!
}

/**
 * Bestellung beim China-Lieferanten
 */
export interface Bestellung {
  id: string;
  bestelldatum: Date;
  komponenten: {
    [komponentenId: string]: number;  // Menge
  };
  status: 'bestellt' | 'unterwegs' | 'angekommen';
  erwarteteAnkunft: Date;
  tatsaechlicheAnkunft?: Date;
}

// ==========================================
// PRODUKTION & LAGER
// ==========================================

/**
 * Lagerbestand für eine Komponente
 */
export interface Lagerbestand {
  komponentenId: string;
  bestand: number;
  sicherheitsbestand: number;
  maximalbestand: number;
  letzteBewegung: Date;
}

/**
 * Produktionsauftrag im Werk Deutschland
 * WICHTIG: Keine Solver-Optimierung, sondern First-Come-First-Serve!
 */
export interface Produktionsauftrag {
  id: string;
  datum: Date;
  varianteId: string;
  geplanteMenge: number;
  produzierbareMenge: number;    // Begrenzt durch Materialverfügbarkeit
  tatsaechlicheMenge: number;
  status: 'geplant' | 'produziert' | 'gelagert';
  materialmangel?: string[];     // Fehlende Komponenten
}

/**
 * Maschinenausfall beim China-Lieferanten (Szenario 2)
 */
export interface Maschinenausfall {
  id: string;
  startDatum: Date;
  endDatum: Date;
  dauer: number;                 // in Tagen
  nachproduktion: boolean;       // Wird nachproduziert?
}

// ==========================================
// SCOR METRIKEN & REPORTING (REDUZIERT)
// ==========================================

/**
 * SCOR Metriken (reduziert, da kein Outbound)
 * Fokus auf Produktions- und Lager-KPIs
 */
export interface SCORMetriken {
  // RELIABILITY (Zuverlässigkeit)
  planerfuellungsgrad: number;           // % der geplanten Produktion erreicht
  liefertreueChina: number;              // % pünktliche Lieferungen aus China
  
  // RESPONSIVENESS (Reaktionsfähigkeit)
  durchlaufzeitProduktion: number;       // in Tagen (Bestellung → Produktion)
  lagerumschlag: number;                 // Wie oft pro Jahr wird Lager umgeschlagen
  
  // AGILITY (Flexibilität)
  produktionsflexibilitaet: number;      // % Mehrproduktion möglich
  materialverfuegbarkeit: number;        // % der Zeit genug Material
  
  // COSTS (Kosten)
  gesamtkosten: number;                  // in EUR
  herstellkosten: number;                // in EUR
  lagerkosten: number;                   // in EUR
  beschaffungskosten: number;            // in EUR
  
  // ASSETS (Vermögenswerte)
  lagerbestandswert: number;             // in EUR
  kapitalbindung: number;                // in Tagen
  
  // PRODUKTIONS-KPIs
  gesamtproduktion: number;              // Anzahl Bikes
  produktionstage: number;               // Anzahl Tage produziert
  durchschnittProTag: number;            // Bikes/Tag
  auslastung: number;                    // % der Kapazität genutzt
}

/**
 * Dashboard-Daten für Übersicht
 */
export interface DashboardData {
  aktuellesDatum: Date;
  gesamtproduktion: number;
  produzierteEinheiten: number;
  offeneAuftraege: number;
  lagerbestand: number;
  scorMetriken: SCORMetriken;
  kritischeBestaende: string[];     // Komponenten unter Sicherheitsbestand
  offeneBestellungen: Bestellung[]; // Bestellungen unterwegs
}

// ==========================================
// BERECHNUNGS-CONTEXT
// ==========================================

/**
 * Gesamt-Kontext für alle Berechnungen
 */
export interface SupplyChainContext {
  jahr: number;                          // 2027
  startDatum: Date;                      // 1. Januar 2027
  endDatum: Date;                        // 31. Dezember 2027
  aktuellesDatum: Date;                  // "Heute" im System
  
  // Stammdaten
  varianten: MTBVariante[];
  stuecklisten: { [varianteId: string]: Stueckliste };
  lieferant: LieferantChina;             // Nur ein Lieferant!
  
  // Planungsdaten
  jahresproduktion: { [varianteId: string]: number };
  saisonalitaet: SaisonalitaetMonat[];
  
  // Szenarien (aktiviert/deaktiviert)
  marketingAuftraege: MarketingAuftrag[];
  maschinenausfaelle: Maschinenausfall[];
  
  // Berechnete Daten (Cache)
  kalender?: Kalendertag[];
  produktionsplaene?: { [varianteId: string]: TagesProduktionsplan[] };
  bestellungen?: Bestellung[];
  lagerbestaende?: { [komponentenId: string]: Lagerbestand };
}

// ==========================================
// UI STATE & NAVIGATION
// ==========================================

/**
 * Navigation Tab (vereinfacht ohne Outbound)
 */
export type NavigationTab = 
  | 'dashboard'
  | 'oem-programm'
  | 'inbound'
  | 'produktion'
  | 'reporting';

/**
 * Filter-Optionen für verschiedene Ansichten
 */
export interface FilterOptions {
  varianteIds?: string[];
  zeitraum?: {
    von: Date;
    bis: Date;
  };
}