'use client'

/**
 * ========================================
 * SZENARIEN CONTEXT
 * ========================================
 * 
 * Globaler State für Szenarien:
 * - Persistiert Szenarien über Tab-Wechsel hinweg
 * - Macht Szenarien für alle Berechnungen verfügbar
 * - Nur China als Lieferant (keine anderen Länder)
 * - Speichert Szenarien in localStorage für Persistenz beim Neuladen
 * 
 * WICHTIG: Alle Berechnungen nutzen den zentralen Supply Chain Metrics Rechner
 * für konsistente Werte über alle Seiten hinweg!
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  BASELINE, 
  berechneSzenarioAuswirkungen, 
  berechneSCORMetriken,
  berechneGesamtMetriken,
  JAHRESPRODUKTION_SSOT 
} from '@/lib/calculations/supply-chain-metrics'

export type SzenarioTyp = 'marketingaktion' | 'maschinenausfall' | 'wasserschaden' | 'schiffsverspaetung'

export interface SzenarioConfig {
  id: string
  typ: SzenarioTyp
  parameter: Record<string, any>
  aktiv: boolean
  erstelltAm: Date
}

interface SzenarienContextType {
  szenarien: SzenarioConfig[]
  hinzufuegen: (typ: SzenarioTyp, parameter: Record<string, any>) => void
  entfernen: (id: string) => void
  toggleAktiv: (id: string) => void
  zuruecksetzen: () => void
  getAktiveSzenarien: () => SzenarioConfig[]
}

const SzenarienContext = createContext<SzenarienContextType | undefined>(undefined)

/**
 * Provider-Komponente für globalen Szenarien-State mit localStorage-Persistenz
 */
export function SzenarienProvider({ children }: { children: ReactNode }) {
  const [szenarien, setSzenarien] = useState<SzenarioConfig[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Lade Szenarien aus localStorage beim Start
  useEffect(() => {
    try {
      const gespeicherteSzenarien = localStorage.getItem('mtb-szenarien')
      if (gespeicherteSzenarien) {
        const parsed = JSON.parse(gespeicherteSzenarien) as Array<Omit<SzenarioConfig, 'erstelltAm'> & { erstelltAm: string }>
        // Konvertiere Datum-Strings zurück zu Date-Objekten
        const wiederhergestellt: SzenarioConfig[] = parsed.map(s => ({
          ...s,
          erstelltAm: new Date(s.erstelltAm)
        }))
        setSzenarien(wiederhergestellt)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Szenarien:', error)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Speichere Szenarien in localStorage bei jeder Änderung
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('mtb-szenarien', JSON.stringify(szenarien))
      } catch (error) {
        console.error('Fehler beim Speichern der Szenarien:', error)
      }
    }
  }, [szenarien, isInitialized])

  const hinzufuegen = (typ: SzenarioTyp, parameter: Record<string, any>) => {
    const neuesSzenario: SzenarioConfig = {
      id: `${typ}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      typ,
      parameter,
      aktiv: true,
      erstelltAm: new Date()
    }
    setSzenarien(prev => [...prev, neuesSzenario])
  }

  const entfernen = (id: string) => {
    setSzenarien(prev => prev.filter(s => s.id !== id))
  }

  const toggleAktiv = (id: string) => {
    setSzenarien(prev => prev.map(s => 
      s.id === id ? { ...s, aktiv: !s.aktiv } : s
    ))
  }

  const zuruecksetzen = () => {
    setSzenarien([])
  }

  const getAktiveSzenarien = () => {
    return szenarien.filter(s => s.aktiv)
  }

  return (
    <SzenarienContext.Provider
      value={{
        szenarien,
        hinzufuegen,
        entfernen,
        toggleAktiv,
        zuruecksetzen,
        getAktiveSzenarien
      }}
    >
      {children}
    </SzenarienContext.Provider>
  )
}

/**
 * Hook zum Verwenden des Szenarien-Context
 */
export function useSzenarien() {
  const context = useContext(SzenarienContext)
  if (context === undefined) {
    throw new Error('useSzenarien muss innerhalb von SzenarienProvider verwendet werden')
  }
  return context
}

/**
 * Baseline-Werte für Supply Chain Metriken
 * WICHTIG: Nutzt die SSOT-Werte aus dem zentralen Metrics Rechner!
 */
export const BASELINE_WERTE = {
  produktionsmenge: JAHRESPRODUKTION_SSOT,
  materialverfuegbarkeit: BASELINE.materialverfuegbarkeit,
  liefertreue: BASELINE.liefertreue,
  durchlaufzeit: BASELINE.durchlaufzeit
} as const

/**
 * Berechnet die Auswirkungen aller aktiven Szenarien auf die Supply Chain
 * WICHTIG: Nutzt den zentralen Supply Chain Metrics Rechner für konsistente Werte!
 */
export function berechneGlobaleAuswirkungen(szenarien: SzenarioConfig[]) {
  const aktiveSzenarien = szenarien.filter(s => s.aktiv)
  const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
  
  // Konvertiere zur Legacy-Schnittstelle für Abwärtskompatibilität
  return {
    produktionsmenge: auswirkungen.produktionsmenge,
    materialverfuegbarkeit: auswirkungen.materialverfuegbarkeit,
    liefertreue: auswirkungen.liefertreue,
    durchlaufzeit: auswirkungen.durchlaufzeit
  }
}

// Re-Export der zentralen Berechnungsfunktionen für einfachen Zugriff
export { 
  berechneSzenarioAuswirkungen, 
  berechneSCORMetriken, 
  berechneGesamtMetriken,
  BASELINE,
  JAHRESPRODUKTION_SSOT
} from '@/lib/calculations/supply-chain-metrics'
