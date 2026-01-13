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
 * - saisonalitaet.json
 * - stammdaten.json
 * - feiertage-china.json
 * - lieferant-china.json
 * - stueckliste.json
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

// Import JSON-Dateien als SINGLE SOURCE OF TRUTH
import saisonalitaetData from '@/data/saisonalitaet.json'
import stammdatenData from '@/data/stammdaten.json'
import feiertageChinaData from '@/data/feiertage-china.json'
import lieferantChinaData from '@/data/lieferant-china.json'
import stuecklisteData from '@/data/stueckliste.json'

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
 * Feiertage aus JSON laden (Deutschland + China)
 */
const STANDARD_FEIERTAGE: FeiertagConfig[] = [
  // Deutschland (NRW)
  { datum: "2027-01-01", name: "Neujahr", typ: "gesetzlich", land: "Deutschland" },
  { datum: "2027-04-02", name: "Karfreitag", typ: "gesetzlich", land: "Deutschland" },
  { datum: "2027-04-05", name: "Ostermontag", typ: "gesetzlich", land: "Deutschland" },
  { datum: "2027-05-01", name: "Tag der Arbeit", typ: "gesetzlich", land: "Deutschland" },
  { datum: "2027-05-13", name: "Christi Himmelfahrt", typ: "gesetzlich", land: "Deutschland" },
  { datum: "2027-05-24", name: "Pfingstmontag", typ: "gesetzlich", land: "Deutschland" },
  { datum: "2027-06-03", name: "Fronleichnam", typ: "gesetzlich", land: "Deutschland" },
  { datum: "2027-10-03", name: "Tag der Deutschen Einheit", typ: "gesetzlich", land: "Deutschland" },
  { datum: "2027-12-25", name: "1. Weihnachtsfeiertag", typ: "gesetzlich", land: "Deutschland" },
  { datum: "2027-12-26", name: "2. Weihnachtsfeiertag", typ: "gesetzlich", land: "Deutschland" },
  // China - aus JSON laden
  ...feiertageChinaData.feiertage2027.map(f => ({
    datum: f.datum,
    name: f.name,
    typ: (f.typ === 'gesetzlich' ? 'gesetzlich' : 'Festival') as 'gesetzlich' | 'Festival',
    land: 'China' as const
  }))
]

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
  planungsjahr: stammdatenData.projekt.planungsjahr,
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
      const gespeicherteKonfiguration = localStorage.getItem('mtb-konfiguration')
      if (gespeicherteKonfiguration) {
        const parsed = JSON.parse(gespeicherteKonfiguration) as KonfigurationData
        setKonfiguration(parsed)
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
        localStorage.setItem('mtb-konfiguration', JSON.stringify(konfiguration))
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
    setKonfiguration(prev => ({ ...prev, planungsjahr: value }))
  }, [])

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
    setKonfiguration(prev => ({
      ...prev,
      lieferant: { ...prev.lieferant, ...updates }
    }))
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
      const datumStr = datum.toISOString().split('T')[0]
      
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
