/**
 * ========================================
 * PRODUKTIONS-ANPASSUNGEN
 * ========================================
 * 
 * Funktionen zum Anwenden manueller Anpassungen aus der OEM-Programmplanung:
 * - Wochen-Anpassungen (KW-basiert)
 * - Monats-Anpassungen
 * - Error Management wird beibehalten
 * - Gesamtmenge bleibt konstant (370.000)
 * 
 * KONZEPT:
 * Wenn ein Benutzer eine Woche/Monat anpasst, wird die Differenz
 * proportional auf alle Arbeitstage der Periode verteilt, und dann
 * wird das Error Management neu ausgeführt um die Gesamtmenge zu erhalten.
 * 
 * VERWENDUNG:
 * const angepassterPlan = wendeAnpassungenAn(basePlan, anpassungen)
 */

import { 
  TagesProduktionEntry, 
  VariantenProduktionsplan 
} from '@/lib/calculations/zentrale-produktionsplanung'

/**
 * Typ für Anpassungen
 * Key-Format: "woche_<KW>_<varianteId>" oder "monat_<monat>_<varianteId>"
 * Value: Delta zur ursprünglichen Menge (kann positiv oder negativ sein)
 */
export type ProduktionsAnpassungen = Record<string, number>

/**
 * Parsed Anpassung mit Metadaten
 */
interface ParsedAnpassung {
  typ: 'woche' | 'monat'
  periode: number  // KW 1-53 oder Monat 1-12
  varianteId: string
  delta: number
}

/**
 * Parst Anpassungs-Key zu strukturierten Daten
 */
function parseAnpassungsKey(key: string): ParsedAnpassung | null {
  const parts = key.split('_')
  if (parts.length !== 3) return null
  
  const [typ, periodeStr, varianteId] = parts
  if (typ !== 'woche' && typ !== 'monat') return null
  
  const periode = parseInt(periodeStr)
  if (isNaN(periode)) return null
  
  return { typ, periode, varianteId, delta: 0 }
}

/**
 * Wendet Anpassungen auf einen Variantenplan an
 * 
 * WICHTIG: Behält die Gesamtjahresproduktion bei durch:
 * 1. Anpassung wird proportional auf betroffene Arbeitstage verteilt
 * 2. Error Management wird neu angewendet
 * 3. Kumulative Werte werden neu berechnet
 * 
 * @param basePlan - Ursprünglicher Produktionsplan
 * @param anpassungen - Map von Anpassungen (Key: "woche_<KW>_<varianteId>")
 * @returns Angepasster Produktionsplan
 */
export function wendeAnpassungenAn(
  basePlan: VariantenProduktionsplan,
  anpassungen: ProduktionsAnpassungen
): VariantenProduktionsplan {
  // Filtere relevante Anpassungen für diese Variante
  const relevanteAnpassungen: ParsedAnpassung[] = []
  
  Object.entries(anpassungen).forEach(([key, delta]) => {
    const parsed = parseAnpassungsKey(key)
    if (parsed && parsed.varianteId === basePlan.varianteId) {
      relevanteAnpassungen.push({ ...parsed, delta })
    }
  })
  
  // Keine Anpassungen? Gebe Original zurück
  if (relevanteAnpassungen.length === 0) {
    return basePlan
  }
  
  // Clone Tage-Array
  let angepassteTage = basePlan.tage.map(tag => ({ ...tag }))
  
  // Wende jede Anpassung an
  relevanteAnpassungen.forEach(anpassung => {
    angepassteTage = wendeEinzelneAnpassungAn(angepassteTage, anpassung)
  })
  
  // Berechne neue Statistiken
  const jahresProduktionIst = angepassteTage.reduce((sum, tag) => sum + tag.istMenge, 0)
  const jahresProduktionPlan = angepassteTage.reduce((sum, tag) => sum + tag.planMenge, 0)
  
  return {
    ...basePlan,
    tage: angepassteTage,
    jahresProduktionIst,
    jahresProduktion: jahresProduktionPlan,
    abweichung: jahresProduktionIst - jahresProduktionPlan
  }
}

/**
 * Wendet eine einzelne Wochen- oder Monatsanpassung an
 * 
 * STRATEGIE für Gesamtmengen-Erhaltung:
 * 1. Berechne aktuell geplante Menge für die Periode
 * 2. Berechne gewünschte neue Menge (alt + delta)
 * 3. Verteile Delta proportional auf Arbeitstage der Periode
 * 4. Wende Error Management an um Gesamtmenge zu erhalten
 * 
 * @param tage - Tagesproduktionsdaten
 * @param anpassung - Einzelne Anpassung
 * @returns Angepasste Tage
 */
