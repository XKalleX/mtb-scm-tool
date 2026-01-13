/**
 * ========================================
 * ZENTRALE PRODUKTIONSPLANUNG
 * ========================================
 * 
 * Zentrale Berechnungsfunktionen die von ALLEN Seiten genutzt werden.
 * Nutzt ausschließlich Daten aus dem KonfigurationContext.
 * 
 * ✅ SINGLE SOURCE OF TRUTH: Alle Berechnungen basieren auf KonfigurationData
 * ✅ DURCHGÄNGIGKEIT: Von Settings → OEM → Inbound → Produktion → Reporting
 * ✅ KONSISTENZ: Gleiche Logik in allen Modulen
 * 
 * WICHTIG: Diese Funktionen erhalten KonfigurationData als Parameter,
 * damit sie unabhängig von React-Context funktionieren.
 */

import type { KonfigurationData } from '@/contexts/KonfigurationContext'

/**
 * Tagesproduktionseintrag mit Error Management
 */
export interface TagesProduktionEntry {
  tag: number                    // Tag im Jahr (1-365)
  datum: Date                    // Datum
  wochentag: string              // Mo, Di, Mi, ...
  monat: number                  // Monat (1-12)
  monatName: string              // Januar, Februar, ...
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
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARBEITSTAGE-BERECHNUNG (Deutschland)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Zählt die tatsächlichen Arbeitstage in einem Monat
 * 
 * @param jahr - Planungsjahr
 * @param monat - Monat (1-12)
 * @param feiertage - Array von Feiertags-Daten (Format: YYYY-MM-DD)
 * @returns Anzahl Arbeitstage (Mo-Fr, ohne Feiertage)
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
 * Zählt alle Arbeitstage im Jahr (Deutschland)
 * 
 * @param konfiguration - KonfigurationData aus Context
 * @returns Anzahl Arbeitstage im Jahr
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
 * ═══════════════════════════════════════════════════════════════════════════════
 * SAISONALE VERTEILUNG
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Berechnet saisonale Verteilung mit EXAKTEN Arbeitstagen
 * 
 * @param konfiguration - KonfigurationData aus Context
 * @returns Array mit 12 Monaten inkl. Arbeitstagen
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
 * ═══════════════════════════════════════════════════════════════════════════════
 * TAGESPRODUKTION MIT ERROR MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * 🎯 KERNFUNKTION: Generiert 365-Tage Produktionsplan mit Error Management
 * 
 * KONZEPT: Error Management verhindert kumulative Rundungsfehler
 * - Plan-Menge = Geplante Jahresproduktion (370.000 Bikes)
 * - Ist-Menge = Tatsächlich produziert (kann bei Störungen abweichen)
 * - Ohne Szenarien: Ist = Plan (perfekte Ausführung)
 * 
 * VALIDIERUNG: Summe(planMenge) MUSS exakt Jahresproduktion sein!
 * 
 * @param konfiguration - KonfigurationData aus Context
 * @returns Array mit 365 Tagen
 */
export function generiereTagesproduktion(
  konfiguration: KonfigurationData
): TagesProduktionEntry[] {
  // Saisonale Verteilung berechnen
  const saisonalitaet = berechneSaisonaleVerteilung(konfiguration)
  
  // Deutsche Feiertage
  const deutscheFeiertage = konfiguration.feiertage
    .filter(f => f.land === 'Deutschland')
    .map(f => f.datum)
  
  const feiertagMap = new Map(
    konfiguration.feiertage
      .filter(f => f.land === 'Deutschland')
      .map(f => [f.datum, f.name])
  )
  
  // Error Management: Pro Monat separate Fehlerkorrektur
  const monatlicheFehlerTracker: Record<number, number> = {}
  
  const result: TagesProduktionEntry[] = []
  
  for (let i = 0; i < 365; i++) {
    const tag = i + 1
    const datum = new Date(konfiguration.planungsjahr, 0, tag)
    const wochentag = datum.toLocaleDateString('de-DE', { weekday: 'short' })
    const datumStr = datum.toISOString().split('T')[0]
    
    // Arbeitstag-Prüfung
    const istWochenende = datum.getDay() === 0 || datum.getDay() === 6
    const istFeiertag = deutscheFeiertage.includes(datumStr)
    const istArbeitstag = !istWochenende && !istFeiertag
    const feiertagsName = feiertagMap.get(datumStr)
    
    // Monat für Saisonalität
    const monat = datum.getMonth() + 1
    const saisonInfo = saisonalitaet.find(s => s.monat === monat)!
    
    // Initialisiere Fehler-Tracker für diesen Monat
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
      
      // Soll-Produktion: Monatliche Bikes / Arbeitstage im Monat (DEZIMAL!)
      sollProduktionDezimal = saisonInfo.bikes / saisonInfo.arbeitstage
      
      // Error Management: Kumulative Fehlerkorrektur
      monatsFehlerVorher = monatlicheFehlerTracker[monat]
      const tagesErrorRoh = sollProduktionDezimal - Math.round(sollProduktionDezimal)
      const fehlerGesamt = monatsFehlerVorher + tagesErrorRoh
      
      if (fehlerGesamt >= 0.5) {
        // Aufrunden weil Error zu groß
        planMenge = Math.ceil(sollProduktionDezimal)
        monatlicheFehlerTracker[monat] = fehlerGesamt - 1.0
        errorKorrekturAngewendet = true
      } else if (fehlerGesamt <= -0.5) {
        // Abrunden weil Error zu klein
        planMenge = Math.floor(sollProduktionDezimal)
        monatlicheFehlerTracker[monat] = fehlerGesamt + 1.0
        errorKorrekturAngewendet = true
      } else {
        // Normal runden
        planMenge = Math.round(sollProduktionDezimal)
        monatlicheFehlerTracker[monat] = fehlerGesamt
        errorKorrekturAngewendet = false
      }
      
      monatsFehlerNachher = monatlicheFehlerTracker[monat]
      tagesError = sollProduktionDezimal - planMenge
      
      // ✅ Ist-Menge: IDENTISCH mit Plan-Menge (perfekte Ausführung ohne Störungen)
      // Szenarien können später Abweichungen einführen (Maschinenausfall, etc.)
      // Für Basis-Plan: Ist = Plan (EXAKT! Keine künstliche Varianz)
      // WICHTIG: Durch Error Management ist planMenge bereits exakt auf Jahresproduktion abgestimmt
      istMenge = planMenge
    }
    
    const abweichung = istMenge - planMenge
    const materialVerfuegbar = istArbeitstag
    
    // ✅ KAPAZITÄTSAUSLASTUNG KORREKT BERECHNEN
    // Auslastung = Ist-Produktion / Maximale Kapazität (nicht Plan!)
    const kapazitaetProSchicht = 
      konfiguration.produktion.kapazitaetProStunde * 
      konfiguration.produktion.stundenProSchicht
    const schichten = istArbeitstag ? Math.ceil(istMenge / kapazitaetProSchicht) : 0
    
    // Maximale Kapazität = Anzahl Schichten × Kapazität pro Schicht
    const maxKapazitaet = schichten > 0 ? schichten * kapazitaetProSchicht : 0
    const auslastung = maxKapazitaet > 0 ? (istMenge / maxKapazitaet) * 100 : 0
    
    result.push({
      tag,
      datum,
      wochentag,
      monat,
      monatName: saisonInfo.nameKurz,
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
      kumulativPlan: 0, // Wird später berechnet
      kumulativIst: 0   // Wird später berechnet
    })
  }
  
