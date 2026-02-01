/**
 * ========================================
 * ZENTRALE PRODUKTIONSPLANUNG
 * ========================================
 * * Zentrale Berechnungsfunktionen die von ALLEN Seiten genutzt werden.
 * Nutzt ausschließlich Daten aus dem KonfigurationContext.
 * * ✅ SINGLE SOURCE OF TRUTH: Alle Berechnungen basieren auf KonfigurationData
 * ✅ DURCHGÄNGIGKEIT: Von Settings → OEM → Inbound → Produktion → Reporting
 * ✅ KONSISTENZ: Gleiche Logik in allen Modulen
 */

import type { KonfigurationData, FeiertagConfig } from '@/contexts/KonfigurationContext'
import { daysBetween, toLocalISODateString } from '@/lib/utils'
import { istArbeitstag_Deutschland, istDeutschlandFeiertag, FeiertagsKonfiguration } from '@/lib/kalender'
import type { Bestellung, Produktionsauftrag, Lagerbestand, MarketingAuftrag } from '@/types' // Assumed types
import lieferantChinaData from '@/data/lieferant-china.json'

/**
 * Konvertiert FeiertagConfig[] zu FeiertagsKonfiguration[] für kalender.ts Funktionen
 */
function konvertiereFeiertage(feiertage: FeiertagConfig[]): FeiertagsKonfiguration[] {
  return feiertage.map(f => ({
    datum: f.datum,
    name: f.name,
    typ: f.typ,
    land: f.land
  }))
}

/**
 * Typ für wöchentliche Überschreibungen (OEM Programplanung)
 * Key: Kalenderwoche (1-52/53), Value: Exakte Menge für diese Woche
 */
export type WochenPlanung = Record<number, number>;

/**
 * Tagesproduktionseintrag mit Error Management
 */
export interface TagesProduktionEntry {
  tag: number                    // Tag im Jahr (1-365)
  datum: Date                    // Datum
  wochentag: string              // Mo, Di, Mi, ...
  monat: number                  // Monat (1-12)
  monatName: string              // Januar, Februar, ...
  kalenderwoche: number          // KW (1-53)
  istArbeitstag: boolean         // Produktionstag?
  istFeiertag: boolean           // Deutscher Feiertag?
  feiertagsName?: string         // Name des Feiertags
  
  // Produktion
  sollProduktionDezimal: number  // Dezimale Soll-Produktion (z.B. 71.61)
  planMenge: number              // Ganzzahlige Plan-Menge (mit Error Mgmt)
  istMenge: number               // Tatsächliche Ist-Menge
  abweichung: number             // Differenz Ist - Plan
  
  // Marketing & Zusatz
  istMarketing?: boolean
  marketingMenge?: number
  sollMenge?: number             // Explizites Soll (für Marketing-Anpassungen)

  // Error Management (KERN!)
  tagesError: number             // Fehler dieses Tags
  monatsFehlerVorher: number     // Monatlicher Fehler vom Vortag
  monatsFehlerNachher: number    // Monatlicher Fehler nach diesem Tag
  errorKorrekturAngewendet: boolean  
  
  // Saisonalität
  saisonFaktor: number           
  saisonMenge: number            
  
  // Kapazität
  schichten: number              
  auslastung: number             
  materialVerfuegbar: boolean    
  
  // Kumulative Werte
  kumulativPlan: number          // Σ Plan bis heute
  kumulativIst: number           // Σ Ist bis heute
  kumulativSoll?: number         // Σ Soll bis heute (inkl. Marketing)
  
  // Warehouse Integration (optional, wird von produktion/page.tsx hinzugefügt)
  backlog?: number               // Produktions-Backlog aus Warehouse (nicht produzierte Mengen)
}

/**
 * Produktionsplan für eine MTB-Variante über 365 Tage
 */
export interface VariantenProduktionsplan {
  varianteId: string
  varianteName: string
  jahresProduktion: number       // Soll-Jahresproduktion
  jahresProduktionIst: number    // Ist-Jahresproduktion
  abweichung: number             // Differenz (sollte ≈ 0 sein)
  tage: TagesProduktionEntry[]   // 365 Tage
}

/**
 * ========================================
 * HILFSFUNKTIONEN (Kalenderwoche & Datum)
 * ========================================
 */

/**
 * Berechnet die Kalenderwoche für ein Datum im Kontext des aktuellen Jahres.
 * 
 * Anders als ISO 8601 (das Tage am Jahresanfang der KW 53 des Vorjahres zuweisen kann),
 * ordnet diese Funktion alle Tage eines Jahres den Wochen desselben Jahres zu (KW 1-52/53).
 * 
 * Dies ist wichtig für eine jahresbezogene Planung, bei der KW 53 des Vorjahres
 * verwirrend wäre.
 */
