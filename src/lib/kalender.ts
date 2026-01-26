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
import { addDays, isWeekend, getDayOfYear, getWeekNumber, toLocalISODateString } from './utils'
import feiertagsData from '@/data/feiertage-china.json'
import feiertagsDeutschlandData from '@/data/feiertage-deutschland.json'
import { DEFAULT_HEUTE_DATUM, KONFIGURATION_STORAGE_KEY, parseDateSafe } from './constants'

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
 * Fallback: DEFAULT_HEUTE_DATUM falls nicht gesetzt oder ungültig
 * @returns Date-Objekt des 'Heute'-Datums (garantiert gültig)
 */
export function getHeuteDatum(): Date {
  if (typeof window === 'undefined') {
    // Server-Side: Standard-Datum
    return new Date(DEFAULT_HEUTE_DATUM)
  }
  
  try {
    const konfigString = localStorage.getItem(KONFIGURATION_STORAGE_KEY)
    if (konfigString) {
      const konfiguration = JSON.parse(konfigString)
      if (konfiguration.heuteDatum) {
        // Verwendet shared utility für sichere Datums-Validierung
        return parseDateSafe(konfiguration.heuteDatum)
      }
    }
  } catch (error) {
    console.warn('Fehler beim Laden des Heute-Datums aus Konfiguration:', error)
  }
  
  // Fallback: Standard-Datum
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
 * 
 * @deprecated Nutze stattdessen istArbeitstag_Deutschland() oder istArbeitstag_China()
 *             je nachdem für welches Land die Prüfung erfolgen soll!
 * 
 * Legacy-Funktion: Prüft CHINESISCHE Feiertage (für Rückwärtskompatibilität)
 * Relevant für China-Produktion
 * 
 * @param datum - Zu prüfendes Datum
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns True wenn Arbeitstag (China)
 */
export function istArbeitstag(
  datum: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): boolean {
  // Legacy: Nutzt China-Logik für Rückwärtskompatibilität
  return istArbeitstag_China(datum, customFeiertage)
}

/**
 * Prüft ob Datum im Spring Festival liegt (5.2.-12.2.2027)
 * WICHTIG: 8 Tage kompletter Produktionsstopp in China!
 * @param datum - Zu prüfendes Datum
 * @returns True wenn Spring Festival
 */
export function istSpringFestival(datum: Date): boolean {
  const springStart = new Date(2027, 1, 5) // 5. Februar
  const springEnd = new Date(2027, 1, 12)    // 12. Februar
  
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
 * WICHTIG FÜR CHINA:
 * - Transport: 35 Kalendertage (Schiff fährt 24/7)
 * - Bearbeitung: 21 Arbeitstage (Mo-Fr ohne Feiertage)
 * 
 * @param bedarfsdatum - Wann Material in Deutschland benötigt wird
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Bestelldatum bei China
 */
export function berechneBestelldatum(
  bedarfsdatum: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): Date {
  // China-spezifische Vorlaufzeiten gemäß SSOT-Spezifikation und Anforderungen
  // TOTAL: 49 Tage = 7 Wochen Vorlaufzeit
  // Aufschlüsselung gemäß Anforderungen (Bild):
  // - 5 AT Produktion in China
  // - 2 AT LKW-Transport China → Hafen Shanghai
  // - 30 KT Seefracht Shanghai → Hamburg
  // - 2 AT LKW-Transport Hamburg → Dortmund
  const SEEFRACHT_KALENDERTAGE = 30  // Schiff-Transport (24/7)
  const BEARBEITUNG_ARBEITSTAGE = 5  // Produktion in China
  const LKW_CHINA_ARBEITSTAGE = 2    // LKW China → Hafen
  const LKW_DEUTSCHLAND_ARBEITSTAGE = 2  // LKW Hamburg → Dortmund
  
  // Schritt 1: Vom Bedarfsdatum die Seefracht-Zeit (Kalendertage) abziehen
  // Transport läuft 24/7, also einfach Kalendertage subtrahieren
  let datumNachSeefracht = addDays(bedarfsdatum, -SEEFRACHT_KALENDERTAGE)
  
  // Schritt 2: LKW-Transport Deutschland (2 AT) abziehen
  datumNachSeefracht = subtractArbeitstage(datumNachSeefracht, LKW_DEUTSCHLAND_ARBEITSTAGE, customFeiertage)
  
  // Schritt 3: Von diesem Datum die Bearbeitungszeit (5 AT) abziehen
  // Dies berücksichtigt Wochenenden und chinesische Feiertage
  let nachProduktion = subtractArbeitstage(datumNachSeefracht, BEARBEITUNG_ARBEITSTAGE, customFeiertage)
  
  // Schritt 4: LKW-Transport China (2 AT) abziehen
  let bestelldatum = subtractArbeitstage(nachProduktion, LKW_CHINA_ARBEITSTAGE, customFeiertage)
  
  // Schritt 5: Einen zusätzlichen Tag Puffer (Best Practice)
  bestelldatum = addDays(bestelldatum, -1)
  
  // Schritt 6: Sicherstellen dass Bestelldatum ein Arbeitstag ist (China!)
  // Falls Wochenende/Feiertag -> vorheriger Arbeitstag
  while (!istArbeitstag_China(bestelldatum, customFeiertage)) {
    bestelldatum = addDays(bestelldatum, -1)
  }
  
  return bestelldatum
}

/**
 * Berechnet Ankunftsdatum vorwärts vom Bestelldatum
 * 
 * KORRIGIERT: 
 * - LKW-Transport in Deutschland nutzt DEUTSCHE Arbeitstage (nicht chinesische!)
 * - Ankunftsdatum wird auf den nächsten deutschen Arbeitstag korrigiert
 * 
 * @param bestelldatum - Wann wurde bestellt
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage
 * @returns Ankunftsdatum in Deutschland (immer ein deutscher Arbeitstag)
 */
export function berechneAnkunftsdatum(
  bestelldatum: Date,
  customFeiertage?: FeiertagsKonfiguration[]
): Date {
  // Vorlaufzeit gemäß SSOT: 49 Tage
  // Aufschlüsselung: 5 AT Produktion + 2 AT + 30 KT + 2 AT Transport
  const SEEFRACHT_KALENDERTAGE = 30
  const BEARBEITUNG_ARBEITSTAGE = 5
  const LKW_CHINA_ARBEITSTAGE = 2
  const LKW_DEUTSCHLAND_ARBEITSTAGE = 2
  
  // Schritt 1: Bearbeitung in China (5 AT) - nutzt CHINESISCHE Arbeitstage
  let nachBearbeitung = addArbeitstage(bestelldatum, BEARBEITUNG_ARBEITSTAGE, customFeiertage)
  
  // Schritt 2: LKW-Transport China zum Hafen (2 AT) - nutzt CHINESISCHE Arbeitstage
  let nachLKWChina = addArbeitstage(nachBearbeitung, LKW_CHINA_ARBEITSTAGE, customFeiertage)
  
  // Schritt 3: Seefracht (30 KT) - Kalendertage (Schiff fährt 24/7)
  let nachSeefracht = addDays(nachLKWChina, SEEFRACHT_KALENDERTAGE)
  
  // Schritt 4: LKW-Transport Hamburg nach Dortmund (2 AT)
  // ✅ KORRIGIERT: Nutzt DEUTSCHE Arbeitstage (nicht chinesische!)
  // LKW-Transport in Deutschland respektiert deutsche Feiertage
  // addArbeitstage_Deutschland garantiert bereits dass das Ergebnis ein deutscher Arbeitstag ist
  let ankunftsdatum = addArbeitstage_Deutschland(nachSeefracht, LKW_DEUTSCHLAND_ARBEITSTAGE, customFeiertage)
  
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
    produktionstage: arbeitstageChina // = Arbeitstage in China (Legacy)
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