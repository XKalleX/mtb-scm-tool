/**
 * ========================================
 * DATUM-KLASSIFIZIERUNG
 * ========================================
 * 
 * Utility-Funktionen zur Klassifizierung von Daten für UI-Zwecke:
 * - Wochenenden (Samstag/Sonntag)
 * - Deutsche Feiertage (NRW)
 * - Chinesische Feiertage
 * 
 * Wird verwendet für farbliche Markierung in Tabellen
 * 
 * WICHTIG: Nutzt die zentrale kalender.ts für alle Feiertags-Logik (SINGLE SOURCE OF TRUTH)
 */

import { Feiertag } from '@/types'
import { isWeekend } from '@/lib/utils'
import { 
  ladeDeutschlandFeiertage, 
  ladeChinaFeiertage,
  FeiertagsKonfiguration
} from '@/lib/kalender'

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
 * Prüft ob ein Datum ein Wochenende ist (Samstag oder Sonntag)
 * @param date - Zu prüfendes Datum
 * @returns True wenn Wochenende
 */
export function istWochenende(date: Date): boolean {
  return isWeekend(date)
}

/**
 * Prüft ob ein Datum ein deutscher Feiertag ist
 * @param date - Zu prüfendes Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext
 * @returns Feiertag-Objekt oder undefined
 */
export function istDeutscherFeiertag(
  date: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): Feiertag | undefined {
  // Wenn custom Feiertage übergeben, diese verwenden
  if (customFeiertage) {
    const deutscheFeiertage = customFeiertage.filter(f => f.land === 'Deutschland')
    const gefunden = deutscheFeiertage.find(f => {
      const fDatum = new Date(f.datum)
      return fDatum.toDateString() === date.toDateString()
    })
    if (gefunden) {
      return {
        datum: new Date(gefunden.datum),
        name: gefunden.name,
        typ: gefunden.typ
      }
    }
    return undefined
  }
  
  // Fallback: Lade aus kalender.ts (JSON-Dateien)
  const feiertage = ladeDeutschlandFeiertage()
  return feiertage.find(f => f.datum.toDateString() === date.toDateString())
}

/**
 * Prüft ob ein Datum ein chinesischer Feiertag ist
 * @param date - Zu prüfendes Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext
 * @returns Feiertag-Objekt oder undefined
 */
export function istChinesischerFeiertag(
  date: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): Feiertag | undefined {
  // Wenn custom Feiertage übergeben, diese verwenden
  if (customFeiertage) {
    const chinaFeiertage = customFeiertage.filter(f => f.land === 'China')
    const gefunden = chinaFeiertage.find(f => {
      const fDatum = new Date(f.datum)
      return fDatum.toDateString() === date.toDateString()
    })
    if (gefunden) {
      return {
        datum: new Date(gefunden.datum),
        name: gefunden.name,
        typ: gefunden.typ
      }
    }
    return undefined
  }
  
  // Fallback: Lade aus kalender.ts (JSON-Dateien)
  const feiertage = ladeChinaFeiertage()
  return feiertage.find(f => f.datum.toDateString() === date.toDateString())
}

/**
 * Klassifiziert ein Datum vollständig
 * @param date - Zu klassifizierendes Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext
 * @returns Vollständige Klassifizierung
 */
export function klassifiziereDatum(
  date: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): DateClassification {
  const germanHoliday = istDeutscherFeiertag(date, customFeiertage)
  const chineseHoliday = istChinesischerFeiertag(date, customFeiertage)
  
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
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext
 * @returns Tailwind CSS Klassen für Hintergrund
 */
export function getDateRowBackgroundClasses(
  date: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): string {
  const classification = klassifiziereDatum(date, customFeiertage)
  
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
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext
 * @returns Tooltip-Text
 */
export function getDateTooltip(
  date: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): string | undefined {
  const classification = klassifiziereDatum(date, customFeiertage)
  
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
 * Nutzt die zentrale Funktion aus kalender.ts
 * @returns Array von deutschen Feiertagen
 */
export function getDeutscheFeiertage(): Feiertag[] {
  return ladeDeutschlandFeiertage()
}

/**
 * Exportiert alle chinesischen Feiertage für externe Verwendung
 * Nutzt die zentrale Funktion aus kalender.ts
 * @returns Array von chinesischen Feiertagen
 */
export function getChinesischeFeiertage(): Feiertag[] {
  return ladeChinaFeiertage()
}
