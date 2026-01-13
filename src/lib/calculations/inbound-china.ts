/**
 * ========================================
 * INBOUND LOGISTIK - CHINA
 * ========================================
 * 
 * Bestellungen beim einzigen Lieferanten (China) - nur Sättel!
 * 
 * WICHTIGE PARAMETER (gemäß SSOT-Spezifikation und Anforderungen):
 * - Vorlaufzeit: 49 Tage GESAMT (7 Wochen)
 *   - 5 Arbeitstage Produktion
 *   - 2 Arbeitstage LKW China → Hafen
 *   - 30 Kalendertage Seefracht
 *   - 2 Arbeitstage LKW Hamburg → Dortmund
 * - Losgröße: 500 Stück Sättel (Mindestbestellung)
 * - Lieferintervall: Alle 14 Tage
 * - Spring Festival: 28.1.-4.2.2027 = 8 Tage Produktionsstopp!
 * - Nur 4 Sattel-Varianten (Ermäßigung Code-Lösung)
 * 
 * BERECHNUNGSLOGIK:
 * 1. Sattel-Bedarf aus Produktionsplan ermitteln (1 Sattel = 1 Bike)
 * 2. Bestelldatum rückwärts berechnen (inkl. 49 Tage Vorlaufzeit)
 * 3. Losgrößen aufrunden (min. 500 Stück)
 * 4. Spring Festival berücksichtigen (8 Tage)
 */

import { Bestellung, TagesProduktionsplan, Stueckliste, Maschinenausfall } from '@/types'
import { addDays, generateId } from '@/lib/utils'
import { berechneBestelldatum, berechneAnkunftsdatum, istSpringFestival } from '@/lib/kalender'
import lieferantData from '@/data/lieferant-china.json'
import stuecklistenData from '@/data/stueckliste.json'

// Type für Komponente
type Komponente = {
  name: string;
  menge: number;
  einheit: string;
}

/**
 * Berechnet den Komponentenbedarf für einen Produktionsplan
 * 
 * @param produktionsplan - Tagesplan einer Variante
 * @param stueckliste - BOM dieser Variante
 * @returns Komponentenbedarf { komponentenId: menge }
 */
export function berechneKomponentenbedarf(
  produktionsplan: TagesProduktionsplan[],
  stueckliste: Stueckliste
): Record<string, number> {
  const bedarf: Record<string, number> = {}
  
  // Initialisiere alle Komponenten mit 0
  const komponenten = stueckliste.komponenten as Record<string, Komponente>
  Object.keys(komponenten).forEach(kompId => {
    bedarf[kompId] = 0
  })
  
  // Summiere Bedarf über alle Produktionstage
  produktionsplan.forEach(tag => {
    if (tag.istMenge > 0) {
      Object.entries(komponenten).forEach(([kompId, komp]) => {
        bedarf[kompId] += tag.istMenge * komp.menge
      })
    }
  })
  
  return bedarf
}

/**
 * Berechnet Gesamtbedarf aller Varianten für eine Komponente
 * 
 * @param komponentenId - ID der Komponente
 * @param alleProduktionsplaene - Pläne aller Varianten
 * @returns Gesamtbedarf dieser Komponente
 */
export function berechneGesamtbedarfKomponente(
  komponentenId: string,
  alleProduktionsplaene: Record<string, TagesProduktionsplan[]>
): number {
  const stuecklisten = stuecklistenData.stuecklisten
  let gesamtbedarf = 0
  
  Object.entries(alleProduktionsplaene).forEach(([varianteId, plan]) => {
    const stueckliste = stuecklisten[varianteId as keyof typeof stuecklisten]
    if (!stueckliste) return
    
    // TypeScript-sicherer Zugriff auf Komponenten
    const komponenten = stueckliste.komponenten as Record<string, Komponente>
    const komponente = komponenten[komponentenId]
    if (!komponente) return
    
    const variantenProduktion = plan.reduce((sum, tag) => sum + tag.istMenge, 0)
    gesamtbedarf += variantenProduktion * komponente.menge
  })
  
  return gesamtbedarf
}

/**
 * Rundet Bestellmenge auf Losgröße auf (min. 500 Stück Sättel)
 * 
 * @param menge - Benötigte Menge
 * @returns Aufgerundete Bestellmenge
 */
export function rundeAufLosgroesse(menge: number): number {
  const LOSGROESSE = lieferantData.lieferant.losgroesse
  
  if (menge === 0) return 0
  
  // Aufrunden auf nächstes Vielfaches der Losgröße
  return Math.ceil(menge / LOSGROESSE) * LOSGROESSE
}

