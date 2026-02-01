/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INTEGRIERTES WAREHOUSE MANAGEMENT SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Berechnet realistische Lagerbestandsentwicklung mit:
 * - ✅ EXKLUSIV Hafenlogistik als Materialquelle (generiereInboundLieferplan)
 * - Realistischen Losgrößen-basierten Lieferungen (500 Stück)
 * - NEUER Materialfluss mit Zwischenlagerung:
 *   - Schiffe nur mittwochs ab Shanghai
 *   - LKWs nicht am Wochenende
 *   - Material verfügbar am NÄCHSTEN TAG nach Ankunft
 * - ATP (Available-to-Promise) Checks vor Verbrauch
 * - PROPORTIONALE ALLOKATION statt FCFS bei Engpässen
 * - Start mit 0 Lagerbestand
 * - Volle OEM-Inbound-Warehouse Integration
 * 
 * KONZEPT:
 * 1. Start mit 0 Lagerbestand
 * 2. ✅ Verarbeite Inbound-Lieferungen von generiereInboundLieferplan (Hafenlogistik!)
 *    → NEU: Lieferungen nutzen verfuegbarAb Datum (nächster Tag nach Ankunft)
 *    → KRITISCH: Schiffe fahren nur mittwochs, daher gestaffelte Lieferung
 * 3. Für jeden Produktionstag: ATP-Check → Verbrauch falls verfügbar
 *    → NEU: Bei Engpass proportionale Verteilung statt FCFS
 * 4. Sammle Statistiken und Warnungen
 */

