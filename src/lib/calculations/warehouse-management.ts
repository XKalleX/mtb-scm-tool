/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INTEGRIERTES WAREHOUSE MANAGEMENT SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Berechnet realistische Lagerbestandsentwicklung mit:
 * - Realistischen Losgrößen-basierten Lieferungen (500 Stück)
 * - 49 Tage Vorlaufzeit respektiert
 * - ATP (Available-to-Promise) Checks vor Verbrauch
 * - Start mit 0 Lagerbestand
 * - Volle OEM-Inbound-Warehouse Integration
 * 
 * KONZEPT:
 * 1. Start mit 0 Lagerbestand
 * 2. Verarbeite Inbound-Lieferungen von generiereTaeglicheBestellungen
 * 3. Für jeden Produktionstag: ATP-Check → Verbrauch falls verfügbar
 * 4. Sammle Statistiken und Warnungen
 */

import type { KonfigurationData } from '@/contexts/KonfigurationContext'
import type { TagesProduktionEntry } from './zentrale-produktionsplanung'
import { addDays, toLocalISODateString } from '@/lib/utils'
import { generiereTaeglicheBestellungen, type TaeglicheBestellung } from './inbound-china'

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
 * Gruppiert Bestellungen nach Ankunftsdatum
 */
function gruppiereBestellungenNachAnkunft(
  bestellungen: TaeglicheBestellung[]
): Map<string, TaeglicheBestellung[]> {
  const grouped = new Map<string, TaeglicheBestellung[]>()
  
  bestellungen.forEach(bestellung => {
    const ankunftStr = toLocalISODateString(bestellung.erwarteteAnkunft)
    
    if (!grouped.has(ankunftStr)) {
      grouped.set(ankunftStr, [])
    }
    
    grouped.get(ankunftStr)!.push(bestellung)
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
  
  // Konvertiere Produktionspläne zu TagesProduktionsplan Format
  const produktionsplaeneFormatiert: Record<string, any[]> = {}
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
      konfiguration.feiertage
    ),
    ...zusatzBestellungen
  ]
  
  console.log(`🏭 Warehouse Management: ${bestellungen.length} Bestellungen generiert`)
  const zeitraumStart = bestellungen[0]?.bestelldatum instanceof Date 
    ? bestellungen[0].bestelldatum.toLocaleDateString('de-DE') 
    : 'N/A'
  const zeitraumEnde = bestellungen[bestellungen.length - 1]?.bestelldatum instanceof Date 
    ? bestellungen[bestellungen.length - 1].bestelldatum.toLocaleDateString('de-DE') 
    : 'N/A'
  console.log(`   Zeitraum: ${zeitraumStart} - ${zeitraumEnde}`)
  
  // Gruppiere Bestellungen nach Ankunftsdatum
  const lieferungenProTag = gruppiereBestellungenNachAnkunft(bestellungen)
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 2: INITIALISIERE LAGERBESTÄNDE MIT 0
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const bauteile = konfiguration.bauteile
  const aktuelleBestaende: Record<string, number> = {}
  
  // Start mit 0 Lagerbestand (keine imaginären Anfangsbestände)
  // Anforderung: Tag 1-3 (01.01.-03.01.2027) haben KEINE Anfangsbestände
  // Erste Lieferung: Tag 4 (04.01.2027) mit 500 Sätteln
  // Vorlaufzeit: 49 Tage → Bestellung muss im November 2026 gestartet werden
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
  
  // Simulationszeitraum: Von frühester Bestellung bis 31.12.2027
  const simulationStart = new Date(fruehesteDatum)
  const simulationEnde = new Date(planungsjahr, 11, 31) // 31.12.2027
  
  let aktuellesDatum = new Date(simulationStart)
  let tagIndex = 0
  
  // Statistik-Tracker
  let gesamtLieferungen = 0
  let gesamtVerbrauch = 0
  let summeBestaende = 0
  let minimalBestand = Infinity
  let maximalBestand = -Infinity
  let tageNegativ = 0
  
  while (aktuellesDatum <= simulationEnde) {
    tagIndex++
    
    const datumStr = toLocalISODateString(aktuellesDatum)
    const wochentag = aktuellesDatum.toLocaleDateString('de-DE', { weekday: 'short' })
    const monat = aktuellesDatum.getMonth() + 1
    const istWochenende = aktuellesDatum.getDay() === 0 || aktuellesDatum.getDay() === 6
    
    // Prüfe Feiertag
    const deutscheFeiertage = konfiguration.feiertage
      .filter(f => f.land === 'Deutschland')
      .map(f => f.datum)
    const istFeiertag = deutscheFeiertage.includes(datumStr)
    const istArbeitstag = !istWochenende && !istFeiertag
    
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
      
      if (istArbeitstag && tagImJahr >= 1 && tagImJahr <= 365) {
        // Summiere Verbrauch über alle Varianten
        Object.entries(variantenProduktionsplaene).forEach(([varianteId, plan]) => {
          const tagesIndex = tagImJahr - 1 // Array ist 0-basiert
          if (tagesIndex >= 0 && tagesIndex < plan.tage.length) {
            const tagesProduktion = plan.tage[tagesIndex]
            const verbrauchVariante = berechneVerbrauchProBauteil(
              tagesProduktion.istMenge,
              varianteId,
              bauteilId,
              konfiguration
            )
            benoetigt += verbrauchVariante
          }
        })
        
        // ═════════════════════════════════════════════════════════════════════════
        // STEP 3c: ATP-CHECK (Available-to-Promise)
        // ═════════════════════════════════════════════════════════════════════════
        
        // Direkter Check auf Lagerbestand
        const verfuegbarFuerProduktion = aktuelleBestaende[bauteilId]
        
        if (benoetigt > verfuegbarFuerProduktion) {
          // NICHT GENUG MATERIAL!
          atpErfuellt = false
          
          if (benoetigt > aktuelleBestaende[bauteilId]) {
            atpGrund = `Nicht genug Material (Bedarf: ${benoetigt}, Verfügbar: ${aktuelleBestaende[bauteilId]})`
          } else {
            atpGrund = `Material-Engpass erkannt`
          }
          
          // Reduziere Verbrauch auf verfügbare Menge
          verbrauch = Math.max(0, verfuegbarFuerProduktion)
          
          warnungen.push(
            `⚠️ ${datumStr} (Tag ${tagImJahr}): ATP-Check fehlgeschlagen für ${bauteil.name}! ${atpGrund}`
          )
        } else {
          // GENUG MATERIAL - volle Produktion möglich
          verbrauch = benoetigt
          atpErfuellt = true
        }
        
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
      const durchschnittVerbrauchProTag = gesamtVerbrauch / Math.max(1, tagIndex)
      const reichweiteTage = durchschnittVerbrauchProTag > 0 
        ? endBestand / durchschnittVerbrauchProTag 
        : 999
      
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
    console.log(`
      ═══════════════════════════════════════════════════════════════════════════════
      WAREHOUSE MANAGEMENT - JAHRESSTATISTIK
      ═══════════════════════════════════════════════════════════════════════════════
      Simulierte Tage:           ${anzahlTage}
      Gesamt Lieferungen:        ${gesamtLieferungen.toLocaleString('de-DE')} Stück
      Gesamt Verbrauch:          ${gesamtVerbrauch.toLocaleString('de-DE')} Stück
      Differenz:                 ${(gesamtLieferungen - gesamtVerbrauch).toLocaleString('de-DE')} Stück
      
      Durchschn. Bestand:        ${durchschnittBestand.toLocaleString('de-DE')} Stück
      Minimal Bestand:           ${minimalBestand === Infinity ? 'N/A' : minimalBestand.toLocaleString('de-DE')} Stück
      Maximal Bestand:           ${maximalBestand === -Infinity ? 'N/A' : maximalBestand.toLocaleString('de-DE')} Stück
      
      Tage mit negativem Bestand: ${tageNegativ}
      Liefertreue (ATP erfüllt): ${liefertreue.toFixed(1)}%
      
      Warnungen:                 ${warnungen.length}
      ═══════════════════════════════════════════════════════════════════════════════
    `)
  }
  
  return {
    tage: tageErgebnisse,
    jahresstatistik: {
      gesamtLieferungen,
      gesamtVerbrauch,
      durchschnittBestand,
      minimalBestand: minimalBestand === Infinity ? 0 : minimalBestand,
      maximalBestand: maximalBestand === -Infinity ? 0 : maximalBestand,
      tageNegativ,
      liefertreue
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
        [`${prefix}_ATP_Erfuellt`]: bauteil.atpCheck.erfuellt ? 'Ja' : 'Nein'
      }
    }, {})
  }))
}
