/**
 * ========================================
 * INBOUND LOGISTIK - CHINA
 * ========================================
 * 
 * Bestellungen beim einzigen Lieferanten (China) - nur Sättel!
 * 
 * ✅ ANFORDERUNG: Bestellmenge = exakt OEM-Tagesbedarf (1:1)
 * - KEINE Losgröße bei der Bestellung selbst
 * - Die Losgröße wird nur am Hafen für den Schiffsversand angewendet
 * - Schiffe fahren NUR mittwochs ab Shanghai
 * - LKWs fahren NICHT am Wochenende
 * - Material verfügbar am NÄCHSTEN TAG nach Ankunft
 * 
 * Alle Parameter aus KonfigurationContext oder JSON-Referenzen
 */

import { TagesProduktionsplan } from '@/types'
import { addDays, generateId, isWeekend, toLocalISODateString, daysBetween } from '@/lib/utils'
import { 
  berechneAnkunftsdatum, 
  istChinaFeiertag,
  istArbeitstag_Deutschland,
  naechsterArbeitstag_Deutschland,
  FeiertagsKonfiguration,
  berechneMaterialflussDetails,
  naechsterMittwoch,
  type MaterialflussDetails
} from '@/lib/kalender'
import lieferantChinaData from '@/data/lieferant-china.json' 

/**
 * Globaler Counter für lesbare Bestellungs-IDs
 * Format: B-JAHR-NNN (z.B. B-2027-001)
 */
let globalBestellungsNummer = 1

/**
 * Setzt den Bestellungs-Counter zurück (für neue Berechnungen)
 */
export function resetBestellungsNummer(): void {
  globalBestellungsNummer = 1
}

/**
 * Generiert eine lesbare Bestellungs-ID
 * Format: B-JAHR-NNN (z.B. B-2027-001)
 */
function generiereBestellungsId(jahr: number): string {
  return `B-${jahr}-${String(globalBestellungsNummer++).padStart(3, '0')}`
}

// Type für Komponente
type Komponente = {
  name: string;
  menge: number;
  einheit: string;
}

/**
 * Rundet Bestellmenge auf Losgröße auf
 * * @param menge - Benötigte Menge
 * @param losgroesse - Losgröße (aus KonfigurationContext oder JSON-Referenz)
 * @returns Aufgerundete Bestellmenge
 */