function getKalenderWoche(date: Date): number {
  // Verwende das Jahr des Datums, nicht das ISO-Jahr
  const jahr = date.getFullYear()
  const jahresanfang = new Date(jahr, 0, 1)
  
  // Berechne Wochennummer basierend auf dem ersten Montag des Jahres
  // Tage vor dem ersten Montag gehören zu KW 1
  const tageImJahr = Math.floor((date.getTime() - jahresanfang.getTime()) / 86400000)
  const ersterMontagOffset = (8 - jahresanfang.getDay()) % 7 // Tage bis zum ersten Montag
  
  if (tageImJahr < ersterMontagOffset) {
    // Tage vor dem ersten Montag gehören zu KW 1
    return 1
  }
  
  // Berechne KW basierend auf Tagen seit dem ersten Montag
  return Math.floor((tageImJahr - ersterMontagOffset) / 7) + 1
}

/**
 * ========================================
 * ARBEITSTAGE-BERECHNUNG (Deutschland)
 * ========================================
 */

export function countArbeitstageInMonat(
  jahr: number,
  monat: number,
  feiertage: string[]
): number {
  let arbeitstage = 0
  const daysInMonth = new Date(jahr, monat, 0).getDate()
  
  for (let tag = 1; tag <= daysInMonth; tag++) {
    const datum = new Date(jahr, monat - 1, tag)
    const datumStr = toLocalISODateString(datum)
    const istWochenende = datum.getDay() === 0 || datum.getDay() === 6
    const istFeiertag = feiertage.includes(datumStr)
    
    if (!istWochenende && !istFeiertag) {
      arbeitstage++
    }
  }
  return arbeitstage
}

export function countArbeitstageInWoche(
  kw: number,
  jahr: number,
  feiertage: string[]
): number {
  let arbeitstage = 0
  const startDatum = new Date(jahr, 0, 1)
  for (let i = 0; i < 365; i++) {
    const datum = new Date(jahr, 0, i + 1)
    if (getKalenderWoche(datum) === kw) {
       const datumStr = toLocalISODateString(datum)
       const istWochenende = datum.getDay() === 0 || datum.getDay() === 6
       const istFeiertag = feiertage.includes(datumStr)
       if (!istWochenende && !istFeiertag) {
         arbeitstage++
       }
    }
  }
  return arbeitstage
}

export function countArbeitstageImJahr(konfiguration: KonfigurationData): number {
  const deutscheFeiertage = konfiguration.feiertage
    .filter(f => f.land === 'Deutschland')
    .map(f => f.datum)
  
  let arbeitstage = 0
  for (let monat = 1; monat <= 12; monat++) {
    arbeitstage += countArbeitstageInMonat(
      konfiguration.planungsjahr,
      monat,
      deutscheFeiertage
    )
  }
  return arbeitstage
}

/**
 * ========================================
 * SAISONALE VERTEILUNG
 * ========================================
 */

export function berechneSaisonaleVerteilung(konfiguration: KonfigurationData) {
  const deutscheFeiertage = konfiguration.feiertage
    .filter(f => f.land === 'Deutschland')
    .map(f => f.datum)
  
  return konfiguration.saisonalitaet.map(s => {
    const monatsBikes = Math.round(konfiguration.jahresproduktion * (s.anteil / 100))
    const daysInMonth = new Date(konfiguration.planungsjahr, s.monat, 0).getDate()
    const arbeitstage = countArbeitstageInMonat(
      konfiguration.planungsjahr,
      s.monat,
      deutscheFeiertage
    )
    
    return {
      monat: s.monat,
      name: s.name,
      nameKurz: s.name.substring(0, 3),
      anteil: s.anteil / 100,
      tage: daysInMonth,
      bikes: monatsBikes,
      arbeitstage: arbeitstage,
      bikeProArbeitstag: arbeitstage > 0 ? monatsBikes / arbeitstage : 0
    }
  })
}

/**
 * ========================================
 * TAGESPRODUKTION & MARKETING
 * ========================================
 */

/**
 * Fügt einen Marketing-Zusatzauftrag in den Produktionsplan ein
 * * 🎯 UPDATE: Korrekte Neuberechnung der kumulativen Zähler
 */