/**
 * Erstellt eine Bestellung bei China
 * 
 * @param komponentenbedarf - Bedarf pro Komponente
 * @param bedarfsdatum - Wann wird Material gebraucht
 * @returns Bestellung
 */
export function erstelleBestellung(
  komponentenbedarf: Record<string, number>,
  bedarfsdatum: Date
): Bestellung {
  const bestelldatum = berechneBestelldatum(bedarfsdatum)
  const ankunftsdatum = berechneAnkunftsdatum(bestelldatum)
  
  // Mengen auf Losgröße aufrunden
  const komponenten: Record<string, number> = {}
  Object.entries(komponentenbedarf).forEach(([kompId, menge]) => {
    komponenten[kompId] = rundeAufLosgroesse(menge)
  })
  
  return {
    id: generateId(),
    bestelldatum,
    komponenten,
    status: 'bestellt',
    erwarteteAnkunft: ankunftsdatum
  }
}

/**
 * Generiert Bestellungen für das ganze Jahr
 * 
 * Strategie: Monatliche Bestellungen
 * - Berechne Sattel-Bedarf pro Monat (1 Sattel = 1 Bike)
 * - Bestelle jeweils am Monatsanfang für den Monat + 49 Tage Vorlauf
 * 
 * @param alleProduktionsplaene - Pläne aller Varianten
 * @returns Array von Bestellungen
 */
export function generiereJahresbestellungen(
  alleProduktionsplaene: Record<string, TagesProduktionsplan[]>
): Bestellung[] {
  const bestellungen: Bestellung[] = []
  const stuecklisten = stuecklistenData.stuecklisten
  
  // Für jeden Monat eine Bestellung
  for (let monat = 1; monat <= 12; monat++) {
    const monatsBedarf: Record<string, number> = {}
    
    // Initialisiere alle Komponenten mit 0
    const alleKomponenten = new Set<string>()
    Object.values(stuecklisten).forEach(sl => {
      const komponenten = sl.komponenten as Record<string, Komponente>
      Object.keys(komponenten).forEach(k => alleKomponenten.add(k))
    })
    alleKomponenten.forEach(k => monatsBedarf[k] = 0)
    
    // Summiere Bedarf dieses Monats über alle Varianten
    Object.entries(alleProduktionsplaene).forEach(([varianteId, plan]) => {
      const stueckliste = stuecklisten[varianteId as keyof typeof stuecklisten]
      if (!stueckliste) return
      
      const monatsTage = plan.filter(t => new Date(t.datum).getMonth() + 1 === monat)
      const komponenten = stueckliste.komponenten as Record<string, Komponente>
      
      monatsTage.forEach(tag => {
        if (tag.istMenge > 0) {
          Object.entries(komponenten).forEach(([kompId, komp]) => {
            monatsBedarf[kompId] = (monatsBedarf[kompId] || 0) + tag.istMenge * komp.menge
          })
        }
      })
    })
    
    // Bedarfsdatum = 1. Tag des Monats
    const bedarfsdatum = new Date(2027, monat - 1, 1)
    
    // Erstelle Bestellung
    const bestellung = erstelleBestellung(monatsBedarf, bedarfsdatum)
    bestellungen.push(bestellung)
  }
  
  return bestellungen
}

/**
 * Simuliert einen Maschinenausfall in China (Szenario 2)
 * 
 * Auswirkung: Verzögerte Lieferung
 * 
 * @param bestellung - Original-Bestellung
 * @param ausfall - Maschinenausfall-Daten
 * @returns Angepasste Bestellung mit Verzögerung
 */
export function wendeMaschinenausfallAn(
  bestellung: Bestellung,
  ausfall: Maschinenausfall
): Bestellung {
  // Prüfe ob Bestellung von Ausfall betroffen ist
  const bestelldatum = new Date(bestellung.bestelldatum)
  
  if (bestelldatum >= ausfall.startDatum && bestelldatum <= ausfall.endDatum) {
    // Bestellung ist betroffen - verzögere Ankunft
    const verzoegerung = ausfall.nachproduktion ? ausfall.dauer : ausfall.dauer * 2
    
    return {
      ...bestellung,
      erwarteteAnkunft: addDays(bestellung.erwarteteAnkunft, verzoegerung),
      status: 'unterwegs'
    }
  }
  
  return bestellung
}

/**
 * Berechnet Überbestand durch Losgrößen-Rundung
 * 
 * @param bestellt - Bestellte Menge (aufgerundet)
 * @param benoetigt - Tatsächlich benötigte Menge
 * @returns Überbestand
 */
export function berechneUeberbestand(bestellt: number, benoetigt: number): number {
  return Math.max(0, bestellt - benoetigt)
}

