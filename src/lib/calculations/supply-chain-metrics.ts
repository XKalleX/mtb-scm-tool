/**
 * ========================================
 * ZENTRALER SUPPLY CHAIN METRICS RECHNER
 * ========================================
 * 
 * SINGLE SOURCE OF TRUTH für alle Berechnungen im Tool.
 * Diese Datei berechnet alle KPIs dynamisch basierend auf:
 * - Konfigurationswerte (Jahresproduktion, Saisonalität, etc.)
 * - Aktive Szenarien (Marketing, Maschinenausfall, etc.)
 * 
 * Alle Seiten (Dashboard, Reporting, etc.) MÜSSEN diese
 * Berechnungen nutzen für konsistente Daten!
 * 
 * Quelle: kontext/Spezifikation_SSOT_MR.ts
 * 
 * NEU: Unterstützt dynamische Konfiguration aus KonfigurationContext
 */

import { SzenarioConfig } from '@/contexts/SzenarienContext'
import saisonalitaetData from '@/data/saisonalitaet.json'
import stammdatenData from '@/data/stammdaten.json'

// ========================================
// SSOT KONSTANTEN (Standard-Werte, können überschrieben werden)
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

/**
 * Durchschnittliche Tage pro Monat
 */
export const DURCHSCHNITT_TAGE_PRO_MONAT = 30.4

/**
 * Gleichmäßiger monatlicher Anteil in Prozent (100% / 12 Monate)
 */
export const GLEICHMAESSIGER_MONATSANTEIL = 100 / 12 // ≈ 8.33%

/**
 * Wasserschaden: Maximaler relativer Verlusteffekt
 */
export const WASSERSCHADEN_MAX_VERLUST_EFFEKT = 0.3

/**
 * Wasserschaden: Divisor für relative Verlustberechnung
 */
export const WASSERSCHADEN_VERLUST_DIVISOR = 10000

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
  durchlaufzeit: CHINA_VORLAUFZEIT_TAGE + 7, // 49 + 7 = 56 Tage (Vorlauf + OEM Produktion)
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
    durchlaufzeit: CHINA_VORLAUFZEIT_TAGE + 7,
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
 * 
 * Verwendet saisonalitaetData.saisonalitaetMonatlich mit Struktur:
 * - monat: 1-12 (Monatsnummer)
 * - anteil: Prozentanteil der Jahresproduktion (Summe muss 100% ergeben)
 * - name: Monatsname (z.B. "Januar")
 * 
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
  
  // RESPONSIVENESS (Reaktionsfähigkeit)
  durchlaufzeitProduktion: number
  lagerumschlag: number
  
  // AGILITY (Flexibilität)
  produktionsflexibilitaet: number
  materialverfuegbarkeit: number
  
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
  
  // Lagerbestandswert berechnen für ASSETS Kategorie
  // Durchschnittlicher Lagerbestand: ca. 2 Wochen Produktion (52 Wochen / 2 = 26)
  const WOCHEN_PRO_JAHR = 52
  const LAGERBESTAND_WOCHEN = 2
  const WERT_PRO_SATTEL_SET = 150 // EUR
  const durchschnittlicherLagerbestand = Math.round(auswirkungen.produktionsmenge / (WOCHEN_PRO_JAHR / LAGERBESTAND_WOCHEN))
  const lagerbestandswert = durchschnittlicherLagerbestand * WERT_PRO_SATTEL_SET
  
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
  const monatsnamen = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  
  // Basisbestand: ca. 2 Wochen Produktion (52 Wochen / 2 = 26)
  const WOCHEN_PRO_JAHR = 52
  const LAGERBESTAND_WOCHEN = 2
  const basisBestand = Math.round(auswirkungen.produktionsmenge / (WOCHEN_PRO_JAHR / LAGERBESTAND_WOCHEN))
  
  // Materialverfügbarkeit beeinflusst Lagerbestand
  const verfuegbarkeitsFaktor = auswirkungen.materialverfuegbarkeit / 100
  
  return monatsnamen.map((monat, i) => {
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
  const monatsnamen = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  
  return saisonalitaet.map((monat, index) => {
    const plan = Math.round(jahresproduktion * monat.anteil / 100)
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
 */
export function berechneGesamtMetrikenMitKonfig(
  aktiveSzenarien: SzenarioConfig[],
  dynamicConfig: DynamicConfig
): GesamtMetriken {
  const auswirkungen = berechneSzenarioAuswirkungenMitKonfig(aktiveSzenarien, dynamicConfig)
  
  // Berechne SCOR-Metriken basierend auf den Auswirkungen (ohne Kosten)
  const WOCHEN_PRO_JAHR = 52
  const LAGERBESTAND_WOCHEN = 2
  const WERT_PRO_SATTEL_SET = 150 // EUR
  const durchschnittlicherLagerbestand = Math.round(auswirkungen.produktionsmenge / (WOCHEN_PRO_JAHR / LAGERBESTAND_WOCHEN))
  const lagerbestandswert = durchschnittlicherLagerbestand * WERT_PRO_SATTEL_SET
  const kapitalbindung = Math.round((durchschnittlicherLagerbestand / auswirkungen.durchschnittProTag) * 10) / 10

  const scor: SCORMetrikenBerechnet = {
    planerfuellungsgrad: auswirkungen.planerfuellungsgrad,
    liefertreueChina: auswirkungen.liefertreue,
    durchlaufzeitProduktion: auswirkungen.durchlaufzeit,
    lagerumschlag: auswirkungen.lagerumschlag,
    produktionsflexibilitaet: auswirkungen.planerfuellungsgrad,
    materialverfuegbarkeit: auswirkungen.materialverfuegbarkeit,
    lagerbestandswert,
    kapitalbindung,
    gesamtproduktion: auswirkungen.produktionsmenge,
    produktionstage: auswirkungen.produktionstage,
    durchschnittProTag: auswirkungen.durchschnittProTag,
    auslastung: auswirkungen.auslastung
  }
  
  const monatlicheProduktion = berechneMonatlicheProduktionMitKonfig(
    auswirkungen.produktionsmenge, 
    dynamicConfig.saisonalitaet
  )
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