export function fuegeMarketingAuftragEin(
  plan: TagesProduktionEntry[],
  auftrag: MarketingAuftrag
): TagesProduktionEntry[] {
  // 1. Find index of the target date
  const targetIndex = plan.findIndex(t => 
    t.datum.toDateString() === auftrag.wunschtermin.toDateString()
  );

  if (targetIndex === -1) return plan;

  // 2. Clone the plan to avoid mutation
  const newPlan = [...plan];
  
  // 3. Add the marketing quantity
  const targetDay = newPlan[targetIndex];
  const addedAmount = auftrag.menge;

  // Bestimme aktuelles Soll (Fallback auf planMenge falls undefined)
  const aktuellesSoll = targetDay.sollMenge !== undefined ? targetDay.sollMenge : targetDay.planMenge;

  newPlan[targetIndex] = {
    ...targetDay,
    istMarketing: true,
    marketingMenge: addedAmount,
    istMenge: targetDay.istMenge + addedAmount,
    // Marketing erhöht das SOLL (Nachfrage), was potenziell zu Rückstand führt, wenn nicht sofort produziert
    sollMenge: aktuellesSoll + addedAmount 
  };

  // 4. CRITICAL: Recalculate Kumulativ values for ALL subsequent days
  // Dies stellt sicher, dass der Backlog-Graph korrekt bleibt
  for (let i = targetIndex; i < newPlan.length; i++) {
     if (i === targetIndex) {
         // Bereits oben aktualisiert, aber wir müssen kumulativ neu setzen
         const prevSoll = i > 0 ? (newPlan[i-1].kumulativSoll ?? newPlan[i-1].kumulativPlan) : 0;
         const prevIst = i > 0 ? newPlan[i-1].kumulativIst : 0;
         
         newPlan[i].kumulativSoll = prevSoll + (newPlan[i].sollMenge ?? newPlan[i].planMenge);
         newPlan[i].kumulativIst = prevIst + newPlan[i].istMenge;
         newPlan[i].kumulativPlan = newPlan[i].kumulativSoll!; // Sync Plan mit Soll
     } else {
         const prevSoll = newPlan[i-1].kumulativSoll!;
         const prevIst = newPlan[i-1].kumulativIst;
         const currSoll = newPlan[i].sollMenge !== undefined ? newPlan[i].sollMenge : newPlan[i].planMenge;

         newPlan[i] = {
             ...newPlan[i],
             kumulativSoll: prevSoll + currSoll!,
             kumulativIst: prevIst + newPlan[i].istMenge,
             kumulativPlan: prevSoll + currSoll! // Sync
         };
     }
  }

  return newPlan;
}