export function rundeAufLosgroesse(menge: number, losgroesse: number = lieferantChinaData.lieferant.losgroesse): number {
  if (menge === 0) return 0
  
  // Aufrunden auf nächstes Vielfaches der Losgröße
  return Math.ceil(menge / losgroesse) * losgroesse
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TÄGLICHE BESTELLLOGIK - EXAKT 1:1 OEM-BEDARF
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ✅ KERNPRINZIP: Bestellmenge = exakt OEM-Tagesbedarf
 * - Für jeden Produktionstag wird der exakte Bedarf bestellt
 * - KEINE Losgrößen-Rundung bei der Bestellung
 * - Die Losgröße wird nur am Hafen für den Schiffsversand verwendet
 */
export interface TaeglicheBestellung {
  id: string
  bestelldatum: Date
  bedarfsdatum: Date
  komponenten: Record<string, number> // Sattel-ID → Menge
  erwarteteAnkunft: Date
  verfuegbarAb: Date                  // Material verfügbar am nächsten Tag nach Ankunft
  status: 'bestellt' | 'unterwegs' | 'geliefert'
  istVorjahr: boolean // Bestellung aus 2026?
  grund: 'losgroesse' | 'zusatzbestellung'
  
  // Detaillierter Materialfluss
  materialfluss?: MaterialflussDetails
  schiffAbfahrtMittwoch?: Date        // Schiff fährt nur mittwochs!
  wartetageAmHafen?: number           // Tage die Ware am Hafen wartet
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HAFEN-SIMULATION MIT MITTWOCHS-SCHIFFEN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Simuliert die Zwischenlagerung am Hafen Shanghai:
 * - Bestellungen kommen täglich am Hafen an (nach Produktion + LKW)
 * - Schiffe fahren NUR mittwochs ab
 * - Schiffe nehmen floor(lagerbestand / 500) * 500 Sättel mit
 * - Rest wartet auf nächsten Mittwoch
 * 
 * @param bestellungen - Alle Bestellungen mit Materialfluss-Details
 * @param customFeiertage - Optionale Feiertage für Berechnungen
 * @param losgroesse - Losgröße für Schiffsbeladung (Standard: 500)
 * @returns Map: Lieferdatum am Werk → Menge + Statistiken
 */
interface HafenSimulationErgebnis {
  lieferungenAmWerk: Map<string, number>  // Date-String → Menge
  hafenStatistik: {
    maxLagerbestand: number
    durchschnittlicheWartezeit: number
    anzahlSchiffe: number
  }
}

function simuliereHafenUndSchiffsversand(
  bestellungen: TaeglicheBestellung[],
  customFeiertage?: FeiertagsKonfiguration[],
  losgroesse: number = lieferantChinaData.lieferant.losgroesse
): HafenSimulationErgebnis {
  // Hafen-Lagerbestand (kumulativ pro Komponente)
  const hafenLager: Record<string, number> = {}
  
  // Lieferungen am Werk (Datum → Komponente → Menge)
  const lieferungenAmWerk = new Map<string, Map<string, number>>()
  
  // Statistik
  let maxLagerbestand = 0
  const wartezeiten: number[] = []
  let anzahlSchiffe = 0
  
  // Track when each order arrives at harbor and when it ships out
  const orderHarborTracking = new Map<string, { ankunftDatum: Date, abfahrtDatum?: Date }>()
  
  // Erstelle Timeline: Wann kommt was am Hafen an
  interface HafenAnkunft {
    datum: Date
    komponenten: Record<string, number>
    bestellungId: string
    bestelldatum: Date
  }
  
  const hafenAnkunftsTimeline: HafenAnkunft[] = []
  
  bestellungen.forEach(bestellung => {
    if (!bestellung.materialfluss) return
    
    hafenAnkunftsTimeline.push({
      datum: bestellung.materialfluss.ankunftHafenShanghai,
      komponenten: bestellung.komponenten,
      bestellungId: bestellung.id,
      bestelldatum: bestellung.bestelldatum
    })
    
    // Track harbor arrival
    orderHarborTracking.set(bestellung.id, {
      ankunftDatum: bestellung.materialfluss.ankunftHafenShanghai
    })
  })
  
  // Sortiere nach Ankunftsdatum
  hafenAnkunftsTimeline.sort((a, b) => a.datum.getTime() - b.datum.getTime())
  
  // Initialisiere Hafen-Lager
  Object.keys(lieferantChinaData.komponentenDetails).forEach(kompId => {
    hafenLager[kompId] = 0
  })
  
  // Simuliere jeden Tag von erster Ankunft bis letzte + 60 Tage
  const startDatum = hafenAnkunftsTimeline.length > 0 
    ? hafenAnkunftsTimeline[0].datum 
    : new Date(2026, 10, 1) // Fallback: 01.11.2026
  
  const endDatum = hafenAnkunftsTimeline.length > 0
    ? addDays(hafenAnkunftsTimeline[hafenAnkunftsTimeline.length - 1].datum, 60)
    : addDays(startDatum, 365)
  
  let aktuelleDatum = new Date(startDatum)
  let ankunftsIndex = 0
  
  while (aktuelleDatum <= endDatum) {
    const datumStr = toLocalISODateString(aktuelleDatum)
    
    // 1. ANKUNFT: Füge Ware die heute ankommt zum Hafen-Lager hinzu
    while (ankunftsIndex < hafenAnkunftsTimeline.length) {
      const ankunft = hafenAnkunftsTimeline[ankunftsIndex]
      const ankunftStr = toLocalISODateString(ankunft.datum)
      
      if (ankunftStr === datumStr) {
        // Ware kommt heute am Hafen an
        Object.entries(ankunft.komponenten).forEach(([kompId, menge]) => {
          hafenLager[kompId] = (hafenLager[kompId] || 0) + menge
        })
        
        ankunftsIndex++
      } else if (ankunft.datum > aktuelleDatum) {
        break
      } else {
        ankunftsIndex++
      }
    }
    
    // Berechne aktuellen Gesamt-Lagerbestand
    const gesamtLagerbestand = Object.values(hafenLager).reduce((sum, m) => sum + m, 0)
    if (gesamtLagerbestand > maxLagerbestand) {
      maxLagerbestand = gesamtLagerbestand
    }
    
    // 2. SCHIFFSABFAHRT: Nur mittwochs!
    if (aktuelleDatum.getDay() === 3 && gesamtLagerbestand > 0) {
      // Es ist Mittwoch und es gibt Ware im Hafen
      
      // Berechne wie viel aufs Schiff passt (in Losgrößen)
      const ladungMenge = Math.floor(gesamtLagerbestand / losgroesse) * losgroesse
      
      if (ladungMenge > 0) {
        anzahlSchiffe++
        
        // Track ship departure for wait time calculation
        // Mark all orders in harbor as shipped and calculate wait times
        hafenAnkunftsTimeline.forEach((ankunft, index) => {
          if (index < ankunftsIndex) { // Only processed arrivals
            const tracking = orderHarborTracking.get(ankunft.bestellungId)
            if (tracking && !tracking.abfahrtDatum) {
              // Order is shipping out now
              tracking.abfahrtDatum = new Date(aktuelleDatum)
              const warteTage = daysBetween(tracking.ankunftDatum, aktuelleDatum)
              if (warteTage >= 0) {
                wartezeiten.push(warteTage)
              }
            }
          }
        })
        
        // Entnehme proportional aus allen Komponenten
        const verladeneKomponenten: Record<string, number> = {}
        let verbleibendeKapazitaet = ladungMenge
        
        // Berechne Proportionen
        Object.entries(hafenLager).forEach(([kompId, menge]) => {
          if (menge > 0 && verbleibendeKapazitaet > 0) {
            const anteil = menge / gesamtLagerbestand
            const zuVerladen = Math.floor(anteil * ladungMenge)
            
            verladeneKomponenten[kompId] = zuVerladen
            hafenLager[kompId] -= zuVerladen
            verbleibendeKapazitaet -= zuVerladen
          }
        })
        
        // Berechne Ankunftsdatum am Werk
        // Schiff fährt 30 Tage
        const schiffAnkunftHamburg = addDays(aktuelleDatum, lieferantChinaData.lieferant.vorlaufzeitKalendertage)
        
        // LKW Hamburg → Werk (+2 AT, aber nur +1 Tag wegen "Ankunft am 2. Tag")
        let lkwAbfahrt = new Date(schiffAnkunftHamburg)
        while (isWeekend(lkwAbfahrt)) {
          lkwAbfahrt = addDays(lkwAbfahrt, 1)
        }
        
        let werkAnkunft = addDays(lkwAbfahrt, lieferantChinaData.lieferant.lkwTransportDeutschlandArbeitstage - 1)
        while (isWeekend(werkAnkunft)) {
          werkAnkunft = addDays(werkAnkunft, 1)
        }
        
        // Material verfügbar am nächsten Tag
        const verfuegbarAb = addDays(werkAnkunft, 1)
        const verfuegbarStr = toLocalISODateString(verfuegbarAb)
        
        // Registriere Lieferung am Werk
        if (!lieferungenAmWerk.has(verfuegbarStr)) {
          lieferungenAmWerk.set(verfuegbarStr, new Map())
        }
        
        const tagesLieferung = lieferungenAmWerk.get(verfuegbarStr)!
        Object.entries(verladeneKomponenten).forEach(([kompId, menge]) => {
          const bisherigeMenge = tagesLieferung.get(kompId) || 0
          tagesLieferung.set(kompId, bisherigeMenge + menge)
        })
      }
    }
    
    // Nächster Tag
    aktuelleDatum = addDays(aktuelleDatum, 1)
  }
  
  // Konvertiere zu flacher Map (String → Gesamtmenge)
  const flatLieferungen = new Map<string, number>()
  lieferungenAmWerk.forEach((komponenten, datum) => {
    const gesamtMenge = Array.from(komponenten.values()).reduce((sum, m) => sum + m, 0)
    flatLieferungen.set(datum, gesamtMenge)
  })
  
  // Berechne durchschnittliche Wartezeit
  const durchschnittlicheWartezeit = wartezeiten.length > 0
    ? wartezeiten.reduce((sum, w) => sum + w, 0) / wartezeiten.length
    : 0
  
  return {
    lieferungenAmWerk: flatLieferungen,
    hafenStatistik: {
      maxLagerbestand,
      durchschnittlicheWartezeit,
      anzahlSchiffe
    }
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HAUPTFUNKTION: Generiert Inbound-Lieferplan mit Hafen-Simulation
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NEUE LOGIK mit echter Hafen-Simulation:
 * 1. Berechne täglichen Bedarf aus OEM-Produktionsplänen
 * 2. Erstelle Bestellungen (49 Tage Lookahead)
 * 3. Simuliere Hafen Shanghai:
 *    - Bestellungen kommen täglich am Hafen an
 *    - Schiffe fahren nur mittwochs
 *    - Schiffe nehmen floor(lager / 500) * 500 Einheiten
 * 4. Berechne Ankunftsdaten am Werk
 * 5. Returne Liefer-Schedule
 * 
 * @param alleProduktionsplaene - Produktionspläne aller MTB-Varianten (OEM)
 * @param planungsjahr - Jahr für Planung (z.B. 2027)
 * @param vorlaufzeitTage - Planungs-Vorlaufzeit in Tagen (Standard: 49)
 * @param customFeiertage - Optionale Feiertage (China + Deutschland)
 * @param stuecklisten - Stücklisten-Map (Variante → Komponenten)
 * @param losgroesse - Losgröße für Schiffsbeladung (Standard: 500)
 * @param lieferintervall - Lieferintervall in Tagen (aktuell nicht verwendet)
 * @returns InboundLieferplanErgebnis mit Bestellungen, Lieferungen und Statistiken
 */
export interface InboundLieferplanErgebnis {
  bestellungen: TaeglicheBestellung[]
  lieferungenAmWerk: Map<string, Record<string, number>>  // Date → Component → Amount
  hafenStatistik: {
    maxLagerbestand: number
    durchschnittlicheWartezeit: number
    anzahlSchiffe: number
  }
}

export function generiereInboundLieferplan(
  alleProduktionsplaene: Record<string, any[]>,
  planungsjahr: number,
  vorlaufzeitTage: number,
  customFeiertage?: FeiertagsKonfiguration[],
  stuecklisten?: Record<string, { komponenten: Record<string, { name: string; menge: number; einheit: string }> }>,
  losgroesse: number = lieferantChinaData.lieferant.losgroesse,
  lieferintervall: number = lieferantChinaData.lieferant.lieferintervall
): InboundLieferplanErgebnis {
  // 1. Erstelle Bestellungen (wie vorher)
  const bestellungen = generiereTaeglicheBestellungen(
    alleProduktionsplaene,
    planungsjahr,
    vorlaufzeitTage,
    customFeiertage,
    stuecklisten,
    losgroesse,
    lieferintervall
  )
  
  // 2. Simuliere Hafen und Schiffsversand
  const hafenSimulation = simuliereHafenUndSchiffsversand(bestellungen, customFeiertage, losgroesse)
  
  // 3. Konvertiere zu detaillierter Lieferungs-Map (Date → Component → Amount)
  const lieferungenAmWerk = new Map<string, Record<string, number>>()
  
  // Gruppiere Bestellungen nach Verfügbarkeitsdatum
  bestellungen.forEach(bestellung => {
    const verfuegbarStr = toLocalISODateString(bestellung.verfuegbarAb)
    
    if (!lieferungenAmWerk.has(verfuegbarStr)) {
      lieferungenAmWerk.set(verfuegbarStr, {})
    }
    
    const tagesLieferung = lieferungenAmWerk.get(verfuegbarStr)!
    Object.entries(bestellung.komponenten).forEach(([kompId, menge]) => {
      tagesLieferung[kompId] = (tagesLieferung[kompId] || 0) + menge
    })
  })
  
  console.log(`
    ═══════════════════════════════════════════════════════════════════════════════
    HAFEN-SIMULATION SHANGHAI (Mittwochs-Schiffe)
    ═══════════════════════════════════════════════════════════════════════════════
    Max. Lagerbestand am Hafen:   ${hafenSimulation.hafenStatistik.maxLagerbestand.toLocaleString('de-DE')} Sättel
    Anzahl Schiffe:                ${hafenSimulation.hafenStatistik.anzahlSchiffe}
    Ø Wartezeit am Hafen:          ${hafenSimulation.hafenStatistik.durchschnittlicheWartezeit.toFixed(1)} Tage
    
    Schiffe fahren NUR mittwochs!
    Losgröße pro Schiff: ${losgroesse} Sättel (Vielfaches)
    ═══════════════════════════════════════════════════════════════════════════════
  `)
  
  return {
    bestellungen,
    lieferungenAmWerk,
    hafenStatistik: hafenSimulation.hafenStatistik
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LEGACY-FUNKTION: Generiert Bestellungen basierend auf OEM-Produktionsplänen
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * HINWEIS: Diese Funktion ist jetzt nur noch für interne Verwendung.
 * Externe Aufrufer sollten generiereInboundLieferplan() verwenden!
 * 
 * LOGIK:
 * 1. Für jeden Tag im Planungsjahr (1-365):
 *    - Berechne den Sattel-Bedarf aus den OEM-Produktionsplänen
 *    - Erstelle eine Bestellung mit exakt diesem Bedarf (49 Tage vorher)
 * 2. Keine Losgrößen-Rundung bei der Bestellung!
 * 3. Summe aller Bestellungen = exakt 370.000 Sättel
 */
export function generiereTaeglicheBestellungen(
  alleProduktionsplaene: Record<string, any[]>,
  planungsjahr: number,
  vorlaufzeitTage: number,
  customFeiertage?: FeiertagsKonfiguration[],
  stuecklisten?: Record<string, { komponenten: Record<string, { name: string; menge: number; einheit: string }> }>,
  losgroesse: number = lieferantChinaData.lieferant.losgroesse,
  lieferintervall: number = lieferantChinaData.lieferant.lieferintervall
): TaeglicheBestellung[] {
  const bestellungen: TaeglicheBestellung[] = []
  
  // Reset Bestellungs-Counter für neue Berechnung
  resetBestellungsNummer()
  
  const stklst = stuecklisten || {}
  const VORLAUFZEIT_TAGE = vorlaufzeitTage
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHRITT 1: Berechne täglichen Bedarf pro Komponente (365 Tage)
  // ═══════════════════════════════════════════════════════════════════════════════
  const taeglicheBedarf: Record<string, number[]> = {} // komponente -> array[365]
  
  // Initialisiere alle Sattel-Komponenten
  const alleKomponenten = new Set<string>()
  Object.values(stklst).forEach(sl => {
    const komponenten = sl.komponenten as Record<string, Komponente>
    Object.keys(komponenten).forEach(k => alleKomponenten.add(k))
  })
  
  alleKomponenten.forEach(k => {
    taeglicheBedarf[k] = Array(365).fill(0)
  })
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHRITT 2: Fülle täglichen Bedarf aus OEM-Produktionsplänen
  // ═══════════════════════════════════════════════════════════════════════════════
  Object.entries(alleProduktionsplaene).forEach(([varianteId, plan]) => {
    const stueckliste = stklst[varianteId as keyof typeof stklst]
    if (!stueckliste) return
    
    const komponenten = stueckliste.komponenten as Record<string, Komponente>
    
    plan.forEach((tag, tagIndex) => {
      // ✅ Nutze planMenge für Bedarfsermittlung (OEM-Plan = Bestellgrundlage)
      const planMenge = (tag as any).planMenge || (tag as any).sollMenge || 0
      
      if (planMenge > 0 && tagIndex < 365) {
        Object.entries(komponenten).forEach(([kompId, komp]) => {
          taeglicheBedarf[kompId][tagIndex] += planMenge * komp.menge
        })
      }
    })
  })
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHRITT 3: BESTELLUNGEN ERSTELLEN (1:1 OEM-BEDARF)
  // ═══════════════════════════════════════════════════════════════════════════════
  // Für jeden Produktionstag erstellen wir eine Bestellung mit dem exakten Bedarf
  // Das Bestelldatum liegt 49 Tage VOR dem Produktionstag
  
  const produktionsStart = new Date(planungsjahr, 0, 1)
  
  for (let tagIndex = 0; tagIndex < 365; tagIndex++) {
    // Berechne den Gesamtbedarf für diesen Tag (über alle Komponenten)
    const tagesBedarf: Record<string, number> = {}
    let gesamtBedarf = 0
    
    alleKomponenten.forEach(kompId => {
      const bedarf = taeglicheBedarf[kompId][tagIndex] || 0
      if (bedarf > 0) {
        tagesBedarf[kompId] = bedarf
        gesamtBedarf += bedarf
      }
    })
    
    // Nur Bestellungen erstellen wenn es Bedarf gibt
    if (gesamtBedarf === 0) continue
    
    // Bedarfsdatum = der Produktionstag
    const bedarfsdatum = addDays(produktionsStart, tagIndex)
    
    // Bestelldatum = 49 Tage vor dem Bedarfsdatum
    let bestelldatum = addDays(bedarfsdatum, -VORLAUFZEIT_TAGE)
    
    // Wenn Bestelldatum ein Wochenende/Feiertag ist, auf vorherigen Arbeitstag gehen
    while (isWeekend(bestelldatum) || istChinaFeiertag(bestelldatum, customFeiertage).length > 0) {
      bestelldatum = addDays(bestelldatum, -1)
    }
    
    // Berechne detaillierten Materialfluss
    const materialfluss = berechneMaterialflussDetails(bestelldatum, customFeiertage)
    const bestellungId = generiereBestellungsId(planungsjahr)
    
    bestellungen.push({
      id: bestellungId,
      bestelldatum,
      bedarfsdatum,
      komponenten: tagesBedarf,
      erwarteteAnkunft: materialfluss.ankunftProduktion,
      verfuegbarAb: materialfluss.verfuegbarAb,
      status: bestelldatum.getFullYear() < planungsjahr ? 'geliefert' : 
              bestelldatum.getMonth() < 3 ? 'unterwegs' : 'bestellt',
      istVorjahr: bestelldatum.getFullYear() < planungsjahr,
      grund: 'losgroesse',
      materialfluss,
      schiffAbfahrtMittwoch: materialfluss.schiffAbfahrt,
      wartetageAmHafen: materialfluss.wartetageHafen
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VALIDIERUNG: Prüfe ob Bestellsumme = OEM-Bedarf
  // ═══════════════════════════════════════════════════════════════════════════════
  const gesamtBestellteSaettel = bestellungen.reduce((sum, b) => {
    return sum + Object.values(b.komponenten).reduce((s, m) => s + m, 0)
  }, 0)
  
  const gesamtBenoetigteSaettel = Object.values(taeglicheBedarf).reduce((sum, bedarf) => {
    return sum + bedarf.reduce((s, m) => s + m, 0)
  }, 0)
  
  const durchschnittlicheWartezeit = bestellungen.length > 0
    ? bestellungen.reduce((sum, b) => sum + (b.wartetageAmHafen || 0), 0) / bestellungen.length
    : 0
  
  console.log(`
    ═══════════════════════════════════════════════════════════════════════════════
    BESTELLVALIDIERUNG (1:1 OEM-Bedarf)
    ═══════════════════════════════════════════════════════════════════════════════
    Gesamtbedarf (aus OEM-Plan):    ${gesamtBenoetigteSaettel.toLocaleString('de-DE')} Sättel
    Gesamt bestellt:                ${gesamtBestellteSaettel.toLocaleString('de-DE')} Sättel
    Differenz:                      ${(gesamtBestellteSaettel - gesamtBenoetigteSaettel).toLocaleString('de-DE')} Sättel
    
    Status: ${gesamtBestellteSaettel === gesamtBenoetigteSaettel ? '✅ EXAKT!' : '❌ FEHLER!'}
    
    Schiffe fahren nur mittwochs!
    Durchschnittl. Wartezeit am Hafen: ${durchschnittlicheWartezeit.toFixed(1)} Tage
    
    Anzahl Bestellungen: ${bestellungen.length}
    Zeitraum: ${bestellungen[0]?.bestelldatum instanceof Date ? bestellungen[0].bestelldatum.toLocaleDateString('de-DE') : 'N/A'} - ${bestellungen[bestellungen.length - 1]?.bestelldatum instanceof Date ? bestellungen[bestellungen.length - 1].bestelldatum.toLocaleDateString('de-DE') : 'N/A'}
    ═══════════════════════════════════════════════════════════════════════════════
  `)
  
  if (gesamtBestellteSaettel !== gesamtBenoetigteSaettel) {
    console.error(`❌ KRITISCHER FEHLER: Bestellmenge (${gesamtBestellteSaettel}) ≠ OEM-Bedarf (${gesamtBenoetigteSaettel})!`)
  }
  
  return bestellungen
}

/**
 * Erstellt eine Zusatzbestellung für einen bestimmten Tag
 */
export function erstelleZusatzbestellung(
  bestelldatum: Date,
  komponenten: Record<string, number>,
  vorlaufzeitTage: number,
  skipLosgroessenRundung: boolean = false,
  customFeiertage?: FeiertagsKonfiguration[],
  losgroesse: number = lieferantChinaData.lieferant.losgroesse
): TaeglicheBestellung {
  const LOSGROESSE = losgroesse
  const finalKomponenten: Record<string, number> = skipLosgroessenRundung
    ? { ...komponenten }
    : Object.fromEntries(
        Object.entries(komponenten).map(([kompId, menge]) => [
          kompId,
          rundeAufLosgroesse(menge, LOSGROESSE)
        ])
      )
  
  let bedarfsdatum = addDays(bestelldatum, vorlaufzeitTage)
  
  if (!istArbeitstag_Deutschland(bedarfsdatum, customFeiertage)) {
    bedarfsdatum = naechsterArbeitstag_Deutschland(bedarfsdatum, customFeiertage)
  }
  
  const materialfluss = berechneMaterialflussDetails(bestelldatum, customFeiertage)
  const jahr = bedarfsdatum.getFullYear()
  const bestellungId = generiereBestellungsId(jahr)
  
  return {
    id: bestellungId,
    bestelldatum,
    bedarfsdatum,
    komponenten: finalKomponenten,
    erwarteteAnkunft: materialfluss.ankunftProduktion,
    verfuegbarAb: materialfluss.verfuegbarAb, 
    status: 'bestellt',
    istVorjahr: false,
    grund: 'zusatzbestellung',
    materialfluss,
    schiffAbfahrtMittwoch: materialfluss.schiffAbfahrt,
    wartetageAmHafen: materialfluss.wartetageHafen
  }
}