'use client'

/**
 * ========================================
 * KONFIGURATION CONTEXT
 * ========================================
 * 
 * Globaler State für alle konfigurierbaren Daten:
 * - Jahresproduktion
 * - Saisonalität (monatliche Verteilung)
 * - MTB-Varianten und deren Anteile
 * - Feiertage (Deutschland + China)
 * - Lieferant-Parameter
 * 
 * WICHTIG: Alle Berechnungen im Tool MÜSSEN diese Werte nutzen!
 * Speicherung erfolgt in localStorage für Persistenz.
 * 
 * SINGLE SOURCE OF TRUTH: JSON-Dateien in src/data/
 * - stammdaten.json (Projekt-Meta, Varianten, Jahresproduktion, Produktion)
 * - saisonalitaet.json (Monatliche Verteilung)
 * - lieferant-china.json (Lieferant, Bauteile, Vorlaufzeiten)
 * - stueckliste.json (Stückliste)
 * - feiertage-china.json (Chinesische Feiertage)
 * - feiertage-deutschland.json (Deutsche Feiertage)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

// Import JSON-Dateien als SINGLE SOURCE OF TRUTH
import saisonalitaetData from '@/data/saisonalitaet.json'
import stammdatenData from '@/data/stammdaten.json'
import feiertageChinaData from '@/data/feiertage-china.json'
import feiertageDeutschlandData from '@/data/feiertage-deutschland.json'
import lieferantChinaData from '@/data/lieferant-china.json'
import stuecklisteData from '@/data/stueckliste.json'
import { DEFAULT_PLANUNGSJAHR, getDefaultHeuteDatum, KONFIGURATION_STORAGE_KEY, isValidDate, parseDateSafe } from '@/lib/constants'
import { toLocalISODateString } from '@/lib/utils'
import { generiereAlleFeiertage } from '@/lib/holiday-generator'

// ========================================
// TYPEN FÜR KONFIGURATION
// ========================================

export interface MTBVarianteConfig {
  id: string
  name: string
  kategorie: string
  gewicht: number
  farben: string[]
  anteilPrognose: number // 0.0 - 1.0
  beschreibung: string
}

export interface SaisonalitaetMonatConfig {
  monat: number // 1-12
  name: string
  anteil: number // in % (0-100)
  beschreibung: string
}

export interface FeiertagConfig {
  datum: string // ISO Format YYYY-MM-DD
  name: string
  typ: 'gesetzlich' | 'regional' | 'betrieblich' | 'Festival'
  land: 'Deutschland' | 'China'
}

export interface TransportSequenzConfig {
  schritt: number
  typ: 'Produktion' | 'LKW' | 'Seefracht'
  dauer: number
  einheit: 'AT' | 'KT'
  von: string
  nach: string
  beschreibung: string
}

export interface LieferantConfig {
  id: string
  name: string
  land: string
  vorlaufzeitKalendertage: number  // Seefracht: 30 KT (Shanghai → Hamburg, 24/7)
  vorlaufzeitArbeitstage: number   // Produktion: 5 AT
  lkwTransportArbeitstage: number  // LKW: 4 AT gesamt (2 AT China + 2 AT Deutschland)
  lkwTransportChinaArbeitstage: number  // 2 AT China → Hafen
  lkwTransportDeutschlandArbeitstage: number  // 2 AT Hamburg → Dortmund
  gesamtVorlaufzeitTage: number    // Total: 49 Tage (berechenbar, aber konfigurierbar)
  transportSequenz: TransportSequenzConfig[]  // Sequenz der Transportschritte
  losgroesse: number
  kapazitaet: number
  lieferintervall: number
  besonderheiten: string[]
}

export interface ProduktionConfig {
  kapazitaetProStunde: number
  stundenProSchicht: number
  durchlaufzeitMontageMinuten: number
}

export interface StuecklistenPosition {
  mtbVariante: string
  bauteilId: string
  bauteilName: string
  menge: number
}

export interface BauteilConfig {
  id: string
  name: string
  kategorie: string
  beschreibung: string
}

export interface KonfigurationData {
  // Grundeinstellungen
  jahresproduktion: number
  planungsjahr: number
  heuteDatum: string  // 'Heute'-Datum für Frozen Zone Konzept (ISO Format YYYY-MM-DD)
  
  // Stammdaten
  varianten: MTBVarianteConfig[]
  saisonalitaet: SaisonalitaetMonatConfig[]
  feiertage: FeiertagConfig[]
  lieferant: LieferantConfig
  produktion: ProduktionConfig
  bauteile: BauteilConfig[]
  stueckliste: StuecklistenPosition[]
}

interface KonfigurationContextType {
  konfiguration: KonfigurationData
  isInitialized: boolean
  
  // Update Methoden
  setJahresproduktion: (value: number) => void
  setPlanungsjahr: (value: number) => void
  setHeuteDatum: (value: string) => void  // 'Heute'-Datum setzen (ISO Format YYYY-MM-DD)
  getHeuteDatumAsDate: () => Date  // 'Heute'-Datum als Date-Objekt zurückgeben
  
  // Varianten
  updateVariante: (id: string, updates: Partial<MTBVarianteConfig>) => void
  updateVariantenAnteile: (anteile: Record<string, number>) => void
  
  // Saisonalität
  updateSaisonalitaet: (monat: number, anteil: number) => void
  setSaisonalitaetKomplett: (saisonalitaet: SaisonalitaetMonatConfig[]) => void
  
  // Feiertage
  addFeiertag: (feiertag: FeiertagConfig) => void
  updateFeiertag: (datum: string, updates: Partial<FeiertagConfig>) => void
  removeFeiertag: (datum: string) => void
  
  // Lieferant
  updateLieferant: (updates: Partial<LieferantConfig>) => void
  
  // Produktion
  updateProduktion: (updates: Partial<ProduktionConfig>) => void
  
  // Bauteile & Stückliste
  updateBauteil: (id: string, updates: Partial<BauteilConfig>) => void
  updateStueckliste: (position: StuecklistenPosition) => void
  
  // Reset
  zuruecksetzenAufStandard: () => void
  
  // Berechnete Werte (abgeleitet)
  getJahresproduktionProVariante: () => Record<string, number>
  getMonatlicheProduktion: () => Array<{ monat: string; menge: number }>
  getArbeitstageProJahr: () => number
}

const KonfigurationContext = createContext<KonfigurationContextType | undefined>(undefined)

// ========================================
// STANDARD-WERTE (aus JSON-Dateien - SINGLE SOURCE OF TRUTH)
// ========================================

/**
 * Saisonalität aus JSON laden und in das richtige Format konvertieren
 */
