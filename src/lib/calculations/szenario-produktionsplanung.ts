/**
 * ========================================
 * SZENARIO-AWARE PRODUKTIONSPLANUNG
 * ========================================
 * 
 * Erweitert die zentrale Produktionsplanung um Szenario-Unterstützung.
 * Berechnet Baseline UND Szenario-Werte parallel, um Deltas zu visualisieren.
 * 
 * KONZEPT:
 * - Baseline: Normale Berechnung ohne Szenarien
 * - Szenario: Berechnung mit aktiven Szenarien
 * - Delta: Differenz zwischen Szenario und Baseline (+ oder -)
 * 
 * WICHTIG: Diese Funktionen werden von ALLEN Seiten genutzt für konsistente
 * Szenario-Auswirkungen auf alle Berechnungen!
 */

import type { KonfigurationData } from '@/contexts/KonfigurationContext'
import type { SzenarioConfig } from '@/contexts/SzenarienContext'
import {
  TagesProduktionEntry,
  VariantenProduktionsplan,
  LagerbestandInfo,
  generiereTagesproduktion,
  generiereVariantenProduktionsplan,
  generiereAlleVariantenProduktionsplaene,
  berechneLagerbestaende,
  berechneProduktionsStatistiken,
  berechneTagesLagerbestaende,
  berechneSaisonaleVerteilung
} from './zentrale-produktionsplanung'

// ========================================
// KONSTANTEN FÜR SZENARIO-BERECHNUNGEN
// ========================================

/**
 * Faktor für Materialverfügbarkeits-Impact pro Tag Schiffsverspätung
 * Beispiel: 4 Tage Verspätung * 0.012 = 4.8% weniger Materialverfügbarkeit
 * Begründung: Ca. 1.2% pro Tag basierend auf 30 Tage Schifffahrt-Vorlaufzeit
 */
const SHIP_DELAY_MATERIAL_IMPACT_FACTOR = 0.012

/**
 * Produktionsrate bei Maschinenausfall (30% = 70% Ausfall)
 * Begründung: Bei schwerem Ausfall wird nur mit manuellen/Backup-Prozessen produziert
 */
const MACHINE_FAILURE_PRODUCTION_RATE = 0.3

/**
 * Produktionsrate bei Materialmangel (85% = 15% Reduktion)
 * Begründung: Teilproduktion möglich, aber nicht alle Varianten vollständig lieferbar
 */
const MATERIAL_SHORTAGE_PRODUCTION_RATE = 0.85

// ========================================
// TYPEN FÜR SZENARIO-BERECHNUNGEN
// ========================================

/**
 * Szenario-Modifikator: Ändert die Konfiguration basierend auf aktiven Szenarien
 */
export interface SzenarioModifikation {
  // Produktions-Modifikatoren
  produktionsFaktor: number        // Multiplikator für Produktion (1.0 = unverändert)
  produktionsAusfallTage: number[] // Liste von Tagen (1-365) ohne Produktion
  
  // Material-Modifikatoren
  materialverfuegbarkeitFaktor: number  // Faktor für Materialverfügbarkeit
  materialVerlust: number               // Absolute Menge verlorener Teile
  
  // Lieferzeit-Modifikatoren
  vorlaufzeitAenderung: number     // Zusätzliche Tage Vorlaufzeit
  
  // Szenario-Metadaten für Anzeige
  aktiveSzenarioTypen: string[]
  beschreibung: string
}

/**
 * Erweiterter Tagesproduktionseintrag mit Szenario-Deltas
 */
export interface TagesProduktionMitDelta extends TagesProduktionEntry {
  // Baseline-Werte (ohne Szenarien)
  baselinePlanMenge: number
  baselineIstMenge: number
  
  // Delta-Werte (Szenario - Baseline)
  deltaPlanMenge: number    // +/- Bikes gegenüber Baseline
  deltaIstMenge: number     // +/- Bikes gegenüber Baseline
  
  // Szenario-spezifisch
  istVonSzenarioBetroffen: boolean
  szenarioTyp?: string      // Welches Szenario betrifft diesen Tag
  szenarioNotiz?: string    // Erklärung der Auswirkung
}

/**
 * Erweiterter Lagerbestand mit Szenario-Deltas
 */
export interface LagerbestandMitDelta extends LagerbestandInfo {
  // Baseline-Werte
  baselineBestand: number
  baselineSicherheit: number
  baselineReichweite: number
  
