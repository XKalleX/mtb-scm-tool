/**
 * ========================================
 * OEM PRODUKTIONSPROGRAMMPLANUNG
 * ========================================
 * 
 * Zentrale Berechnungen für die tagesgenaue Produktionsplanung
 * mit Berücksichtigung von Saisonalität und Error-Management
 * 
 * WICHTIG: Produktion in DEUTSCHLAND (Dortmund)
 * → Nutzt DEUTSCHE Feiertage (NRW), nicht chinesische!
 * → Anforderung A3: Deutsche Feiertage müssen respektiert werden
 * 
 * KERNFUNKTIONEN:
 * 1. Jahresproduktion auf Monate verteilen (saisonal)
 * 2. Monatsproduktion auf Tage verteilen (gleichmäßig mit Error-Management)
 * 3. Marketing-Zusatzaufträge einplanen (Szenario 1)
 */

import { TagesProduktionsplan, SaisonalitaetMonat, MarketingAuftrag } from '@/types'
import { addDays } from '@/lib/utils'
import { berechneProduktionMitErrorManagement } from './error-management'
import { generiereJahreskalender, istArbeitstag_Deutschland, zaehleArbeitstageProMonat_Deutschland } from '@/lib/kalender'
import saisonalitaetData from '@/data/saisonalitaet.json'
import stammdatenData from '@/data/stammdaten.json'

/**
 * Berechnet die saisonale Verteilung der Jahresproduktion
 * 
 * Verwendet die Saisonalitäts-Daten aus JSON:
 * - Januar: 4%
 * - Februar: 6%
 * - März: 10%
 * - April: 16% ← PEAK!
 * - ...
 * 
 * @param jahresproduktion - Gesamt-Jahresproduktion einer Variante
 * @returns Array mit 12 Monats-Produktionen
 */
export function berechneMonatsproduktionen(jahresproduktion: number): number[] {
  const saisonalitaet: SaisonalitaetMonat[] = saisonalitaetData.saisonalitaetMonatlich
  
  return saisonalitaet.map(monat => {
    return (jahresproduktion * monat.anteil) / 100
  })
}

/**
 * Generiert tagesgenaue Produktionsplanung für eine Variante
 * 
 * ABLAUF:
 * 1. Jahresproduktion auf 12 Monate verteilen (saisonal)
 * 2. Arbeitstage pro Monat zählen (DEUTSCHE Feiertage!)
 * 3. Für jeden Monat: Monatsproduktion / Arbeitstage = Tagesproduktion
 * 4. Error-Management anwenden für jeden Tag
 * 
 * WICHTIG: Nutzt deutsche Feiertage (NRW) für Produktion in Deutschland!
 * Anforderung A3: Deutsche Feiertage müssen respektiert werden
 * 
 * @param varianteId - ID der Variante (z.B. "MTBAllrounder")
 * @param jahresproduktion - Gesamt-Jahresproduktion dieser Variante
 * @returns Array von Tages-Produktionsplänen (365 Tage)
 */
export function generiereProduktionsplan(
  varianteId: string,
  jahresproduktion: number
): TagesProduktionsplan[] {
  const kalender = generiereJahreskalender(2027)
  const monatsproduktionen = berechneMonatsproduktionen(jahresproduktion)
  const arbeitstageProMonat = zaehleArbeitstageProMonat_Deutschland() // ✅ DEUTSCHE Feiertage!
  
  const tagesplaene: TagesProduktionsplan[] = []
  
  // Kumulierter Error über das ganze Jahr
  let kumulierterError = 0
  
  // Für jeden Monat
  for (let monat = 0; monat < 12; monat++) {
    const monatsproduktion = monatsproduktionen[monat]
    const arbeitstage = arbeitstageProMonat[monat]
    const sollProTag = monatsproduktion / arbeitstage
    
    // Tage dieses Monats
    const monatsTage = kalender.filter(k => k.monat === monat + 1)
    
    monatsTage.forEach(tag => {
      if (istArbeitstag_Deutschland(tag.datum)) { // ✅ DEUTSCHE Feiertage prüfen!
        // Produktionstag - Error-Management anwenden
        const errorState = berechneProduktionMitErrorManagement(
          sollProTag,
          kumulierterError
        )
        
        tagesplaene.push({
          datum: tag.datum,
          varianteId,
          sollMenge: errorState.sollMenge,
          istMenge: errorState.istMenge,
          kumulierterError: errorState.kumulierterError,
          istMarketing: false
        })
        
        kumulierterError = errorState.kumulierterError
      } else {
        // Kein Produktionstag (Wochenende/deutscher Feiertag)
        tagesplaene.push({
          datum: tag.datum,
          varianteId,
          sollMenge: 0,
          istMenge: 0,
          kumulierterError,
          istMarketing: false
        })
      }
    })
  }
  
  return tagesplaene
}

