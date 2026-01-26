/**
 * ========================================
 * ZENTRALER SUPPLY CHAIN METRICS RECHNER
 * ========================================
 * * SINGLE SOURCE OF TRUTH für alle Berechnungen im Tool.
 * Diese Datei berechnet alle KPIs dynamisch basierend auf:
 * - Konfigurationswerte (Jahresproduktion, Saisonalität, etc.)
 * - Aktive Szenarien (Marketing, Maschinenausfall, etc.)
 * * Alle Seiten (Dashboard, Reporting, etc.) MÜSSEN diese
 * Berechnungen nutzen für konsistente Daten!
 * * Quelle: kontext/Spezifikation_SSOT_MR.ts
 * * NEU: Unterstützt dynamische Konfiguration aus KonfigurationContext
 */

import { SzenarioConfig } from '@/contexts/SzenarienContext'
import saisonalitaetData from '@/data/saisonalitaet.json'
import stammdatenData from '@/data/stammdaten.json'
import lieferantChinaData from '@/data/lieferant-china.json'

// ========================================
// SSOT KONSTANTEN (Standard-Werte aus JSON, können überschrieben werden)
// ========================================

/**
 * KRITISCH: 370.000 Bikes pro Jahr (NICHT 185.000!)
 * Wird aus JSON geladen, fallback auf Standard-Wert
 */
export const JAHRESPRODUKTION_SSOT = (stammdatenData as any).jahresproduktion?.gesamt || 370_000

/**
 * China Vorlaufzeit: Feste Management-Referenz aus JSON (lieferant-china.json)
 * Dies ist ein fix definierter Wert vom Management, NICHT die Summe der Transportphasen.
 * Die tatsächliche Lieferzeit kann durch Feiertage, Szenarien etc. abweichen.
 * 
 * Transport-Phasen (aus JSON, zur Information):
 * - 5 AT Produktion in China
 * - 2 AT LKW zum Hafen
 * - 30 KT Seefracht
 * - 2 AT LKW zum Werk
 */
export const CHINA_VORLAUFZEIT_TAGE = lieferantChinaData.lieferant.gesamtVorlaufzeitTage || 49

/**
 * Losgröße Sättel aus JSON
 */
export const LOSGROESSE_SAETTEL = lieferantChinaData.lieferant.losgroesse || 500

/**
 * Arbeitstage pro Jahr (Mo-Fr ohne Feiertage)
 */
export const ARBEITSTAGE_PRO_JAHR = 252

/**
 * Kalendertage pro Jahr
 */
export const KALENDERTAGE_PRO_JAHR = 365

/**
 * Durchschnittliche Tage pro Monat
 */
export const DURCHSCHNITT_TAGE_PRO_MONAT = 30.4

/**
 * Gleichmäßiger monatlicher Anteil in Prozent (100% / 12 Monate)
 */
export const GLEICHMAESSIGER_MONATSANTEIL = 100 / 12 // ≈ 8.33%

/**
 * Monatsnamen (kurz) für Visualisierungen
 */
export const MONATSNAMEN_KURZ = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

/**
 * Saisonale Auswirkungsfaktoren für SCOR-Metriken
 * In Peak-Monaten (hohe Produktion) werden Metriken leicht beeinträchtigt
 */
export const SAISONALE_AUSWIRKUNG = {
  PLANERFUELLUNG_FAKTOR: 5,      // Reduzierung in % pro Saisonalitätspunkt über Normal
  LIEFERTREUE_FAKTOR: 3,         // Reduzierung in % pro Saisonalitätspunkt
  MATERIALVERFUEGBARKEIT_FAKTOR: 4,  // Reduzierung in % pro Saisonalitätspunkt
  DURCHLAUFZEIT_BONUS: 2         // Zusätzliche Tage bei hoher Auslastung
}

/**
 * Sampling-Intervall für Produktionsrückstand-Visualisierung
 * 7 = Wöchentliche Datenpunkte (365 Tage / 7 = ~52 Punkte)
 */
export const RUECKSTAND_SAMPLING_INTERVALL = 7

/**
 * Wasserschaden: Maximaler relativer Verlusteffekt
 */
export const WASSERSCHADEN_MAX_VERLUST_EFFEKT = 0.3

/**
 * Wasserschaden: Divisor für relative Verlustberechnung
 */
export const WASSERSCHADEN_VERLUST_DIVISOR = 10000

/**
 * Durchlaufzeit Penalty Factor für Delivery Performance
 * 1 Tag Verzögerung = 1% Penalty auf Lieferperformance
 */
export const DURCHLAUFZEIT_PENALTY_FAKTOR = 100

// <--- CHANGED: New Constant for "Lean" Inventory Goal
/**
 * Ziel-Sicherheitsbestand: 3 Tage
 * Ersetzt die alte Annahme von 2 Wochen (Just-in-Time Ziel)
 */
export const ZIEL_SICHERHEITSBESTAND_TAGE = 3 


// ========================================
// KONFIGURATION INTERFACE (für dynamische Werte)
// ========================================

export interface DynamicConfig {
  jahresproduktion: number
  arbeitstage: number
  saisonalitaet: Array<{ monat: number; anteil: number }>
  varianten: Array<{ id: string; name: string; anteilPrognose: number }>
}

// ========================================
// BASELINE WERTE (ohne Szenarien)
// ========================================

export interface BaselineWerte {
  jahresproduktion: number
  produktionstage: number
  durchschnittProTag: number
  materialverfuegbarkeit: number
  liefertreue: number
  durchlaufzeit: number
  planerfuellungsgrad: number
  lagerumschlag: number
  auslastung: number
}

/**
 * Baseline-Werte OHNE Szenarien
 * Basierend auf SSOT Spezifikation
 */
