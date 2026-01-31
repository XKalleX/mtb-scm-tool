/**
 * ========================================
 * KALENDER-MANAGEMENT (NUR CHINA)
 * ========================================
 * 
 * Verwaltet den Jahreskalender 2027 mit:
 * - Wochenenden
 * - Chinesische Feiertage (einziger Lieferant!)
 * - Arbeitstagen vs. Kalendertagen
 * - Vorlaufzeiten-Berechnungen
 * - 'Heute'-Datum für Frozen Zone Konzept
 * 
 * WICHTIG: 
 * - Transport nutzt Kalendertage (24/7, Schiff fährt immer)
 * - Produktion nutzt Arbeitstage (Mo-Fr ohne Feiertage)
 * - Feiertage werden aus JSON-Dateien geladen, können aber durch 
 *   benutzerdefinierte Feiertage aus KonfigurationContext überschrieben werden
 * - 'Heute'-Datum wird aus globaler Konfiguration gelesen
 */

import { Kalendertag, Feiertag } from '@/types'
import { addDays, isWeekend, getDayOfYear, getWeekNumber, toLocalISODateString, daysBetween } from './utils'
import feiertagsData from '@/data/feiertage-china.json'
import feiertagsDeutschlandData from '@/data/feiertage-deutschland.json'
import lieferantChinaData from '@/data/lieferant-china.json'
import stammdatenData from '@/data/stammdaten.json'
import { isValidDate, parseDateSafe } from './date-helpers'

/**
 * Konstanten aus JSON-Dateien (SINGLE SOURCE OF TRUTH)
 */
const DEFAULT_HEUTE_DATUM = stammdatenData.projekt.heuteDatum // '2027-04-15' aus JSON
const KONFIGURATION_STORAGE_KEY = 'mtb-konfiguration' // localStorage-Key (kein Datenwert)

/**
 * Interface für Lieferant-Vorlaufzeiten-Konfiguration
 * Ermöglicht es, konfigurierbare Vorlaufzeiten zu übergeben (aus KonfigurationContext)
 * Falls nicht übergeben, werden die Standardwerte aus lieferant-china.json verwendet
 */
export interface LieferantVorlaufzeitKonfiguration {
  vorlaufzeitKalendertage: number      // Seefracht: 30 KT (Shanghai → Hamburg, 24/7)
  vorlaufzeitArbeitstage: number       // Produktion: 5 AT
  lkwTransportChinaArbeitstage: number // LKW China → Hafen: 2 AT
  lkwTransportDeutschlandArbeitstage: number // LKW Hamburg → Dortmund: 2 AT
}

/**
 * Standard-Vorlaufzeiten aus lieferant-china.json (SINGLE SOURCE OF TRUTH)
 * Diese Werte werden verwendet, wenn keine custom Konfiguration übergeben wird
 */
export const STANDARD_VORLAUFZEITEN: LieferantVorlaufzeitKonfiguration = {
  vorlaufzeitKalendertage: lieferantChinaData.lieferant.vorlaufzeitKalendertage,
  vorlaufzeitArbeitstage: lieferantChinaData.lieferant.vorlaufzeitArbeitstage,
  lkwTransportChinaArbeitstage: lieferantChinaData.lieferant.lkwTransportChinaArbeitstage,
  lkwTransportDeutschlandArbeitstage: lieferantChinaData.lieferant.lkwTransportDeutschlandArbeitstage
}

/**
 * Interface für Feiertags-Konfiguration (aus KonfigurationContext)
 * Ermöglicht es, benutzerdefinierte Feiertage zu übergeben
 */
export interface FeiertagsKonfiguration {
  datum: string  // Format YYYY-MM-DD
  name: string
  typ: 'gesetzlich' | 'regional' | 'betrieblich' | 'Festival'
  land: 'Deutschland' | 'China'
}

/**
 * Liest das 'Heute'-Datum aus der globalen Konfiguration
 * Fallback: DEFAULT_HEUTE_DATUM aus stammdaten.json falls nicht gesetzt oder ungültig
 * @returns Date-Objekt des 'Heute'-Datums (garantiert gültig)
 */
export function getHeuteDatum(): Date {
  if (typeof window === 'undefined') {
    // Server-Side: Standard-Datum aus JSON
    return new Date(DEFAULT_HEUTE_DATUM)
  }
  
  try {
    const konfigString = localStorage.getItem(KONFIGURATION_STORAGE_KEY)
    if (konfigString) {
      const konfiguration = JSON.parse(konfigString)
      if (konfiguration.heuteDatum) {
        // Verwendet shared utility für sichere Datums-Validierung
        return parseDateSafe(konfiguration.heuteDatum, DEFAULT_HEUTE_DATUM)
      }
    }
  } catch (error) {
    console.warn('Fehler beim Laden des Heute-Datums aus Konfiguration:', error)
  }
  
  // Fallback: Standard-Datum aus JSON
  return new Date(DEFAULT_HEUTE_DATUM)
}

