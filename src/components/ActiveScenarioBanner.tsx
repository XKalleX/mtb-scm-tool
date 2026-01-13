'use client'

/**
 * ========================================
 * AKTIVE SZENARIEN BANNER
 * ========================================
 * 
 * Zeigt aktive Szenarien auf allen Seiten an.
 * Macht für Nutzer deutlich, dass Berechnungen
 * unter Berücksichtigung von Szenarien erfolgen.
 * 
 * Design-Referenz: Reporting-Seite grüner Banner
 * 
 * HAW Hamburg WI3 Projekt
 * Anforderung #5 aus Issue
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, TrendingUp, Wrench, Droplet, Ship, X } from 'lucide-react'
import { useSzenarien, SzenarioTyp } from '@/contexts/SzenarienContext'
import { Button } from '@/components/ui/button'

/**
 * Mapping von Szenario-Typen zu Icons und Farben
 */
const SZENARIO_META = {
  marketingaktion: {
    icon: TrendingUp,
    name: 'Marketingaktion',
    farbe: 'blue'
  },
  maschinenausfall: {
    icon: Wrench,
    name: 'China Produktionsausfall',
    farbe: 'orange'
  },
  wasserschaden: {
    icon: Droplet,
    name: 'Transport-Schaden',
    farbe: 'red'
  },
  schiffsverspaetung: {
    icon: Ship,
    name: 'Schiffsverspätung',
    farbe: 'purple'
  }
} as const

/**
 * Banner-Komponente für aktive Szenarien
 * 
 * Features:
 * - Wird nur angezeigt wenn mindestens 1 Szenario aktiv ist
 * - Zeigt Anzahl und Namen der aktiven Szenarien
 * - Macht klar dass alle Metriken dynamisch berechnet werden
 * - Kompakte, nicht störende Darstellung
 * - Konsistentes Design über alle Seiten
 * 
 * @param showDetails - Optionale detaillierte Darstellung der Szenarien (Standard: false)
 */
export function ActiveScenarioBanner({ showDetails = false }: { showDetails?: boolean }) {
  const { getAktiveSzenarien, entfernen } = useSzenarien()
  const aktiveSzenarien = getAktiveSzenarien()

  // Wenn keine Szenarien aktiv, nichts anzeigen
  if (aktiveSzenarien.length === 0) {
    return null
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-900 text-lg">
              Live-Berechnung mit {aktiveSzenarien.length} aktiven Szenario{aktiveSzenarien.length !== 1 ? 's' : ''}
            </CardTitle>
          </div>
        </div>
        <CardDescription className="text-green-700">
          Alle Metriken werden dynamisch unter Berücksichtigung der Szenarien berechnet
        </CardDescription>
      </CardHeader>
      
      {/* Optionale detaillierte Ansicht */}
      {showDetails && (
        <CardContent>
          <div className="space-y-2">
            {aktiveSzenarien.map((szenario) => {
              const meta = SZENARIO_META[szenario.typ as SzenarioTyp]
              if (!meta) return null
              
              const Icon = meta.icon
              
              return (
                <div 
                  key={szenario.id}
                  className="flex items-center justify-between p-2 bg-white border border-green-200 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-green-700" />
                    <div>
                      <span className="text-sm font-medium">{meta.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {getSzenarioSummary(szenario)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => entfernen(szenario.id)}
                    className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-700"
                    title="Szenario entfernen"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
          
          <div className="mt-3 pt-3 border-t border-green-200">
            <p className="text-xs text-green-700">
              💡 <strong>Tipp:</strong> Öffnen Sie den Szenario-Manager (grüner Button unten rechts), 
              um Szenarien zu bearbeiten oder zu entfernen.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Generiert eine lesbare Zusammenfassung der Szenario-Parameter
 */
function getSzenarioSummary(szenario: any): string {
  switch (szenario.typ) {
    case 'marketingaktion':
      return `+${szenario.parameter.erhoehungProzent}% für ${szenario.parameter.dauerWochen} Wochen (ab KW ${szenario.parameter.startKW})`
    
    case 'maschinenausfall':
      return `-${szenario.parameter.reduktionProzent}% für ${szenario.parameter.dauerTage} Tage (ab ${formatDate(szenario.parameter.startDatum)})`
    
    case 'wasserschaden':
      return `${szenario.parameter.verlustMenge} Teile verloren (${formatDate(szenario.parameter.datum)})`
    
    case 'schiffsverspaetung':
      return `+${szenario.parameter.verspaetungTage} Tage Verzögerung (${formatDate(szenario.parameter.ursprungAnkunft)} → ${formatDate(szenario.parameter.neueAnkunft)})`
    
    default:
      return ''
  }
}

/**
 * Formatiert ein Datum in deutsches Format (TT.MM.YYYY)
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return dateString
  }
}
