'use client'

/**
 * ========================================
 * SZENARIO BERECHNUNG HOOK
 * ========================================
 * 
 * Zentraler Hook der KonfigurationContext und SzenarienContext kombiniert
 * und alle Berechnungen mit Szenario-Unterstützung bereitstellt.
 * 
 * VERWENDUNG:
 * - In allen Seiten (OEM, Produktion, Inbound, Reporting)
 * - Gibt sowohl Baseline- als auch Szenario-Werte zurück
 * - Berechnet automatisch Deltas für Visualisierung
 * 
 * WICHTIG: Alle Module MÜSSEN diesen Hook nutzen für konsistente Daten!
 */

import { useMemo } from 'react'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { useSzenarien, SzenarioConfig } from '@/contexts/SzenarienContext'
import {
  generiereTagesproduktionMitSzenarien,
  generiereAlleVariantenMitSzenarien,
  berechneLagerbestaendeMitSzenarien,
  berechneStatistikenMitSzenarien,
  berechneSzenarioModifikation,
  TagesProduktionMitDelta,
  LagerbestandMitDelta,
  ProduktionsStatistikMitDelta,
  SzenarioModifikation,
  formatDelta,
  getDeltaColorClass
} from '@/lib/calculations/szenario-produktionsplanung'
import {
  berechneGesamtMetrikenMitKonfig,
  DynamicConfig,
  GesamtMetriken
} from '@/lib/calculations/supply-chain-metrics'

/**
 * Rückgabewert des useSzenarioBerechnung Hooks
 */
export interface SzenarioBerechnungResult {
  // Status
  isInitialized: boolean
  hasSzenarien: boolean
  aktiveSzenarienCount: number
  aktiveSzenarien: SzenarioConfig[]
  
  // Modifikation
  modifikation: SzenarioModifikation
  
  // Tagesproduktion (365 Tage mit Deltas)
  tagesProduktion: TagesProduktionMitDelta[]
  
  // Varianten-Pläne (8 Varianten mit Deltas)
  variantenPlaene: Record<string, {
    varianteId: string
    varianteName: string
    jahresProduktion: number
    jahresProduktionIst: number
    abweichung: number
    tage: TagesProduktionMitDelta[]
  }>
  
  // Lagerbestände (mit Deltas)
  lagerbestaende: LagerbestandMitDelta[]
  
  // Statistiken (mit Baseline-Vergleich)
  statistiken: ProduktionsStatistikMitDelta
  
  // SCOR Metriken (für Dashboard/Reporting)
  scorMetriken: GesamtMetriken
  
  // Hilfs-Funktionen
  formatDelta: (delta: number, decimals?: number) => string
  getDeltaColorClass: (delta: number, inverseLogic?: boolean) => string
}

/**
 * Haupt-Hook für szenario-aware Berechnungen
 * 
 * Kombiniert:
 * 1. KonfigurationContext (Stammdaten, Einstellungen)
 * 2. SzenarienContext (aktive Szenarien)
 * 3. Alle Berechnungsfunktionen
 * 
 * @returns Vollständiges Berechnungsergebnis mit Deltas
 */
