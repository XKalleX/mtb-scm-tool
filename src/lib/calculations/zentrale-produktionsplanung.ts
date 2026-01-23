/**
 * ========================================
 * ZENTRALE PRODUKTIONSPLANUNG
 * ========================================
 * * Zentrale Berechnungsfunktionen die von ALLEN Seiten genutzt werden.
 * Nutzt ausschließlich Daten aus dem KonfigurationContext.
 * * ✅ SINGLE SOURCE OF TRUTH: Alle Berechnungen basieren auf KonfigurationData
 * ✅ DURCHGÄNGIGKEIT: Von Settings → OEM → Inbound → Produktion → Reporting
 * ✅ KONSISTENZ: Gleiche Logik in allen Modulen
 * * WICHTIG: Diese Funktionen erhalten KonfigurationData als Parameter,
 * damit sie unabhängig von React-Context funktionieren.
 */

import type { KonfigurationData } from '@/contexts/KonfigurationContext'

/**
 * Typ für wöchentliche Überschreibungen (OEM Programplanung)
 * Key: Kalenderwoche (1-52/53), Value: Exakte Menge für diese Woche
 */
export type WochenPlanung = Record<number, number>;

/**
 * Tagesproduktionseintrag mit Error Management
 */
export interface TagesProduktionEntry {
  tag: number                    // Tag im Jahr (1-365)
  datum: Date                    // Datum
  wochentag: string              // Mo, Di, Mi, ...
  monat: number                  // Monat (1-12)
  monatName: string              // Januar, Februar, ...
  kalenderwoche: number          // KW (1-53)
  istArbeitstag: boolean         // Produktionstag?
  istFeiertag: boolean           // Deutscher Feiertag?
  feiertagsName?: string         // Name des Feiertags
  
  // Produktion
  sollProduktionDezimal: number  // Dezimale Soll-Produktion (z.B. 71.61)
  planMenge: number              // Ganzzahlige Plan-Menge (mit Error Mgmt)
  istMenge: number               // Tatsächliche Ist-Menge
  abweichung: number             // Differenz Ist - Plan
  
  // Error Management (KERN!)
  tagesError: number             // Fehler dieses Tags (sollDezimal - planMenge)
  monatsFehlerVorher: number     // Monatlicher Fehler vom Vortag
  monatsFehlerNachher: number    // Monatlicher Fehler nach diesem Tag (sollte ±0.5 bleiben!)
  errorKorrekturAngewendet: boolean  // Wurde auf-/abgerundet wegen Error?
  
  // Saisonalität
  saisonFaktor: number           // Monatlicher Anteil (0.04 - 0.16)
  saisonMenge: number            // Monatliche Bikes
  
  // Kapazität
  schichten: number              // Benötigte Schichten
  auslastung: number             // % Auslastung
  materialVerfuegbar: boolean    // Material OK?
  
  // Kumulative Werte
  kumulativPlan: number          // Σ Plan bis heute
  kumulativIst: number           // Σ Ist bis heute
}

/**
 * Produktionsplan für eine MTB-Variante über 365 Tage
 */
export interface VariantenProduktionsplan {
  varianteId: string
  varianteName: string
  jahresProduktion: number       // Soll-Jahresproduktion
  jahresProduktionIst: number    // Ist-Jahresproduktion
  abweichung: number             // Differenz (sollte ≈ 0 sein)
  tage: TagesProduktionEntry[]   // 365 Tage
}

/**
 * ========================================
 * HILFSFUNKTIONEN (Kalenderwoche & Datum)
 * ========================================
 */

/**
 * Ermittelt die Kalenderwoche (ISO 8601) für ein Datum
 */
