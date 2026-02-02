/**
 * ========================================
 * BEDARFS-BACKLOG-RECHNUNG
 * ========================================
 * 
 * Kernlogik für Losgrößen-basierte Bestellungen mit Backlog-Tracking
 * 
 * KONZEPT:
 * 1. OEM produziert täglich Bikes → Sattel-Bedarf entsteht (1 Sattel = 1 Bike)
 * 2. Bestellungen erfolgen in Losgrößen (500 Stück minimum)
 * 3. Wenn Bedarf < Losgröße → Backlog akkumulieren
 * 4. Wenn Backlog + Bedarf ≥ Losgröße → Bestellung auslösen
 * 5. Material trifft nach 49 Tagen ein (Vorlaufzeit)
 * 6. Produktion kann nur erfolgen wenn Material verfügbar ist
 * 
 * BEISPIEL:
 * - Tag 1: Bedarf 740, Backlog 0 → Bestelle 500 → Backlog 240
 * - Tag 2: Bedarf 740, Backlog 240 → Bestelle 500 → Backlog 480
 * - Tag 3: Bedarf 740, Backlog 480 → Bestelle 1000 → Backlog 220
 * - Tag 4: Bedarf 740, Backlog 220 → Bestelle 500 → Backlog 460
 * 
 * ANFORDERUNGEN:
 * - A5: Auftragsverbuchung China (Losgrößen)
 * - A6: Planungs-Vorlaufzeit 49 Tage (fix im KonfigurationContext, tatsächliche Lieferzeit kann abweichen)
 * - A7: Losgröße 500 Sättel
 * - A10: Ende-zu-Ende Supply Chain (Material → Produktion)
 * - A13: Proportionale Allokation bei Engpass (faire Verteilung)
 * 
 * SINGLE SOURCE OF TRUTH: 
 * - KonfigurationContext für alle Parameter
 * - JSON-Dateien für Stammdaten
 */

import type { KonfigurationData } from '@/contexts/KonfigurationContext'
import type { TagesProduktionEntry } from './zentrale-produktionsplanung'
import { addDays, toLocalISODateString } from '@/lib/utils'
import { 
  berechneBestelldatum, 
  berechneAnkunftsdatum,
  istArbeitstag_Deutschland,
  type FeiertagsKonfiguration 
} from '@/lib/kalender'

// ========================================
// TYPEN FÜR BEDARFS-BACKLOG-RECHNUNG
// ========================================

/**
 * Sattel-Komponente (4 Varianten)
 */
export interface SattelKomponente {
  id: string              // z.B. "SAT_FT"
  name: string           // z.B. "Fizik Tundra"
  kategorie: string      // "Sattel"
}

/**
 * Täglicher Bedarf pro Sattel-Komponente
 */
export interface TagesBedarfProKomponente {
  datum: Date
  tag: number           // Tag im Jahr (1-365)
  komponentenId: string
  
  // Bedarf (aus OEM-Produktion)
  bedarf: number        // Anzahl Sättel benötigt (= Bikes produziert)
  
  // Backlog (akkumuliert)
  backlogVorher: number // Backlog zu Beginn des Tages
  backlogNachher: number // Backlog am Ende des Tages
  
  // Bestellung
  bestellungAusgeloest: boolean // Wurde Bestellung ausgelöst?
  bestellmenge: number  // Bestellte Menge (0 wenn keine Bestellung)
  bestellungId?: string // ID der Bestellung (wenn ausgelöst)
  
  // Material-Verfügbarkeit (nach Vorlaufzeit)
  materialAnkunft: number // Material das heute ankommt
  lagerbestand: number  // Aktueller Lagerbestand nach Ankunft
  
  // Tatsächliche Produktion
  verfuegbaresMaterial: number // Material verfügbar für Produktion
  tatsaechlicheProduktion: number // min(Bedarf, verfügbar)
  materialEngpass: boolean // true wenn Bedarf > verfügbar
  abweichung: number    // Bedarf - Produktion (negativ = Fehlmenge)
}

