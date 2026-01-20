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
 * - Spring Festival: 5.2.-12.2.2027 = 8 Tage Produktionsstopp!
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
 * 2. Bestellung erfolgt wenn Losgröße 500 erreicht ist
 * 3. Bestellungen beginnen VOR 2027 (49 Tage Vorlaufzeit!)
 *    - Erste Produktion: 01.01.2027
 *    - Erste Bestellung: ~12.11.2026 (49 Tage vorher)
 * 4. Aggregation über alle 4 Sattel-Varianten
 * 5. KEINE Initial-Bestellung! Nur täglicher Bedarf bestellen
 * 6. Gesamtmenge = exakt 370.000 Sättel (1:1 mit Produktion)
 * 
 * WICHTIG: Bestellzeitraum endet bei 31.12.2027 - 49 Tage = ~12.11.2027
 * 
 * @param alleProduktionsplaene - Pläne aller MTB-Varianten
 * @param planungsjahr - Jahr (default: 2027)
 * @param vorlaufzeitTage - Fixe Vorlaufzeit (default: 49 Tage, konfigurierbar)
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
  grund: 'losgroesse' | 'zusatzbestellung'
}

// ✅ Konstante für Puffer-Tage (für Losgröße-Sammlung vor Produktionsstart)
const LOSGROESSE_SAMMEL_PUFFER_TAGE = 14

/**
 * Generiert tägliche Bestellungen über das ganze Jahr (+ Vorlauf aus 2026)
 * 
 * KORRIGIERT:
 * - Keine Initial-Bestellung
 * - Exakt nur benötigte Mengen bestellen
 * - Zeitraum: Beginn ~Mitte Oktober 2026, Ende ~Mitte November 2027
 * - Bestellmenge = Produktionsmenge (370.000 Sättel)
 */
