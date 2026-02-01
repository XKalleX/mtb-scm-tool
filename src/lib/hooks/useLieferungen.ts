'use client'

/**
 * ========================================
 * LIEFERUNGEN HOOK
 * ========================================
 * 
 * Stellt verfügbare Lieferungen für Szenario-Auswahl bereit.
 * Nutzt die Hafenlogistik-Simulation um Lieferungsbundles zu generieren.
 * 
 * VERWENDUNG:
 * - In SzenarienSidebar für Transport-Schaden Auswahl
 * - In SzenarienSidebar für Schiffsverspätung Auswahl
 */

import { useMemo } from 'react'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { generiereAlleVariantenProduktionsplaene } from '@/lib/calculations/zentrale-produktionsplanung'
import { generiereInboundLieferplan } from '@/lib/calculations/inbound-china'
import { toLocalISODateString } from '@/lib/utils'

/**
 * Lieferungs-Bundle Interface für Szenario-Auswahl
 */
export interface LieferungBundle {
  id: string                    // Eindeutige ID für Auswahl
  verfuegbarAb: string          // Datum als String (YYYY-MM-DD)
  verfuegbarAbFormatiert: string // Formatiertes Datum für Anzeige
  gesamtMenge: number           // Gesamtmenge aller Komponenten
  komponenten: Record<string, number>  // Komponenten-Mengen
}

/**
 * Hook zur Bereitstellung von Lieferungs-Bundles für Szenario-Auswahl
 */
export function useLieferungen(): {
  lieferungen: LieferungBundle[]
  isLoading: boolean
} {
  const { konfiguration, isInitialized } = useKonfiguration()
  
  const lieferungen = useMemo(() => {
    if (!isInitialized) return []
    
    try {
      // Generiere Produktionspläne
      const produktionsplaene = generiereAlleVariantenProduktionsplaene(konfiguration)
      
      // Konvertiere zu Format für Inbound-Berechnung
      const produktionsplaeneFormatiert: Record<string, any[]> = {}
      Object.entries(produktionsplaene).forEach(([varianteId, plan]) => {
        produktionsplaeneFormatiert[varianteId] = plan.tage.map(tag => ({
          datum: tag.datum,
          varianteId: varianteId,
          sollMenge: tag.planMenge,
          istMenge: tag.istMenge,
          kumulierterError: tag.monatsFehlerNachher,
          istMarketing: false
        }))
      })
      
      // Bereite Stücklisten-Map vor
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
      
      // Generiere Inbound-Lieferplan
      const lieferplan = generiereInboundLieferplan(
        produktionsplaeneFormatiert,
        konfiguration.planungsjahr,
        konfiguration.lieferant.gesamtVorlaufzeitTage,
        konfiguration.feiertage,
        stuecklistenMap,
        konfiguration.lieferant.losgroesse
      )
      
      // Konvertiere zu LieferungBundle Array
      const bundles: LieferungBundle[] = []
      
      lieferplan.lieferungenAmWerk.forEach((komponenten, datumStr) => {
        const gesamtMenge = Object.values(komponenten).reduce((sum, m) => sum + m, 0)
        
        // Parse Datum für formatierte Anzeige
        const datum = new Date(datumStr)
        const formatiert = datum.toLocaleDateString('de-DE', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        
        bundles.push({
          id: datumStr,
          verfuegbarAb: datumStr,
          verfuegbarAbFormatiert: formatiert,
          gesamtMenge,
          komponenten
        })
      })
      
      // Sortiere nach Datum
      bundles.sort((a, b) => a.verfuegbarAb.localeCompare(b.verfuegbarAb))
      
      return bundles
    } catch (error) {
      console.error('Fehler beim Laden der Lieferungen:', error)
      return []
    }
  }, [konfiguration, isInitialized])
  
  return {
    lieferungen,
    isLoading: !isInitialized
  }
}

export default useLieferungen
