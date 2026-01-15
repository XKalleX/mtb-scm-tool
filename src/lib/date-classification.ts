/**
 * ========================================
 * DATUM-KLASSIFIZIERUNG
 * ========================================
 * 
 * Utility-Funktionen zur Klassifizierung von Daten:
 * - Wochenenden (Samstag/Sonntag)
 * - Deutsche Feiertage (NRW) - aus JSON geladen
 * - Chinesische Feiertage - aus JSON geladen
 * 
 * Wird verwendet für farbliche Markierung in Tabellen
 * 
 * WICHTIG: Feiertage werden aus den JSON-Dateien geladen:
 * - feiertage-deutschland.json
 * - feiertage-china.json
 */

import { Feiertag } from '@/types'
import feiertageDeutschlandData from '@/data/feiertage-deutschland.json'
import feiertageChinaData from '@/data/feiertage-china.json'

/**
 * Klassifizierung eines Datums
 */
export type DateClassification = {
  isWeekend: boolean
  isGermanHoliday: boolean
  isChineseHoliday: boolean
  germanHolidayName?: string
  chineseHolidayName?: string
}

/**
 * Lädt deutsche Feiertage aus JSON (beide Jahre 2026 + 2027)
 */
function ladeDeutscheFeiertage(): Feiertag[] {
  return [
    ...feiertageDeutschlandData.feiertage2026.map(f => ({
      ...f,
      datum: new Date(f.datum),
      typ: f.typ as 'gesetzlich'
    })),
    ...feiertageDeutschlandData.feiertage2027.map(f => ({
      ...f,
      datum: new Date(f.datum),
      typ: f.typ as 'gesetzlich'
    }))
  ]
}

/**
 * Lädt chinesische Feiertage aus JSON (beide Jahre 2026 + 2027)
 */
function ladeChinaFeiertage(): Feiertag[] {
  return [
    ...feiertageChinaData.feiertage2026.map(f => ({
      ...f,
      datum: new Date(f.datum),
      typ: f.typ as 'gesetzlich'
    })),
    ...feiertageChinaData.feiertage2027.map(f => ({
      ...f,
      datum: new Date(f.datum),
      typ: f.typ as 'gesetzlich'
    }))
  ]
}

/**
 * Prüft ob ein Datum ein Wochenende ist (Samstag oder Sonntag)
 * @param date - Zu prüfendes Datum
 * @returns True wenn Wochenende
 */
export function istWochenende(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // 0 = Sonntag, 6 = Samstag
}

/**
 * Prüft ob ein Datum ein deutscher Feiertag ist
 * @param date - Zu prüfendes Datum
 * @returns Feiertag-Objekt oder undefined
 */
export function istDeutscherFeiertag(date: Date): Feiertag | undefined {
  const feiertage = ladeDeutscheFeiertage()
  return feiertage.find(f => 
    f.datum.toDateString() === date.toDateString()
  )
}

/**
 * Prüft ob ein Datum ein chinesischer Feiertag ist
 * @param date - Zu prüfendes Datum
 * @returns Feiertag-Objekt oder undefined
 */
export function istChinesischerFeiertag(date: Date): Feiertag | undefined {
  const feiertage = ladeChinaFeiertage()
  return feiertage.find(f => 
    f.datum.toDateString() === date.toDateString()
  )
}

/**
 * Klassifiziert ein Datum vollständig
 * @param date - Zu klassifizierendes Datum
 * @returns Vollständige Klassifizierung
 */
export function klassifiziereDatum(date: Date): DateClassification {
  const germanHoliday = istDeutscherFeiertag(date)
  const chineseHoliday = istChinesischerFeiertag(date)
  
  return {
    isWeekend: istWochenende(date),
    isGermanHoliday: !!germanHoliday,
    isChineseHoliday: !!chineseHoliday,
    germanHolidayName: germanHoliday?.name,
    chineseHolidayName: chineseHoliday?.name
  }
}

/**
 * Gibt CSS-Klassen für die Hintergrundfarbe basierend auf Datum zurück
 * @param date - Datum
 * @returns Tailwind CSS Klassen für Hintergrund
 */
export function getDateRowBackgroundClasses(date: Date): string {
  const classification = klassifiziereDatum(date)
  
  // Priorität: Deutsche Feiertage > Chinesische Feiertage > Wochenende
  if (classification.isGermanHoliday) {
    return 'bg-blue-50 hover:bg-blue-100'
  }
  
  if (classification.isChineseHoliday) {
    return 'bg-orange-50 hover:bg-orange-100'
  }
  
  if (classification.isWeekend) {
    return 'bg-gray-100 hover:bg-gray-200'
  }
  
  return '' // Default: keine spezielle Färbung
}

/**
 * Gibt eine Tooltip-Beschreibung für ein Datum zurück
 * @param date - Datum
 * @returns Tooltip-Text
 */
export function getDateTooltip(date: Date): string | undefined {
  const classification = klassifiziereDatum(date)
  
  if (classification.isGermanHoliday) {
    return `Deutscher Feiertag: ${classification.germanHolidayName}`
  }
  
  if (classification.isChineseHoliday) {
    return `Chinesischer Feiertag: ${classification.chineseHolidayName}`
  }
  
  if (classification.isWeekend) {
    const day = date.getDay()
    return day === 0 ? 'Sonntag' : 'Samstag'
  }
  
  return undefined
}

/**
 * Exportiert alle deutschen Feiertage für externe Verwendung
 * @returns Array von deutschen Feiertagen (beide Jahre)
 */
export function getDeutscheFeiertage(): Feiertag[] {
  return ladeDeutscheFeiertage()
}

/**
 * Exportiert alle chinesischen Feiertage für externe Verwendung
 * @returns Array von chinesischen Feiertagen (beide Jahre)
 */
export function getChinesischeFeiertage(): Feiertag[] {
  return ladeChinaFeiertage()
}
