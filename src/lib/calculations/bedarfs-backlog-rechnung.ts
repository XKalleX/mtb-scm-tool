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
 * - A6: Vorlaufzeit 49 Tage korrekt
 * - A7: Losgröße 500 Sättel
 * - A10: Ende-zu-Ende Supply Chain (Material → Produktion)
 * - A13: FCFS-Priorisierung bei Engpass
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
      
      // Für jede Komponente in der Stückliste
      stlPositionen.forEach(pos => {
        const aktuellerBedarf = bedarfAmTag[pos.bauteilId] || 0
        
        // Bedarf = Produktionsmenge * Komponentenmenge
        // (Normalerweise Menge = 1 für Sättel)
        bedarfAmTag[pos.bauteilId] = aktuellerBedarf + (tagesPlan.istMenge * pos.menge)
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
 * Diese Funktion implementiert die vollständige Losgrößen-Logik mit Backlog-Tracking:
 * 
 * ABLAUF:
 * 1. Berechne täglichen Bedarf aus OEM-Produktionsplänen
 * 2. Für jeden Tag und jede Komponente:
 *    a) Akkumuliere Backlog (nicht erfüllter Bedarf)
 *    b) Prüfe ob Losgröße erreicht → Bestellung auslösen
 *    c) Berechne Material-Ankunft (nach 49 Tagen Vorlaufzeit)
 *    d) Berechne tatsächliche Produktion (min(Bedarf, verfügbar))
 * 3. Erstelle Bestellungs-Tracking
 * 4. Berechne Statistiken und Kennzahlen
 * 
 * ANFORDERUNG A7: Losgröße 500 Sättel
 * - Bestellungen nur in Vielfachen von 500
 * - Backlog akkumuliert wenn Losgröße nicht erreicht
 * 
 * ANFORDERUNG A6: Vorlaufzeit 49 Tage
 * - Material trifft nach 49 Tagen ein
 * - Berücksichtigt Feiertage und Spring Festival
 * 
 * ANFORDERUNG A13: FCFS (First-Come-First-Serve)
 * - Älteste Bedarfe werden zuerst erfüllt
 * - Keine Optimierung nach Deckungsbeitrag
 * 
 * @param produktionsplaene - Produktionspläne aller Varianten (aus zentrale-produktionsplanung)
 * @param konfiguration - Konfigurationsdaten (aus KonfigurationContext)
 * @returns BedarfsBacklogErgebnis mit allen Details
 */
