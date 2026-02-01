/**
 * ========================================
 * PROGRAMM AGGREGATION HELPERS
 * ========================================
 * 
 * Funktionen zur Aggregation von Tagesproduktionsdaten:
 * - Tag → Woche (KW 1-52)
 * - Tag → Monat (Jan-Dez)
 * 
 * WICHTIG: Error Management wird bei Aggregation beibehalten!
 * Die Summen müssen exakt mit den Jahressummen übereinstimmen.
 * 
 * VERWENDUNG:
 * - aggregiereNachWoche(tagesProduktion)
 * - aggregiereNachMonat(tagesProduktion)
 * - aggregiereAlleVariantenNachWoche(variantenPlaene)
 * - aggregiereAlleVariantenNachMonat(variantenPlaene)
 */

import { TagesProduktionEntry } from '@/lib/calculations/zentrale-produktionsplanung'

/**
 * Wochenproduktion Entry
 */
export interface WochenProduktionEntry {
  kalenderwoche: number
  jahr: number
  startDatum: Date
  endDatum: Date
  anzahlTage: number
  anzahlArbeitstage: number
  sollProduktion: number
  planMenge: number
  istMenge: number
  error: number
  kumulativPlan: number
  kumulativIst: number
}

/**
 * Monatsproduktion Entry
 */
export interface MonatsProduktionEntry {
  monat: number
  monatName: string
  jahr: number
  anzahlTage: number
  anzahlArbeitstage: number
  sollProduktion: number
  planMenge: number
  istMenge: number
  error: number
  kumulativPlan: number
  kumulativIst: number
}

/**
 * Aggregiert Tagesproduktion zu Wochenproduktion (KW 1-52)
 */
export function aggregiereNachWoche(
  tagesProduktion: TagesProduktionEntry[]
): WochenProduktionEntry[] {
  // Gruppiere nach Kalenderwoche
  const wochenMap = new Map<number, TagesProduktionEntry[]>()
  
  tagesProduktion.forEach(tag => {
    const kw = tag.kalenderwoche
    if (!wochenMap.has(kw)) {
      wochenMap.set(kw, [])
    }
    wochenMap.get(kw)!.push(tag)
  })
  
  // Erstelle Wochen-Einträge
  const wochen: WochenProduktionEntry[] = []
  
  // Sortiere KWs
  const kws = Array.from(wochenMap.keys()).sort((a, b) => a - b)
  
  kws.forEach(kw => {
    const tage = wochenMap.get(kw)!
    
    // Sortiere Tage nach Datum
    tage.sort((a, b) => a.tag - b.tag)
    
    const startDatum = tage[0].datum
    const endDatum = tage[tage.length - 1].datum
    const jahr = tage[0].datum.getFullYear()
    
    // FILTER: Überspringe KW 53 wenn sie nur die ersten Tage im Januar enthält
    // (ISO 8601 weist Jan 1-3 manchmal der KW 53 des Vorjahres zu)
    // Da wir nur 2027 planen, ist diese "KW 53" verwirrend und sollte als KW 1 behandelt werden
    if (kw === 53 && startDatum.getMonth() === 0 && startDatum.getDate() <= 3) {
      // Diese Tage gehören eigentlich zu KW 1 des Planungsjahres
      // Sie wurden bereits bei der Berechnung in die Jahressumme einbezogen
      // und werden in der Tagesansicht korrekt dargestellt
      return
    }
    
    const anzahlTage = tage.length
    const anzahlArbeitstage = tage.filter(t => t.istArbeitstag).length
    
    // Summen berechnen
    const sollProduktion = tage.reduce((sum, t) => sum + t.sollProduktionDezimal, 0)
    const planMenge = tage.reduce((sum, t) => sum + t.planMenge, 0)
    const istMenge = tage.reduce((sum, t) => sum + t.istMenge, 0)
    
    // Error: Letzter Fehler der Woche (kumulativ innerhalb der Woche)
    const error = tage[tage.length - 1].monatsFehlerNachher
    
    // Kumulative Werte: Letzter Tag der Woche hat die aktuellen kumulativen Werte
    const kumulativPlan = tage[tage.length - 1].kumulativPlan
    const kumulativIst = tage[tage.length - 1].kumulativIst
    
    wochen.push({
      kalenderwoche: kw,
      jahr,
      startDatum,
      endDatum,
      anzahlTage,
      anzahlArbeitstage,
      sollProduktion,
      planMenge,
      istMenge,
      error,
      kumulativPlan,
      kumulativIst
    })
  })
  
  return wochen
}

/**
 * Aggregiert Tagesproduktion zu Monatsproduktion (Jan-Dez)
 */
