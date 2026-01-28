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
 * 1. RELIABILITY (Zuverlässigkeit) - 3 Metriken
 * 2. RESPONSIVENESS (Reaktionsfähigkeit) - 3 Metriken
 * 3. AGILITY (Flexibilität) - 2 Metriken
 * 4. ASSETS (Anlagenverwaltung - KEINE KOSTEN!) - 2 Metriken
 * 
 * GESAMT: 10 Metriken (> 5 gefordert) ✓
 */

import { SCORMetriken, Produktionsauftrag, Lagerbestand, Bestellung } from '@/types'
import { daysBetween } from '@/lib/utils'

// Standard Vorlaufzeit (sollte aus KonfigurationContext kommen)
const DEFAULT_VORLAUFZEIT_TAGE = 49

/**
 * Berechnet alle SCOR-Metriken
 * 
 * @param produktionsauftraege - Alle Produktionsaufträge
 * @param lagerbestaende - Lagerbestände
 * @param bestellungen - Bestellungen
 * @param vorlaufzeitTage - Vorlaufzeit in Tagen (default: 49 Tage aus DEFAULT_VORLAUFZEIT_TAGE)
 * @returns SCOR-Metriken
 */
export function berechneSCORMetriken(
  produktionsauftraege: Produktionsauftrag[],
  lagerbestaende: Record<string, Lagerbestand>,
  bestellungen: Bestellung[],
  vorlaufzeitTage: number = DEFAULT_VORLAUFZEIT_TAGE
): SCORMetriken {
  // ==========================================
  // RELIABILITY (Zuverlässigkeit)
  // ==========================================
  
  const vollstaendigeAuftraege = produktionsauftraege.filter(
    a => a.tatsaechlicheMenge === a.geplanteMenge
  ).length
  
  const planerfuellungsgrad = produktionsauftraege.length > 0
    ? (vollstaendigeAuftraege / produktionsauftraege.length) * 100
    : 100
  
  const puenktlicheBestellungen = bestellungen.filter(b => {
    if (!b.tatsaechlicheAnkunft) return true
    return b.tatsaechlicheAnkunft <= b.erwarteteAnkunft
  }).length
  
  const liefertreueChina = bestellungen.length > 0
    ? (puenktlicheBestellungen / bestellungen.length) * 100
    : 100
  
  // NEU: Delivery Performance - Lieferungen innerhalb Vorlaufzeit
  const TOLERANZ_TAGE = 2 // +2 Tage Toleranz
  const lieferungenInVorlaufzeit = bestellungen.filter(b => {
    if (!b.tatsaechlicheAnkunft) return true
    const tatsaechlicheDauer = daysBetween(b.bestelldatum, b.tatsaechlicheAnkunft)
    return tatsaechlicheDauer <= vorlaufzeitTage + TOLERANZ_TAGE
  }).length
  
  const deliveryPerformance = bestellungen.length > 0
    ? (lieferungenInVorlaufzeit / bestellungen.length) * 100
    : 100
  
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
  
  // NEU: Forecast Accuracy - Planungsgenauigkeit
  const gesamtAbweichung = produktionsauftraege.reduce(
    (sum, a) => sum + Math.abs(a.tatsaechlicheMenge - a.geplanteMenge), 
    0
  )
  const gesamtPlan = produktionsauftraege.reduce((sum, a) => sum + a.geplanteMenge, 0)
  const forecastAccuracy = gesamtPlan > 0
    ? Math.max(0, 100 - (gesamtAbweichung / gesamtPlan) * 100)
    : 100
  
  // ==========================================
  // AGILITY (Flexibilität)
  // ==========================================
  
  // Produktionsflexibilität: Wie oft wurde volle Menge produziert
  const produktionsflexibilitaet = planerfuellungsgrad
  
  // Materialverfügbarkeit: Wie oft war Material da
  const materialVerfuegbarTage = produktionsauftraege.filter(
    a => !a.materialmangel || a.materialmangel.length === 0
  ).length
  
  const materialverfuegbarkeit = produktionsauftraege.length > 0
    ? (materialVerfuegbarTage / produktionsauftraege.length) * 100
    : 100
  
  // ==========================================
  // ASSETS (Anlagenverwaltung - KEINE KOSTEN!)
  // ==========================================
  
  const durchschnittProTag = produktionsauftraege.length > 0
    ? jahresproduktion / produktionsauftraege.length
    : 0
  
  // Lagerreichweite in Tagen
  const lagerreichweite = durchschnittProTag > 0
    ? lagerbestandswert / durchschnittProTag
    : 0
  
  // Kapitalbindung = Lagerreichweite (in Tagen, KEINE €-Werte!)
  const kapitalbindung = lagerreichweite
  
  // ==========================================
  // PRODUKTIONS-KPIs
  // ==========================================
  
  const gesamtproduktion = jahresproduktion
  const produktionstage = produktionsauftraege.filter(a => a.tatsaechlicheMenge > 0).length
  const auslastung = planerfuellungsgrad
  
  return {
    // RELIABILITY (3 Metriken)
    planerfuellungsgrad,
    liefertreueChina,
    deliveryPerformance,
    
    // RESPONSIVENESS (3 Metriken)
    durchlaufzeitProduktion,
    lagerumschlag,
    forecastAccuracy,
    
    // AGILITY (2 Metriken)
    produktionsflexibilitaet,
    materialverfuegbarkeit,
    
    // ASSETS (2 Metriken - KEINE KOSTEN!)
    lagerreichweite,
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
    
    deliveryPerformance: metriken.deliveryPerformance >= 90 ? 'gut' :
                         metriken.deliveryPerformance >= 80 ? 'mittel' : 'schlecht',
    
    forecastAccuracy: metriken.forecastAccuracy >= 95 ? 'gut' :
                      metriken.forecastAccuracy >= 90 ? 'mittel' : 'schlecht',
    
    materialverfuegbarkeit: metriken.materialverfuegbarkeit >= 95 ? 'gut' :
                           metriken.materialverfuegbarkeit >= 85 ? 'mittel' : 'schlecht',
    
    auslastung: metriken.auslastung >= 90 ? 'gut' :
                metriken.auslastung >= 75 ? 'mittel' : 'schlecht'
  }
}