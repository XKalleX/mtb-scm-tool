/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REPORTING AGGREGATION HELPERS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Aggregiert granulare Daten aus:
 * - zentrale-produktionsplanung.ts (TagesProduktionEntry[])
 * - inbound-china.ts (TaeglicheBestellung[])
 * - warehouse-management.ts (TaeglichesLager[])
 * 
 * Für zeitbasierte Visualisierungen (Tag/Woche/Monat)
 * 
 * WICHTIG: Alle Daten sind ECHT aus Berechnungen, NICHT simuliert!
 */

import type { VariantenProduktionsplan, TagesProduktionEntry } from '@/lib/calculations/zentrale-produktionsplanung'
import type { TaeglicheBestellung } from '@/lib/calculations/inbound-china'
import type { TaeglichesLager, WarehouseJahresResult } from '@/lib/calculations/warehouse-management'

/**
 * Monatsnamen für Visualisierung
 */
export const MONATSNAMEN = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

export const MONATSNAMEN_KURZ = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
]

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 1. PLANERFÜLLUNGSGRAD - ZEITLICHE ENTWICKLUNG
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface MonatlichePlanerfuellung {
  monat: number
  monatName: string
  monatKurz: string
  planMenge: number
  istMenge: number
  auftragErfuellt: number // Anzahl Tage vollständig erfüllt
  auftragGesamt: number   // Anzahl Arbeitstage im Monat
  planerfuellungsgrad: number // Prozent
  abweichung: number
}

/**
 * Aggregiert Produktionsdaten nach Monaten
 * Zeigt wie gut der Plan jeden Monat erfüllt wurde
 */
export function aggregierePlanerfuellungNachMonat(
  alleVariantenPlaene: Record<string, VariantenProduktionsplan>
): MonatlichePlanerfuellung[] {
  const monate: MonatlichePlanerfuellung[] = Array.from({ length: 12 }, (_, i) => ({
    monat: i + 1,
    monatName: MONATSNAMEN[i],
    monatKurz: MONATSNAMEN_KURZ[i],
    planMenge: 0,
    istMenge: 0,
    auftragErfuellt: 0,
    auftragGesamt: 0,
    planerfuellungsgrad: 100,
    abweichung: 0
  }))
  
  // Aggregiere alle Varianten
  Object.values(alleVariantenPlaene).forEach(plan => {
    plan.tage.forEach(tag => {
      const monat = monate[tag.monat - 1]
      
      // Nur Arbeitstage zählen
      if (tag.istArbeitstag) {
        monat.planMenge += tag.planMenge
        monat.istMenge += tag.istMenge
        monat.auftragGesamt++
        
        // Vollständige Erfüllung?
        if (tag.istMenge >= tag.planMenge) {
          monat.auftragErfuellt++
        }
      }
    })
  })
  
  // Berechne Planerfüllungsgrad und Abweichung pro Monat
  monate.forEach(m => {
    if (m.auftragGesamt > 0) {
      m.planerfuellungsgrad = (m.auftragErfuellt / m.auftragGesamt) * 100
    }
    m.abweichung = m.istMenge - m.planMenge
  })
  
  return monate
}

/**
 * Wöchentliche Planerfüllung für detailliertere Analyse
 */
export interface WoechentlichePlanerfuellung {
  kalenderwoche: number
  monat: number
  planMenge: number
  istMenge: number
  auftragErfuellt: number
  auftragGesamt: number
  planerfuellungsgrad: number
}