export const BASELINE: BaselineWerte = {
  jahresproduktion: JAHRESPRODUKTION_SSOT,
  produktionstage: ARBEITSTAGE_PRO_JAHR,
  durchschnittProTag: Math.round(JAHRESPRODUKTION_SSOT / ARBEITSTAGE_PRO_JAHR), // ≈ 1.468
  materialverfuegbarkeit: 98.5,
  liefertreue: 95.2,
  durchlaufzeit: CHINA_VORLAUFZEIT_TAGE, // 49 Tage (China-Vorlauf)
  planerfuellungsgrad: 99.86,
  lagerumschlag: 4.2,
  auslastung: 99.86
}

/**
 * Erzeugt Baseline-Werte basierend auf dynamischer Konfiguration
 */
export function createDynamicBaseline(config: DynamicConfig): BaselineWerte {
  return {
    jahresproduktion: config.jahresproduktion,
    produktionstage: config.arbeitstage,
    durchschnittProTag: Math.round(config.jahresproduktion / config.arbeitstage),
    materialverfuegbarkeit: 98.5,
    liefertreue: 95.2,
    durchlaufzeit: CHINA_VORLAUFZEIT_TAGE, // 49 Tage (korrekt!)
    planerfuellungsgrad: 99.86,
    lagerumschlag: 4.2,
    auslastung: 99.86
  }
}

// ========================================
// MONATLICHE PRODUKTIONSDATEN (SSOT)
// ========================================

export interface MonatsProduktion {
  monat: string
  monatIndex: number
  anteil: number
  plan: number
  ist: number
  abweichung: number
}

/**
 * Berechnet die monatliche Produktionsverteilung basierend auf SSOT
 */
export function berechneMonatlicheProduktion(jahresproduktion: number): MonatsProduktion[] {
   
  return saisonalitaetData.saisonalitaetMonatlich.map((monat, index) => {
    const plan = Math.round(jahresproduktion * monat.anteil / 100)
    // Ist-Wert mit leichter natürlicher Abweichung (ca. 1-2%)
    const abweichungsFaktor = 1 - (Math.sin(index * 0.8) * 0.02 + 0.01)
    const ist = Math.round(plan * abweichungsFaktor)
    
    return {
      monat: MONATSNAMEN_KURZ[index],
      monatIndex: index + 1,
      anteil: monat.anteil,
      plan,
      ist,
      abweichung: ist - plan
    }
  })
}

// ========================================
// VARIANTEN-DATEN (SSOT)
// ========================================

export interface VariantenProduktion {
  id: string
  name: string
  prozent: number
  wert: number
}

/**
 * Berechnet die Produktion pro MTB-Variante basierend auf SSOT
 */
export function berechneVariantenProduktion(jahresproduktion: number): VariantenProduktion[] {
  return stammdatenData.varianten.map(variante => ({
    id: variante.id,
    name: variante.name,
    prozent: Math.round(variante.anteilPrognose * 100),
    wert: Math.round(jahresproduktion * variante.anteilPrognose)
  }))
}

// ========================================
// SZENARIO AUSWIRKUNGEN
// ========================================

export interface SzenarioAuswirkungen {
  // Produktionsbezogen
  produktionsmenge: number
  produktionsDelta: number
  produktionsDeltaProzent: number
   
  // Lieferkettenbezogen
  materialverfuegbarkeit: number
  materialverfuegbarkeitDelta: number
  liefertreue: number
  liefertreueDelta: number
  durchlaufzeit: number
  durchlaufzeitDelta: number
   
  // Leistungsbezogen
  planerfuellungsgrad: number
  lagerumschlag: number
  auslastung: number
   
  // Produktionstage und Durchschnitt
  produktionstage: number
  durchschnittProTag: number
}

/**
 * Berechnet die Auswirkungen aller aktiven Szenarien auf die Supply Chain
 */