export function generiereTagesproduktion(
  konfiguration: KonfigurationData,
  wochenPlanung?: WochenPlanung
): TagesProduktionEntry[] {
  const saisonalitaet = berechneSaisonaleVerteilung(konfiguration)
  
  // Konvertiere Feiertage für kalender.ts Funktionen
  const customFeiertage = konvertiereFeiertage(konfiguration.feiertage)
  
  // Extrahiere deutsche Feiertage als String-Array für countArbeitstageInWoche
  const deutscheFeiertage = konfiguration.feiertage
    .filter(f => f.land === 'Deutschland')
    .map(f => f.datum)
  
  const monatlicheFehlerTracker: Record<number, number> = {}
  const result: TagesProduktionEntry[] = []
  
  for (let i = 0; i < 365; i++) {
    const tag = i + 1
    const datum = new Date(konfiguration.planungsjahr, 0, tag)
    const wochentag = datum.toLocaleDateString('de-DE', { weekday: 'short' })
    const datumStr = toLocalISODateString(datum)
    const kw = getKalenderWoche(datum)
    
    // Nutze kalender.ts Funktionen für konsistente Feiertagsprüfung
    const feiertagResult = istDeutschlandFeiertag(datum, customFeiertage)
    const istFeiertag = feiertagResult.length > 0
    const feiertagsName = feiertagResult.length > 0 ? feiertagResult[0].name : undefined
    const istArbeitstag = istArbeitstag_Deutschland(datum, customFeiertage)
    
    const monat = datum.getMonth() + 1
    const saisonInfo = saisonalitaet.find(s => s.monat === monat)!
    
    if (!(monat in monatlicheFehlerTracker)) {
      monatlicheFehlerTracker[monat] = 0
    }
    
    let sollProduktionDezimal = 0
    let planMenge = 0
    let istMenge = 0
    let tagesError = 0
    let monatsFehlerVorher = 0
    let monatsFehlerNachher = 0
    let errorKorrekturAngewendet = false
    
    if (istArbeitstag) {
      if (wochenPlanung && wochenPlanung[kw] !== undefined) {
         const arbeitstageInWoche = countArbeitstageInWoche(kw, konfiguration.planungsjahr, deutscheFeiertage)
         if (arbeitstageInWoche > 0) {
            sollProduktionDezimal = wochenPlanung[kw] / arbeitstageInWoche
         } else {
            sollProduktionDezimal = 0 
         }
      } else {
         sollProduktionDezimal = saisonInfo.bikes / saisonInfo.arbeitstage
      }
      
      monatsFehlerVorher = monatlicheFehlerTracker[monat]
      const tagesErrorRoh = sollProduktionDezimal - Math.round(sollProduktionDezimal)
      const fehlerGesamt = monatsFehlerVorher + tagesErrorRoh
      
      if (fehlerGesamt >= 0.5) {
        planMenge = Math.ceil(sollProduktionDezimal)
        monatlicheFehlerTracker[monat] = fehlerGesamt - 1.0
        errorKorrekturAngewendet = true
      } else if (fehlerGesamt <= -0.5) {
        planMenge = Math.floor(sollProduktionDezimal)
        monatlicheFehlerTracker[monat] = fehlerGesamt + 1.0
        errorKorrekturAngewendet = true
      } else {
        planMenge = Math.round(sollProduktionDezimal)
        monatlicheFehlerTracker[monat] = fehlerGesamt
        errorKorrekturAngewendet = false
      }
      
      monatsFehlerNachher = monatlicheFehlerTracker[monat]
      tagesError = sollProduktionDezimal - planMenge
      istMenge = planMenge
    }
    
    const abweichung = istMenge - planMenge
    const materialVerfuegbar = istArbeitstag
    
    // Kapazitätsberechnung mit Schichtsystem aus KonfigurationContext
    // 130 Bikes/h * 8h/Schicht = 1040 Bikes/Schicht
    const kapazitaetProSchicht = 
      konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht
    const maxSchichtenProTag = konfiguration.produktion.maxSchichtenProTag || 3
    const schichten = istArbeitstag ? Math.min(Math.ceil(istMenge / kapazitaetProSchicht), maxSchichtenProTag) : 0
    
    const maxKapazitaet = schichten > 0 ? schichten * kapazitaetProSchicht : 0
    const auslastung = maxKapazitaet > 0 ? (istMenge / maxKapazitaet) * 100 : 0
    
    result.push({
      tag,
      datum,
      wochentag,
      monat,
      monatName: saisonInfo.nameKurz,
      kalenderwoche: kw,
      istArbeitstag,
      istFeiertag,
      feiertagsName,
      sollProduktionDezimal,
      planMenge,
      sollMenge: planMenge, // Initiale Belegung
      istMenge,
      abweichung,
      tagesError,
      monatsFehlerVorher,
      monatsFehlerNachher,
      errorKorrekturAngewendet,
      saisonFaktor: saisonInfo.anteil,
      saisonMenge: saisonInfo.bikes,
      schichten,
      auslastung: Math.round(auslastung * 10) / 10,
      materialVerfuegbar,
      kumulativPlan: 0,
      kumulativIst: 0,
      kumulativSoll: 0
    })
  }
  
  let kumulativPlan = 0
  let kumulativIst = 0
  result.forEach(tag => {
    kumulativPlan += tag.planMenge
    kumulativIst += tag.istMenge
    tag.kumulativPlan = kumulativPlan
    tag.kumulativIst = kumulativIst
    tag.kumulativSoll = kumulativPlan // Initial gleich
  })
  
  if (!wochenPlanung) {
      let summePlan = result.reduce((sum, tag) => sum + tag.planMenge, 0)
      const differenz = summePlan - konfiguration.jahresproduktion
      
      if (differenz !== 0) {
        const arbeitstage = result.filter(t => t.istArbeitstag)
        arbeitstage.sort((a, b) => b.planMenge - a.planMenge)
        
        let verbleibendeKorrektur = Math.abs(differenz)
        const korrekturRichtung = differenz > 0 ? -1 : +1 
        
        for (let i = 0; i < arbeitstage.length && verbleibendeKorrektur > 0; i++) {
          const tag = arbeitstage[i]
          tag.planMenge += korrekturRichtung
          tag.sollMenge = tag.planMenge
          tag.istMenge += korrekturRichtung
          tag.abweichung = 0 
          verbleibendeKorrektur--
          
          const tagIndex = result.findIndex(t => t.tag === tag.tag)
          for (let j = tagIndex; j < result.length; j++) {
            result[j].kumulativPlan += korrekturRichtung
            result[j].kumulativIst += korrekturRichtung
            result[j].kumulativSoll! += korrekturRichtung
          }
        }
      }
  }
  
  return result
}

export function generiereVariantenProduktionsplan(
  konfiguration: KonfigurationData,
  varianteId: string,
  wochenPlanung?: WochenPlanung
): VariantenProduktionsplan | null {
  const variante = konfiguration.varianten.find(v => v.id === varianteId)
  if (!variante) return null
  
  const jahresProduktion = Math.round(konfiguration.jahresproduktion * variante.anteilPrognose)
  
  const varianteKonfiguration: KonfigurationData = {
    ...konfiguration,
    jahresproduktion: jahresProduktion
  }
  
  const tage = generiereTagesproduktion(varianteKonfiguration, wochenPlanung)
  const jahresProduktionIst = tage.reduce((sum, t) => sum + t.istMenge, 0)
  
  return {
    varianteId: variante.id,
    varianteName: variante.name,
    jahresProduktion: wochenPlanung ? jahresProduktionIst : jahresProduktion,
    jahresProduktionIst,
    abweichung: wochenPlanung ? 0 : (jahresProduktionIst - jahresProduktion),
    tage
  }
}

