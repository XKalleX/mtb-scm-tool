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
 * Feiertag (für Deutschland und China)
 */
export interface Feiertag {
  datum: Date;
  name: string;
  typ: 'gesetzlich' | 'regional' | 'betrieblich' | 'Festival';
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
 * WICHTIG: Alle Werte sind über Einstellungen konfigurierbar!
 */
export interface LieferantChina {
  id: 'CHN';
  name: string;
  land: 'China';
  vorlaufzeitKalendertage: number;  // 30 Tage Seefracht (Shanghai → Hamburg, 24/7)
  vorlaufzeitArbeitstage: number;   // 5 Arbeitstage Produktion
  lkwTransportArbeitstage: number;  // 4 AT gesamt (2 AT China→Hafen + 2 AT Hamburg→Dortmund)
  lkwTransportChinaArbeitstage: number;  // 2 AT China → Hafen
  lkwTransportDeutschlandArbeitstage: number;  // 2 AT Hamburg → Dortmund
  gesamtVorlaufzeitTage: number;    // Total: 49 Tage (konfigurierbar)
  losgroesse: number;               // 500 Stück Sättel Mindestbestellung
  kapazitaet: number;               // Max. Produktion pro Tag
  besonderheiten: string[];         // Spring Festival (8 Tage)!
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
  maximalbestand: number;
  letzteBewegung: Date;
}

/**
 * Produktionsauftrag im Werk Deutschland
 * Nutzt proportionale Allokation bei Materialengpässen (faire Verteilung)
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
  deliveryPerformance: number;           // % Lieferungen innerhalb der Vorlaufzeit (NEU)
  
  // RESPONSIVENESS (Reaktionsfähigkeit)
  durchlaufzeitProduktion: number;       // in Tagen (Bestellung → Produktion)
  lagerumschlag: number;                 // Wie oft pro Jahr wird Lager umgeschlagen
  forecastAccuracy: number;              // % Genauigkeit Plan vs. Ist (NEU)
  
  // AGILITY (Flexibilität)
  produktionsflexibilitaet: number;      // % Mehrproduktion möglich
  materialverfuegbarkeit: number;        // % der Zeit genug Material
  
  // ASSETS (Anlagenverwaltung - KEINE KOSTEN)
  lagerreichweite: number;               // Lagerbestand in Tagen Reichweite
  kapitalbindung: number;                // Durchschnittliche Lagerdauer in Tagen
  
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
  kritischeBestaende: string[];     // Komponenten mit niedrigem Bestand
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