export function berechneSzenarioAuswirkungen(aktiveSzenarien: SzenarioConfig[]): SzenarioAuswirkungen {
  // Start mit Baseline-Werten
  let produktionsmenge = BASELINE.jahresproduktion
  let materialverfuegbarkeit = BASELINE.materialverfuegbarkeit
  let liefertreue = BASELINE.liefertreue
  let durchlaufzeit = BASELINE.durchlaufzeit
  let planerfuellungsgrad = BASELINE.planerfuellungsgrad
  let lagerumschlag = BASELINE.lagerumschlag
  let auslastung = BASELINE.auslastung
  let produktionstage = BASELINE.produktionstage

  // Wende jedes aktive Szenario an
  aktiveSzenarien.forEach(szenario => {
    switch (szenario.typ) {
      case 'marketingaktion':
        // Marketing erhöht Nachfrage → mehr Produktion nötig
        const erhoehung = (szenario.parameter.erhoehungProzent || 20) / 100
        const dauerWochen = szenario.parameter.dauerWochen || 4
        // Auswirkung auf das ganze Jahr: (dauer/52) * erhoehung
        const jahresEffekt = (dauerWochen / 52) * erhoehung
        produktionsmenge *= (1 + jahresEffekt)
        // Erhöhte Nachfrage belastet Material und Kapazität
        materialverfuegbarkeit -= erhoehung * 15 // -3% bei 20% Erhöhung
        planerfuellungsgrad -= erhoehung * 10 // Leicht schwieriger zu erfüllen
        auslastung = Math.min(100, auslastung + erhoehung * 20)
        break

      case 'maschinenausfall':
        // China-Produktion fällt aus → weniger Material verfügbar
        const reduktion = (szenario.parameter.reduktionProzent || 60) / 100
        const dauerTage = szenario.parameter.dauerTage || 7
        // Auswirkung auf Materialverfügbarkeit
        const ausfallEffekt = (dauerTage / KALENDERTAGE_PRO_JAHR) * reduktion
        materialverfuegbarkeit -= reduktion * 25 // Deutlicher Rückgang
        liefertreue -= reduktion * 15
        planerfuellungsgrad -= ausfallEffekt * 100
        // Weniger Material → weniger Produktion möglich
        produktionsmenge *= (1 - ausfallEffekt * 0.5)
        lagerumschlag -= reduktion * 1.5
        break

      case 'wasserschaden':
        // Container-Verlust → sofortiger Materialverlust
        const verlustMenge = szenario.parameter.verlustMenge || 1000
        // Relative Auswirkung basierend auf typischem Lagerbestand
        const verlustEffekt = Math.min(WASSERSCHADEN_MAX_VERLUST_EFFEKT, verlustMenge / WASSERSCHADEN_VERLUST_DIVISOR)
        materialverfuegbarkeit -= verlustEffekt * 30
        liefertreue -= verlustEffekt * 20
        planerfuellungsgrad -= verlustEffekt * 15
        // Weniger Material im Lager → niedrigerer Umschlag
        lagerumschlag -= verlustEffekt * 2
        break

      case 'schiffsverspaetung':
        // Schiff kommt später → längere Durchlaufzeit
        const verspaetungTage = szenario.parameter.verspaetungTage || 4
        durchlaufzeit += verspaetungTage
        // Verspätung beeinflusst Liefertreue und Material
        liefertreue -= verspaetungTage * 1.5
        materialverfuegbarkeit -= verspaetungTage * 1.2
        planerfuellungsgrad -= verspaetungTage * 0.5
        break
    }
  })

  // Stelle sicher, dass Werte in gültigen Bereichen bleiben
  materialverfuegbarkeit = Math.max(0, Math.min(100, materialverfuegbarkeit))
  liefertreue = Math.max(0, Math.min(100, liefertreue))
  planerfuellungsgrad = Math.max(0, Math.min(100, planerfuellungsgrad))
  auslastung = Math.max(0, Math.min(100, auslastung))
  lagerumschlag = Math.max(0, lagerumschlag)

  // Berechne durchschnittliche Tagesproduktion
  const durchschnittProTag = Math.round(produktionsmenge / produktionstage)

  return {
    produktionsmenge: Math.round(produktionsmenge),
    produktionsDelta: Math.round(produktionsmenge - BASELINE.jahresproduktion),
    produktionsDeltaProzent: ((produktionsmenge - BASELINE.jahresproduktion) / BASELINE.jahresproduktion) * 100,
     
    materialverfuegbarkeit: Math.round(materialverfuegbarkeit * 10) / 10,
    materialverfuegbarkeitDelta: Math.round((materialverfuegbarkeit - BASELINE.materialverfuegbarkeit) * 10) / 10,
     
    liefertreue: Math.round(liefertreue * 10) / 10,
    liefertreueDelta: Math.round((liefertreue - BASELINE.liefertreue) * 10) / 10,
     
    durchlaufzeit: Math.round(durchlaufzeit),
    durchlaufzeitDelta: Math.round(durchlaufzeit - BASELINE.durchlaufzeit),
     
    planerfuellungsgrad: Math.round(planerfuellungsgrad * 100) / 100,
    lagerumschlag: Math.round(lagerumschlag * 10) / 10,
    auslastung: Math.round(auslastung * 100) / 100,
     
    produktionstage,
    durchschnittProTag
  }
}

// ========================================
// SCOR METRIKEN BERECHNUNG
// ========================================

export interface SCORMetrikenBerechnet {
  // RELIABILITY (Zuverlässigkeit)
  planerfuellungsgrad: number
  liefertreueChina: number
  deliveryPerformance: number        // NEU: % Lieferungen innerhalb Vorlaufzeit
   
  // RESPONSIVENESS (Reaktionsfähigkeit)
  durchlaufzeitProduktion: number
  lagerumschlag: number
  forecastAccuracy: number           // NEU: % Genauigkeit Plan vs. Ist
   
  // AGILITY (Flexibilität)
  produktionsflexibilitaet: number
  materialverfuegbarkeit: number
   
  // ASSETS (Anlagenverwaltung - KEINE KOSTEN!)
  lagerreichweite: number            // Lagerbestand in Tagen Reichweite
  kapitalbindung: number             // Durchschnittliche Lagerdauer in Tagen
   
  // PRODUKTIONS-KPIs
  gesamtproduktion: number
  produktionstage: number
  durchschnittProTag: number
  auslastung: number
}

// <--- CHANGED: Logic updated to use real inventory data instead of "2 weeks fixed"
/**
 * Berechnet alle SCOR-Metriken basierend auf aktiven Szenarien
 * * @param aktiveSzenarien - Array von aktiven Szenario-Konfigurationen
 * @param realerLagerbestand - (NEU) Der aktuelle tatsächliche Lagerbestand aus der Simulation
 * @returns Vollständige SCOR-Metriken
 */