/**
 * Prüft ob Spring Festival die Bestellung betrifft
 * 
 * @param bestellung - Bestellung
 * @returns True wenn Spring Festival die Produktion verzögert (8 Tage Shutdown)
 */
export function betrifftSpringFestival(bestellung: Bestellung): boolean {
  const bestelldatum = new Date(bestellung.bestelldatum)
  
  // Prüfe ob Produktionsphase (5 AT) mit Spring Festival überlappt
  for (let i = 0; i < 10; i++) {
    const tag = addDays(bestelldatum, i)
    if (istSpringFestival(tag)) {
      return true
    }
  }
  
  return false
}

/**
 * Berechnet Bestellstatistiken
 * 
 * @param bestellungen - Array von Bestellungen
 * @returns Statistiken
 */
export function berechneBestellstatistik(bestellungen: Bestellung[]) {
  const anzahl = bestellungen.length
  const gesamtwert = bestellungen.reduce((sum, b) => {
    return sum + Object.values(b.komponenten).reduce((s, m) => s + m, 0)
  }, 0)
  
  const durchschnittProBestellung = gesamtwert / anzahl
  const springFestivalBetroffen = bestellungen.filter(b => betrifftSpringFestival(b)).length
  
  return {
    anzahl,
    gesamtwert,
    durchschnittProBestellung,
    springFestivalBetroffen
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NEUE FUNKTION: TÄGLICHE BESTELLLOGIK (Anforderung aus PDF)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Implementiert die korrekte Bestelllogik gemäß Anforderungen:
 * 
 * 1. TÄGLICH wird der Bedarf ermittelt (nicht monatlich!)
 * 2. Bestellung erfolgt wenn:
 *    - Losgröße 500 erreicht ist ODER
 *    - Sicherheitsbestand unterschritten wird
 * 3. Bestellungen müssen VOR 2027 beginnen (49 Tage Vorlaufzeit!)
 *    - Erste Produktion: 01.01.2027
 *    - Erste Bestellung: ~12.11.2026 (49 Tage vorher)
 * 4. Aggregation über alle 4 Sattel-Varianten
 * 
 * @param alleProduktionsplaene - Pläne aller MTB-Varianten
 * @param planungsjahr - Jahr (default: 2027)
 * @returns Array von Bestellungen (inkl. Vorjahr!)
 */
export interface TaeglicheBestellung {
  id: string
  bestelldatum: Date
  bedarfsdatum: Date
  komponenten: Record<string, number> // Sattel-ID → Menge
  erwarteteAnkunft: Date
  status: 'bestellt' | 'unterwegs' | 'geliefert'
  istVorjahr: boolean // Bestellung aus 2026?
  grund: 'losgroesse' | 'sicherheitsbestand' | 'initial'
}

/**
 * Generiert tägliche Bestellungen über das ganze Jahr (+ Vorlauf aus 2026)
 */
export function generiereTaeglicheBestellungen(
  alleProduktionsplaene: Record<string, TagesProduktionsplan[]>,
  planungsjahr: number = 2027
): TaeglicheBestellung[] {
  const bestellungen: TaeglicheBestellung[] = []
  const stuecklisten = stuecklistenData.stuecklisten
  const LOSGROESSE = lieferantData.lieferant.losgroesse // 500
  const VORLAUFZEIT_TAGE = 49
  
  // Berechne täglichen Bedarf pro Komponente für das ganze Jahr
  const taeglicheBedarf: Record<string, number[]> = {} // komponente -> array[365]
  
  // Initialisiere alle Sattel-Komponenten
  const alleKomponenten = new Set<string>()
  Object.values(stuecklisten).forEach(sl => {
    const komponenten = sl.komponenten as Record<string, Komponente>
    Object.keys(komponenten).forEach(k => alleKomponenten.add(k))
  })
  
  alleKomponenten.forEach(k => {
    taeglicheBedarf[k] = Array(365).fill(0)
  })
  
  // Fülle täglichen Bedarf aus Produktionsplänen
  Object.entries(alleProduktionsplaene).forEach(([varianteId, plan]) => {
    const stueckliste = stuecklisten[varianteId as keyof typeof stuecklisten]
    if (!stueckliste) return
    
    const komponenten = stueckliste.komponenten as Record<string, Komponente>
    
    plan.forEach((tag, tagIndex) => {
      if (tag.istMenge > 0 && tagIndex < 365) {
        Object.entries(komponenten).forEach(([kompId, komp]) => {
          taeglicheBedarf[kompId][tagIndex] += tag.istMenge * komp.menge
        })
      }
    })
  })
  
  // Simuliere tägliche Bedarfsprüfung und Bestellungen
  // Starte im Vorjahr um Vorlaufzeit abzudecken!
  const startDatum = new Date(planungsjahr - 1, 10, 1) // 1. November 2026
  const endDatum = new Date(planungsjahr, 11, 31) // 31. Dezember 2027
  
  // Offene Bestellmengen pro Komponente (akkumuliert bis Losgröße erreicht)
  const offeneMengen: Record<string, number> = {}
  alleKomponenten.forEach(k => { offeneMengen[k] = 0 })
  
  // Berechne Jahresbedarf für Sicherheitsbestand
  const jahresbedarf: Record<string, number> = {}
  alleKomponenten.forEach(kompId => {
    jahresbedarf[kompId] = taeglicheBedarf[kompId].reduce((sum, bedarf) => sum + bedarf, 0)
  })
  
  // ✅ INITIAL-BESTELLUNG für Produktionsstart am 01.01.2027
  // Sicherheitsbestand = 14 Tage Bedarf
  const initialBestelldatum = new Date(planungsjahr - 1, 10, 12) // 12. November 2026
  const initialBedarfsdatum = new Date(planungsjahr, 0, 1) // 01. Januar 2027
  const initialKomponenten: Record<string, number> = {}
  
  alleKomponenten.forEach(kompId => {
    // 14 Tage Sicherheitsbestand zum Start
    const tagesbedarf = jahresbedarf[kompId] / 365
    const sicherheitsbestand = Math.ceil(tagesbedarf * 14)
    // Auf Losgröße aufrunden
    initialKomponenten[kompId] = rundeAufLosgroesse(sicherheitsbestand)
  })
  
  bestellungen.push({
    id: generateId(),
    bestelldatum: initialBestelldatum,
    bedarfsdatum: initialBedarfsdatum,
    komponenten: initialKomponenten,
    erwarteteAnkunft: berechneAnkunftsdatum(initialBestelldatum),
    status: 'geliefert',
    istVorjahr: true,
    grund: 'initial'
  })
  
  // Tägliche Bedarfsprüfung durch das Jahr
  let aktuellerTag = new Date(startDatum)
  let tagIndexImJahr = 0
  
  while (aktuellerTag <= endDatum) {
    const jahr = aktuellerTag.getFullYear()
    const istPlanungsjahr = jahr === planungsjahr
    
    if (istPlanungsjahr && tagIndexImJahr < 365) {
      // Addiere heutigen Bedarf zu offenen Mengen
      alleKomponenten.forEach(kompId => {
        offeneMengen[kompId] += taeglicheBedarf[kompId][tagIndexImJahr] || 0
      })
    }
    
    // Prüfe ob Bestellung ausgelöst werden muss
    let sollBestellen = false
    const bestellKomponenten: Record<string, number> = {}
    
    alleKomponenten.forEach(kompId => {
      // Grund 1: Losgröße erreicht
      if (offeneMengen[kompId] >= LOSGROESSE) {
        sollBestellen = true
        bestellKomponenten[kompId] = rundeAufLosgroesse(offeneMengen[kompId])
        offeneMengen[kompId] = 0 // Reset nach Bestellung
      }
      // Grund 2: Sicherheitsbestand kritisch (alle 2 Wochen prüfen)
      else if (tagIndexImJahr % 14 === 0 && offeneMengen[kompId] > 0) {
        sollBestellen = true
        bestellKomponenten[kompId] = rundeAufLosgroesse(offeneMengen[kompId])
        offeneMengen[kompId] = 0
      }
    })
    
    if (sollBestellen) {
      const bedarfsdatum = addDays(aktuellerTag, VORLAUFZEIT_TAGE)
      const bestelldatum = aktuellerTag
      
      bestellungen.push({
        id: generateId(),
        bestelldatum,
        bedarfsdatum,
        komponenten: bestellKomponenten,
        erwarteteAnkunft: berechneAnkunftsdatum(bestelldatum),
        status: bestelldatum.getFullYear() < planungsjahr ? 'geliefert' : 
                bestelldatum.getMonth() < 3 ? 'unterwegs' : 'bestellt',
        istVorjahr: bestelldatum.getFullYear() < planungsjahr,
        grund: offeneMengen[Object.keys(bestellKomponenten)[0]] >= LOSGROESSE 
          ? 'losgroesse' : 'sicherheitsbestand'
      })
    }
    
    aktuellerTag = addDays(aktuellerTag, 1)
    if (istPlanungsjahr) {
      tagIndexImJahr++
    }
  }
  
  return bestellungen
}