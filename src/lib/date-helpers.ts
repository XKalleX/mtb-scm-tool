/**
 * ========================================
 * DATE HELPER FUNCTIONS
 * ========================================
 * 
 * Shared utility functions for date validation and parsing.
 * These functions are used across the codebase to ensure consistent
 * date handling and validation.
 * 
 * WICHTIG: Diese Funktionen sind NOT datenbezogen, sondern reine
 * Utility-Funktionen ohne hardcodierte Werte.
 */

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
 * @param fallback - Fallback-Datum bei ungültigem Input
 * @returns Gültiges Date-Objekt (garantiert)
 */
export function parseDateSafe(dateString: string, fallback: string): Date {
  const date = new Date(dateString)
  if (!isValidDate(date)) {
    console.warn(`Ungültiges Datum '${dateString}', verwende Fallback: ${fallback}`)
    
    // Validiere auch den Fallback - wenn auch der ungültig ist, nutze eine sichere Default
    const fallbackDate = new Date(fallback)
    if (!isValidDate(fallbackDate)) {
      console.error(`KRITISCH: Auch Fallback '${fallback}' ist ungültig! Nutze hardcoded default '2027-01-01'.`)
      return new Date('2027-01-01') // Sichere Minimal-Fallback wenn alles andere fehlschlägt
    }
    return fallbackDate
  }
  return date
}