/**
 * Bestellungs-Entry (für Tracking)
 */
export interface BestellungsEntry {
  id: string
  komponentenId: string
  bestelldatum: Date
  bestellmenge: number
  ankunftsdatum: Date
  status: 'geplant' | 'bestellt' | 'unterwegs' | 'geliefert'
  backlogBeimBestellen: number // Wie hoch war Backlog bei Bestellung
  ausloeser: string    // Beschreibung warum bestellt wurde
}

/**
 * Zusammenfassung für eine Komponente über das ganze Jahr
 */
export interface KomponentenJahresUebersicht {
  komponentenId: string
  name: string
  
  // Summenwerte
  gesamtBedarf: number
  gesamtBestellt: number
  gesamtProduziert: number
  gesamtFehlmenge: number
  
  // Statistiken
  tageOhneBestellung: number
  tageMitBestellung: number
  anzahlBestellungen: number
  durchschnittlicheBestellmenge: number
  
  // Backlog
  maxBacklog: number
  durchschnittlicherBacklog: number
  
  // Engpass-Analyse
  tageMitEngpass: number
  engpassQuote: number // % der Tage mit Materialengpass
  
  // Lager
  durchschnittlicherLagerbestand: number
  maxLagerbestand: number
  
  // Details
  tagesDetails: TagesBedarfProKomponente[]
  bestellungen: BestellungsEntry[]
}

/**
 * Gesamt-Ergebnis der Bedarfs-Backlog-Rechnung
 */
export interface BedarfsBacklogErgebnis {
  komponenten: Record<string, KomponentenJahresUebersicht>
  
  // Aggregierte Metriken
  gesamtstatistik: {
    totalBedarf: number
    totalBestellt: number
    totalProduziert: number
    totalFehlmenge: number
    liefertreue: number // % (Produziert / Bedarf)
    engpassQuote: number // % Tage mit Engpass
    durchschnittlicherBacklog: number
    anzahlBestellungen: number
  }
}

// ========================================
// HILFSFUNKTIONEN
// ========================================

/**
 * Generiert eindeutige Bestellungs-ID
 */
let bestellungsCounter = 1
function generiereBestellungsId(komponentenId: string, datum: Date): string {
  const dateStr = toLocalISODateString(datum).replace(/-/g, '')
  const id = `BO-${komponentenId}-${dateStr}-${String(bestellungsCounter++).padStart(3, '0')}`
  return id
}

/**
 * Extrahiert Sattel-Komponenten aus Stückliste
 */
function extrahiereSattelKomponenten(konfiguration: KonfigurationData): SattelKomponente[] {
  const komponenten: SattelKomponente[] = []
  const gesehen = new Set<string>()
  
  // Durchlaufe Stückliste und sammle alle einzigartigen Sattel-Komponenten
  konfiguration.stueckliste.forEach(pos => {
    if (!gesehen.has(pos.bauteilId)) {
      gesehen.add(pos.bauteilId)
      
      const bauteil = konfiguration.bauteile.find(b => b.id === pos.bauteilId)
      if (bauteil && bauteil.kategorie === 'Sattel') {
        komponenten.push({
          id: bauteil.id,
          name: bauteil.name,
          kategorie: bauteil.kategorie
        })
      }
    }
  })
  
  return komponenten
}

/**
 * Berechnet täglichen Bedarf pro Komponente aus Produktionsplänen
 * 
 * @param produktionsplaene - Produktionspläne aller Varianten
 * @param konfiguration - Konfigurationsdaten (für Stückliste)
 * @returns Map: Datum → Komponente → Bedarf
 */