  // Delta-Werte
  deltaBestand: number
  deltaReichweite: number
  
  // Status-Vergleich
  baselineStatus: 'ok' | 'niedrig' | 'kritisch'
  statusVerschlechtert: boolean
}

/**
 * Produktionsstatistiken mit Szenario-Vergleich
 */
export interface ProduktionsStatistikMitDelta {
  // Aktuelle Werte (mit Szenarien)
  geplant: number
  produziert: number
  abweichung: number
  planerfuellungsgrad: number
  arbeitstage: number
  schichtenGesamt: number
  mitMaterialmangel: number
  auslastung: number
  
  // Baseline-Werte (ohne Szenarien)
  baselineGeplant: number
  baselineProduziert: number
  baselinePlanerfuellungsgrad: number
  baselineMitMaterialmangel: number
  baselineAuslastung: number
  
  // Delta-Werte
  deltaGeplant: number
  deltaProduziert: number
  deltaPlanerfuellungsgrad: number
  deltaMitMaterialmangel: number
  deltaAuslastung: number
}

// ========================================
// SZENARIO-MODIFIKATION BERECHNUNG
// ========================================

/**
 * Berechnet die Modifikatoren basierend auf aktiven Szenarien
 * 
 * @param szenarien - Array von aktiven Szenarien
 * @param planungsjahr - Jahr für Datumsberechnungen
 * @returns SzenarioModifikation mit allen Faktoren
 */
export function berechneSzenarioModifikation(
  szenarien: SzenarioConfig[],
  planungsjahr: number = 2027
): SzenarioModifikation {
  const aktiveSzenarien = szenarien.filter(s => s.aktiv)
  
  // Start mit neutralen Werten
  let produktionsFaktor = 1.0
  const produktionsAusfallTage: number[] = []
  let materialverfuegbarkeitFaktor = 1.0
  let materialVerlust = 0
  let vorlaufzeitAenderung = 0
  const aktiveSzenarioTypen: string[] = []
  const beschreibungen: string[] = []
  
  aktiveSzenarien.forEach(szenario => {
    aktiveSzenarioTypen.push(szenario.typ)
    
    switch (szenario.typ) {
      case 'marketingaktion': {
        // Marketingaktion erhöht die Nachfrage
        const erhoehung = (szenario.parameter.erhoehungProzent || 20) / 100
        const dauerWochen = szenario.parameter.dauerWochen || 4
        const startKW = szenario.parameter.startKW || 28
        
        // Berechne betroffene Tage (KW → Tage)
        const startTag = (startKW - 1) * 7 + 1
        const endTag = startTag + dauerWochen * 7 - 1
        
        // Produktionsfaktor nur für die Dauer der Kampagne
        // Vereinfacht: Jahreseffekt berechnen
        const jahresEffekt = (dauerWochen / 52) * erhoehung
        produktionsFaktor *= (1 + jahresEffekt)
        
        beschreibungen.push(`Marketing: +${szenario.parameter.erhoehungProzent}% für ${dauerWochen} Wochen (KW ${startKW})`)
        break
      }
      
      case 'maschinenausfall': {
        // Maschinenausfall reduziert Produktion in China
        const reduktion = (szenario.parameter.reduktionProzent || 60) / 100
        const dauerTage = szenario.parameter.dauerTage || 7
        const startDatum = szenario.parameter.startDatum ? new Date(szenario.parameter.startDatum) : new Date(planungsjahr, 2, 15)
        
        // Berechne betroffene Tage
        const startTag = Math.floor((startDatum.getTime() - new Date(planungsjahr, 0, 1).getTime()) / (24 * 60 * 60 * 1000)) + 1
        for (let i = 0; i < dauerTage; i++) {
          const tag = startTag + i
          if (tag >= 1 && tag <= 365 && !produktionsAusfallTage.includes(tag)) {
            produktionsAusfallTage.push(tag)
          }
        }
        
        // Material wird knapper
        materialverfuegbarkeitFaktor *= (1 - reduktion * 0.25)
        
        // Leichte Gesamtproduktionsreduktion
        const ausfallEffekt = (dauerTage / 365) * reduktion * 0.5
        produktionsFaktor *= (1 - ausfallEffekt)
        
        beschreibungen.push(`Maschinenausfall: -${szenario.parameter.reduktionProzent}% für ${dauerTage} Tage`)
        break
      }
      
      case 'wasserschaden': {
        // Wasserschaden = Materialverlust
        const verlustMenge = szenario.parameter.verlustMenge || 1000
        materialVerlust += verlustMenge
        
        // Effekt auf Materialverfügbarkeit (relativ zum Jahresbedarf)
        const verlustEffekt = Math.min(0.3, verlustMenge / 10000)
        materialverfuegbarkeitFaktor *= (1 - verlustEffekt)
        
        beschreibungen.push(`Wasserschaden: ${verlustMenge} Teile verloren`)
        break
      }
      
      case 'schiffsverspaetung': {
        // Schiffsverspätung verlängert Vorlaufzeit
        const verspaetungTage = szenario.parameter.verspaetungTage || 4
        vorlaufzeitAenderung += verspaetungTage
        
        // Materialverfügbarkeit sinkt temporär (ca. 1.2% pro Verspätungstag)
        materialverfuegbarkeitFaktor *= (1 - verspaetungTage * SHIP_DELAY_MATERIAL_IMPACT_FACTOR)
        
        beschreibungen.push(`Schiffsverspätung: +${verspaetungTage} Tage Vorlaufzeit`)
        break
      }
    }
  })
  
  // Sicherstellen dass Werte in gültigen Bereichen bleiben
  materialverfuegbarkeitFaktor = Math.max(0.5, Math.min(1.0, materialverfuegbarkeitFaktor))
  produktionsFaktor = Math.max(0.7, Math.min(1.5, produktionsFaktor))
  
  return {
    produktionsFaktor,
    produktionsAusfallTage,
    materialverfuegbarkeitFaktor,
    materialVerlust,
    vorlaufzeitAenderung,
    aktiveSzenarioTypen,
    beschreibung: beschreibungen.join(' | ') || 'Keine Szenarien aktiv'
  }
}