export function useSzenarioBerechnung(): SzenarioBerechnungResult {
  const { konfiguration, isInitialized, getArbeitstageProJahr } = useKonfiguration()
  const { getAktiveSzenarien } = useSzenarien()
  
  // Aktive Szenarien
  const aktiveSzenarien = useMemo(() => getAktiveSzenarien(), [getAktiveSzenarien])
  const hasSzenarien = aktiveSzenarien.length > 0
  
  // Szenario-Modifikation berechnen
  const modifikation = useMemo(() => 
    berechneSzenarioModifikation(aktiveSzenarien, konfiguration.planungsjahr),
    [aktiveSzenarien, konfiguration.planungsjahr]
  )
  
  // Tagesproduktion mit Szenarien (365 Tage)
  const tagesProduktion = useMemo(() => {
    if (!isInitialized) return []
    return generiereTagesproduktionMitSzenarien(konfiguration, aktiveSzenarien)
  }, [konfiguration, aktiveSzenarien, isInitialized])
  
  // Varianten-Pläne mit Szenarien
  const variantenPlaene = useMemo(() => {
    if (!isInitialized) return {}
    return generiereAlleVariantenMitSzenarien(konfiguration, aktiveSzenarien)
  }, [konfiguration, aktiveSzenarien, isInitialized])
  
  // Lagerbestände mit Szenarien
  const lagerbestaende = useMemo(() => {
    if (!isInitialized) return []
    return berechneLagerbestaendeMitSzenarien(konfiguration, aktiveSzenarien)
  }, [konfiguration, aktiveSzenarien, isInitialized])
  
  // Statistiken mit Szenarien
  const statistiken = useMemo(() => {
    if (tagesProduktion.length === 0) {
      return {
        geplant: 0,
        produziert: 0,
        abweichung: 0,
        planerfuellungsgrad: 0,
        arbeitstage: 0,
        schichtenGesamt: 0,
        mitMaterialmangel: 0,
        auslastung: 0,
        baselineGeplant: 0,
        baselineProduziert: 0,
        baselinePlanerfuellungsgrad: 0,
        baselineMitMaterialmangel: 0,
        baselineAuslastung: 0,
        deltaGeplant: 0,
        deltaProduziert: 0,
        deltaPlanerfuellungsgrad: 0,
        deltaMitMaterialmangel: 0,
        deltaAuslastung: 0
      }
    }
    return berechneStatistikenMitSzenarien(tagesProduktion)
  }, [tagesProduktion])
  
  // SCOR Metriken für Dashboard/Reporting
  const scorMetriken = useMemo(() => {
    if (!isInitialized) {
      // Leere Metriken während Initialisierung
      return {
        scor: {
          planerfuellungsgrad: 0,
          liefertreueChina: 0,
          deliveryPerformance: 0,
          durchlaufzeitProduktion: 0,
          lagerumschlag: 0,
          forecastAccuracy: 0,
          produktionsflexibilitaet: 0,
          materialverfuegbarkeit: 0,
          lagerreichweite: 0,
          kapitalbindung: 0,
          gesamtproduktion: 0,
          produktionstage: 0,
          durchschnittProTag: 0,
          auslastung: 0
        },
        auswirkungen: {
          produktionsmenge: 0,
          produktionsDelta: 0,
          produktionsDeltaProzent: 0,
          materialverfuegbarkeit: 0,
          materialverfuegbarkeitDelta: 0,
          liefertreue: 0,
          liefertreueDelta: 0,
          durchlaufzeit: 0,
          durchlaufzeitDelta: 0,
          planerfuellungsgrad: 0,
          lagerumschlag: 0,
          auslastung: 0,
          produktionstage: 0,
          durchschnittProTag: 0
        },
        monatlicheProduktion: [],
        variantenProduktion: [],
        aktiveSzenarienAnzahl: 0,
        istBaseline: true
      } as GesamtMetriken
    }
    
    const dynamicConfig: DynamicConfig = {
      jahresproduktion: konfiguration.jahresproduktion,
      arbeitstage: getArbeitstageProJahr(),
      saisonalitaet: konfiguration.saisonalitaet.map(s => ({ monat: s.monat, anteil: s.anteil })),
      varianten: konfiguration.varianten.map(v => ({
        id: v.id,
        name: v.name,
        anteilPrognose: v.anteilPrognose
      }))
    }
    
    return berechneGesamtMetrikenMitKonfig(aktiveSzenarien, dynamicConfig)
  }, [konfiguration, aktiveSzenarien, isInitialized, getArbeitstageProJahr])
  
  return {
    isInitialized,
    hasSzenarien,
    aktiveSzenarienCount: aktiveSzenarien.length,
    aktiveSzenarien,
    modifikation,
    tagesProduktion,
    variantenPlaene,
    lagerbestaende,
    statistiken,
    scorMetriken,
    formatDelta,
    getDeltaColorClass
  }
}

export default useSzenarioBerechnung