export function berechneSCORMetriken(
    aktiveSzenarien: SzenarioConfig[], 
    realerLagerbestand: number // <--- CHANGED: Added parameter
): SCORMetrikenBerechnet {
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
   
  // <--- CHANGED: Removed static "2 weeks" calculation.
  // OLD CODE:
  // const WOCHEN_PRO_JAHR = 52
  // const LAGERBESTAND_WOCHEN = 2
  // const durchschnittlicherLagerbestand = Math.round(auswirkungen.produktionsmenge / (WOCHEN_PRO_JAHR / LAGERBESTAND_WOCHEN))
  
  // NEW CODE:
  // Lagerreichweite (Days of Supply) = Current Inventory / Daily Demand
  const lagerreichweite = auswirkungen.durchschnittProTag > 0
    ? Math.round((realerLagerbestand / auswirkungen.durchschnittProTag) * 10) / 10
    : 0
   
  // Kapitalbindung: Durchschnittliche Lagerdauer in Tagen
  // HINWEIS: Identisch mit Lagerreichweite, da beide die durchschnittliche Verweildauer
  // von Komponenten im Lager messen. Keine Kosten-Komponente mehr!
  const kapitalbindung = lagerreichweite
   
  // NEU: Delivery Performance - % Lieferungen innerhalb der Vorlaufzeit (49 Tage)
  // Basis: Liefertreue mit Toleranz für Durchlaufzeit-Verzögerungen
  const DURCHLAUFZEIT_PENALTY_FAKTOR = 100 // Divisor für Verzögerungsberechnung (1 Tag = 1% Penalty)
  const deliveryPerformance = Math.max(
    0,
    Math.min(
      100,
      auswirkungen.liefertreue * (1 - (auswirkungen.durchlaufzeit - BASELINE.durchlaufzeit) / DURCHLAUFZEIT_PENALTY_FAKTOR)
    )
  )
   
  // NEU: Forecast Accuracy - Genauigkeit der Planerfüllung
  // Berechnet aus der Abweichung zwischen Plan und Ist über alle Monate
  const monatlicheProduktion = berechneMonatlicheProduktion(auswirkungen.produktionsmenge)
  const gesamtAbweichung = monatlicheProduktion.reduce((sum, m) => sum + Math.abs(m.abweichung), 0)
  const gesamtPlan = monatlicheProduktion.reduce((sum, m) => sum + m.plan, 0)
  const forecastAccuracy = gesamtPlan > 0 
    ? Math.max(0, Math.min(100, 100 - (gesamtAbweichung / gesamtPlan) * 100))
    : 100
   
  return {
    // RELIABILITY
    planerfuellungsgrad: auswirkungen.planerfuellungsgrad,
    liefertreueChina: auswirkungen.liefertreue,
    deliveryPerformance: Math.round(deliveryPerformance * 10) / 10,
     
    // RESPONSIVENESS
    durchlaufzeitProduktion: auswirkungen.durchlaufzeit,
    lagerumschlag: auswirkungen.lagerumschlag,
    forecastAccuracy: Math.round(forecastAccuracy * 10) / 10,
     
    // AGILITY
    produktionsflexibilitaet: auswirkungen.planerfuellungsgrad, // Gleich wie Planerfüllung
    materialverfuegbarkeit: auswirkungen.materialverfuegbarkeit,
     
    // ASSETS (KEINE KOSTEN!)
    lagerreichweite, // <--- CHANGED: Now uses the calculated value from real inventory
    kapitalbindung,
     
    // PRODUKTIONS-KPIs
    gesamtproduktion: auswirkungen.produktionsmenge,
    produktionstage: auswirkungen.produktionstage,
    durchschnittProTag: auswirkungen.durchschnittProTag,
    auslastung: auswirkungen.auslastung
  }
}

// ========================================
// VISUALISIERUNGS-DATEN BERECHNUNG
// ========================================

/**
 * Berechnet die monatlichen Produktionsdaten mit Szenario-Effekten
 * für Visualisierungen (Charts)
 */
export function berechneProduktionsDatenFuerVisualisierung(
  aktiveSzenarien: SzenarioConfig[]
): MonatsProduktion[] {
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
  return berechneMonatlicheProduktion(auswirkungen.produktionsmenge)
}

/**
 * Berechnet die täglichen Produktionsdaten (365 Tage) mit Szenario-Effekten
 */
export function berechneTaeglicherDaten(
  aktiveSzenarien: SzenarioConfig[]
): { tag: number; plan: number; ist: number; abweichung: number }[] {
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
  const basisProduktion = auswirkungen.durchschnittProTag
   
  return Array.from({ length: 365 }, (_, i) => {
    // Saisonale Schwankung basierend auf Monat
    const monat = Math.floor(i / 30.4)
    const saisonalitaet = saisonalitaetData.saisonalitaetMonatlich[Math.min(monat, 11)]
    const saisonFaktor = (saisonalitaet.anteil / 8.33) // 8.33% = gleichmäßig
     
    const saisonaleProduktion = basisProduktion * saisonFaktor
    const plan = Math.round(saisonaleProduktion * 1.02)
    const ist = Math.round(saisonaleProduktion)
     
    return {
      tag: i + 1,
      plan,
      ist,
      abweichung: ist - plan
    }
  })
}

/**
 * Berechnet die wöchentlichen Auslastungsdaten (52 Wochen)
 */
export function berechneWoechentlicheAuslastung(
  aktiveSzenarien: SzenarioConfig[]
): { woche: number; auslastung: number; produktion: number }[] {
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
  const WOCHEN_PRO_JAHR = 52
  const wochenProduktion = Math.round(auswirkungen.produktionsmenge / WOCHEN_PRO_JAHR)
  const WOCHEN_PRO_MONAT = WOCHEN_PRO_JAHR / 12 // ≈ 4.33
   
  return Array.from({ length: WOCHEN_PRO_JAHR }, (_, i) => {
    // Saisonale Schwankung
    const monat = Math.floor(i / WOCHEN_PRO_MONAT)
    const saisonalitaet = saisonalitaetData.saisonalitaetMonatlich[Math.min(monat, 11)]
    const saisonFaktor = saisonalitaet.anteil / GLEICHMAESSIGER_MONATSANTEIL
     
    return {
      woche: i + 1,
      auslastung: Math.min(100, auswirkungen.auslastung * saisonFaktor * 0.95 + 10),
      produktion: Math.round(wochenProduktion * saisonFaktor)
    }
  })
}

/**
 * Berechnet die Lagerbestandsentwicklung (monatlich)
 * ERMÄSSIGUNG: Nur Sättel (keine Rahmen/Gabeln)
 */
