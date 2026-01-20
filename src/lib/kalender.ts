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
 * - Nur chinesische Feiertage relevant!
 * - 'Heute'-Datum wird aus globaler Konfiguration gelesen
 */

import { Kalendertag, Feiertag } from '@/types'
import { addDays, isWeekend, getDayOfYear, getWeekNumber } from './utils'
import feiertagsData from '@/data/feiertage-china.json'
import feiertagsDeutschlandData from '@/data/feiertage-deutschland.json'
import { DEFAULT_HEUTE_DATUM, KONFIGURATION_STORAGE_KEY, parseDateSafe } from './constants'

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
 * Lädt alle deutschen Feiertage für beide Jahre (2026 + 2027)
 * Wichtig für Vorlaufzeit-Berechnungen (49 Tage können bis 2026 zurückreichen)
 * @returns Array von Feiertagen
 */
export function ladeDeutschlandFeiertage(): Feiertag[] {
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
    }))
  ]
}

/**
 * Lädt alle chinesischen Feiertage für beide Jahre (2026 + 2027)
 * Wichtig für Vorlaufzeit-Berechnungen (49 Tage können bis 2026 zurückreichen)
 * @returns Array von Feiertagen
 */
export function ladeChinaFeiertage(): Feiertag[] {
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
    }))
  ]
}

/**
 * Prüft ob ein Datum ein deutscher Feiertag ist
 * @param datum - Zu prüfendes Datum
 * @returns Array von Feiertagen an diesem Tag (leer wenn kein Feiertag)
 */
export function istDeutschlandFeiertag(datum: Date): Feiertag[] {
  const alleFeiertage = ladeDeutschlandFeiertage()
  
  return alleFeiertage.filter(f => 
    f.datum.toDateString() === datum.toDateString()
  )
}

/**
 * Prüft ob ein Datum ein chinesischer Feiertag ist
 * @param datum - Zu prüfendes Datum
 * @returns Array von Feiertagen an diesem Tag (leer wenn kein Feiertag)
 */
export function istChinaFeiertag(datum: Date): Feiertag[] {
  const alleFeiertage = ladeChinaFeiertage()
  
  return alleFeiertage.filter(f => 
    f.datum.toDateString() === datum.toDateString()
  )
}

/**
 * Prüft ob ein Datum ein Feiertag ist (Deutschland ODER China)
 * Bestellungen können nicht an Feiertagen (DE oder CN) platziert werden
 * @param datum - Zu prüfendes Datum
 * @returns True wenn Feiertag (entweder DE oder CN)
 */
export function istFeiertag(datum: Date): boolean {
  return istDeutschlandFeiertag(datum).length > 0 || istChinaFeiertag(datum).length > 0
}

/**
 * Prüft ob ein Datum ein Arbeitstag in DEUTSCHLAND ist (Mo-Fr, kein deutscher Feiertag)
 * 
 * WICHTIG: Für OEM-Produktion in Deutschland (Dortmund)
 * Prüft DEUTSCHE Feiertage (NRW), nicht chinesische!
 * 
 * @param datum - Zu prüfendes Datum
 * @returns True wenn Arbeitstag in Deutschland
 */
export function istArbeitstag_Deutschland(datum: Date): boolean {
  // Wochenende?
  if (isWeekend(datum)) {
    return false
  }
  
  // Deutscher Feiertag?
  const feiertage = istDeutschlandFeiertag(datum)
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
 * @returns True wenn Arbeitstag in China
 */
export function istArbeitstag_China(datum: Date): boolean {
  // Wochenende?
  if (isWeekend(datum)) {
    return false
  }
  
  // Chinesischer Feiertag?
  const feiertage = istChinaFeiertag(datum)
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
 * @returns True wenn Arbeitstag (China)
 */
export function istArbeitstag(datum: Date): boolean {
  // Legacy: Nutzt China-Logik für Rückwärtskompatibilität
  return istArbeitstag_China(datum)
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
 * @returns Array von Kalendertagen (365 Tage)
 */
export function generiereJahreskalender(jahr: number = 2027): Kalendertag[] {
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
      istArbeitstag: istArbeitstag(datum),
      feiertage: istChinaFeiertag(datum)
    })
  }
  
  return kalender
}

/**
 * Berechnet Arbeitstage zwischen zwei Daten (für China)
 * @param von - Start-Datum
 * @param bis - End-Datum
 * @returns Anzahl Arbeitstage (China)
 */