/**
 * Lädt alle deutschen Feiertage für drei Jahre (2026, 2027, 2028)
 * Wichtig für Vorlaufzeit-Berechnungen (49 Tage können bis 2026 zurückreichen,
 * und bis Februar 2028 hineinreichen)
 * @returns Array von Feiertagen
 */
export function ladeDeutschlandFeiertage(): Feiertag[] {
  const feiertage2028 = (feiertagsDeutschlandData as any).feiertage2028 || []
  return [
    ...feiertagsDeutschlandData.feiertage2026.map(f => ({
      ...f,
      datum: new Date(f.datum),
      typ: f.typ as 'gesetzlich' | 'regional' | 'betrieblich'
    })),
    ...feiertagsDeutschlandData.feiertage2027.map(f => ({
      ...f,
      datum: new Date(f.datum),
      typ: f.typ as 'gesetzlich' | 'regional' | 'betrieblich'
    })),
    ...feiertage2028.map((f: any) => ({
      ...f,
      datum: new Date(f.datum),
      typ: f.typ as 'gesetzlich' | 'regional' | 'betrieblich'
    }))
  ]
}

/**
 * Lädt alle chinesischen Feiertage für drei Jahre (2026, 2027, 2028)
 * Wichtig für Vorlaufzeit-Berechnungen (49 Tage können bis 2026 zurückreichen,
 * und bis Februar 2028 hineinreichen)
 * @returns Array von Feiertagen
 */
export function ladeChinaFeiertage(): Feiertag[] {
  const feiertage2028 = (feiertagsData as any).feiertage2028 || []
  return [
    ...feiertagsData.feiertage2026.map(f => ({
      ...f,
      datum: new Date(f.datum),
      typ: f.typ as 'gesetzlich' | 'regional' | 'betrieblich'
    })),
    ...feiertagsData.feiertage2027.map(f => ({
      ...f,
      datum: new Date(f.datum),
      typ: f.typ as 'gesetzlich' | 'regional' | 'betrieblich'
    })),
    ...feiertage2028.map((f: any) => ({
      ...f,
      datum: new Date(f.datum),
      typ: f.typ as 'gesetzlich' | 'regional' | 'betrieblich'
    }))
  ]
}

/**
 * Prüft ob ein Datum ein deutscher Feiertag ist
 * @param datum - Zu prüfendes Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext.
 *                          Wenn angegeben, werden diese statt der JSON-Feiertage verwendet.
 * @returns Array von Feiertagen an diesem Tag (leer wenn kein Feiertag)
 */
export function istDeutschlandFeiertag(
  datum: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): Feiertag[] {
  // Wenn benutzerdefinierte Feiertage übergeben wurden, nutze diese
  if (customFeiertage) {
    const datumStr = toLocalISODateString(datum)
    const deutscheFeiertage = customFeiertage.filter(f => f.land === 'Deutschland')
    const gefunden = deutscheFeiertage.filter(f => f.datum === datumStr)
    return gefunden.map(f => ({
      datum: new Date(f.datum),
      name: f.name,
      typ: f.typ
    }))
  }
  
  // Fallback: Lade aus JSON-Dateien
  const alleFeiertage = ladeDeutschlandFeiertage()
  
  return alleFeiertage.filter(f => 
    f.datum.toDateString() === datum.toDateString()
  )
}

/**
 * Prüft ob ein Datum ein chinesischer Feiertag ist
 * @param datum - Zu prüfendes Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext.
 *                          Wenn angegeben, werden diese statt der JSON-Feiertage verwendet.
 * @returns Array von Feiertagen an diesem Tag (leer wenn kein Feiertag)
 */
export function istChinaFeiertag(
  datum: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): Feiertag[] {
  // Wenn benutzerdefinierte Feiertage übergeben wurden, nutze diese
  if (customFeiertage) {
    const datumStr = toLocalISODateString(datum)
    const chinaFeiertage = customFeiertage.filter(f => f.land === 'China')
    const gefunden = chinaFeiertage.filter(f => f.datum === datumStr)
    return gefunden.map(f => ({
      datum: new Date(f.datum),
      name: f.name,
      typ: f.typ
    }))
  }
  
  // Fallback: Lade aus JSON-Dateien
  const alleFeiertage = ladeChinaFeiertage()
  
  return alleFeiertage.filter(f => 
    f.datum.toDateString() === datum.toDateString()
  )
}

/**
 * Prüft ob ein Datum ein Feiertag ist (Deutschland ODER China)
 * Bestellungen können nicht an Feiertagen (DE oder CN) platziert werden
 * @param datum - Zu prüfendes Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext
 * @returns True wenn Feiertag (entweder DE oder CN)
 */
export function istFeiertag(
  datum: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): boolean {
  return istDeutschlandFeiertag(datum, customFeiertage).length > 0 || 
         istChinaFeiertag(datum, customFeiertage).length > 0
}