// ========================================
// SZENARIO-AWARE PRODUKTIONSPLANUNG
// ========================================

/**
 * Generiert Tagesproduktion MIT Szenario-Deltas
 * 
 * Berechnet parallel:
 * 1. Baseline (normale Produktion ohne Szenarien)
 * 2. Szenario (modifizierte Produktion mit Szenarien)
 * 3. Delta (Differenz für Visualisierung)
 * 
 * @param konfiguration - KonfigurationData aus Context
 * @param szenarien - Aktive Szenarien
 * @returns Array mit 365 Tagen inkl. Delta-Informationen
 */
export function generiereTagesproduktionMitSzenarien(
  konfiguration: KonfigurationData,
  szenarien: SzenarioConfig[]
): TagesProduktionMitDelta[] {
  // Berechne Baseline (ohne Szenarien)
  const baseline = generiereTagesproduktion(konfiguration)
  
  // Wenn keine aktiven Szenarien, gib Baseline mit Delta 0 zurück
  const aktiveSzenarien = szenarien.filter(s => s.aktiv)
  if (aktiveSzenarien.length === 0) {
    return baseline.map(tag => ({
      ...tag,
      baselinePlanMenge: tag.planMenge,
      baselineIstMenge: tag.istMenge,
      deltaPlanMenge: 0,
      deltaIstMenge: 0,
      istVonSzenarioBetroffen: false
    }))
  }
  
  // Berechne Szenario-Modifikationen
  const modifikation = berechneSzenarioModifikation(aktiveSzenarien, konfiguration.planungsjahr)
  
  // Erstelle modifizierte Konfiguration
  const szenarioKonfiguration: KonfigurationData = {
    ...konfiguration,
    // Produktionsfaktor anwenden (für Marketing-Erhöhung)
    jahresproduktion: Math.round(konfiguration.jahresproduktion * modifikation.produktionsFaktor)
  }
  
  // Berechne Szenario-Produktion
  const szenarioPlan = generiereTagesproduktion(szenarioKonfiguration)
  
  // Kombiniere Baseline und Szenario mit Delta
  const result: TagesProduktionMitDelta[] = []
  
  for (let i = 0; i < 365; i++) {
    const baselineTag = baseline[i]
    const szenarioTag = szenarioPlan[i]
    const tagNummer = i + 1
    
    // Prüfe ob Tag von Ausfall betroffen ist
    const istAusfallTag = modifikation.produktionsAusfallTage.includes(tagNummer)
    
    // Modifiziere Ist-Menge bei Ausfall
    let modifizierteIstMenge = szenarioTag.istMenge
    let szenarioTyp: string | undefined
    let szenarioNotiz: string | undefined
    
    if (istAusfallTag && szenarioTag.istArbeitstag) {
      // Produktionsausfall: Reduziere Ist-Menge drastisch (70% Ausfall)
      modifizierteIstMenge = Math.round(szenarioTag.istMenge * MACHINE_FAILURE_PRODUCTION_RATE)
      szenarioTyp = 'maschinenausfall'
      szenarioNotiz = 'Produktionsausfall China'
    }
    
    // Materialverfügbarkeit beeinflussen (deterministisch basierend auf Tagesnummer)
    // Verwendet den Materialverfügbarkeitsfaktor zusammen mit einer deterministischen Schwelle
    const materialSchwelle = 0.1 + (tagNummer % 10) / 10 // Wert zwischen 0.1 und 1.0 basierend auf Tag
    const materialOk = szenarioTag.materialVerfuegbar && 
                       materialSchwelle < modifikation.materialverfuegbarkeitFaktor
    
    if (!materialOk && szenarioTag.istArbeitstag && !istAusfallTag) {
      // Reduzierte Produktion wegen Materialmangel (15% Reduktion)
      modifizierteIstMenge = Math.round(szenarioTag.istMenge * MATERIAL_SHORTAGE_PRODUCTION_RATE)
      szenarioTyp = szenarioTyp || 'materialmangel'
      szenarioNotiz = szenarioNotiz || 'Reduzierte Materialverfügbarkeit'
    }
    
    const deltaPlan = szenarioTag.planMenge - baselineTag.planMenge
    const deltaIst = modifizierteIstMenge - baselineTag.istMenge
    
    result.push({
      // Basis-Daten vom Szenario-Plan
      ...szenarioTag,
      istMenge: modifizierteIstMenge,
      abweichung: modifizierteIstMenge - szenarioTag.planMenge,
      materialVerfuegbar: materialOk,
      
      // Baseline-Referenz
      baselinePlanMenge: baselineTag.planMenge,
      baselineIstMenge: baselineTag.istMenge,
      
      // Deltas
      deltaPlanMenge: deltaPlan,
      deltaIstMenge: deltaIst,
      
      // Szenario-Info
      istVonSzenarioBetroffen: deltaPlan !== 0 || deltaIst !== 0 || istAusfallTag,
      szenarioTyp,
      szenarioNotiz
    })
  }
  
  // Kumulative Werte neu berechnen
  let kumulativPlan = 0
  let kumulativIst = 0
  result.forEach(tag => {
    kumulativPlan += tag.planMenge
    kumulativIst += tag.istMenge
    tag.kumulativPlan = kumulativPlan
    tag.kumulativIst = kumulativIst
  })
  
  return result
}