function getKalenderWoche(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * ========================================
 * ARBEITSTAGE-BERECHNUNG (Deutschland)
 * ========================================
 */

/**
 * Zählt die tatsächlichen Arbeitstage in einem Monat
 */
export function countArbeitstageInMonat(
  jahr: number,
  monat: number,
  feiertage: string[]
): number {
  let arbeitstage = 0
  const daysInMonth = new Date(jahr, monat, 0).getDate()
  
  for (let tag = 1; tag <= daysInMonth; tag++) {
    const datum = new Date(jahr, monat - 1, tag)
    const datumStr = datum.toISOString().split('T')[0]
    const istWochenende = datum.getDay() === 0 || datum.getDay() === 6
    const istFeiertag = feiertage.includes(datumStr)
    
    if (!istWochenende && !istFeiertag) {
      arbeitstage++
    }
  }
  
  return arbeitstage
}

/**
 * Zählt Arbeitstage in einer spezifischen Kalenderwoche
 */
export function countArbeitstageInWoche(
  kw: number,
  jahr: number,
  feiertage: string[]
): number {
  let arbeitstage = 0
  const startDatum = new Date(jahr, 0, 1)
  for (let i = 0; i < 365; i++) {
    const datum = new Date(jahr, 0, i + 1)
    if (getKalenderWoche(datum) === kw) {
       const datumStr = datum.toISOString().split('T')[0]
       const istWochenende = datum.getDay() === 0 || datum.getDay() === 6
       const istFeiertag = feiertage.includes(datumStr)
       if (!istWochenende && !istFeiertag) {
         arbeitstage++
       }
    }
  }
  return arbeitstage
}

/**
 * Zählt alle Arbeitstage im Jahr (Deutschland)
 */
export function countArbeitstageImJahr(konfiguration: KonfigurationData): number {
  const deutscheFeiertage = konfiguration.feiertage
    .filter(f => f.land === 'Deutschland')
    .map(f => f.datum)
  
  let arbeitstage = 0
  
  for (let monat = 1; monat <= 12; monat++) {
    arbeitstage += countArbeitstageInMonat(
      konfiguration.planungsjahr,
      monat,
      deutscheFeiertage
    )
  }
  
  return arbeitstage
}

/**
 * ========================================
 * SAISONALE VERTEILUNG
 * ========================================
 */

export function berechneSaisonaleVerteilung(konfiguration: KonfigurationData) {
  const deutscheFeiertage = konfiguration.feiertage
    .filter(f => f.land === 'Deutschland')
    .map(f => f.datum)
  
  return konfiguration.saisonalitaet.map(s => {
    const monatsBikes = Math.round(konfiguration.jahresproduktion * (s.anteil / 100))
    const daysInMonth = new Date(konfiguration.planungsjahr, s.monat, 0).getDate()
    const arbeitstage = countArbeitstageInMonat(
      konfiguration.planungsjahr,
      s.monat,
      deutscheFeiertage
    )
    
    return {
      monat: s.monat,
      name: s.name,
      nameKurz: s.name.substring(0, 3),
      anteil: s.anteil / 100,
      tage: daysInMonth,
      bikes: monatsBikes,
      arbeitstage: arbeitstage,
      bikeProArbeitstag: arbeitstage > 0 ? monatsBikes / arbeitstage : 0
    }
  })
}

/**
 * ========================================
 * TAGESPRODUKTION MIT ERROR MANAGEMENT
 * ========================================
 */

/**
 * 🎯 KERNFUNKTION: Generiert 365-Tage Produktionsplan mit Error Management
 * * Jetzt inkl. optionaler Wochenplanung (wochenPlanung Parameter)
 */
export function generiereTagesproduktion(
  konfiguration: KonfigurationData,
  wochenPlanung?: WochenPlanung // Optionaler Parameter für manuelle Wochenplanung
): TagesProduktionEntry[] {
  const saisonalitaet = berechneSaisonaleVerteilung(konfiguration)
  
  const deutscheFeiertage = konfiguration.feiertage
    .filter(f => f.land === 'Deutschland')
    .map(f => f.datum)
  
  const feiertagMap = new Map(
    konfiguration.feiertage
      .filter(f => f.land === 'Deutschland')
      .map(f => [f.datum, f.name])
  )
  
  const monatlicheFehlerTracker: Record<number, number> = {}
  const result: TagesProduktionEntry[] = []
  
  for (let i = 0; i < 365; i++) {
    const tag = i + 1
    const datum = new Date(konfiguration.planungsjahr, 0, tag)
    const wochentag = datum.toLocaleDateString('de-DE', { weekday: 'short' })
    const datumStr = datum.toISOString().split('T')[0]
    const kw = getKalenderWoche(datum)
    
    const istWochenende = datum.getDay() === 0 || datum.getDay() === 6
    const istFeiertag = deutscheFeiertage.includes(datumStr)
    const istArbeitstag = !istWochenende && !istFeiertag
    const feiertagsName = feiertagMap.get(datumStr)
    
    const monat = datum.getMonth() + 1
    const saisonInfo = saisonalitaet.find(s => s.monat === monat)!
    
    if (!(monat in monatlicheFehlerTracker)) {
      monatlicheFehlerTracker[monat] = 0
    }
    
    let sollProduktionDezimal = 0
    let planMenge = 0
    let istMenge = 0
    let tagesError = 0
    let monatsFehlerVorher = 0
    let monatsFehlerNachher = 0
    let errorKorrekturAngewendet = false
    
    if (istArbeitstag) {
      // ✅ PRODUKTIONSTAG mit ERROR MANAGEMENT
      
      // Prüfe auf Wochenplanung Override
      if (wochenPlanung && wochenPlanung[kw] !== undefined) {
         // Fall A: Manuelle Wochenplanung
         const arbeitstageInWoche = countArbeitstageInWoche(kw, konfiguration.planungsjahr, deutscheFeiertage)
         if (arbeitstageInWoche > 0) {
            sollProduktionDezimal = wochenPlanung[kw] / arbeitstageInWoche
         } else {
            sollProduktionDezimal = 0 
         }
      } else {
         // Fall B: Standard Saisonale Verteilung
         sollProduktionDezimal = saisonInfo.bikes / saisonInfo.arbeitstage
      }
      
      // Error Management
      monatsFehlerVorher = monatlicheFehlerTracker[monat]
      const tagesErrorRoh = sollProduktionDezimal - Math.round(sollProduktionDezimal)
      const fehlerGesamt = monatsFehlerVorher + tagesErrorRoh
      
      if (fehlerGesamt >= 0.5) {
        planMenge = Math.ceil(sollProduktionDezimal)
        monatlicheFehlerTracker[monat] = fehlerGesamt - 1.0
        errorKorrekturAngewendet = true
      } else if (fehlerGesamt <= -0.5) {
        planMenge = Math.floor(sollProduktionDezimal)
        monatlicheFehlerTracker[monat] = fehlerGesamt + 1.0
        errorKorrekturAngewendet = true
      } else {
        planMenge = Math.round(sollProduktionDezimal)
        monatlicheFehlerTracker[monat] = fehlerGesamt
        errorKorrekturAngewendet = false
      }
      
      monatsFehlerNachher = monatlicheFehlerTracker[monat]
      tagesError = sollProduktionDezimal - planMenge
      
      // Ist = Plan (Basis)
      istMenge = planMenge
    }
    
    const abweichung = istMenge - planMenge
    const materialVerfuegbar = istArbeitstag
    
    const kapazitaetProSchicht = 
      konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht
    const schichten = istArbeitstag ? Math.ceil(istMenge / kapazitaetProSchicht) : 0
    
    const maxKapazitaet = schichten > 0 ? schichten * kapazitaetProSchicht : 0
    const auslastung = maxKapazitaet > 0 ? (istMenge / maxKapazitaet) * 100 : 0
    
    result.push({
      tag,
      datum,
      wochentag,
      monat,
      monatName: saisonInfo.nameKurz,
      kalenderwoche: kw,
      istArbeitstag,
      istFeiertag,
      feiertagsName,
      sollProduktionDezimal,
      planMenge,
      istMenge,
      abweichung,
      tagesError,
      monatsFehlerVorher,
      monatsFehlerNachher,
      errorKorrekturAngewendet,
      saisonFaktor: saisonInfo.anteil,
      saisonMenge: saisonInfo.bikes,
      schichten,
      auslastung: Math.round(auslastung * 10) / 10,
      materialVerfuegbar,
      kumulativPlan: 0,
      kumulativIst: 0
    })
  }
  
  // Kumulative Werte
  let kumulativPlan = 0
  let kumulativIst = 0
  result.forEach(tag => {
    kumulativPlan += tag.planMenge
    kumulativIst += tag.istMenge
    tag.kumulativPlan = kumulativPlan
    tag.kumulativIst = kumulativIst
  })
  
  // ✅ Validierung (Nur wenn kein Wochenplan-Override aktiv)
  if (!wochenPlanung) {
      let summePlan = result.reduce((sum, tag) => sum + tag.planMenge, 0)
      const differenz = summePlan - konfiguration.jahresproduktion
      
      if (differenz !== 0) {
        console.warn(`⚠️ FINALE KORREKTUR: Summendifferenz ${differenz} Bikes wird korrigiert`)
        
        const arbeitstage = result.filter(t => t.istArbeitstag)
        arbeitstage.sort((a, b) => b.planMenge - a.planMenge)
        
        let verbleibendeKorrektur = Math.abs(differenz)
        const korrekturRichtung = differenz > 0 ? -1 : +1 
        
        for (let i = 0; i < arbeitstage.length && verbleibendeKorrektur > 0; i++) {
          const tag = arbeitstage[i]
          tag.planMenge += korrekturRichtung
          tag.istMenge += korrekturRichtung
          tag.abweichung = 0 
          verbleibendeKorrektur--
          
          const tagIndex = result.findIndex(t => t.tag === tag.tag)
          for (let j = tagIndex; j < result.length; j++) {
            result[j].kumulativPlan += korrekturRichtung
            result[j].kumulativIst += korrekturRichtung
          }
        }
      }
  }
  
  return result
}

/**
 * ========================================
 * PRODUKTIONSPLANUNG FÜR VARIANTEN
 * ========================================
 */

export function generiereVariantenProduktionsplan(
  konfiguration: KonfigurationData,
  varianteId: string,
  wochenPlanung?: WochenPlanung
): VariantenProduktionsplan | null {
  const variante = konfiguration.varianten.find(v => v.id === varianteId)
  if (!variante) return null
  
  const jahresProduktion = Math.round(konfiguration.jahresproduktion * variante.anteilPrognose)
  
  const varianteKonfiguration: KonfigurationData = {
    ...konfiguration,
    jahresproduktion: jahresProduktion
  }
  
  const tage = generiereTagesproduktion(varianteKonfiguration, wochenPlanung)
  const jahresProduktionIst = tage.reduce((sum, t) => sum + t.istMenge, 0)
  
  return {
    varianteId: variante.id,
    varianteName: variante.name,
    jahresProduktion: wochenPlanung ? jahresProduktionIst : jahresProduktion,
    jahresProduktionIst,
    abweichung: wochenPlanung ? 0 : (jahresProduktionIst - jahresProduktion),
    tage
  }
}

export function generiereAlleVariantenProduktionsplaene(
  konfiguration: KonfigurationData,
  wochenPlanungen?: Record<string, WochenPlanung>
): Record<string, VariantenProduktionsplan> {
  const plaene: Record<string, VariantenProduktionsplan> = {}
  
  konfiguration.varianten.forEach(variante => {
    const planOverride = wochenPlanungen ? wochenPlanungen[variante.id] : undefined;
    const plan = generiereVariantenProduktionsplan(konfiguration, variante.id, planOverride)
    if (plan) {
      plaene[variante.id] = plan
    }
  })
  
  return plaene
}

/**
 * ========================================
 * LAGERBESTANDS-BERECHNUNG
 * ========================================
 */

export interface LagerbestandInfo {
  komponente: string
  bauteilId: string
  bestand: number
  sicherheit: number
  bedarf: number
  verwendung: string
  status: 'ok' | 'niedrig' | 'kritisch'
  jahresbedarf: number
}

export function berechneLagerbestaende(
  konfiguration: KonfigurationData
): LagerbestandInfo[] {
  const variantenProduktion: Record<string, number> = {}
  konfiguration.varianten.forEach(v => {
    variantenProduktion[v.id] = Math.round(konfiguration.jahresproduktion * v.anteilPrognose)
  })
  
  const komponentenBedarf: Record<string, {
    jahresbedarf: number
    verwendung: string[]
    name: string
  }> = {}
  
  konfiguration.bauteile.forEach(bauteil => {
    komponentenBedarf[bauteil.id] = {
      jahresbedarf: 0,
      verwendung: [],
      name: bauteil.name
    }
  })
  
  konfiguration.stueckliste.forEach(position => {
    const produktion = variantenProduktion[position.mtbVariante] || 0
    const bedarf = produktion * position.menge
    
    if (komponentenBedarf[position.bauteilId]) {
      komponentenBedarf[position.bauteilId].jahresbedarf += bedarf
      const variante = konfiguration.varianten.find(v => v.id === position.mtbVariante)
      if (variante) {
        komponentenBedarf[position.bauteilId].verwendung.push(variante.name)
      }
    }
  })
  
  const lagerbestaende: LagerbestandInfo[] = []
  
  Object.entries(komponentenBedarf).forEach(([bauteilId, info]) => {
    if (info.jahresbedarf === 0) return 
    
    const tagesbedarf = Math.round(info.jahresbedarf / 365)
    const sicherheit = Math.round(info.jahresbedarf / 365 * 7)
    const bestand = Math.round(info.jahresbedarf * 0.35) 
    
    let status: 'ok' | 'niedrig' | 'kritisch' = 'ok'
    if (bestand < sicherheit) {
      status = 'kritisch'
    } else if (bestand < sicherheit * 2) {
      status = 'niedrig'
    }
    
    lagerbestaende.push({
      komponente: info.name,
      bauteilId,
      bestand,
      sicherheit,
      bedarf: tagesbedarf,
      verwendung: info.verwendung.join(', '),
      status,
      jahresbedarf: info.jahresbedarf
    })
  })
  
  return lagerbestaende.sort((a, b) => a.komponente.localeCompare(b.komponente))
}

export interface TagesLagerbestand {
  tag: number
  datum: Date
  wochentag: string
  monat: number
  istArbeitstag: boolean
  bauteile: {
    bauteilId: string
    bauteilName: string
    anfangsBestand: number
    zugang: number          
    verbrauch: number       
    endBestand: number      
    sicherheit: number
    verfuegbar: number      
    reichweite: number      
    status: 'ok' | 'niedrig' | 'kritisch'
  }[]
}

export function berechneTagesLagerbestaende(
  konfiguration: KonfigurationData,
  tagesProduktion: TagesProduktionEntry[]
): TagesLagerbestand[] {
  const variantenProduktion: Record<string, number> = {}
  konfiguration.varianten.forEach(v => {
    variantenProduktion[v.id] = Math.round(konfiguration.jahresproduktion * v.anteilPrognose)
  })
  
  const bauteilBedarfe: Record<string, {
    jahresbedarf: number
    tagesbedarf: number
    name: string
  }> = {}
  
  konfiguration.bauteile.forEach(bauteil => {
    bauteilBedarfe[bauteil.id] = {
      jahresbedarf: 0,
      tagesbedarf: 0,
      name: bauteil.name
    }
  })
  
  konfiguration.stueckliste.forEach(position => {
    const produktion = variantenProduktion[position.mtbVariante] || 0
    const bedarf = produktion * position.menge
    if (bauteilBedarfe[position.bauteilId]) {
      bauteilBedarfe[position.bauteilId].jahresbedarf += bedarf
    }
  })
  
  Object.keys(bauteilBedarfe).forEach(bauteilId => {
    const info = bauteilBedarfe[bauteilId]
    info.tagesbedarf = Math.round(info.jahresbedarf / 365)
  })
  
  const aktuelleBestaende: Record<string, number> = {}
  Object.keys(bauteilBedarfe).forEach(bauteilId => {
    const jahresbedarf = bauteilBedarfe[bauteilId].jahresbedarf
    aktuelleBestaende[bauteilId] = Math.round(jahresbedarf * 0.35)
  })
  
  const result: TagesLagerbestand[] = []
  
  tagesProduktion.forEach((tag, index) => {
    const bauteileStatus: TagesLagerbestand['bauteile'] = []
    
    konfiguration.bauteile.forEach(bauteil => {
      const bauteilId = bauteil.id
      const info = bauteilBedarfe[bauteilId]
      
      if (!info || info.jahresbedarf === 0) return
      
      const anfangsBestand = aktuelleBestaende[bauteilId]
      const zugang = tag.istArbeitstag ? Math.round(info.tagesbedarf * 1.1) : 0
      
      let verbrauch = 0
      konfiguration.stueckliste.forEach(position => {
        if (position.bauteilId === bauteilId) {
          const varianteProduktion = variantenProduktion[position.mtbVariante] || 0
          const anteilAnTagesproduktion = tag.istMenge / konfiguration.jahresproduktion
          verbrauch += Math.round(varianteProduktion * anteilAnTagesproduktion * position.menge)
        }
      })
      
      const endBestand = Math.max(0, anfangsBestand + zugang - verbrauch)
      aktuelleBestaende[bauteilId] = endBestand
      
      const sicherheit = Math.round(info.tagesbedarf * 7)
      const verfuegbar = Math.max(0, endBestand - sicherheit)
      const reichweite = info.tagesbedarf > 0 ? verfuegbar / info.tagesbedarf : 999
      
      let status: 'ok' | 'niedrig' | 'kritisch' = 'ok'
      if (endBestand < sicherheit || reichweite < 7) {
        status = 'kritisch'
      } else if (reichweite < 14) {
        status = 'niedrig'
      }
      
      bauteileStatus.push({
        bauteilId,
        bauteilName: info.name,
        anfangsBestand,
        zugang,
        verbrauch,
        endBestand,
        sicherheit,
        verfuegbar,
        reichweite,
        status
      })
    })
    
    result.push({
      tag: tag.tag,
      datum: tag.datum,
      wochentag: tag.wochentag,
      monat: tag.monat,
      istArbeitstag: tag.istArbeitstag,
      bauteile: bauteileStatus
    })
  })
  
  return result
}

/**
 * ========================================
 * STATISTIKEN
 * ========================================
 */

export function berechneProduktionsStatistiken(tagesProduktion: TagesProduktionEntry[]) {
  const geplant = tagesProduktion.reduce((sum, tag) => sum + tag.planMenge, 0)
  const produziert = tagesProduktion.reduce((sum, tag) => sum + tag.istMenge, 0)
  const arbeitstage = tagesProduktion.filter(tag => tag.istArbeitstag).length
  const schichtenGesamt = tagesProduktion.reduce((sum, tag) => sum + tag.schichten, 0)
  const planerfuellungsgrad = geplant > 0 ? (produziert / geplant) * 100 : 0
  
  const mitMaterialmangel = tagesProduktion.filter(tag => !tag.materialVerfuegbar).length
  
  const auslastungsDurchschnitt = arbeitstage > 0
    ? tagesProduktion
        .filter(tag => tag.istArbeitstag)
        .reduce((sum, tag) => sum + tag.auslastung, 0) / arbeitstage
    : 0
  
  return {
    geplant,
    produziert,
    abweichung: produziert - geplant,
    planerfuellungsgrad: Math.round(planerfuellungsgrad * 100) / 100,
    arbeitstage,
    schichtenGesamt,
    mitMaterialmangel,
    auslastung: Math.round(auslastungsDurchschnitt * 10) / 10
  }
}

/**
 * ========================================
 * VISUALISIERUNG & REPORTING (NEU)
 * ========================================
 */

export interface RueckstandsDatenpunkt {
  datum: string;
  rueckstand: number; // Positive = Rückstand (Zu wenig produziert), Negative = Vorlauf
  kumulativSoll: number;
  kumulativIst: number;
}

/**
 * Berechnet den täglichen Produktionsrückstand für Visualisierungen.
 * 
 */
export function berechneProduktionsRueckstandTrend(
  tagesProduktion: TagesProduktionEntry[]
): RueckstandsDatenpunkt[] {
  return tagesProduktion.map(tag => ({
    datum: tag.datum.toISOString().split('T')[0],
    // Rückstand = Was wir hätten bauen sollen (kumulativPlan) - Was wir gebaut haben (kumulativIst)
    // Wenn Plan = 1000, Ist = 900 -> Rückstand = 100 (Positiv)
    rueckstand: tag.kumulativPlan - tag.kumulativIst, 
    kumulativSoll: tag.kumulativPlan,
    kumulativIst: tag.kumulativIst
  }));
}