const STANDARD_SAISONALITAET: SaisonalitaetMonatConfig[] = saisonalitaetData.saisonalitaetMonatlich.map(m => ({
  monat: m.monat,
  name: m.name,
  anteil: m.anteil,
  beschreibung: m.beschreibung
}))

/**
 * MTB-Varianten aus JSON laden
 */
const STANDARD_VARIANTEN: MTBVarianteConfig[] = stammdatenData.varianten as MTBVarianteConfig[]

/**
 * Lädt Feiertage aus JSON für bekannte Jahre, generiert dynamisch für andere
 * @param planungsjahr - Zentales Planungsjahr
 * @returns Array von Feiertagen für 3 Jahre (jahr-1, jahr, jahr+1)
 */
function ladeFeiertageFuerPlanungsjahr(planungsjahr: number): FeiertagConfig[] {
  const feiertage: FeiertagConfig[] = []
  
  // Versuche JSON-Daten zu laden für bekannte Jahre (2026-2028)
  const verfuegbareJahreDeutschland: Record<number, any[]> = {
    2026: feiertageDeutschlandData.feiertage2026 || [],
    2027: feiertageDeutschlandData.feiertage2027 || [],
    2028: (feiertageDeutschlandData as any).feiertage2028 || []
  }
  
  const verfuegbareJahreChina: Record<number, any[]> = {
    2026: feiertageChinaData.feiertage2026 || [],
    2027: feiertageChinaData.feiertage2027 || [],
    2028: (feiertageChinaData as any).feiertage2028 || []
  }
  
  // Lade 3 Jahre: vorheriges Jahr, Planungsjahr, nächstes Jahr
  for (let jahr = planungsjahr - 1; jahr <= planungsjahr + 1; jahr++) {
    // Deutschland
    const deutschlandJSON = verfuegbareJahreDeutschland[jahr]
    if (deutschlandJSON && deutschlandJSON.length > 0) {
      feiertage.push(...deutschlandJSON.map(f => ({
        datum: f.datum,
        name: f.name,
        typ: f.typ as 'gesetzlich',
        land: 'Deutschland' as const
      })))
    } else {
      // Generiere dynamisch
      const generiert = generiereAlleFeiertage(jahr).filter(f => f.land === 'Deutschland')
      feiertage.push(...generiert)
    }
    
    // China
    const chinaJSON = verfuegbareJahreChina[jahr]
    if (chinaJSON && chinaJSON.length > 0) {
      feiertage.push(...chinaJSON.map(f => ({
        datum: f.datum,
        name: f.name,
        typ: (f.typ === 'gesetzlich' ? 'gesetzlich' : 'Festival') as 'gesetzlich' | 'Festival',
        land: 'China' as const
      })))
    } else {
      // Generiere dynamisch
      const generiert = generiereAlleFeiertage(jahr).filter(f => f.land === 'China')
      feiertage.push(...generiert)
    }
  }
  
  return feiertage
}