/**
 * Generiert alle Varianten-Produktionspläne MIT Szenario-Unterstützung
 */
export function generiereAlleVariantenMitSzenarien(
  konfiguration: KonfigurationData,
  szenarien: SzenarioConfig[]
): Record<string, VariantenProduktionsplan & { tage: TagesProduktionMitDelta[] }> {
  const aktiveSzenarien = szenarien.filter(s => s.aktiv)
  const modifikation = berechneSzenarioModifikation(aktiveSzenarien, konfiguration.planungsjahr)
  
  const result: Record<string, VariantenProduktionsplan & { tage: TagesProduktionMitDelta[] }> = {}
  
  konfiguration.varianten.forEach(variante => {
    const jahresProduktion = Math.round(
      konfiguration.jahresproduktion * variante.anteilPrognose * modifikation.produktionsFaktor
    )
    
    // Baseline-Jahresproduktion
    const baselineJahresProduktion = Math.round(
      konfiguration.jahresproduktion * variante.anteilPrognose
    )
    
    // Erstelle Varianten-Konfiguration
    const varianteKonfiguration: KonfigurationData = {
      ...konfiguration,
      jahresproduktion: jahresProduktion
    }
    
    const baselineKonfiguration: KonfigurationData = {
      ...konfiguration,
      jahresproduktion: baselineJahresProduktion
    }
    
    // Generiere Pläne
    const szenarioTage = generiereTagesproduktionMitSzenarien(varianteKonfiguration, szenarien)
    const baselineTage = generiereTagesproduktion(baselineKonfiguration)
    
    // Füge Baseline-Referenz hinzu
    const tage: TagesProduktionMitDelta[] = szenarioTage.map((tag, i) => ({
      ...tag,
      baselinePlanMenge: baselineTage[i].planMenge,
      baselineIstMenge: baselineTage[i].istMenge,
      deltaPlanMenge: tag.planMenge - baselineTage[i].planMenge,
      deltaIstMenge: tag.istMenge - baselineTage[i].istMenge,
      istVonSzenarioBetroffen: tag.planMenge !== baselineTage[i].planMenge || 
                               tag.istMenge !== baselineTage[i].istMenge
    }))
    
    const jahresProduktionIst = tage.reduce((sum, t) => sum + t.istMenge, 0)
    
    result[variante.id] = {
      varianteId: variante.id,
      varianteName: variante.name,
      jahresProduktion,
      jahresProduktionIst,
      abweichung: jahresProduktionIst - jahresProduktion,
      tage
    }
  })
  
  return result
}

