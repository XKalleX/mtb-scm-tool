'use client'

/**
 * ========================================
 * PRODUKTIONS-ANPASSUNGEN CONTEXT
 * ========================================
 * 
 * Globaler State für manuelle Produktionsanpassungen aus der OEM-Seite.
 * 
 * KONZEPT:
 * - Anpassungen werden global gespeichert
 * - Alle Module (OEM, Produktion, Inbound, Reporting) sehen die gleichen Anpassungen
 * - Integration mit useSzenarioBerechnung Hook
 * 
 * VERWENDUNG:
 * ```tsx
 * const { produktionsAnpassungen, setProduktionsAnpassung, removeAnpassung, clearAll } = useProduktionsAnpassungen()
 * ```
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

/**
 * Typ für Anpassungen
 * Key-Format: "woche_<KW>_<varianteId>" oder "monat_<monat>_<varianteId>"
 * Value: Delta zur ursprünglichen Menge (kann positiv oder negativ sein)
 */
export type ProduktionsAnpassungen = Record<string, number>

/**
 * Context-Werte
 */
interface ProduktionsAnpassungenContextType {
  // Aktueller State
  produktionsAnpassungen: ProduktionsAnpassungen
  
  // Setter
  setProduktionsAnpassung: (key: string, delta: number) => void
  removeAnpassung: (key: string) => void
  clearAll: () => void
  
  // Hilfsfunktionen
  hasAnpassungen: () => boolean
  getAnpassungenCount: () => number
  getGesamtDelta: () => number
}

// Context erstellen
const ProduktionsAnpassungenContext = createContext<ProduktionsAnpassungenContextType | undefined>(undefined)

/**
 * Provider Component
 */
export function ProduktionsAnpassungenProvider({ children }: { children: ReactNode }) {
  const [produktionsAnpassungen, setProduktionsAnpassungenState] = useState<ProduktionsAnpassungen>({})
  
  /**
   * Setzt oder aktualisiert eine Anpassung
   */
  const setProduktionsAnpassung = useCallback((key: string, delta: number) => {
    setProduktionsAnpassungenState(prev => {
      // Wenn Delta 0 ist, entferne die Anpassung
      if (delta === 0) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      
      // Sonst setze/aktualisiere
      return {
        ...prev,
        [key]: delta
      }
    })
  }, [])
  
  /**
   * Entfernt eine spezifische Anpassung
   */
  const removeAnpassung = useCallback((key: string) => {
    setProduktionsAnpassungenState(prev => {
      const { [key]: _, ...rest } = prev
      return rest
    })
  }, [])
  
  /**
   * Setzt alle Anpassungen zurück
   */
  const clearAll = useCallback(() => {
    setProduktionsAnpassungenState({})
  }, [])
  
  /**
   * Prüft ob Anpassungen vorhanden sind
   */
  const hasAnpassungen = useCallback(() => {
    return Object.keys(produktionsAnpassungen).length > 0
  }, [produktionsAnpassungen])
  
  /**
   * Gibt Anzahl der Anpassungen zurück
   */
  const getAnpassungenCount = useCallback(() => {
    return Object.keys(produktionsAnpassungen).length
  }, [produktionsAnpassungen])
  
  /**
   * Berechnet Gesamt-Delta aller Anpassungen
   */
  const getGesamtDelta = useCallback(() => {
    return Object.values(produktionsAnpassungen).reduce((sum, delta) => sum + delta, 0)
  }, [produktionsAnpassungen])
  
  const value: ProduktionsAnpassungenContextType = {
    produktionsAnpassungen,
    setProduktionsAnpassung,
    removeAnpassung,
    clearAll,
    hasAnpassungen,
    getAnpassungenCount,
    getGesamtDelta
  }
  
  return (
    <ProduktionsAnpassungenContext.Provider value={value}>
      {children}
    </ProduktionsAnpassungenContext.Provider>
  )
}

/**
 * Hook zum Zugriff auf den Context
 */
export function useProduktionsAnpassungen(): ProduktionsAnpassungenContextType {
  const context = useContext(ProduktionsAnpassungenContext)
  
  if (context === undefined) {
    throw new Error('useProduktionsAnpassungen must be used within a ProduktionsAnpassungenProvider')
  }
  
  return context
}

export default ProduktionsAnpassungenContext