export function berechneLagerDaten(
  aktiveSzenarien: SzenarioConfig[]
): { monat: string; saettel: number }[] {
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
   
  // <--- CHANGED: Updated to use 3-days safety stock logic instead of 2 weeks
  const basisBestand = Math.round(auswirkungen.durchschnittProTag * ZIEL_SICHERHEITSBESTAND_TAGE)
   
  // Materialverfügbarkeit beeinflusst Lagerbestand
  const verfuegbarkeitsFaktor = auswirkungen.materialverfuegbarkeit / 100
   
  return MONATSNAMEN_KURZ.map((monat, i) => {
    // Saisonale Schwankung im Lager (invers zur Produktion)
    const saisonalitaet = saisonalitaetData.saisonalitaetMonatlich[i]
    // Hohe Produktion = niedriger Lagerbestand
    const saisonFaktor = 1 - ((saisonalitaet.anteil - GLEICHMAESSIGER_MONATSANTEIL) / 100)
     
    return {
      monat,
      saettel: Math.round(basisBestand * verfuegbarkeitsFaktor * saisonFaktor)
    }
  })
}

// ========================================
// EXPORT: GESAMT-METRIKEN OBJEKT
// ========================================

export interface GesamtMetriken {
  scor: SCORMetrikenBerechnet
  auswirkungen: SzenarioAuswirkungen
  monatlicheProduktion: MonatsProduktion[]
  variantenProduktion: VariantenProduktion[]
  aktiveSzenarienAnzahl: number
  istBaseline: boolean
}

/**
 * Berechnet ALLE Metriken auf einmal
 * Hauptfunktion für konsistente Daten über alle Seiten hinweg
 * * @param aktiveSzenarien - Array von aktiven Szenario-Konfigurationen
 * @param aktuellerLagerbestand - (Optional) Wenn vorhanden, wird er für SCOR genutzt. Sonst Ziel-Bestand.
 * @returns Vollständiges Metriken-Objekt
 */
export function berechneGesamtMetriken(
    aktiveSzenarien: SzenarioConfig[],
    aktuellerLagerbestand?: number // <--- CHANGED: Added optional parameter
): GesamtMetriken {
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
  
  // <--- CHANGED: Logic to handle missing inventory (fallback to lean 3-day stock)
  // If no real stock is provided, we simulate the "perfect" lean stock (3 days)
  const kalkulatorischerBestand = aktuellerLagerbestand !== undefined 
    ? aktuellerLagerbestand 
    : (auswirkungen.durchschnittProTag * ZIEL_SICHERHEITSBESTAND_TAGE);

  const scor = berechneSCORMetriken(aktiveSzenarien, kalkulatorischerBestand) // <--- CHANGED: Passing the value
  
  const monatlicheProduktion = berechneMonatlicheProduktion(auswirkungen.produktionsmenge)
  const variantenProduktion = berechneVariantenProduktion(auswirkungen.produktionsmenge)
   
  return {
    scor,
    auswirkungen,
    monatlicheProduktion,
    variantenProduktion,
    aktiveSzenarienAnzahl: aktiveSzenarien.length,
    istBaseline: aktiveSzenarien.length === 0
  }
}

// ========================================
// DYNAMISCHE KONFIGURATION FUNKTIONEN
// ========================================

/**
 * Berechnet Szenarien-Auswirkungen mit dynamischer Konfiguration
 * @param aktiveSzenarien - Aktive Szenarien
 * @param dynamicConfig - Dynamische Konfigurationswerte
 */
export function berechneSzenarioAuswirkungenMitKonfig(
  aktiveSzenarien: SzenarioConfig[],
  dynamicConfig: DynamicConfig
): SzenarioAuswirkungen {
  const baseline = createDynamicBaseline(dynamicConfig)
   
  // Start mit dynamischen Baseline-Werten
  let produktionsmenge = baseline.jahresproduktion
  let materialverfuegbarkeit = baseline.materialverfuegbarkeit
  let liefertreue = baseline.liefertreue
  let durchlaufzeit = baseline.durchlaufzeit
  let planerfuellungsgrad = baseline.planerfuellungsgrad
  let lagerumschlag = baseline.lagerumschlag
  let auslastung = baseline.auslastung
  let produktionstage = baseline.produktionstage

  // Wende jedes aktive Szenario an
  aktiveSzenarien.forEach(szenario => {
    switch (szenario.typ) {
      case 'marketingaktion':
        const erhoehung = (szenario.parameter.erhoehungProzent || 20) / 100
        const dauerWochen = szenario.parameter.dauerWochen || 4
        const jahresEffekt = (dauerWochen / 52) * erhoehung
        produktionsmenge *= (1 + jahresEffekt)
        materialverfuegbarkeit -= erhoehung * 15
        planerfuellungsgrad -= erhoehung * 10
        auslastung = Math.min(100, auslastung + erhoehung * 20)
        break

      case 'maschinenausfall':
        const reduktion = (szenario.parameter.reduktionProzent || 60) / 100
        const dauerTage = szenario.parameter.dauerTage || 7
        const ausfallEffekt = (dauerTage / KALENDERTAGE_PRO_JAHR) * reduktion
        materialverfuegbarkeit -= reduktion * 25
        liefertreue -= reduktion * 15
        planerfuellungsgrad -= ausfallEffekt * 100
        produktionsmenge *= (1 - ausfallEffekt * 0.5)
        lagerumschlag -= reduktion * 1.5
        break

      case 'wasserschaden':
        const verlustMenge = szenario.parameter.verlustMenge || 1000
        const verlustEffekt = Math.min(WASSERSCHADEN_MAX_VERLUST_EFFEKT, verlustMenge / WASSERSCHADEN_VERLUST_DIVISOR)
        materialverfuegbarkeit -= verlustEffekt * 30
        liefertreue -= verlustEffekt * 20
        planerfuellungsgrad -= verlustEffekt * 15
        lagerumschlag -= verlustEffekt * 2
        break

      case 'schiffsverspaetung':
        const verspaetungTage = szenario.parameter.verspaetungTage || 4
        durchlaufzeit += verspaetungTage
        liefertreue -= verspaetungTage * 1.5
        materialverfuegbarkeit -= verspaetungTage * 1.2
        planerfuellungsgrad -= verspaetungTage * 0.5
        break
    }
  })

  // Stelle sicher, dass Werte in gültigen Bereichen bleiben
  materialverfuegbarkeit = Math.max(0, Math.min(100, materialverfuegbarkeit))
  liefertreue = Math.max(0, Math.min(100, liefertreue))
  planerfuellungsgrad = Math.max(0, Math.min(100, planerfuellungsgrad))
  auslastung = Math.max(0, Math.min(100, auslastung))
  lagerumschlag = Math.max(0, lagerumschlag)

  const durchschnittProTag = Math.round(produktionsmenge / produktionstage)

  return {
    produktionsmenge: Math.round(produktionsmenge),
    produktionsDelta: Math.round(produktionsmenge - baseline.jahresproduktion),
    produktionsDeltaProzent: ((produktionsmenge - baseline.jahresproduktion) / baseline.jahresproduktion) * 100,
     
    materialverfuegbarkeit: Math.round(materialverfuegbarkeit * 10) / 10,
    materialverfuegbarkeitDelta: Math.round((materialverfuegbarkeit - baseline.materialverfuegbarkeit) * 10) / 10,
     
    liefertreue: Math.round(liefertreue * 10) / 10,
    liefertreueDelta: Math.round((liefertreue - baseline.liefertreue) * 10) / 10,
     
    durchlaufzeit: Math.round(durchlaufzeit),
    durchlaufzeitDelta: Math.round(durchlaufzeit - baseline.durchlaufzeit),
     
    planerfuellungsgrad: Math.round(planerfuellungsgrad * 100) / 100,
    lagerumschlag: Math.round(lagerumschlag * 10) / 10,
    auslastung: Math.round(auslastung * 100) / 100,
     
    produktionstage,
    durchschnittProTag
  }
}

