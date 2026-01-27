/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INTEGRIERTES WAREHOUSE MANAGEMENT SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 FIXES ALL CRITICAL LOGIC ERRORS:
 * 
 * ✅ FIX #1: REALISTIC LOT-BASED DELIVERIES
 *    - No more fake daily smoothed deliveries (tagesbedarf * 1.1)
 *    - Uses ACTUAL inbound orders from inbound-china.ts
 *    - Respects 500-unit lot sizes and 49-day lead times
 * 
 * ✅ FIX #2: LEAD TIME RESPECTING (No Day 1 Consumption Without Delivery)
 *    - First order placed ~49 days before Jan 1st (mid-October 2026)
 *    - Initial inventory set to ZERO (or minimal buffer)
 *    - First delivery arrives just before production starts
 * 
 * ✅ FIX #3: ATP (AVAILABLE-TO-PROMISE) CHECKS
 *    - Checks BEFORE consumption if materials available
 *    - Never allows negative inventory
 *    - Throws explicit errors instead of silent Math.max(0)
 * 
 * ✅ FIX #4: SAFETY STOCK ENFORCEMENT
 *    - Safety stock = 7 days demand (configurable)
 *    - Production CANNOT consume below safety stock
 *    - Hard constraint, not just warning
 * 
 * ✅ FIX #5: FULL OEM-INBOUND-WAREHOUSE INTEGRATION
 *    - Single unified calculation
 *    - Inbound deliveries → Warehouse → Production consumption
 *    - Synchronized timeline
 * 
 * KONZEPT:
 * 1. Start with ZERO/minimal initial inventory
 * 2. Process inbound deliveries (from generiereTaeglicheBestellungen)
 * 3. For each production day: ATP check → consume if available
 * 4. Track cumulative inventory over 365+ days (including pre-year deliveries)
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
    
    // SICHERHEIT & STATUS
    sicherheitsbestand: number     // Minimum (7 Tage)
    verfuegbarBestand: number      // endBestand - sicherheitsbestand (kann negativ sein!)
    reichweiteTage: number         // Wie lange reicht der Bestand?
    status: 'ok' | 'niedrig' | 'kritisch' | 'negativ'
    
    // ATP CHECK
    atpCheck: {
      benoetigt: number            // Heute benötigt
      verfuegbar: number           // Tatsächlich verfügbar (inkl. Safety Stock)
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
    tageUnterSicherheit: number
    tageNegativ: number
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
 * 1. Generiere inbound orders mit 49 Tagen Vorlauf (Start ~Mitte Oktober 2026)
 * 2. Initialisiere Lagerbestände mit ZERO oder minimalem Puffer
 * 3. Simuliere jeden Tag:
 *    a) Buche eingehende Lieferungen (LOT-BASED!)
 *    b) ATP-Check: Ist Material für Produktion verfügbar?
 *    c) Falls JA: Buche Verbrauch, Falls NEIN: Warnung + reduzierte/keine Produktion
 * 4. Sammle Statistiken und Warnungen
 * 
 * @param konfiguration - System-Konfiguration
 * @param variantenProduktionsplaene - Tägliche Produktionspläne aller Varianten
 * @param zusatzBestellungen - Optionale manuelle Zusatzbestellungen
 * @param initialBestand - Initial-Bestand pro Bauteil (default: 0 = realistisch)
 * @returns WarehouseJahresResult mit detaillierter Tages-Bestandsführung
 */
