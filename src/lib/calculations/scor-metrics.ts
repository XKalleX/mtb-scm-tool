/**
 * ========================================
 * SCOR METRIKEN (REDUZIERT)
 * ========================================
 * 
 * SCOR = Supply Chain Operations Reference Model
 * 
 * Für Code-Lösung OHNE Outbound:
 * - Fokus auf Produktions- und Lager-KPIs
 * - Keine Liefertreue an Märkte (da kein Outbound)
 * - Stattdessen: Planerfüllungsgrad, Lagerumschlag, etc.
 * - KEINE KOSTEN (gemäß Anforderungen)
 * 
 * SCOR Level 1 Kategorien:
 * 1. RELIABILITY (Zuverlässigkeit)
 * 2. RESPONSIVENESS (Reaktionsfähigkeit)
 * 3. AGILITY (Flexibilität)
 * 4. ASSETS (Vermögenswerte)
 */

import { SCORMetriken, Produktionsauftrag, Lagerbestand, Bestellung } from '@/types'
import { daysBetween } from '@/lib/utils'

/**
 * Berechnet alle SCOR-Metriken
 * 
 * @param produktionsauftraege - Alle Produktionsaufträge
 * @param lagerbestaende - Lagerbestände
 * @param bestellungen - Bestellungen
 * @returns SCOR-Metriken
 */
export function berechneSCORMetriken(
  produktionsauftraege: Produktionsauftrag[],
  lagerbestaende: Record<string, Lagerbestand>,
  bestellungen: Bestellung[]
): SCORMetriken {
  // ==========================================
  // RELIABILITY (Zuverlässigkeit)
  // ==========================================
  
  const vollstaendigeAuftraege = produktionsauftraege.filter(
    a => a.tatsaechlicheMenge === a.geplanteMenge
  ).length
  
  const planerfuellungsgrad = (vollstaendigeAuftraege / produktionsauftraege.length) * 100
  
  const puenktlicheBestellungen = bestellungen.filter(b => {
    if (!b.tatsaechlicheAnkunft) return true
    return b.tatsaechlicheAnkunft <= b.erwarteteAnkunft
  }).length
  
  const liefertreueChina = (puenktlicheBestellungen / bestellungen.length) * 100
  
  // ==========================================
  // RESPONSIVENESS (Reaktionsfähigkeit)
  // ==========================================
  
  // Durchlaufzeit: Bestellung bis Produktion
  let durchlaufzeiten: number[] = []
  bestellungen.forEach(b => {
    const ankunft = b.tatsaechlicheAnkunft || b.erwarteteAnkunft
    const dauer = daysBetween(b.bestelldatum, ankunft)
    durchlaufzeiten.push(dauer)
  })
  
  const durchlaufzeitProduktion = durchlaufzeiten.length > 0
    ? durchlaufzeiten.reduce((sum, d) => sum + d, 0) / durchlaufzeiten.length
    : 0
  
  // Lagerumschlag: Wie oft wird Lager pro Jahr umgeschlagen
  const lagerbestandswert = Object.values(lagerbestaende)
    .reduce((sum, l) => sum + l.bestand, 0)
  
  const jahresproduktion = produktionsauftraege
    .reduce((sum, a) => sum + a.tatsaechlicheMenge, 0)
  
  const lagerumschlag = lagerbestandswert > 0 ? jahresproduktion / lagerbestandswert : 0
  
  // ==========================================
  // AGILITY (Flexibilität)
  // ==========================================
  
  // Produktionsflexibilität: Wie oft wurde volle Menge produziert
  const produktionsflexibilitaet = planerfuellungsgrad
  
  // Materialverfügbarkeit: Wie oft war Material da
  const materialVerfuegbarTage = produktionsauftraege.filter(
    a => !a.materialmangel || a.materialmangel.length === 0
  ).length
  
  const materialverfuegbarkeit = (materialVerfuegbarTage / produktionsauftraege.length) * 100
  
  // ==========================================
  // ASSETS (Vermögenswerte)
  // ==========================================
  
  const kapitalbindung = lagerbestandswert > 0
    ? (lagerbestandswert * 100 * 365) / jahresproduktion / 1000
    : 0
  
  // ==========================================
  // PRODUKTIONS-KPIs
  // ==========================================
  
  const gesamtproduktion = jahresproduktion
  const produktionstage = produktionsauftraege.filter(a => a.tatsaechlicheMenge > 0).length
  const durchschnittProTag = produktionstage > 0 ? gesamtproduktion / produktionstage : 0
  const auslastung = planerfuellungsgrad
  
  return {
    // RELIABILITY
    planerfuellungsgrad,
    liefertreueChina,
    
    // RESPONSIVENESS
    durchlaufzeitProduktion,
    lagerumschlag,
    
    // AGILITY
    produktionsflexibilitaet,
    materialverfuegbarkeit,
    
    // ASSETS
    lagerbestandswert,
    kapitalbindung,
    
    // PRODUKTIONS-KPIs
    gesamtproduktion,
    produktionstage,
    durchschnittProTag,
    auslastung
  }
}

/**
 * Bewertet SCOR-Metriken (Ampel-System)
 * 
 * @param metriken - SCOR-Metriken
 * @returns Bewertung: 'gut', 'mittel', 'schlecht'
 */
export function bewerteSCORMetriken(metriken: SCORMetriken): Record<string, string> {
  return {
    planerfuellungsgrad: metriken.planerfuellungsgrad >= 95 ? 'gut' : 
                         metriken.planerfuellungsgrad >= 85 ? 'mittel' : 'schlecht',
    
    liefertreueChina: metriken.liefertreueChina >= 95 ? 'gut' :
                      metriken.liefertreueChina >= 85 ? 'mittel' : 'schlecht',
    
    materialverfuegbarkeit: metriken.materialverfuegbarkeit >= 95 ? 'gut' :
                           metriken.materialverfuegbarkeit >= 85 ? 'mittel' : 'schlecht',
    
    auslastung: metriken.auslastung >= 90 ? 'gut' :
                metriken.auslastung >= 75 ? 'mittel' : 'schlecht'
  }
}