/**
 * Prüft ob ein Datum ein Arbeitstag in DEUTSCHLAND ist (Mo-Fr, kein deutscher Feiertag)
 * 
 * WICHTIG: Für OEM-Produktion in Deutschland (Dortmund)
 * Prüft DEUTSCHE Feiertage (NRW), nicht chinesische!
 * 
 * @param datum - Zu prüfendes Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext
 * @returns True wenn Arbeitstag in Deutschland
 */
export function istArbeitstag_Deutschland(
  datum: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): boolean {
  // Wochenende?
  if (isWeekend(datum)) {
    return false
  }
  
  // Deutscher Feiertag?
  const feiertage = istDeutschlandFeiertag(datum, customFeiertage)
  if (feiertage.length > 0) {
    return false
  }
  
  return true
}

/**
 * Prüft ob ein Datum ein Arbeitstag in CHINA ist (Mo-Fr, kein chinesischer Feiertag)
 * 
 * WICHTIG: Für China-Zulieferer (Produktion, Bestellungen)
 * Prüft CHINESISCHE Feiertage, nicht deutsche!
 * 
 * @param datum - Zu prüfendes Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext
 * @returns True wenn Arbeitstag in China
 */
export function istArbeitstag_China(
  datum: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): boolean {
  // Wochenende?
  if (isWeekend(datum)) {
    return false
  }
  
  // Chinesischer Feiertag?
  const feiertage = istChinaFeiertag(datum, customFeiertage)
  if (feiertage.length > 0) {
    return false
  }
  
  return true
}

/**
 * Prüft ob ein Datum ein Arbeitstag ist (Mo-Fr, kein Feiertag)
 * Prüft CHINESISCHE Feiertage (für China-Produktion)
 * 
 * @param datum - Zu prüfendes Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns True wenn Arbeitstag (China)
 */
export function istArbeitstag(
  datum: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): boolean {
  return istArbeitstag_China(datum, customFeiertage)
}

/**
 * Prüft ob Datum im Spring Festival liegt (28.01.-04.02.2027)
 * Gemäß lieferant-china.json: 8 Tage kompletter Produktionsstopp in China!
 * 
 * Hinweis: Die einzelnen Feiertags-Einträge in feiertage-china.json (05.-11.02.)
 * repräsentieren die gesetzlichen Feiertage, während diese Funktion die 
 * Produktionsstop-Periode aus lieferant-china.json nutzt.
 * 
 * @param datum - Zu prüfendes Datum
 * @returns True wenn Spring Festival Produktionsstopp
 */
export function istSpringFestival(datum: Date): boolean {
  // Spring Festival 2027 Produktionsstopp gemäß lieferant-china.json: 28.01. - 04.02.2027
  const springStart = new Date(2027, 0, 28) // 28. Januar
  const springEnd = new Date(2027, 1, 4)    // 4. Februar
  
  return datum >= springStart && datum <= springEnd
}

/**
 * Generiert einen vollständigen Jahreskalender für 2027
 * @param jahr - Das Jahr für den Kalender (default: 2027)
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext
 * @returns Array von Kalendertagen (365 Tage)
 */
export function generiereJahreskalender(
  jahr: number = 2027,
  customFeiertage?: FeiertagsKonfiguration[]
): Kalendertag[] {
  const kalender: Kalendertag[] = []
  const startDatum = new Date(jahr, 0, 1) // 1. Januar
  
  // Alle 365 Tage des Jahres
  for (let i = 0; i < 365; i++) {
    const datum = addDays(startDatum, i)
    
    kalender.push({
      datum,
      tag: getDayOfYear(datum),
      wochentag: datum.getDay(),
      kalenderwoche: getWeekNumber(datum),
      monat: datum.getMonth() + 1,
      istArbeitstag: istArbeitstag(datum, customFeiertage),
      feiertage: istChinaFeiertag(datum, customFeiertage)
    })
  }
  
  return kalender
}

/**
 * Berechnet Arbeitstage zwischen zwei Daten (für China)
 * @param von - Start-Datum
 * @param bis - End-Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Anzahl Arbeitstage (China)
 */
export function berechneArbeitstage(
  von: Date, 
  bis: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): number {
  let arbeitstage = 0
  let aktuell = new Date(von)
  
  while (aktuell <= bis) {
    if (istArbeitstag_China(aktuell, customFeiertage)) {
      arbeitstage++
    }
    aktuell = addDays(aktuell, 1)
  }
  
  return arbeitstage
}

/**
 * Berechnet Arbeitstage zwischen zwei Daten (für Deutschland)
 * @param von - Start-Datum
 * @param bis - End-Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Anzahl Arbeitstage (Deutschland)
 */
export function berechneArbeitstage_Deutschland(
  von: Date, 
  bis: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): number {
  let arbeitstage = 0
  let aktuell = new Date(von)
  
  while (aktuell <= bis) {
    if (istArbeitstag_Deutschland(aktuell, customFeiertage)) {
      arbeitstage++
    }
    aktuell = addDays(aktuell, 1)
  }
  
  return arbeitstage
}

