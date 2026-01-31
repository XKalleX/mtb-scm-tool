/**
 * ========================================
 * INBOUND LOGISTIK - CHINA
 * ========================================
 * * Bestellungen beim einzigen Lieferanten (China) - nur Sättel!
 * * OPTIMIERTE LOGIK (SOLUTION A - SAFETY BUFFER):
 * - Sicherheits-Puffer integriert (5 Tage) um Engpässe (Mittwochs-Lücke) zu vermeiden
 * - Schiffe fahren NUR mittwochs ab Shanghai
 * - LKWs fahren NICHT am Wochenende
 * - Material verfügbar am NÄCHSTEN TAG nach Ankunft
 * - Proportionale Allokation statt FCFS
 * * * Alle Parameter aus KonfigurationContext oder JSON-Referenzen
 * - Losgröße, Lieferintervall aus JSON als Referenz
 * - Stückliste aus Config/Parameter
 * - Feiertage über Parameter
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

// ====================================================================
// ✅ KONFIGURATION: SICHERHEITSPUFFER (SOLUTION A)
// ====================================================================
// Wir bestellen Ware so, dass sie 5 Tage VOR dem eigentlichen Bedarf da ist.
// Das fängt Risiken ab wie:
// 1. Schiff fährt nur Mittwochs (Wartezeit 1-6 Tage)
// 2. LKW-Verzögerungen oder Feiertage
const SICHERHEITS_PUFFER_TAGE = 5; 

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
 * TÄGLICHE BESTELLLOGIK MIT NEUEM MATERIALFLUSS & SAFETY BUFFER
 * ═══════════════════════════════════════════════════════════════════════════════
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
 * Generiert tägliche Bestellungen über das ganze Jahr (+ Vorlauf aus Vorjahr)
 */
