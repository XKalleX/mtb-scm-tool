/**
 * ========================================
 * DATUM-KLASSIFIZIERUNG
 * ========================================
 * 
 * Utility-Funktionen zur Klassifizierung von Daten:
 * - Wochenenden (Samstag/Sonntag)
 * - Deutsche Feiertage (NRW)
 * - Chinesische Feiertage
 * 
 * Wird verwendet für farbliche Markierung in Tabellen
 */

import { Feiertag } from '@/types'
import { ladeChinaFeiertage } from './kalender'

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
 * Deutsche Feiertage für NRW 2027
 * Quelle: Spezifikation und Anforderung A3
 */
const FEIERTAGE_DEUTSCHLAND_2027: Feiertag[] = [
  {
    datum: new Date('2027-01-01'),
    name: 'Neujahr',
    typ: 'gesetzlich'
  },
  {
    datum: new Date('2027-04-02'),
    name: 'Karfreitag',
    typ: 'gesetzlich'
  },
  {
    datum: new Date('2027-04-05'),
    name: 'Ostermontag',
    typ: 'gesetzlich'
  },
  {
    datum: new Date('2027-05-01'),
    name: 'Tag der Arbeit',
    typ: 'gesetzlich'
  },
  {
    datum: new Date('2027-05-13'),
    name: 'Christi Himmelfahrt',
    typ: 'gesetzlich'
  },
  {
    datum: new Date('2027-05-24'),
    name: 'Pfingstmontag',
    typ: 'gesetzlich'
  },
  {
    datum: new Date('2027-06-03'),
    name: 'Fronleichnam',
    typ: 'gesetzlich'
  },
  {
    datum: new Date('2027-10-03'),
    name: 'Tag der Deutschen Einheit',
    typ: 'gesetzlich'
  },
  {
    datum: new Date('2027-11-01'),
    name: 'Allerheiligen',
    typ: 'gesetzlich'
  },
  {
    datum: new Date('2027-12-25'),
    name: '1. Weihnachtstag',
    typ: 'gesetzlich'
  },
  {
    datum: new Date('2027-12-26'),
    name: '2. Weihnachtstag',
    typ: 'gesetzlich'
  }
]

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
  return FEIERTAGE_DEUTSCHLAND_2027.find(f => 
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
 * Exportiert deutsche Feiertage für externe Verwendung
 */
export function getDeutscheFeiertage(): Feiertag[] {
  return FEIERTAGE_DEUTSCHLAND_2027
}
