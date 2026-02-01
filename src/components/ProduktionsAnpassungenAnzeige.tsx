'use client'

/**
 * ========================================
 * PRODUKTIONS-ANPASSUNGEN ANZEIGE
 * ========================================
 * 
 * Zeigt manuelle Anpassungen der OEM-Programmplanung an:
 * - Welche Periode wurde geändert (KW oder Monat)
 * - Welche Variante betroffen
 * - Wie viel wurde angepasst (+/-)
 * - Möglichkeit zum Rückgängig machen
 * 
 * POSITION: Zwischen Varianten-Kacheln und Tabelle
 */

import React from 'react'
import { X, RotateCcw, Info, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  AnpassungsEintrag, 
  erstelleAnpassungsUebersicht,
  ProduktionsAnpassungen 
} from '@/lib/helpers/produktions-anpassungen'
import { formatNumber } from '@/lib/utils'

interface ProduktionsAnpassungenAnzeigeProps {
  anpassungen: ProduktionsAnpassungen
  variantenNamen: Record<string, string>
  onEntferneAnpassung: (key: string) => void
  onResetAlle: () => void
}

/**
 * Component zur Anzeige und Verwaltung von Produktionsanpassungen
 */
export default function ProduktionsAnpassungenAnzeige({
  anpassungen,
  variantenNamen,
  onEntferneAnpassung,
  onResetAlle
}: ProduktionsAnpassungenAnzeigeProps) {
  const eintraege = erstelleAnpassungsUebersicht(anpassungen, variantenNamen)
  
  // Keine Anpassungen? Zeige nichts
  if (eintraege.length === 0) {
    return null
  }
  
  // Berechne Gesamt-Delta
  const gesamtDelta = eintraege.reduce((sum, e) => sum + e.delta, 0)
  
  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">
                Manuelle Anpassungen aktiv ({eintraege.length})
              </h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onResetAlle}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Alle zurücksetzen
            </Button>
          </div>
          
          {/* Gesamt-Delta Anzeige */}
          <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200">
            {gesamtDelta >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <span className="text-sm font-medium">
              Gesamt-Anpassung:
            </span>
            <span className={`font-bold ${gesamtDelta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {gesamtDelta >= 0 ? '+' : ''}{formatNumber(gesamtDelta, 0)} Bikes
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              (wird proportional auf das Jahr verteilt)
            </span>
          </div>
          
          {/* Liste der Anpassungen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {eintraege.map(eintrag => (
              <AnpassungsKarte
                key={eintrag.key}
                eintrag={eintrag}
                onEntfernen={() => onEntferneAnpassung(eintrag.key)}
              />
            ))}
          </div>
          
          {/* Info-Text */}
          <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
            <strong>Hinweis:</strong> Anpassungen werden proportional auf die Arbeitstage der Periode verteilt. 
            Das Error Management stellt sicher, dass die Jahresgesamtmenge erhalten bleibt (370.000 Bikes).
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Einzelne Anpassungs-Karte
 */
interface AnpassungsKarteProps {
  eintrag: AnpassungsEintrag
  onEntfernen: () => void
}

function AnpassungsKarte({ eintrag, onEntfernen }: AnpassungsKarteProps) {
  const istPositiv = eintrag.delta >= 0
  
  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:border-blue-300 transition-colors">
      {/* Typ Badge */}
      <Badge 
        variant="outline" 
        className={eintrag.typ === 'monat' ? 'bg-purple-50 text-purple-700 border-purple-300' : 'bg-indigo-50 text-indigo-700 border-indigo-300'}
      >
        {eintrag.periodeLabel}
      </Badge>
      
      {/* Variante */}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground truncate">
          {eintrag.varianteName.replace('MTB ', '')}
        </div>
        <div className={`text-sm font-semibold ${istPositiv ? 'text-green-700' : 'text-red-700'}`}>
          {istPositiv ? '+' : ''}{formatNumber(eintrag.delta, 0)}
        </div>
      </div>
      
      {/* Entfernen Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onEntfernen}
        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
        title="Anpassung entfernen"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