export function berechneBedarfsBacklog(
  produktionsplaene: Record<string, TagesProduktionEntry[]>,
  konfiguration: KonfigurationData
): BedarfsBacklogErgebnis {
  // Reset Counter für neue Berechnung
  bestellungsCounter = 1
  
  // Extrahiere Sattel-Komponenten
  const sattelKomponenten = extrahiereSattelKomponenten(konfiguration)
  
  // Berechne täglichen Bedarf aus Produktionsplänen
  const tagesbedarfMap = berechneTageslicherBedarf(produktionsplaene, konfiguration)
  
  // Konvertiere Feiertage für Kalender-Funktionen
  const feiertagsConfig = konvertiereFeiertagsKonfiguration(konfiguration)
  
  // Losgröße aus Lieferant-Konfiguration
  const LOSGROESSE = konfiguration.lieferant.losgroesse // 500 Sättel
  
  // Validierung: Losgröße muss > 0 sein (verhindert Division by Zero)
  if (LOSGROESSE <= 0) {
    throw new Error(`Ungültige Losgröße: ${LOSGROESSE}. Muss größer als 0 sein.`)
  }
  
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
    let backlog = 0
    let lagerbestand = 0
    
    // Map: Ankunftsdatum → Bestellmenge (für Material-Tracking)
    const materialAnkunftsMap = new Map<string, number>()
    
    // ========================================
    // PHASE 1: BEDARFSPLANUNG & BESTELLUNGEN
    // ========================================
    // Durchlaufe alle 365 Tage
    const startDatum = new Date(konfiguration.planungsjahr, 0, 1)
    
    for (let tagImJahr = 1; tagImJahr <= 365; tagImJahr++) {
      const datum = addDays(startDatum, tagImJahr - 1)
      const datumStr = toLocalISODateString(datum)
      
      // Hole Bedarf für diesen Tag
      const bedarfAmTag = tagesbedarfMap.get(datumStr)?.[komponentenId] || 0
      
      // Backlog zu Beginn des Tages
      const backlogVorher = backlog
      
      // Addiere heutigen Bedarf zum Backlog
      backlog += bedarfAmTag
      
      // Prüfe ob Bestellung ausgelöst werden soll
      let bestellungAusgeloest = false
      let bestellmenge = 0
      let bestellungId: string | undefined
      
      // Regel: Bestelle wenn akkumulierter Backlog ≥ Losgröße
      if (backlog >= LOSGROESSE) {
        // Berechne Bestellmenge (nächstes Vielfaches der Losgröße)
        bestellmenge = Math.floor(backlog / LOSGROESSE) * LOSGROESSE
        
        // Reduziere Backlog um bestellte Menge
        backlog -= bestellmenge
        
        bestellungAusgeloest = true
        bestellungId = generiereBestellungsId(komponentenId, datum)
        
        // Berechne Ankunftsdatum (49 Tage Vorlaufzeit)
        const ankunftsdatum = berechneAnkunftsdatum(datum, feiertagsConfig)
        const ankunftsDatumStr = toLocalISODateString(ankunftsdatum)
        
        // Registriere Material-Ankunft
        const bisherAnkunft = materialAnkunftsMap.get(ankunftsDatumStr) || 0
        materialAnkunftsMap.set(ankunftsDatumStr, bisherAnkunft + bestellmenge)
        
        // Erstelle Bestellungs-Entry
        bestellungen.push({
          id: bestellungId,
          komponentenId,
          bestelldatum: datum,
          bestellmenge,
          ankunftsdatum,
          status: 'geplant',
          backlogBeimBestellen: backlogVorher + bedarfAmTag,
          ausloeser: `Backlog ${backlogVorher + bedarfAmTag} ≥ Losgröße ${LOSGROESSE}`
        })
      }
      
      // Backlog nach Bestellung
      const backlogNachher = backlog
      
      // Speichere Tages-Details (Phase 1: nur Bedarfsplanung)
      tagesDetails.push({
        datum,
        tag: tagImJahr,
        komponentenId,
        bedarf: bedarfAmTag,
        backlogVorher,
        backlogNachher,
        bestellungAusgeloest,
        bestellmenge,
        bestellungId,
        
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
    
    tagesDetails.forEach(detail => {
      const datumStr = toLocalISODateString(detail.datum)
      
      // 1. Material-Ankunft (Bestellungen treffen ein)
      const materialAnkunft = materialAnkunftsMap.get(datumStr) || 0
      detail.materialAnkunft = materialAnkunft
      
      // 2. Lagerbestand aktualisieren (Ankunft)
      lagerbestand += materialAnkunft
      
      // 3. Prüfe verfügbares Material für Produktion
      const verfuegbaresMaterial = lagerbestand
      detail.verfuegbaresMaterial = verfuegbaresMaterial
      
      // 4. Tatsächliche Produktion (min(Bedarf, verfügbar))
      const tatsaechlicheProduktion = Math.min(detail.bedarf, verfuegbaresMaterial)
      detail.tatsaechlicheProduktion = tatsaechlicheProduktion
      
      // 5. Material-Engpass?
      detail.materialEngpass = detail.bedarf > verfuegbaresMaterial
      
      // 6. Abweichung (negativ = Fehlmenge)
      detail.abweichung = tatsaechlicheProduktion - detail.bedarf
      
      // 7. Lagerbestand aktualisieren (Verbrauch)
      lagerbestand -= tatsaechlicheProduktion
      detail.lagerbestand = lagerbestand
    })
    
    // ========================================
    // PHASE 3: STATISTIKEN BERECHNEN
    // ========================================
    const gesamtBedarf = tagesDetails.reduce((sum, t) => sum + t.bedarf, 0)
    const gesamtBestellt = bestellungen.reduce((sum, b) => sum + b.bestellmenge, 0)
    const gesamtProduziert = tagesDetails.reduce((sum, t) => sum + t.tatsaechlicheProduktion, 0)
    const gesamtFehlmenge = gesamtBedarf - gesamtProduziert
    
    const tageMitBestellung = tagesDetails.filter(t => t.bestellungAusgeloest).length
    const tageOhneBestellung = 365 - tageMitBestellung
    const durchschnittlicheBestellmenge = bestellungen.length > 0 
      ? gesamtBestellt / bestellungen.length 
      : 0
    
    const maxBacklog = Math.max(...tagesDetails.map(t => t.backlogNachher))
    const durchschnittlicherBacklog = tagesDetails.reduce((sum, t) => sum + t.backlogNachher, 0) / 365
    
    const tageMitEngpass = tagesDetails.filter(t => t.materialEngpass).length
    const engpassQuote = (tageMitEngpass / 365) * 100
    
    const durchschnittlicherLagerbestand = tagesDetails.reduce((sum, t) => sum + t.lagerbestand, 0) / 365
    const maxLagerbestand = Math.max(...tagesDetails.map(t => t.lagerbestand))
    
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
