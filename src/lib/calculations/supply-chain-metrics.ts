/**
 * ========================================
 * ZENTRALER SUPPLY CHAIN METRICS RECHNER
 * ========================================
 * 
 * SINGLE SOURCE OF TRUTH für alle Berechnungen im Tool.
 * Diese Datei berechnet alle KPIs dynamisch basierend auf:
 * - SSOT-Stammdaten (370.000 Bikes, Saisonalität, etc.)
 * - Aktive Szenarien (Marketing, Maschinenausfall, etc.)
 * 
 * Alle Seiten (Dashboard, Reporting, etc.) MÜSSEN diese
 * Berechnungen nutzen für konsistente Daten!
 * 
 * Quelle: kontext/Spezifikation_SSOT_MR.ts
 */

import { SzenarioConfig } from '@/contexts/SzenarienContext'
import saisonalitaetData from '@/data/saisonalitaet.json'
import stammdatenData from '@/data/stammdaten.json'

// ========================================
// SSOT KONSTANTEN (aus Spezifikation_SSOT_MR.ts)
// ========================================

/**
 * KRITISCH: 370.000 Bikes pro Jahr (NICHT 185.000!)
 */
export const JAHRESPRODUKTION_SSOT = 370_000

/**
 * China Vorlaufzeit: 49 Tage (7 Wochen, NICHT 56!)
 */
export const CHINA_VORLAUFZEIT_TAGE = 49

/**
 * Produktionstage: 5 Arbeitstage
 */
export const CHINA_PRODUKTIONSZEIT_TAGE = 5

/**
 * Losgröße Sättel: 500 Stück
 */
export const LOSGROESSE_SAETTEL = 500

/**
 * Arbeitstage pro Jahr (Mo-Fr ohne Feiertage)
 */
export const ARBEITSTAGE_PRO_JAHR = 252

/**
 * Kalendertage pro Jahr
 */
export const KALENDERTAGE_PRO_JAHR = 365

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
  durchlaufzeit: CHINA_VORLAUFZEIT_TAGE + 7, // 49 + 7 = 56 Tage (Vorlauf + OEM Produktion)
  planerfuellungsgrad: 99.86,
  lagerumschlag: 4.2,
  auslastung: 99.86
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
 * @param jahresproduktion - Gesamtproduktion pro Jahr
 * @returns Array mit 12 Monatsproduktionen
 */