/**
 * Generiert Produktionspläne für ALLE 8 Varianten
 * @returns Object mit Plänen pro Variante
 */
export function generiereAlleProduktionsplaene(): Record<string, TagesProduktionsplan[]> {
  const jahresproduktion = stammdatenData.jahresproduktion.proVariante
  const plaene: Record<string, TagesProduktionsplan[]> = {}
  
  Object.entries(jahresproduktion).forEach(([varianteId, jahresprod]) => {
    plaene[varianteId] = generiereProduktionsplan(varianteId, jahresprod as number)
  })
  
  return plaene
}

/**
 * Fügt einen Marketing-Zusatzauftrag in den Produktionsplan ein
 * (Szenario 1)
 * 
 * @param plan - Bestehender Produktionsplan
 * @param auftrag - Marketing-Auftrag
 * @returns Angepasster Produktionsplan
 */
export function fuegeMarketingAuftragEin(
  plan: TagesProduktionsplan[],
  auftrag: MarketingAuftrag
): TagesProduktionsplan[] {
  // Finde den Tag an dem der Auftrag eingeplant werden soll
  const zielDatum = auftrag.wunschtermin
  
  return plan.map(tag => {
    if (tag.datum.toDateString() === zielDatum.toDateString() && 
        tag.varianteId === auftrag.varianteId) {
      return {
        ...tag,
        istMarketing: true,
        marketingMenge: auftrag.menge,
        istMenge: tag.istMenge + auftrag.menge // Zusätzliche Produktion!
      }
    }
    return tag
  })
}

/**
 * Berechnet Produktions-Statistiken für eine Variante
 * @param plan - Produktionsplan
 * @returns Statistiken
 */
export function berechneProduktionsstatistik(plan: TagesProduktionsplan[]) {
  const gesamt = plan.reduce((sum, t) => sum + t.istMenge, 0)
  const arbeitstage = plan.filter(t => t.istMenge > 0).length
  const durchschnitt = gesamt / arbeitstage
  const maxProTag = Math.max(...plan.map(t => t.istMenge))
  const minProTag = Math.min(...plan.filter(t => t.istMenge > 0).map(t => t.istMenge))
  const marketingTage = plan.filter(t => t.istMarketing).length
  
  return {
    gesamt,
    arbeitstage,
    durchschnitt,
    maxProTag,
    minProTag,
    marketingTage
  }
}

/**
 * Summiert Produktion aller Varianten zu einem bestimmten Datum
 * @param datum - Datum
 * @param allePlayne - Alle Produktionspläne
 * @returns Gesamt-Produktion an diesem Tag
 */
export function gesamtProduktionAmTag(
  datum: Date,
  allePlayne: Record<string, TagesProduktionsplan[]>
): number {
  let gesamt = 0
  
  Object.values(allePlayne).forEach(plan => {
    const tagPlan = plan.find(t => 
      t.datum.toDateString() === datum.toDateString()
    )
    if (tagPlan) {
      gesamt += tagPlan.istMenge
    }
  })
  
  return gesamt
}

/**
 * Findet den produktionsstärksten Tag im Jahr
 * @param allePlayne - Alle Produktionspläne
 * @returns { datum, menge }
 */
export function findeMaxProduktionsTag(
  allePlayne: Record<string, TagesProduktionsplan[]>
): { datum: Date, menge: number } {
  const kalender = generiereJahreskalender(2027)
  let maxDatum = kalender[0].datum
  let maxMenge = 0
  
  kalender.forEach(tag => {
    const menge = gesamtProduktionAmTag(tag.datum, allePlayne)
    if (menge > maxMenge) {
      maxMenge = menge
      maxDatum = tag.datum
    }
  })
  
  return { datum: maxDatum, menge: maxMenge }
}