function berechneTageslicherBedarf(
  produktionsplaene: Record<string, TagesProduktionEntry[]>,
  konfiguration: KonfigurationData
): Map<string, Record<string, number>> {
  const bedarfProTag = new Map<string, Record<string, number>>()
  
  // Initialisiere für alle 365 Tage
  const startDatum = new Date(konfiguration.planungsjahr, 0, 1)
  for (let tag = 0; tag < 365; tag++) {
    const datum = addDays(startDatum, tag)
    const datumStr = toLocalISODateString(datum)
    bedarfProTag.set(datumStr, {})
  }
  
  // Durchlaufe alle Varianten und deren Produktionspläne
  Object.entries(produktionsplaene).forEach(([varianteId, tage]) => {
    // Finde Stückliste für diese Variante
    const stlPositionen = konfiguration.stueckliste.filter(s => s.mtbVariante === varianteId)
    
    // Für jeden Produktionstag
    tage.forEach(tagesPlan => {
      const datumStr = toLocalISODateString(tagesPlan.datum)
      const bedarfAmTag = bedarfProTag.get(datumStr) || {}
      
      // ✅ KRITISCHER FIX (Issue #295): Bedarf NUR an Arbeitstagen!
      // An Wochenenden/Feiertagen wird NICHT produziert, daher entsteht auch KEIN Materialbedarf.
      // Dies verhindert, dass der Backlog an Nicht-Arbeitstagen auf-/abgebaut wird.
      if (!tagesPlan.istArbeitstag) {
        // An Nicht-Arbeitstagen: Kein Bedarf (alle Komponenten bleiben 0)
        bedarfProTag.set(datumStr, bedarfAmTag)
        return // Überspringe diesen Tag
      }
      
      // Für jede Komponente in der Stückliste
      stlPositionen.forEach(pos => {
        const aktuellerBedarf = bedarfAmTag[pos.bauteilId] || 0
        
        // Nutze planMenge für Bedarfsberechnung (Bestellungen basieren auf OEM PLAN)
        // Grund: Materialbestellung muss vor Produktion erfolgen
        // Sonst entsteht Zirkelbezug: Bedarf → Bestellung → Material → Produktion → Bedarf
        // 
        // Korrekt: OEM Plant 370.000 → Bestelle für 370.000 → Produziere was möglich ist
        bedarfAmTag[pos.bauteilId] = aktuellerBedarf + (tagesPlan.planMenge * pos.menge)
      })
      
      bedarfProTag.set(datumStr, bedarfAmTag)
    })
  })
  
  return bedarfProTag
}

/**
 * Konvertiert Feiertage aus KonfigurationContext in FeiertagsKonfiguration
 */
function konvertiereFeiertagsKonfiguration(konfiguration: KonfigurationData): FeiertagsKonfiguration[] {
  return konfiguration.feiertage.map(f => ({
    datum: f.datum, // Bleibt String (YYYY-MM-DD Format)
    name: f.name,
    typ: f.typ,
    land: f.land
  }))
}

// ========================================
// HAUPTFUNKTION: BEDARFS-BACKLOG-RECHNUNG
// ========================================

/**
 * 🎯 KERNFUNKTION: Berechnet Bedarfs-Backlog-Rechnung für alle Sattel-Komponenten
 * 
 * Diese Funktion implementiert die Produktionssimulation basierend auf Material-Verfügbarkeit:
 * 
 * NEUE LOGIK (mit Inbound-Integration - EXKLUSIV HAFENLOGISTIK):
 * 1. Berechne täglichen Bedarf aus OEM-Produktionsplänen
 * 2. ✅ PFLICHT: Nutze Material-Lieferungen aus Hafenlogistik (lieferungenAmWerk)
 * 3. Für jeden Tag und jede Komponente:
 *    a) Akkumuliere Bedarf (heutiger + Backlog)
 *    b) Prüfe Material-Ankunft (NUR aus Hafenlogistik!)
 *    c) Berechne tatsächliche Produktion (min(Bedarf, verfügbar))
 *    d) Aktualisiere Lagerbestand und Backlog
 * 4. Berechne Statistiken und Kennzahlen
 * 
 * WICHTIG: 
 * - Bestellung wird NICHT hier durchgeführt (das macht Inbound!)
 * - Diese Funktion fokussiert auf Produktions-Simulation
 * - ✅ KRITISCH: Material-Lieferungen MÜSSEN aus generiereInboundLieferplan() kommen!
 * - KEINE anderen Materialquellen erlaubt (keine simulierten Bestände)
 * 
 * ANFORDERUNG A13: Proportionale Allokation
 * - Bei Engpass faire prozentuale Verteilung auf alle Varianten
 * - Keine Optimierung nach Deckungsbeitrag
 * 
 * @param produktionsplaene - Produktionspläne aller Varianten (aus zentrale-produktionsplanung)
 * @param konfiguration - Konfigurationsdaten (aus KonfigurationContext)
 * @param lieferungenAmWerk - ✅ PFLICHTPARAMETER: Material-Lieferungen aus Hafenlogistik (Date → Component → Amount)
 * @returns BedarfsBacklogErgebnis mit allen Details
 */