  // Kumulative Werte berechnen
  let kumulativPlan = 0
  let kumulativIst = 0
  result.forEach(tag => {
    kumulativPlan += tag.planMenge
    kumulativIst += tag.istMenge
    tag.kumulativPlan = kumulativPlan
    tag.kumulativIst = kumulativIst
  })
  
  // ✅ VALIDIERUNG & FINALE KORREKTUR
  let summePlan = result.reduce((sum, tag) => sum + tag.planMenge, 0)
  let summeIst = result.reduce((sum, tag) => sum + tag.istMenge, 0)
  
  const differenz = summePlan - konfiguration.jahresproduktion
  
  if (differenz !== 0) {
    // ⚠️ Finale Korrektur: Verteile Differenz intelligent auf Arbeitstage
    console.warn(`⚠️ FINALE KORREKTUR: Summendifferenz ${differenz} Bikes wird korrigiert`)
    
    // Finde Arbeitstage mit höchster Produktion (am flexibelsten für Anpassung)
    const arbeitstage = result.filter(t => t.istArbeitstag)
    
    // Sortiere nach Plan-Menge (höchste zuerst) für gleichmäßigere Verteilung
    arbeitstage.sort((a, b) => b.planMenge - a.planMenge)
    
    let verbleibendeKorrektur = Math.abs(differenz)
    const korrekturRichtung = differenz > 0 ? -1 : +1 // Zu viel → -1, zu wenig → +1
    
    // Verteile Korrektur auf mehrere Tage (max. 1 pro Tag für gleichmäßige Verteilung)
    for (let i = 0; i < arbeitstage.length && verbleibendeKorrektur > 0; i++) {
      const tag = arbeitstage[i]
      
      // Korrigiere sowohl Plan als auch Ist (bleiben identisch!)
      tag.planMenge += korrekturRichtung
      tag.istMenge += korrekturRichtung
      tag.abweichung = 0 // Bleibt 0, da Ist = Plan
      
      verbleibendeKorrektur--
      
      // Update kumulative Werte für alle folgenden Tage
      const tagIndex = result.findIndex(t => t.tag === tag.tag)
      for (let j = tagIndex; j < result.length; j++) {
        result[j].kumulativPlan += korrekturRichtung
        result[j].kumulativIst += korrekturRichtung
      }
    }
    
    // Re-Berechnung nach Korrektur
    summePlan = result.reduce((sum, tag) => sum + tag.planMenge, 0)
    summeIst = result.reduce((sum, tag) => sum + tag.istMenge, 0)
    
    console.log(`✓ Nach Korrektur: Plan=${summePlan.toLocaleString('de-DE')}, Ist=${summeIst.toLocaleString('de-DE')} (Ziel: ${konfiguration.jahresproduktion.toLocaleString('de-DE')})`)
  }
  