/**
 * Feiertage basierend auf Planungsjahr laden
 * Nutzt JSON für bekannte Jahre (2026-2028), generiert dynamisch für andere
 */
const STANDARD_FEIERTAGE: FeiertagConfig[] = ladeFeiertageFuerPlanungsjahr(DEFAULT_PLANUNGSJAHR)

/**
 * Lieferant aus JSON laden
 */
const STANDARD_LIEFERANT: LieferantConfig = lieferantChinaData.lieferant as LieferantConfig

/**
 * Produktion aus stammdaten.json
 */
const STANDARD_PRODUKTION: ProduktionConfig = {
  kapazitaetProStunde: (stammdatenData as any).produktion?.kapazitaetProStunde || 130,
  stundenProSchicht: (stammdatenData as any).produktion?.stundenProSchicht || 8,
  durchlaufzeitMontageMinuten: (stammdatenData as any).produktion?.durchlaufzeitMontageMinuten || 325
}

/**
 * Bauteile aus lieferant-china.json extrahieren
 */
const STANDARD_BAUTEILE: BauteilConfig[] = Object.entries(lieferantChinaData.komponentenDetails).map(([id, details]: [string, any]) => ({
  id: details.id,
  name: details.name,
  kategorie: details.kategorie,
  beschreibung: details.beschreibung
}))

/**
 * Stückliste aus stueckliste.json transformieren
 */
const STANDARD_STUECKLISTE: StuecklistenPosition[] = Object.entries(stuecklisteData.stuecklisten).flatMap(([varianteId, data]: [string, any]) => 
  Object.entries(data.komponenten).map(([bauteilId, bauteilData]: [string, any]) => ({
    mtbVariante: varianteId,
    bauteilId: bauteilId,
    bauteilName: bauteilData.name,
    menge: bauteilData.menge
  }))
)