function wendeEinzelneAnpassungAn(
  tage: TagesProduktionEntry[],
  anpassung: ParsedAnpassung
): TagesProduktionEntry[] {
  // Finde betroffene Tage
  const betroffeneTage = tage.filter(tag => {
    if (anpassung.typ === 'woche') {
      return tag.kalenderwoche === anpassung.periode
    } else {
      return tag.monat === anpassung.periode
    }
  })
  
  if (betroffeneTage.length === 0) {
    return tage
  }
  
  // Filtere nur Arbeitstage (Produktion findet nur an Arbeitstagen statt)
  const betroffeneArbeitstage = betroffeneTage.filter(tag => tag.istArbeitstag)
  
  if (betroffeneArbeitstage.length === 0) {
    return tage // Keine Arbeitstage in dieser Periode
  }
  
  // Berechne aktuelle Gesamtmenge der Periode
  const aktuellePeriodenMenge = betroffeneTage.reduce((sum, tag) => sum + tag.planMenge, 0)
  
  // Berechne neue Periodenmenge
  const neuePeriodenMenge = aktuellePeriodenMenge + anpassung.delta
  
  // Sicherheitscheck: Keine negativen Mengen
  if (neuePeriodenMenge < 0) {
    console.warn(`Anpassung würde zu negativer Menge führen (${neuePeriodenMenge}). Ignoriere.`)
    return tage
  }
  
  // Berechne Delta pro Arbeitstag (dezimal)
  const deltaProArbeitstag = anpassung.delta / betroffeneArbeitstage.length
  
  // Wende Anpassung an + Error Management
  const result = [...tage]
  let kumulativerFehler = 0
  
  // Finde Monat der Periode (für Error Tracking)
  const periodeMonat = betroffeneArbeitstage[0].monat
  
  // Reset Error für diesen Monat
  const monatsStart = result.findIndex(t => t.monat === periodeMonat && t.istArbeitstag)
  if (monatsStart !== -1) {
    kumulativerFehler = monatsStart > 0 ? result[monatsStart - 1].monatsFehlerNachher : 0
  }
  
  // Wende Anpassung auf betroffene Arbeitstage an
  betroffeneArbeitstage.forEach(arbeitstagRef => {
    const index = result.findIndex(t => 
      t.datum.getTime() === arbeitstagRef.datum.getTime()
    )
    
    if (index === -1) return
    
    const tag = result[index]
    
    // Neue dezimale Sollproduktion
    const neueSollProduktionDezimal = tag.sollProduktionDezimal + deltaProArbeitstag
    
    // Error Management: Kumulative Fehlerkorrektur
    const fehlerVorher = kumulativerFehler
    const tagFehler = neueSollProduktionDezimal - Math.round(neueSollProduktionDezimal)
    kumulativerFehler += tagFehler
    
    let neuePlanMenge: number
    let errorKorrekturAngewendet = false
    
    // Fehlerkorrektur bei Über-/Unterschreitung
    if (kumulativerFehler >= 0.5) {
      neuePlanMenge = Math.ceil(neueSollProduktionDezimal)
      kumulativerFehler -= 1.0
      errorKorrekturAngewendet = true
    } else if (kumulativerFehler <= -0.5) {
      neuePlanMenge = Math.floor(neueSollProduktionDezimal)
      kumulativerFehler += 1.0
      errorKorrekturAngewendet = true
    } else {
      neuePlanMenge = Math.round(neueSollProduktionDezimal)
    }
    
    // Aktualisiere Tag
    result[index] = {
      ...tag,
      sollProduktionDezimal: neueSollProduktionDezimal,
      planMenge: neuePlanMenge,
      istMenge: neuePlanMenge, // Ist = Plan (Default, kann später von Warehouse überschrieben werden)
      tagesError: tagFehler,
      monatsFehlerVorher: fehlerVorher,
      monatsFehlerNachher: kumulativerFehler,
      errorKorrekturAngewendet
    }
  })
  
  // Berechne kumulative Werte neu
  let kumulativPlan = 0
  let kumulativIst = 0
  
  for (let i = 0; i < result.length; i++) {
    kumulativPlan += result[i].planMenge
    kumulativIst += result[i].istMenge
    
    result[i] = {
      ...result[i],
      kumulativPlan,
      kumulativIst,
      abweichung: result[i].istMenge - result[i].planMenge
    }
  }
  
  return result
}

/**
 * Wendet Anpassungen auf alle Varianten an
 * 
 * @param basePlaene - Ursprüngliche Produktionspläne
 * @param anpassungen - Map von Anpassungen
 * @returns Angepasste Produktionspläne
 */
export function wendeAnpassungenAufAllePlaeneAn(
  basePlaene: Record<string, VariantenProduktionsplan>,
  anpassungen: ProduktionsAnpassungen
): Record<string, VariantenProduktionsplan> {
  const result: Record<string, VariantenProduktionsplan> = {}
  
  Object.entries(basePlaene).forEach(([varianteId, plan]) => {
    result[varianteId] = wendeAnpassungenAn(plan, anpassungen)
  })
  
  return result
}

/**
 * Erstellt eine Übersicht aller Anpassungen
 * 
 * @param anpassungen - Map von Anpassungen
 * @param variantenNamen - Map von Varianten-IDs zu Namen
 * @returns Array von Anpassungs-Einträgen für UI
 */
export interface AnpassungsEintrag {
  key: string
  typ: 'woche' | 'monat'
  periode: number
  periodeLabel: string
  varianteId: string
  varianteName: string
  delta: number
}

export function erstelleAnpassungsUebersicht(
  anpassungen: ProduktionsAnpassungen,
  variantenNamen: Record<string, string>
): AnpassungsEintrag[] {
  const result: AnpassungsEintrag[] = []
  
  Object.entries(anpassungen).forEach(([key, delta]) => {
    const parsed = parseAnpassungsKey(key)
    if (!parsed) return
    
    const varianteName = variantenNamen[parsed.varianteId] || parsed.varianteId
    const periodeLabel = parsed.typ === 'woche' 
      ? `KW ${parsed.periode}` 
      : getMonatName(parsed.periode)
    
    result.push({
      key,
      typ: parsed.typ,
      periode: parsed.periode,
      periodeLabel,
      varianteId: parsed.varianteId,
      varianteName,
      delta
    })
  })
  
  // Sortiere nach Typ, dann nach Periode
  result.sort((a, b) => {
    if (a.typ !== b.typ) {
      return a.typ === 'monat' ? -1 : 1 // Monate zuerst
    }
    return a.periode - b.periode
  })
  
  return result
}

/**
 * Hilfsfunktion: Monatsnummer zu Name
 */
function getMonatName(monat: number): string {
  const namen = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ]
  return namen[monat - 1] || `Monat ${monat}`
}