/**
 * Findet den nächsten Arbeitstag ab einem Datum (China)
 * @param datum - Start-Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Nächster Arbeitstag (China)
 */
export function naechsterArbeitstag(
  datum: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): Date {
  let aktuell = new Date(datum)
  
  // Maximal 14 Tage vorwärts suchen (Sicherheit)
  for (let i = 0; i < 14; i++) {
    if (istArbeitstag_China(aktuell, customFeiertage)) {
      return aktuell
    }
    aktuell = addDays(aktuell, 1)
  }
  
  // Fallback: Original-Datum
  return datum
}

/**
 * Findet den nächsten Arbeitstag ab einem Datum (Deutschland)
 * @param datum - Start-Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Nächster Arbeitstag (Deutschland)
 */
export function naechsterArbeitstag_Deutschland(
  datum: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): Date {
  let aktuell = new Date(datum)
  
  // Maximal 14 Tage vorwärts suchen (Sicherheit)
  for (let i = 0; i < 14; i++) {
    if (istArbeitstag_Deutschland(aktuell, customFeiertage)) {
      return aktuell
    }
    aktuell = addDays(aktuell, 1)
  }
  
  // Fallback: Original-Datum
  return datum
}

/**
 * Berechnet das Datum X Arbeitstage in der Zukunft (China)
 * @param startDatum - Start-Datum
 * @param arbeitstage - Anzahl Arbeitstage
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Ziel-Datum
 */
export function addArbeitstage(
  startDatum: Date, 
  arbeitstage: number,
  customFeiertage?: FeiertagsKonfiguration[]
): Date {
  let aktuell = new Date(startDatum)
  let verbleibendeArbeitstage = arbeitstage
  
  // Maximal 365 Tage durchsuchen (Sicherheit)
  for (let i = 0; i < 365 && verbleibendeArbeitstage > 0; i++) {
    aktuell = addDays(aktuell, 1)
    
    if (istArbeitstag_China(aktuell, customFeiertage)) {
      verbleibendeArbeitstage--
    }
  }
  
  return aktuell
}

/**
 * Berechnet das Datum X Arbeitstage in der Zukunft (Deutschland)
 * @param startDatum - Start-Datum
 * @param arbeitstage - Anzahl Arbeitstage
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Ziel-Datum
 */
export function addArbeitstage_Deutschland(
  startDatum: Date, 
  arbeitstage: number,
  customFeiertage?: FeiertagsKonfiguration[]
): Date {
  let aktuell = new Date(startDatum)
  let verbleibendeArbeitstage = arbeitstage
  
  // Maximal 365 Tage durchsuchen (Sicherheit)
  for (let i = 0; i < 365 && verbleibendeArbeitstage > 0; i++) {
    aktuell = addDays(aktuell, 1)
    
    if (istArbeitstag_Deutschland(aktuell, customFeiertage)) {
      verbleibendeArbeitstage--
    }
  }
  
  return aktuell
}

/**
 * Berechnet das Datum X Arbeitstage in der Vergangenheit (China)
 * @param zielDatum - Ziel-Datum
 * @param arbeitstage - Anzahl Arbeitstage
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Start-Datum
 */
export function subtractArbeitstage(
  zielDatum: Date, 
  arbeitstage: number,
  customFeiertage?: FeiertagsKonfiguration[]
): Date {
  let aktuell = new Date(zielDatum)
  let verbleibendeArbeitstage = arbeitstage
  
  // Maximal 365 Tage zurück durchsuchen (Sicherheit)
  for (let i = 0; i < 365 && verbleibendeArbeitstage > 0; i++) {
    aktuell = addDays(aktuell, -1)
    
    if (istArbeitstag_China(aktuell, customFeiertage)) {
      verbleibendeArbeitstage--
    }
  }
  
  return aktuell
}

/**
 * Berechnet das Datum X Arbeitstage in der Vergangenheit (Deutschland)
 * @param zielDatum - Ziel-Datum
 * @param arbeitstage - Anzahl Arbeitstage
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Start-Datum
 */
export function subtractArbeitstage_Deutschland(
  zielDatum: Date, 
  arbeitstage: number,
  customFeiertage?: FeiertagsKonfiguration[]
): Date {
  let aktuell = new Date(zielDatum)
  let verbleibendeArbeitstage = arbeitstage
  
  // Maximal 365 Tage zurück durchsuchen (Sicherheit)
  for (let i = 0; i < 365 && verbleibendeArbeitstage > 0; i++) {
    aktuell = addDays(aktuell, -1)
    
    if (istArbeitstag_Deutschland(aktuell, customFeiertage)) {
      verbleibendeArbeitstage--
    }
  }
  
  return aktuell
}

