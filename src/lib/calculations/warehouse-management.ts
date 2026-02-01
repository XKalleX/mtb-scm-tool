/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INTEGRIERTES WAREHOUSE MANAGEMENT SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Berechnet realistische Lagerbestandsentwicklung mit:
 * - Realistischen Losgrößen-basierten Lieferungen (500 Stück)
 * - NEUER Materialfluss mit Zwischenlagerung:
 *   - Schiffe nur mittwochs
 *   - LKWs nicht am Wochenende
 *   - Material verfügbar am NÄCHSTEN TAG nach Ankunft
 * - ATP (Available-to-Promise) Checks vor Verbrauch
 * - PROPORTIONALE ALLOKATION statt FCFS bei Engpässen
 * - Start mit 0 Lagerbestand
 * - Volle OEM-Inbound-Warehouse Integration
 * 
 * KONZEPT:
 * 1. Start mit 0 Lagerbestand
 * 2. Verarbeite Inbound-Lieferungen von generiereTaeglicheBestellungen
 *    → NEU: Lieferungen nutzen verfuegbarAb Datum (nächster Tag nach Ankunft)
 * 3. Für jeden Produktionstag: ATP-Check → Verbrauch falls verfügbar
 *    → NEU: Bei Engpass proportionale Verteilung statt FCFS
 * 4. Sammle Statistiken und Warnungen
 */

import type { KonfigurationData, FeiertagConfig } from '@/contexts/KonfigurationContext'
import type { TagesProduktionEntry } from './zentrale-produktionsplanung'
import { addDays, toLocalISODateString } from '@/lib/utils'
import { generiereTaeglicheBestellungen, type TaeglicheBestellung } from './inbound-china'
import { istArbeitstag_Deutschland, FeiertagsKonfiguration } from '@/lib/kalender'

/**
 * Konvertiert FeiertagConfig[] zu FeiertagsKonfiguration[] für kalender.ts Funktionen
 */
function konvertiereFeiertage(feiertage: FeiertagConfig[]): FeiertagsKonfiguration[] {
  return feiertage.map(f => ({
    datum: f.datum,
    name: f.name,
    typ: f.typ,
    land: f.land
  }))
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Täglicher Lagerbestand pro Bauteil
 */
export interface TaeglichesLager {
  tag: number                      // Tag im Jahr (1-365, kann auch <1 für Vorjahr sein)
  datum: Date                      // Datum
  datumStr: string                 // ISO String für Mapping
  wochentag: string                // Mo, Di, Mi, ...
  monat: number                    // Monat (1-12)
  istArbeitstag: boolean           // Produktionstag?
  
  bauteile: {
    bauteilId: string              // z.B. "SAT_FT"
    bauteilName: string            // z.B. "Sattel Freeride Team"
    
    // BEWEGUNGEN
    anfangsBestand: number         // Bestand zu Tagesbeginn
    zugang: number                 // Lieferungen heute (LOT-BASED!)
    verbrauch: number              // Produktion verbraucht
    endBestand: number             // Bestand zu Tagesende
    
    // STATUS
    verfuegbarBestand: number      // endBestand (verfügbar für Produktion)
    reichweiteTage: number         // Wie lange reicht der Bestand?
    status: 'ok' | 'niedrig' | 'kritisch' | 'negativ'
    
    // ATP CHECK
    atpCheck: {
      benoetigt: number            // Heute benötigt
      verfuegbar: number           // Tatsächlich verfügbar
      erfuellt: boolean            // Kann produziert werden?
      grund?: string               // Falls nicht erfüllt: Warum?
    }
    
    // BACKLOG MANAGEMENT
    produktionsBacklog: {
      backlogVorher: number        // Unerfüllter Bedarf aus Vortagen
      nichtProduziertHeute: number // Bedarf der heute nicht produziert werden konnte
      backlogNachher: number       // Backlog am Ende des Tages
      nachgeholt: number           // Aus Backlog nachgeholte Produktion heute
    }
    
    // LIEFERUNGEN
    lieferungen: {
      bestellungId: string
      menge: number
      istVorjahr: boolean
    }[]
  }[]
}

/**
 * Warehouse Management Result für ein ganzes Jahr
 */
export interface WarehouseJahresResult {
  tage: TaeglichesLager[]          // 365+ Tage (inkl. Vorjahr wenn nötig)
  jahresstatistik: {
    gesamtLieferungen: number
    gesamtVerbrauch: number
    durchschnittBestand: number
    minimalBestand: number
    maximalBestand: number
    tageNegativ: number            // Tage mit negativem Bestand (sollte 0 sein durch ATP)
    liefertreue: number            // % pünktliche Lieferungen
    // NEU: Produktions-Backlog Statistiken
    gesamtBedarf: number           // Gesamtbedarf über alle Tage
    gesamtProduziertTatsaechlich: number // Tatsächlich produziert (mit Material-Check)
    gesamtBacklogEndstand: number  // Backlog am Jahresende
    maximalerBacklog: number       // Höchster Backlog im Jahr
    tageMitBacklog: number         // Anzahl Tage mit nicht erfülltem Bedarf
  }
  warnungen: string[]              // Alle kritischen Ereignisse
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Berechnet Verbrauch pro Bauteil für einen Produktionstag
 * Basiert auf Stückliste: 1 Bike = 1 Sattel
 */
function berechneVerbrauchProBauteil(
  produktionsMenge: number,
  varianteId: string,
  bauteilId: string,
  konfiguration: KonfigurationData
): number {
  // Finde Stücklisten-Position
  const position = konfiguration.stueckliste.find(
    p => p.mtbVariante === varianteId && p.bauteilId === bauteilId
  )
  
  if (!position) return 0
  
  return produktionsMenge * position.menge
}

/**
 * Gruppiert Bestellungen nach Verfügbarkeitsdatum (NEU!)
 * 
 * WICHTIG: Verwendet verfuegbarAb statt erwarteteAnkunft!
 * Material ist erst am NÄCHSTEN TAG nach Ankunft für Produktion verfügbar!
 */
function gruppiereBestellungenNachVerfuegbarkeit(
  bestellungen: TaeglicheBestellung[]
): Map<string, TaeglicheBestellung[]> {
  const grouped = new Map<string, TaeglicheBestellung[]>()
  
  bestellungen.forEach(bestellung => {
    // NEU: Verwende verfuegbarAb (nächster Tag nach Ankunft) statt erwarteteAnkunft
    const verfuegbarDatum = bestellung.verfuegbarAb || bestellung.erwarteteAnkunft
    const verfuegbarStr = toLocalISODateString(verfuegbarDatum)
    
    if (!grouped.has(verfuegbarStr)) {
      grouped.set(verfuegbarStr, [])
    }
    
    grouped.get(verfuegbarStr)!.push(bestellung)
  })
  
  return grouped
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MAIN CALCULATION: INTEGRATED WAREHOUSE MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Berechnet realistische Lagerbestandsentwicklung über das ganze Jahr
 * 
 * ABLAUF:
 * 1. Generiere Inbound-Bestellungen mit 49 Tage Vorlauf (Start Mitte Oktober 2026)
 * 2. Initialisiere Lagerbestände mit 0
 * 3. Simuliere jeden Tag:
 *    a) Buche eingehende Lieferungen (LOT-BASED!)
 *    b) ATP-Check: Ist Material für Produktion verfügbar?
 *    c) Falls JA: Buche Verbrauch, Falls NEIN: Warnung + reduzierte/keine Produktion
 * 4. Sammle Statistiken und Warnungen
 * 
 * @param konfiguration - System-Konfiguration
 * @param variantenProduktionsplaene - Tägliche Produktionspläne aller Varianten
 * @param zusatzBestellungen - Optionale manuelle Zusatzbestellungen
 * @returns WarehouseJahresResult mit detaillierter Tages-Bestandsführung
 */