// ========================================
// LAGERBESTÄNDE MIT SZENARIEN
// ========================================

/**
 * Berechnet Lagerbestände MIT Szenario-Deltas
 */
export function berechneLagerbestaendeMitSzenarien(
  konfiguration: KonfigurationData,
  szenarien: SzenarioConfig[]
): LagerbestandMitDelta[] {
  // Baseline-Berechnung
  const baseline = berechneLagerbestaende(konfiguration)
  
  // Wenn keine Szenarien, Baseline mit Delta 0 zurückgeben
  const aktiveSzenarien = szenarien.filter(s => s.aktiv)
  if (aktiveSzenarien.length === 0) {
    return baseline.map(lager => ({
      ...lager,
      baselineBestand: lager.bestand,
      baselineSicherheit: lager.sicherheit,
      baselineReichweite: lager.bedarf > 0 ? (lager.bestand - lager.sicherheit) / lager.bedarf : 999,
      deltaBestand: 0,
      deltaReichweite: 0,
      baselineStatus: lager.status,
      statusVerschlechtert: false
    }))
  }
  
  // Szenario-Modifikation
  const modifikation = berechneSzenarioModifikation(aktiveSzenarien, konfiguration.planungsjahr)
  
  // Berechne Szenario-Lagerbestände (mit Guard gegen Division durch 0)
  const result: LagerbestandMitDelta[] = baseline.map(baselineLager => {
    // Bestand reduziert durch Materialverlust und Verfügbarkeitsfaktor
    // Guard: baseline.length > 0 ist garantiert (sonst wäre map leer), aber expliziter Schutz
    const verlustAnteil = baseline.length > 0 
      ? modifikation.materialVerlust / (konfiguration.jahresproduktion / baseline.length)
      : 0
    const szenarioBestand = Math.max(
      0, 
      Math.round(baselineLager.bestand * modifikation.materialverfuegbarkeitFaktor - verlustAnteil * baselineLager.bestand)
    )
    
    const szenarioReichweite = baselineLager.bedarf > 0 
      ? (szenarioBestand - baselineLager.sicherheit) / baselineLager.bedarf 
      : 999
    
    const baselineReichweite = baselineLager.bedarf > 0 
      ? (baselineLager.bestand - baselineLager.sicherheit) / baselineLager.bedarf 
      : 999
    
    // Status bestimmen
    let szenarioStatus: 'ok' | 'niedrig' | 'kritisch' = 'ok'
    if (szenarioBestand < baselineLager.sicherheit) {
      szenarioStatus = 'kritisch'
    } else if (szenarioReichweite < 14) {
      szenarioStatus = 'niedrig'
    }
    
    return {
      ...baselineLager,
      bestand: szenarioBestand,
      status: szenarioStatus,
      baselineBestand: baselineLager.bestand,
      baselineSicherheit: baselineLager.sicherheit,
      baselineReichweite,
      deltaBestand: szenarioBestand - baselineLager.bestand,
      deltaReichweite: szenarioReichweite - baselineReichweite,
      baselineStatus: baselineLager.status,
      statusVerschlechtert: szenarioStatus !== baselineLager.status && 
                           (szenarioStatus === 'kritisch' || 
                            (szenarioStatus === 'niedrig' && baselineLager.status === 'ok'))
    }
  })
  
  return result
}

