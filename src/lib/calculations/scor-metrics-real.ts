/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCOR METRIKEN - 100% REALDATEN-BASIERT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Berechnet 6 aussagekräftige SCOR-Metriken basierend auf echten Daten aus:
 * - OEM Produktionsplanung (zentrale-produktionsplanung.ts)
 * - Inbound Logistik (inbound-china.ts)
 * - Warehouse Management (warehouse-management.ts)
 * 
 * KEINE hardcodierten Werte!
 * KEINE imaginären Daten!
 * 
 * SCOR-Kategorien:
 * 1. RELIABILITY (Zuverlässigkeit) - 2 Metriken
 * 2. RESPONSIVENESS (Reaktionsfähigkeit) - 2 Metriken
 * 3. AGILITY (Flexibilität) - 1 Metrik
 * 4. ASSETS (Anlagenverwaltung) - 1 Metrik
 * 
 * @author WI3 Team - Adventure Works AG
 * @version 3.0 - Kompakte, realdaten-basierte Metriken
 */

import type { KonfigurationData } from '@/contexts/KonfigurationContext'
import type { TagesProduktionEntry } from './zentrale-produktionsplanung'
import type { TaeglicheBestellung } from './inbound-china'
import type { TaeglichesLager } from './warehouse-management'
import { generiereAlleVariantenProduktionsplaene } from './zentrale-produktionsplanung'
import { generiereInboundLieferplan } from './inbound-china'
import { berechneIntegriertesWarehouse } from './warehouse-management'

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * 6 Kern-SCOR-Metriken
 */
export interface SCORMetrikenReal {
  // RELIABILITY (Zuverlässigkeit)
  planerfuellungsgrad: {
    wert: number                    // % der geplanten Produktion erreicht
    kategorie: 'RELIABILITY'
    label: string
    beschreibung: string
    einheit: string
    zielwert: number                // Benchmark
    status: 'gut' | 'mittel' | 'schlecht'
    trend: number                   // +/- % vs. Vormonat
  }
  
  liefertreueChina: {
    wert: number                    // % pünktliche Lieferungen
    kategorie: 'RELIABILITY'
    label: string
    beschreibung: string
    einheit: string
    zielwert: number
    status: 'gut' | 'mittel' | 'schlecht'
    trend: number
  }
  
  // RESPONSIVENESS (Reaktionsfähigkeit)
  durchlaufzeit: {
    wert: number                    // Tage (Bestellung → Materialverfügbarkeit)
    kategorie: 'RESPONSIVENESS'
    label: string
    beschreibung: string
    einheit: string
    zielwert: number
    status: 'gut' | 'mittel' | 'schlecht'
    trend: number
  }
  
  planungsgenauigkeit: {
    wert: number                    // % (100% = perfekt)
    kategorie: 'RESPONSIVENESS'
    label: string
    beschreibung: string
    einheit: string
    zielwert: number
    status: 'gut' | 'mittel' | 'schlecht'
    trend: number
  }
  
  // AGILITY (Flexibilität)
  materialverfuegbarkeit: {
    wert: number                    // % ATP-Checks erfolgreich
    kategorie: 'AGILITY'
    label: string
    beschreibung: string
    einheit: string
    zielwert: number
    status: 'gut' | 'mittel' | 'schlecht'
    trend: number
  }
  
  // ASSETS (Anlagenverwaltung)
  lagerreichweite: {
    wert: number                    // Tage
    kategorie: 'ASSETS'
    label: string
    beschreibung: string
    einheit: string
    zielwert: number
    status: 'gut' | 'mittel' | 'schlecht'
    trend: number
  }
}

/**
 * Zeitreihen-Daten für Visualisierungen
 */
export interface SCORZeitreihen {
  // Pro Metrik: Wöchentliche Aggregate für Charts
  planerfuellungWoechentlich: Array<{
    kalenderwoche: number
    jahr: number
    planMenge: number
    istMenge: number
    erfuellungsgrad: number
    tageErfuellt: number
    tageGesamt: number
  }>
  
  liefertreueLieferungen: Array<{
    bestellungId: string
    bestelldatum: string
    erwarteteAnkunft: string
    tatsaechlicheAnkunft?: string
    menge: number
    vorlaufzeitTage: number
    puenktlich: boolean
    verspaetungTage?: number
  }>
  
  durchlaufzeitDetails: {
    komponenten: Array<{
      name: string
      tage: number
      typ: 'arbeitstage' | 'kalendertage'
      beschreibung: string
    }>
    woechentlich: Array<{
      kalenderwoche: number
      jahr: number
      min: number
      durchschnitt: number
      max: number
      anzahlLieferungen: number
    }>
  }
  
