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
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

// ========================================
// TYPEN FÜR KONFIGURATION
// ========================================

export interface MTBVarianteConfig {
  id: string
  name: string
  kategorie: string
  verkaufspreis: number
  herstellkosten: number
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
// STANDARD-WERTE (aus JSON-Dateien)
// ========================================

const STANDARD_VARIANTEN: MTBVarianteConfig[] = [
  {
    id: "MTBAllrounder",
    name: "MTB Allrounder",
    kategorie: "Allrounder",
    verkaufspreis: 1299,
    herstellkosten: 750,
    gewicht: 13.5,
    farben: ["Schwarz", "Silber", "Blau"],
    anteilPrognose: 0.30,
    beschreibung: "Vielseitiges Mountainbike für alle Einsatzbereiche"
  },
  {
    id: "MTBCompetition",
    name: "MTB Competition",
    kategorie: "Competition",
    verkaufspreis: 2499,
    herstellkosten: 1450,
    gewicht: 11.2,
    farben: ["Rot", "Schwarz", "Weiß"],
    anteilPrognose: 0.15,
    beschreibung: "Wettkampforientiertes Racebike mit Carbonrahmen"
  },
  {
    id: "MTBDownhill",
    name: "MTB Downhill",
    kategorie: "Downhill",
    verkaufspreis: 3199,
    herstellkosten: 1850,
    gewicht: 15.8,
    farben: ["Orange", "Schwarz", "Grün"],
    anteilPrognose: 0.10,
    beschreibung: "Robustes Downhill-Bike für extreme Abfahrten"
  },
  {
    id: "MTBExtreme",
    name: "MTB Extreme",
    kategorie: "Extreme",
    verkaufspreis: 3799,
    herstellkosten: 2200,
    gewicht: 14.9,
    farben: ["Gelb", "Schwarz", "Grau"],
    anteilPrognose: 0.07,
    beschreibung: "Premium-Bike für extremste Anforderungen"
  },
  {
    id: "MTBFreeride",
    name: "MTB Freeride",
    kategorie: "Freeride",
    verkaufspreis: 2899,
    herstellkosten: 1680,
    gewicht: 14.3,
    farben: ["Grün", "Schwarz", "Blau"],
    anteilPrognose: 0.05,
    beschreibung: "Freestyle-orientiertes Mountainbike"
  },
  {
    id: "MTBMarathon",
    name: "MTB Marathon",
    kategorie: "Marathon",
    verkaufspreis: 2199,
    herstellkosten: 1270,
    gewicht: 10.8,
    farben: ["Blau", "Weiß", "Schwarz"],
    anteilPrognose: 0.08,
    beschreibung: "Leichtgewicht für Langstrecken-Rennen"
  },
  {
    id: "MTBPerformance",
    name: "MTB Performance",
    kategorie: "Performance",
    verkaufspreis: 1799,
    herstellkosten: 1040,
    gewicht: 12.4,
    farben: ["Schwarz", "Silber", "Rot"],
    anteilPrognose: 0.12,
    beschreibung: "Performance-orientiertes Allround-Bike"
  },
  {
    id: "MTBTrail",
    name: "MTB Trail",
    kategorie: "Trail",
    verkaufspreis: 1599,
    herstellkosten: 920,
    gewicht: 13.1,
    farben: ["Grau", "Schwarz", "Grün"],
    anteilPrognose: 0.13,
    beschreibung: "Trail-spezialisiertes Mountainbike"
  }
]

const STANDARD_SAISONALITAET: SaisonalitaetMonatConfig[] = [
  { monat: 1, name: "Januar", anteil: 4, beschreibung: "Niedriger Start ins Jahr, Winter" },
  { monat: 2, name: "Februar", anteil: 6, beschreibung: "Vorbereitung auf Frühjahr" },
  { monat: 3, name: "März", anteil: 10, beschreibung: "Frühjahrsbeginn, steigende Nachfrage" },
  { monat: 4, name: "April", anteil: 16, beschreibung: "PEAK! Hauptsaison beginnt - höchste Nachfrage" },
  { monat: 5, name: "Mai", anteil: 14, beschreibung: "Hochsaison" },
  { monat: 6, name: "Juni", anteil: 13, beschreibung: "Sommeranfang" },
  { monat: 7, name: "Juli", anteil: 12, beschreibung: "Sommerzeit" },
  { monat: 8, name: "August", anteil: 9, beschreibung: "Spätsommer" },
  { monat: 9, name: "September", anteil: 6, beschreibung: "Herbstbeginn" },
  { monat: 10, name: "Oktober", anteil: 3, beschreibung: "Herbst, sinkende Nachfrage" },
  { monat: 11, name: "November", anteil: 4, beschreibung: "Winter naht" },
  { monat: 12, name: "Dezember", anteil: 3, beschreibung: "Weihnachtsgeschäft minimal" }
]

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
  // China - Spring Festival
  { datum: "2027-01-28", name: "Spring Festival (Tag 1) - Chinesisches Neujahr", typ: "Festival", land: "China" },
  { datum: "2027-01-29", name: "Spring Festival (Tag 2)", typ: "Festival", land: "China" },
  { datum: "2027-01-30", name: "Spring Festival (Tag 3)", typ: "Festival", land: "China" },
  { datum: "2027-01-31", name: "Spring Festival (Tag 4)", typ: "Festival", land: "China" },
  { datum: "2027-02-01", name: "Spring Festival (Tag 5)", typ: "Festival", land: "China" },
  { datum: "2027-02-02", name: "Spring Festival (Tag 6)", typ: "Festival", land: "China" },
  { datum: "2027-02-03", name: "Spring Festival (Tag 7)", typ: "Festival", land: "China" },
  { datum: "2027-02-04", name: "Spring Festival (Tag 8)", typ: "Festival", land: "China" },
  // China - Weitere Feiertage
  { datum: "2027-04-04", name: "Qingming Festival (Tomb-Sweeping Day)", typ: "gesetzlich", land: "China" },
  { datum: "2027-05-01", name: "Labour Day", typ: "gesetzlich", land: "China" },
  { datum: "2027-06-14", name: "Dragon Boat Festival", typ: "gesetzlich", land: "China" },
  { datum: "2027-09-21", name: "Mid-Autumn Festival", typ: "gesetzlich", land: "China" },
  { datum: "2027-10-01", name: "National Day (Tag 1)", typ: "gesetzlich", land: "China" },
  { datum: "2027-10-02", name: "National Day (Tag 2)", typ: "gesetzlich", land: "China" },
  { datum: "2027-10-03", name: "National Day (Tag 3)", typ: "gesetzlich", land: "China" }
]