import type { KonfigurationData, FeiertagConfig } from '@/contexts/KonfigurationContext'
import type { TagesProduktionEntry } from './zentrale-produktionsplanung'
import { addDays, toLocalISODateString } from '@/lib/utils'
import { generiereInboundLieferplan, type TaeglicheBestellung } from './inbound-china'
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
    status: 'hoch' | 'ok' | 'niedrig' | 'kritisch' | 'negativ'
    
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
  // STEP 1: ✅ GENERIERE INBOUND LIEFERUNGEN MIT HAFENLOGISTIK (inkl. Mittwochs-Schiffe!)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Bereite Stücklisten-Map vor (für generiereInboundLieferplan)
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
  
  // ✅ KRITISCHER FIX: Nutze generiereInboundLieferplan statt generiereTaeglicheBestellungen!
  // Dies beinhaltet die komplette Hafenlogistik-Simulation:
  // - Schiffe fahren nur mittwochs ab Shanghai
  // - Waren warten am Hafen bis nächster Mittwoch
  // - Realistische Losgröße-basierte Schiffsbeladung (500er Bündel)
  console.log(`🚢 Starte Hafenlogistik-Simulation mit generiereInboundLieferplan...`)
  
  const inboundResult = generiereInboundLieferplan(
    produktionsplaeneFormatiert,
    planungsjahr,
    konfiguration.lieferant.gesamtVorlaufzeitTage,
    konfiguration.feiertage,
    stuecklistenMap,  // Stücklisten aus Konfiguration
    konfiguration.lieferant.losgroesse  // Losgröße aus Konfiguration
  )
  
  // Extrahiere Bestellungen und Lieferungen aus Hafenlogistik
  const bestellungen = [
    ...inboundResult.bestellungen,
    ...zusatzBestellungen
  ]
  
  // ✅ NEU: Nutze lieferungenAmWerk aus Hafenlogistik (nicht aus Bestellungen!)
  // Die Hafenlogistik bestimmt WANN Material tatsächlich am Werk ankommt
  // (nach Wartezeit am Hafen + Mittwochs-Schiff + LKW-Transport)
  const lieferungenAmWerkAusHafenlogistik = inboundResult.lieferungenAmWerk
  
  console.log(`✅ Hafenlogistik-Simulation abgeschlossen:`)
  console.log(`   - Bestellungen: ${bestellungen.length}`)
  console.log(`   - Liefertage am Werk: ${lieferungenAmWerkAusHafenlogistik.size}`)
  console.log(`   - Schiffe gesamt: ${inboundResult.hafenStatistik.anzahlSchiffe}`)
  console.log(`   - Ø Wartezeit Hafen: ${inboundResult.hafenStatistik.durchschnittlicheWartezeit.toFixed(1)} Tage`)
  console.log(`   - Max Hafenlager: ${inboundResult.hafenStatistik.maxLagerbestand.toLocaleString('de-DE')} Sättel`)
  
  // DEBUG: Zeige alle Liefertermine im Januar
  console.log(`\n📅 LIEFERTERMINE (Dezember 2026 - März 2027):`)
  let totalGelieferteSaettel = 0
  const lieferungenSortiert: {datum: string, menge: number}[] = []
  lieferungenAmWerkAusHafenlogistik.forEach((komponenten, datumStr) => {
    const gesamtMenge = Object.values(komponenten).reduce((a, b) => a + b, 0)
    totalGelieferteSaettel += gesamtMenge
    lieferungenSortiert.push({datum: datumStr, menge: gesamtMenge})
  })
  // Sortiere und zeige die ersten 15
  lieferungenSortiert.sort((a, b) => a.datum.localeCompare(b.datum))
  lieferungenSortiert.slice(0, 15).forEach(l => {
    console.log(`   🚚 ${l.datum} → ${l.menge} Sättel`)
  })
  console.log(`   ... (${lieferungenSortiert.length} Liefertage insgesamt)`)
  console.log(`\n📊 GESAMT AM WERK GELIEFERT: ${totalGelieferteSaettel.toLocaleString('de-DE')} Sättel (Soll: 370.000)`)
  
  // DEBUG: Prüfe spezifische März-Lieferungen
  console.log(`\n🔍 PRÜFUNG MÄRZ-LIEFERUNGEN:`)
  const maerzLieferungen = lieferungenSortiert.filter(l => l.datum.startsWith('2027-03'))
  maerzLieferungen.forEach(l => {
    console.log(`   ${l.datum}: ${l.menge} Sättel`)
  })
  const summeMaerz = maerzLieferungen.reduce((sum, l) => sum + l.menge, 0)
  console.log(`   SUMME MÄRZ: ${summeMaerz.toLocaleString('de-DE')} Sättel`)
  
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
  
  // ✅ KRITISCH: Nutze Lieferungen DIREKT aus Hafenlogistik!
  // Die Hafenlogistik (generiereInboundLieferplan) hat bereits:
  // - Hafen-Simulation mit Mittwochs-Schiffen durchgeführt
  // - Realistische Liefertermine berechnet (verfuegbarAb)
  // - Losgrößen-basierte Beladung simuliert
  // 
  // Daher: KEINE erneute Gruppierung von Bestellungen!
  // Wir nutzen direkt lieferungenAmWerkAusHafenlogistik
  
  // Konvertiere lieferungenAmWerk (Map<string, Record<string, number>>) zu TaeglicheBestellung[] Format
  // für die bestehende Warehouse-Logik
  const lieferungenProTag = new Map<string, TaeglicheBestellung[]>()
  
  // DEBUG: Zeige Größe vor Konvertierung
  console.log(`\n🔄 Konvertiere ${lieferungenAmWerkAusHafenlogistik.size} Hafenlogistik-Lieferungen zu Warehouse-Format...`)
  
  lieferungenAmWerkAusHafenlogistik.forEach((komponenten, datumStr) => {
    // Erstelle eine "virtuelle" Bestellung für diese Lieferung
    // Dies ermöglicht es der bestehenden Warehouse-Logik zu funktionieren
    const virtuelleLieferung: TaeglicheBestellung = {
      id: `HAFEN-${datumStr}`,
      bestelldatum: new Date(datumStr), // Dummy
      bedarfsdatum: new Date(datumStr), // Dummy
      komponenten: komponenten,
      erwarteteAnkunft: new Date(datumStr),
      verfuegbarAb: new Date(datumStr),
      status: 'geliefert',
      istVorjahr: false,
      grund: 'losgroesse'
    }
    
    lieferungenProTag.set(datumStr, [virtuelleLieferung])
  })
  
  console.log(`✅ Konvertiert: ${lieferungenProTag.size} Liefertermine in lieferungenProTag Map`)
  
  // DEBUG: Prüfe ob bestimmte Daten drin sind
  const testDatum1 = '2027-01-12'
  const testDatum2 = '2027-01-19'
  console.log(`   Test '${testDatum1}': ${lieferungenProTag.has(testDatum1) ? 'JA' : 'NEIN'}`)
  console.log(`   Test '${testDatum2}': ${lieferungenProTag.has(testDatum2) ? 'JA' : 'NEIN'}`)
  
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
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 2.5: CREATE DATE-BASED LOOKUP MAP FOR PRODUCTION PLANS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * 🔧 FIX: Date-based lookup statt Array-Index
   * 
   * Problem: Array-Index (tagImJahr - 1) kann zu Fehlern führen wenn das Array
   * nur Arbeitstage enthält oder unterschiedliche Längen hat.
   * 
   * Lösung: Erstelle eine Map die direkt über Datum zugreift:
   * produktionsplanMap[varianteId][dateString] = planMenge
   * 
   * Vorteil: Robuster, expliziter, kein Index-Mismatch möglich
   */
  const produktionsplanMap: Record<string, Record<string, number>> = {}
  
  Object.entries(variantenProduktionsplaene).forEach(([varianteId, plan]) => {
    produktionsplanMap[varianteId] = {}
    plan.tage.forEach(tag => {
      const dateKey = toLocalISODateString(tag.datum)
      produktionsplanMap[varianteId][dateKey] = tag.planMenge
    })
  })
  
  console.log(`📋 Produktionsplan-Lookup erstellt für ${Object.keys(produktionsplanMap).length} Varianten`)
  
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
  
  // ✅ NEU: Error-Tracker pro Bauteil für faire Verteilung bei Engpass
  // Akkumuliert Rundungsfehler und korrigiert diese über die Zeit
  const errorTrackerProBauteil: Record<string, number> = {}
  bauteile.forEach(bauteil => {
    errorTrackerProBauteil[bauteil.id] = 0
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
    // STEP 3a: BUCHE EINGEHENDE LIEFERUNGEN (LOT-BASED!) - VOR ATP-CHECK!
    // ═════════════════════════════════════════════════════════════════════════════
    /**
     * ⚠️ WICHTIG: Lieferungen werden ZUERST gebucht, DANN Material-Check!
     * 
     * Realistischer Tagesablauf:
     * 1. Früh morgens: LKWs kommen an, Material wird eingelagert
     * 2. Dann: Produktionsplanung prüft Materialverfügbarkeit
     * 3. Dann: Produktion läuft
     * 
     * Daher: aktuelleBestaende += Zugänge BEVOR ATP-Check!
     */
    
    const heutigeLieferungen = lieferungenProTag.get(datumStr) || []
    const bauteileHeuteDetails: TaeglichesLager['bauteile'] = []
    
    // DEBUG: Log Lieferungen für bestimmte Tage (Analyse)
    // Erweitert um Prüfung ob Datum in Map existiert
    if ((tagImJahr >= 1 && tagImJahr <= 15) || (tagImJahr >= 75 && tagImJahr <= 85)) {
      const hatMapEintrag = lieferungenProTag.has(datumStr)
      if (heutigeLieferungen.length > 0) {
        const totalSaettel = heutigeLieferungen.reduce((sum, lief) => {
          return sum + Object.values(lief.komponenten).reduce((a,b) => a+(b||0), 0)
        }, 0)
        console.log(`📦 TAG ${tagImJahr} (${datumStr}): ${heutigeLieferungen.length} Lieferung(en), TOTAL: ${totalSaettel} Sättel`)
        // Zeige Bauteil-Details
        heutigeLieferungen.forEach(lief => {
          Object.entries(lief.komponenten).forEach(([kompId, menge]) => {
            console.log(`    ${kompId}: ${menge} Stück`)
          })
        })
      } else {
        console.log(`📦 TAG ${tagImJahr} (${datumStr}): KEINE Lieferung (Map-Eintrag: ${hatMapEintrag})`)
      }
    }
    
    // Erst alle Lieferungen buchen (für alle Bauteile)
    bauteile.forEach(bauteil => {
      const bauteilId = bauteil.id
      
      // Summiere Zugänge von allen Lieferungen heute
      let zugang = 0
      heutigeLieferungen.forEach(bestellung => {
        const menge = bestellung.komponenten[bauteilId] || 0
        if (menge > 0) {
          zugang += menge
          gesamtLieferungen += menge
        }
      })
      
      // Buche Zugang SOFORT
      aktuelleBestaende[bauteilId] += zugang
    })
    
    // ═════════════════════════════════════════════════════════════════════════════
    // STEP 3b-GLOBAL: GLOBALE KAPAZITÄTS- UND MATERIAL-PRÜFUNG (NACH LIEFERUNGEN!)
    // ═════════════════════════════════════════════════════════════════════════════
    /**
     * 🔧 KRITISCHER FIX: Produktionskapazität ist GLOBAL, nicht pro Bauteil!
     * 
     * FALSCH (Alt): Jeder Sattel-Typ bekommt maxProduktionKapazitaet = 3.120
     *               → 4 Sättel × 3.120 = 12.480 Bikes/Tag möglich (UNMÖGLICH!)
     * 
     * RICHTIG (Neu): 1 Produktionslinie = 3.120 Bikes/Tag TOTAL über ALLE Varianten
     *                → Berechne Reduktionsfaktor und wende ihn proportional auf alle Varianten an
     * 
     * Logik:
     * 1. Berechne TOTALE Bike-Produktion (geplant) über alle Varianten
     * 2. Prüfe Material-Limit (welcher Sattel ist Engpass?)
     * 3. Prüfe Produktionskapazität (3.120 Bikes TOTAL)
     * 4. maxMoeglicheBikes = min(Plan, Material, Kapazität)
     * 5. produktionsFaktor = maxMoeglicheBikes / totaleBikesPlan
     * 6. Wende Faktor proportional auf alle Varianten an (proportionale Allokation)
     */
    let produktionsFaktor = 1.0  // 1.0 = keine Reduktion
    let globalAtpErfuellt = true
    let globalAtpGrund: string | undefined
    
    if (istArbeitstag && tagImJahr >= 1 && tagImJahr <= 365) {
      // ─────────────────────────────────────────────────────────────────────────────
      // SCHRITT 1: Berechne TOTALEN geplanten Bedarf (Bikes) über alle Varianten
      // ─────────────────────────────────────────────────────────────────────────────
      let totaleBikesPlan = 0
      Object.entries(produktionsplanMap).forEach(([varianteId, planMap]) => {
        const geplanteMenge = planMap[datumStr] || 0
        totaleBikesPlan += geplanteMenge
      })
      
      // ─────────────────────────────────────────────────────────────────────────────
      // SCHRITT 1b: ✅ BACKLOG zur Tagesproduktion hinzufügen!
      // ─────────────────────────────────────────────────────────────────────────────
      /**
       * KRITISCH: Backlog muss IN die tägliche Produktion integriert werden!
       * 
       * Logik:
       * 1. Berechne Gesamt-Backlog (Summe aller Komponenten)
       * 2. Wenn Backlog vorhanden: Addiere zur Tagesproduktion
       * 3. Begrenzung durch Produktionskapazität erfolgt in Schritt 4
       */
      const gesamtBacklogBikes = Object.values(produktionsBacklog).reduce((sum, b) => sum + b, 0)
      const totaleBikesMitBacklog = totaleBikesPlan + gesamtBacklogBikes
      
      // ─────────────────────────────────────────────────────────────────────────────
      // SCHRITT 2: Berechne GLOBALE Produktionskapazität (EINMALIG pro Tag!)
      // ─────────────────────────────────────────────────────────────────────────────
      const kapazitaetProSchicht = 
        konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht
      const maxSchichten = konfiguration.produktion.maxSchichtenProTag
      const maxProduktionKapazitaetBikes = kapazitaetProSchicht * maxSchichten  // z.B. 3.120 Bikes
      
      // ─────────────────────────────────────────────────────────────────────────────
      // SCHRITT 3: Berechne verfügbares Material (SUMME aller Sättel)
      // ─────────────────────────────────────────────────────────────────────────────
      /**
       * ANNAHME: 1 Bike = 1 Sattel (aus Stückliste)
       * Da jedes Bike genau 1 Sattel benötigt und wir 4 verschiedene Sattel-Typen haben,
       * ist die SUMME aller verfügbaren Sättel die maximale Bike-Produktion!
       * 
       * Beispiel Tag 4:
       * - SAT_FT: 125, SAT_RL: 125, SAT_SP: 125, SAT_SL: 125
       * - TOTAL: 500 Sättel → max 500 Bikes ✅
       * 
       * WICHTIG: Dies ist eine Vereinfachung! In Realität müsste man prüfen,
       * welche Varianten welche Sättel brauchen. Da aber jede Variante 1 Sattel
       * benötigt und wir proportionale Allokation nutzen, ist die Gesamtsumme
       * die korrekte Obergrenze.
       */
      let materialLimitBikes = 0
      
      // Summiere ALLE verfügbaren Sättel
      bauteile.forEach(bauteil => {
        const verfuegbar = aktuelleBestaende[bauteil.id]
        materialLimitBikes += verfuegbar
      })
      
      // DEBUG: Log für erste 10 Tage und kritische Tage 75-80
      if ((tagImJahr >= 1 && tagImJahr <= 10) || (tagImJahr >= 75 && tagImJahr <= 82)) {
        console.log(`📊 TAG ${tagImJahr} (${datumStr}): Plan=${totaleBikesPlan}, +Backlog=${gesamtBacklogBikes}, Material=${materialLimitBikes}, Kapazität=${maxProduktionKapazitaetBikes}`)
        // Zeige auch den Bestand pro Bauteil
        bauteile.forEach(b => {
          const bedarf = produktionsplanMap ? 
            Object.entries(produktionsplanMap).reduce((sum, [vId, planMap]) => {
              const geplant = planMap[datumStr] || 0
              const verbrauchV = berechneVerbrauchProBauteil(geplant, vId, b.id, konfiguration)
              return sum + verbrauchV
            }, 0) : 0
          console.log(`   ${b.id}: ${aktuelleBestaende[b.id]} Stück (Bedarf: ${bedarf})`)
        })
      }
      
      // ─────────────────────────────────────────────────────────────────────────────
      // SCHRITT 4: Berechne GLOBALES Limit (Minimum aus Plan+Backlog, Material, Kapazität)
      // ─────────────────────────────────────────────────────────────────────────────
      const maxMoeglicheBikes = Math.min(
        totaleBikesMitBacklog,         // ✅ Geplante Produktion + Backlog
        materialLimitBikes,             // Material-Verfügbarkeit
        maxProduktionKapazitaetBikes   // Produktionskapazität
      )
      
      // ─────────────────────────────────────────────────────────────────────────────
      // SCHRITT 5: Berechne Reduktionsfaktor (falls Engpass)
      // ─────────────────────────────────────────────────────────────────────────────
      // ✅ WICHTIG: Faktor basiert auf Plan+Backlog, nicht nur Plan!
      produktionsFaktor = totaleBikesMitBacklog > 0 
        ? maxMoeglicheBikes / totaleBikesMitBacklog 
        : 1.0
      
      // ─────────────────────────────────────────────────────────────────────────────
      // SCHRITT 6: Bestimme Engpass-Grund (für Logging/Warnungen)
      // ─────────────────────────────────────────────────────────────────────────────
      if (produktionsFaktor < 1.0) {
        globalAtpErfuellt = false
        
        // Bestimme welcher Faktor limitiert
        if (materialLimitBikes < totaleBikesMitBacklog && materialLimitBikes <= maxProduktionKapazitaetBikes) {
          globalAtpGrund = `Material-Engpass: Nur ${materialLimitBikes} Sättel verfügbar für ${totaleBikesMitBacklog} benötigte Bikes (Plan+Backlog) (Faktor: ${(produktionsFaktor * 100).toFixed(1)}%)`
        } else if (maxProduktionKapazitaetBikes < totaleBikesMitBacklog && maxProduktionKapazitaetBikes < materialLimitBikes) {
          globalAtpGrund = `Kapazitäts-Engpass: Nur ${maxProduktionKapazitaetBikes} Bikes/Tag möglich, ${totaleBikesMitBacklog} benötigt (Plan+Backlog) (Faktor: ${(produktionsFaktor * 100).toFixed(1)}%)`
        } else {
          globalAtpGrund = `Material UND Kapazität limitiert: max ${maxMoeglicheBikes} von ${totaleBikesMitBacklog} Bikes (Faktor: ${(produktionsFaktor * 100).toFixed(1)}%)`
        }
        
        console.log(`⚠️ ${datumStr} (Tag ${tagImJahr}): ${globalAtpGrund}`)
      }
    }
    
    // ═════════════════════════════════════════════════════════════════════════════
    // STEP 3c: BAUTEIL-LOOP - Berechne Details und Verbrauch pro Bauteil
    // ═════════════════════════════════════════════════════════════════════════════
    
    bauteile.forEach(bauteil => {
      const bauteilId = bauteil.id
      
      // ─────────────────────────────────────────────────────────────────────────────
      // Anfangsbestand ist der Bestand VOR heutigen Zugängen (für Reporting)
      // ─────────────────────────────────────────────────────────────────────────────
      // WICHTIG: aktuelleBestaende[bauteilId] enthält BEREITS die heutigen Zugänge!
      // Daher müssen wir für anfangsBestand die Zugänge wieder abziehen:
      let zugang = 0
      const lieferungsDetails: TaeglichesLager['bauteile'][0]['lieferungen'] = []
      
      heutigeLieferungen.forEach(bestellung => {
        const menge = bestellung.komponenten[bauteilId] || 0
        if (menge > 0) {
          zugang += menge
          // gesamtLieferungen wurde bereits in STEP 3a gezählt!
          
          lieferungsDetails.push({
            bestellungId: bestellung.id,
            menge: menge,
            istVorjahr: bestellung.istVorjahr
          })
        }
      })
      
      // anfangsBestand = aktueller Bestand MINUS heute's Zugänge
      const anfangsBestand = aktuelleBestaende[bauteilId] - zugang
      
      // Placeholder - wird in STEP 3b-GLOBAL berechnet
      let verbrauch = 0
      let atpErfuellt = globalAtpErfuellt  // ← Nutze GLOBALEN ATP-Status
      let atpGrund = globalAtpGrund        // ← Nutze GLOBALEN Grund
      let benoetigt = 0
      const backlogVorher = produktionsBacklog[bauteilId]
      let nichtProduziertHeute = 0
      let nachgeholt = 0
      
      if (istArbeitstag && tagImJahr >= 1 && tagImJahr <= 365) {
        // ─────────────────────────────────────────────────────────────────────────
        // Berechne PLAN-Verbrauch (was benötigt WÜRDE ohne Engpass)
        // ─────────────────────────────────────────────────────────────────────────
        Object.entries(produktionsplanMap).forEach(([varianteId, planMap]) => {
          const geplanteMenge = planMap[datumStr] || 0
          
          if (geplanteMenge > 0) {
            const verbrauchVariante = berechneVerbrauchProBauteil(
              geplanteMenge,
              varianteId,
              bauteilId,
              konfiguration
            )
            benoetigt += verbrauchVariante
          }
        })
        
        // ✅ KRITISCHER FIX: Backlog zum benötigten Bedarf hinzufügen!
        // Der Backlog von gestern muss heute zusätzlich zum Plan produziert werden.
        // Nur so kann der Backlog abgebaut werden!
        const benoeligtMitBacklog = benoetigt + backlogVorher
        
        // ─────────────────────────────────────────────────────────────────────────
        // Wende GLOBALEN Produktionsfaktor an UND begrenze durch lokalen Bestand!
        // ─────────────────────────────────────────────────────────────────────────
        /**
         * 🎯 ERROR MANAGEMENT FÜR FAIRE VERTEILUNG
         * 
         * KONZEPT:
         * Bei Materialengpass müssen wir das verfügbare Material fair auf die Komponenten
         * verteilen. Dabei entstehen Rundungsfehler, die über Error Management korrigiert werden.
         * 
         * REGELN:
         * 1. Bei KEINEM Engpass (produktionsFaktor = 1.0): Exakt die OEM-Plan-Menge produzieren
         *    → Keine Rundung nötig, da benoetigt bereits ganzzahlig aus OEM-Planung kommt
         * 
         * 2. Bei Engpass (produktionsFaktor < 1.0): Error Management anwenden
         *    → Kumulierten Fehler pro Bauteil tracken und korrigieren
         *    → Sicherstellen, dass SUMME aller Bauteile = verfügbares Material
         */
        
        // ✅ FIX: Nutze benoeligtMitBacklog für die Berechnung (inkl. Backlog von gestern)
        let globalerBedarf: number
        
        if (produktionsFaktor >= 1.0) {
          // ✅ KEIN ENGPASS: Produziere exakt die OEM-Plan-Menge (+ Backlog wenn möglich)
          // Die OEM-Planung nutzt bereits Error Management, daher ist benoetigt ganzzahlig
          globalerBedarf = benoeligtMitBacklog
        } else {
          // ⚠️ ENGPASS: Error Management für faire Verteilung
          // Der Fehler wird pro Bauteil über die Tage akkumuliert
          const sollMenge = benoeligtMitBacklog * produktionsFaktor
          
          // Error Management: Tracke kumulierten Fehler pro Bauteil
          if (!errorTrackerProBauteil[bauteilId]) {
            errorTrackerProBauteil[bauteilId] = 0
          }
          
          const basisMenge = Math.floor(sollMenge)
          const tagesError = sollMenge - basisMenge
          errorTrackerProBauteil[bauteilId] += tagesError
          
          // Wenn akkumulierter Fehler >= 1.0, korrigiere durch Aufrunden
          if (errorTrackerProBauteil[bauteilId] >= 1.0) {
            globalerBedarf = basisMenge + 1
            errorTrackerProBauteil[bauteilId] -= 1.0
          } else {
            globalerBedarf = basisMenge
          }
        }
        
        // ✅ KRITISCH: Begrenze Verbrauch durch den VERFÜGBAREN BESTAND dieses Bauteils!
        const verfuegbarerBestand = aktuelleBestaende[bauteilId]
        const maxVerbrauchMoeglich = Math.min(globalerBedarf, verfuegbarerBestand)
        
        // Setze Verbrauch auf das, was WIRKLICH möglich ist (begrenzt durch lokalen Bestand)
        verbrauch = maxVerbrauchMoeglich
        
        // ✅ FIX: Berechne nicht erfüllten Bedarf basierend auf Plan+Backlog!
        // Der nichtErfuellt wird der neue Backlog für morgen
        const nichtErfuellt = benoeligtMitBacklog - verbrauch
        
        // ✅ BACKLOG-TRACKING: Berechne wie viel produziert wurde
        if (nichtErfuellt > 0) {
          // Heute konnte nicht alles produziert werden → neuer Backlog = nichtErfuellt
          nichtProduziertHeute = nichtErfuellt
          nachgeholt = backlogVorher > 0 ? Math.min(verbrauch - benoetigt + backlogVorher, backlogVorher) : 0
          if (nachgeholt < 0) nachgeholt = 0
        } else {
          // Alles produziert (Plan + Backlog)
          nichtProduziertHeute = 0
          nachgeholt = backlogVorher // Gesamter Backlog wurde abgebaut
        }
        
        // Update Backlog: neuer Backlog = nichtErfuellt (was nicht produziert werden konnte)
        produktionsBacklog[bauteilId] = nichtErfuellt > 0 ? nichtErfuellt : 0
        
        // Buche Verbrauch (jetzt mit Backlog-Abbau)
        aktuelleBestaende[bauteilId] -= verbrauch
        gesamtVerbrauch += verbrauch
        gesamtProduziertTatsaechlich += verbrauch
        
        // Debug: Log Backlog-Abbau wenn signifikant
        if (nachgeholt > 0 && (tagImJahr >= 75 && tagImJahr <= 85)) {
          console.log(`✅ TAG ${tagImJahr}: Backlog-Abbau ${bauteilId} GESAMT ${nachgeholt} Bikes`)
        }
        
        // Warnungen (nur wenn nötig, da global bereits geloggt)
        if (nichtProduziertHeute > 0 && globalAtpGrund) {
          warnungen.push(
            `⚠️ ${datumStr} (Tag ${tagImJahr}): ${bauteil.name} - ${globalAtpGrund}, nicht produziert: ${nichtProduziertHeute}`
          )
        }
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
      
      // Status bestimmen basierend auf Reichweite in Tagen
      // 0-0.5 Tage → kritisch, 0.5-0.9 → niedrig, 0.9-1.5 → ok, >1.5 → hoch
      let status: 'hoch' | 'ok' | 'niedrig' | 'kritisch' | 'negativ' = 'ok'
      
      if (endBestand < 0) {
        status = 'negativ'
        tageNegativ++
        warnungen.push(`🔴 ${datumStr} (Tag ${tagImJahr}): NEGATIVER BESTAND für ${bauteil.name}! (${endBestand})`)
      } else if (reichweiteTage < 0.5) {
        // Kritisch wenn weniger als 0,5 Tage Reichweite
        status = 'kritisch'
      } else if (reichweiteTage < 0.9) {
        // Niedrig wenn 0,5 bis 0,9 Tage Reichweite
        status = 'niedrig'
      } else if (reichweiteTage < 1.5) {
        // Ok wenn 0,9 bis 1,5 Tage Reichweite
        status = 'ok'
      } else {
        // Hoch wenn mehr als 1,5 Tage Reichweite
        status = 'hoch'
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
    
    // NOTE: Der frühere "STEP 3e: TÄGLICHER BACKLOG-ABBAU" wurde entfernt.
    // 
    // GRUND: Der Backlog-Abbau wird bereits im Hauptloop (STEP 3b-3c) behandelt via
    // benoeligtMitBacklog = benoetigt + backlogVorher. Der zusätzliche Abbau-Code
    // hat zu Dateninkonsistenz geführt:
    // - Er modifizierte aktuelleBestaende NACH dem Speichern in tageErgebnisse
    // - Dadurch entstand ein Unterschied zwischen warehouse.verbrauch (Tabelle)
    //   und gesamtProduziertTatsaechlich (Statistik-Kachel)
    // 
    // Die korrekte Lösung ist, den Backlog vollständig im Hauptloop zu behandeln,
    // was durch benoeligtMitBacklog = benoetigt + backlogVorher bereits geschieht.
    
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
        // ✅ FIX: Maximale Tageskapazität aus Konfiguration (SSOT!)
        // kapazitaetProStunde * stundenProSchicht * maxSchichtenProTag
        const maxTageskapazitaet = 
          konfiguration.produktion.kapazitaetProStunde * 
          konfiguration.produktion.stundenProSchicht * 
          konfiguration.produktion.maxSchichtenProTag
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
  
  // 🔧 FIX: Erstelle date-based lookup für schnelleren Zugriff
  const planDateLookup: Record<string, Record<string, TagesProduktionEntry>> = {}
  Object.entries(korrigiertePlaene).forEach(([varianteId, plan]) => {
    planDateLookup[varianteId] = {}
    plan.tage.forEach(tag => {
      const dateKey = toLocalISODateString(tag.datum)
      planDateLookup[varianteId][dateKey] = tag
    })
  })
  
  // ✅ NEU: Error Tracker für proportionale Verteilung bei Engpass
  // Akkumuliert Rundungsfehler pro Variante+Bauteil Kombination
  const variantenErrorTracker: Record<string, number> = {}
  
  // Für jeden Tag im Warehouse
  warehouseResult.tage.forEach(warehouseTag => {
    const tagImJahr = warehouseTag.tag
    
    // Nur Tage im Planungsjahr (1-365)
    if (tagImJahr < 1 || tagImJahr > 365) return
    
    const datumStr = warehouseTag.datumStr
    
    // Für jede Variante
    Object.entries(korrigiertePlaene).forEach(([varianteId, plan]) => {
      // 🔧 FIX: Nutze date-based lookup statt Array-Index
      const produktionsTag = planDateLookup[varianteId][datumStr]
      if (!produktionsTag) return
      
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
      // Verbrauch = Anzahl verbrauchter Sättel (immer ganzzahlig)
      // Bikes = Verbrauch / mengeFaktor (z.B. 740 Sättel / 1 = 740 Bikes)
      // ✅ FIX: Kein Math.floor nötig, da verbrauch bereits ganzzahlig ist
      // Math.floor kann zu Verlusten führen bei Rundungsfehlern
      const tatsaechlichProduzierteBikes = mengeFaktor > 0 
        ? Math.round(bauteil.verbrauch / mengeFaktor)
        : 0
      
      // WICHTIG: Verteilung auf Varianten bei gemeinsamen Bauteilen!
      // Wenn mehrere Varianten dasselbe Bauteil nutzen, müssen wir proportional verteilen
      // Finde alle Varianten die dieses Bauteil nutzen
      const variantenMitBauteil = Object.keys(korrigiertePlaene).filter(vId => 
        konfiguration.stueckliste.some(s => s.mtbVariante === vId && s.bauteilId === bauteilId)
      )
      
      if (variantenMitBauteil.length > 1) {
        // PROPORTIONALE VERTEILUNG mit Error Management
        // Berechne Gesamt-PLAN für dieses Bauteil heute
        let gesamtPlan = 0
        const variantenPlaene: Record<string, number> = {}
        
        variantenMitBauteil.forEach(vId => {
          // 🔧 FIX: Nutze date-based lookup statt Array-Index
          const vPlan = planDateLookup[vId][datumStr]
          if (vPlan) {
            variantenPlaene[vId] = vPlan.planMenge
            gesamtPlan += vPlan.planMenge
          }
        })
        
        // Verteile tatsächliche Produktion proportional
        if (gesamtPlan > 0) {
          // ✅ KRITISCHER FIX: Wenn Produktion = Plan, nutze direkt den Plan-Wert
          // Dies vermeidet Rundungsfehler bei der proportionalen Verteilung
          // Die OEM-Planung hat bereits Error Management, daher ist planMenge exakt
          if (tatsaechlichProduzierteBikes === gesamtPlan) {
            // Exakte Produktion → nutze Plan direkt
            produktionsTag.istMenge = variantenPlaene[varianteId]
          } else {
            // Engpass → proportionale Verteilung mit Error Management
            const anteilDieseVariante = variantenPlaene[varianteId] / gesamtPlan
            const sollMenge = tatsaechlichProduzierteBikes * anteilDieseVariante
            
            // Error Management für faire Verteilung
            // Tracke kumulierten Fehler pro Variante+Bauteil Kombination
            const errorKey = `${varianteId}_${bauteilId}`
            if (!variantenErrorTracker[errorKey]) {
              variantenErrorTracker[errorKey] = 0
            }
            
            const basisMenge = Math.floor(sollMenge)
            const tagesError = sollMenge - basisMenge
            variantenErrorTracker[errorKey] += tagesError
            
            if (variantenErrorTracker[errorKey] >= 1.0) {
              produktionsTag.istMenge = basisMenge + 1
              variantenErrorTracker[errorKey] -= 1.0
            } else {
              produktionsTag.istMenge = basisMenge
            }
          }
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
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ✅ KRITISCHER FIX: Validiere und korrigiere Rundungsfehler
  // ═══════════════════════════════════════════════════════════════════════════════
  // Bei proportionaler Allokation können durch Rundung Bikes verloren gehen.
  // Beispiel: 740 Sättel verbraucht → durch proportionale Verteilung auf 4 Varianten
  // könnte Summe nur 739 ergeben (jede Variante verliert 0.25 durch floor)
  //
  // Lösung: Für jeden Tag prüfen ob Summe(istMenge) = verbrauch und ggf. korrigieren
  
  warehouseResult.tage.forEach(warehouseTag => {
    const tagImJahr = warehouseTag.tag
    if (tagImJahr < 1 || tagImJahr > 365) return
    
    const datumStr = warehouseTag.datumStr
    
    // Für jedes Bauteil einzeln prüfen
    warehouseTag.bauteile.forEach(bauteil => {
      const bauteilId = bauteil.bauteilId
      const mengeFaktor = 1 // Annahme: 1 Sattel = 1 Bike
      
      // Erwartete Bikes aus Bauteil-Verbrauch
      const erwarteteBikes = Math.round(bauteil.verbrauch / mengeFaktor)
      
      // Finde alle Varianten die dieses Bauteil nutzen
      const variantenMitBauteil = Object.keys(korrigiertePlaene).filter(vId => 
        konfiguration.stueckliste.some(s => s.mtbVariante === vId && s.bauteilId === bauteilId)
      )
      
      // Summe der tatsächlich zugewiesenen Bikes
      let summIstMenge = 0
      variantenMitBauteil.forEach(vId => {
        const produktionsTag = planDateLookup[vId][datumStr]
        if (produktionsTag) {
          summIstMenge += produktionsTag.istMenge
        }
      })
      
      // Differenz zwischen erwartet und tatsächlich
      const differenz = erwarteteBikes - summIstMenge
      
      // Falls Differenz > 0: Verteile fehlende Bikes auf Varianten mit größtem Anteil
      if (differenz > 0 && variantenMitBauteil.length > 0) {
        // Sortiere Varianten nach Plan-Menge (größte zuerst)
        const sortiert = variantenMitBauteil
          .map(vId => ({
            vId,
            planMenge: planDateLookup[vId][datumStr]?.planMenge || 0
          }))
          .sort((a, b) => b.planMenge - a.planMenge)
        
        // Verteile fehlende Bikes (je +1) an die größten Varianten
        let verteilt = 0
        for (const {vId} of sortiert) {
          if (verteilt >= differenz) break
          
          const produktionsTag = planDateLookup[vId][datumStr]
          if (produktionsTag) {
            produktionsTag.istMenge++
            produktionsTag.abweichung = produktionsTag.istMenge - produktionsTag.planMenge
            verteilt++
          }
        }
      }
      
      // Falls Differenz < 0: Entferne überzählige Bikes (sollte nicht passieren)
      if (differenz < 0 && variantenMitBauteil.length > 0) {
        console.warn(`⚠️ Zu viele Bikes verteilt: ${-differenz} bei ${bauteilId} am ${datumStr}`)
        // Entferne von Varianten mit geringstem Anteil
        const sortiert = variantenMitBauteil
          .map(vId => ({
            vId,
            istMenge: planDateLookup[vId][datumStr]?.istMenge || 0
          }))
          .filter(v => v.istMenge > 0)
          .sort((a, b) => a.istMenge - b.istMenge)
        
        let entfernt = 0
        for (const {vId} of sortiert) {
          if (entfernt >= -differenz) break
          
          const produktionsTag = planDateLookup[vId][datumStr]
          if (produktionsTag && produktionsTag.istMenge > 0) {
            produktionsTag.istMenge--
            produktionsTag.abweichung = produktionsTag.istMenge - produktionsTag.planMenge
            entfernt++
          }
        }
      }
    })
  })
  
  // Berechne kumulative Werte neu (nach Korrektur)
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