/**
 * Berechnet Bestelldatum rückwärts vom Bedarfsdatum
 * 
 * Vorlaufzeiten werden aus der Konfiguration geladen (SINGLE SOURCE OF TRUTH: lieferant-china.json)
 * - Seefracht: 30 KT (Shanghai → Hamburg, 24/7)
 * - Produktion: 5 AT (Mo-Fr ohne Feiertage)
 * - LKW China → Hafen: 2 AT
 * - LKW Hamburg → Dortmund: 2 AT
 * 
 * @param bedarfsdatum - Wann Material in Deutschland benötigt wird
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @param lieferantKonfiguration - Optionale Vorlaufzeiten-Konfiguration (aus KonfigurationContext)
 * @returns Bestelldatum bei China
 */
export function berechneBestelldatum(
  bedarfsdatum: Date,
  customFeiertage?: FeiertagsKonfiguration[],
  lieferantKonfiguration?: LieferantVorlaufzeitKonfiguration
): Date {
  // Vorlaufzeiten aus Konfiguration oder Standard-Werte aus JSON (SSOT)
  const vorlaufzeiten = lieferantKonfiguration || STANDARD_VORLAUFZEITEN
  
  // Schritt 1: Vom Bedarfsdatum die Seefracht-Zeit (Kalendertage) abziehen
  // Transport läuft 24/7, also einfach Kalendertage subtrahieren
  let datumNachSeefracht = addDays(bedarfsdatum, -vorlaufzeiten.vorlaufzeitKalendertage)
  
  // Schritt 2: LKW-Transport Deutschland abziehen
  datumNachSeefracht = subtractArbeitstage(datumNachSeefracht, vorlaufzeiten.lkwTransportDeutschlandArbeitstage, customFeiertage)
  
  // Schritt 3: Bearbeitungszeit abziehen (berücksichtigt chinesische Feiertage)
  let nachProduktion = subtractArbeitstage(datumNachSeefracht, vorlaufzeiten.vorlaufzeitArbeitstage, customFeiertage)
  
  // Schritt 4: LKW-Transport China abziehen
  let bestelldatum = subtractArbeitstage(nachProduktion, vorlaufzeiten.lkwTransportChinaArbeitstage, customFeiertage)
  
  // Schritt 5: Einen zusätzlichen Tag Puffer (Best Practice)
  bestelldatum = addDays(bestelldatum, -1)
  
  // Schritt 6: Sicherstellen dass Bestelldatum ein Arbeitstag ist (China!)
  while (!istArbeitstag_China(bestelldatum, customFeiertage)) {
    bestelldatum = addDays(bestelldatum, -1)
  }
  
  return bestelldatum
}

/**
 * Berechnet Ankunftsdatum vorwärts vom Bestelldatum
 * 
 * Vorlaufzeiten werden aus der Konfiguration geladen (SINGLE SOURCE OF TRUTH: lieferant-china.json)
 * LKW-Transport in Deutschland nutzt DEUTSCHE Arbeitstage
 * 
 * @param bestelldatum - Wann wurde bestellt
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @param lieferantKonfiguration - Optionale Vorlaufzeiten-Konfiguration (aus KonfigurationContext)
 * @returns Ankunftsdatum in Deutschland (immer ein deutscher Arbeitstag)
 */
export function berechneAnkunftsdatum(
  bestelldatum: Date,
  customFeiertage?: FeiertagsKonfiguration[],
  lieferantKonfiguration?: LieferantVorlaufzeitKonfiguration
): Date {
  // Vorlaufzeiten aus Konfiguration oder Standard-Werte aus JSON (SSOT)
  const vorlaufzeiten = lieferantKonfiguration || STANDARD_VORLAUFZEITEN
  
  // Schritt 1: Bearbeitung in China - nutzt CHINESISCHE Arbeitstage
  let nachBearbeitung = addArbeitstage(bestelldatum, vorlaufzeiten.vorlaufzeitArbeitstage, customFeiertage)
  
  // Schritt 2: LKW-Transport China zum Hafen - nutzt CHINESISCHE Arbeitstage
  let nachLKWChina = addArbeitstage(nachBearbeitung, vorlaufzeiten.lkwTransportChinaArbeitstage, customFeiertage)
  
  // Schritt 3: Seefracht - Kalendertage (Schiff fährt 24/7)
  let nachSeefracht = addDays(nachLKWChina, vorlaufzeiten.vorlaufzeitKalendertage)
  
  // Schritt 4: LKW-Transport Hamburg nach Dortmund - nutzt DEUTSCHE Arbeitstage
  let ankunftsdatum = addArbeitstage_Deutschland(nachSeefracht, vorlaufzeiten.lkwTransportDeutschlandArbeitstage, customFeiertage)
  
  return ankunftsdatum
}

/**
 * Zählt Arbeitstage pro Monat im Jahr 2027 (China)
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Array mit 12 Zahlen (Arbeitstage pro Monat, China)
 */
export function zaehleArbeitstageProMonat(
  customFeiertage?: FeiertagsKonfiguration[]
): number[] {
  const kalender = generiereJahreskalender(2027, customFeiertage)
  const arbeitstageProMonat: number[] = Array(12).fill(0)
  
  kalender.forEach(tag => {
    if (istArbeitstag_China(tag.datum, customFeiertage)) {
      arbeitstageProMonat[tag.monat - 1]++
    }
  })
  
  return arbeitstageProMonat
}