const STANDARD_LIEFERANT: LieferantConfig = {
  id: "CHN",
  name: "Dengwong Manufacturing Ltd.",
  land: "China",
  vorlaufzeitKalendertage: 30,  // Seefracht: Shanghai → Hamburg (24/7)
  vorlaufzeitArbeitstage: 5,    // Produktion beim Zulieferer
  lkwTransportArbeitstage: 4,   // 2 AT China→Hafen + 2 AT Hamburg→Dortmund
  lkwTransportChinaArbeitstage: 2,  // China → Hafen Shanghai
  lkwTransportDeutschlandArbeitstage: 2,  // Hamburg → Dortmund
  gesamtVorlaufzeitTage: 49,    // Total lead time (configurable)
  transportSequenz: [
    {
      schritt: 1,
      typ: 'Produktion',
      dauer: 5,
      einheit: 'AT',
      von: 'Dengwong',
      nach: 'Dengwong',
      beschreibung: 'Produktion beim Zulieferer (Mo-Fr ohne Feiertage)'
    },
    {
      schritt: 2,
      typ: 'LKW',
      dauer: 2,
      einheit: 'AT',
      von: 'Dengwong',
      nach: 'Hafen Shanghai',
      beschreibung: 'LKW-Transport zum Hafen (Mo-Fr)'
    },
    {
      schritt: 3,
      typ: 'Seefracht',
      dauer: 30,
      einheit: 'KT',
      von: 'Hafen Shanghai',
      nach: 'Hafen Hamburg',
      beschreibung: 'Seefracht (24/7 unterwegs)'
    },
    {
      schritt: 4,
      typ: 'LKW',
      dauer: 2,
      einheit: 'AT',
      von: 'Hafen Hamburg',
      nach: 'Werk Dortmund',
      beschreibung: 'LKW-Transport zum Werk (Mo-Fr)'
    }
  ],
  losgroesse: 500,
  kapazitaet: 50000,
  lieferintervall: 14,
  besonderheiten: [
    "Einziger Lieferant für Sättel",
    "Spring Festival: 28. Jan - 4. Feb 2027 (8 Tage Produktionsstopp)",
    "Seefracht: 30 Kalendertage (Shanghai → Hamburg, 24/7 unterwegs)",
    "LKW-Transport: 2 AT (China → Hafen) + 2 AT (Hamburg → Dortmund) = 4 AT",
    "Produktion: 5 Arbeitstage (Mo-Fr ohne Feiertage)",
    "Gesamte Vorlaufzeit: 49 Tage (7 Wochen) = 5 AT + 2 AT + 30 KT + 2 AT",
    "Mindestbestellung: 500 Stück Sättel (Losgröße)",
    "Lieferintervall: Alle 14 Tage"
  ]
}

const STANDARD_PRODUKTION: ProduktionConfig = {
  kapazitaetProStunde: 130,
  stundenProSchicht: 8,
  durchlaufzeitMontageMinuten: 325
}

const STANDARD_BAUTEILE: BauteilConfig[] = [
  { id: "SAT_FT", name: "Fizik Tundra", kategorie: "Sattel", beschreibung: "Premium Sattel für Langstrecken" },
  { id: "SAT_RL", name: "Raceline", kategorie: "Sattel", beschreibung: "Sportlicher Sattel für Wettkampf" },
  { id: "SAT_SP", name: "Spark", kategorie: "Sattel", beschreibung: "Leichter Performance-Sattel" },
  { id: "SAT_SL", name: "Speedline", kategorie: "Sattel", beschreibung: "Aerodynamischer Sattel für Speed" }
]

const STANDARD_STUECKLISTE: StuecklistenPosition[] = [
  { mtbVariante: "MTBAllrounder", bauteilId: "SAT_SP", bauteilName: "Spark", menge: 1 },
  { mtbVariante: "MTBCompetition", bauteilId: "SAT_SL", bauteilName: "Speedline", menge: 1 },
  { mtbVariante: "MTBDownhill", bauteilId: "SAT_FT", bauteilName: "Fizik Tundra", menge: 1 },
  { mtbVariante: "MTBExtreme", bauteilId: "SAT_SP", bauteilName: "Spark", menge: 1 },
  { mtbVariante: "MTBFreeride", bauteilId: "SAT_FT", bauteilName: "Fizik Tundra", menge: 1 },
  { mtbVariante: "MTBMarathon", bauteilId: "SAT_RL", bauteilName: "Raceline", menge: 1 },
  { mtbVariante: "MTBPerformance", bauteilId: "SAT_FT", bauteilName: "Fizik Tundra", menge: 1 },
  { mtbVariante: "MTBTrail", bauteilId: "SAT_SL", bauteilName: "Speedline", menge: 1 }
]

const STANDARD_KONFIGURATION: KonfigurationData = {
  jahresproduktion: 370000,
  planungsjahr: 2027,
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