export function generiereTaeglicheBestellungen(
  alleProduktionsplaene: Record<string, any[]>,  // Generic any[] erlaubt TagesProduktionsplan oder formatierten Typ
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
  
  // Verwende übergebene Stücklisten oder leeres Objekt als Fallback
  const stklst = stuecklisten || {}
  const LOSGROESSE = losgroesse
  const VORLAUFZEIT_TAGE = vorlaufzeitTage
  
  // ✅ UPDATE: Wir erweitern den Start-Puffer um den Sicherheitsbestand
  const LOSGROESSE_SAMMEL_PUFFER_TAGE = lieferintervall + SICHERHEITS_PUFFER_TAGE
  
  // Berechne täglichen Bedarf pro Komponente für das ganze Jahr
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
  
  // Fülle täglichen Bedarf aus Produktionsplänen
  Object.entries(alleProduktionsplaene).forEach(([varianteId, plan]) => {
    const stueckliste = stklst[varianteId as keyof typeof stklst]
    if (!stueckliste) return
    
    const komponenten = stueckliste.komponenten as Record<string, Komponente>
    
    plan.forEach((tag, tagIndex) => {
      const planMenge = (tag as any).planMenge || (tag as any).sollMenge || 0
      
      if (planMenge > 0 && tagIndex < 365) {
        Object.entries(komponenten).forEach(([kompId, komp]) => {
          taeglicheBedarf[kompId][tagIndex] += planMenge * komp.menge
        })
      }
    })
  })
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // BESTELLZEITRAUM
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const produktionsStart = new Date(planungsjahr, 0, 1)
  const bestellStart = addDays(produktionsStart, -VORLAUFZEIT_TAGE - LOSGROESSE_SAMMEL_PUFFER_TAGE)
  
  // Wir simulieren bis zum Ende, damit auch Bedarfe spät im Jahr gedeckt sind
  const bestellEnde = new Date(planungsjahr, 11, 31)
  
  // Offene Bestellmengen pro Komponente (akkumuliert bis Losgröße erreicht)
  const offeneMengen: Record<string, number> = {}
  alleKomponenten.forEach(k => { offeneMengen[k] = 0 })
  
  // Tägliche Bedarfsprüfung
  let aktuellerTag = new Date(bestellStart)
  
  while (aktuellerTag <= bestellEnde) {
    
    // ✅ SOLUTION A IMPLEMENTIERUNG:
    // Wir schauen: Vorlaufzeit + Sicherheits-Puffer in die Zukunft
    // Das sorgt dafür, dass der Bedarf früher erkannt wird.
    const lookaheadTage = VORLAUFZEIT_TAGE + SICHERHEITS_PUFFER_TAGE
    const planBedarfsDatum = addDays(aktuellerTag, lookaheadTage)
    
    const lieferTagIndex = Math.floor((planBedarfsDatum.getTime() - produktionsStart.getTime()) / (1000 * 60 * 60 * 24))
    
    // Bedarf akkumulieren
    if (lieferTagIndex >= 0 && lieferTagIndex < 365) {
      alleKomponenten.forEach(kompId => {
        offeneMengen[kompId] += taeglicheBedarf[kompId][lieferTagIndex] || 0
      })
    }
    
    // Prüfe ob BESTELLUNG möglich ist (nur an Arbeitstagen in CHINA!)
    if (isWeekend(aktuellerTag) || istChinaFeiertag(aktuellerTag, customFeiertage).length > 0) {
      aktuellerTag = addDays(aktuellerTag, 1)
      continue
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // LOSGRÖSSEN-CHECK
    // ═══════════════════════════════════════════════════════════════════════════════
    
    const gesamtOffeneMenge = Array.from(alleKomponenten).reduce((sum, k) => sum + offeneMengen[k], 0)
    
    let sollBestellen = false
    const bestellKomponenten: Record<string, number> = {}
    
    if (gesamtOffeneMenge >= LOSGROESSE) {
      sollBestellen = true
      // Berechne wie viele ganze Lose bestellt werden können
      const anzahlLose = Math.floor(gesamtOffeneMenge / LOSGROESSE)
      const bestellMengeGesamt = anzahlLose * LOSGROESSE
      
      // Verteile die Bestellmenge proportional
      let verteilt = 0
      const komponentenArray = Array.from(alleKomponenten)
      komponentenArray.forEach((kompId, idx) => {
        if (idx === komponentenArray.length - 1) {
          const rest = bestellMengeGesamt - verteilt
          bestellKomponenten[kompId] = Math.min(rest, offeneMengen[kompId])
          verteilt += bestellKomponenten[kompId]
        } else {
          const anteil = offeneMengen[kompId] / gesamtOffeneMenge
          const menge = Math.min(Math.round(bestellMengeGesamt * anteil), offeneMengen[kompId])
          bestellKomponenten[kompId] = menge
          verteilt += menge
        }
        offeneMengen[kompId] -= bestellKomponenten[kompId]
      })
    }
    
    if (sollBestellen) {
      const bestelldatum = new Date(aktuellerTag)
      
      // Das "offizielle" Bedarfsdatum im System ist ohne Puffer (für die Anzeige)
      // Aber wir haben bereits für einen Bedarf in der ferneren Zukunft bestellt.
      let bedarfsdatum = addDays(bestelldatum, VORLAUFZEIT_TAGE)
      
      if (!istArbeitstag_Deutschland(bedarfsdatum, customFeiertage)) {
        bedarfsdatum = naechsterArbeitstag_Deutschland(bedarfsdatum, customFeiertage)
      }
      
      // Berechne detaillierten Materialfluss
      const materialfluss = berechneMaterialflussDetails(bestelldatum, customFeiertage)
      const bestellungId = generiereBestellungsId(planungsjahr)
      
      bestellungen.push({
        id: bestellungId,
        bestelldatum,
        bedarfsdatum,
        komponenten: bestellKomponenten,
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
    
    aktuellerTag = addDays(aktuellerTag, 1)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FINALE BESTELLUNG: Restliche Mengen bestellen
  // ═══════════════════════════════════════════════════════════════════════════════
  const restKomponenten: Record<string, number> = {}
  let hatRest = false
  
  alleKomponenten.forEach(kompId => {
    if (offeneMengen[kompId] > 0) {
      hatRest = true
      restKomponenten[kompId] = offeneMengen[kompId]
      offeneMengen[kompId] = 0
    }
  })
  
  if (hatRest) {
    const finalesBestelldatum = new Date(bestellEnde)
    let finalesBedarfsdatum = addDays(finalesBestelldatum, VORLAUFZEIT_TAGE)
    
    if (!istArbeitstag_Deutschland(finalesBedarfsdatum, customFeiertage)) {
      finalesBedarfsdatum = naechsterArbeitstag_Deutschland(finalesBedarfsdatum, customFeiertage)
    }
    
    const materialfluss = berechneMaterialflussDetails(finalesBestelldatum, customFeiertage)
    const bestellungId = generiereBestellungsId(planungsjahr)
    
    bestellungen.push({
      id: bestellungId,
      bestelldatum: finalesBestelldatum,
      bedarfsdatum: finalesBedarfsdatum,
      komponenten: restKomponenten,
      erwarteteAnkunft: materialfluss.ankunftProduktion,
      verfuegbarAb: materialfluss.verfuegbarAb,
      status: 'bestellt',
      istVorjahr: false,
      grund: 'losgroesse', 
      materialfluss,
      schiffAbfahrtMittwoch: materialfluss.schiffAbfahrt,
      wartetageAmHafen: materialfluss.wartetageHafen
    })
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // VALIDIERUNG
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
    BESTELLVALIDIERUNG (tägliche Bestelllogik - NEUER MATERIALFLUSS)
    ═══════════════════════════════════════════════════════════════════════════════
    Gesamtbedarf (aus Produktionsplan): ${gesamtBenoetigteSaettel.toLocaleString('de-DE')} Sättel
    Gesamt bestellt:                     ${gesamtBestellteSaettel.toLocaleString('de-DE')} Sättel
    Differenz:                           ${(gesamtBestellteSaettel - gesamtBenoetigteSaettel).toLocaleString('de-DE')} Sättel
    
    NEU: Schiffe fahren nur mittwochs!
    Durchschnittl. Wartezeit am Hafen:   ${durchschnittlicheWartezeit.toFixed(1)} Tage
    
    Status: ${Math.abs(gesamtBestellteSaettel - gesamtBenoetigteSaettel) <= LOSGROESSE ? '✅ OK' : '❌ FEHLER!'}
    
    Anzahl Bestellungen: ${bestellungen.length}
    Zeitraum:            ${bestellungen[0]?.bestelldatum instanceof Date ? bestellungen[0].bestelldatum.toLocaleDateString('de-DE') : 'N/A'} - ${bestellungen[bestellungen.length - 1]?.bestelldatum instanceof Date ? bestellungen[bestellungen.length - 1].bestelldatum.toLocaleDateString('de-DE') : 'N/A'}
    ═══════════════════════════════════════════════════════════════════════════════
  `)
  
  if (Math.abs(gesamtBestellteSaettel - gesamtBenoetigteSaettel) > LOSGROESSE) {
    console.warn(`⚠️ WARNUNG: Bestellmenge weicht um mehr als eine Losgröße (${LOSGROESSE}) ab!`)
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