/**
 * Zählt Arbeitstage pro Monat im Jahr 2027 (Deutschland)
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Array mit 12 Zahlen (Arbeitstage pro Monat, Deutschland)
 */
export function zaehleArbeitstageProMonat_Deutschland(
  customFeiertage?: FeiertagsKonfiguration[]
): number[] {
  const kalender = generiereJahreskalender(2027, customFeiertage)
  const arbeitstageProMonat: number[] = Array(12).fill(0)
  
  kalender.forEach(tag => {
    if (istArbeitstag_Deutschland(tag.datum, customFeiertage)) {
      arbeitstageProMonat[tag.monat - 1]++
    }
  })
  
  return arbeitstageProMonat
}

/**
 * Gibt Statistiken zum Kalender zurück
 * @param jahr - Jahr (default: 2027)
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Kalender-Statistiken
 */
export function kalenderStatistik(
  jahr: number = 2027,
  customFeiertage?: FeiertagsKonfiguration[]
) {
  const kalender = generiereJahreskalender(jahr, customFeiertage)
  const feiertageDeutschland = ladeDeutschlandFeiertage()
  const feiertageChina = ladeChinaFeiertage()
  
  const arbeitstageChina = kalender.filter(k => istArbeitstag_China(k.datum, customFeiertage)).length
  const arbeitstageDeutschland = kalender.filter(k => istArbeitstag_Deutschland(k.datum, customFeiertage)).length
  const wochenenden = kalender.filter(k => isWeekend(k.datum)).length
  const springFestivalTage = kalender.filter(k => istSpringFestival(k.datum)).length
  
  return {
    gesamt: kalender.length,
    arbeitstageChina,
    arbeitstageDeutschland,
    wochenenden,
    feiertageDeutschland: feiertageDeutschland.length,
    feiertageChina: feiertageChina.length,
    springFestivalTage,
    produktionstage: arbeitstageChina
  }
}

/**
 * Prüft ob genug Vorlaufzeit für Bestellung vorhanden ist
 * @param bedarfsdatum - Wann wird Material gebraucht
 * @param heute - Heutiges Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns True wenn Bestellung noch rechtzeitig möglich
 */
export function istBestellungRechtzeitig(
  bedarfsdatum: Date, 
  heute: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): boolean {
  const bestelldatum = berechneBestelldatum(bedarfsdatum, customFeiertage)
  return bestelldatum >= heute
}

/**
 * Prüft ob genug Vorlaufzeit für Bestellung vorhanden ist (mit globalem 'Heute')
 * Verwendet das 'Heute'-Datum aus der globalen Konfiguration
 * @param bedarfsdatum - Wann wird Material gebraucht
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns True wenn Bestellung noch rechtzeitig möglich
 */