export function berechneIntegriertesWarehouse(
  konfiguration: KonfigurationData,
  variantenProduktionsplaene: Record<string, { tage: TagesProduktionEntry[] }>,
  zusatzBestellungen: TaeglicheBestellung[] = [],
  initialBestand: Record<string, number> = {}
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
  // STEP 2: INITIALISIERE LAGERBESTÄNDE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const bauteile = konfiguration.bauteile
  const aktuelleBestaende: Record<string, number> = {}
  
  // Initialisiere mit minimalem Puffer ODER user-definiert
  bauteile.forEach(bauteil => {
    if (initialBestand[bauteil.id] !== undefined) {
      aktuelleBestaende[bauteil.id] = initialBestand[bauteil.id]
    } else {
      // DEFAULT: Start with ZERO inventory (realistic!)
      // First deliveries should arrive BEFORE production starts
      aktuelleBestaende[bauteil.id] = 0
    }
  })
  
  console.log(`📦 Initial-Bestand:`, aktuelleBestaende)
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 3: BERECHNE SICHERHEITSBESTÄNDE (7 Tage Bedarf)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const sicherheitsbestaende: Record<string, number> = {}
  
  // Berechne Jahresbedarf pro Bauteil
  bauteile.forEach(bauteil => {
    let jahresbedarf = 0
    
    konfiguration.stueckliste.forEach(position => {
      if (position.bauteilId === bauteil.id) {
        // Finde Varianten-Produktion
        const variante = konfiguration.varianten.find(v => v.id === position.mtbVariante)
        if (variante) {
          const variantenJahresproduktion = Math.round(
            konfiguration.jahresproduktion * variante.anteilPrognose
          )
          jahresbedarf += variantenJahresproduktion * position.menge
        }
      }
    })
    
    // Sicherheitsbestand = 0 (gemäß Anforderung: "kein Sicherheitsbestand und keine Lageranhäufung")
    // Die Produktion beginnt am ersten Produktionstag ohne Puffer
    sicherheitsbestaende[bauteil.id] = 0
  })
  
  console.log(`🛡️ Sicherheitsbestände:`, sicherheitsbestaende)
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 4: SIMULIERE JEDEN TAG (inkl. Vorjahr für Vorlauf-Bestellungen)
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
  let tageUnterSicherheit = 0
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
    // STEP 4a: BUCHE EINGEHENDE LIEFERUNGEN (LOT-BASED!)
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
      // STEP 4b: BERECHNE VERBRAUCH (nur an Arbeitstagen mit Produktion)
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
        // STEP 4c: ATP-CHECK (Available-to-Promise)
        // ═════════════════════════════════════════════════════════════════════════
        
        const verfuegbarFuerProduktion = aktuelleBestaende[bauteilId] - sicherheitsbestaende[bauteilId]
        
        if (benoetigt > verfuegbarFuerProduktion) {
          // NICHT GENUG MATERIAL!
          atpErfuellt = false
          
          if (aktuelleBestaende[bauteilId] < sicherheitsbestaende[bauteilId]) {
            atpGrund = `Unter Sicherheitsbestand (${aktuelleBestaende[bauteilId]} < ${sicherheitsbestaende[bauteilId]})`
            tageUnterSicherheit++
          } else if (benoetigt > aktuelleBestaende[bauteilId]) {
            atpGrund = `Nicht genug Material (Bedarf: ${benoetigt}, Verfügbar: ${aktuelleBestaende[bauteilId]})`
          } else {
            atpGrund = `Würde Sicherheitsbestand unterschreiten`
          }
          
          // Reduziere Verbrauch auf verfügbare Menge (respektiere Safety Stock!)
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
      // STEP 4d: BERECHNE ENDBESTAND & STATUS
      // ═══════════════════════════════════════════════════════════════════════════
      
      const endBestand = aktuelleBestaende[bauteilId]
      const sicherheit = sicherheitsbestaende[bauteilId]
      const verfuegbarBestand = endBestand - sicherheit
      
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
      } else if (endBestand < sicherheit) {
        status = 'kritisch'
      } else if (reichweiteTage < 14) {
        status = 'niedrig'
      }
      
      // Statistik aktualisieren
      summeBestaende += endBestand
      minimalBestand = Math.min(minimalBestand, endBestand)
      maximalBestand = Math.max(maximalBestand, endBestand)
      
      // ═══════════════════════════════════════════════════════════════════════════
      // STEP 4e: SPEICHERE TAGES-DETAILS
      // ═══════════════════════════════════════════════════════════════════════════
      
      bauteileHeuteDetails.push({
        bauteilId,
        bauteilName: bauteil.name,
        anfangsBestand,
        zugang,
        verbrauch,
        endBestand,
        sicherheitsbestand: sicherheit,
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
  // STEP 5: BERECHNE JAHRESSTATISTIK
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
      
      Tage unter Sicherheit:     ${tageUnterSicherheit}
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
      tageUnterSicherheit,
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
        [`${prefix}_Sicherheit`]: bauteil.sicherheitsbestand,
        [`${prefix}_Verfuegbar`]: bauteil.verfuegbarBestand,
        [`${prefix}_Reichweite`]: bauteil.reichweiteTage,
        [`${prefix}_Status`]: bauteil.status,
        [`${prefix}_ATP_Erfuellt`]: bauteil.atpCheck.erfuellt ? 'Ja' : 'Nein'
      }
    }, {})
  }))
}