export function berechneArbeitstage(von: Date, bis: Date): number {
  let arbeitstage = 0
  let aktuell = new Date(von)
  
  while (aktuell <= bis) {
    if (istArbeitstag_China(aktuell)) {
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
 * @returns Anzahl Arbeitstage (Deutschland)
 */
export function berechneArbeitstage_Deutschland(von: Date, bis: Date): number {
  let arbeitstage = 0
  let aktuell = new Date(von)
  
  while (aktuell <= bis) {
    if (istArbeitstag_Deutschland(aktuell)) {
      arbeitstage++
    }
    aktuell = addDays(aktuell, 1)
  }
  
  return arbeitstage
}

/**
 * Findet den nächsten Arbeitstag ab einem Datum (China)
 * @param datum - Start-Datum
 * @returns Nächster Arbeitstag (China)
 */
export function naechsterArbeitstag(datum: Date): Date {
  let aktuell = new Date(datum)
  
  // Maximal 14 Tage vorwärts suchen (Sicherheit)
  for (let i = 0; i < 14; i++) {
    if (istArbeitstag_China(aktuell)) {
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
 * @returns Nächster Arbeitstag (Deutschland)
 */
export function naechsterArbeitstag_Deutschland(datum: Date): Date {
  let aktuell = new Date(datum)
  
  // Maximal 14 Tage vorwärts suchen (Sicherheit)
  for (let i = 0; i < 14; i++) {
    if (istArbeitstag_Deutschland(aktuell)) {
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
 * @returns Ziel-Datum
 */
export function addArbeitstage(startDatum: Date, arbeitstage: number): Date {
  let aktuell = new Date(startDatum)
  let verbleibendeArbeitstage = arbeitstage
  
  // Maximal 365 Tage durchsuchen (Sicherheit)
  for (let i = 0; i < 365 && verbleibendeArbeitstage > 0; i++) {
    aktuell = addDays(aktuell, 1)
    
    if (istArbeitstag_China(aktuell)) {
      verbleibendeArbeitstage--
    }
  }
  
  return aktuell
}

/**
 * Berechnet das Datum X Arbeitstage in der Zukunft (Deutschland)
 * @param startDatum - Start-Datum
 * @param arbeitstage - Anzahl Arbeitstage
 * @returns Ziel-Datum
 */
export function addArbeitstage_Deutschland(startDatum: Date, arbeitstage: number): Date {
  let aktuell = new Date(startDatum)
  let verbleibendeArbeitstage = arbeitstage
  
  // Maximal 365 Tage durchsuchen (Sicherheit)
  for (let i = 0; i < 365 && verbleibendeArbeitstage > 0; i++) {
    aktuell = addDays(aktuell, 1)
    
    if (istArbeitstag_Deutschland(aktuell)) {
      verbleibendeArbeitstage--
    }
  }
  
  return aktuell
}

/**
 * Berechnet das Datum X Arbeitstage in der Vergangenheit (China)
 * @param zielDatum - Ziel-Datum
 * @param arbeitstage - Anzahl Arbeitstage
 * @returns Start-Datum
 */
export function subtractArbeitstage(zielDatum: Date, arbeitstage: number): Date {
  let aktuell = new Date(zielDatum)
  let verbleibendeArbeitstage = arbeitstage
  
  // Maximal 365 Tage zurück durchsuchen (Sicherheit)
  for (let i = 0; i < 365 && verbleibendeArbeitstage > 0; i++) {
    aktuell = addDays(aktuell, -1)
    
    if (istArbeitstag_China(aktuell)) {
      verbleibendeArbeitstage--
    }
  }
  
  return aktuell
}

/**
 * Berechnet das Datum X Arbeitstage in der Vergangenheit (Deutschland)
 * @param zielDatum - Ziel-Datum
 * @param arbeitstage - Anzahl Arbeitstage
 * @returns Start-Datum
 */
export function subtractArbeitstage_Deutschland(zielDatum: Date, arbeitstage: number): Date {
  let aktuell = new Date(zielDatum)
  let verbleibendeArbeitstage = arbeitstage
  
  // Maximal 365 Tage zurück durchsuchen (Sicherheit)
  for (let i = 0; i < 365 && verbleibendeArbeitstage > 0; i++) {
    aktuell = addDays(aktuell, -1)
    
    if (istArbeitstag_Deutschland(aktuell)) {
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
 * @returns Bestelldatum bei China
 */
export function berechneBestelldatum(bedarfsdatum: Date): Date {
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
  datumNachSeefracht = subtractArbeitstage(datumNachSeefracht, LKW_DEUTSCHLAND_ARBEITSTAGE)
  
  // Schritt 3: Von diesem Datum die Bearbeitungszeit (5 AT) abziehen
  // Dies berücksichtigt Wochenenden und chinesische Feiertage
  let nachProduktion = subtractArbeitstage(datumNachSeefracht, BEARBEITUNG_ARBEITSTAGE)
  
  // Schritt 4: LKW-Transport China (2 AT) abziehen
  let bestelldatum = subtractArbeitstage(nachProduktion, LKW_CHINA_ARBEITSTAGE)
  
  // Schritt 5: Einen zusätzlichen Tag Puffer (Best Practice)
  bestelldatum = addDays(bestelldatum, -1)
  
  // Schritt 6: Sicherstellen dass Bestelldatum ein Arbeitstag ist (China!)
  // Falls Wochenende/Feiertag -> vorheriger Arbeitstag
  while (!istArbeitstag_China(bestelldatum)) {
    bestelldatum = addDays(bestelldatum, -1)
  }
  
  return bestelldatum
}

/**
 * Berechnet Ankunftsdatum vorwärts vom Bestelldatum
 * @param bestelldatum - Wann wurde bestellt
 * @returns Ankunftsdatum in Deutschland
 */
export function berechneAnkunftsdatum(bestelldatum: Date): Date {
  // Vorlaufzeit gemäß SSOT: 49 Tage
  // Aufschlüsselung: 5 AT Produktion + 2 AT + 30 KT + 2 AT Transport
  const SEEFRACHT_KALENDERTAGE = 30
  const BEARBEITUNG_ARBEITSTAGE = 5
  const LKW_CHINA_ARBEITSTAGE = 2
  const LKW_DEUTSCHLAND_ARBEITSTAGE = 2
  
  // Schritt 1: Bearbeitung in China (5 AT)
  let nachBearbeitung = addArbeitstage(bestelldatum, BEARBEITUNG_ARBEITSTAGE)
  
  // Schritt 2: LKW-Transport China zum Hafen (2 AT)
  let nachLKWChina = addArbeitstage(nachBearbeitung, LKW_CHINA_ARBEITSTAGE)
  
  // Schritt 3: Seefracht (30 KT)
  let nachSeefracht = addDays(nachLKWChina, SEEFRACHT_KALENDERTAGE)
  
  // Schritt 4: LKW-Transport Hamburg nach Dortmund (2 AT)
  let ankunftsdatum = addArbeitstage(nachSeefracht, LKW_DEUTSCHLAND_ARBEITSTAGE)
  
  return ankunftsdatum
}

/**
 * Zählt Arbeitstage pro Monat im Jahr 2027 (China)
 * @returns Array mit 12 Zahlen (Arbeitstage pro Monat, China)
 */
export function zaehleArbeitstageProMonat(): number[] {
  const kalender = generiereJahreskalender(2027)
  const arbeitstageProMonat: number[] = Array(12).fill(0)
  
  kalender.forEach(tag => {
    if (istArbeitstag_China(tag.datum)) {
      arbeitstageProMonat[tag.monat - 1]++
    }
  })
  
  return arbeitstageProMonat
}

/**
 * Zählt Arbeitstage pro Monat im Jahr 2027 (Deutschland)
 * @returns Array mit 12 Zahlen (Arbeitstage pro Monat, Deutschland)
 */
export function zaehleArbeitstageProMonat_Deutschland(): number[] {
  const kalender = generiereJahreskalender(2027)
  const arbeitstageProMonat: number[] = Array(12).fill(0)
  
  kalender.forEach(tag => {
    if (istArbeitstag_Deutschland(tag.datum)) {
      arbeitstageProMonat[tag.monat - 1]++
    }
  })
  
  return arbeitstageProMonat
}

/**
 * Gibt Statistiken zum Kalender zurück
 * @param jahr - Jahr (default: 2027)
 * @returns Kalender-Statistiken
 */
export function kalenderStatistik(jahr: number = 2027) {
  const kalender = generiereJahreskalender(jahr)
  const feiertageDeutschland = ladeDeutschlandFeiertage()
  const feiertageChina = ladeChinaFeiertage()
  
  const arbeitstageChina = kalender.filter(k => istArbeitstag_China(k.datum)).length
  const arbeitstageDeutschland = kalender.filter(k => istArbeitstag_Deutschland(k.datum)).length
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
 * @returns True wenn Bestellung noch rechtzeitig möglich
 */
export function istBestellungRechtzeitig(bedarfsdatum: Date, heute: Date): boolean {
  const bestelldatum = berechneBestelldatum(bedarfsdatum)
  return bestelldatum >= heute
}

/**
 * Prüft ob genug Vorlaufzeit für Bestellung vorhanden ist (mit globalem 'Heute')
 * Verwendet das 'Heute'-Datum aus der globalen Konfiguration
 * @param bedarfsdatum - Wann wird Material gebraucht
 * @returns True wenn Bestellung noch rechtzeitig möglich
 */
export function istBestellungRechtzeitigGlobal(bedarfsdatum: Date): boolean {
  const heute = getHeuteDatum()
  return istBestellungRechtzeitig(bedarfsdatum, heute)
}