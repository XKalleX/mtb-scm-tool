'use client'

/**
 * ========================================
 * SZENARIEN-MANAGER
 * ========================================
 * 
 * Verwaltung operativer Szenarien:
 * 1. Marketingaktion - Kurzfristige Nachfrageerhöhung
 * 2. Maschinenausfall - Lieferantenprobleme
 * 3. Wasserschaden/Sturm - Bestandsverlust
 * 4. Schiffsverspätung - Transportverzögerungen
 * 
 * Features:
 * - Szenario-Auswahl und Konfiguration
 * - Before/After Vergleich
 * - Impact-Analyse
 * - Gegenmaßnahmen
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  AlertTriangle, 
  TrendingUp, 
  Wrench, 
  Droplet, 
  Ship,
  Play,
  RotateCcw,
  BarChart3,
  AlertCircle
} from 'lucide-react'

type SzenarioTyp = 'marketingaktion' | 'maschinenausfall' | 'wasserschaden' | 'schiffsverspaetung'

interface SzenarioParameter {
  key: string
  label: string
  typ: 'number' | 'date' | 'select' | 'text' | 'multiselect'
  default: string | number | string[]
  options?: string[]
}

interface SzenarioDefinition {
  id: SzenarioTyp
  name: string
  icon: any
  farbe: string
  beschreibung: string
  beispiel: string
  parameter: SzenarioParameter[]
}

interface SzenarioConfig {
  typ: SzenarioTyp
  parameter: Record<string, any>
  aktiv: boolean
}

export default function SzenarienManager() {
  const [aktiveSzenarien, setAktiveSzenarien] = useState<SzenarioConfig[]>([])
  const [gewaehltesScenario, setGewaehltesScenario] = useState<SzenarioTyp | null>(null)
  
  const szenarien: SzenarioDefinition[] = [
    {
      id: 'marketingaktion' as SzenarioTyp,
      name: 'Marketingaktion',
      icon: TrendingUp,
      farbe: 'blue',
      beschreibung: 'Erfolgreiche Marketing-Kampagne führt zu kurzfristiger Nachfrageerhöhung',
      beispiel: 'Zeitschrift "Mountain Biker" Sonderausgabe erhöht Nachfrage um 15-30%',
      parameter: [
        { key: 'startKW', label: 'Start Kalenderwoche', typ: 'number', default: 28 },
        { key: 'dauerWochen', label: 'Dauer (Wochen)', typ: 'number', default: 4 },
        { key: 'erhoehungProzent', label: 'Nachfrage-Erhöhung (%)', typ: 'number', default: 20 },
        { key: 'betroffeneVarianten', label: 'Betroffene Varianten', typ: 'multiselect', default: ['alle'] }
      ]
    },
    {
      id: 'maschinenausfall' as SzenarioTyp,
      name: 'Maschinenausfall',
      icon: Wrench,
      farbe: 'orange',
      beschreibung: 'Zulieferer kann georderte Menge nicht rechtzeitig liefern',
      beispiel: 'Produktionsmaschine in Saragossa fällt aus, Gabellieferung reduziert',
      parameter: [
        { key: 'zulieferer', label: 'Betroffener Zulieferer', typ: 'select', options: ['China', 'Spanien', 'Heilbronn'], default: 'Spanien' },
        { key: 'startDatum', label: 'Ausfall ab Datum', typ: 'date', default: '2027-03-15' },
        { key: 'dauerTage', label: 'Ausfallde (Tage)', typ: 'number', default: 7 },
        { key: 'reduktionProzent', label: 'Produktions-Reduktion (%)', typ: 'number', default: 60 },
        { key: 'betroffeneTeile', label: 'Betroffene Teile', typ: 'multiselect', default: ['alle'] }
      ]
    },
    {
      id: 'wasserschaden' as SzenarioTyp,
      name: 'Wasserschaden / Sturm',
      icon: Droplet,
      farbe: 'red',
      beschreibung: 'Bestandsverlust durch Wasserschaden im Lager oder Container-Verlust',
      beispiel: 'Sturm auf See - Container mit Sätteln geht auf MSC Mara verloren',
      parameter: [
        { key: 'ort', label: 'Ort des Schadens', typ: 'select', options: ['Lager Dortmund', 'Lager China', 'Transport See', 'Transport Land'], default: 'Transport See' },
        { key: 'datum', label: 'Datum des Ereignisses', typ: 'date', default: '2027-02-20' },
        { key: 'verlustMenge', label: 'Verlorene Menge (Stück)', typ: 'number', default: 1000 },
        { key: 'betroffeneTeile', label: 'Betroffene Teile', typ: 'text', default: 'Sättel (gemischt)' }
      ]
    },
    {
      id: 'schiffsverspaetung' as SzenarioTyp,
      name: 'Schiffsverspätung',
      icon: Ship,
      farbe: 'purple',
      beschreibung: 'Wetterverhältnisse verzögern Ankunft von Seefracht',
      beispiel: 'MSC Mara verspätet sich um 4 Tage aufgrund von Sturm im Nordatlantik',
      parameter: [
        { key: 'schiff', label: 'Betroffenes Schiff', typ: 'select', options: ['MSC Gülsün', 'MSC Mina', 'MSC Mara', 'MSC Lausanne', 'MSC Samar'], default: 'MSC Mara' },
        { key: 'ursprungAnkunft', label: 'Geplante Ankunft', typ: 'date', default: '2027-02-16' },
        { key: 'verspaetungTage', label: 'Verspätung (Tage)', typ: 'number', default: 4 },
        { key: 'neueAnkunft', label: 'Neue Ankunft', typ: 'date', default: '2027-02-20' }
      ]
    }
  ]
  
  const szenarioHinzufuegen = (typ: SzenarioTyp, parameter: Record<string, any>) => {
    setAktiveSzenarien([...aktiveSzenarien, { typ, parameter, aktiv: true }])
  }
  
  const szenarioEntfernen = (index: number) => {
    setAktiveSzenarien(aktiveSzenarien.filter((_, i) => i !== index))
  }
  
  const simulationStarten = () => {
    console.log('Starte Simulation mit Szenarien:', aktiveSzenarien)
    // Hier würde die eigentliche Simulation ausgeführt
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Szenarien-Manager</h2>
          <p className="text-sm text-gray-600 mt-1">
            Simulieren Sie operative Szenarien und analysieren Sie deren Auswirkungen auf die Supply Chain
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAktiveSzenarien([])}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Zurücksetzen
          </Button>
          <Button onClick={simulationStarten} className="bg-green-600 hover:bg-green-700">
            <Play className="h-4 w-4 mr-2" />
            Simulation starten
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Linke Spalte: Szenario-Auswahl */}
        <div className="col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verfügbare Szenarien</CardTitle>
              <CardDescription>
                Wählen Sie ein Szenario aus und konfigurieren Sie die Parameter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {szenarien.map((szenario) => {
                const Icon = szenario.icon
                const bgColor = `bg-${szenario.farbe}-50`
                const textColor = `text-${szenario.farbe}-700`
                const borderColor = `border-${szenario.farbe}-200`
                
                return (
                  <button
                    key={szenario.id}
                    onClick={() => setGewaehltesScenario(szenario.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                      gewaehltesScenario === szenario.id 
                        ? `${borderColor} ${bgColor}` 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-6 w-6 mt-0.5 ${gewaehltesScenario === szenario.id ? textColor : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{szenario.name}</h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {szenario.beschreibung}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Aktive Szenarien */}
          {aktiveSzenarien.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Aktive Szenarien ({aktiveSzenarien.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {aktiveSzenarien.map((sz, idx) => {
                  const szenario = szenarien.find(s => s.id === sz.typ)
                  if (!szenario) return null
                  const Icon = szenario.icon
                  
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">{szenario.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => szenarioEntfernen(idx)}
                      >
                        ×
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Rechte Spalte: Szenario-Konfiguration */}
        <div className="col-span-8">
          {gewaehltesScenario ? (
            <SzenarioKonfiguration
              szenario={szenarien.find(s => s.id === gewaehltesScenario)!}
              onHinzufuegen={szenarioHinzufuegen}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400 p-12">
                <AlertCircle className="h-16 w-16 mx-auto mb-4" />
                <p>Wählen Sie ein Szenario aus der Liste links</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Szenario-Konfigurations-Komponente
 */
function SzenarioKonfiguration({ 
  szenario, 
  onHinzufuegen 
}: { 
  szenario: SzenarioDefinition
  onHinzufuegen: (typ: SzenarioTyp, parameter: Record<string, any>) => void 
}) {
  const [parameter, setParameter] = useState<Record<string, any>>(
    szenario.parameter.reduce((acc: any, param: any) => {
      acc[param.key] = param.default
      return acc
    }, {})
  )
  
  const Icon = szenario.icon
  
  const handleSubmit = () => {
    onHinzufuegen(szenario.id, parameter)
  }
  
  return (
    <Card>
      <CardHeader className={`bg-${szenario.farbe}-50 border-b`}>
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 text-${szenario.farbe}-700`} />
          <div>
            <CardTitle>{szenario.name}</CardTitle>
            <CardDescription>{szenario.beschreibung}</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Beispiel-Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-700 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-blue-900">Beispiel-Szenario</p>
              <p className="text-sm text-blue-800 mt-1">{szenario.beispiel}</p>
            </div>
          </div>
        </div>

        {/* Parameter-Formular */}
        <div className="space-y-4">
          <h3 className="font-semibold">Szenario-Parameter</h3>
          
          {szenario.parameter.map((param: SzenarioParameter) => (
            <div key={param.key} className="space-y-2">
              <Label htmlFor={param.key}>{param.label}</Label>
              
              {param.typ === 'number' && (
                <Input
                  id={param.key}
                  type="number"
                  value={parameter[param.key]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setParameter({...parameter, [param.key]: parseInt(e.target.value)})
                  }
                  className="max-w-xs"
                />
              )}
              
              {param.typ === 'date' && (
                <Input
                  id={param.key}
                  type="date"
                  value={parameter[param.key]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setParameter({...parameter, [param.key]: e.target.value})
                  }
                  className="max-w-xs"
                />
              )}
              
              {param.typ === 'select' && (
                <select
                  id={param.key}
                  value={parameter[param.key]}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    setParameter({...parameter, [param.key]: e.target.value})
                  }
                  className="max-w-xs px-3 py-2 border rounded-md"
                >
                  {param.options?.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              
              {param.typ === 'text' && (
                <Input
                  id={param.key}
                  type="text"
                  value={parameter[param.key]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setParameter({...parameter, [param.key]: e.target.value})
                  }
                />
              )}
            </div>
          ))}
        </div>

        {/* Impact-Prognose */}
        <div className="border-t pt-6">
          <h3 className="font-semibold mb-3">Erwartete Auswirkungen</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-xs text-red-700 font-semibold">Materialverfügbarkeit</p>
              <p className="text-2xl font-bold text-red-900 mt-1">-12%</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-xs text-orange-700 font-semibold">Produktionsauslastung</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">87%</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-xs text-yellow-700 font-semibold">Liefertreue</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">91%</p>
            </div>
          </div>
        </div>

        {/* Aktionen */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Vorschau anzeigen
          </Button>
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
            Szenario hinzufügen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}