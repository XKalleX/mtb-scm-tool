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
import { addDays, generateId, isWeekend } from '@/lib/utils'
import { 
  berechneAnkunftsdatum, 
  istChinaFeiertag,
  istArbeitstag_Deutschland,
  naechsterArbeitstag_Deutschland,
  FeiertagsKonfiguration,
  berechneMaterialflussDetails,
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
 * HAUPTFUNKTION: Generiert Bestellungen basierend auf OEM-Produktionsplänen
 * ═══════════════════════════════════════════════════════════════════════════════
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