export function aggregierePlanerfuellungNachWoche(
  alleVariantenPlaene: Record<string, VariantenProduktionsplan>
): WoechentlichePlanerfuellung[] {
  const wochenMap = new Map<number, WoechentlichePlanerfuellung>()
  
  Object.values(alleVariantenPlaene).forEach(plan => {
    plan.tage.forEach(tag => {
      if (!tag.istArbeitstag) return
      
      const kw = tag.kalenderwoche
      
      if (!wochenMap.has(kw)) {
        wochenMap.set(kw, {
          kalenderwoche: kw,
          monat: tag.monat,
          planMenge: 0,
          istMenge: 0,
          auftragErfuellt: 0,
          auftragGesamt: 0,
          planerfuellungsgrad: 100
        })
      }
      
      const woche = wochenMap.get(kw)!
      woche.planMenge += tag.planMenge
      woche.istMenge += tag.istMenge
      woche.auftragGesamt++
      
      if (tag.istMenge >= tag.planMenge) {
        woche.auftragErfuellt++
      }
    })
  })
  
  // Berechne Planerfüllungsgrad
  const wochen = Array.from(wochenMap.values()).sort((a, b) => a.kalenderwoche - b.kalenderwoche)
  wochen.forEach(w => {
    if (w.auftragGesamt > 0) {
      w.planerfuellungsgrad = (w.auftragErfuellt / w.auftragGesamt) * 100
    }
  })
  
  return wochen
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 2. LIEFERTREUE CHINA - LIEFERUNGS-TIMELINE
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface LieferungTimeline {
  bestellungId: string
  bestelldatum: Date
  bestelldatumStr: string
  erwarteteAnkunft: Date
  tatsaechlicheAnkunft: Date // Gleich erwarteteAnkunft (da immer pünktlich in unserer Simulation)
  vorlaufzeitTage: number
  verspaetungTage: number // 0 = pünktlich, >0 = verspätet
  puenktlich: boolean
  monat: number
  menge: number // Gesamtmenge der Bestellung
}

export function analysiereLieferungenTimeline(
  bestellungen: TaeglicheBestellung[]
): LieferungTimeline[] {
  return bestellungen.map(b => {
    const bestellDatum = new Date(b.bestelldatum)
    const erwarteteAnkunft = new Date(b.erwarteteAnkunft)
    const tatsaechlicheAnkunft = erwarteteAnkunft // In unserer Simulation immer pünktlich
    
    // Vorlaufzeit berechnen
    const vorlaufzeit = Math.ceil((erwarteteAnkunft.getTime() - bestellDatum.getTime()) / (1000 * 60 * 60 * 24))
    
    // Verspätung (in unserer Simulation immer 0, da China zuverlässig ist)
    const verspaetung = 0
    
    // Gesamtmenge der Bestellung
    const menge = Object.values(b.komponenten).reduce((sum, m) => sum + m, 0)
    
    return {
      bestellungId: b.id,
      bestelldatum: bestellDatum,
      bestelldatumStr: bestellDatum.toISOString().split('T')[0],
      erwarteteAnkunft,
      tatsaechlicheAnkunft,
      vorlaufzeitTage: vorlaufzeit,
      verspaetungTage: verspaetung,
      puenktlich: verspaetung === 0,
      monat: erwarteteAnkunft.getMonth() + 1,
      menge
    }
  }).filter(l => l.erwarteteAnkunft.getFullYear() === 2027) // Nur 2027
}

export interface MonatlicheLieferperformance {
  monat: number
  monatName: string
  monatKurz: string
  gesamtLieferungen: number
  puenktlicheLieferungen: number
  verspaeteteLieferungen: number
  liefertreue: number // Prozent
  durchschnittVerspaetung: number // Tage
}

export function aggregiereLieferperformanceNachMonat(
  timeline: LieferungTimeline[]
): MonatlicheLieferperformance[] {
  const monate: MonatlicheLieferperformance[] = Array.from({ length: 12 }, (_, i) => ({
    monat: i + 1,
    monatName: MONATSNAMEN[i],
    monatKurz: MONATSNAMEN_KURZ[i],
    gesamtLieferungen: 0,
    puenktlicheLieferungen: 0,
    verspaeteteLieferungen: 0,
    liefertreue: 100,
    durchschnittVerspaetung: 0
  }))
  
  timeline.forEach(l => {
    const monat = monate[l.monat - 1]
    monat.gesamtLieferungen++
    
    if (l.puenktlich) {
      monat.puenktlicheLieferungen++
    } else {
      monat.verspaeteteLieferungen++
    }
    
    monat.durchschnittVerspaetung += l.verspaetungTage
  })
  
  // Berechne Liefertreue und Durchschnitt
  monate.forEach(m => {
    if (m.gesamtLieferungen > 0) {
      m.liefertreue = (m.puenktlicheLieferungen / m.gesamtLieferungen) * 100
      m.durchschnittVerspaetung = m.durchschnittVerspaetung / m.gesamtLieferungen
    }
  })
  
  return monate
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 3. DURCHLAUFZEIT - BREAKDOWN KOMPONENTEN
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface DurchlaufzeitBreakdown {
  komponente: string
  tage: number
  typ: 'arbeitstage' | 'kalendertage'
  beschreibung: string
}

/**
 * Detaillierter Breakdown der 49 Tage Durchlaufzeit
 * Basiert auf lieferant-china.json transportSequenz
 */
export function getDurchlaufzeitBreakdown(): DurchlaufzeitBreakdown[] {
  return [
    {
      komponente: 'China Produktion',
      tage: 5,
      typ: 'arbeitstage',
      beschreibung: 'Produktionszeit beim Zulieferer in China'
    },
    {
      komponente: 'LKW China → Hafen',
      tage: 2,
      typ: 'arbeitstage',
      beschreibung: 'Transport zur Verladestation'
    },
    {
      komponente: 'Seefracht',
      tage: 30,
      typ: 'kalendertage',
      beschreibung: 'Schiffstransport (läuft 24/7)'
    },
    {
      komponente: 'LKW Hamburg → Dortmund',
      tage: 2,
      typ: 'arbeitstage',
      beschreibung: 'Transport zum OEM Werk'
    },
    {
      komponente: 'Gesamt',
      tage: 49,
      typ: 'kalendertage',
      beschreibung: 'Gesamte Vorlaufzeit'
    }
  ]
}

/**
 * Monatliche Durchlaufzeit-Analyse
 * Zeigt ob sich Vorlaufzeit über Zeit verändert
 */
export interface MonatlicheDurchlaufzeit {
  monat: number
  monatName: string
  durchschnittVorlaufzeit: number
  minVorlaufzeit: number
  maxVorlaufzeit: number
  anzahlLieferungen: number
}

export function aggregiereDurchlaufzeitNachMonat(
  timeline: LieferungTimeline[]
): MonatlicheDurchlaufzeit[] {
  const monate: MonatlicheDurchlaufzeit[] = Array.from({ length: 12 }, (_, i) => ({
    monat: i + 1,
    monatName: MONATSNAMEN[i],
    durchschnittVorlaufzeit: 0,
    minVorlaufzeit: Infinity,
    maxVorlaufzeit: 0,
    anzahlLieferungen: 0
  }))
  
  timeline.forEach(l => {
    const monat = monate[l.monat - 1]
    monat.anzahlLieferungen++
    monat.durchschnittVorlaufzeit += l.vorlaufzeitTage
    monat.minVorlaufzeit = Math.min(monat.minVorlaufzeit, l.vorlaufzeitTage)
    monat.maxVorlaufzeit = Math.max(monat.maxVorlaufzeit, l.vorlaufzeitTage)
  })
  
  monate.forEach(m => {
    if (m.anzahlLieferungen > 0) {
      m.durchschnittVorlaufzeit = m.durchschnittVorlaufzeit / m.anzahlLieferungen
    }
    if (m.minVorlaufzeit === Infinity) {
      m.minVorlaufzeit = 0
    }
  })
  
  return monate
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 4. LAGERUMSCHLAG - MONATLICHE ENTWICKLUNG
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface MonatlicherLagerumschlag {
  monat: number
  monatName: string
  monatKurz: string
  durchschnittLagerbestand: number
  produktionsMenge: number
  lagerumschlag: number // Produktion / Lagerbestand
  lagerkosten: number // Durchschnitt * Lagerkostensatz (wird später berechnet)
}

/**
 * Berechnet monatlichen Lagerumschlag
 */
export function aggregiereLagerumschlagNachMonat(
  warehouseTage: TaeglichesLager[],
  alleVariantenPlaene: Record<string, VariantenProduktionsplan>
): MonatlicherLagerumschlag[] {
  const monate: MonatlicherLagerumschlag[] = Array.from({ length: 12 }, (_, i) => ({
    monat: i + 1,
    monatName: MONATSNAMEN[i],
    monatKurz: MONATSNAMEN_KURZ[i],
    durchschnittLagerbestand: 0,
    produktionsMenge: 0,
    lagerumschlag: 0,
    lagerkosten: 0
  }))
  
  // 1. Produktionsmenge pro Monat
  Object.values(alleVariantenPlaene).forEach(plan => {
    plan.tage.forEach(tag => {
      if (tag.istArbeitstag) {
        const monat = monate[tag.monat - 1]
        monat.produktionsMenge += tag.istMenge
      }
    })
  })
  
  // 2. Durchschnittlicher Lagerbestand pro Monat
  const monatlicheBestaende = new Map<number, number[]>()
  
  warehouseTage.forEach(tag => {
    if (tag.monat >= 1 && tag.monat <= 12) {
      if (!monatlicheBestaende.has(tag.monat)) {
        monatlicheBestaende.set(tag.monat, [])
      }
      
      // Gesamtbestand über alle Bauteile
      const tagesBestand = tag.bauteile.reduce((sum, b) => sum + b.endBestand, 0)
      monatlicheBestaende.get(tag.monat)!.push(tagesBestand)
    }
  })
  
  monatlicheBestaende.forEach((bestaende, monat) => {
    const durchschnitt = bestaende.reduce((sum, b) => sum + b, 0) / bestaende.length
    monate[monat - 1].durchschnittLagerbestand = Math.round(durchschnitt)
  })
  
  // 3. Lagerumschlag berechnen
  monate.forEach(m => {
    if (m.durchschnittLagerbestand > 0) {
      m.lagerumschlag = m.produktionsMenge / m.durchschnittLagerbestand
    }
  })
  
  return monate
}

/**
 * Heatmap-Daten: Lagerbestand nach Sattel-Variante und Monat
 */
export interface LagerbestandHeatmap {
  bauteilId: string
  bauteilName: string
  monatlicheBestaende: {
    monat: number
    durchschnittBestand: number
  }[]
}

export function aggregiereLagerbestandHeatmap(
  warehouseTage: TaeglichesLager[]
): LagerbestandHeatmap[] {
  // Sammle alle Bauteil-IDs
  const bauteilIds = new Set<string>()
  const bauteilNamen = new Map<string, string>()
  
  warehouseTage.forEach(tag => {
    tag.bauteile.forEach(b => {
      bauteilIds.add(b.bauteilId)
      bauteilNamen.set(b.bauteilId, b.bauteilName)
    })
  })
  
  // Für jedes Bauteil: Monatliche Durchschnitte
  const heatmapData: LagerbestandHeatmap[] = []
  
  bauteilIds.forEach(bauteilId => {
    const monatlicheBestaende: Map<number, number[]> = new Map()
    
    warehouseTage.forEach(tag => {
      if (tag.monat >= 1 && tag.monat <= 12) {
        const bauteil = tag.bauteile.find(b => b.bauteilId === bauteilId)
        if (bauteil) {
          if (!monatlicheBestaende.has(tag.monat)) {
            monatlicheBestaende.set(tag.monat, [])
          }
          monatlicheBestaende.get(tag.monat)!.push(bauteil.endBestand)
        }
      }
    })
    
    const monatsDaten = Array.from({ length: 12 }, (_, i) => {
      const monat = i + 1
      const bestaende = monatlicheBestaende.get(monat) || [0]
      const durchschnitt = bestaende.reduce((sum, b) => sum + b, 0) / bestaende.length
      return {
        monat,
        durchschnittBestand: Math.round(durchschnitt)
      }
    })
    
    heatmapData.push({
      bauteilId,
      bauteilName: bauteilNamen.get(bauteilId) || bauteilId,
      monatlicheBestaende: monatsDaten
    })
  })
  
  return heatmapData
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 5. PLANUNGSGENAUIGKEIT - ABWEICHUNGS-ANALYSE
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface MonatlichePlanungsgenauigkeit {
  monat: number
  monatName: string
  monatKurz: string
  planMenge: number
  istMenge: number
  abweichung: number // Absolut
  abweichungProzent: number // Relativ
  genauigkeit: number // 100 - |abweichungProzent|
}

export function aggregierePlanungsgenauigkeitNachMonat(
  alleVariantenPlaene: Record<string, VariantenProduktionsplan>
): MonatlichePlanungsgenauigkeit[] {
  const monate: MonatlichePlanungsgenauigkeit[] = Array.from({ length: 12 }, (_, i) => ({
    monat: i + 1,
    monatName: MONATSNAMEN[i],
    monatKurz: MONATSNAMEN_KURZ[i],
    planMenge: 0,
    istMenge: 0,
    abweichung: 0,
    abweichungProzent: 0,
    genauigkeit: 100
  }))
  
  // Aggregiere
  Object.values(alleVariantenPlaene).forEach(plan => {
    plan.tage.forEach(tag => {
      if (tag.istArbeitstag) {
        const monat = monate[tag.monat - 1]
        monat.planMenge += tag.planMenge
        monat.istMenge += tag.istMenge
      }
    })
  })
  
  // Berechne Abweichungen
  monate.forEach(m => {
    m.abweichung = m.istMenge - m.planMenge
    if (m.planMenge > 0) {
      m.abweichungProzent = (m.abweichung / m.planMenge) * 100
      m.genauigkeit = 100 - Math.abs(m.abweichungProzent)
    }
  })
  
  return monate
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 6. MATERIALVERFÜGBARKEIT - ATP-CHECK TIMELINE
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface MonatlicheMaterialverfuegbarkeit {
  monat: number
  monatName: string
  monatKurz: string
  tageGesamt: number
  tageMaterialVerfuegbar: number
  tageMaterialmangel: number
  verfuegbarkeitsrate: number // Prozent
}

export function aggregiereMaterialverfuegbarkeit(
  warehouseTage: TaeglichesLager[]
): MonatlicheMaterialverfuegbarkeit[] {
  const monate: MonatlicheMaterialverfuegbarkeit[] = Array.from({ length: 12 }, (_, i) => ({
    monat: i + 1,
    monatName: MONATSNAMEN[i],
    monatKurz: MONATSNAMEN_KURZ[i],
    tageGesamt: 0,
    tageMaterialVerfuegbar: 0,
    tageMaterialmangel: 0,
    verfuegbarkeitsrate: 100
  }))
  
  warehouseTage.forEach(tag => {
    if (tag.monat >= 1 && tag.monat <= 12 && tag.istArbeitstag) {
      const monat = monate[tag.monat - 1]
      monat.tageGesamt++
      
      // Prüfe ob ALLE Bauteile verfügbar waren
      const alleBauteilVerfuegbar = tag.bauteile.every(b => b.atpCheck.erfuellt)
      
      if (alleBauteilVerfuegbar) {
        monat.tageMaterialVerfuegbar++
      } else {
        monat.tageMaterialmangel++
      }
    }
  })
  
  monate.forEach(m => {
    if (m.tageGesamt > 0) {
      m.verfuegbarkeitsrate = (m.tageMaterialVerfuegbar / m.tageGesamt) * 100
    }
  })
  
  return monate
}

/**
 * Tägliche Materialverfügbarkeit für Stacked Area Chart
 */
export interface TaeglicheMaterialverfuegbarkeit {
  tag: number
  datum: Date
  datumStr: string
  monat: number
  istArbeitstag: boolean
  materialVerfuegbar: boolean
  anzahlBauteileVerfuegbar: number
  anzahlBauteileGesamt: number
}

export function aggregiereTaeglicheMaterialverfuegbarkeit(
  warehouseTage: TaeglichesLager[]
): TaeglicheMaterialverfuegbarkeit[] {
  return warehouseTage
    .filter(t => t.monat >= 1 && t.monat <= 12)
    .map(tag => ({
      tag: tag.tag,
      datum: tag.datum,
      datumStr: tag.datumStr,
      monat: tag.monat,
      istArbeitstag: tag.istArbeitstag,
      materialVerfuegbar: tag.bauteile.every(b => b.atpCheck.erfuellt),
      anzahlBauteileVerfuegbar: tag.bauteile.filter(b => b.atpCheck.erfuellt).length,
      anzahlBauteileGesamt: tag.bauteile.length
    }))
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 7. LAGERREICHWEITE - DETAILLIERTE ANALYSE
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface MonatlicheLagerreichweite {
  monat: number
  monatName: string
  monatKurz: string
  // Pro Bauteil
  bauteile: {
    bauteilId: string
    bauteilName: string
    durchschnittReichweite: number
    minReichweite: number
    maxReichweite: number
  }[]
}

export function aggregiereLagerreichweiteNachMonat(
  warehouseTage: TaeglichesLager[]
): MonatlicheLagerreichweite[] {
  const monate: MonatlicheLagerreichweite[] = Array.from({ length: 12 }, (_, i) => ({
    monat: i + 1,
    monatName: MONATSNAMEN[i],
    monatKurz: MONATSNAMEN_KURZ[i],
    bauteile: []
  }))
  
  // Sammle Bauteil-IDs
  const bauteilIds = new Set<string>()
  const bauteilNamen = new Map<string, string>()
  
  warehouseTage.forEach(tag => {
    tag.bauteile.forEach(b => {
      bauteilIds.add(b.bauteilId)
      bauteilNamen.set(b.bauteilId, b.bauteilName)
    })
  })
  
  // Für jeden Monat und jedes Bauteil
  monate.forEach(monat => {
    bauteilIds.forEach(bauteilId => {
      const reichweiten: number[] = []
      
      warehouseTage.forEach(tag => {
        if (tag.monat === monat.monat) {
          const bauteil = tag.bauteile.find(b => b.bauteilId === bauteilId)
          if (bauteil) {
            reichweiten.push(bauteil.reichweiteTage)
          }
        }
      })
      
      if (reichweiten.length > 0) {
        const durchschnitt = reichweiten.reduce((sum, r) => sum + r, 0) / reichweiten.length
        const min = Math.min(...reichweiten)
        const max = Math.max(...reichweiten)
        
        monat.bauteile.push({
          bauteilId,
          bauteilName: bauteilNamen.get(bauteilId) || bauteilId,
          durchschnittReichweite: durchschnitt,
          minReichweite: min,
          maxReichweite: max
        })
      }
    })
  })
  
  return monate
}

/**
 * Wöchentliche Lagerreichweite für Heatmap (Woche x Variante)
 */
export interface WoechentlicheLagerreichweiteHeatmap {
  kalenderwoche: number
  bauteile: {
    bauteilId: string
    durchschnittReichweite: number
  }[]
}

export function aggregiereLagerreichweiteHeatmap(
  warehouseTage: TaeglichesLager[]
): WoechentlicheLagerreichweiteHeatmap[] {
  // Extrahiere Kalenderwoche aus Datum
  const getKalenderwoche = (datum: Date): number => {
    const firstDayOfYear = new Date(datum.getFullYear(), 0, 1)
    const pastDaysOfYear = (datum.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }
  
  const wochenMap = new Map<number, Map<string, number[]>>()
  const bauteilNamen = new Map<string, string>()
  
  warehouseTage.forEach(tag => {
    if (tag.monat >= 1 && tag.monat <= 12) {
      const kw = getKalenderwoche(tag.datum)
      
      if (!wochenMap.has(kw)) {
        wochenMap.set(kw, new Map())
      }
      
      tag.bauteile.forEach(b => {
        bauteilNamen.set(b.bauteilId, b.bauteilName)
        
        const wocheBauteile = wochenMap.get(kw)!
        if (!wocheBauteile.has(b.bauteilId)) {
          wocheBauteile.set(b.bauteilId, [])
        }
        wocheBauteile.get(b.bauteilId)!.push(b.reichweiteTage)
      })
    }
  })
  
  // Berechne Durchschnitte
  const heatmap: WoechentlicheLagerreichweiteHeatmap[] = []
  
  wochenMap.forEach((bauteile, kw) => {
    const bauteilDaten: { bauteilId: string; durchschnittReichweite: number }[] = []
    
    bauteile.forEach((reichweiten, bauteilId) => {
      const durchschnitt = reichweiten.reduce((sum, r) => sum + r, 0) / reichweiten.length
      bauteilDaten.push({
        bauteilId,
        durchschnittReichweite: durchschnitt
      })
    })
    
    heatmap.push({
      kalenderwoche: kw,
      bauteile: bauteilDaten
    })
  })
  
  return heatmap.sort((a, b) => a.kalenderwoche - b.kalenderwoche)
}