// ========================================
// STATISTIKEN MIT SZENARIEN
// ========================================

/**
 * Berechnet Produktionsstatistiken MIT Szenario-Vergleich
 */
export function berechneStatistikenMitSzenarien(
  tagesProduktionMitDelta: TagesProduktionMitDelta[]
): ProduktionsStatistikMitDelta {
  // Aktuelle Statistik (mit Szenarien)
  const geplant = tagesProduktionMitDelta.reduce((sum, tag) => sum + tag.planMenge, 0)
  const produziert = tagesProduktionMitDelta.reduce((sum, tag) => sum + tag.istMenge, 0)
  const arbeitstage = tagesProduktionMitDelta.filter(tag => tag.istArbeitstag).length
  const schichtenGesamt = tagesProduktionMitDelta.reduce((sum, tag) => sum + tag.schichten, 0)
  const mitMaterialmangel = tagesProduktionMitDelta.filter(tag => !tag.materialVerfuegbar && tag.istArbeitstag).length
  
  const planerfuellungsgrad = geplant > 0 ? (produziert / geplant) * 100 : 0
  const auslastungsDurchschnitt = arbeitstage > 0
    ? tagesProduktionMitDelta
        .filter(tag => tag.istArbeitstag)
        .reduce((sum, tag) => sum + tag.auslastung, 0) / arbeitstage
    : 0
  
  // Baseline-Statistik
  const baselineGeplant = tagesProduktionMitDelta.reduce((sum, tag) => sum + tag.baselinePlanMenge, 0)
  const baselineProduziert = tagesProduktionMitDelta.reduce((sum, tag) => sum + tag.baselineIstMenge, 0)
  const baselinePlanerfuellungsgrad = baselineGeplant > 0 ? (baselineProduziert / baselineGeplant) * 100 : 0
  
  // Baseline hat keine Materialmangel (perfekte Ausführung)
  const baselineMitMaterialmangel = 0
  const baselineAuslastung = auslastungsDurchschnitt // Gleich, da Kapazität gleich
  
  return {
    // Aktuelle Werte
    geplant,
    produziert,
    abweichung: produziert - geplant,
    planerfuellungsgrad: Math.round(planerfuellungsgrad * 100) / 100,
    arbeitstage,
    schichtenGesamt,
    mitMaterialmangel,
    auslastung: Math.round(auslastungsDurchschnitt * 10) / 10,
    
    // Baseline-Werte
    baselineGeplant,
    baselineProduziert,
    baselinePlanerfuellungsgrad: Math.round(baselinePlanerfuellungsgrad * 100) / 100,
    baselineMitMaterialmangel,
    baselineAuslastung: Math.round(baselineAuslastung * 10) / 10,
    
    // Delta-Werte
    deltaGeplant: geplant - baselineGeplant,
    deltaProduziert: produziert - baselineProduziert,
    deltaPlanerfuellungsgrad: Math.round((planerfuellungsgrad - baselinePlanerfuellungsgrad) * 100) / 100,
    deltaMitMaterialmangel: mitMaterialmangel - baselineMitMaterialmangel,
    deltaAuslastung: Math.round((auslastungsDurchschnitt - baselineAuslastung) * 10) / 10
  }
}

// ========================================
// HELPER: DELTA FORMATIERUNG
// ========================================

/**
 * Formatiert einen Delta-Wert für Anzeige (+X / -X)
 */
export function formatDelta(delta: number, decimals: number = 0): string {
  if (delta === 0) return '±0'
  const sign = delta > 0 ? '+' : ''
  const value = decimals > 0 ? delta.toFixed(decimals) : Math.round(delta).toString()
  return `${sign}${value}`
}

/**
 * Bestimmt CSS-Klasse für Delta-Anzeige
 */
export function getDeltaColorClass(delta: number, inverseLogic: boolean = false): string {
  if (delta === 0) return 'text-gray-500'
  
  // Bei inverser Logik (z.B. Durchlaufzeit) ist negativ gut
  const isPositive = inverseLogic ? delta < 0 : delta > 0
  
  return isPositive ? 'text-green-600' : 'text-red-600'
}

/**
 * Prüft ob ein Wert von Szenarien betroffen ist
 */
export function istVonSzenarienBetroffen(szenarien: SzenarioConfig[]): boolean {
  return szenarien.filter(s => s.aktiv).length > 0
}
