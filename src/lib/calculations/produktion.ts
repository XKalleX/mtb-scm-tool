/**
 * ========================================
 * PRODUKTIONSLOGIK (OHNE SOLVER)
 * ========================================
 * 
 * Vereinfachte Produktionslogik für Code-Lösung:
 * - KEIN Solver (keine mathematische Optimierung)
 * - Stattdessen: First-Come-First-Serve Regel
 * - ATP-Check (Available-to-Promise): Ist genug Material da?
 * 
 * ABLAUF:
 * 1. Prüfe für jeden Produktionsauftrag: Material verfügbar?
 * 2. JA → Produziere & buche Material ab
 * 3. NEIN → Auftrag zurückstellen
 * 
 * Keine komplexe Optimierung wie bei Excel-Solver!
 */

import { Produktionsauftrag, Lagerbestand, TagesProduktionsplan, Stueckliste } from '@/types'
import { generateId } from '@/lib/utils'
import stuecklistenData from '@/data/stueckliste.json'

/**
 * Prüft ob genug Material für einen Auftrag verfügbar ist (ATP-Check)
 * 
 * Available-to-Promise = Können wir das produzieren?
 * 
 * @param auftrag - Produktionsauftrag
 * @param lagerbestaende - Aktuelle Lagerbestände
 * @param stueckliste - BOM der Variante
 * @returns True wenn alle Komponenten verfügbar
 */
export function pruefeATP(
  auftrag: Produktionsauftrag,
  lagerbestaende: Record<string, Lagerbestand>,
  stueckliste: Stueckliste
): boolean {
  // Prüfe jede benötigte Komponente
  for (const [kompId, komp] of Object.entries(stueckliste.komponenten)) {
    const benoetigt = auftrag.geplanteMenge * komp.menge
    const verfuegbar = lagerbestaende[kompId]?.bestand || 0
    
    if (verfuegbar < benoetigt) {
      // Nicht genug Material!
      return false
    }
  }
  
  return true // Alles verfügbar!
}

/**
 * Berechnet wie viel von einem Auftrag produziert werden kann
 * 
 * @param auftrag - Produktionsauftrag
 * @param lagerbestaende - Aktuelle Lagerbestände
 * @param stueckliste - BOM der Variante
 * @returns Produzierbare Menge (kann kleiner sein als geplant)
 */
export function berechneProduzierbareМenge(
  auftrag: Produktionsauftrag,
  lagerbestaende: Record<string, Lagerbestand>,
  stueckliste: Stueckliste
): number {
  let maxProduktion = auftrag.geplanteMenge
  
  // Prüfe jede Komponente als Constraint
  for (const [kompId, komp] of Object.entries(stueckliste.komponenten)) {
    const verfuegbar = lagerbestaende[kompId]?.bestand || 0
    const moeglicheProduktion = Math.floor(verfuegbar / komp.menge)
    
    maxProduktion = Math.min(maxProduktion, moeglicheProduktion)
  }
  
  return maxProduktion
}

/**
 * Bucht Material aus dem Lager ab
 * 
 * @param auftrag - Produktionsauftrag
 * @param lagerbestaende - Lagerbestände (werden modifiziert!)
 * @param stueckliste - BOM der Variante
 */
export function bucheMaterialAb(
  auftrag: Produktionsauftrag,
  lagerbestaende: Record<string, Lagerbestand>,
  stueckliste: Stueckliste
): void {
  Object.entries(stueckliste.komponenten).forEach(([kompId, komp]) => {
    const verbrauch = auftrag.tatsaechlicheMenge * komp.menge
    
    if (lagerbestaende[kompId]) {
      lagerbestaende[kompId].bestand -= verbrauch
      lagerbestaende[kompId].letzteBewegung = auftrag.datum
    }
  })
}

/**
 * Bucht Material ins Lager ein (von Bestellung)
 * 
 * @param komponenten - Komponenten der Bestellung
 * @param lagerbestaende - Lagerbestände (werden modifiziert!)
 * @param datum - Buchungsdatum
 */
export function bucheMaterialEin(
  komponenten: Record<string, number>,
  lagerbestaende: Record<string, Lagerbestand>,
  datum: Date
): void {
  Object.entries(komponenten).forEach(([kompId, menge]) => {
    if (!lagerbestaende[kompId]) {
      // Initialisiere Lagerbestand (Start bei 0)
      lagerbestaende[kompId] = {
        komponentenId: kompId,
        bestand: 0,
        maximalbestand: 50000,
        letzteBewegung: datum
      }
    }
    
    lagerbestaende[kompId].bestand += menge
    lagerbestaende[kompId].letzteBewegung = datum
  })
}