const STANDARD_KONFIGURATION: KonfigurationData = {
  jahresproduktion: (stammdatenData as any).jahresproduktion?.gesamt || 370000,
  planungsjahr: stammdatenData.projekt.planungsjahr || DEFAULT_PLANUNGSJAHR,
  heuteDatum: (stammdatenData.projekt as any).heuteDatum || getDefaultHeuteDatum(stammdatenData.projekt.planungsjahr || DEFAULT_PLANUNGSJAHR),  // Dynamisch basierend auf Planungsjahr
  varianten: STANDARD_VARIANTEN,
  saisonalitaet: STANDARD_SAISONALITAET,
  feiertage: STANDARD_FEIERTAGE,
  lieferant: STANDARD_LIEFERANT,
  produktion: STANDARD_PRODUKTION,
  bauteile: STANDARD_BAUTEILE,
  stueckliste: STANDARD_STUECKLISTE
}

// ========================================
// PROVIDER KOMPONENTE
// ========================================

export function KonfigurationProvider({ children }: { children: ReactNode }) {
  const [konfiguration, setKonfiguration] = useState<KonfigurationData>(STANDARD_KONFIGURATION)
  const [isInitialized, setIsInitialized] = useState(false)

  // Lade Konfiguration aus localStorage beim Start
  useEffect(() => {
    try {
      const gespeicherteKonfiguration = localStorage.getItem(KONFIGURATION_STORAGE_KEY)
      if (gespeicherteKonfiguration) {
        const parsed = JSON.parse(gespeicherteKonfiguration) as KonfigurationData
        
        // ✅ WICHTIG: Feiertage IMMER basierend auf Planungsjahr neu laden!
        // Dies verhindert, dass alte/fehlende Feiertage aus dem localStorage 
        // die Produktionsplanung verfälschen.
        // Feiertage werden NICHT aus localStorage übernommen, sondern immer
        // neu generiert/geladen basierend auf dem aktuellen Planungsjahr.
        const planungsjahr = parsed.planungsjahr || DEFAULT_PLANUNGSJAHR
        const aktuelleFeiertage = ladeFeiertageFuerPlanungsjahr(planungsjahr)
        
        const konfigurationMitAktuellenFeiertagen: KonfigurationData = {
          ...parsed,
          feiertage: aktuelleFeiertage // IMMER aktuelle Feiertage basierend auf Planungsjahr!
        }
        
        setKonfiguration(konfigurationMitAktuellenFeiertagen)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Konfiguration:', error)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Speichere Konfiguration in localStorage bei jeder Änderung
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(KONFIGURATION_STORAGE_KEY, JSON.stringify(konfiguration))
      } catch (error) {
        console.error('Fehler beim Speichern der Konfiguration:', error)
      }
    }
  }, [konfiguration, isInitialized])

  // ========================================
  // UPDATE METHODEN
  // ========================================

  const setJahresproduktion = useCallback((value: number) => {
    setKonfiguration(prev => ({ ...prev, jahresproduktion: value }))
  }, [])

  const setPlanungsjahr = useCallback((value: number) => {
    setKonfiguration(prev => {
      // Wenn Planungsjahr sich ändert, aktualisiere auch Feiertage und 'Heute'-Datum
      const neueFeiertage = ladeFeiertageFuerPlanungsjahr(value)
      const neuesHeuteDatum = getDefaultHeuteDatum(value)
      
      return {
        ...prev,
        planungsjahr: value,
        feiertage: neueFeiertage,
        heuteDatum: neuesHeuteDatum
      }
    })
  }, [])

  /**
   * Setzt das 'Heute'-Datum für Frozen Zone Konzept
   * Validiert Datum und speichert nur gültige Werte
   * @param value - ISO Format YYYY-MM-DD
   */
  const setHeuteDatum = useCallback((value: string) => {
    // Nutze parseDateSafe für Validierung (vermeidet Code-Duplikation)
    const datum = parseDateSafe(value, value) // Fallback = value selbst für Prüfung
    
    // Falls parseDateSafe einen Fallback verwendet hat, war das Original ungültig
    // Verwende toLocalISODateString um Timezone-Probleme zu vermeiden
    if (toLocalISODateString(datum) !== value) {
      console.error('Fehler: Ungültiges Datumsformat:', value)
      return // Nicht speichern bei ungültigem Datum
    }
    
    // Prüfe ob Datum im Planungsjahr liegt (Warnung, aber erlauben)
    const planungsjahr = konfiguration.planungsjahr || DEFAULT_PLANUNGSJAHR
    if (datum.getFullYear() !== planungsjahr) {
      console.warn(`⚠️ Datum außerhalb des Planungsjahres ${planungsjahr}: ${value}`)
      console.warn(`Dies kann zu inkonsistentem Verhalten führen. Bitte wählen Sie ein Datum in ${planungsjahr}.`)
    }
    
    setKonfiguration(prev => ({ ...prev, heuteDatum: value }))
  }, [])

  /**
   * Gibt das 'Heute'-Datum als Date-Objekt zurück
   * Wichtig für Frozen Zone Berechnungen
   * @returns Date-Objekt, garantiert gültig (verwendet shared utility)
   */
  const getHeuteDatumAsDate = useCallback((): Date => {
    // Verwendet shared utility für sichere Datums-Validierung
    return parseDateSafe(konfiguration.heuteDatum)
  }, [konfiguration.heuteDatum])

  const updateVariante = useCallback((id: string, updates: Partial<MTBVarianteConfig>) => {
    setKonfiguration(prev => ({
      ...prev,
      varianten: prev.varianten.map(v =>
        v.id === id ? { ...v, ...updates } : v
      )
    }))
  }, [])

  const updateVariantenAnteile = useCallback((anteile: Record<string, number>) => {
    setKonfiguration(prev => ({
      ...prev,
      varianten: prev.varianten.map(v => ({
        ...v,
        anteilPrognose: anteile[v.id] !== undefined ? anteile[v.id] : v.anteilPrognose
      }))
    }))
  }, [])

  const updateSaisonalitaet = useCallback((monat: number, anteil: number) => {
    setKonfiguration(prev => ({
      ...prev,
      saisonalitaet: prev.saisonalitaet.map(s =>
        s.monat === monat ? { ...s, anteil } : s
      )
    }))
  }, [])

  const setSaisonalitaetKomplett = useCallback((saisonalitaet: SaisonalitaetMonatConfig[]) => {
    setKonfiguration(prev => ({ ...prev, saisonalitaet }))
  }, [])

  const addFeiertag = useCallback((feiertag: FeiertagConfig) => {
    setKonfiguration(prev => ({
      ...prev,
      feiertage: [...prev.feiertage, feiertag].sort((a, b) => a.datum.localeCompare(b.datum))
    }))
  }, [])

  const updateFeiertag = useCallback((datum: string, updates: Partial<FeiertagConfig>) => {
    setKonfiguration(prev => ({
      ...prev,
      feiertage: prev.feiertage.map(f =>
        f.datum === datum ? { ...f, ...updates } : f
      )
    }))
  }, [])

  const removeFeiertag = useCallback((datum: string) => {
    setKonfiguration(prev => ({
      ...prev,
      feiertage: prev.feiertage.filter(f => f.datum !== datum)
    }))
  }, [])

  const updateLieferant = useCallback((updates: Partial<LieferantConfig>) => {
    setKonfiguration(prev => {
      const updatedLieferant = { ...prev.lieferant, ...updates }
      
      // Auto-sync lkwTransportArbeitstage when China or Deutschland values change
      // This ensures the total is always correct and reactive
      if ('lkwTransportChinaArbeitstage' in updates || 'lkwTransportDeutschlandArbeitstage' in updates) {
        updatedLieferant.lkwTransportArbeitstage = 
          updatedLieferant.lkwTransportChinaArbeitstage + updatedLieferant.lkwTransportDeutschlandArbeitstage
      }
      
      return {
        ...prev,
        lieferant: updatedLieferant
      }
    })
  }, [])

  const updateProduktion = useCallback((updates: Partial<ProduktionConfig>) => {
    setKonfiguration(prev => ({
      ...prev,
      produktion: { ...prev.produktion, ...updates }
    }))
  }, [])

  const updateBauteil = useCallback((id: string, updates: Partial<BauteilConfig>) => {
    setKonfiguration(prev => ({
      ...prev,
      bauteile: prev.bauteile.map(b =>
        b.id === id ? { ...b, ...updates } : b
      )
    }))
  }, [])

  const updateStueckliste = useCallback((position: StuecklistenPosition) => {
    setKonfiguration(prev => ({
      ...prev,
      stueckliste: prev.stueckliste.map(s =>
        s.mtbVariante === position.mtbVariante ? position : s
      )
    }))
  }, [])

  const zuruecksetzenAufStandard = useCallback(() => {
    setKonfiguration(STANDARD_KONFIGURATION)
  }, [])

  // ========================================
  // BERECHNETE WERTE
  // ========================================

  const getJahresproduktionProVariante = useCallback((): Record<string, number> => {
    const result: Record<string, number> = {}
    konfiguration.varianten.forEach(v => {
      result[v.id] = Math.round(konfiguration.jahresproduktion * v.anteilPrognose)
    })
    return result
  }, [konfiguration.jahresproduktion, konfiguration.varianten])

  const getMonatlicheProduktion = useCallback((): Array<{ monat: string; menge: number }> => {
    return konfiguration.saisonalitaet.map(s => ({
      monat: s.name,
      menge: Math.round(konfiguration.jahresproduktion * (s.anteil / 100))
    }))
  }, [konfiguration.jahresproduktion, konfiguration.saisonalitaet])

  const getArbeitstageProJahr = useCallback((): number => {
    // Berechne Arbeitstage: 365 - Wochenenden - deutsche Feiertage
    const jahr = konfiguration.planungsjahr
    let arbeitstage = 0
    
    // Verwende Set für O(1) Lookup statt Array.includes() mit O(n)
    const deutscheFeiertagSet = new Set(
      konfiguration.feiertage
        .filter(f => f.land === 'Deutschland')
        .map(f => f.datum)
    )
    
    for (let i = 0; i < 365; i++) {
      const datum = new Date(jahr, 0, 1 + i)
      const wochentag = datum.getDay()
      const datumStr = toLocalISODateString(datum)
      
      // Kein Wochenende und kein Feiertag
      if (wochentag !== 0 && wochentag !== 6 && !deutscheFeiertagSet.has(datumStr)) {
        arbeitstage++
      }
    }
    
    return arbeitstage
  }, [konfiguration.planungsjahr, konfiguration.feiertage])

  return (
    <KonfigurationContext.Provider
      value={{
        konfiguration,
        isInitialized,
        setJahresproduktion,
        setPlanungsjahr,
        setHeuteDatum,
        getHeuteDatumAsDate,
        updateVariante,
        updateVariantenAnteile,
        updateSaisonalitaet,
        setSaisonalitaetKomplett,
        addFeiertag,
        updateFeiertag,
        removeFeiertag,
        updateLieferant,
        updateProduktion,
        updateBauteil,
        updateStueckliste,
        zuruecksetzenAufStandard,
        getJahresproduktionProVariante,
        getMonatlicheProduktion,
        getArbeitstageProJahr
      }}
    >
      {children}
    </KonfigurationContext.Provider>
  )
}

// ========================================
// HOOK
// ========================================

export function useKonfiguration() {
  const context = useContext(KonfigurationContext)
  if (context === undefined) {
    throw new Error('useKonfiguration muss innerhalb von KonfigurationProvider verwendet werden')
  }
  return context
}

// Export der Standard-Werte für Referenz
export {
  STANDARD_KONFIGURATION,
  STANDARD_VARIANTEN,
  STANDARD_SAISONALITAET,
  STANDARD_FEIERTAGE,
  STANDARD_LIEFERANT,
  STANDARD_PRODUKTION,
  STANDARD_BAUTEILE,
  STANDARD_STUECKLISTE
}