export function aggregiereNachMonat(
  tagesProduktion: TagesProduktionEntry[]
): MonatsProduktionEntry[] {
  // Gruppiere nach Monat
  const monatsMap = new Map<number, TagesProduktionEntry[]>()
  
  tagesProduktion.forEach(tag => {
    const monat = tag.monat
    if (!monatsMap.has(monat)) {
      monatsMap.set(monat, [])
    }
    monatsMap.get(monat)!.push(tag)
  })
  
  // Monatsnamen
  const monatNamen = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ]
  
  // Erstelle Monats-Einträge
  const monate: MonatsProduktionEntry[] = []
  
  // Sortiere Monate 1-12
  const monatsNummern = Array.from(monatsMap.keys()).sort((a, b) => a - b)
  
  monatsNummern.forEach(monat => {
    const tage = monatsMap.get(monat)!
    
    // Sortiere Tage nach Datum
    tage.sort((a, b) => a.tag - b.tag)
    
    const jahr = tage[0].datum.getFullYear()
    const monatName = monatNamen[monat - 1]
    
    const anzahlTage = tage.length
    const anzahlArbeitstage = tage.filter(t => t.istArbeitstag).length
    
    // Summen berechnen
    const sollProduktion = tage.reduce((sum, t) => sum + t.sollProduktionDezimal, 0)
    const planMenge = tage.reduce((sum, t) => sum + t.planMenge, 0)
    const istMenge = tage.reduce((sum, t) => sum + t.istMenge, 0)
    
    // Error: Letzter Fehler des Monats (kumulativ)
    const error = tage[tage.length - 1].monatsFehlerNachher
    
    // Kumulative Werte: Letzter Tag des Monats
    const kumulativPlan = tage[tage.length - 1].kumulativPlan
    const kumulativIst = tage[tage.length - 1].kumulativIst
    
    monate.push({
      monat,
      monatName,
      jahr,
      anzahlTage,
      anzahlArbeitstage,
      sollProduktion,
      planMenge,
      istMenge,
      error,
      kumulativPlan,
      kumulativIst
    })
  })
  
  return monate
}

/**
 * Aggregiert alle Varianten nach Woche
 */
export function aggregiereAlleVariantenNachWoche(
  variantenPlaene: Record<string, TagesProduktionEntry[]>
): Record<string, WochenProduktionEntry[]> {
  const result: Record<string, WochenProduktionEntry[]> = {}
  
  Object.entries(variantenPlaene).forEach(([varianteId, tagesProduktion]) => {
    result[varianteId] = aggregiereNachWoche(tagesProduktion)
  })
  
  return result
}

/**
 * Aggregiert alle Varianten nach Monat
 */
export function aggregiereAlleVariantenNachMonat(
  variantenPlaene: Record<string, TagesProduktionEntry[]>
): Record<string, MonatsProduktionEntry[]> {
  const result: Record<string, MonatsProduktionEntry[]> = {}
  
  Object.entries(variantenPlaene).forEach(([varianteId, tagesProduktion]) => {
    result[varianteId] = aggregiereNachMonat(tagesProduktion)
  })
  
  return result
}

/**
 * Konsolidiert alle Varianten für eine Ansicht (Tag)
 * Fügt Variante als Spalte hinzu
 */
export interface KonsolidierterTagesEintrag extends TagesProduktionEntry {
  varianteId: string
  varianteName: string
}

export function konsolidiereAlleVariantenTage(
  variantenPlaene: Record<string, TagesProduktionEntry[]>,
  variantenNamen: Record<string, string>
): KonsolidierterTagesEintrag[] {
  const result: KonsolidierterTagesEintrag[] = []
  
  Object.entries(variantenPlaene).forEach(([varianteId, tagesProduktion]) => {
    tagesProduktion.forEach(tag => {
      result.push({
        ...tag,
        varianteId,
        varianteName: variantenNamen[varianteId] || varianteId
      })
    })
  })
  
  // Sortiere nach Datum, dann Variante
  result.sort((a, b) => {
    if (a.tag !== b.tag) return a.tag - b.tag
    return a.varianteId.localeCompare(b.varianteId)
  })
  
  return result
}

/**
 * Konsolidiert alle Varianten für Wochenansicht
 */
export interface KonsolidierterWochenEintrag extends WochenProduktionEntry {
  varianteId: string
  varianteName: string
}

export function konsolidiereAlleVariantenWochen(
  variantenWochenPlaene: Record<string, WochenProduktionEntry[]>,
  variantenNamen: Record<string, string>
): KonsolidierterWochenEintrag[] {
  const result: KonsolidierterWochenEintrag[] = []
  
  Object.entries(variantenWochenPlaene).forEach(([varianteId, wochenProduktion]) => {
    wochenProduktion.forEach(woche => {
      result.push({
        ...woche,
        varianteId,
        varianteName: variantenNamen[varianteId] || varianteId
      })
    })
  })
  
  // Sortiere nach KW, dann Variante
  result.sort((a, b) => {
    if (a.kalenderwoche !== b.kalenderwoche) return a.kalenderwoche - b.kalenderwoche
    return a.varianteId.localeCompare(b.varianteId)
  })
  
  return result
}

/**
 * Konsolidiert alle Varianten für Monatsansicht
 */
export interface KonsolidierterMonatsEintrag extends MonatsProduktionEntry {
  varianteId: string
  varianteName: string
}

export function konsolidiereAlleVariantenMonate(
  variantenMonatsPlaene: Record<string, MonatsProduktionEntry[]>,
  variantenNamen: Record<string, string>
): KonsolidierterMonatsEintrag[] {
  const result: KonsolidierterMonatsEintrag[] = []
  
  Object.entries(variantenMonatsPlaene).forEach(([varianteId, monatsProduktion]) => {
    monatsProduktion.forEach(monat => {
      result.push({
        ...monat,
        varianteId,
        varianteName: variantenNamen[varianteId] || varianteId
      })
    })
  })
  
  // Sortiere nach Monat, dann Variante
  result.sort((a, b) => {
    if (a.monat !== b.monat) return a.monat - b.monat
    return a.varianteId.localeCompare(b.varianteId)
  })
  
  return result
}
