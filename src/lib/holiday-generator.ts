/**
 * ========================================
 * DYNAMISCHE FEIERTAGS-GENERIERUNG
 * ========================================
 * 
 * Generiert Feiertage für beliebige Jahre basierend auf Regeln.
 * Unterstützt:
 * - Deutsche Feiertage (NRW) - bewegliche und feste
 * - Chinesische Feiertage - approximiert (reale Daten sollten ergänzt werden)
 * 
 * WICHTIG: Für Produktionssysteme sollten echte Feiertagsdaten
 * verwendet werden. Diese Implementierung bietet Näherungen.
 */

import { FeiertagConfig } from '@/contexts/KonfigurationContext'

/**
 * Berechnet Ostersonntag für ein gegebenes Jahr (Gaußsche Osterformel)
 * @param jahr - Jahr
 * @returns Date-Objekt des Ostersonntags
 */
function berechneOstersonntag(jahr: number): Date {
  const a = jahr % 19
  const b = Math.floor(jahr / 100)
  const c = jahr % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const monat = Math.floor((h + l - 7 * m + 114) / 31)
  const tag = ((h + l - 7 * m + 114) % 31) + 1
  
  return new Date(jahr, monat - 1, tag)
}

/**
 * Addiert Tage zu einem Datum
 */
function addiereTage(datum: Date, tage: number): Date {
  const neuesDatum = new Date(datum)
  neuesDatum.setDate(neuesDatum.getDate() + tage)
  return neuesDatum
}

/**
 * Konvertiert Date zu ISO-String (YYYY-MM-DD)
 */
function toISODateString(datum: Date): string {
  const jahr = datum.getFullYear()
  const monat = String(datum.getMonth() + 1).padStart(2, '0')
  const tag = String(datum.getDate()).padStart(2, '0')
  return `${jahr}-${monat}-${tag}`
}

/**
 * Generiert deutsche Feiertage (NRW) für ein gegebenes Jahr
 * @param jahr - Jahr für das Feiertage generiert werden sollen
 * @returns Array von Feiertagen
 */
export function generiereDeutscheFeiertage(jahr: number): FeiertagConfig[] {
  const feiertage: FeiertagConfig[] = []
  
  // Feste Feiertage
  const festeFeiertage = [
    { datum: `${jahr}-01-01`, name: 'Neujahr' },
    { datum: `${jahr}-05-01`, name: 'Tag der Arbeit' },
    { datum: `${jahr}-10-03`, name: 'Tag der Deutschen Einheit' },
    { datum: `${jahr}-11-01`, name: 'Allerheiligen' },
    { datum: `${jahr}-12-25`, name: '1. Weihnachtsfeiertag' },
    { datum: `${jahr}-12-26`, name: '2. Weihnachtsfeiertag' }
  ]
  
  festeFeiertage.forEach(f => {
    feiertage.push({
      datum: f.datum,
      name: f.name,
      typ: 'gesetzlich',
      land: 'Deutschland'
    })
  })
  
  // Bewegliche Feiertage (basierend auf Ostern)
  const ostersonntag = berechneOstersonntag(jahr)
  
  const beweglicheFeiertage = [
    { datum: addiereTage(ostersonntag, -2), name: 'Karfreitag' },
    { datum: addiereTage(ostersonntag, 1), name: 'Ostermontag' },
    { datum: addiereTage(ostersonntag, 39), name: 'Christi Himmelfahrt' },
    { datum: addiereTage(ostersonntag, 50), name: 'Pfingstmontag' },
    { datum: addiereTage(ostersonntag, 60), name: 'Fronleichnam' }
  ]
  
  beweglicheFeiertage.forEach(f => {
    feiertage.push({
      datum: toISODateString(f.datum),
      name: f.name,
      typ: 'gesetzlich',
      land: 'Deutschland'
    })
  })
  
  return feiertage
}

/**
 * Berechnet Spring Festival (Chinesisches Neujahr) für ein gegebenes Jahr
 * NÄHERUNG: Verwendet eine Lookup-Tabelle für bekannte Jahre
 * 
 * Für Produktionssysteme sollten echte Daten verwendet werden!
 * 
 * @param jahr - Jahr
 * @returns Start-Datum des Spring Festivals oder null wenn unbekannt
 */
function berechneSpringFestival(jahr: number): Date | null {
  // Lookup-Tabelle für Spring Festival (Chinesisches Neujahr)
  // Basiert auf dem Mondkalender, variiert zwischen Ende Januar und Mitte Februar
  const springFestivalDaten: Record<number, string> = {
    2024: '2024-02-10',
    2025: '2025-01-29',
    2026: '2026-02-17',
    2027: '2027-02-06',  // Realdaten aus JSON
    2028: '2028-01-27',
    2029: '2029-02-13',
    2030: '2030-02-03',
    2031: '2031-01-23',
    2032: '2032-02-11',
    2033: '2033-01-31'
  }
  
  const datumStr = springFestivalDaten[jahr]
  if (!datumStr) {
    console.warn(`Spring Festival Datum für Jahr ${jahr} nicht bekannt. Näherung erforderlich.`)
    return null
  }
  
  return new Date(datumStr)
}