export function istBestellungRechtzeitigGlobal(
  bedarfsdatum: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): boolean {
  const heute = getHeuteDatum()
  return istBestellungRechtzeitig(bedarfsdatum, heute, customFeiertage)
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEUE MATERIALFLUSS-FUNKTIONEN (gemäß Issue-Anforderungen)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prüft ob ein Datum ein Mittwoch ist (Schiffe fahren nur mittwochs ab)
 * @param datum - Zu prüfendes Datum
 * @returns True wenn Mittwoch
 */
export function istMittwoch(datum: Date): boolean {
  return datum.getDay() === 3 // 0=Sonntag, 3=Mittwoch
}

/**
 * Findet den nächsten Mittwoch ab einem Datum (inklusiv)
 * Schiffe fahren NUR mittwochs ab Shanghai
 * @param datum - Start-Datum
 * @returns Nächster Mittwoch (oder das Datum selbst wenn Mittwoch)
 */
export function naechsterMittwoch(datum: Date): Date {
  let aktuell = new Date(datum)
  
  // Maximal 7 Tage vorwärts suchen (ein Mittwoch ist garantiert dabei)
  for (let i = 0; i < 7; i++) {
    if (istMittwoch(aktuell)) {
      return aktuell
    }
    aktuell = addDays(aktuell, 1)
  }
  
  // Fallback (sollte nie erreicht werden)
  return datum
}

/**
 * Prüft ob ein Datum ein LKW-Fahrtag ist
 * LKWs fahren NICHT am Wochenende (Samstag/Sonntag)
 * LKWs fahren aber an Feiertagen (Feiertage betreffen nur Produktionstage!)
 * 
 * ✅ KORRIGIERT: LKWs können an Feiertagen fahren, aber NICHT an Wochenenden
 * 
 * @param datum - Zu prüfendes Datum
 * @param land - 'China' oder 'Deutschland' (aktuell nicht verwendet, da nur Wochenende geprüft wird)
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage (aktuell nicht verwendet)
 * @returns True wenn LKW an diesem Tag fährt (Mo-Fr, inkl. Feiertage)
 */
export function istLKWFahrtag(
  datum: Date,
  land: 'China' | 'Deutschland',
  customFeiertage?: FeiertagsKonfiguration[]
): boolean {
  // LKWs fahren NUR NICHT am Wochenende (Sa/So)
  // Feiertage sind kein Problem für LKW-Transport!
  return !isWeekend(datum)
}

/**
 * Berechnet das Datum X LKW-Fahrtage in der Zukunft
 * LKWs fahren nur Mo-Fr (keine Wochenenden, aber Feiertage sind OK!)
 * 
 * ✅ KORRIGIERT: LKWs können an Feiertagen fahren, warten aber an Wochenenden
 * 
 * Beispiel: LKW startet 25.12 (Do, Feiertag) → kann fahren
 *           LKW startet 26.12 (Fr, Feiertag) → kann fahren, aber 27-28.12 (Sa/So) warten
 *           → Ankunft nach 2 Fahrtagen am 28.12 (nach Weekend)
 * 
 * @param startDatum - Start-Datum (LKW-Abfahrt)
 * @param fahrtage - Anzahl Fahrtage (Kalendertage, aber nur Mo-Fr gezählt)
 * @param land - 'China' oder 'Deutschland'
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Ziel-Datum (Ankunft nach X Fahrtagen)
 */
export function addLKWFahrtage(
  startDatum: Date,
  fahrtage: number,
  land: 'China' | 'Deutschland',
  customFeiertage?: FeiertagsKonfiguration[]
): Date {
  let aktuell = new Date(startDatum)
  let verbleibendeFahrtage = fahrtage
  
  // Maximal 365 Tage durchsuchen (Sicherheit)
  for (let i = 0; i < 365 && verbleibendeFahrtage > 0; i++) {
    aktuell = addDays(aktuell, 1)
    
    // LKW fährt nur Mo-Fr (Wochenenden werden übersprungen, Feiertage nicht!)
    if (istLKWFahrtag(aktuell, land, customFeiertage)) {
      verbleibendeFahrtage--
    }
  }
  
  return aktuell
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DETAILLIERTER MATERIALFLUSS mit Zwischenlagerung
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Neuer Materialfluss gemäß Issue-Anforderungen:
 * 
 * 1. OEM: Bestellung am Bestelldatum
 * 2. Zulieferer (China): +5 AT Produktion → Warenausgang
 * 3. LKW China: +2 AT (nur Mo-Fr) → Ankunft Hafen Shanghai
 * 4. Hafen Shanghai: Warten auf nächsten Mittwoch → Schiff fährt ab
 * 5. Schiff: +30 KT → Ankunft Hafen Hamburg
 * 6. LKW Deutschland: +2 AT (nur Mo-Fr) → Ankunft Produktionsstandort
 * 7. Verfügbarkeit: NÄCHSTER TAG nach Ankunft
 * 
 * @param bestelldatum - Datum der Bestellung beim Zulieferer
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @param lieferantKonfiguration - Optionale Vorlaufzeiten-Konfiguration
 * @returns Detaillierter Materialfluss mit allen Zwischenstationen
 */
export interface MaterialflussDetails {
  bestelldatum: Date              // Eingang Bestellung bei Zulieferer
  produktionsende: Date           // Warenausgang beim Zulieferer (+5 AT)
  lkwAbfahrtChina: Date           // Abfahrt LKW China
  ankunftHafenShanghai: Date      // Ankunft Hafen Shanghai (+2 AT)
  schiffAbfahrt: Date             // Abfahrt Schiff (nächster Mittwoch)
  wartetageHafen: number          // Tage warten am Hafen auf Mittwoch
  schiffAnkunftHamburg: Date      // Ankunft Hafen Hamburg (+30 KT)
  lkwAbfahrtDeutschland: Date     // Abfahrt LKW Deutschland
  ankunftProduktion: Date         // Ankunft am Produktionsstandort (+2 AT)
  verfuegbarAb: Date              // Verfügbar für Produktion (nächster Tag!)
  gesamtdauerTage: number         // Gesamte Vorlaufzeit in Kalendertagen
}

export function berechneMaterialflussDetails(
  bestelldatum: Date,
  customFeiertage?: FeiertagsKonfiguration[],
  lieferantKonfiguration?: LieferantVorlaufzeitKonfiguration
): MaterialflussDetails {
  // Vorlaufzeiten aus Konfiguration oder Standard-Werte
  const vorlaufzeiten = lieferantKonfiguration || STANDARD_VORLAUFZEITEN
  
  // Schritt 1: Produktion beim Zulieferer (+5 AT China)
  const produktionsende = addArbeitstage(bestelldatum, vorlaufzeiten.vorlaufzeitArbeitstage, customFeiertage)
  
  // Schritt 2: LKW-Transport China zum Hafen (+1 Kalendertag, aber nicht an Wochenenden!)
  // ✅ KORRIGIERT: LKW kann an Feiertagen fahren, aber nicht am Wochenende!
  // "1 AT" bedeutet 1 Kalendertag Transport, aber LKW kann nur Mo-Fr starten
  // Wenn Ankunft auf Wochenende fällt, wird auf Montag verschoben
  const lkwAbfahrtChina = produktionsende
  let ankunftHafenShanghai = addDays(produktionsende, vorlaufzeiten.lkwTransportChinaArbeitstage)
  // Wenn Ankunft auf Wochenende fällt, verschiebe auf Montag
  while (isWeekend(ankunftHafenShanghai)) {
    ankunftHafenShanghai = addDays(ankunftHafenShanghai, 1)
  }
  
  // Schritt 3: Warten auf nächsten Mittwoch (Schiff fährt nur mittwochs!)
  // WICHTIG: Ware die am Hafen ankommt muss mindestens 1 Tag zur Verarbeitung warten,
  // daher suchen wir den nächsten Mittwoch NACH dem Ankunftstag (nicht am selben Tag).
  // Dies entspricht der Realität: Zoll, Entladung, Beladung des Schiffs brauchen Zeit.
  const schiffAbfahrt = naechsterMittwoch(addDays(ankunftHafenShanghai, 1))
  const wartetageHafen = Math.max(0, daysBetween(ankunftHafenShanghai, schiffAbfahrt))
  
  // Schritt 4: Seefracht (+30 KT)
  const schiffAnkunftHamburg = addDays(schiffAbfahrt, vorlaufzeiten.vorlaufzeitKalendertage)
  
  // Schritt 5: LKW-Transport Deutschland (+2 Kalendertage, aber nicht an Wochenenden!)
  // ✅ KORRIGIERT: LKW kann an Feiertagen fahren, aber nicht am Wochenende!
  // 
  // WICHTIG: "2 AT" bedeutet 2 Kalendertage Transport-Dauer, aber:
  // - LKW kann NUR an Werktagen (Mo-Fr) starten
  // - LKW fährt 2 Kalendertage lang (auch durch Wochenenden)
  // - Wenn Ankunft auf Wochenende fällt, verschiebt sich auf Montag
  // 
  // Beispiel: Schiff kommt am 25.12 (Fr, Feiertag) an
  //   → LKW kann am 25.12 losfahren (Feiertag OK!)
  //   → Fährt 2 Kalendertage: 25.12 → 27.12 (So)
  //   → Ankunft fällt auf Wochenende → verschoben auf 28.12 (Mo)
  //   → Verfügbar: 29.12 (nächster Tag)
  // 
  let lkwAbfahrtDeutschland = new Date(schiffAnkunftHamburg)
  // Falls Schiff am Wochenende ankommt, warte bis Montag für LKW-Start
  while (isWeekend(lkwAbfahrtDeutschland)) {
    lkwAbfahrtDeutschland = addDays(lkwAbfahrtDeutschland, 1)
  }
  // LKW fährt N Kalendertage
  let ankunftProduktion = addDays(lkwAbfahrtDeutschland, vorlaufzeiten.lkwTransportDeutschlandArbeitstage)
  // Wenn Ankunft auf Wochenende fällt, verschiebe auf nächsten Montag
  while (isWeekend(ankunftProduktion)) {
    ankunftProduktion = addDays(ankunftProduktion, 1)
  }
  
  // Schritt 6: Material ist NÄCHSTEN TAG nach Ankunft verfügbar!
  const verfuegbarAb = addDays(ankunftProduktion, 1)
  
  // Gesamtdauer berechnen
  const gesamtdauerTage = daysBetween(bestelldatum, verfuegbarAb)
  
  return {
    bestelldatum,
    produktionsende,
    lkwAbfahrtChina,
    ankunftHafenShanghai,
    schiffAbfahrt,
    wartetageHafen,
    schiffAnkunftHamburg,
    lkwAbfahrtDeutschland,
    ankunftProduktion,
    verfuegbarAb,
    gesamtdauerTage
  }
}

/**
 * Berechnet Verfügbarkeitsdatum mit detailliertem Materialfluss
 * Ersetzt die einfache berechneAnkunftsdatum Funktion für präzise Berechnungen
 * 
 * WICHTIG: Berücksichtigt:
 * - Schiffe nur mittwochs
 * - LKWs nicht am Wochenende
 * - Material verfügbar am nächsten Tag nach Ankunft
 * 
 * @param bestelldatum - Wann wurde bestellt
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @param lieferantKonfiguration - Optionale Vorlaufzeiten-Konfiguration
 * @returns Datum ab wann Material für Produktion verfügbar ist
 */
export function berechneVerfuegbarkeitsdatum(
  bestelldatum: Date,
  customFeiertage?: FeiertagsKonfiguration[],
  lieferantKonfiguration?: LieferantVorlaufzeitKonfiguration
): Date {
  const materialfluss = berechneMaterialflussDetails(bestelldatum, customFeiertage, lieferantKonfiguration)
  return materialfluss.verfuegbarAb
}