/**
 * Produziert Aufträge nach First-Come-First-Serve Prinzip
 * OHNE SOLVER-OPTIMIERUNG!
 * 
 * @param produktionsplaene - Alle Tagesproduktionspläne
 * @param lagerbestaende - Aktuelle Lagerbestände
 * @returns Array von Produktionsaufträgen
 */
export function produziereMitFCFS(
  produktionsplaene: Record<string, TagesProduktionsplan[]>,
  lagerbestaende: Record<string, Lagerbestand>
): Produktionsauftrag[] {
  const auftraege: Produktionsauftrag[] = []
  const stuecklisten = stuecklistenData.stuecklisten
  
  // Alle Tagesproduktionen chronologisch durchgehen
  const alleTage = Object.values(produktionsplaene)
    .flat()
    .sort((a, b) => a.datum.getTime() - b.datum.getTime())
  
  alleTage.forEach(tag => {
    if (tag.istMenge === 0) return // Kein Produktionstag
    
    const stueckliste = stuecklisten[tag.varianteId as keyof typeof stuecklisten]
    if (!stueckliste) return
    
    const auftrag: Produktionsauftrag = {
      id: generateId(),
      datum: tag.datum,
      varianteId: tag.varianteId,
      geplanteMenge: tag.istMenge,
      produzierbareMenge: 0,
      tatsaechlicheMenge: 0,
      status: 'geplant'
    }
    
    // ATP-Check: Genug Material?
    if (pruefeATP(auftrag, lagerbestaende, stueckliste)) {
      // JA - Volle Produktion möglich
      auftrag.produzierbareMenge = auftrag.geplanteMenge
      auftrag.tatsaechlicheMenge = auftrag.geplanteMenge
      auftrag.status = 'produziert'
      
      bucheMaterialAb(auftrag, lagerbestaende, stueckliste)
    } else {
      // NEIN - Nur Teilproduktion oder gar nicht
      const maxMenge = berechneProduzierbareМenge(auftrag, lagerbestaende, stueckliste)
      
      auftrag.produzierbareMenge = maxMenge
      auftrag.tatsaechlicheMenge = maxMenge
      
      if (maxMenge > 0) {
        auftrag.status = 'produziert'
        bucheMaterialAb(auftrag, lagerbestaende, stueckliste)
      } else {
        auftrag.status = 'geplant' // Material fehlt komplett
        
        // Fehlende Komponenten identifizieren
        const fehlend: string[] = []
        Object.entries(stueckliste.komponenten).forEach(([kompId, komp]) => {
          const benoetigt = auftrag.geplanteMenge * komp.menge
          const verfuegbar = lagerbestaende[kompId]?.bestand || 0
          if (verfuegbar < benoetigt) {
            fehlend.push(komp.name)
          }
        })
        auftrag.materialmangel = fehlend
      }
    }
    
    auftraege.push(auftrag)
  })
  
  return auftraege
}

/**
 * Berechnet Produktionsauslastung
 * 
 * @param auftraege - Produktionsaufträge
 * @returns Auslastung in %
 */
export function berechneAuslastung(auftraege: Produktionsauftrag[]): number {
  const geplant = auftraege.reduce((sum, a) => sum + a.geplanteMenge, 0)
  const produziert = auftraege.reduce((sum, a) => sum + a.tatsaechlicheMenge, 0)
  
  return geplant > 0 ? (produziert / geplant) * 100 : 0
}

/**
 * Berechnet Produktionsstatistiken
 * 
 * @param auftraege - Produktionsaufträge
 * @returns Statistiken
 */
export function berechneProduktionsstatistik(auftraege: Produktionsauftrag[]) {
  const gesamt = auftraege.reduce((sum, a) => sum + a.tatsaechlicheMenge, 0)
  const geplant = auftraege.reduce((sum, a) => sum + a.geplanteMenge, 0)
  const differenz = gesamt - geplant
  const auslastung = berechneAuslastung(auftraege)
  
  const mitMaterialmangel = auftraege.filter(a => a.materialmangel && a.materialmangel.length > 0).length
  const vollstaendig = auftraege.filter(a => a.tatsaechlicheMenge === a.geplanteMenge).length
  
  return {
    gesamt,
    geplant,
    differenz,
    auslastung,
    mitMaterialmangel,
    vollstaendig,
    planerfuellungsgrad: (vollstaendig / auftraege.length) * 100
  }
}