export function generiereTaeglicheBestellungen(
  alleProduktionsplaene: Record<string, TagesProduktionsplan[]>,
  planungsjahr: number = 2027,
  vorlaufzeitTage: number = 49
): TaeglicheBestellung[] {
  const bestellungen: TaeglicheBestellung[] = []
  const stuecklisten = stuecklistenData.stuecklisten
  const LOSGROESSE = lieferantData.lieferant.losgroesse // 500
  const VORLAUFZEIT_TAGE = vorlaufzeitTage // Fixe Vorlaufzeit (konfigurierbar)
  
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
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // BESTELLZEITRAUM: Beginne früh genug für Produktionsstart am 01.01.2027
  // und ende bei 31.12.2027 - 49 Tage (~ 12.11.2027)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Berechne Startdatum: 01.01.2027 - Vorlaufzeit - Puffer für Losgröße-Sammlung
  const produktionsStart = new Date(planungsjahr, 0, 1) // 01.01.2027
  const bestellStart = addDays(produktionsStart, -VORLAUFZEIT_TAGE - LOSGROESSE_SAMMEL_PUFFER_TAGE) // ~Mitte Oktober 2026
  
  // Berechne Enddatum: Letzte Bestellung muss 49 Tage vor 31.12.2027 erfolgen
  const produktionsEnde = new Date(planungsjahr, 11, 31) // 31.12.2027
  const bestellEnde = addDays(produktionsEnde, -VORLAUFZEIT_TAGE) // ~12.11.2027
  
  // Offene Bestellmengen pro Komponente (akkumuliert bis Losgröße erreicht)
  const offeneMengen: Record<string, number> = {}
  alleKomponenten.forEach(k => { offeneMengen[k] = 0 })
  
  // Tägliche Bedarfsprüfung vom Bestellstart bis Bestellende
  let aktuellerTag = new Date(bestellStart)
  
  while (aktuellerTag <= bestellEnde) {
    // Berechne welcher Produktionstag in der Zukunft beliefert werden soll
    // (heute + 49 Tage Vorlaufzeit)
    const lieferTag = addDays(aktuellerTag, VORLAUFZEIT_TAGE)
    const lieferTagIndex = Math.floor((lieferTag.getTime() - produktionsStart.getTime()) / (1000 * 60 * 60 * 24))
    
    // Nur Bedarf für das Planungsjahr sammeln
    if (lieferTagIndex >= 0 && lieferTagIndex < 365) {
      // Addiere Bedarf für den zukünftigen Liefertag zu offenen Mengen
      alleKomponenten.forEach(kompId => {
        offeneMengen[kompId] += taeglicheBedarf[kompId][lieferTagIndex] || 0
      })
    }
    
    // Prüfe ob Bestellung ausgelöst werden muss (Losgröße erreicht)
    let sollBestellen = false
    const bestellKomponenten: Record<string, number> = {}
    
    alleKomponenten.forEach(kompId => {
      // Bestelle wenn Losgröße erreicht (exakt, kein Aufrunden über Bedarf!)
      if (offeneMengen[kompId] >= LOSGROESSE) {
        sollBestellen = true
        // Bestelle nur ganze Lose, behalte Rest für nächste Bestellung
        const anzahlLose = Math.floor(offeneMengen[kompId] / LOSGROESSE)
        const bestellMenge = anzahlLose * LOSGROESSE
        bestellKomponenten[kompId] = bestellMenge
        offeneMengen[kompId] -= bestellMenge // Rest bleibt für nächste Bestellung
      }
    })
    
    if (sollBestellen) {
      const bestelldatum = new Date(aktuellerTag)
      const bedarfsdatum = addDays(bestelldatum, VORLAUFZEIT_TAGE)
      
      bestellungen.push({
        id: generateId(),
        bestelldatum,
        bedarfsdatum,
        komponenten: bestellKomponenten,
        erwarteteAnkunft: berechneAnkunftsdatum(bestelldatum),
        status: bestelldatum.getFullYear() < planungsjahr ? 'geliefert' : 
                bestelldatum.getMonth() < 3 ? 'unterwegs' : 'bestellt',
        istVorjahr: bestelldatum.getFullYear() < planungsjahr,
        grund: 'losgroesse'
      })
    }
    
    aktuellerTag = addDays(aktuellerTag, 1)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FINALE BESTELLUNG: Restliche Mengen bestellen (auch wenn < Losgröße)
  // ═══════════════════════════════════════════════════════════════════════════════
  const restKomponenten: Record<string, number> = {}
  let hatRest = false
  
  alleKomponenten.forEach(kompId => {
    if (offeneMengen[kompId] > 0) {
      hatRest = true
      // Auf Losgröße aufrunden für finale Bestellung
      restKomponenten[kompId] = rundeAufLosgroesse(offeneMengen[kompId])
      offeneMengen[kompId] = 0
    }
  })
  
  if (hatRest) {
    const finalesBestelldatum = new Date(bestellEnde)
    const finalesBedarfsdatum = addDays(finalesBestelldatum, VORLAUFZEIT_TAGE)
    
    bestellungen.push({
      id: generateId(),
      bestelldatum: finalesBestelldatum,
      bedarfsdatum: finalesBedarfsdatum,
      komponenten: restKomponenten,
      erwarteteAnkunft: berechneAnkunftsdatum(finalesBestelldatum),
      status: 'bestellt',
      istVorjahr: false,
      grund: 'losgroesse'
    })
  }
  
  return bestellungen
}

/**
 * Erstellt eine Zusatzbestellung für einen bestimmten Tag
 * Wird über das Zusatzbestellungs-Formular aufgerufen
 */
export function erstelleZusatzbestellung(
  bestelldatum: Date,
  komponenten: Record<string, number>,
  vorlaufzeitTage: number = 49
): TaeglicheBestellung {
  const LOSGROESSE = lieferantData.lieferant.losgroesse
  
  // Auf Losgröße aufrunden
  const aufgerundeteKomponenten: Record<string, number> = {}
  Object.entries(komponenten).forEach(([kompId, menge]) => {
    aufgerundeteKomponenten[kompId] = rundeAufLosgroesse(menge)
  })
  
  const bedarfsdatum = addDays(bestelldatum, vorlaufzeitTage)
  
  return {
    id: generateId(),
    bestelldatum,
    bedarfsdatum,
    komponenten: aufgerundeteKomponenten,
    erwarteteAnkunft: berechneAnkunftsdatum(bestelldatum),
    status: 'bestellt',
    istVorjahr: false,
    grund: 'zusatzbestellung'
  }
}