/**
 * Berechnet monatliche Produktion mit dynamischer Saisonalität
 * @param jahresproduktion - Gesamtproduktion pro Jahr
 * @param saisonalitaet - Monatliche Anteile
 */
export function berechneMonatlicheProduktionMitKonfig(
  jahresproduktion: number,
  saisonalitaet: Array<{ monat: number; anteil: number }>
): MonatsProduktion[] {
   
  return saisonalitaet.map((monat, index) => {
    const plan = Math.round(jahresproduktion * monat.anteil / 100)
    const abweichungsFaktor = 1 - (Math.sin(index * 0.8) * 0.02 + 0.01)
    const ist = Math.round(plan * abweichungsFaktor)
    
    return {
      monat: MONATSNAMEN_KURZ[index],
      monatIndex: index + 1,
      anteil: monat.anteil,
      plan,
      ist,
      abweichung: ist - plan
    }
  })
}

/**
 * Berechnet Varianten-Produktion mit dynamischer Konfiguration
 * @param jahresproduktion - Gesamtproduktion pro Jahr
 * @param varianten - Varianten mit Anteilen
 */
export function berechneVariantenProduktionMitKonfig(
  jahresproduktion: number,
  varianten: Array<{ id: string; name: string; anteilPrognose: number }>
): VariantenProduktion[] {
  return varianten.map(variante => ({
    id: variante.id,
    name: variante.name,
    prozent: Math.round(variante.anteilPrognose * 100),
    wert: Math.round(jahresproduktion * variante.anteilPrognose)
  }))
}

/**
 * Berechnet alle Metriken mit dynamischer Konfiguration
 * @param aktiveSzenarien - Aktive Szenarien
 * @param dynamicConfig - Dynamische Konfigurationswerte
 * @param aktuellerLagerbestand - (Optional)
 */