export function berechneBedarfsBacklog(
  produktionsplaene: Record<string, TagesProduktionEntry[]>,
  konfiguration: KonfigurationData,
  lieferungenAmWerk: Map<string, Record<string, number>>
): BedarfsBacklogErgebnis {
  // Reset Counter für neue Berechnung
  bestellungsCounter = 1
  
  // Extrahiere Sattel-Komponenten
  const sattelKomponenten = extrahiereSattelKomponenten(konfiguration)
  
  // Berechne täglichen Bedarf aus Produktionsplänen
  const tagesbedarfMap = berechneTageslicherBedarf(produktionsplaene, konfiguration)
  
  // Konvertiere Feiertage für Kalender-Funktionen
  const feiertagsConfig = konvertiereFeiertagsKonfiguration(konfiguration)
  
  // Ergebnis-Struktur
  const ergebnis: BedarfsBacklogErgebnis = {
    komponenten: {},
    gesamtstatistik: {
      totalBedarf: 0,
      totalBestellt: 0,
      totalProduziert: 0,
      totalFehlmenge: 0,
      liefertreue: 0,
      engpassQuote: 0,
      durchschnittlicherBacklog: 0,
      anzahlBestellungen: 0
    }
  }
  
  // Verarbeite jede Sattel-Komponente separat
  sattelKomponenten.forEach(komponente => {
    const komponentenId = komponente.id
    
    // Arrays für Tracking
    const tagesDetails: TagesBedarfProKomponente[] = []
    const bestellungen: BestellungsEntry[] = []
    
    // State-Variablen für diese Komponente
    let produktionsBacklog = 0 // Akkumulierter unerfüllter Produktionsbedarf
    let lagerbestand = 0
    
    // ========================================
    // PHASE 1: BEDARFSPLANUNG (ohne Bestellungen)
    // ========================================
    // Durchlaufe alle 365 Tage und erfasse nur den Bedarf
    const startDatum = new Date(konfiguration.planungsjahr, 0, 1)
    
    for (let tagImJahr = 1; tagImJahr <= 365; tagImJahr++) {
      const datum = addDays(startDatum, tagImJahr - 1)
      const datumStr = toLocalISODateString(datum)
      
      // Hole Bedarf für diesen Tag
      const bedarfAmTag = tagesbedarfMap.get(datumStr)?.[komponentenId] || 0
      
      // Speichere Tages-Details (Phase 1: nur Bedarfserfassung)
      tagesDetails.push({
        datum,
        tag: tagImJahr,
        komponentenId,
        bedarf: bedarfAmTag,
        backlogVorher: 0,
        backlogNachher: 0,
        bestellungAusgeloest: false,
        bestellmenge: 0,
        bestellungId: undefined,
        
        // Material & Produktion werden in Phase 2 berechnet
        materialAnkunft: 0,
        lagerbestand: 0,
        verfuegbaresMaterial: 0,
        tatsaechlicheProduktion: 0,
        materialEngpass: false,
        abweichung: 0
      })
    }
    
    // ========================================
    // PHASE 2: MATERIAL-VERFÜGBARKEIT & PRODUKTION
    // ========================================
    lagerbestand = 0 // Reset Lagerbestand
    produktionsBacklog = 0 // Akkumulierter unerfüllter Produktionsbedarf
    
    tagesDetails.forEach(detail => {
      const datumStr = toLocalISODateString(detail.datum)
      
      // ✅ KRITISCHER FIX (Issue #295): Prüfe ob es ein Arbeitstag ist
      // An Wochenenden und Feiertagen darf KEINE Produktion stattfinden!
      // Daher darf der Backlog an diesen Tagen NICHT abgebaut werden.
      const istArbeitstag = istArbeitstag_Deutschland(detail.datum, feiertagsConfig)
      
      // 1. Material-Ankunft (✅ EXKLUSIV AUS HAFENLOGISTIK!)
      // KRITISCH: Keine anderen Materialquellen erlaubt!
      // Nur was die Hafenlogistik (generiereInboundLieferplan) liefert, ist verfügbar
      const lieferungAmTag = lieferungenAmWerk.get(datumStr)
      const materialAnkunft = lieferungAmTag?.[komponentenId] || 0
      
      detail.materialAnkunft = materialAnkunft
      
      // 2. Lagerbestand aktualisieren (Ankunft)
      lagerbestand += materialAnkunft
      
      // 3. Prüfe verfügbares Material für Produktion
      const verfuegbaresMaterial = lagerbestand
      detail.verfuegbaresMaterial = verfuegbaresMaterial
      
      // ✅ FIX: Backlog für Visualisierung VOR Produktion speichern
      detail.backlogVorher = produktionsBacklog
      
      // 4. ✅ FIX: Produktion NUR an Arbeitstagen!
      if (istArbeitstag) {
        // 4a. Berechne Gesamt-Bedarf (heutiger Bedarf + akkumulierter Produktions-Backlog)
        const gesamtBedarf = detail.bedarf + produktionsBacklog
        
        // 5. Tatsächliche Produktion (min(Gesamt-Bedarf, verfügbar))
        // Versuche sowohl heutigen Bedarf als auch Backlog zu decken
        const tatsaechlicheProduktion = Math.min(gesamtBedarf, verfuegbaresMaterial)
        detail.tatsaechlicheProduktion = tatsaechlicheProduktion
        
        // 6. Aktualisiere Produktions-Backlog
        // Backlog = was wir produzieren wollten - was wir tatsächlich produziert haben
        produktionsBacklog = gesamtBedarf - tatsaechlicheProduktion
        
        // 7. Material-Engpass? (wenn wir nicht alles produzieren konnten)
        detail.materialEngpass = gesamtBedarf > verfuegbaresMaterial
        
        // 8. Abweichung (negativ = Fehlmenge gegenüber heutigem Bedarf)
        detail.abweichung = tatsaechlicheProduktion - detail.bedarf
        
        // 9. Lagerbestand aktualisieren (Verbrauch)
        lagerbestand -= tatsaechlicheProduktion
      } else {
        // ✅ FIX: An Nicht-Arbeitstagen:
        // - Keine Produktion (tatsaechlicheProduktion = 0)
        // - Backlog bleibt unverändert
        // - Kein Material-Verbrauch
        // - Kein Engpass (da keine Produktion erwartet wird)
        detail.tatsaechlicheProduktion = 0
        detail.materialEngpass = false
        detail.abweichung = 0 - detail.bedarf // Sollte 0 sein, da bedarf = 0 an Nicht-Arbeitstagen
        // produktionsBacklog bleibt unverändert (kein Update)
        // lagerbestand bleibt unverändert (kein Verbrauch)
      }
      
      detail.lagerbestand = lagerbestand
      
      // 10. Aktualisiere Backlog-Felder (für Visualisierung)
      detail.backlogNachher = produktionsBacklog
    })
    
    // ========================================
    // PHASE 3: STATISTIKEN BERECHNEN
    // ========================================
    const gesamtBedarf = tagesDetails.reduce((sum, t) => sum + t.bedarf, 0)
    const gesamtProduziert = tagesDetails.reduce((sum, t) => sum + t.tatsaechlicheProduktion, 0)
    const gesamtFehlmenge = gesamtBedarf - gesamtProduziert
    
    // Bestellt-Summe: ✅ EXKLUSIV aus Hafenlogistik (lieferungenAmWerk)
    // Summiere alle tatsächlichen Lieferungen für diese Komponente aus der Hafenlogistik
    let gesamtBestellt = 0
    lieferungenAmWerk.forEach(komponenten => {
      gesamtBestellt += komponenten[komponentenId] || 0
    })
    
    const tageMitBestellung = tagesDetails.filter(t => t.bestellungAusgeloest).length
    const tageOhneBestellung = 365 - tageMitBestellung
    const durchschnittlicheBestellmenge = bestellungen.length > 0 
      ? gesamtBestellt / bestellungen.length 
      : 0
    
    const maxBacklog = tagesDetails.reduce((max, t) => Math.max(max, t.backlogNachher), 0)
    const durchschnittlicherBacklog = tagesDetails.reduce((sum, t) => sum + t.backlogNachher, 0) / 365
    
    const tageMitEngpass = tagesDetails.filter(t => t.materialEngpass).length
    const engpassQuote = (tageMitEngpass / 365) * 100
    
    const durchschnittlicherLagerbestand = tagesDetails.reduce((sum, t) => sum + t.lagerbestand, 0) / 365
    const maxLagerbestand = tagesDetails.reduce((max, t) => Math.max(max, t.lagerbestand), 0)
    
    // Speichere Komponenten-Übersicht
    ergebnis.komponenten[komponentenId] = {
      komponentenId,
      name: komponente.name,
      gesamtBedarf,
      gesamtBestellt,
      gesamtProduziert,
      gesamtFehlmenge,
      tageOhneBestellung,
      tageMitBestellung,
      anzahlBestellungen: bestellungen.length,
      durchschnittlicheBestellmenge,
      maxBacklog,
      durchschnittlicherBacklog,
      tageMitEngpass,
      engpassQuote,
      durchschnittlicherLagerbestand,
      maxLagerbestand,
      tagesDetails,
      bestellungen
    }
    
    // Aktualisiere Gesamtstatistik
    ergebnis.gesamtstatistik.totalBedarf += gesamtBedarf
    ergebnis.gesamtstatistik.totalBestellt += gesamtBestellt
    ergebnis.gesamtstatistik.totalProduziert += gesamtProduziert
    ergebnis.gesamtstatistik.totalFehlmenge += gesamtFehlmenge
    ergebnis.gesamtstatistik.anzahlBestellungen += bestellungen.length
  })
  
  // Berechne aggregierte Metriken
  const anzahlKomponenten = sattelKomponenten.length
  if (anzahlKomponenten > 0) {
    ergebnis.gesamtstatistik.liefertreue = 
      ergebnis.gesamtstatistik.totalBedarf > 0
        ? (ergebnis.gesamtstatistik.totalProduziert / ergebnis.gesamtstatistik.totalBedarf) * 100
        : 100
    
    const alleEngpassQuoten = Object.values(ergebnis.komponenten).map(k => k.engpassQuote)
    ergebnis.gesamtstatistik.engpassQuote = 
      alleEngpassQuoten.reduce((sum, q) => sum + q, 0) / anzahlKomponenten
    
    const alleBacklogs = Object.values(ergebnis.komponenten).map(k => k.durchschnittlicherBacklog)
    ergebnis.gesamtstatistik.durchschnittlicherBacklog = 
      alleBacklogs.reduce((sum, b) => sum + b, 0) / anzahlKomponenten
  }
  
  return ergebnis
}