  planungsgenauigkeitWoechentlich: Array<{
    kalenderwoche: number
    jahr: number
    planMenge: number
    istMenge: number
    abweichung: number
    genauigkeit: number
  }>
  
  materialverfuegbarkeitMonatlich: Array<{
    monat: number
    monatName: string
    tageErfuellt: number
    tageGesamt: number
    erfuellungsrate: number
    kritischeTage: number
  }>
  
  lagerreichweiteMonatlich: Array<{
    monat: number
    monatName: string
    durchschnittBestand: number
    durchschnittVerbrauch: number
    reichweiteTage: number
    varianten: Record<string, number> // Reichweite pro Variante
  }>
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HAUPTFUNKTION: BERECHNE ALLE SCOR-METRIKEN
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Berechnet alle 6 SCOR-Metriken plus Zeitreihen-Daten für Visualisierungen
 * 
 * WICHTIG: Nutzt AUSSCHLIESSLICH Daten aus:
 * 1. OEM Produktionsplanung (generiereAlleVariantenProduktionsplaene)
 * 2. Inbound Bestellungen (generiereTaeglicheBestellungen)
 * 3. Warehouse Management (berechneIntegriertesWarehouse)
 * 
 * @param konfiguration - Konfiguration aus KonfigurationContext
 * @returns SCOR-Metriken + Zeitreihen-Daten
 */
export function berechneSCORMetrikenReal(
  konfiguration: KonfigurationData
): { metriken: SCORMetrikenReal; zeitreihen: SCORZeitreihen } {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: ECHTE DATEN BERECHNEN (OEM → Inbound → Warehouse)
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('📊 Berechne SCOR-Metriken aus Realdaten...')
  
  // 1.1 OEM Produktionsplanung (EINZIGE Berechnungsbasis!)
  const alleProduktionsplaene = generiereAlleVariantenProduktionsplaene(konfiguration)
  
  // Extrahiere alle Tageseinträge für Aggregationen
  const alleTagesEintraege: TagesProduktionEntry[] = []
  Object.values(alleProduktionsplaene).forEach(plan => {
    alleTagesEintraege.push(...plan.tage)
  })
  
  // Transformiere zu Format für generiereInboundLieferplan (nur tage-Array)
  const produktionsplaeneArray: Record<string, any[]> = {}
  Object.entries(alleProduktionsplaene).forEach(([key, plan]) => {
    produktionsplaeneArray[key] = plan.tage
  })
  
  // Transformiere zu Format für berechneIntegriertesWarehouse (mit tage-Property)
  const produktionsplaeneObj: Record<string, { tage: TagesProduktionEntry[] }> = {}
  Object.entries(alleProduktionsplaene).forEach(([key, plan]) => {
    produktionsplaeneObj[key] = { tage: plan.tage }
  })
  
  // ✅ KRITISCHER FIX: Erstelle Stücklisten-Map aus KonfigurationContext
  // Ohne diese Map werden keine Bestellungen generiert!
  const stuecklistenMap: Record<string, { komponenten: Record<string, { name: string; menge: number; einheit: string }> }> = {}
  konfiguration.stueckliste.forEach(s => {
    if (!stuecklistenMap[s.mtbVariante]) {
      stuecklistenMap[s.mtbVariante] = { komponenten: {} }
    }
    stuecklistenMap[s.mtbVariante].komponenten[s.bauteilId] = {
      name: s.bauteilName,
      menge: s.menge,
      einheit: s.einheit
    }
  })
  
  // 1.2 Inbound Bestellungen (basierend auf OEM) - MIT HAFENLOGISTIK!
  const inboundResult = generiereInboundLieferplan(
    produktionsplaeneArray,
    konfiguration.planungsjahr || 2027,
    konfiguration.lieferant?.gesamtVorlaufzeitTage || 49,
    konfiguration.feiertage, // Feiertage aus Konfiguration
    stuecklistenMap, // Stückliste aus Konfiguration - KRITISCH!
    konfiguration.lieferant?.losgroesse || 500
  )
  
  const alleBestellungen = inboundResult.bestellungen
  
  // 1.3 Warehouse Management (basierend auf OEM + Inbound)
  const warehouse = berechneIntegriertesWarehouse(
    konfiguration,
    produktionsplaeneObj,
    alleBestellungen // Übergebe die generierten Bestellungen aus Hafenlogistik
  )
  
  console.log(`✓ Basis-Daten: ${alleTagesEintraege.length} Produktionstage, ${alleBestellungen.length} Bestellungen, ${warehouse.tage.length} Lagertage`)
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: METRIK 1 - PLANERFÜLLUNGSGRAD (RELIABILITY)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const produktionstage = alleTagesEintraege.filter(t => t.istArbeitstag)
  const tageErfuellt = produktionstage.filter(t => t.istMenge === t.planMenge).length
  const planerfuellungsgrad_wert = produktionstage.length > 0
    ? (tageErfuellt / produktionstage.length) * 100
    : 100
  
  // ✅ KORREKTUR: Wöchentliche statt monatliche Aggregate
  const planerfuellungWoechentlich = aggregiereWoechentlichePlanerfuellung(alleTagesEintraege)
  
  const planerfuellungsgrad = {
    wert: planerfuellungsgrad_wert,
    kategorie: 'RELIABILITY' as const,
    label: 'Planerfüllungsgrad',
    beschreibung: 'Prozentsatz der Tage, an denen die geplante Produktionsmenge exakt erreicht wurde',
    einheit: '%',
    zielwert: 95,
    status: planerfuellungsgrad_wert >= 95 ? 'gut' as const : 
            planerfuellungsgrad_wert >= 85 ? 'mittel' as const : 'schlecht' as const,
    trend: berechneTrend(planerfuellungWoechentlich)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: METRIK 2 - LIEFERTREUE CHINA (RELIABILITY)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // ✅ KORREKTE BERECHNUNG: 
  // verfuegbarAb ist +1 Tag nach erwarteteAnkunft (Materialverarbeitung)
  // Daher müssen wir erwartete Verfügbarkeit berechnen: Bestelldatum + Vorlaufzeit + 1 Tag
  const vorlaufzeitTage = konfiguration.lieferant?.gesamtVorlaufzeitTage || 49
  
  const lieferungenMitAnkunft = alleBestellungen.filter(b => b.verfuegbarAb)
  const puenktlicheLieferungen = lieferungenMitAnkunft.filter(b => {
    // Berechne erwartete Verfügbarkeit: Bestelldatum + Vorlaufzeit (49 Tage)
    // erwarteteAnkunft ist bereits die Ankunft am Werk, verfuegbarAb sollte 1 Tag später sein
    // Pünktlich wenn verfuegbarAb <= erwarteteAnkunft + 1 Tag
    const verfuegbar = new Date(b.verfuegbarAb!)
    const erwarteteVerfuegbarkeit = new Date(b.erwarteteAnkunft)
    erwarteteVerfuegbarkeit.setDate(erwarteteVerfuegbarkeit.getDate() + 1) // +1 Tag für Materialverarbeitung
    
    return verfuegbar <= erwarteteVerfuegbarkeit
  }).length
  
  const liefertreue_wert = lieferungenMitAnkunft.length > 0
    ? (puenktlicheLieferungen / lieferungenMitAnkunft.length) * 100
    : 100
  
  // Timeline-Daten - ALLE Bestellungen anzeigen (nicht nur erste 50!)
  const liefertreueLieferungen = alleBestellungen.map(b => {
    const gesamtMenge = Object.values(b.komponenten).reduce((sum, m) => sum + m, 0)
    const verfuegbar = b.verfuegbarAb ? new Date(b.verfuegbarAb) : null
    const erwarteteVerfuegbarkeit = new Date(b.erwarteteAnkunft)
    erwarteteVerfuegbarkeit.setDate(erwarteteVerfuegbarkeit.getDate() + 1) // +1 Tag für Materialverarbeitung
    
    return {
      bestellungId: b.id,
      bestelldatum: b.bestelldatum.toISOString().split('T')[0],
      erwarteteAnkunft: b.erwarteteAnkunft.toISOString().split('T')[0],
      tatsaechlicheAnkunft: verfuegbar ? verfuegbar.toISOString().split('T')[0] : undefined,
      menge: gesamtMenge,
      vorlaufzeitTage: vorlaufzeitTage,
      puenktlich: verfuegbar ? verfuegbar <= erwarteteVerfuegbarkeit : true,
      verspaetungTage: verfuegbar ? Math.max(0, Math.floor((verfuegbar.getTime() - erwarteteVerfuegbarkeit.getTime()) / 86400000)) : undefined
    }
  })
  
  // Berechne monatliche Liefertreue für Trend
  const monatlicheLiefertreue = berechneMonatlicheLiefertreue(liefertreueLieferungen)

  const liefertreueChina = {
    wert: liefertreue_wert,
    kategorie: 'RELIABILITY' as const,
    label: 'Liefertreue China',
    beschreibung: 'Prozentsatz der Lieferungen, die pünktlich ankamen (verfügbar innerhalb erwarteter Zeit)',
    einheit: '%',
    zielwert: 95,
    status: liefertreue_wert >= 95 ? 'gut' as const :
            liefertreue_wert >= 85 ? 'mittel' as const : 'schlecht' as const,
    trend: berechneTrend(monatlicheLiefertreue)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: METRIK 3 - DURCHLAUFZEIT (RESPONSIVENESS)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Durchlaufzeit = Durchschnittliche Zeit von Bestellung bis Materialverfügbarkeit
  const durchlaufzeiten = alleBestellungen
    .filter(b => b.verfuegbarAb)
    .map(b => {
      const bestellung = new Date(b.bestelldatum)
      const verfuegbar = new Date(b.verfuegbarAb!)
      return Math.floor((verfuegbar.getTime() - bestellung.getTime()) / 86400000)
    })
  
  // Fallback auf konfigurierten Sollwert falls keine Bestellungen vorhanden
  const sollVorlaufzeit = konfiguration.lieferant?.gesamtVorlaufzeitTage || 49
  
  const durchlaufzeit_wert = durchlaufzeiten.length > 0
    ? durchlaufzeiten.reduce((sum, d) => sum + d, 0) / durchlaufzeiten.length
    : sollVorlaufzeit
  
  // Breakdown und monatliche Daten - ✅ DYNAMISCH AUS KONFIGURATIONCONTEXT
  // Lade Durchlaufzeit-Komponenten aus der transportSequenz, um Konfigurierbarkeit zu ermöglichen
  const transportSequenz = konfiguration.lieferant?.transportSequenz || []
  
  /**
   * Generiert einen lesbaren Namen für einen Transport-Schritt
   */
  const generiereSchrittName = (schritt: typeof transportSequenz[0]): string => {
    switch (schritt.typ) {
      case 'Seefracht':
        return `${schritt.von} → ${schritt.nach}`
      case 'LKW':
        return `LKW-Transport ${schritt.von} → ${schritt.nach}`
      case 'Produktion':
        return 'Auftragsverarbeitung China'
      default:
        return `${schritt.typ} ${schritt.von}`
    }
  }
  
  const durchlaufzeitDetails = {
    komponenten: transportSequenz
      .filter(s => s.dauer > 0) // Nur Schritte mit Dauer
      .map(s => ({
        name: generiereSchrittName(s),
        tage: s.dauer,
        typ: s.einheit === 'KT' ? 'kalendertage' as const : 'arbeitstage' as const,
        beschreibung: s.beschreibung
      })),
    woechentlich: aggregiereWoechentlicheDurchlaufzeit(alleBestellungen)
  }
  
  const durchlaufzeit = {
    wert: durchlaufzeit_wert,
    kategorie: 'RESPONSIVENESS' as const,
    label: 'Durchlaufzeit Supply Chain',
    beschreibung: 'Durchschnittliche Zeit von Bestellung bis Materialverfügbarkeit im Lager',
    einheit: 'Tage',
    zielwert: sollVorlaufzeit, // ✅ DYNAMISCH aus KonfigurationContext
    status: durchlaufzeit_wert <= sollVorlaufzeit + 2 ? 'gut' as const :
            durchlaufzeit_wert <= sollVorlaufzeit + 7 ? 'mittel' as const : 'schlecht' as const,
    trend: berechneTrend(durchlaufzeitDetails.woechentlich)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: METRIK 4 - PLANUNGSGENAUIGKEIT (RESPONSIVENESS)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const gesamtPlan = alleTagesEintraege.reduce((sum, t) => sum + t.planMenge, 0)
  const gesamtIst = alleTagesEintraege.reduce((sum, t) => sum + t.istMenge, 0)
  const gesamtAbweichung = Math.abs(gesamtPlan - gesamtIst)
  
  const planungsgenauigkeit_wert = gesamtPlan > 0
    ? Math.max(0, 100 - (gesamtAbweichung / gesamtPlan) * 100)
    : 100
  
  // ✅ KORREKTUR: Wöchentliche statt monatliche Aggregate
  const planungsgenauigkeitWoechentlich = aggregiereWoechentlichePlanungsgenauigkeit(alleTagesEintraege)
  
  const planungsgenauigkeit = {
    wert: planungsgenauigkeit_wert,
    kategorie: 'RESPONSIVENESS' as const,
    label: 'Planungsgenauigkeit',
    beschreibung: 'Übereinstimmung zwischen geplanter und tatsächlicher Produktionsmenge',
    einheit: '%',
    zielwert: 98,
    status: planungsgenauigkeit_wert >= 98 ? 'gut' as const :
            planungsgenauigkeit_wert >= 95 ? 'mittel' as const : 'schlecht' as const,
    trend: berechneTrend(planungsgenauigkeitWoechentlich)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: METRIK 5 - MATERIALVERFÜGBARKEIT (AGILITY)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // ATP-Checks aus Warehouse-Daten
  const alleLagerTage = warehouse.tage
  const arbeitstageImLager = alleLagerTage.filter(t => t.istArbeitstag)
  
  // Zähle Tage mit erfolgreichen ATP-Checks (alle Bauteile verfügbar)
  const tageAlleVerfuegbar = arbeitstageImLager.filter(tag => {
    return tag.bauteile.every(b => b.atpCheck.erfuellt)
  }).length
  
  const materialverfuegbarkeit_wert = arbeitstageImLager.length > 0
    ? (tageAlleVerfuegbar / arbeitstageImLager.length) * 100
    : 100
  
  const materialverfuegbarkeitMonatlich = aggregiereMonatlicheMaterialverfuegbarkeit(alleLagerTage)
  
  const materialverfuegbarkeit = {
    wert: materialverfuegbarkeit_wert,
    kategorie: 'AGILITY' as const,
    label: 'Material-Verfügbarkeit',
    beschreibung: 'Prozentsatz der Arbeitstage, an denen alle benötigten Bauteile verfügbar waren (ATP-Check erfolgreich)',
    einheit: '%',
    zielwert: 95,
    status: materialverfuegbarkeit_wert >= 95 ? 'gut' as const :
            materialverfuegbarkeit_wert >= 85 ? 'mittel' as const : 'schlecht' as const,
    trend: berechneTrend(materialverfuegbarkeitMonatlich)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7: METRIK 6 - LAGERREICHWEITE (ASSETS)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Durchschnittliche Lagerreichweite über alle Bauteile und Tage
  const reichweiten = alleLagerTage
    .filter(t => t.bauteile.length > 0)
    .map(tag => {
      const tagReichweite = tag.bauteile
        .map(b => b.reichweiteTage)
        .filter(r => r > 0 && r < 999) // Ignoriere extreme Werte
      
      return tagReichweite.length > 0
        ? tagReichweite.reduce((sum, r) => sum + r, 0) / tagReichweite.length
        : 0
    })
    .filter(r => r > 0)
  
  const lagerreichweite_wert = reichweiten.length > 0
    ? reichweiten.reduce((sum, r) => sum + r, 0) / reichweiten.length
    : 0
  
  const lagerreichweiteMonatlich = aggregiereMonatlicheLagerreichweite(alleLagerTage, konfiguration)
  
  const lagerreichweite = {
    wert: lagerreichweite_wert,
    kategorie: 'ASSETS' as const,
    label: 'Lagerreichweite',
    beschreibung: 'Durchschnittliche Anzahl Tage, für die der aktuelle Lagerbestand bei normalem Verbrauch ausreicht',
    einheit: 'Tage',
    zielwert: 1, // ✅ 1 Tag Ziel - Material soll schnellstmöglich verbraucht werden (Just-in-Time)
    status: lagerreichweite_wert <= 2 ? 'gut' as const : // 0-2 Tage = optimal für JIT
            lagerreichweite_wert <= 5 ? 'mittel' as const : 'schlecht' as const,
    trend: berechneTrend(lagerreichweiteMonatlich)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN: METRIKEN + ZEITREIHEN
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('✓ SCOR-Metriken berechnet!')
  
  return {
    metriken: {
      planerfuellungsgrad,
      liefertreueChina,
      durchlaufzeit,
      planungsgenauigkeit,
      materialverfuegbarkeit,
      lagerreichweite
    },
    zeitreihen: {
      planerfuellungWoechentlich,
      liefertreueLieferungen,
      durchlaufzeitDetails,
      planungsgenauigkeitWoechentlich,
      materialverfuegbarkeitMonatlich,
      lagerreichweiteMonatlich
    }
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HELPER-FUNKTIONEN: AGGREGATIONEN
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const MONATSNAMEN = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

/**
 * Berechnet monatliche Liefertreue für Trend-Berechnung
 */
function berechneMonatlicheLiefertreue(lieferungen: any[]) {
  const monate: Record<number, any> = {}
  
  // Initialisiere alle 12 Monate
  for (let m = 1; m <= 12; m++) {
    monate[m] = {
      monat: m,
      monatName: MONATSNAMEN[m - 1],
      erfuellungsgrad: 100 // Default 100% wenn keine Lieferungen
    }
  }
  
  // Aggregiere Lieferungen nach Bestellmonat
  lieferungen.forEach(l => {
    const monat = new Date(l.bestelldatum).getMonth() + 1
    if (!monate[monat].gesamt) {
      monate[monat].gesamt = 0
      monate[monat].puenktlich = 0
    }
    monate[monat].gesamt += 1
    if (l.puenktlich) {
      monate[monat].puenktlich += 1
    }
  })
  
  // Berechne Erfüllungsgrad
  return Object.values(monate).map((m: any) => ({
    monat: m.monat,
    monatName: m.monatName,
    erfuellungsgrad: m.gesamt ? (m.puenktlich / m.gesamt) * 100 : 100
  }))
}

function aggregiereMonatlichePlanerfuellung(eintraege: TagesProduktionEntry[]) {
  const monate: Record<number, any> = {}
  
  eintraege.forEach(e => {
    if (!monate[e.monat]) {
      monate[e.monat] = {
        monat: e.monat,
        monatName: MONATSNAMEN[e.monat - 1],
        planMenge: 0,
        istMenge: 0,
        tageErfuellt: 0,
        tageGesamt: 0
      }
    }
    
    if (e.istArbeitstag) {
      monate[e.monat].planMenge += e.planMenge
      monate[e.monat].istMenge += e.istMenge
      monate[e.monat].tageGesamt += 1
      if (e.istMenge === e.planMenge) {
        monate[e.monat].tageErfuellt += 1
      }
    }
  })
  
  return Object.values(monate).map(m => ({
    ...m,
    erfuellungsgrad: m.tageGesamt > 0 ? (m.tageErfuellt / m.tageGesamt) * 100 : 100
  }))
}

/**
 * Aggregiert Durchlaufzeiten monatlich
 * 
 * WICHTIG: Berücksichtigt sowohl Bestellmonat als auch Ankunftsmonat
 * für vollständige Jahresabdeckung (alle 12 Monate müssen Werte haben)
 */
function aggregiereMonatlicheDurchlaufzeit(bestellungen: TaeglicheBestellung[]) {
  // Initialisiere alle 12 Monate mit Standardwerten
  const monate: Record<number, any> = {}
  for (let m = 1; m <= 12; m++) {
    monate[m] = {
      monat: m,
      monatName: MONATSNAMEN[m - 1],
      durchlaufzeiten: [],
      anzahlLieferungen: 0
    }
  }
  
  // Sammle Durchlaufzeiten pro Ankunftsmonat (nicht Bestellmonat!)
  bestellungen.forEach(b => {
    if (!b.verfuegbarAb) return
    
    const ankunftsmonat = new Date(b.verfuegbarAb).getMonth() + 1
    const tage = Math.floor((new Date(b.verfuegbarAb).getTime() - b.bestelldatum.getTime()) / 86400000)
    
    if (monate[ankunftsmonat]) {
      monate[ankunftsmonat].durchlaufzeiten.push(tage)
      monate[ankunftsmonat].anzahlLieferungen += 1
    }
  })
  
  // Berechne Statistiken (mit Fallback auf 49 Tage wenn keine Daten)
  return Object.values(monate).map(m => {
    const zeiten = m.durchlaufzeiten as number[]
    const hatDaten = zeiten.length > 0
    
    return {
      monat: m.monat,
      monatName: m.monatName,
      min: hatDaten ? Math.min(...zeiten) : 49,
      durchschnitt: hatDaten ? zeiten.reduce((a, b) => a + b, 0) / zeiten.length : 49,
      max: hatDaten ? Math.max(...zeiten) : 49,
      anzahlLieferungen: m.anzahlLieferungen
    }
  })
}

/**
 * ✅ NEU: Berechnet wöchentliche Planerfüllung
 */
function aggregiereWoechentlichePlanerfuellung(eintraege: TagesProduktionEntry[]) {
  const wochen: Record<number, any> = {}
  
  eintraege.forEach(e => {
    if (!wochen[e.kalenderwoche]) {
      wochen[e.kalenderwoche] = {
        kalenderwoche: e.kalenderwoche,
        jahr: e.datum.getFullYear(),
        planMenge: 0,
        istMenge: 0,
        tageErfuellt: 0,
        tageGesamt: 0
      }
    }
    
    if (e.istArbeitstag) {
      wochen[e.kalenderwoche].planMenge += e.planMenge
      wochen[e.kalenderwoche].istMenge += e.istMenge
      wochen[e.kalenderwoche].tageGesamt += 1
      if (e.istMenge === e.planMenge) {
        wochen[e.kalenderwoche].tageErfuellt += 1
      }
    }
  })
  
  return Object.values(wochen).map(w => ({
    ...w,
    erfuellungsgrad: w.tageGesamt > 0 ? (w.tageErfuellt / w.tageGesamt) * 100 : 100
  }))
}

/**
 * Hilfsfunktion: Berechnet ISO Kalenderwoche aus Datum
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * ✅ NEU: Aggregiert Durchlaufzeiten wöchentlich
 */
function aggregiereWoechentlicheDurchlaufzeit(bestellungen: TaeglicheBestellung[]) {
  // Bestimme alle Kalenderwochen im Jahr
  const wochen: Record<number, any> = {}
  for (let kw = 1; kw <= 53; kw++) {
    wochen[kw] = {
      kalenderwoche: kw,
      jahr: 2027,
      durchlaufzeiten: [],
      anzahlLieferungen: 0
    }
  }
  
  // Sammle Durchlaufzeiten pro Ankunftswoche (nicht Bestellwoche!)
  bestellungen.forEach(b => {
    if (!b.verfuegbarAb) return
    
    const ankunftsDatum = new Date(b.verfuegbarAb)
    const kw = getWeekNumber(ankunftsDatum)
    const tage = Math.floor((new Date(b.verfuegbarAb).getTime() - b.bestelldatum.getTime()) / 86400000)
    
    if (wochen[kw]) {
      wochen[kw].durchlaufzeiten.push(tage)
      wochen[kw].anzahlLieferungen += 1
    }
  })
  
  // Berechne Statistiken (mit Fallback auf 49 Tage wenn keine Daten)
  return Object.values(wochen).map(w => {
    const zeiten = w.durchlaufzeiten as number[]
    const hatDaten = zeiten.length > 0
    
    return {
      kalenderwoche: w.kalenderwoche,
      jahr: w.jahr,
      min: hatDaten ? Math.min(...zeiten) : 49,
      durchschnitt: hatDaten ? zeiten.reduce((a, b) => a + b, 0) / zeiten.length : 49,
      max: hatDaten ? Math.max(...zeiten) : 49,
      anzahlLieferungen: w.anzahlLieferungen
    }
  })
}

/**
 * ✅ NEU: Aggregiert Planungsgenauigkeit wöchentlich
 */
function aggregiereWoechentlichePlanungsgenauigkeit(eintraege: TagesProduktionEntry[]) {
  const wochen: Record<number, any> = {}
  
  eintraege.forEach(e => {
    if (!wochen[e.kalenderwoche]) {
      wochen[e.kalenderwoche] = {
        kalenderwoche: e.kalenderwoche,
        jahr: e.datum.getFullYear(),
        planMenge: 0,
        istMenge: 0,
        absoluteAbweichung: 0
      }
    }
    
    wochen[e.kalenderwoche].planMenge += e.planMenge
    wochen[e.kalenderwoche].istMenge += e.istMenge
    wochen[e.kalenderwoche].absoluteAbweichung += Math.abs(e.istMenge - e.planMenge)
  })
  
  return Object.values(wochen).map(w => ({
    kalenderwoche: w.kalenderwoche,
    jahr: w.jahr,
    planMenge: w.planMenge,
    istMenge: w.istMenge,
    abweichung: w.planMenge - w.istMenge, // Plan - Ist (für Diagramm)
    genauigkeit: w.planMenge > 0 ? Math.max(0, 100 - (w.absoluteAbweichung / w.planMenge) * 100) : 100
  }))
}

/**
 * Aggregiert Planungsgenauigkeit monatlich
 * 
 * Berechnet für jeden Monat:
 * - Summe Plan-Menge (Soll-Produktion)
 * - Summe Ist-Menge (tatsächliche Produktion nach ATP-Check)
 * - Abweichung = Plan - Ist (kann positiv oder negativ sein)
 * - Genauigkeit = 100% - (|Abweichung| / Plan * 100%)
 */
function aggregiereMonatlichePlanungsgenauigkeit(eintraege: TagesProduktionEntry[]) {
  const monate: Record<number, any> = {}
  
  eintraege.forEach(e => {
    if (!monate[e.monat]) {
      monate[e.monat] = {
        monat: e.monat,
        monatName: MONATSNAMEN[e.monat - 1],
        planMenge: 0,
        istMenge: 0,
        absoluteAbweichung: 0
      }
    }
    
    monate[e.monat].planMenge += e.planMenge
    monate[e.monat].istMenge += e.istMenge
    monate[e.monat].absoluteAbweichung += Math.abs(e.istMenge - e.planMenge)
  })
  
  return Object.values(monate).map(m => ({
    monat: m.monat,
    monatName: m.monatName,
    planMenge: m.planMenge,
    istMenge: m.istMenge,
    abweichung: m.planMenge - m.istMenge, // Plan - Ist (für Diagramm)
    genauigkeit: m.planMenge > 0 ? Math.max(0, 100 - (m.absoluteAbweichung / m.planMenge) * 100) : 100
  }))
}

function aggregiereMonatlicheMaterialverfuegbarkeit(lagerTage: TaeglichesLager[]) {
  const monate: Record<number, any> = {}
  
  lagerTage.forEach(tag => {
    if (!tag.istArbeitstag) return
    
    if (!monate[tag.monat]) {
      monate[tag.monat] = {
        monat: tag.monat,
        monatName: MONATSNAMEN[tag.monat - 1],
        tageErfuellt: 0,
        tageGesamt: 0,
        kritischeTage: 0
      }
    }
    
    const alleVerfuegbar = tag.bauteile.every(b => b.atpCheck.erfuellt)
    const kritisch = tag.bauteile.some(b => b.status === 'kritisch' || b.status === 'negativ')
    
    monate[tag.monat].tageGesamt += 1
    if (alleVerfuegbar) {
      monate[tag.monat].tageErfuellt += 1
    }
    if (kritisch) {
      monate[tag.monat].kritischeTage += 1
    }
  })
  
  return Object.values(monate).map(m => ({
    ...m,
    erfuellungsrate: m.tageGesamt > 0 ? (m.tageErfuellt / m.tageGesamt) * 100 : 100
  }))
}

function aggregiereMonatlicheLagerreichweite(lagerTage: TaeglichesLager[], konfiguration: KonfigurationData) {
  const monate: Record<number, any> = {}
  
  lagerTage.forEach(tag => {
    if (!monate[tag.monat]) {
      monate[tag.monat] = {
        monat: tag.monat,
        monatName: MONATSNAMEN[tag.monat - 1],
        bestaende: [] as number[],
        verbraeuche: [] as number[],
        variantenReichweiten: {} as Record<string, number[]>
      }
    }
    
    // Gesamtbestand und -verbrauch
    const gesamtBestand = tag.bauteile.reduce((sum, b) => sum + b.endBestand, 0)
    const gesamtVerbrauch = tag.bauteile.reduce((sum, b) => sum + b.verbrauch, 0)
    
    monate[tag.monat].bestaende.push(gesamtBestand)
    monate[tag.monat].verbraeuche.push(gesamtVerbrauch)
    
    // Reichweiten pro Variante (basierend auf Sattel-Bauteilen)
    tag.bauteile.forEach(b => {
      if (!monate[tag.monat].variantenReichweiten[b.bauteilId]) {
        monate[tag.monat].variantenReichweiten[b.bauteilId] = []
      }
      if (b.reichweiteTage > 0 && b.reichweiteTage < 999) {
        monate[tag.monat].variantenReichweiten[b.bauteilId].push(b.reichweiteTage)
      }
    })
  })
  
  return Object.values(monate).map(m => {
    const bestaende = m.bestaende as number[]
    const verbraeuche = m.verbraeuche.filter((v: number) => v > 0)
    
    const durchschnittBestand = bestaende.length > 0
      ? bestaende.reduce((a: number, b: number) => a + b, 0) / bestaende.length
      : 0
    
    const durchschnittVerbrauch = verbraeuche.length > 0
      ? verbraeuche.reduce((a: number, b: number) => a + b, 0) / verbraeuche.length
      : 0
    
    const reichweiteTage = durchschnittVerbrauch > 0
      ? durchschnittBestand / durchschnittVerbrauch
      : 0
    
    // Varianten-Reichweiten
    const varianten: Record<string, number> = {}
    Object.entries(m.variantenReichweiten).forEach(([id, reichweiten]) => {
      const arr = reichweiten as number[]
      varianten[id] = arr.length > 0
        ? arr.reduce((a, b) => a + b, 0) / arr.length
        : 0
    })
    
    return {
      monat: m.monat,
      monatName: m.monatName,
      durchschnittBestand,
      durchschnittVerbrauch,
      reichweiteTage,
      varianten
    }
  })
}

function berechneTrend(monatlicheDaten: any[]): number {
  if (monatlicheDaten.length < 2) return 0
  
  // Vergleiche letzten mit vorletztem Monat
  const letzter = monatlicheDaten[monatlicheDaten.length - 1]
  const vorletzter = monatlicheDaten[monatlicheDaten.length - 2]
  
  // Finde passenden Wert-Schlüssel
  const wertKey = letzter.erfuellungsgrad !== undefined ? 'erfuellungsgrad' :
                  letzter.genauigkeit !== undefined ? 'genauigkeit' :
                  letzter.erfuellungsrate !== undefined ? 'erfuellungsrate' :
                  letzter.durchschnitt !== undefined ? 'durchschnitt' :
                  letzter.reichweiteTage !== undefined ? 'reichweiteTage' : null
  
  if (!wertKey) return 0
  
  const diff = letzter[wertKey] - vorletzter[wertKey]
  const basis = vorletzter[wertKey] || 1
  
  return (diff / basis) * 100
}
