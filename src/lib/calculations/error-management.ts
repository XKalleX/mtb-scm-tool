/**
 * ========================================
 * ERROR MANAGEMENT - RUNDUNGSFEHLER-KORREKTUR
 * ========================================
 * 
 * PROBLEM:
 * Die tägliche Produktionsplanung arbeitet mit Dezimalzahlen (z.B. 71,61 Bikes/Tag),
 * aber die tatsächliche Produktion muss in ganzen Einheiten erfolgen (71 oder 72 Bikes).
 * 
 * Ohne Fehlerkorrektur würde tägliches Abrunden zu systematischen Abweichungen führen:
 * - Soll: 365 × 71,61 = 26.137 Bikes/Jahr
 * - Ist (mit einfachem Abrunden): 365 × 71 = 25.915 Bikes/Jahr
 * - Fehler: -222 Bikes! (0,85% Abweichung)
 * 
 * LÖSUNG: Kumuliertes Error-Management
 * 
 * Jeder Tag akkumuliert den Rundungsfehler. Wenn der kumulierte Fehler ≥ 1,0 ist,
 * wird eine zusätzliche Einheit produziert und der Error um 1 reduziert.
 * 
 * BEISPIEL:
 * Tag 1: Soll 71,61 → Ist 71, Error = +0,61
 * Tag 2: Soll 71,61 → Error = 0,61 + 0,61 = 1,22 → Ist 72, Error = 0,22
 * Tag 3: Soll 71,61 → Error = 0,22 + 0,61 = 0,83 → Ist 71, Error = 0,83
 * Tag 4: Soll 71,61 → Error = 0,83 + 0,61 = 1,44 → Ist 72, Error = 0,44
 * ...
 * 
 * RESULTAT: Jahressumme stimmt auf ±1 Bike genau!
 * 
 * Dies ist eine KERNFUNKTION des WI3-Projekts und zeigt Verständnis für:
 * - Integer-Constraints in der Produktion
 * - Akkumulierte Fehlerkorrektur
 * - Präzise Jahresplanung trotz täglicher Rundungen
 */

export interface ErrorState {
  kumulierterError: number;      // Aktueller akkumulierter Fehler
  tagesError: number;             // Fehler des aktuellen Tags
  sollMenge: number;              // Dezimale Soll-Menge
  istMenge: number;               // Integer Ist-Menge (produziert)
  korrekturAngewendet: boolean;   // Wurde eine Korrektur vorgenommen?
}

/**
 * Berechnet die tatsächliche Produktionsmenge unter Berücksichtigung des kumulierten Errors
 * 
 * KERNLOGIK:
 * 1. Basis-Menge = floor(sollMenge)
 * 2. Tages-Error = sollMenge - Basis-Menge
 * 3. Kumulierter Error = Vorheriger Error + Tages-Error
 * 4. WENN kumulierter Error ≥ 1,0 DANN:
 *    - Produziere Basis-Menge + 1
 *    - Reduziere Error um 1
 * 
 * @param sollMenge - Dezimale Soll-Menge für den Tag (z.B. 71,61)
 * @param vorherigerError - Kumulierter Error vom Vortag
 * @returns ErrorState mit berechneter Ist-Menge und neuem Error
 */
export function berechneProduktionMitErrorManagement(
  sollMenge: number,
  vorherigerError: number = 0
): ErrorState {
  // Basis-Menge (Abrunden)
  const basisMenge = Math.floor(sollMenge)
  
  // Tages-Error: Differenz zwischen Soll und Basis
  const tagesError = sollMenge - basisMenge
  
  // Kumulierter Error: Vorheriger Error + Tages-Error
  let kumulierterError = vorherigerError + tagesError
  
  // Entscheidung: Zusatz-Einheit produzieren?
  let istMenge = basisMenge
  let korrekturAngewendet = false
  
  if (kumulierterError >= 1.0) {
    // Ja! Eine zusätzliche Einheit produzieren
    istMenge = basisMenge + 1
    kumulierterError -= 1.0
    korrekturAngewendet = true
  }
  
  return {
    kumulierterError,
    tagesError,
    sollMenge,
    istMenge,
    korrekturAngewendet
  }
}

/**
 * Berechnet die Produktionsplanung für ein ganzes Jahr mit Error-Management
 * 
 * @param jahresproduktion - Gesamt-Jahresproduktion (z.B. 26.137)
 * @param tage - Anzahl Arbeitstage (z.B. 365)
 * @returns Array von ErrorStates für jeden Tag
 */
export function jahresplanungMitErrorManagement(
  jahresproduktion: number,
  tage: number
): ErrorState[] {
  const durchschnittProTag = jahresproduktion / tage
  const planung: ErrorState[] = []
  
  let kumulierterError = 0
  
  for (let tag = 0; tag < tage; tag++) {
    const errorState = berechneProduktionMitErrorManagement(
      durchschnittProTag,
      kumulierterError
    )
    
    planung.push(errorState)
    kumulierterError = errorState.kumulierterError
  }
  
  return planung
}

/**
 * Validiert die Jahresplanung und prüft die Genauigkeit
 * 
 * WICHTIG: Für die Präsentation zeigen, dass Error-Management funktioniert!
 * Erwartung: Abweichung ≤ 1 Bike
 * 
 * @param planung - Array von ErrorStates
 * @param sollJahresproduktion - Erwartete Jahresproduktion
 * @returns Validierungs-Ergebnis
 */
export function validiereJahresplanung(
  planung: ErrorState[],
  sollJahresproduktion: number
) {
  const istJahresproduktion = planung.reduce((sum, day) => sum + day.istMenge, 0)
  const abweichung = istJahresproduktion - sollJahresproduktion
  const abweichungProzent = (abweichung / sollJahresproduktion) * 100
  
  const korrekturTage = planung.filter(p => p.korrekturAngewendet).length
  const maxError = Math.max(...planung.map(p => p.kumulierterError))
  const letzterError = planung[planung.length - 1]?.kumulierterError || 0
  
  return {
    istJahresproduktion,
    sollJahresproduktion,
    abweichung,
    abweichungProzent,
    korrekturTage,
    prozentKorrekturTage: (korrekturTage / planung.length) * 100,
    maxError,
    letzterError,
    istGenau: Math.abs(abweichung) <= 1 // ±1 Bike = perfekt!
  }
}

/**
 * Wendet Error-Management auf saisonale Produktion an
 * 
 * @param monatsproduktion - Array von Monats-Produktionen
 * @param arbeitstageProMonat - Array von Arbeitstagen pro Monat
 * @returns Tages-Produktionsplan mit Error-Management
 */
export function saisonalePlanungMitError(
  monatsproduktion: number[],
  arbeitstageProMonat: number[]
): ErrorState[][] {
  const monatsplaene: ErrorState[][] = []
  
  for (let monat = 0; monat < 12; monat++) {
    const produktion = monatsproduktion[monat]
    const arbeitstage = arbeitstageProMonat[monat]
    
    const monatsplan = jahresplanungMitErrorManagement(produktion, arbeitstage)
    monatsplaene.push(monatsplan)
  }
  
  return monatsplaene
}