export function berechneIntegriertesWarehouse(
  konfiguration: KonfigurationData,
  variantenProduktionsplaene: Record<string, { tage: TagesProduktionEntry[] }>,
  zusatzBestellungen: TaeglicheBestellung[] = []
): WarehouseJahresResult {
  
  const warnungen: string[] = []
  const planungsjahr = konfiguration.planungsjahr
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 1: GENERIERE INBOUND BESTELLUNGEN (mit 49 Tage Vorlauf!)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Bereite Stücklisten-Map vor (für generiereTaeglicheBestellungen)
  // Transformiere stueckliste[] aus Konfiguration in das erwartete Format
  const stuecklistenMap: Record<string, { komponenten: Record<string, { name: string; menge: number; einheit: string }> }> = {}
  konfiguration.stueckliste.forEach(s => {
    if (!stuecklistenMap[s.mtbVariante]) {
      stuecklistenMap[s.mtbVariante] = { komponenten: {} }
    }
    stuecklistenMap[s.mtbVariante].komponenten[s.bauteilId] = {
      name: s.bauteilName,
      menge: s.menge,
      einheit: s.einheit || 'Stück'
    }
  })
  
  // Konvertiere Produktionspläne zu TagesProduktionsplan Format
  const produktionsplaeneFormatiert: Record<string, Array<{datum: Date; varianteId: string; istMenge: number; planMenge: number}>> = {}
  Object.entries(variantenProduktionsplaene).forEach(([varianteId, plan]) => {
    produktionsplaeneFormatiert[varianteId] = plan.tage.map(tag => ({
      datum: tag.datum,
      varianteId: varianteId,
      istMenge: tag.istMenge,
      planMenge: tag.planMenge
    }))
  })
  
  // Generiere Bestellungen (inkl. Vorjahr!)
  const bestellungen = [
    ...generiereTaeglicheBestellungen(
      produktionsplaeneFormatiert,
      planungsjahr,
      konfiguration.lieferant.gesamtVorlaufzeitTage,
      konfiguration.feiertage,
      stuecklistenMap,  // Stücklisten aus Konfiguration
      konfiguration.lieferant.losgroesse,  // Losgröße aus Konfiguration
      konfiguration.lieferant.lieferintervall  // Lieferintervall aus Konfiguration
    ),
    ...zusatzBestellungen
  ]
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // GUARD: Prüfe ob Bestellungen vorhanden sind
  // ═══════════════════════════════════════════════════════════════════════════════
  // Falls keine Bestellungen generiert wurden (z.B. leerer Produktionsplan),
  // geben wir ein leeres Ergebnis zurück um Abstürze zu vermeiden.
  if (bestellungen.length === 0) {
    console.warn('⚠️ Warehouse Management: Keine Bestellungen vorhanden! Rückgabe leerer Statistik.')
    return {
      tage: [],
      jahresstatistik: {
        gesamtLieferungen: 0,
        gesamtVerbrauch: 0,
        durchschnittBestand: 0,
        minimalBestand: 0,
        maximalBestand: 0,
        tageNegativ: 0,
        liefertreue: 100,
        // NEU: Backlog-Statistiken
        gesamtBedarf: 0,
        gesamtProduziertTatsaechlich: 0,
        gesamtBacklogEndstand: 0,
        maximalerBacklog: 0,
        tageMitBacklog: 0
      },
      warnungen: ['Keine Bestellungen vorhanden - Produktionspläne prüfen!']
    }
  }
  
  console.log(`🏭 Warehouse Management: ${bestellungen.length} Bestellungen generiert`)
  const zeitraumStart = bestellungen[0].bestelldatum.toLocaleDateString('de-DE')
  const zeitraumEnde = bestellungen[bestellungen.length - 1].bestelldatum.toLocaleDateString('de-DE')
  console.log(`   Zeitraum: ${zeitraumStart} - ${zeitraumEnde}`)
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 1.5: BERECHNE GESAMT-BEDARF AUS PRODUKTIONSPLÄNEN
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * WICHTIG: gesamtBedarf repräsentiert die PLAN-Menge, also was produziert werden
   * SOLLTE nach der OEM-Planung. Dies ist unabhängig von Wochenenden/Feiertagen,
   * da es die Jahresgesamtproduktion widerspiegelt (370.000 Bikes).
   * 
   * Die Berechnung erfolgt direkt aus den Produktionsplänen VOR der Simulation,
   * um sicherzustellen, dass ALLE geplanten Bikes gezählt werden.
   * 
   * Da 1 Bike = 1 Sattel in der Stückliste, entspricht die Summe aller planMenge-Werte
   * dem Gesamtbedarf an Sätteln (keine Umrechnung nötig).
   */
  const gesamtBedarf = Object.values(variantenProduktionsplaene)
    .flatMap(plan => plan.tage)
    .reduce((sum, tag) => sum + tag.planMenge, 0)
  
  console.log(`📊 Gesamt Bedarf (aus Produktionsplänen): ${gesamtBedarf.toLocaleString('de-DE')} Stück`)
  
  // NEU: Gruppiere Bestellungen nach VERFÜGBARKEITSDATUM (nächster Tag nach Ankunft!)
  const lieferungenProTag = gruppiereBestellungenNachVerfuegbarkeit(bestellungen)
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 2: INITIALISIERE LAGERBESTÄNDE MIT 0
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const bauteile = konfiguration.bauteile
  const aktuelleBestaende: Record<string, number> = {}
  
  // Start mit 0 Lagerbestand (keine imaginären Anfangsbestände)
  // Anforderung: Material erst am nächsten Tag nach Ankunft verfügbar!
  // Mit neuem Materialfluss: Schiffe nur mittwochs, LKWs nicht am Wochenende
  bauteile.forEach(bauteil => {
    aktuelleBestaende[bauteil.id] = 0
  })
  
  console.log(`📦 Startbestand (Tag 1):`, aktuelleBestaende)
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 3: SIMULIERE JEDEN TAG (inkl. Vorjahr für Vorlauf-Bestellungen)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const tageErgebnisse: TaeglichesLager[] = []
  
  // Finde früheste Bestellung (kann in 2026 sein!)
  const fruehestesBestelldatum = bestellungen.reduce((min, b) => {
    return b.bestelldatum < min ? b.bestelldatum : min
  }, bestellungen[0].bestelldatum)
  
  const fruehesteDatum = new Date(Math.min(
    fruehestesBestelldatum.getTime(),
    new Date(planungsjahr, 0, 1).getTime() // 01.01.2027
  ))
  
  // Simulationszeitraum: Von frühester Bestellung bis LETZTE LIEFERUNG + Puffer
  // WICHTIG: Letzte Bestellungen für Dezember-Produktion können im Januar 2028 ankommen!
  const simulationStart = new Date(fruehesteDatum)
  
  // Finde letzte Lieferung (verfuegbarAb Datum)
  const letzteLieferung = bestellungen.reduce((max, b) => {
    const verfuegbar = b.verfuegbarAb || b.erwarteteAnkunft
    return verfuegbar > max ? verfuegbar : max
  }, bestellungen[0].verfuegbarAb || bestellungen[0].erwarteteAnkunft)
  
  // Simulation läuft bis Ende des Planungsjahres ODER bis letzte Lieferung + 7 Tage (für Verarbeitung)
  const jahresEnde = new Date(planungsjahr, 11, 31)
  const simulationEnde = new Date(Math.max(
    jahresEnde.getTime(),
    letzteLieferung.getTime() + 7 * 24 * 60 * 60 * 1000  // +7 Tage Puffer
  ))
  
  console.log(`📅 Simulationszeitraum:`)
  console.log(`   Start: ${simulationStart.toLocaleDateString('de-DE')}`)
  console.log(`   Ende: ${simulationEnde.toLocaleDateString('de-DE')}`)
  console.log(`   Letzte Lieferung verfügbar: ${letzteLieferung.toLocaleDateString('de-DE')}`)
  
  let aktuellesDatum = new Date(simulationStart)
  let tagIndex = 0
  
  // Statistik-Tracker
  let gesamtLieferungen = 0
  let gesamtVerbrauch = 0
  let summeBestaende = 0
  let minimalBestand = Infinity
  let maximalBestand = -Infinity
  let tageNegativ = 0
  
  // NEU: Backlog-Tracker pro Bauteil
  const produktionsBacklog: Record<string, number> = {}
  bauteile.forEach(bauteil => {
    produktionsBacklog[bauteil.id] = 0
  })
  
  // NEU: Tracking für Statistiken
  // HINWEIS: gesamtBedarf wird bereits oben nach STEP 1.5 berechnet (aus Produktionsplänen)
  let gesamtProduziertTatsaechlich = 0
  let maximalerBacklog = 0
  let tageMitBacklog = 0
  
  while (aktuellesDatum <= simulationEnde) {
    tagIndex++
    
    const datumStr = toLocalISODateString(aktuellesDatum)
    const wochentag = aktuellesDatum.toLocaleDateString('de-DE', { weekday: 'short' })
    const monat = aktuellesDatum.getMonth() + 1
    
    // Prüfe Arbeitstag mit kalender.ts (nutzt globale Feiertage)
    const customFeiertage = konvertiereFeiertage(konfiguration.feiertage)
    const istArbeitstag = istArbeitstag_Deutschland(aktuellesDatum, customFeiertage)
    
    // Berechne Tag im Jahr (1-365 für 2027, kann negativ sein für 2026)
    const jahresAnfang = new Date(planungsjahr, 0, 1)
    const tagImJahr = Math.floor((aktuellesDatum.getTime() - jahresAnfang.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    // ═════════════════════════════════════════════════════════════════════════════
    // STEP 3a: BUCHE EINGEHENDE LIEFERUNGEN (LOT-BASED!)
    // ═════════════════════════════════════════════════════════════════════════════
    
    const heutigeLieferungen = lieferungenProTag.get(datumStr) || []
    const bauteileHeuteDetails: TaeglichesLager['bauteile'] = []
    
    bauteile.forEach(bauteil => {
      const bauteilId = bauteil.id
      const anfangsBestand = aktuelleBestaende[bauteilId]
      
      // Summiere Zugänge von allen Lieferungen heute
      let zugang = 0
      const lieferungsDetails: TaeglichesLager['bauteile'][0]['lieferungen'] = []
      
      heutigeLieferungen.forEach(bestellung => {
        const menge = bestellung.komponenten[bauteilId] || 0
        if (menge > 0) {
          zugang += menge
          gesamtLieferungen += menge
          
          lieferungsDetails.push({
            bestellungId: bestellung.id,
            menge: menge,
            istVorjahr: bestellung.istVorjahr
          })
        }
      })
      
      // Buche Zugang
      aktuelleBestaende[bauteilId] += zugang
      
      // ═══════════════════════════════════════════════════════════════════════════
      // STEP 3b: BERECHNE VERBRAUCH (nur an Arbeitstagen mit Produktion)
      // ═══════════════════════════════════════════════════════════════════════════
      
      let verbrauch = 0
      let atpErfuellt = true
      let atpGrund: string | undefined
      let benoetigt = 0
      const backlogVorher = produktionsBacklog[bauteilId]
      let nichtProduziertHeute = 0
      let nachgeholt = 0
      
      if (istArbeitstag && tagImJahr >= 1 && tagImJahr <= 365) {
        // Summiere PLAN-Verbrauch über alle Varianten (was produziert werden SOLLTE)
        Object.entries(variantenProduktionsplaene).forEach(([varianteId, plan]) => {
          const tagesIndex = tagImJahr - 1 // Array ist 0-basiert
          if (tagesIndex >= 0 && tagesIndex < plan.tage.length) {
            const tagesProduktion = plan.tage[tagesIndex]
            // Nutze planMenge für Bedarfsermittlung (was eigentlich geplant war)
            const verbrauchVariante = berechneVerbrauchProBauteil(
              tagesProduktion.planMenge, // WICHTIG: Nutze PLAN, nicht IST
              varianteId,
              bauteilId,
              konfiguration
            )
            benoetigt += verbrauchVariante
          }
        })
        
        // ═════════════════════════════════════════════════════════════════════════
        // STEP 3c: ATP-CHECK MIT BACKLOG MANAGEMENT & KAPAZITÄTSPRÜFUNG
        // ═════════════════════════════════════════════════════════════════════════
        
        // Berechne maximale Produktionskapazität für heute (nur an Arbeitstagen)
        // Produktionskapazität aus KonfigurationContext
        const kapazitaetProSchicht = 
          konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht
        
        // WICHTIG: Wir produzieren an Arbeitstagen IMMER mindestens 1 Schicht
        // Für Backlog-Abbau können wir bis zu 3 Schichten fahren
        const maxSchichten = 3
        const maxProduktionKapazitaet = istArbeitstag ? kapazitaetProSchicht * maxSchichten : 0
        
        // Gesamtbedarf = heutiger Bedarf + offener Backlog
        const gesamtBedarfHeute = benoetigt + backlogVorher
        const verfuegbarFuerProduktion = aktuelleBestaende[bauteilId]
        
        // TRIPLE-CHECK: Material UND Kapazität berücksichtigen!
        // 1. Material-Check: Haben wir genug Rohstoffe?
        // 2. Kapazitäts-Check: Können wir das produzieren?
        // 3. Kombination: Was ist möglich?
        const maxMoeglich = Math.min(verfuegbarFuerProduktion, maxProduktionKapazitaet)
        
        if (gesamtBedarfHeute > maxMoeglich) {
          // NICHT GENUG MATERIAL ODER KAPAZITÄT für alles!
          atpErfuellt = false
          
          // Produziere was möglich ist (limitiert durch Material UND Kapazität)
          verbrauch = Math.max(0, maxMoeglich)
          
          // Berechne wie viel vom Backlog nachgeholt wurde
          if (verbrauch > benoetigt) {
            // Mehr als heute benötigt → Backlog wird teilweise abgebaut
            nachgeholt = verbrauch - benoetigt
            nichtProduziertHeute = 0
          } else if (verbrauch < benoetigt) {
            // Weniger als heute benötigt → Backlog wächst
            nichtProduziertHeute = benoetigt - verbrauch
            nachgeholt = 0
          } else {
            // Genau so viel wie heute benötigt → Backlog bleibt gleich
            nichtProduziertHeute = 0
            nachgeholt = 0
          }
          
          // Bestimme Grund für ATP-Fehler
          if (verfuegbarFuerProduktion < gesamtBedarfHeute && maxProduktionKapazitaet >= gesamtBedarfHeute) {
            atpGrund = `Nicht genug Material (Bedarf: ${gesamtBedarfHeute}, Verfügbar: ${verfuegbarFuerProduktion}, Kapazität: ${maxProduktionKapazitaet})`
          } else if (maxProduktionKapazitaet < gesamtBedarfHeute && verfuegbarFuerProduktion >= gesamtBedarfHeute) {
            atpGrund = `Nicht genug Kapazität (Bedarf: ${gesamtBedarfHeute}, Material: ${verfuegbarFuerProduktion}, Kapazität: ${maxProduktionKapazitaet})`
          } else {
            atpGrund = `Material UND Kapazität limitiert (Bedarf: ${gesamtBedarfHeute}, Material: ${verfuegbarFuerProduktion}, Kapazität: ${maxProduktionKapazitaet})`
          }
          
          if (nichtProduziertHeute > 0) {
            warnungen.push(
              `⚠️ ${datumStr} (Tag ${tagImJahr}): ATP-Check fehlgeschlagen für ${bauteil.name}! ${atpGrund}, Fehlmenge: ${nichtProduziertHeute}`
            )
          }
        } else {
          // GENUG MATERIAL - volle Produktion + Backlog-Abbau möglich
          verbrauch = gesamtBedarfHeute
          atpErfuellt = true
          nachgeholt = backlogVorher // Kompletter Backlog wird abgebaut
          nichtProduziertHeute = 0
        }
        
        // Update Backlog
        produktionsBacklog[bauteilId] = backlogVorher + nichtProduziertHeute - nachgeholt
        
        // Track tatsächliche Produktion (für Statistiken)
        gesamtProduziertTatsaechlich += verbrauch
        
        // Buche Verbrauch
        aktuelleBestaende[bauteilId] -= verbrauch
        gesamtVerbrauch += verbrauch
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // STEP 3d: BERECHNE ENDBESTAND & STATUS
      // ═══════════════════════════════════════════════════════════════════════════
      
      const endBestand = aktuelleBestaende[bauteilId]
      const verfuegbarBestand = endBestand
      
      // Reichweite berechnen
      // Nutze den durchschnittlichen zukünftigen Bedarf (nicht den Verbrauch!)
      // Grund: Bei JIT-Produktion ist Verbrauch ≈ 0 am Anfang, aber Bedarf ist bekannt
      const durchschnittBedarf = gesamtBedarf / Math.max(1, tagIndex)
      const reichweiteTage = durchschnittBedarf > 0 
        ? endBestand / durchschnittBedarf 
        : (endBestand > 0 ? 999 : 0)  // 999 nur wenn tatsächlich Bestand vorhanden
      
      // Status bestimmen
      let status: 'ok' | 'niedrig' | 'kritisch' | 'negativ' = 'ok'
      
      if (endBestand < 0) {
        status = 'negativ'
        tageNegativ++
        warnungen.push(`🔴 ${datumStr} (Tag ${tagImJahr}): NEGATIVER BESTAND für ${bauteil.name}! (${endBestand})`)
      } else if (endBestand < 500) {
        // Kritisch wenn weniger als 1 Losgröße
        status = 'kritisch'
      } else if (reichweiteTage < 7) {
        // Niedrig wenn weniger als 7 Tage Reichweite
        status = 'niedrig'
      }
      
      // Statistik aktualisieren
      summeBestaende += endBestand
      minimalBestand = Math.min(minimalBestand, endBestand)
      maximalBestand = Math.max(maximalBestand, endBestand)
      
      // Backlog Statistiken
      const backlogNachher = produktionsBacklog[bauteilId]
      maximalerBacklog = Math.max(maximalerBacklog, backlogNachher)
      if (backlogNachher > 0 && tagImJahr >= 1 && tagImJahr <= 365) {
        tageMitBacklog++
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // STEP 3e: SPEICHERE TAGES-DETAILS
      // ═══════════════════════════════════════════════════════════════════════════
      
      bauteileHeuteDetails.push({
        bauteilId,
        bauteilName: bauteil.name,
        anfangsBestand,
        zugang,
        verbrauch,
        endBestand,
        verfuegbarBestand,
        reichweiteTage: Math.round(reichweiteTage * 10) / 10,
        status,
        atpCheck: {
          benoetigt,
          verfuegbar: verfuegbarBestand,
          erfuellt: atpErfuellt,
          grund: atpGrund
        },
        produktionsBacklog: {
          backlogVorher,
          nichtProduziertHeute,
          backlogNachher,
          nachgeholt
        },
        lieferungen: lieferungsDetails
      })
    })
    
    // Speichere Tages-Ergebnis
    tageErgebnisse.push({
      tag: tagImJahr,
      datum: new Date(aktuellesDatum),
      datumStr,
      wochentag,
      monat,
      istArbeitstag,
      bauteile: bauteileHeuteDetails
    })
    
    // Nächster Tag
    aktuellesDatum = addDays(aktuellesDatum, 1)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 3f: POST-JAHRESENDE VERBRAUCH (Lagerbestände vollständig aufbrauchen)
  // ═══════════════════════════════════════════════════════════════════════════════
  /**
   * ✅ ANFORDERUNG: Alle gelieferten Teile MÜSSEN produziert werden!
   * 
   * Problem: Durch Timing zwischen Lieferungen und Produktion können am Jahresende
   * noch Rohstoffe im Lager liegen (z.B. letzte Lieferung Dezember).
   * 
   * Lösung: Nach dem 31.12.2027 lassen wir das Werk weiterlaufen, um ALLE verbleibenden
   * Rohstoffe in Fertigerzeugnisse umzuwandeln. Dies ist realistisch, da:
   * - Bestellte Teile sind bezahlt und müssen verarbeitet werden
   * - Fertige Bikes können 2028 verkauft werden (kein Wertverlust)
   * - Rohstofflager sollte am Ende bei 0 sein (nur Fertigerzeugnisse akkumulieren)
   */
  
  console.log('\n🔄 POST-JAHRESENDE: Verarbeite verbleibende Lagerbestände...')
  
  const maxPostTage = 60 // Maximal 60 Tage nach Jahresende
  let postTagIndex = 0
  
  while (postTagIndex < maxPostTage) {
    // Prüfe ob noch Material vorhanden ist
    const verbleibendesMaterial = bauteile.reduce((sum, b) => 
      sum + aktuelleBestaende[b.id], 0
    )
    
    if (verbleibendesMaterial === 0) {
      console.log(`✅ Alle Rohstoffe verarbeitet nach ${postTagIndex} zusätzlichen Tagen`)
      break
    }
    
    postTagIndex++
    aktuellesDatum = addDays(simulationEnde, postTagIndex)
    const datumStr = toLocalISODateString(aktuellesDatum)
    const wochentag = aktuellesDatum.toLocaleDateString('de-DE', { weekday: 'short' })
    const monat = aktuellesDatum.getMonth() + 1
    
    const customFeiertage = konvertiereFeiertage(konfiguration.feiertage)
    const istHeuteArbeitstag = istArbeitstag_Deutschland(aktuellesDatum, customFeiertage)
    const tagImJahr = 365 + postTagIndex
    
    const bauteilePostDetails: TaeglichesLager['bauteile'] = []
    
    // Verarbeite jedes Bauteil
    bauteile.forEach(bauteil => {
      const bauteilId = bauteil.id
      const anfangsBestand = aktuelleBestaende[bauteilId]
      
      // Keine neuen Lieferungen nach Jahresende
      const zugang = 0
      
      // An Arbeitstagen verbrauchen wir so viel Material wie möglich
      let verbrauch = 0
      if (istHeuteArbeitstag && anfangsBestand > 0) {
        // Maximale Tageskapazität aus Schichtsystem:
        // kapazitaetProStunde * stundenProSchicht * maxSchichtenProTag
        const maxTageskapazitaet = 
          konfiguration.produktion.kapazitaetProStunde * 
          konfiguration.produktion.stundenProSchicht * 
          (konfiguration.produktion.maxSchichtenProTag || 3)
        verbrauch = Math.min(anfangsBestand, maxTageskapazitaet)
        aktuelleBestaende[bauteilId] -= verbrauch
        gesamtVerbrauch += verbrauch
      }
      
      const endBestand = aktuelleBestaende[bauteilId]
      
      bauteilePostDetails.push({
        bauteilId,
        bauteilName: bauteil.name,
        anfangsBestand,
        zugang,
        verbrauch,
        endBestand,
        verfuegbarBestand: endBestand,
        reichweiteTage: 0,
        status: endBestand > 0 ? 'niedrig' : 'ok',
        atpCheck: {
          benoetigt: 0,
          verfuegbar: endBestand,
          erfuellt: true,
          grund: 'Post-Jahresende Verarbeitung'
        },
        produktionsBacklog: {
          backlogVorher: 0,
          nichtProduziertHeute: 0,
          backlogNachher: 0,
          nachgeholt: 0
        },
        lieferungen: []
      })
    })
    
    tageErgebnisse.push({
      tag: tagImJahr,
      datum: new Date(aktuellesDatum),
      datumStr,
      wochentag,
      monat,
      istArbeitstag: istHeuteArbeitstag,
      bauteile: bauteilePostDetails
    })
  }
  
  if (postTagIndex >= maxPostTage) {
    const verbleibendesMaterial = bauteile.reduce((sum, b) => 
      sum + aktuelleBestaende[b.id], 0
    )
    warnungen.push(`⚠️ Nach ${maxPostTage} zusätzlichen Tagen verbleiben noch ${verbleibendesMaterial} Teile im Lager!`)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 4: BERECHNE JAHRESSTATISTIK
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const anzahlTage = tageErgebnisse.length
  const durchschnittBestand = Math.round(summeBestaende / (anzahlTage * bauteile.length))
  
  // Liefertreue (% der Tage ohne ATP-Fehler)
  const tageOhneATPFehler = tageErgebnisse.filter(tag => 
    tag.bauteile.every(b => b.atpCheck.erfuellt)
  ).length
  const liefertreue = (tageOhneATPFehler / anzahlTage) * 100
  
  // Logging nur in development mode
  if (process.env.NODE_ENV === 'development') {
    // Berechne End-Backlog über alle Bauteile
    const gesamtBacklogEndstand = Object.values(produktionsBacklog).reduce((sum, b) => sum + b, 0)
    
    // Prüfe Lagerbestände am Ende
    const endLagerbestand = bauteile.reduce((sum, b) => sum + aktuelleBestaende[b.id], 0)
    const verifikationOK = Math.abs(gesamtLieferungen - gesamtVerbrauch) <= 10
    
    // Maximale Tageskapazität für Vergleiche
    const maxTageskapazitaet = 
      konfiguration.produktion.kapazitaetProStunde * 
      konfiguration.produktion.stundenProSchicht * 
      (konfiguration.produktion.maxSchichtenProTag || 3)
    
    console.log(`
      ═══════════════════════════════════════════════════════════════════════════════
      WAREHOUSE MANAGEMENT - JAHRESSTATISTIK
      ═══════════════════════════════════════════════════════════════════════════════
      Simulierte Tage:           ${anzahlTage}
      Simulationszeitraum:       ${tageErgebnisse[0]?.datumStr} - ${tageErgebnisse[anzahlTage-1]?.datumStr}
      
      Gesamt Lieferungen:        ${gesamtLieferungen.toLocaleString('de-DE')} Stück
      Gesamt Verbrauch:          ${gesamtVerbrauch.toLocaleString('de-DE')} Stück
      Differenz (Lager Ende):    ${(gesamtLieferungen - gesamtVerbrauch).toLocaleString('de-DE')} Stück
      
      ✅ VERIFIKATION: ${verifikationOK ? 'BESTANDEN' : 'FEHLER!'}
      ${verifikationOK ? '   Alle gelieferten Teile wurden produziert!' : '   ACHTUNG: Diskrepanz zwischen Lieferungen und Verbrauch!'}
      
      Rohstofflager Ende:        ${endLagerbestand.toLocaleString('de-DE')} Stück ${endLagerbestand === 0 ? '✅' : endLagerbestand < maxTageskapazitaet ? '⚠️' : '❌'}
      
      Gesamt Bedarf (Plan):      ${gesamtBedarf.toLocaleString('de-DE')} Stück
      Tatsächl. produziert:      ${gesamtProduziertTatsaechlich.toLocaleString('de-DE')} Stück
      
      Durchschn. Bestand:        ${durchschnittBestand.toLocaleString('de-DE')} Stück
      Minimal Bestand:           ${minimalBestand === Infinity ? 'N/A' : minimalBestand.toLocaleString('de-DE')} Stück
      Maximal Bestand:           ${maximalBestand === -Infinity ? 'N/A' : maximalBestand.toLocaleString('de-DE')} Stück
      
      Tage mit negativem Bestand: ${tageNegativ}
      Liefertreue (ATP erfüllt): ${liefertreue.toFixed(1)}%
      
      BACKLOG-STATISTIKEN:
      Backlog am Jahresende:     ${gesamtBacklogEndstand.toLocaleString('de-DE')} Stück
      Maximaler Backlog:         ${maximalerBacklog.toLocaleString('de-DE')} Stück
      Tage mit Backlog:          ${tageMitBacklog}
      
      PRODUKTIONSKAPAZITÄT:
      Kapazität pro Schicht:     ${konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht} Bikes
      Max. Schichten pro Tag:    3 (für Backlog-Abbau)
      
      Warnungen:                 ${warnungen.length}
      ═══════════════════════════════════════════════════════════════════════════════
    `)
    
    // Füge Verifikations-Warnung hinzu falls nötig
    if (!verifikationOK) {
      console.error(`
      ❌❌❌ KRITISCHER FEHLER ❌❌❌
      Die Differenz zwischen Lieferungen und Verbrauch ist zu groß!
      Dies deutet auf einen Logikfehler in der Produktionsplanung hin.
      Erwarte: Lieferungen ≈ Verbrauch (Differenz max. 10 Stück)
      `)
    }
  }
  
  // Berechne End-Backlog über alle Bauteile
  const gesamtBacklogEndstand = Object.values(produktionsBacklog).reduce((sum, b) => sum + b, 0)
  
  return {
    tage: tageErgebnisse,
    jahresstatistik: {
      gesamtLieferungen,
      gesamtVerbrauch,
      durchschnittBestand,
      minimalBestand: minimalBestand === Infinity ? 0 : minimalBestand,
      maximalBestand: maximalBestand === -Infinity ? 0 : maximalBestand,
      tageNegativ,
      liefertreue,
      // NEU: Backlog-Statistiken
      gesamtBedarf,
      gesamtProduziertTatsaechlich,
      gesamtBacklogEndstand,
      maximalerBacklog,
      tageMitBacklog
    },
    warnungen
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPORT HELPERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PRODUKTIONSPLAN-KORREKTUR MIT WAREHOUSE-DATEN
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * 🎯 KERN-FIX: Korrigiert Produktionspläne mit tatsächlichen Warehouse-Verbrauchs-Daten
 * 
 * PROBLEM:
 * - OEM Plant 370.000 Bikes → setzt istMenge = planMenge
 * - Warehouse verbraucht nur was verfügbar ist → Delta entsteht!
 * - Produktion zeigt falsches IST, da Material-Engpässe nicht berücksichtigt
 * 
 * LÖSUNG:
 * - Warehouse kennt tatsächlichen Verbrauch pro Tag und Bauteil
 * - Rechne zurück: Verbrauch → Bikes pro Variante
 * - Update istMenge in Produktionsplänen
 * 
 * @param variantenProduktionsplaene - Original-Pläne (mit PLAN = IST)
 * @param warehouseResult - Warehouse-Daten mit tatsächlichem Verbrauch
 * @param konfiguration - Für Stücklisten-Zuordnung
 * @returns Korrigierte Produktionspläne mit echten IST-Mengen
 */
export function korrigiereProduktionsplaeneMitWarehouse(
  variantenProduktionsplaene: Record<string, { tage: TagesProduktionEntry[] }>,
  warehouseResult: WarehouseJahresResult,
  konfiguration: KonfigurationData
): Record<string, { tage: TagesProduktionEntry[] }> {
  
  // Kopiere Original-Pläne (nicht mutieren!)
  const korrigiertePlaene: Record<string, { tage: TagesProduktionEntry[] }> = {}
  
  Object.entries(variantenProduktionsplaene).forEach(([varianteId, plan]) => {
    korrigiertePlaene[varianteId] = {
      tage: plan.tage.map(tag => ({ ...tag })) // Shallow copy
    }
  })
  
  // Für jeden Tag im Warehouse
  warehouseResult.tage.forEach(warehouseTag => {
    const tagImJahr = warehouseTag.tag
    
    // Nur Tage im Planungsjahr (1-365)
    if (tagImJahr < 1 || tagImJahr > 365) return
    
    // Für jede Variante
    Object.entries(korrigiertePlaene).forEach(([varianteId, plan]) => {
      const tagesIndex = tagImJahr - 1 // Array ist 0-basiert
      if (tagesIndex < 0 || tagesIndex >= plan.tage.length) return
      
      const produktionsTag = plan.tage[tagesIndex]
      
      // Finde welches Bauteil diese Variante nutzt (aus Stückliste)
      const stuecklistenPos = konfiguration.stueckliste.find(
        s => s.mtbVariante === varianteId
      )
      
      if (!stuecklistenPos) return
      
      const bauteilId = stuecklistenPos.bauteilId
      const mengeFaktor = stuecklistenPos.menge // Normalerweise 1 (1 Sattel = 1 Bike)
      
      // Finde Bauteil-Verbrauch im Warehouse
      const bauteil = warehouseTag.bauteile.find(b => b.bauteilId === bauteilId)
      if (!bauteil) return
      
      // Berechne tatsächliche Bike-Produktion aus Bauteil-Verbrauch
      // Verbrauch = Anzahl verbrauchter Sättel
      // Bikes = Verbrauch / mengeFaktor (z.B. 740 Sättel / 1 = 740 Bikes)
      const tatsaechlichProduzierteBikes = mengeFaktor > 0 
        ? Math.floor(bauteil.verbrauch / mengeFaktor)
        : 0
      
      // WICHTIG: Verteilung auf Varianten bei gemeinsamen Bauteilen!
      // Wenn mehrere Varianten dasselbe Bauteil nutzen, müssen wir proportional verteilen
      // Finde alle Varianten die dieses Bauteil nutzen
      const variantenMitBauteil = Object.keys(korrigiertePlaene).filter(vId => 
        konfiguration.stueckliste.some(s => s.mtbVariante === vId && s.bauteilId === bauteilId)
      )
      
      if (variantenMitBauteil.length > 1) {
        // PROPORTIONALE VERTEILUNG
        // Berechne Gesamt-PLAN für dieses Bauteil heute
        let gesamtPlan = 0
        const variantenPlaene: Record<string, number> = {}
        
        variantenMitBauteil.forEach(vId => {
          const vPlan = korrigiertePlaene[vId].tage[tagesIndex]
          variantenPlaene[vId] = vPlan.planMenge
          gesamtPlan += vPlan.planMenge
        })
        
        // Verteile tatsächliche Produktion proportional
        if (gesamtPlan > 0) {
          const anteilDieseVariante = variantenPlaene[varianteId] / gesamtPlan
          const istMengeDieseVariante = Math.round(tatsaechlichProduzierteBikes * anteilDieseVariante)
          
          // Update IST-Menge
          produktionsTag.istMenge = istMengeDieseVariante
        } else {
          // Kein Plan → keine Produktion
          produktionsTag.istMenge = 0
        }
      } else {
        // NUR DIESE VARIANTE nutzt das Bauteil → direkte Zuordnung
        produktionsTag.istMenge = tatsaechlichProduzierteBikes
      }
      
      // Berechne Abweichung neu
      produktionsTag.abweichung = produktionsTag.istMenge - produktionsTag.planMenge
      
      // Update materialVerfuegbar Flag
      produktionsTag.materialVerfuegbar = bauteil.atpCheck.erfuellt
    })
  })
  
  // Berechne kumulative Werte neu
  Object.values(korrigiertePlaene).forEach(plan => {
    let kumulativIst = 0
    plan.tage.forEach(tag => {
      kumulativIst += tag.istMenge
      tag.kumulativIst = kumulativIst
    })
  })
  
  return korrigiertePlaene
}

/**
 * Konvertiert Warehouse-Result zu Export-Format
 */
export function konvertiereWarehouseZuExport(result: WarehouseJahresResult) {
  return result.tage.map(tag => ({
    Tag: tag.tag,
    Datum: tag.datumStr,
    Wochentag: tag.wochentag,
    Monat: tag.monat,
    Arbeitstag: tag.istArbeitstag ? 'Ja' : 'Nein',
    ...tag.bauteile.reduce((acc, bauteil) => {
      const prefix = bauteil.bauteilId
      return {
        ...acc,
        [`${prefix}_AnfangsBestand`]: bauteil.anfangsBestand,
        [`${prefix}_Zugang`]: bauteil.zugang,
        [`${prefix}_Verbrauch`]: bauteil.verbrauch,
        [`${prefix}_EndBestand`]: bauteil.endBestand,
        [`${prefix}_Verfuegbar`]: bauteil.verfuegbarBestand,
        [`${prefix}_Reichweite`]: bauteil.reichweiteTage,
        [`${prefix}_Status`]: bauteil.status,
        [`${prefix}_ATP_Erfuellt`]: bauteil.atpCheck.erfuellt ? 'Ja' : 'Nein',
        // NEU: Backlog-Informationen
        [`${prefix}_Backlog_Vorher`]: bauteil.produktionsBacklog.backlogVorher,
        [`${prefix}_Backlog_Nachher`]: bauteil.produktionsBacklog.backlogNachher,
        [`${prefix}_Nicht_Produziert`]: bauteil.produktionsBacklog.nichtProduziertHeute,
        [`${prefix}_Nachgeholt`]: bauteil.produktionsBacklog.nachgeholt
      }
    }, {})
  }))
}