  // ✅ FINALE VALIDIERUNG: MUSS exakt sein!
  if (summePlan !== konfiguration.jahresproduktion) {
    console.error(`❌ KRITISCHER FEHLER: Plan-Menge = ${summePlan}, Soll = ${konfiguration.jahresproduktion}, Differenz = ${summePlan - konfiguration.jahresproduktion} Bikes!`)
    throw new Error(`Error Management fehlgeschlagen: Jahresproduktion weicht um ${summePlan - konfiguration.jahresproduktion} Bikes ab!`)
  }
  
  if (summeIst !== konfiguration.jahresproduktion) {
    console.error(`❌ KRITISCHER FEHLER: Ist-Menge = ${summeIst}, Soll = ${konfiguration.jahresproduktion}, Differenz = ${summeIst - konfiguration.jahresproduktion} Bikes!`)
    throw new Error(`Ist-Produktion fehlerhaft: Weicht um ${summeIst - konfiguration.jahresproduktion} Bikes ab!`)
  }
  
  console.log(`✅ VALIDIERUNG ERFOLGREICH: Plan=${summePlan.toLocaleString('de-DE')}, Ist=${summeIst.toLocaleString('de-DE')} = Jahresproduktion=${konfiguration.jahresproduktion.toLocaleString('de-DE')} Bikes (100,00% Exakt!)`)
  
  
  return result
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PRODUKTIONSPLANUNG FÜR VARIANTEN
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Generiert Produktionsplan für eine bestimmte MTB-Variante
 * 
 * @param konfiguration - KonfigurationData aus Context
 * @param varianteId - ID der Variante (z.B. "MTBAllrounder")
 * @returns VariantenProduktionsplan mit 365 Tagen
 */
export function generiereVariantenProduktionsplan(
  konfiguration: KonfigurationData,
  varianteId: string
): VariantenProduktionsplan | null {
  const variante = konfiguration.varianten.find(v => v.id === varianteId)
  if (!variante) return null
  
  const jahresProduktion = Math.round(konfiguration.jahresproduktion * variante.anteilPrognose)
  
  // Erstelle Konfiguration nur für diese Variante
  const varianteKonfiguration: KonfigurationData = {
    ...konfiguration,
    jahresproduktion: jahresProduktion
  }
  
  const tage = generiereTagesproduktion(varianteKonfiguration)
  const jahresProduktionIst = tage.reduce((sum, t) => sum + t.istMenge, 0)
  
  return {
    varianteId: variante.id,
    varianteName: variante.name,
    jahresProduktion,
    jahresProduktionIst,
    abweichung: jahresProduktionIst - jahresProduktion,
    tage
  }
}

/**
 * Generiert Produktionspläne für ALLE 8 MTB-Varianten
 * 
 * @param konfiguration - KonfigurationData aus Context
 * @returns Record<varianteId, VariantenProduktionsplan>
 */
export function generiereAlleVariantenProduktionsplaene(
  konfiguration: KonfigurationData
): Record<string, VariantenProduktionsplan> {
  const plaene: Record<string, VariantenProduktionsplan> = {}
  
  konfiguration.varianten.forEach(variante => {
    const plan = generiereVariantenProduktionsplan(konfiguration, variante.id)
    if (plan) {
      plaene[variante.id] = plan
    }
  })
  
  return plaene
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAGERBESTANDS-BERECHNUNG
 * ═══════════════════════════════════════════════════════════════════════════════
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

/**
 * Berechnet Lagerbestände basierend auf Produktionsplan
 * 
 * ✅ ERMÄSSIGUNG: Nur 4 Sattel-Varianten
 * 
 * @param konfiguration - KonfigurationData aus Context
 * @returns Array von Lagerbestand-Informationen
 */
export function berechneLagerbestaende(
  konfiguration: KonfigurationData
): LagerbestandInfo[] {
  // Berechne Jahresproduktion pro Variante
  const variantenProduktion: Record<string, number> = {}
  konfiguration.varianten.forEach(v => {
    variantenProduktion[v.id] = Math.round(konfiguration.jahresproduktion * v.anteilPrognose)
  })
  
  // Berechne Bedarf für jede Komponente
  const komponentenBedarf: Record<string, {
    jahresbedarf: number
    verwendung: string[]
    name: string
  }> = {}
  
  // Initialisiere mit allen Bauteilen
  konfiguration.bauteile.forEach(bauteil => {
    komponentenBedarf[bauteil.id] = {
      jahresbedarf: 0,
      verwendung: [],
      name: bauteil.name
    }
  })
  
  // Berechne Jahresbedarf basierend auf Stückliste
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
  
  // Generiere Lagerbestände
  const lagerbestaende: LagerbestandInfo[] = []
  
  Object.entries(komponentenBedarf).forEach(([bauteilId, info]) => {
    if (info.jahresbedarf === 0) return // Keine Verwendung
    
    const tagesbedarf = Math.round(info.jahresbedarf / 365)
    const sicherheit = Math.round(info.jahresbedarf / 365 * 7) // 7 Tage Puffer
    const bestand = Math.round(info.jahresbedarf * 0.35) // 35% Lagerbestand
    
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

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAGERBESTANDS-BERECHNUNG AUF TAGESBASIS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface TagesLagerbestand {
  tag: number
  datum: Date
  wochentag: string
  monat: number
  istArbeitstag: boolean
  
  // Pro Bauteil
  bauteile: {
    bauteilId: string
    bauteilName: string
    anfangsBestand: number
    zugang: number          // Lieferungen von Zulieferer
    verbrauch: number       // Produktion (= Bikes produziert × 1)
    endBestand: number      // anfang + zugang - verbrauch
    sicherheit: number
    verfuegbar: number      // endBestand - sicherheit
    reichweite: number      // verfuegbar / durchschnittlicher Tagesbedarf
    status: 'ok' | 'niedrig' | 'kritisch'
  }[]
}

/**
 * Berechnet Lagerbestandsentwicklung über 365 Tage
 * 
 * Simuliert Lagerbewegungen:
 * - Anfangsbestand am 01.01.2027
 * - Zugänge durch Lieferungen (vereinfacht: konstante Nachlieferung)
 * - Abgänge durch Produktion (1:1 Stückliste)
 * 
 * @param konfiguration - KonfigurationData aus Context
 * @param tagesProduktion - Produktionsplan (für Verbrauch)
 * @returns Array mit 365 Tagen Lagerbeständen
 */
export function berechneTagesLagerbestaende(
  konfiguration: KonfigurationData,
  tagesProduktion: TagesProduktionEntry[]
): TagesLagerbestand[] {
  // Berechne Jahresbedarfe pro Bauteil
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
  
  // Tagesbedarfe berechnen
  Object.keys(bauteilBedarfe).forEach(bauteilId => {
    const info = bauteilBedarfe[bauteilId]
    info.tagesbedarf = Math.round(info.jahresbedarf / 365)
  })
  
  // Anfangsbestände (35% des Jahresbedarfs als Startlager)
  const aktuelleBestaende: Record<string, number> = {}
  Object.keys(bauteilBedarfe).forEach(bauteilId => {
    const jahresbedarf = bauteilBedarfe[bauteilId].jahresbedarf
    aktuelleBestaende[bauteilId] = Math.round(jahresbedarf * 0.35)
  })
  
  // Simuliere Lagerbewegungen über 365 Tage
  const result: TagesLagerbestand[] = []
  
  tagesProduktion.forEach((tag, index) => {
    const bauteileStatus: TagesLagerbestand['bauteile'] = []
    
    konfiguration.bauteile.forEach(bauteil => {
      const bauteilId = bauteil.id
      const info = bauteilBedarfe[bauteilId]
      
      if (!info || info.jahresbedarf === 0) return
      
      const anfangsBestand = aktuelleBestaende[bauteilId]
      
      // Vereinfachte Zugangslogik: Konstante Nachlieferung (Tagesbedarf × 1.1 für Buffer)
      // In Realität würde hier die Inbound-Logik mit Losgrößen 500 und Vorlaufzeit 49 Tage greifen
      const zugang = tag.istArbeitstag ? Math.round(info.tagesbedarf * 1.1) : 0
      
      // Verbrauch = Produktion an diesem Tag × Stücklistenmenge (1:1)
      // Berechne wie viele Bikes diese Komponente benötigen
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
      
      const sicherheit = Math.round(info.tagesbedarf * 7) // 7 Tage Sicherheit
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
 * ═══════════════════════════════════════════════════════════════════════════════
 * STATISTIKEN
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Berechnet Produktionsstatistiken
 * 
 * @param tagesProduktion - Array von TagesProduktionEntry
 * @returns Statistiken
 */
export function berechneProduktionsStatistiken(tagesProduktion: TagesProduktionEntry[]) {
  const geplant = tagesProduktion.reduce((sum, tag) => sum + tag.planMenge, 0)
  const produziert = tagesProduktion.reduce((sum, tag) => sum + tag.istMenge, 0)
  const arbeitstage = tagesProduktion.filter(tag => tag.istArbeitstag).length
  const schichtenGesamt = tagesProduktion.reduce((sum, tag) => sum + tag.schichten, 0)
  const planerfuellungsgrad = geplant > 0 ? (produziert / geplant) * 100 : 0
  
  // Tage mit Materialmangel (TODO: Aus ATP-Check)
  const mitMaterialmangel = tagesProduktion.filter(tag => !tag.materialVerfuegbar).length
  
  // Durchschnittliche Auslastung
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