export function generiereAlleVariantenProduktionsplaene(
  konfiguration: KonfigurationData,
  wochenPlanungen?: Record<string, WochenPlanung>
): Record<string, VariantenProduktionsplan> {
  const plaene: Record<string, VariantenProduktionsplan> = {}
  
  konfiguration.varianten.forEach(variante => {
    const planOverride = wochenPlanungen ? wochenPlanungen[variante.id] : undefined;
    const plan = generiereVariantenProduktionsplan(konfiguration, variante.id, planOverride)
    if (plan) {
      plaene[variante.id] = plan
    }
  })
  
  return plaene
}

/**
 * ========================================
 * SCOR METRIKEN & VISUALISIERUNG
 * ========================================
 */

export interface SCORMetriken {
  // RELIABILITY
  planerfuellungsgrad: number;
  liefertreueChina: number;
  deliveryPerformance: number;
  
  // RESPONSIVENESS
  durchlaufzeitProduktion: number;
  lagerumschlag: number;
  forecastAccuracy: number;

  // NEU: Lead Time Breakdown for the Diagram
  durchlaufzeitBreakdown: {
    transport: number;
    produktionChina: number;
    verzollung: number;
    gesamt: number;
  };
  
  // AGILITY
  produktionsflexibilitaet: number;
  materialverfuegbarkeit: number;
  
  // ASSETS
  lagerreichweite: number;
  kapitalbindung: number;
  
  // KPI
  gesamtproduktion: number;
  produktionstage: number;
  durchschnittProTag: number;
  auslastung: number;
}

export function berechneSCORMetriken(
  produktionsauftraege: Produktionsauftrag[],
  lagerbestaende: Record<string, Lagerbestand>,
  bestellungen: Bestellung[]
): SCORMetriken {
  const vollstaendigeAuftraege = produktionsauftraege.filter(
    a => a.tatsaechlicheMenge === a.geplanteMenge
  ).length
  
  const planerfuellungsgrad = produktionsauftraege.length > 0
    ? (vollstaendigeAuftraege / produktionsauftraege.length) * 100
    : 100
  
  const puenktlicheBestellungen = bestellungen.filter(b => {
    if (!b.tatsaechlicheAnkunft) return true
    return b.tatsaechlicheAnkunft <= b.erwarteteAnkunft
  }).length
  
  const liefertreueChina = bestellungen.length > 0
    ? (puenktlicheBestellungen / bestellungen.length) * 100
    : 100
  
  // Vorlaufzeit aus JSON (keine Duplikate!)
  const CHINA_VORLAUFZEIT_TAGE = lieferantChinaData.lieferant.gesamtVorlaufzeitTage
  const TOLERANZ_TAGE = 2
  const lieferungenInVorlaufzeit = bestellungen.filter(b => {
    if (!b.tatsaechlicheAnkunft) return true
    const tatsaechlicheDauer = daysBetween(b.bestelldatum, b.tatsaechlicheAnkunft)
    return tatsaechlicheDauer <= CHINA_VORLAUFZEIT_TAGE + TOLERANZ_TAGE
  }).length
  
  const deliveryPerformance = bestellungen.length > 0
    ? (lieferungenInVorlaufzeit / bestellungen.length) * 100
    : 100
  
  let durchlaufzeiten: number[] = []
  bestellungen.forEach(b => {
    const ankunft = b.tatsaechlicheAnkunft || b.erwarteteAnkunft
    const dauer = daysBetween(b.bestelldatum, ankunft)
    durchlaufzeiten.push(dauer)
  })
  
  const durchlaufzeitProduktion = durchlaufzeiten.length > 0
    ? durchlaufzeiten.reduce((sum, d) => sum + d, 0) / durchlaufzeiten.length
    : 0

  // Nutze Standard-Werte aus Spezifikation (Quelle: lieferant-china.json → 49 Tage Gesamtvorlaufzeit)
  // 
  // WICHTIG: AT (Arbeitstage) müssen in KT (Kalendertage) umgerechnet werden:
  // - 5 AT Produktion + 4 AT LKW Transport → ~13 KT (mit Wochenenden)
  // - 30 KT Seefracht (24/7)
  // - Gesamt: ~43 KT + Handling/Puffer → 49 Tage (7 Wochen laut Spezifikation)
  
  // Vorlaufzeiten aus JSON (keine Duplikate!)
  const vorlaufzeitGesamt = lieferantChinaData.lieferant.gesamtVorlaufzeitTage
  const vorlaufzeitProduktion = lieferantChinaData.lieferant.vorlaufzeitArbeitstage
  const vorlaufzeitSeefracht = lieferantChinaData.lieferant.vorlaufzeitKalendertage
  const vorlaufzeitLKW = lieferantChinaData.lieferant.lkwTransportArbeitstage
  
  const durchlaufzeitBreakdown = {
     produktionChina: vorlaufzeitProduktion, 
     transport: vorlaufzeitSeefracht + vorlaufzeitLKW, // Seefracht + LKW
     verzollung: 0, // Keine separate Verzollung mehr (in Transport enthalten)
     gesamt: vorlaufzeitGesamt
  };

  const avgActualDuration = bestellungen.length > 0 
    ? bestellungen.reduce((sum, b) => sum + daysBetween(b.bestelldatum, b.tatsaechlicheAnkunft || b.erwarteteAnkunft), 0) / bestellungen.length
    : vorlaufzeitGesamt;

  if (avgActualDuration > vorlaufzeitGesamt) {
     durchlaufzeitBreakdown.transport += (avgActualDuration - vorlaufzeitGesamt);
     durchlaufzeitBreakdown.gesamt = avgActualDuration;
  }
  
  const lagerbestandswert = Object.values(lagerbestaende).reduce((sum, l) => sum + l.bestand, 0)
  const jahresproduktion = produktionsauftraege.reduce((sum, a) => sum + a.tatsaechlicheMenge, 0)
  const lagerumschlag = lagerbestandswert > 0 ? jahresproduktion / lagerbestandswert : 0
  
  const gesamtAbweichung = produktionsauftraege.reduce((sum, a) => sum + Math.abs(a.tatsaechlicheMenge - a.geplanteMenge), 0)
  const gesamtPlan = produktionsauftraege.reduce((sum, a) => sum + a.geplanteMenge, 0)
  const forecastAccuracy = gesamtPlan > 0 ? Math.max(0, 100 - (gesamtAbweichung / gesamtPlan) * 100) : 100
  
  const materialVerfuegbarTage = produktionsauftraege.filter(a => !a.materialmangel || a.materialmangel.length === 0).length
  const materialverfuegbarkeit = produktionsauftraege.length > 0 ? (materialVerfuegbarTage / produktionsauftraege.length) * 100 : 100
  
  const durchschnittProTag = produktionsauftraege.length > 0 ? jahresproduktion / produktionsauftraege.length : 0
  const lagerreichweite = durchschnittProTag > 0 ? lagerbestandswert / durchschnittProTag : 0
  
  return {
    planerfuellungsgrad,
    liefertreueChina,
    deliveryPerformance,
    durchlaufzeitProduktion,
    lagerumschlag,
    forecastAccuracy,
    durchlaufzeitBreakdown, // Added here
    produktionsflexibilitaet: planerfuellungsgrad,
    materialverfuegbarkeit,
    lagerreichweite,
    kapitalbindung: lagerreichweite,
    gesamtproduktion: jahresproduktion,
    produktionstage: produktionsauftraege.filter(a => a.tatsaechlicheMenge > 0).length,
    durchschnittProTag,
    auslastung: planerfuellungsgrad
  }
}