// ========================================
// HILFSFUNKTIONEN FÜR UI
// ========================================

/**
 * Exportiert Bedarfs-Backlog-Daten für Excel-Export
 */
export function exportiereBedarfsBacklogAlsCSV(
  ergebnis: BedarfsBacklogErgebnis,
  komponentenId: string
): string {
  const komponente = ergebnis.komponenten[komponentenId]
  if (!komponente) {
    throw new Error(`Komponente ${komponentenId} nicht gefunden`)
  }
  
  // CSV-Header
  const header = [
    'Datum',
    'Tag',
    'Bedarf',
    'Backlog Vorher',
    'Backlog Nachher',
    'Bestellung',
    'Bestellmenge',
    'Material Ankunft',
    'Lagerbestand',
    'Verfügbar',
    'Produktion',
    'Engpass',
    'Abweichung'
  ].join(';')
  
  // CSV-Zeilen
  const zeilen = komponente.tagesDetails.map(t => [
    toLocalISODateString(t.datum),
    t.tag,
    t.bedarf,
    t.backlogVorher,
    t.backlogNachher,
    t.bestellungAusgeloest ? 'JA' : '',
    t.bestellmenge || '',
    t.materialAnkunft || '',
    t.lagerbestand,
    t.verfuegbaresMaterial,
    t.tatsaechlicheProduktion,
    t.materialEngpass ? 'JA' : '',
    t.abweichung
  ].join(';'))
  
  return [header, ...zeilen].join('\n')
}

