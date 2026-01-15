/**
 * ========================================
 * GLOBALE KONSTANTEN - MTB SCM SYSTEM
 * ========================================
 * 
 * Single Source of Truth für systemweite Konstanten
 */

/**
 * Standard 'Heute'-Datum für Frozen Zone Konzept
 * Verwendet wenn keine Konfiguration vorhanden oder ungültig
 * 
 * Datum: 15. April 2027 (Mitte der Saison, nach Peak im April)
 */
export const DEFAULT_HEUTE_DATUM = '2027-04-15'

/**
 * Planungsjahr für das gesamte System
 */
export const PLANUNGSJAHR = 2027

/**
 * Jahresproduktion - Standard-Wert
 */
export const DEFAULT_JAHRESPRODUKTION = 370_000

/**
 * localStorage-Key für Konfigurationsdaten
 */
export const KONFIGURATION_STORAGE_KEY = 'mtb-konfiguration'

/**
 * Validiert ob ein Date-Objekt gültig ist
 * @param date - Zu prüfendes Date-Objekt
 * @returns True wenn gültig, false bei Invalid Date
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Parst einen Datums-String und gibt ein garantiert gültiges Date zurück
 * @param dateString - ISO Format YYYY-MM-DD
 * @param fallback - Fallback-Datum bei ungültigem Input (default: DEFAULT_HEUTE_DATUM)
 * @returns Gültiges Date-Objekt (garantiert)
 */
export function parseDateSafe(dateString: string, fallback: string = DEFAULT_HEUTE_DATUM): Date {
  const date = new Date(dateString)
  if (!isValidDate(date)) {
    console.warn(`Ungültiges Datum '${dateString}', verwende Fallback: ${fallback}`)
    
    // Validiere auch den Fallback - wenn auch der ungültig ist, nutze hardcoded default
    const fallbackDate = new Date(fallback)
    if (!isValidDate(fallbackDate)) {
      console.error(`KRITISCH: Auch Fallback '${fallback}' ist ungültig! Nutze hardcoded DEFAULT_HEUTE_DATUM.`)
      return new Date(DEFAULT_HEUTE_DATUM) // Hardcoded constant ist garantiert gültig
    }
    return fallbackDate
  }
  return date
}
