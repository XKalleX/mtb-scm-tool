/**
 * ========================================
 * GLOBALE KONSTANTEN - MTB SCM SYSTEM
 * ========================================
 * 
 * Single Source of Truth für systemweite Konstanten
 */

/**
 * Standard-Planungsjahr für das System
 * Kann über KonfigurationContext überschrieben werden
 * 
 * DYNAMISCH: Wird als Default verwendet, System funktioniert mit jedem Jahr
 */
export const DEFAULT_PLANUNGSJAHR = 2027

/**
 * Standard 'Heute'-Datum für Frozen Zone Konzept
 * Verwendet wenn keine Konfiguration vorhanden oder ungültig
 * 
 * DYNAMISCH: Wird basierend auf Planungsjahr angepasst
 * Datum: 15. April (Mitte der Saison, nach Peak im April)
 */
export const DEFAULT_HEUTE_DATUM_RELATIV = '04-15'  // Monat-Tag ohne Jahr

/**
 * Generiert Standard-'Heute'-Datum für ein gegebenes Planungsjahr
 * @param jahr - Planungsjahr
 * @returns ISO-Datum-String (YYYY-MM-DD)
 */
export function getDefaultHeuteDatum(jahr: number = DEFAULT_PLANUNGSJAHR): string {
  return `${jahr}-${DEFAULT_HEUTE_DATUM_RELATIV}`
}

/**
 * @deprecated Nutze getDefaultHeuteDatum() für dynamisches Datum
 * Legacy-Konstante für Rückwärtskompatibilität
 */
export const DEFAULT_HEUTE_DATUM = getDefaultHeuteDatum(DEFAULT_PLANUNGSJAHR)

/**
 * @deprecated Nutze DEFAULT_PLANUNGSJAHR
 * Legacy-Export für Rückwärtskompatibilität
 */
export const PLANUNGSJAHR = DEFAULT_PLANUNGSJAHR

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
