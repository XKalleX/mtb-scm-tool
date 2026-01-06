/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TAGESPRODUKTION - 365 TAGE GRANULARE PLANUNG
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 ANFORDERUNG A2: Saisonale Programmplanung mit Error Management
 * 
 * Berechnet die Tagesproduktion für das gesamte Jahr 2027 unter Berücksichtigung:
 * - Saisonalität (Jan 4%, Apr 16% Peak, Dez 3%)
 * - Error Management für exakte 370.000 Bikes
 * - Arbeitstage vs. Wochenenden/Feiertage
 * - MTB-Varianten mit korrekten Marktanteilen
 * - Nur Sättel gemäß Ermäßigung
 * 
 * QUELLE: kontext/Spezifikation_SSOT_MR.ts
 */

import { 
  PRODUKTIONSVOLUMEN, 
  MTB_VARIANTEN, 
  SAISONALITAET,
  FEIERTAGE_DEUTSCHLAND,
  BAUTEILE,
  STUECKLISTE
} from '../../../kontext/Spezifikation_SSOT_MR'

/**
 * Tagesproduktionseintrag mit Error Management
 */
export interface TagesProduktionDetail {
  tag: number                    // Tag im Jahr (1-365)
  datum: Date                    // Datum
  wochentag: string              // Mo, Di, Mi, ...
  istArbeitstag: boolean         // Produktionstag?
  istFeiertag: boolean           // Deutscher Feiertag?
  feiertagsName?: string         // Name des Feiertags
  
  // Produktion
  sollProduktion: number         // Dezimale Soll-Menge (mit Saisonalität)
  istProduktion: number          // Ganzzahlige Ist-Menge (mit Error Mgmt)
  fehler: number                 // Kumulativer Fehler
  
  // Saisonalität
  saisonFaktor: number           // Monatlicher Faktor (0.04 - 0.16)
  monat: number                  // Monat (1-12)
  monatName: string              // Januar, Februar, ...
  
  // Kumulative Werte
  kumulativSoll: number          // Σ Soll-Produktion bis heute
  kumulativIst: number           // Σ Ist-Produktion bis heute
  
  // Kapazität
  schichten: number              // Benötigte Schichten (bei 1.040/Schicht)
  auslastung: number             // % Auslastung
}

/**
 * Produktionsplan für eine MTB-Variante über 365 Tage
 */
export interface VariantenProduktionsplan {
  varianteId: string
  varianteName: string
  jahresProduktion: number       // Soll-Jahresproduktion
  jahresProduktionIst: number    // Ist-Jahresproduktion (mit Error Mgmt)
  abweichung: number             // Differenz (sollte ≤ 1 sein)
  tage: TagesProduktionDetail[]  // 365 Tage
}

/**
 * Prüft ob ein Datum ein deutscher Feiertag ist
 */
function istFeiertag(datum: Date): { ist: boolean; name?: string } {
  const dateStr = datum.toISOString().split('T')[0]
  const feiertag = FEIERTAGE_DEUTSCHLAND.find(f => f.datum === dateStr)
  return {
    ist: !!feiertag,
    name: feiertag?.name
  }
}

/**
 * Prüft ob ein Datum ein Arbeitstag ist (Mo-Fr, kein Feiertag)
 */
function istArbeitstag(datum: Date): boolean {
  const wochentag = datum.getDay()
  const istWochenende = wochentag === 0 || wochentag === 6
  const feiertag = istFeiertag(datum)
  
  return !istWochenende && !feiertag.ist
}

/**
 * 🎯 KERNFUNKTION: Generiert Tagesproduktionsplan für eine MTB-Variante
 * 
 * KONZEPT: Error Management
 * - Verhindert kumulative Rundungsfehler über 365 Tage
 * - Garantiert exakte Jahressumme (z.B. 111.000 Bikes für Allrounder)
 * 
 * @param variante - MTB-Variante aus SSOT
 * @returns Produktionsplan mit 365 Tageseinträgen
 */