export function berechneMonatlicheProduktion(jahresproduktion: number): MonatsProduktion[] {
  const monatsnamen = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  
  return saisonalitaetData.saisonalitaetMonatlich.map((monat, index) => {
    const plan = Math.round(jahresproduktion * monat.anteil / 100)
    // Ist-Wert mit leichter natürlicher Abweichung (ca. 1-2%)
    const abweichungsFaktor = 1 - (Math.sin(index * 0.8) * 0.02 + 0.01)
    const ist = Math.round(plan * abweichungsFaktor)
    
    return {
      monat: monatsnamen[index],
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
 * @param jahresproduktion - Gesamtproduktion pro Jahr
 * @returns Array mit 8 Variantenproduktionen
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
 * 
 * @param aktiveSzenarien - Array von aktiven Szenario-Konfigurationen
 * @returns Berechnete Auswirkungen auf alle Metriken
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
        const ausfallEffekt = (dauerTage / 365) * reduktion
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
        const verlustEffekt = Math.min(0.3, verlustMenge / 10000)
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
  
  // RESPONSIVENESS (Reaktionsfähigkeit)
  durchlaufzeitProduktion: number
  lagerumschlag: number
  
  // AGILITY (Flexibilität)
  produktionsflexibilitaet: number
  materialverfuegbarkeit: number
  
  // COSTS (Kosten)
  gesamtkosten: number
  herstellkosten: number
  lagerkosten: number
  beschaffungskosten: number
  
  // ASSETS (Vermögenswerte)
  lagerbestandswert: number
  kapitalbindung: number
  
  // PRODUKTIONS-KPIs
  gesamtproduktion: number
  produktionstage: number
  durchschnittProTag: number
  auslastung: number
}

/**
 * Berechnet alle SCOR-Metriken basierend auf aktiven Szenarien
 * 
 * @param aktiveSzenarien - Array von aktiven Szenario-Konfigurationen
 * @returns Vollständige SCOR-Metriken
 */
export function berechneSCORMetriken(aktiveSzenarien: SzenarioConfig[]): SCORMetrikenBerechnet {
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
  
  // Berechne Kosten basierend auf Produktion
  // Pro Bike: ca. 1.000 € Herstellkosten (aus stammdaten.json)
  const herstellkosten = auswirkungen.produktionsmenge * 1000
  
  // Beschaffungskosten: ca. 50€ pro Sattel * Anzahl Sättel
  // 1 Sattel pro Bike
  const beschaffungskosten = auswirkungen.produktionsmenge * 50
  
  // Lagerkosten: 10% des durchschnittlichen Lagerwertes
  // Durchschnittlicher Lagerbestand: ca. 2 Wochen Produktion
  const durchschnittlicherLagerbestand = Math.round(auswirkungen.produktionsmenge / 26) // 2 Wochen
  const lagerbestandswert = durchschnittlicherLagerbestand * 150 // 150€ pro Sattel-Set
  const lagerkosten = Math.round(lagerbestandswert * 0.1) // 10% Lagerkostensatz
  
  const gesamtkosten = herstellkosten + beschaffungskosten + lagerkosten
  
  // Kapitalbindung: Durchschnittliche Lagerdauer
  const kapitalbindung = Math.round((durchschnittlicherLagerbestand / auswirkungen.durchschnittProTag) * 10) / 10
  
  return {
    // RELIABILITY
    planerfuellungsgrad: auswirkungen.planerfuellungsgrad,
    liefertreueChina: auswirkungen.liefertreue,
    
    // RESPONSIVENESS
    durchlaufzeitProduktion: auswirkungen.durchlaufzeit,
    lagerumschlag: auswirkungen.lagerumschlag,
    
    // AGILITY
    produktionsflexibilitaet: auswirkungen.planerfuellungsgrad, // Gleich wie Planerfüllung
    materialverfuegbarkeit: auswirkungen.materialverfuegbarkeit,
    
    // COSTS
    gesamtkosten,
    herstellkosten,
    lagerkosten,
    beschaffungskosten,
    
    // ASSETS
    lagerbestandswert,
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
  const wochenProduktion = Math.round(auswirkungen.produktionsmenge / 52)
  
  return Array.from({ length: 52 }, (_, i) => {
    // Saisonale Schwankung
    const monat = Math.floor(i / 4.33)
    const saisonalitaet = saisonalitaetData.saisonalitaetMonatlich[Math.min(monat, 11)]
    const saisonFaktor = saisonalitaet.anteil / 8.33
    
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
  const monatsnamen = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  
  // Basisbestand: ca. 2 Wochen Produktion
  const basisBestand = Math.round(auswirkungen.produktionsmenge / 26)
  
  // Materialverfügbarkeit beeinflusst Lagerbestand
  const verfuegbarkeitsFaktor = auswirkungen.materialverfuegbarkeit / 100
  
  return monatsnamen.map((monat, i) => {
    // Saisonale Schwankung im Lager (invers zur Produktion)
    const saisonalitaet = saisonalitaetData.saisonalitaetMonatlich[i]
    // Hohe Produktion = niedriger Lagerbestand
    const saisonFaktor = 1 - ((saisonalitaet.anteil - 8.33) / 100)
    
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
 * 
 * @param aktiveSzenarien - Array von aktiven Szenario-Konfigurationen
 * @returns Vollständiges Metriken-Objekt
 */
export function berechneGesamtMetriken(aktiveSzenarien: SzenarioConfig[]): GesamtMetriken {
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
  const scor = berechneSCORMetriken(aktiveSzenarien)
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