/**
 * Generiert chinesische Feiertage für ein gegebenes Jahr
 * NÄHERUNG: Basiert auf typischen Mustern
 * 
 * WICHTIG: Für Produktionssysteme sollten offizielle Daten verwendet werden!
 * China kombiniert oft Feiertage mit Wochenenden zu längeren Perioden.
 * 
 * @param jahr - Jahr für das Feiertage generiert werden sollen
 * @returns Array von Feiertagen
 */
export function generiereChinesischeFeiertage(jahr: number): FeiertagConfig[] {
  const feiertage: FeiertagConfig[] = []
  
  // Feste Feiertage
  feiertage.push({
    datum: `${jahr}-01-01`,
    name: "New Year's Day",
    typ: 'gesetzlich',
    land: 'China'
  })
  
  // Spring Festival (Chinesisches Neujahr) - 7 Tage
  const springFestivalStart = berechneSpringFestival(jahr)
  if (springFestivalStart) {
    // Vorabend (Tag -1)
    feiertage.push({
      datum: toISODateString(addiereTage(springFestivalStart, -1)),
      name: 'Spring Festival (Vorabend)',
      typ: 'gesetzlich',
      land: 'China'
    })
    
    // Haupttage (7 Tage)
    for (let i = 0; i < 7; i++) {
      const tagName = i === 0 
        ? 'Spring Festival - Chinesischer Neujahrstag'
        : `Spring Festival (Tag ${i + 1})`
      
      feiertage.push({
        datum: toISODateString(addiereTage(springFestivalStart, i)),
        name: tagName,
        typ: 'gesetzlich',
        land: 'China'
      })
    }
  }
  
  // Qingming Festival (Tomb-Sweeping Day) - immer 4. oder 5. April
  feiertage.push({
    datum: `${jahr}-04-05`,
    name: 'Qingming Festival (Tomb-Sweeping Day)',
    typ: 'gesetzlich',
    land: 'China'
  })
  
  // Labour Day (1.-5. Mai) - 5 Tage
  for (let i = 1; i <= 5; i++) {
    feiertage.push({
      datum: `${jahr}-05-${String(i).padStart(2, '0')}`,
      name: 'Labour Day',
      typ: 'gesetzlich',
      land: 'China'
    })
  }
  
  // Dragon Boat Festival - NÄHERUNG (variiert, Mondkalender)
  // Typischerweise Ende Mai / Anfang Juni
  const dragonBoatApprox = new Date(jahr, 5, 10) // Näherung: 10. Juni
  feiertage.push({
    datum: toISODateString(dragonBoatApprox),
    name: 'Dragon Boat Festival',
    typ: 'gesetzlich',
    land: 'China'
  })
  
  // Mid-Autumn Festival - NÄHERUNG (variiert, Mondkalender)
  // Typischerweise Mitte September
  const midAutumnApprox = new Date(jahr, 8, 15) // Näherung: 15. September
  feiertage.push({
    datum: toISODateString(midAutumnApprox),
    name: 'Mid-Autumn Festival',
    typ: 'gesetzlich',
    land: 'China'
  })
  
  // National Day (1.-7. Oktober) - 7 Tage
  for (let i = 1; i <= 7; i++) {
    feiertage.push({
      datum: `${jahr}-10-${String(i).padStart(2, '0')}`,
      name: 'National Day',
      typ: 'gesetzlich',
      land: 'China'
    })
  }
  
  return feiertage
}

/**
 * Generiert alle Feiertage (Deutschland + China) für einen Jahresbereich
 * Lädt 3 Jahre: aktuelles Jahr, vorheriges Jahr (für Vorlaufzeiten), 
 * und nächstes Jahr (für Vorausplanung)
 * 
 * @param planungsjahr - Haupt-Planungsjahr
 * @returns Array aller Feiertage für 3 Jahre
 */
export function generiereAlleFeiertage(planungsjahr: number): FeiertagConfig[] {
  const feiertage: FeiertagConfig[] = []
  
  // 3 Jahre abdecken: vorheriges Jahr, Planungsjahr, nächstes Jahr
  for (let jahr = planungsjahr - 1; jahr <= planungsjahr + 1; jahr++) {
    feiertage.push(...generiereDeutscheFeiertage(jahr))
    feiertage.push(...generiereChinesischeFeiertage(jahr))
  }
  
  return feiertage
}

/**
 * Findet Spring Festival im gegebenen Jahr
 * @param jahr - Jahr
 * @returns Array von Spring Festival Feiertagen (leer wenn nicht gefunden)
 */
export function findeSpringFestival(jahr: number): FeiertagConfig[] {
  const alleFeiertage = generiereChinesischeFeiertage(jahr)
  return alleFeiertage.filter(f => f.name.includes('Spring Festival'))
}

/**
 * Gibt Start- und End-Datum des Spring Festivals zurück
 * @param jahr - Jahr
 * @returns { start: Date, ende: Date } oder null wenn nicht gefunden
 */
export function getSpringFestivalPeriode(jahr: number): { start: Date; ende: Date } | null {
  const springFestivalTage = findeSpringFestival(jahr)
  if (springFestivalTage.length === 0) {
    return null
  }
  
  // Finde frühestes und spätestes Datum
  const daten = springFestivalTage.map(f => new Date(f.datum)).sort((a, b) => a.getTime() - b.getTime())
  
  return {
    start: daten[0],
    ende: daten[daten.length - 1]
  }
}