export function generiereVariantenProduktionsplan(
  variante: typeof MTB_VARIANTEN[0]
): VariantenProduktionsplan {
  const tage: TagesProduktionDetail[] = []
  
  // Startdatum: 01.01.2027
  const startDatum = new Date('2027-01-01')
  
  // Error-Tracker für kumulative Fehlerkorrektur
  let fehler = 0.0
  let kumulativSoll = 0
  let kumulativIst = 0
  
  // 🔄 Durchlaufe alle 365 Tage des Jahres 2027
  for (let tagNr = 1; tagNr <= 365; tagNr++) {
    const datum = new Date(startDatum)
    datum.setDate(startDatum.getDate() + tagNr - 1)
    
    const monat = datum.getMonth() + 1 // 1-12
    const wochentag = datum.toLocaleDateString('de-DE', { weekday: 'short' })
    
    const arbeitstag = istArbeitstag(datum)
    const feiertagInfo = istFeiertag(datum)
    
    // Saisonalitätsfaktor für diesen Monat
    const saisonMonat = SAISONALITAET.find(s => s.monat === monat)!
    const saisonFaktor = saisonMonat.anteil / 100 // 0.04 - 0.16
    
    let sollProduktion = 0
    let istProduktion = 0
    let schichten = 0
    let auslastung = 0
    
    if (arbeitstag) {
      // ✅ PRODUKTIONSTAG
      
      // 1️⃣ Berechne Soll-Produktion (Dezimal)
      // KRITISCH: saisonMonat.produktionsMenge ist für ALLE Bikes, nicht nur diese Variante!
      // Korrekte Formel: Varianten-Jahresproduktion * Saisonaler Anteil / Arbeitstage
      
      const arbeitstageImMonat = countArbeitstageInMonat(datum)
      
      // Schritt A: Berechne Monatsproduktion dieser Variante
      const variantenMonatsProduktion = variante.jahresProduktion * (saisonFaktor / 100)
      
      // Schritt B: Verteile auf Arbeitstage
      sollProduktion = variantenMonatsProduktion / arbeitstageImMonat
      
      // 2️⃣ Error Management: Kumulative Fehlerkorrektur
      fehler += (sollProduktion - Math.round(sollProduktion))
      
      if (fehler >= 0.5) {
        // Aufrunden
        istProduktion = Math.ceil(sollProduktion)
        fehler -= 1.0
      } else if (fehler <= -0.5) {
        // Abrunden
        istProduktion = Math.floor(sollProduktion)
        fehler += 1.0
      } else {
        // Normal runden
        istProduktion = Math.round(sollProduktion)
      }
      
      // 3️⃣ Schichten berechnen
      // Kapazität: 130 Bikes/h × 8h = 1.040 Bikes/Schicht
      schichten = Math.ceil(istProduktion / 1040)
      
      // 4️⃣ Auslastung berechnen
      const maxKapazitaet = schichten * 1040
      auslastung = (istProduktion / maxKapazitaet) * 100
      
    } else {
      // ❌ KEIN PRODUKTIONSTAG (Wochenende oder Feiertag)
      sollProduktion = 0
      istProduktion = 0
      schichten = 0
      auslastung = 0
    }
    
    // Kumulative Werte aktualisieren
    kumulativSoll += sollProduktion
    kumulativIst += istProduktion
    
    // Tageseintrag erstellen
    tage.push({
      tag: tagNr,
      datum,
      wochentag,
      istArbeitstag: arbeitstag,
      istFeiertag: feiertagInfo.ist,
      feiertagsName: feiertagInfo.name,
      
      sollProduktion,
      istProduktion,
      fehler,
      
      saisonFaktor,
      monat,
      monatName: saisonMonat.monatName,
      
      kumulativSoll,
      kumulativIst,
      
      schichten,
      auslastung
    })
  }
  
  // ✅ VALIDIERUNG: Ist-Jahresproduktion muss ≈ Soll sein (±10 Bikes)
  const jahresProduktionIst = kumulativIst
  const abweichung = jahresProduktionIst - variante.jahresProduktion
  
  if (Math.abs(abweichung) > 10) {
    console.warn(
      `⚠️ Error Management Warnung für ${variante.name}: ` +
      `Abweichung ${abweichung} Bikes (Soll: ${variante.jahresProduktion}, Ist: ${jahresProduktionIst})`
    )
  }
  
  return {
    varianteId: variante.id,
    varianteName: variante.name,
    jahresProduktion: variante.jahresProduktion,
    jahresProduktionIst,
    abweichung,
    tage
  }
}

/**
 * Zählt Arbeitstage in einem Monat
 */
function countArbeitstageInMonat(datum: Date): number {
  const jahr = datum.getFullYear()
  const monat = datum.getMonth() // 0-11
  
  let arbeitstage = 0
  const ersterTag = new Date(jahr, monat, 1)
  const letzterTag = new Date(jahr, monat + 1, 0)
  
  for (let tag = 1; tag <= letzterTag.getDate(); tag++) {
    const d = new Date(jahr, monat, tag)
    if (istArbeitstag(d)) {
      arbeitstage++
    }
  }
  
  return arbeitstage
}

/**
 * 🎯 Generiert Produktionspläne für ALLE 8 MTB-Varianten
 * 
 * @returns Array mit 8 Produktionsplänen (je 365 Tage)
 */
export function generiereAlleVariantenProduktionsplaene(): VariantenProduktionsplan[] {
  return MTB_VARIANTEN.map(variante => 
    generiereVariantenProduktionsplan(variante)
  )
}

/**
 * 🎯 Aggregiert Produktionspläne zu Gesamt-Tagesproduktion
 * (Summe über alle 8 Varianten)
 * 
 * @param plaene - Array von Varianten-Produktionsplänen
 * @returns Aggregierte Tagesproduktion (365 Tage)
 */
