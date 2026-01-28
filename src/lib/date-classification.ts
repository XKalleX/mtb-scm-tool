/**
 * ========================================
 * DATUM-KLASSIFIZIERUNG (DYNAMISCH)
 * ========================================
 * 
 * Utility-Funktionen zur Klassifizierung von Daten:
 * - Wochenenden (Samstag/Sonntag)
 * - Deutsche Feiertage (NRW) - dynamisch generiert oder aus JSON
 * - Chinesische Feiertage - dynamisch generiert oder aus JSON
 * 
 * Wird verwendet für farbliche Markierung in Tabellen
 * 
 * WICHTIG: 
 * - Feiertage werden DYNAMISCH basierend auf Jahr geladen
 * - Unterstützt JSON-Daten (2026-2028) + dynamische Generierung
 * - Funktioniert mit BELIEBIGEN Jahren
 */

import { Feiertag } from '@/types'
import feiertageDeutschlandData from '@/data/feiertage-deutschland.json'
import feiertageChinaData from '@/data/feiertage-china.json'
import { generiereAlleFeiertage } from './holiday-generator'

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
 * Lädt deutsche Feiertage aus JSON oder generiert sie dynamisch
 * @param jahr - Jahr für das Feiertage geladen werden sollen
 */
function ladeDeutscheFeiertage(jahr: number): Feiertag[] {
  // Versuche JSON-Daten zu laden für bekannte Jahre
  const verfuegbareJahre: Record<number, any[]> = {
    2026: feiertageDeutschlandData.feiertage2026 || [],
    2027: feiertageDeutschlandData.feiertage2027 || [],
    2028: (feiertageDeutschlandData as any).feiertage2028 || []
  }
  
  const jsonData = verfuegbareJahre[jahr]
  
  if (jsonData && jsonData.length > 0) {
    // Nutze JSON-Daten
    return jsonData.map(f => ({
      ...f,
      datum: new Date(f.datum),
      typ: f.typ as 'gesetzlich'
    }))
  }
  
  // Fallback: Generiere dynamisch
  console.info(`Deutsche Feiertage für ${jahr} nicht in JSON vorhanden, generiere dynamisch`)
  const generiert = generiereAlleFeiertage(jahr).filter(f => f.land === 'Deutschland')
  return generiert.map(f => ({
    ...f,
    datum: new Date(f.datum),
    typ: f.typ as 'gesetzlich'
  }))
}

/**
 * Lädt chinesische Feiertage aus JSON oder generiert sie dynamisch
 * @param jahr - Jahr für das Feiertage geladen werden sollen
 */
function ladeChinaFeiertage(jahr: number): Feiertag[] {
  // Versuche JSON-Daten zu laden für bekannte Jahre
  const verfuegbareJahre: Record<number, any[]> = {
    2026: feiertageChinaData.feiertage2026 || [],
    2027: feiertageChinaData.feiertage2027 || [],
    2028: (feiertageChinaData as any).feiertage2028 || []
  }
  
  const jsonData = verfuegbareJahre[jahr]
  
  if (jsonData && jsonData.length > 0) {
    // Nutze JSON-Daten
    return jsonData.map(f => ({
      ...f,
      datum: new Date(f.datum),
      typ: f.typ as 'gesetzlich'
    }))
  }
  
  // Fallback: Generiere dynamisch
  console.info(`Chinesische Feiertage für ${jahr} nicht in JSON vorhanden, generiere dynamisch`)
  const generiert = generiereAlleFeiertage(jahr).filter(f => f.land === 'China')
  return generiert.map(f => ({
    ...f,
    datum: new Date(f.datum),
    typ: f.typ as 'gesetzlich'
  }))
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
  const jahr = date.getFullYear()
  const feiertage = ladeDeutscheFeiertage(jahr)
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
  const jahr = date.getFullYear()
  const feiertage = ladeChinaFeiertage(jahr)
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
 * @param jahr - Jahr (optional, lädt alle verfügbaren Jahre wenn nicht angegeben)
 * @returns Array von deutschen Feiertagen
 */
export function getDeutscheFeiertage(jahr?: number): Feiertag[] {
  if (jahr) {
    return ladeDeutscheFeiertage(jahr)
  }
  
  // Lade für 3 Jahre (2026-2028 falls verfügbar, sonst generiert)
  const jahre = [2026, 2027, 2028]
  const alleFeiertage: Feiertag[] = []
  
  for (const j of jahre) {
    alleFeiertage.push(...ladeDeutscheFeiertage(j))
  }
  
  return alleFeiertage
}

/**
 * Exportiert alle chinesischen Feiertage für externe Verwendung
 * @param jahr - Jahr (optional, lädt alle verfügbaren Jahre wenn nicht angegeben)
 * @returns Array von chinesischen Feiertagen
 */
export function getChinesischeFeiertage(jahr?: number): Feiertag[] {
  if (jahr) {
    return ladeChinaFeiertage(jahr)
  }
  
  // Lade für 3 Jahre (2026-2028 falls verfügbar, sonst generiert)
  const jahre = [2026, 2027, 2028]
  const alleFeiertage: Feiertag[] = []
  
  for (const j of jahre) {
    alleFeiertage.push(...ladeChinaFeiertage(j))
  }
  
  return alleFeiertage
}