/**
 * ========================================
 * LAGERBESTANDS-BERECHNUNG
 * ========================================
 */

export interface LagerbestandInfo {
  komponente: string
  bauteilId: string
  bestand: number
  sicherheit: number
  bedarf: number
  verwendung: string
  status: 'ok' | 'niedrig' | 'kritisch'
  jahresbedarf: number
}

export function berechneLagerbestaende(
  konfiguration: KonfigurationData
): LagerbestandInfo[] {
  const variantenProduktion: Record<string, number> = {}
  konfiguration.varianten.forEach(v => {
    variantenProduktion[v.id] = Math.round(konfiguration.jahresproduktion * v.anteilPrognose)
  })
  
  const komponentenBedarf: Record<string, {
    jahresbedarf: number
    verwendung: string[]
    name: string
  }> = {}
  
  konfiguration.bauteile.forEach(bauteil => {
    komponentenBedarf[bauteil.id] = {
      jahresbedarf: 0,
      verwendung: [],
      name: bauteil.name
    }
  })
  
  konfiguration.stueckliste.forEach(position => {
    const produktion = variantenProduktion[position.mtbVariante] || 0
    const bedarf = produktion * position.menge
    
    if (komponentenBedarf[position.bauteilId]) {
      komponentenBedarf[position.bauteilId].jahresbedarf += bedarf
      const variante = konfiguration.varianten.find(v => v.id === position.mtbVariante)
      if (variante) {
        komponentenBedarf[position.bauteilId].verwendung.push(variante.name)
      }
    }
  })
  
  const lagerbestaende: LagerbestandInfo[] = []
  
  Object.entries(komponentenBedarf).forEach(([bauteilId, info]) => {
    if (info.jahresbedarf === 0) return 
    
    const tagesbedarf = Math.round(info.jahresbedarf / 365)
    const sicherheit = Math.round(info.jahresbedarf / 365 * 7)
    const bestand = Math.round(info.jahresbedarf * 0.35) 
    
    let status: 'ok' | 'niedrig' | 'kritisch' = 'ok'
    if (bestand < sicherheit) {
      status = 'kritisch'
    } else if (bestand < sicherheit * 2) {
      status = 'niedrig'
    }
    
    lagerbestaende.push({
      komponente: info.name,
      bauteilId,
      bestand,
      sicherheit,
      bedarf: tagesbedarf,
      verwendung: info.verwendung.join(', '),
      status,
      jahresbedarf: info.jahresbedarf
    })
  })
  
  return lagerbestaende.sort((a, b) => a.komponente.localeCompare(b.komponente))
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEPRECATED: berechneTagesLagerbestaende (OLD BROKEN VERSION)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ DIESE FUNKTION ENTHÄLT KRITISCHE LOGIK-FEHLER:
 * 
 * ❌ Unrealistische tägliche Lieferungen (tagesbedarf * 1.1)
 *    - Ignoriert 500-Stück Losgrößen
 *    - Ignoriert 49-Tage Vorlaufzeit
 *    - Ignoriert Spring Festival
 * 
 * ❌ Material-Verbrauch ab Tag 1 ohne Lieferung
 *    - Keine Prüfung ob erste Lieferung rechtzeitig ankommt
 * 
 * ❌ Math.max(0, ...) maskiert negative Bestände
 *    - Keine ATP-Checks
 *    - Stille Unterdrückung von Engpässen
 * 
 * ✅ NEUE FUNKTION: berechneIntegriertesWarehouse()
 *    in warehouse-management.ts
 * 
 * Diese Funktion bleibt für Backward-Compatibility, wird aber als
 * DEPRECATED markiert. Bitte berechneIntegriertesWarehouse() verwenden!
 */

export interface TagesLagerbestand {
  tag: number
  datum: Date
  wochentag: string
  monat: number
  istArbeitstag: boolean
  bauteile: {
    bauteilId: string
    bauteilName: string
    anfangsBestand: number
    zugang: number          
    verbrauch: number       
    endBestand: number      
    sicherheit: number
    verfuegbar: number      
    reichweite: number      
    status: 'ok' | 'niedrig' | 'kritisch'
  }[]
}

/**
 * @deprecated BITTE VERWENDEN: berechneIntegriertesWarehouse() aus warehouse-management.ts
 * 
 * Diese Funktion enthält bekannte Logik-Fehler und wird nur für
 * Backward-Compatibility beibehalten.
 */
export function berechneTagesLagerbestaende(
  konfiguration: KonfigurationData,
  tagesProduktion: TagesProduktionEntry[]
): TagesLagerbestand[] {
  // Only log deprecation warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(`
      ⚠️⚠️⚠️ WARNUNG: berechneTagesLagerbestaende() ist DEPRECATED! ⚠️⚠️⚠️
      
      Diese Funktion enthält kritische Logik-Fehler:
      - Unrealistische tägliche Lieferungen (ignoriert Losgrößen & Vorlaufzeit)
      - Material-Verbrauch ab Tag 1 ohne realistische Lieferungen
      - Math.max(0) maskiert negative Bestände
      
      Bitte verwenden Sie stattdessen:
      → berechneIntegriertesWarehouse() aus warehouse-management.ts
      
      Diese neue Funktion behebt ALLE bekannten Fehler:
      ✅ Realistische lot-basierte Lieferungen (500 Stück, 49 Tage)
      ✅ ATP-Checks vor Verbrauch
      ✅ Vollständige OEM-Inbound-Warehouse Integration
    `)
  }
  
  const variantenProduktion: Record<string, number> = {}
  konfiguration.varianten.forEach(v => {
    variantenProduktion[v.id] = Math.round(konfiguration.jahresproduktion * v.anteilPrognose)
  })
  
  const bauteilBedarfe: Record<string, {
    jahresbedarf: number
    tagesbedarf: number
    name: string
  }> = {}
  
  konfiguration.bauteile.forEach(bauteil => {
    bauteilBedarfe[bauteil.id] = {
      jahresbedarf: 0,
      tagesbedarf: 0,
      name: bauteil.name
    }
  })
  
  konfiguration.stueckliste.forEach(position => {
    const produktion = variantenProduktion[position.mtbVariante] || 0
    const bedarf = produktion * position.menge
    if (bauteilBedarfe[position.bauteilId]) {
      bauteilBedarfe[position.bauteilId].jahresbedarf += bedarf
    }
  })
  
  Object.keys(bauteilBedarfe).forEach(bauteilId => {
    const info = bauteilBedarfe[bauteilId]
    info.tagesbedarf = Math.round(info.jahresbedarf / 365)
  })
  
  const aktuelleBestaende: Record<string, number> = {}
  Object.keys(bauteilBedarfe).forEach(bauteilId => {
    const jahresbedarf = bauteilBedarfe[bauteilId].jahresbedarf
    // Start mit 0 Bestand (realistisch)
    aktuelleBestaende[bauteilId] = 0
  })
  
  const result: TagesLagerbestand[] = []
  
  tagesProduktion.forEach((tag, index) => {
    const bauteileStatus: TagesLagerbestand['bauteile'] = []
    
    konfiguration.bauteile.forEach(bauteil => {
      const bauteilId = bauteil.id
      const info = bauteilBedarfe[bauteilId]
      
      if (!info || info.jahresbedarf === 0) return
      
      const anfangsBestand = aktuelleBestaende[bauteilId]
      // ❌ FEHLER: Tägliche Lieferungen sind unrealistisch!
      // Sollte lot-basiert sein (500 Stück, 49 Tage Vorlauf)
      const zugang = tag.istArbeitstag ? Math.round(info.tagesbedarf * 1.1) : 0
      
      let verbrauch = 0
      konfiguration.stueckliste.forEach(position => {
        if (position.bauteilId === bauteilId) {
          const varianteProduktion = variantenProduktion[position.mtbVariante] || 0
          const anteilAnTagesproduktion = tag.istMenge / konfiguration.jahresproduktion
          verbrauch += Math.round(varianteProduktion * anteilAnTagesproduktion * position.menge)
        }
      })
      
      // ❌ FEHLER: Math.max(0) maskiert negative Bestände!
      // Sollte ATP-Check durchführen und Fehler werfen
      const endBestand = Math.max(0, anfangsBestand + zugang - verbrauch)
      aktuelleBestaende[bauteilId] = endBestand
      
      const sicherheit = Math.round(info.tagesbedarf * 7)
      const verfuegbar = Math.max(0, endBestand - sicherheit)
      const reichweite = info.tagesbedarf > 0 ? verfuegbar / info.tagesbedarf : 999
      
      // ❌ FEHLER: Status ist nur Warnung, verhindert keine Produktion
      let status: 'ok' | 'niedrig' | 'kritisch' = 'ok'
      if (endBestand < sicherheit || reichweite < 7) {
        status = 'kritisch'
      } else if (reichweite < 14) {
        status = 'niedrig'
      }
      
      bauteileStatus.push({
        bauteilId,
        bauteilName: info.name,
        anfangsBestand,
        zugang,
        verbrauch,
        endBestand,
        sicherheit,
        verfuegbar,
        reichweite,
        status
      })
    })
    
    result.push({
      tag: tag.tag,
      datum: tag.datum,
      wochentag: tag.wochentag,
      monat: tag.monat,
      istArbeitstag: tag.istArbeitstag,
      bauteile: bauteileStatus
    })
  })
  
  return result
}

/**
 * ========================================
 * STATISTIKEN & VISUALISIERUNG
 * ========================================
 */

export function berechneProduktionsStatistiken(tagesProduktion: TagesProduktionEntry[]) {
  const geplant = tagesProduktion.reduce((sum, tag) => sum + tag.planMenge, 0)
  const produziert = tagesProduktion.reduce((sum, tag) => sum + tag.istMenge, 0)
  const arbeitstage = tagesProduktion.filter(tag => tag.istArbeitstag).length
  const schichtenGesamt = tagesProduktion.reduce((sum, tag) => sum + tag.schichten, 0)
  const planerfuellungsgrad = geplant > 0 ? (produziert / geplant) * 100 : 0
  
  const mitMaterialmangel = tagesProduktion.filter(tag => !tag.materialVerfuegbar).length
  
  const auslastungsDurchschnitt = arbeitstage > 0
    ? tagesProduktion
        .filter(tag => tag.istArbeitstag)
        .reduce((sum, tag) => sum + tag.auslastung, 0) / arbeitstage
    : 0
  
  return {
    geplant,
    produziert,
    abweichung: produziert - geplant,
    planerfuellungsgrad: Math.round(planerfuellungsgrad * 100) / 100,
    arbeitstage,
    schichtenGesamt,
    mitMaterialmangel,
    auslastung: Math.round(auslastungsDurchschnitt * 10) / 10
  }
}

export interface RueckstandsDatenpunkt {
  datum: string;
  rueckstand: number; 
  kumulativSoll: number;
  kumulativIst: number;
}



/**
 * Berechnet den täglichen Produktionsrückstand für Visualisierungen.
 */
export function berechneProduktionsRueckstandTrend(
  tagesProduktion: TagesProduktionEntry[]
): RueckstandsDatenpunkt[] {
  return tagesProduktion.map(tag => ({
    datum: toLocalISODateString(tag.datum),
    rueckstand: (tag.kumulativSoll ?? tag.kumulativPlan) - tag.kumulativIst, 
    kumulativSoll: tag.kumulativSoll ?? tag.kumulativPlan,
    kumulativIst: tag.kumulativIst
  }));
}