export function aggregiereProduktionsplaene(
  plaene: VariantenProduktionsplan[]
): TagesProduktionDetail[] {
  const aggregiert: TagesProduktionDetail[] = []
  
  // Für jeden der 365 Tage
  for (let tagNr = 1; tagNr <= 365; tagNr++) {
    // Hole alle Tage mit dieser Nummer
    const tagDaten = plaene.map(p => p.tage[tagNr - 1])
    
    // Summiere Produktionen
    const sollProduktion = tagDaten.reduce((sum, t) => sum + t.sollProduktion, 0)
    const istProduktion = tagDaten.reduce((sum, t) => sum + t.istProduktion, 0)
    
    // Nutze Daten vom ersten Eintrag (alle haben gleiche Datums-Info)
    const referenz = tagDaten[0]
    
    aggregiert.push({
      tag: tagNr,
      datum: referenz.datum,
      wochentag: referenz.wochentag,
      istArbeitstag: referenz.istArbeitstag,
      istFeiertag: referenz.istFeiertag,
      feiertagsName: referenz.feiertagsName,
      
      sollProduktion,
      istProduktion,
      fehler: 0, // Nicht sinnvoll aggregiert
      
      saisonFaktor: referenz.saisonFaktor,
      monat: referenz.monat,
      monatName: referenz.monatName,
      
      kumulativSoll: aggregiert.length > 0 
        ? aggregiert[aggregiert.length - 1].kumulativSoll + sollProduktion 
        : sollProduktion,
      kumulativIst: aggregiert.length > 0
        ? aggregiert[aggregiert.length - 1].kumulativIst + istProduktion
        : istProduktion,
      
      schichten: Math.ceil(istProduktion / 1040),
      auslastung: istProduktion > 0 ? (istProduktion / (Math.ceil(istProduktion / 1040) * 1040)) * 100 : 0
    })
  }
  
  return aggregiert
}

/**
 * 🎯 Berechnet Lagerbestände für Sättel über 365 Tage
 * 
 * WICHTIG: Ermäßigung - Nur 4 Sattel-Varianten!
 * - 1 Sattel = 1 Bike (einfache Stückliste)
 * 
 * @param produktionsplaene - Produktionspläne aller Varianten
 * @returns Lagerbewegungen für jeden Sattel
 */
export function berechneSattelLagerbestaende(
  produktionsplaene: VariantenProduktionsplan[]
): Record<string, { 
  bauteilId: string
  bauteilName: string
  tagesBewegungen: Array<{
    tag: number
    datum: Date
    verbrauch: number
    bestand: number
    sicherheitsbestand: number
    status: 'ok' | 'kritisch'
  }>
}> {
  const lagerbestaende: Record<string, any> = {}
  
  // Initialisiere für jeden Sattel
  BAUTEILE.forEach(bauteil => {
    lagerbestaende[bauteil.id] = {
      bauteilId: bauteil.id,
      bauteilName: bauteil.name,
      tagesBewegungen: []
    }
    
    // Startbestand: 14 Tage Puffer
    const verwendendeVarianten = STUECKLISTE.filter(s => s.bauteilId === bauteil.id)
    const durchschnittVerbrauchProTag = verwendendeVarianten.reduce((sum, s) => {
      const variante = MTB_VARIANTEN.find(v => v.id === s.mtbVariante)
      return sum + (variante ? variante.jahresProduktion / 250 : 0) // 250 Arbeitstage
    }, 0)
    
    let bestand = Math.ceil(durchschnittVerbrauchProTag * 14) // 14 Tage Puffer
    const sicherheitsbestand = Math.ceil(durchschnittVerbrauchProTag * 7) // 7 Tage
    
    // Für jeden Tag
    for (let tagNr = 1; tagNr <= 365; tagNr++) {
      // Berechne Verbrauch dieses Tages
      let verbrauch = 0
      
      verwendendeVarianten.forEach(stueck => {
        const plan = produktionsplaene.find(p => p.varianteId === stueck.mtbVariante)
        if (plan) {
          const tag = plan.tage[tagNr - 1]
          verbrauch += tag.istProduktion * stueck.menge // Menge ist immer 1 bei Sätteln
        }
      })
      
      // Buche Verbrauch ab
      bestand -= verbrauch
      
      // TODO: Hier Lieferungen einbuchen (aus Inbound China)
      // Für jetzt: Vereinfachte Auffüllung wenn unter Sicherheitsbestand
      if (bestand < sicherheitsbestand) {
        bestand += Math.ceil(durchschnittVerbrauchProTag * 14) // Auffüllen auf 14 Tage
      }
      
      const status = bestand >= sicherheitsbestand ? 'ok' : 'kritisch'
      
      lagerbestaende[bauteil.id].tagesBewegungen.push({
        tag: tagNr,
        datum: new Date(new Date('2027-01-01').getTime() + (tagNr - 1) * 24 * 60 * 60 * 1000),
        verbrauch,
        bestand,
        sicherheitsbestand,
        status
      })
    }
  })
  
  return lagerbestaende
}
