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
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
        const parsed = JSON.parse(gespeicherteSzenarien)
        // Konvertiere Datum-Strings zurück zu Date-Objekten
        const wiederhergestellt = parsed.map((s: any) => ({
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
 * Berechnet die Auswirkungen aller aktiven Szenarien auf die Supply Chain
 */
export function berechneGlobaleAuswirkungen(szenarien: SzenarioConfig[]) {
  const baselineWerte = {
    produktionsmenge: 370000,
    materialverfuegbarkeit: 98.5,
    liefertreue: 95.2,
    durchlaufzeit: 56
  }

  let auswirkungen = { ...baselineWerte }

  szenarien.forEach(szenario => {
    switch (szenario.typ) {
      case 'marketingaktion':
        const erhoehung = (szenario.parameter.erhoehungProzent || 20) / 100
        auswirkungen.produktionsmenge *= (1 + erhoehung)
        auswirkungen.materialverfuegbarkeit -= 5
        break

      case 'maschinenausfall':
        // Nur China betroffen (keine anderen Zulieferer)
        const reduktion = (szenario.parameter.reduktionProzent || 60) / 100
        auswirkungen.produktionsmenge *= (1 - reduktion * 0.3)
        auswirkungen.materialverfuegbarkeit -= reduktion * 40
        auswirkungen.liefertreue -= 8
        break

      case 'wasserschaden':
        const verlust = szenario.parameter.verlustMenge || 1000
        auswirkungen.materialverfuegbarkeit -= verlust / 10000
        auswirkungen.liefertreue -= 5
        break

      case 'schiffsverspaetung':
        const tage = szenario.parameter.verspaetungTage || 4
        auswirkungen.durchlaufzeit += tage
        auswirkungen.liefertreue -= tage
        auswirkungen.materialverfuegbarkeit -= tage / 8
        break
    }
  })

  return auswirkungen
}
