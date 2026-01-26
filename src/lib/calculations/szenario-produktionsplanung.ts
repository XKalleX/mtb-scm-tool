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
  
  // GRANULAR: Tagesgenaue Faktoren pro Variante für Marketingaktionen
  // Key: `${varianteId}-${tagNummer}`, Value: Faktor (z.B. 1.2 für +20%)
  // Wenn keine Variante spezifiziert (varianteId = "*"), gilt für alle Varianten
  tagesgenaueMarketingFaktoren: Map<string, number>
  
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
 * WICHTIG: Marketingaktionen sind jetzt GRANULAR je Fahrrad und Tagesbasis!
 * - startDatum/endDatum statt Kalenderwochen
 * - varianteIds Array (leer = alle Varianten)
 * - Tagesgenaue Faktoren werden in Map gespeichert
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
  const tagesgenaueMarketingFaktoren = new Map<string, number>()
  let materialverfuegbarkeitFaktor = 1.0
  let materialVerlust = 0
  let vorlaufzeitAenderung = 0
  const aktiveSzenarioTypen: string[] = []
  const beschreibungen: string[] = []
  
  aktiveSzenarien.forEach(szenario => {
    aktiveSzenarioTypen.push(szenario.typ)
    
    switch (szenario.typ) {
      case 'marketingaktion': {
        /**
         * GRANULARE MARKETINGAKTION (NEU):
         * - Tagesgenaue Nachfrageerhöhung (startDatum → endDatum)
         * - Pro Fahrrad konfigurierbar (varianteIds Array)
         * - Wenn varianteIds leer: Gilt für ALLE Varianten
         */
        const erhoehung = (szenario.parameter.erhoehungProzent || 20) / 100
        const faktor = 1 + erhoehung
        
        // Parse Datumsangaben (Format: "2027-07-01")
        const startDatum = szenario.parameter.startDatum 
          ? new Date(szenario.parameter.startDatum) 
          : new Date(planungsjahr, 6, 1) // Fallback: 1. Juli
        
        const endDatum = szenario.parameter.endDatum
          ? new Date(szenario.parameter.endDatum)
          : new Date(startDatum.getTime() + 14 * 24 * 60 * 60 * 1000) // Fallback: +14 Tage
        
        // Berechne betroffene Tage (1-365)
        const jahresStart = new Date(planungsjahr, 0, 1)
        const startTag = Math.ceil((startDatum.getTime() - jahresStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
        const endTag = Math.ceil((endDatum.getTime() - jahresStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
        
        // Betroffene Varianten
        const varianteIds: string[] = szenario.parameter.varianteIds || []
        const betroffeneVarianten = varianteIds.length > 0 ? varianteIds : ['*'] // '*' = alle Varianten
        
        // Tagesgenaue Faktoren setzen
        for (let tag = Math.max(1, startTag); tag <= Math.min(365, endTag); tag++) {
          betroffeneVarianten.forEach(varianteId => {
            const key = `${varianteId}-${tag}`
            // Wenn bereits ein Faktor existiert, multiplizieren (mehrere Marketingaktionen)
            const existingFaktor = tagesgenaueMarketingFaktoren.get(key) || 1.0
            tagesgenaueMarketingFaktoren.set(key, existingFaktor * faktor)
          })
        }
        
        // Beschreibung erstellen
        const dauerTage = Math.max(1, endTag - startTag + 1)
        const variantenText = varianteIds.length === 0 
          ? 'alle Varianten' 
          : varianteIds.length === 1 
            ? varianteIds[0]
            : `${varianteIds.length} Varianten`
        
        beschreibungen.push(
          `Marketing: +${szenario.parameter.erhoehungProzent}% für ${variantenText} (${dauerTage} Tage, ${startDatum.toLocaleDateString('de-DE')} - ${endDatum.toLocaleDateString('de-DE')})`
        )
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
    tagesgenaueMarketingFaktoren,
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
 * 
 * WICHTIG: Unterstützt GRANULARE Marketingaktionen je Fahrrad & Tagesbasis!
 * - Tagesgenaue Marketing-Faktoren aus modifikation.tagesgenaueMarketingFaktoren
 * - Varianten-spezifische Anwendung der Faktoren
 * - Korrekte Error-Management Berechnung mit variablen Tagesfaktoren
 */
export function generiereAlleVariantenMitSzenarien(
  konfiguration: KonfigurationData,
  szenarien: SzenarioConfig[]
): Record<string, VariantenProduktionsplan & { tage: TagesProduktionMitDelta[] }> {
  const aktiveSzenarien = szenarien.filter(s => s.aktiv)
  const modifikation = berechneSzenarioModifikation(aktiveSzenarien, konfiguration.planungsjahr)
  
  const result: Record<string, VariantenProduktionsplan & { tage: TagesProduktionMitDelta[] }> = {}
  
  konfiguration.varianten.forEach(variante => {
    // Baseline-Jahresproduktion (ohne Szenarien)
    const baselineJahresProduktion = Math.round(
      konfiguration.jahresproduktion * variante.anteilPrognose
    )
    
    // Baseline-Konfiguration
    const baselineKonfiguration: KonfigurationData = {
      ...konfiguration,
      jahresproduktion: baselineJahresProduktion
    }
    
    // Generiere Baseline-Plan (ohne Szenarien)
    const baselineTage = generiereTagesproduktion(baselineKonfiguration)
    
    /**
     * GRANULARE MARKETINGAKTION: Tagesgenaue Anpassung der Produktion
     * 
     * Für jeden Tag prüfen wir ob ein Marketing-Faktor existiert:
     * 1. Varianten-spezifisch: Key = `${variante.id}-${tagNummer}`
     * 2. Alle Varianten: Key = `*-${tagNummer}`
     * 
     * Wenn ein Faktor existiert, wird die Tagesproduktion angepasst
     * unter Berücksichtigung von Error-Management für korrekte Jahressummen.
     */
    const szenarioTage: TagesProduktionMitDelta[] = []
    let kumulierterErrorSzenario = 0
    let jahresProduktionSzenarioGeplant = 0
    let jahresProduktionSzenarioIst = 0
    
    for (let tagIndex = 0; tagIndex < 365; tagIndex++) {
      const baselineTag = baselineTage[tagIndex]
      const tagNummer = tagIndex + 1
      
      // Prüfe Marketing-Faktor für diesen Tag und diese Variante
      const variantenKey = `${variante.id}-${tagNummer}`
      const globalKey = `*-${tagNummer}`
      
      let marketingFaktor = 1.0
      let istMarketingTag = false
      let marketingNotiz: string | undefined
      
      // Varianten-spezifischer Faktor hat Vorrang
      if (modifikation.tagesgenaueMarketingFaktoren.has(variantenKey)) {
        marketingFaktor = modifikation.tagesgenaueMarketingFaktoren.get(variantenKey)!
        istMarketingTag = true
        marketingNotiz = `Marketing: +${Math.round((marketingFaktor - 1) * 100)}% für ${variante.name}`
      } else if (modifikation.tagesgenaueMarketingFaktoren.has(globalKey)) {
        marketingFaktor = modifikation.tagesgenaueMarketingFaktoren.get(globalKey)!
        istMarketingTag = true
        marketingNotiz = `Marketing: +${Math.round((marketingFaktor - 1) * 100)}% alle Varianten`
      }
      
      // Berechne Plan- und Ist-Menge mit Marketing-Faktor
      let planMenge = baselineTag.planMenge * marketingFaktor
      let istMenge = baselineTag.istMenge * marketingFaktor
      
      // Error-Management anwenden (nur auf Arbeitstagen)
      if (baselineTag.istArbeitstag) {
        const sollMenge = planMenge
        const fehlerVorher = kumulierterErrorSzenario
        kumulierterErrorSzenario += (sollMenge - Math.round(sollMenge))
        
        if (kumulierterErrorSzenario >= 0.5) {
          istMenge = Math.ceil(sollMenge)
          kumulierterErrorSzenario -= 1.0
        } else if (kumulierterErrorSzenario <= -0.5) {
          istMenge = Math.floor(sollMenge)
          kumulierterErrorSzenario += 1.0
        } else {
          istMenge = Math.round(sollMenge)
        }
      } else {
        // Kein Arbeitstag
        planMenge = 0
        istMenge = 0
      }
      
      // Prüfe Produktionsausfall
      const istAusfallTag = modifikation.produktionsAusfallTage.includes(tagNummer)
      if (istAusfallTag && baselineTag.istArbeitstag) {
        istMenge = Math.round(istMenge * MACHINE_FAILURE_PRODUCTION_RATE)
        marketingNotiz = 'Produktionsausfall China'
      }
      
      // Prüfe Materialverfügbarkeit (deterministisch)
      const materialSchwelle = 0.1 + (tagNummer % 10) / 10
      const materialOk = baselineTag.materialVerfuegbar && 
                         materialSchwelle < modifikation.materialverfuegbarkeitFaktor
      
      if (!materialOk && baselineTag.istArbeitstag && !istAusfallTag) {
        istMenge = Math.round(istMenge * MATERIAL_SHORTAGE_PRODUCTION_RATE)
        marketingNotiz = marketingNotiz || 'Reduzierte Materialverfügbarkeit'
      }
      
      // Akkumuliere Jahresproduktion
      jahresProduktionSzenarioGeplant += planMenge
      jahresProduktionSzenarioIst += istMenge
      
      // Deltas berechnen
      const deltaPlan = planMenge - baselineTag.planMenge
      const deltaIst = istMenge - baselineTag.istMenge
      
      szenarioTage.push({
        ...baselineTag,
        planMenge,
        istMenge,
        abweichung: istMenge - planMenge,
        kumulativPlan: jahresProduktionSzenarioGeplant,
        kumulativIst: jahresProduktionSzenarioIst,
        materialVerfuegbar: materialOk,
        
        // Baseline-Referenz
        baselinePlanMenge: baselineTag.planMenge,
        baselineIstMenge: baselineTag.istMenge,
        
        // Deltas
        deltaPlanMenge: deltaPlan,
        deltaIstMenge: deltaIst,
        
        // Szenario-Info
        istVonSzenarioBetroffen: istMarketingTag || istAusfallTag || !materialOk,
        szenarioTyp: istMarketingTag ? 'marketingaktion' : istAusfallTag ? 'maschinenausfall' : undefined,
        szenarioNotiz: marketingNotiz
      })
    }
    
    result[variante.id] = {
      varianteId: variante.id,
      varianteName: variante.name,
      jahresProduktion: Math.round(jahresProduktionSzenarioGeplant),
      jahresProduktionIst: Math.round(jahresProduktionSzenarioIst),
      abweichung: Math.round(jahresProduktionSzenarioIst - jahresProduktionSzenarioGeplant),
      tage: szenarioTage
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