/**
 * Gibt lesbare Zusammenfassung für eine Komponente aus
 */
export function generiereKomponentenZusammenfassung(
  komponente: KomponentenJahresUebersicht
): string {
  return `
📊 KOMPONENTE: ${komponente.name} (${komponente.komponentenId})

📈 MENGEN:
  • Gesamtbedarf: ${komponente.gesamtBedarf.toLocaleString()} Stück
  • Bestellt: ${komponente.gesamtBestellt.toLocaleString()} Stück
  • Produziert: ${komponente.gesamtProduziert.toLocaleString()} Stück
  • Fehlmenge: ${komponente.gesamtFehlmenge.toLocaleString()} Stück

📦 BESTELLUNGEN:
  • Anzahl Bestellungen: ${komponente.anzahlBestellungen}
  • Tage mit Bestellung: ${komponente.tageMitBestellung}
  • Tage ohne Bestellung: ${komponente.tageOhneBestellung}
  • Ø Bestellmenge: ${Math.round(komponente.durchschnittlicheBestellmenge).toLocaleString()} Stück

📉 BACKLOG:
  • Max Backlog: ${komponente.maxBacklog.toLocaleString()} Stück
  • Ø Backlog: ${Math.round(komponente.durchschnittlicherBacklog).toLocaleString()} Stück

⚠️ ENGPÄSSE:
  • Tage mit Engpass: ${komponente.tageMitEngpass} / 365
  • Engpass-Quote: ${komponente.engpassQuote.toFixed(1)}%

🏪 LAGER:
  • Ø Lagerbestand: ${Math.round(komponente.durchschnittlicherLagerbestand).toLocaleString()} Stück
  • Max Lagerbestand: ${komponente.maxLagerbestand.toLocaleString()} Stück
  `.trim()
}

/**
 * Gibt Gesamt-Zusammenfassung aus
 */
export function generiereGesamtZusammenfassung(
  ergebnis: BedarfsBacklogErgebnis
): string {
  const stats = ergebnis.gesamtstatistik
  
  return `
🌍 GESAMT-ÜBERSICHT BEDARFS-BACKLOG-RECHNUNG

📊 MENGEN (Alle Komponenten):
  • Total Bedarf: ${stats.totalBedarf.toLocaleString()} Stück
  • Total Bestellt: ${stats.totalBestellt.toLocaleString()} Stück
  • Total Produziert: ${stats.totalProduziert.toLocaleString()} Stück
  • Total Fehlmenge: ${stats.totalFehlmenge.toLocaleString()} Stück

✅ LIEFERTREUE:
  • ${stats.liefertreue.toFixed(2)}%

📦 BESTELLUNGEN:
  • Anzahl Bestellungen: ${stats.anzahlBestellungen}

📉 BACKLOG:
  • Ø Backlog: ${Math.round(stats.durchschnittlicherBacklog).toLocaleString()} Stück

⚠️ ENGPÄSSE:
  • Ø Engpass-Quote: ${stats.engpassQuote.toFixed(1)}%
  `.trim()
}