export function berechneGesamtMetrikenMitKonfig(
  aktiveSzenarien: SzenarioConfig[],
  dynamicConfig: DynamicConfig,
  aktuellerLagerbestand?: number // <--- CHANGED: Added optional parameter
): GesamtMetriken {
  const auswirkungen = berechneSzenarioAuswirkungenMitKonfig(aktiveSzenarien, dynamicConfig)
  const baseline = createDynamicBaseline(dynamicConfig)
  
  // <--- CHANGED: Logic Updated to match the "Just-In-Time" goal (3 days default if no stock provided)
  const berechneterBestand = aktuellerLagerbestand !== undefined
    ? aktuellerLagerbestand
    : (auswirkungen.durchschnittProTag * ZIEL_SICHERHEITSBESTAND_TAGE)

  const lagerreichweite = auswirkungen.durchschnittProTag > 0
    ? Math.round((berechneterBestand / auswirkungen.durchschnittProTag) * 10) / 10
    : 0
  
  // HINWEIS: Kapitalbindung = Lagerreichweite (beide messen Verweildauer im Lager)
  const kapitalbindung = lagerreichweite
   
  // NEU: Delivery Performance - % Lieferungen innerhalb der Vorlaufzeit
  const deliveryPerformance = Math.max(
    0,
    Math.min(
      100,
      auswirkungen.liefertreue * (1 - (auswirkungen.durchlaufzeit - baseline.durchlaufzeit) / DURCHLAUFZEIT_PENALTY_FAKTOR)
    )
  )
   
  // NEU: Forecast Accuracy - Genauigkeit der Planerfüllung
  const monatlicheProduktion = berechneMonatlicheProduktionMitKonfig(
    auswirkungen.produktionsmenge, 
    dynamicConfig.saisonalitaet
  )
  const gesamtAbweichung = monatlicheProduktion.reduce((sum, m) => sum + Math.abs(m.abweichung), 0)
  const gesamtPlan = monatlicheProduktion.reduce((sum, m) => sum + m.plan, 0)
  const forecastAccuracy = gesamtPlan > 0 
    ? Math.max(0, Math.min(100, 100 - (gesamtAbweichung / gesamtPlan) * 100))
    : 100

  const scor: SCORMetrikenBerechnet = {
    // RELIABILITY
    planerfuellungsgrad: auswirkungen.planerfuellungsgrad,
    liefertreueChina: auswirkungen.liefertreue,
    deliveryPerformance: Math.round(deliveryPerformance * 10) / 10,
    // RESPONSIVENESS
    durchlaufzeitProduktion: auswirkungen.durchlaufzeit,
    lagerumschlag: auswirkungen.lagerumschlag,
    forecastAccuracy: Math.round(forecastAccuracy * 10) / 10,
    // AGILITY
    produktionsflexibilitaet: auswirkungen.planerfuellungsgrad,
    materialverfuegbarkeit: auswirkungen.materialverfuegbarkeit,
    // ASSETS (KEINE KOSTEN!)
    lagerreichweite, // <--- CHANGED: Dynamic value
    kapitalbindung,
    // PRODUKTIONS-KPIs
    gesamtproduktion: auswirkungen.produktionsmenge,
    produktionstage: auswirkungen.produktionstage,
    durchschnittProTag: auswirkungen.durchschnittProTag,
    auslastung: auswirkungen.auslastung
  }
   
  const variantenProduktion = berechneVariantenProduktionMitKonfig(
    auswirkungen.produktionsmenge,
    dynamicConfig.varianten
  )
   
  return {
    scor,
    auswirkungen,
    monatlicheProduktion,
    variantenProduktion,
    aktiveSzenarienAnzahl: aktiveSzenarien.length,
    istBaseline: aktiveSzenarien.length === 0
  }
}
// ========================================
// NEUE VISUALISIERUNGS-DATEN (für Dashboards)
// ========================================

/**
 * Berechnet die zeitliche Entwicklung der SCOR-Metriken über das Jahr
 * Monatliche Daten für Trend-Visualisierungen
 */
export function berechneSCORMetrikenEntwicklung(
  aktiveSzenarien: SzenarioConfig[],
  aktuellerLagerbestand?: number
): {
  monat: string;
  monatNr: number;
  planerfuellungsgrad: number;
  liefertreue: number;
  materialverfuegbarkeit: number;
  lagerreichweite: number;
  durchlaufzeit: number;
  auslastung: number;
}[] {
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
  
  // Realistische monatliche Schwankungen basierend auf Saisonalität
  return saisonalitaetData.saisonalitaetMonatlich.map((saison, index) => {
    // Saisonalitätsfaktor (Abweichung vom Durchschnitt)
    const saisonFaktor = saison.anteil / GLEICHMAESSIGER_MONATSANTEIL // Normal = 1.0
    
    // Planerfüllungsgrad: Niedriger in Peak-Monaten (schwieriger zu erfüllen)
    // Verwendet SAISONALE_AUSWIRKUNG.PLANERFUELLUNG_FAKTOR für dokumentierte Berechnung
    const planerfuellungsgrad = Math.max(
      95,
      Math.min(100, auswirkungen.planerfuellungsgrad - (saisonFaktor - 1) * SAISONALE_AUSWIRKUNG.PLANERFUELLUNG_FAKTOR)
    )
    
    // Liefertreue: Korreliert mit Auslastung
    // Verwendet SAISONALE_AUSWIRKUNG.LIEFERTREUE_FAKTOR
    const liefertreue = Math.max(
      90,
      Math.min(100, auswirkungen.liefertreue - (saisonFaktor - 1) * SAISONALE_AUSWIRKUNG.LIEFERTREUE_FAKTOR)
    )
    
    // Materialverfügbarkeit: Invers zur Produktion (mehr Produktion = weniger Lager)
    // Verwendet SAISONALE_AUSWIRKUNG.MATERIALVERFUEGBARKEIT_FAKTOR
    const materialverfuegbarkeit = Math.max(
      85,
      Math.min(100, auswirkungen.materialverfuegbarkeit - (saisonFaktor - 1) * SAISONALE_AUSWIRKUNG.MATERIALVERFUEGBARKEIT_FAKTOR)
    )
    
    // Lagerreichweite: Niedriger in Peak-Monaten
    const basisBestand = aktuellerLagerbestand || (auswirkungen.durchschnittProTag * ZIEL_SICHERHEITSBESTAND_TAGE)
    const lagerreichweite = Math.max(
      1,
      (basisBestand / (auswirkungen.durchschnittProTag * saisonFaktor))
    )
    
    // Durchlaufzeit: Konstant (von China) mit leichten Schwankungen durch Auslastung
    // Verwendet SAISONALE_AUSWIRKUNG.DURCHLAUFZEIT_BONUS
    const durchlaufzeit = Math.round(
      auswirkungen.durchlaufzeit + (saisonFaktor > 1.2 ? (saisonFaktor - 1) * SAISONALE_AUSWIRKUNG.DURCHLAUFZEIT_BONUS : 0)
    )
    
    // Auslastung: Direkt proportional zur Saisonalität
    const auslastung = Math.min(100, auswirkungen.auslastung * saisonFaktor)
    
    return {
      monat: MONATSNAMEN_KURZ[index],
      monatNr: index + 1,
      planerfuellungsgrad: Math.round(planerfuellungsgrad * 10) / 10,
      liefertreue: Math.round(liefertreue * 10) / 10,
      materialverfuegbarkeit: Math.round(materialverfuegbarkeit * 10) / 10,
      lagerreichweite: Math.round(lagerreichweite * 10) / 10,
      durchlaufzeit,
      auslastung: Math.round(auslastung * 10) / 10
    }
  })
}

