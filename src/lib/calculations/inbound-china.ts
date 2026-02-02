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
  type MaterialflussDetails,
  type ProduktionsausfallKonfiguration
} from '@/lib/kalender'
import lieferantChinaData from '@/data/lieferant-china.json'
import type { SzenarioConfig } from '@/contexts/SzenarienContext' 

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
 * SZENARIO-VERARBEITUNG: Extrahiert Produktionsausfall-Tage aus Szenarien
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Durchsucht alle aktiven Szenarien nach 'maschinenausfall'-Szenarien und
 * berechnet die betroffenen Tag-Nummern (1-365).
 * 
 * KONZEPT:
 * - Maschinenausfall-Szenarien enthalten: startDatum, dauerTage, reduktionProzent
 * - Wir berechnen welche Tage im Jahr betroffen sind
 * - Diese Tage werden bei Arbeitstags-Berechnungen in China berücksichtigt
 * 
 * @param szenarien - Liste aller Szenarien (nur aktive werden verarbeitet)
 * @param planungsjahr - Jahr für die Berechnungen (z.B. 2027)
 * @returns ProduktionsausfallKonfiguration mit betroffenen Tagen
 */
export function extrahiereProduktionsausfallTage(
  szenarien: SzenarioConfig[] | undefined,
  planungsjahr: number
): ProduktionsausfallKonfiguration | undefined {
  if (!szenarien || szenarien.length === 0) {
    return undefined
  }

  const produktionsAusfallTage: number[] = []
  
  // Filtere auf aktive Maschinenausfall-Szenarien
  const maschinenausfallSzenarien = szenarien.filter(
    s => s.aktiv && s.typ === 'maschinenausfall'
  )
  
  if (maschinenausfallSzenarien.length === 0) {
    return undefined
  }
  
  // Verarbeite jedes Maschinenausfall-Szenario
  maschinenausfallSzenarien.forEach(szenario => {
    const dauerTage = szenario.parameter.dauerTage || 7
    const startDatum = szenario.parameter.startDatum 
      ? new Date(szenario.parameter.startDatum) 
      : new Date(planungsjahr, 2, 15) // Fallback: 15. März
    
    // Berechne betroffene Tag-Nummern (1-365)
    const jahresbeginn = new Date(planungsjahr, 0, 1)
    const startTag = Math.floor(
      (startDatum.getTime() - jahresbeginn.getTime()) / (24 * 60 * 60 * 1000)
    ) + 1
    
    // Füge alle betroffenen Tage hinzu
    for (let i = 0; i < dauerTage; i++) {
      const tag = startTag + i
      if (tag >= 1 && tag <= 365 && !produktionsAusfallTage.includes(tag)) {
        produktionsAusfallTage.push(tag)
      }
    }
  })
  
  console.log(`
    ═══════════════════════════════════════════════════════════════════════════════
    PRODUKTIONSAUSFALL-SZENARIO ERKANNT (China)
    ═══════════════════════════════════════════════════════════════════════════════
    Aktive Maschinenausfall-Szenarien: ${maschinenausfallSzenarien.length}
    Betroffene Tage im Jahr:           ${produktionsAusfallTage.length}
    Tag-Nummern:                       ${produktionsAusfallTage.sort((a, b) => a - b).join(', ')}
    
    Diese Tage werden als NICHT-Arbeitstage in China behandelt!
    Auswirkung: Bestellungen und Lieferungen verzögern sich entsprechend.
    ═══════════════════════════════════════════════════════════════════════════════
  `)
  
  return {
    produktionsAusfallTage,
    planungsjahr
  }
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
  lieferungenAmWerk: Map<string, Record<string, number>>  // Date-String → Component → Amount
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
    
    // 1. ANKUNFT: Füge Ware die VOR HEUTE angekommen ist zum Hafen-Lager hinzu
    // ✅ FIX: Material das HEUTE ankommt, kommt NICHT mehr auf das heutige Schiff!
    // Das Schiff fährt morgens ab, Material kommt tagsüber an.
    // Verwende STRIKTEN Vergleich: ankunftStr < datumStr (nicht <=)
    while (ankunftsIndex < hafenAnkunftsTimeline.length) {
      const ankunft = hafenAnkunftsTimeline[ankunftsIndex]
      const ankunftStr = toLocalISODateString(ankunft.datum)
      
      // ✅ FIX: NUR Material das STRIKT VOR heute angekommen ist
      // Material das heute ankommt, kommt erst aufs nächste Schiff
      if (ankunftStr < datumStr) {
        // Ware ist bereits früher angekommen → ins Lager buchen
        Object.entries(ankunft.komponenten).forEach(([kompId, menge]) => {
          hafenLager[kompId] = (hafenLager[kompId] || 0) + menge
        })
        
        ankunftsIndex++
      } else {
        // Ankunft ist heute oder später → abbrechen (kommt aufs nächste Schiff)
        break
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
      
      // ✅ WICHTIG: Losgröße MUSS immer beachtet werden!
      // Nur volle Losgrößen (500er-Bündel) können verschifft werden
      // Rest bleibt am Hafen liegen (Teil der Aufgabenstellung)
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
        // ✅ FIX: Korrigiere Rundungsfehler durch zweistufige Verteilung
        const verladeneKomponenten: Record<string, number> = {}
        let verbleibendeKapazitaet = ladungMenge
        
        // SCHRITT 1: Berechne initiale proportionale Verteilung (mit Math.floor)
        const komponentenListe = Object.entries(hafenLager).filter(([, menge]) => menge > 0)
        
        komponentenListe.forEach(([kompId, menge]) => {
          if (verbleibendeKapazitaet > 0) {
            const anteil = menge / gesamtLagerbestand
            // Runde nach unten, um sicherzustellen dass wir nicht zu viel nehmen
            const zuVerladen = Math.min(
              Math.floor(anteil * ladungMenge),
              menge,  // Nicht mehr als im Lager
              verbleibendeKapazitaet  // Nicht mehr als Kapazität
            )
            
            verladeneKomponenten[kompId] = zuVerladen
            hafenLager[kompId] -= zuVerladen
            verbleibendeKapazitaet -= zuVerladen
          }
        })
        
        // SCHRITT 2: Verteile verbleibende Kapazität (Rundungsfehler-Korrektur)
        // Wenn noch Kapazität übrig ist, fülle mit verfügbaren Sätteln auf
        if (verbleibendeKapazitaet > 0) {
          for (const [kompId] of komponentenListe) {
            const verfuegbar = hafenLager[kompId]
            if (verfuegbar > 0 && verbleibendeKapazitaet > 0) {
              const zusatz = Math.min(verfuegbar, verbleibendeKapazitaet)
              verladeneKomponenten[kompId] = (verladeneKomponenten[kompId] || 0) + zusatz
              hafenLager[kompId] -= zusatz
              verbleibendeKapazitaet -= zusatz
            }
          }
        }
        
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
  
  // ✅ KRITISCH: Behalte detaillierte Komponenten-Informationen!
  // Konvertiere Map<string, Map<string, number>> zu Map<string, Record<string, number>>
  // für Kompatibilität mit Rückgabetyp
  const lieferungenAmWerkRecord = new Map<string, Record<string, number>>()
  lieferungenAmWerk.forEach((komponenten, datum) => {
    const record: Record<string, number> = {}
    komponenten.forEach((menge, kompId) => {
      record[kompId] = menge
    })
    lieferungenAmWerkRecord.set(datum, record)
  })
  
  // Berechne durchschnittliche Wartezeit
  const durchschnittlicheWartezeit = wartezeiten.length > 0
    ? wartezeiten.reduce((sum, w) => sum + w, 0) / wartezeiten.length
    : 0
  
  return {
    lieferungenAmWerk: lieferungenAmWerkRecord,
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
 * @param szenarien - Optionale Szenarien (z.B. Maschinenausfall)
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
  szenarien?: SzenarioConfig[]
): InboundLieferplanErgebnis {
  // 1. Erstelle Bestellungen (mit Szenario-Unterstützung)
  const bestellungen = generiereTaeglicheBestellungen(
    alleProduktionsplaene,
    planungsjahr,
    vorlaufzeitTage,
    customFeiertage,
    stuecklisten,
    losgroesse,
    szenarien
  )
  
  // 2. Simuliere Hafen und Schiffsversand
  const hafenSimulation = simuliereHafenUndSchiffsversand(bestellungen, customFeiertage, losgroesse)
  
  // ✅ KRITISCH: Nutze lieferungenAmWerk DIREKT aus Hafenlogistik-Simulation!
  // Die Simulation hat bereits:
  // - Mittwochs-Schiffe berücksichtigt
  // - Wartezeiten am Hafen berechnet
  // - Losgrößen-basierte Beladung durchgeführt
  // - Proportionale Verteilung auf Komponenten vorgenommen
  //
  // NICHT neu berechnen oder aus Bestellungen ableiten!
  let lieferungenAmWerk = hafenSimulation.lieferungenAmWerk
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. ✅ SZENARIEN ANWENDEN: Modifiziere Lieferungen basierend auf aktiven Szenarien
  // ═══════════════════════════════════════════════════════════════════════════════
  if (szenarien && szenarien.length > 0) {
    console.log(`\n🎭 WENDE ${szenarien.filter(s => s.aktiv).length} AKTIVE SZENARIEN AN...`)
    
    // Konvertiere Map zu flacher Struktur für Szenario-Verarbeitung
    const lieferungenFlat = new Map<string, Record<string, number>>()
    lieferungenAmWerk.forEach((komponenten, datum) => {
      const komponentenFlat: Record<string, number> = {}
      komponenten.forEach((menge, kompId) => {
        komponentenFlat[kompId] = menge
      })
      lieferungenFlat.set(datum, komponentenFlat)
    })
    
    // Wende Szenarien an (Wasserschaden, Schiffsverspätung, etc.)
    const modifizierteLieferungenFlat = wendeSzenarienAufLieferungenAn(lieferungenFlat, szenarien)
    
    // Konvertiere zurück zu Map<string, Map<string, number>>
    const modifizierteLieferungenAmWerk = new Map<string, Map<string, number>>()
    modifizierteLieferungenFlat.forEach((komponenten, datum) => {
      const komponentenMap = new Map<string, number>()
      Object.entries(komponenten).forEach(([kompId, menge]) => {
        komponentenMap.set(kompId, menge)
      })
      modifizierteLieferungenAmWerk.set(datum, komponentenMap)
    })
    
    lieferungenAmWerk = modifizierteLieferungenAmWerk
    
    console.log(`✅ SZENARIEN ANGEWENDET - Lieferungen modifiziert!`)
  }
  
  console.log(`
    ═══════════════════════════════════════════════════════════════════════════════
    HAFEN-SIMULATION SHANGHAI (Mittwochs-Schiffe)
    ═══════════════════════════════════════════════════════════════════════════════
    Max. Lagerbestand am Hafen:   ${hafenSimulation.hafenStatistik.maxLagerbestand.toLocaleString('de-DE')} Sättel
    Anzahl Schiffe:                ${hafenSimulation.hafenStatistik.anzahlSchiffe}
    Ø Wartezeit am Hafen:          ${hafenSimulation.hafenStatistik.durchschnittlicheWartezeit.toFixed(1)} Tage
    Liefertage am Werk:            ${lieferungenAmWerk.size}
    
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
 * 4. ✅ NEU: Berücksichtigt Produktionsausfall-Tage aus Szenarien
 */
export function generiereTaeglicheBestellungen(
  alleProduktionsplaene: Record<string, any[]>,
  planungsjahr: number,
  vorlaufzeitTage: number,
  customFeiertage?: FeiertagsKonfiguration[],
  stuecklisten?: Record<string, { komponenten: Record<string, { name: string; menge: number; einheit: string }> }>,
  losgroesse: number = lieferantChinaData.lieferant.losgroesse,
  szenarien?: SzenarioConfig[]
): TaeglicheBestellung[] {
  const bestellungen: TaeglicheBestellung[] = []
  
  // Reset Bestellungs-Counter für neue Berechnung
  resetBestellungsNummer()
  
  const stklst = stuecklisten || {}
  const VORLAUFZEIT_TAGE = vorlaufzeitTage
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHRITT 0: Extrahiere Produktionsausfall-Tage aus Szenarien
  // ═══════════════════════════════════════════════════════════════════════════════
  const produktionsausfallKonfig = extrahiereProduktionsausfallTage(szenarien, planungsjahr)
  
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
    
    // Berechne detaillierten Materialfluss mit Produktionsausfall-Berücksichtigung
    const materialfluss = berechneMaterialflussDetails(
      bestelldatum, 
      customFeiertage, 
      produktionsausfallKonfig
    )
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
 * 
 * @param bestelldatum - Datum der Bestellung
 * @param komponenten - Komponenten und Mengen
 * @param vorlaufzeitTage - Vorlaufzeit in Tagen
 * @param skipLosgroessenRundung - Losgröße überspringen?
 * @param customFeiertage - Optionale Feiertage
 * @param losgroesse - Losgröße
 * @param produktionsausfallKonfig - Optionale Produktionsausfall-Konfiguration
 */
export function erstelleZusatzbestellung(
  bestelldatum: Date,
  komponenten: Record<string, number>,
  vorlaufzeitTage: number,
  skipLosgroessenRundung: boolean = false,
  customFeiertage?: FeiertagsKonfiguration[],
  losgroesse: number = lieferantChinaData.lieferant.losgroesse,
  produktionsausfallKonfig?: ProduktionsausfallKonfiguration
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
  
  const materialfluss = berechneMaterialflussDetails(
    bestelldatum, 
    customFeiertage, 
    produktionsausfallKonfig
  )
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

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SZENARIO-MODIFIKATION: Wendet Szenarien auf Lieferungen an
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Diese Funktion modifiziert die Lieferungen basierend auf aktiven Szenarien:
 * - wasserschaden: Reduziert oder entfernt Lieferungen
 * - schiffsverspaetung: Verschiebt Ankunftsdatum von Lieferungen
 * 
 * @param lieferungenAmWerk - Original-Lieferungen aus Hafenlogistik-Simulation
 * @param szenarien - Aktive Szenarien aus SzenarienContext
 * @returns Modifizierte Lieferungen-Map
 */
export interface SzenarioConfig {
  id: string
  typ: string
  parameter: Record<string, any>
  aktiv: boolean
}

export function wendeSzenarienAufLieferungenAn(
  lieferungenAmWerk: Map<string, Record<string, number>>,
  szenarien: SzenarioConfig[]
): Map<string, Record<string, number>> {
  // Erstelle eine Kopie der Lieferungen
  const modifizierteLieferungen = new Map<string, Record<string, number>>()
  lieferungenAmWerk.forEach((komponenten, datum) => {
    modifizierteLieferungen.set(datum, { ...komponenten })
  })
  
  // Filtere aktive Szenarien
  const aktiveSzenarien = szenarien.filter(s => s.aktiv)
  
  aktiveSzenarien.forEach(szenario => {
    switch (szenario.typ) {
      case 'wasserschaden': {
        /**
         * TRANSPORT-SCHADEN SZENARIO
         * Reduziert oder entfernt ausgewählte Lieferungen
         */
        const betroffeneLieferungen = szenario.parameter.betroffeneLieferungen || []
        const schadenTyp = szenario.parameter.schadenTyp || 'teilweise'
        const reduktionProzent = szenario.parameter.reduktionProzent || 50
        
        betroffeneLieferungen.forEach((lieferDatum: string) => {
          if (modifizierteLieferungen.has(lieferDatum)) {
            if (schadenTyp === 'komplett') {
              // Lieferung komplett verloren
              modifizierteLieferungen.delete(lieferDatum)
              console.log(`🚨 TRANSPORT-SCHADEN: Lieferung am ${lieferDatum} komplett verloren!`)
            } else {
              // Teilweise Reduktion
              const komponenten = modifizierteLieferungen.get(lieferDatum)!
              const faktor = 1 - (reduktionProzent / 100)
              const reduzierteKomponenten: Record<string, number> = {}
              
              Object.entries(komponenten).forEach(([kompId, menge]) => {
                // Verwende Math.round statt Math.floor, damit bei kleinen Mengen 
                // nicht alles auf 0 gerundet wird (außer bei 100% Reduktion)
                reduzierteKomponenten[kompId] = Math.round(menge * faktor)
              })
              
              modifizierteLieferungen.set(lieferDatum, reduzierteKomponenten)
              console.log(`⚠️ TRANSPORT-SCHADEN: Lieferung am ${lieferDatum} um ${reduktionProzent}% reduziert`)
            }
          }
        })
        break
      }
      
      case 'schiffsverspaetung': {
        /**
         * SCHIFFSVERSPÄTUNG SZENARIO
         * Verschiebt Ankunftsdatum ausgewählter Lieferungen
         */
        const betroffeneLieferungen = szenario.parameter.betroffeneLieferungen || []
        const verspaetungTage = szenario.parameter.verspaetungTage || 7
        
        betroffeneLieferungen.forEach((originalDatum: string) => {
          if (modifizierteLieferungen.has(originalDatum)) {
            // Berechne neues Datum
            const altesD = new Date(originalDatum)
            const neuesDatum = addDays(altesD, verspaetungTage)
            const neuesDatumStr = toLocalISODateString(neuesDatum)
            
            // Verschiebe Lieferung
            const komponenten = modifizierteLieferungen.get(originalDatum)!
            modifizierteLieferungen.delete(originalDatum)
            
            // Falls am neuen Datum schon eine Lieferung existiert, addiere Mengen
            if (modifizierteLieferungen.has(neuesDatumStr)) {
              const existierende = modifizierteLieferungen.get(neuesDatumStr)!
              Object.entries(komponenten).forEach(([kompId, menge]) => {
                existierende[kompId] = (existierende[kompId] || 0) + menge
              })
            } else {
              modifizierteLieferungen.set(neuesDatumStr, komponenten)
            }
            
            console.log(`🚢 SCHIFFSVERSPÄTUNG: Lieferung von ${originalDatum} → ${neuesDatumStr} (+${verspaetungTage} Tage)`)
          }
        })
        break
      }
      
      case 'maschinenausfall': {
        /**
         * CHINA AUSFALL SZENARIO
         * Bereits in der Produktionsplanung berücksichtigt
         * Hier keine zusätzliche Aktion nötig, da Bestellungen bereits reduziert werden
         */
        console.log(`🔧 CHINA-AUSFALL: Szenario aktiv - wirkt auf Produktionsplanung`)
        break
      }
    }
  })
  
  return modifizierteLieferungen
}