/**
 * Berechnet kumulativen Produktionsrückstand (Soll vs. Ist)
 * Für Backlog-Visualisierung
 */
export interface ProduktionsRueckstandDatapoint {
  tag: number
  datum: string
  woche: number
  monat: string
  kumulativSoll: number
  kumulativIst: number
  rueckstand: number
  rueckstandProzent: number
}

export function berechneProduktionsRueckstand(
  aktiveSzenarien: SzenarioConfig[],
  tagesDaten?: { tag: number; plan: number; ist: number }[]
): ProduktionsRueckstandDatapoint[] {
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
  
  // Verwende übergebene Daten oder generiere Standard-Daten
  const daten = tagesDaten || berechneTaeglicherDaten(aktiveSzenarien)
  
  let kumulativSoll = 0
  let kumulativIst = 0
  
  
  return daten.map((tag, index) => {
    kumulativSoll += tag.plan
    kumulativIst += tag.ist
    const rueckstand = kumulativSoll - kumulativIst
    const rueckstandProzent = kumulativSoll > 0 ? (rueckstand / kumulativSoll) * 100 : 0
    
    // Berechne Woche und Monat
    const woche = Math.floor(index / 7) + 1
    const monat = Math.floor(index / 30.4)
    
    return {
      tag: tag.tag,
      datum: `Tag ${tag.tag}`,
      woche,
      monat: MONATSNAMEN_KURZ[Math.min(monat, 11)],
      kumulativSoll,
      kumulativIst,
      rueckstand,
      rueckstandProzent: Math.round(rueckstandProzent * 100) / 100
    }
  })
}

/**
 * Berechnet die 49-Tage-Vorlaufzeit Breakdown für Visualisierung
 * Zeigt Aufteilung: Produktion → Transport → Verzollung
 */
export interface VorlaufzeitBreakdown {
  phase: string
  tage: number
  start: number
  ende: number
  farbe: string
  beschreibung: string
}

export function berechneVorlaufzeitBreakdown(
  aktiveSzenarien: SzenarioConfig[]
): VorlaufzeitBreakdown[] {
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
  const gesamtDurchlaufzeit = auswirkungen.durchlaufzeit
  
  // Transport-Sequenz aus JSON (lieferant-china.json) laden
  const transportSequenz = lieferantChinaData.lieferant.transportSequenz
  const referenzVorlaufzeit = lieferantChinaData.lieferant.gesamtVorlaufzeitTage
  
  // Bei Verzögerungen (Szenarien) wird die Seefracht verlängert
  const zusatzTage = Math.max(0, gesamtDurchlaufzeit - referenzVorlaufzeit)
  
  // Farben für die Phasen
  const FARBEN = {
    'Produktion': '#10b981', // green
    'LKW': '#f59e0b',        // amber
    'Seefracht': '#3b82f6'   // blue
  }
  
  let kumulativeStart = 0
  const ergebnis: VorlaufzeitBreakdown[] = []
  
  transportSequenz.forEach((phase, index) => {
    // Bei Seefracht werden eventuelle Verzögerungen addiert
    let tatsaechlicheDauer = phase.dauer
    if (phase.typ === 'Seefracht') {
      tatsaechlicheDauer += zusatzTage
    }
    
    ergebnis.push({
      phase: `${phase.typ}${phase.typ === 'LKW' ? ` (${phase.von} → ${phase.nach})` : ''}`,
      tage: tatsaechlicheDauer,
      start: kumulativeStart,
      ende: kumulativeStart + tatsaechlicheDauer,
      farbe: FARBEN[phase.typ as keyof typeof FARBEN] || '#6b7280',
      beschreibung: `${phase.beschreibung} (${tatsaechlicheDauer} ${phase.einheit})${
        phase.typ === 'Seefracht' && zusatzTage > 0 
          ? ` inkl. ${zusatzTage} Tage Verspätung` 
          : ''
      }`
    })
    
    kumulativeStart += tatsaechlicheDauer
  })
  
  return ergebnis
}

/**
 * Berechnet die monatliche Lagerreichweite für Trend-Visualisierung
 */
export function berechneLagerreichweiteTrend(
  aktiveSzenarien: SzenarioConfig[],
  aktuellerLagerbestand?: number
): {
  monat: string
  monatNr: number
  lagerreichweite: number
  zielWert: number
  status: 'kritisch' | 'niedrig' | 'ok' | 'optimal'
}[] {
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
  const basisBestand = aktuellerLagerbestand || (auswirkungen.durchschnittProTag * ZIEL_SICHERHEITSBESTAND_TAGE)
  
  return saisonalitaetData.saisonalitaetMonatlich.map((saison, index) => {
    const saisonFaktor = saison.anteil / GLEICHMAESSIGER_MONATSANTEIL
    const tagesbedarf = auswirkungen.durchschnittProTag * saisonFaktor
    const lagerreichweite = tagesbedarf > 0 ? basisBestand / tagesbedarf : 0
    
    // Status basierend auf Ziel-Sicherheitsbestand (3 Tage)
    let status: 'kritisch' | 'niedrig' | 'ok' | 'optimal'
    if (lagerreichweite < 2) {
      status = 'kritisch'
    } else if (lagerreichweite < ZIEL_SICHERHEITSBESTAND_TAGE) {
      status = 'niedrig'
    } else if (lagerreichweite <= 5) {
      status = 'optimal'
    } else {
      status = 'ok'
    }
    
    return {
      monat: MONATSNAMEN_KURZ[index],
      monatNr: index + 1,
      lagerreichweite: Math.round(lagerreichweite * 10) / 10,
      zielWert: ZIEL_SICHERHEITSBESTAND_TAGE,
      status
    }
  })
}
