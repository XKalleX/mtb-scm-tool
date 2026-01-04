'use client'

/**
 * ========================================
 * SZENARIEN-SIMULATION SEITE
 * ========================================
 * 
 * Hauptseite für Szenario-Simulationen:
 * - Marketingaktion
 * - Maschinenausfall
 * - Wasserschaden/Sturm
 * - Schiffsverspätung
 * 
 * Features:
 * - Interaktive Szenario-Konfiguration
 * - Simulation mit Before/After Vergleich
 * - Impact-Analyse
 * - Ergebnis-Visualisierung
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AlertTriangle, 
  TrendingUp, 
  Wrench, 
  Droplet, 
  Ship,
  Play,
  RotateCcw,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Download,
  Info
} from 'lucide-react'
import { formatNumber, formatPercent } from '@/lib/utils'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'

type SzenarioTyp = 'marketingaktion' | 'maschinenausfall' | 'wasserschaden' | 'schiffsverspaetung'

interface SzenarioConfig {
  typ: SzenarioTyp
  parameter: Record<string, any>
  aktiv: boolean
}

interface SimulationResult {
  vorher: {
    produktion: number
    materialverfuegbarkeit: number
    liefertreue: number
  }
  nachher: {
    produktion: number
    materialverfuegbarkeit: number
    liefertreue: number
  }
  auswirkungen: string[]
}

/**
 * Hauptseite für Szenario-Simulation
 */
export default function SzenarienPage() {
  const [selectedSzenario, setSelectedSzenario] = useState<SzenarioTyp | null>(null)
  const [aktiveSzenarien, setAktiveSzenarien] = useState<SzenarioConfig[]>([])
  const [simulationLaeuft, setSimulationLaeuft] = useState(false)
  const [simulationErgebnis, setSimulationErgebnis] = useState<SimulationResult | null>(null)

  /**
   * Startet die Simulation mit allen aktiven Szenarien
   */
  const simulationStarten = () => {
    setSimulationLaeuft(true)
    
    // Simuliere Berechnung (in Realität würden hier echte Berechnungen stattfinden)
    setTimeout(() => {
      const ergebnis = berechneSimulation(aktiveSzenarien)
      setSimulationErgebnis(ergebnis)
      setSimulationLaeuft(false)
    }, 1500)
  }

  /**
   * Berechnet die Auswirkungen der Szenarien
   */
  const berechneSimulation = (szenarien: SzenarioConfig[]): SimulationResult => {
    const baselineProduktion = 370000
    const baselineMaterial = 98.5
    const baselineLiefertreue = 95.2
    
    let produktionFaktor = 1.0
    let materialFaktor = 1.0
    let liefertreueFaktor = 1.0
    const auswirkungen: string[] = []

    szenarien.forEach(szenario => {
      switch (szenario.typ) {
        case 'marketingaktion':
          const erhoehung = szenario.parameter.erhoehungProzent || 20
          produktionFaktor *= (1 + erhoehung / 100) // Multiply by 1.2 for 20% increase
          materialFaktor -= 0.05
          auswirkungen.push(`📈 Nachfrage +${erhoehung}% für ${szenario.parameter.dauerWochen} Wochen`)
          auswirkungen.push(`⚠️ Erhöhte Materialanforderungen führen zu Engpässen`)
          break
          
        case 'maschinenausfall':
          const reduktion = szenario.parameter.reduktionProzent || 60
          produktionFaktor -= reduktion / 200 // Reduktion nur für betroffenen Zulieferer
          materialFaktor -= reduktion / 100
          liefertreueFaktor -= 0.08
          auswirkungen.push(`🔧 ${szenario.parameter.zulieferer} fällt aus - Produktion -${reduktion}%`)
          auswirkungen.push(`❌ Lieferverzögerungen bei betroffenen Teilen`)
          break
          
        case 'wasserschaden':
          const verlust = szenario.parameter.verlustMenge || 1000
          materialFaktor -= verlust / 10000
          liefertreueFaktor -= 0.05
          auswirkungen.push(`💧 ${verlust} Teile verloren bei ${szenario.parameter.ort}`)
          auswirkungen.push(`⏱️ Nachbestellung benötigt ~56 Tage Vorlaufzeit`)
          break
          
        case 'schiffsverspaetung':
          const tage = szenario.parameter.verspaetungTage || 4
          liefertreueFaktor -= tage / 100
          materialFaktor -= tage / 80
          auswirkungen.push(`🚢 ${szenario.parameter.schiff} verspätet sich um ${tage} Tage`)
          auswirkungen.push(`⏰ Produktionsverzögerungen für abhängige Varianten`)
          break
      }
    })

    return {
      vorher: {
        produktion: baselineProduktion,
        materialverfuegbarkeit: baselineMaterial,
        liefertreue: baselineLiefertreue
      },
      nachher: {
        produktion: Math.round(baselineProduktion * produktionFaktor),
        materialverfuegbarkeit: Math.round(baselineMaterial * materialFaktor * 10) / 10,
        liefertreue: Math.round(baselineLiefertreue * liefertreueFaktor * 10) / 10
      },
      auswirkungen
    }
  }

  /**
   * Fügt ein Szenario hinzu
   */
  const szenarioHinzufuegen = (typ: SzenarioTyp, parameter: Record<string, any>) => {
    setAktiveSzenarien([...aktiveSzenarien, { typ, parameter, aktiv: true }])
    setSimulationErgebnis(null) // Reset results
  }

  /**
   * Entfernt ein Szenario
   */
  const szenarioEntfernen = (index: number) => {
    setAktiveSzenarien(aktiveSzenarien.filter((_, i) => i !== index))
    setSimulationErgebnis(null) // Reset results
  }

  /**
   * Setzt alles zurück
   */
  const allesZuruecksetzen = () => {
    setAktiveSzenarien([])
    setSelectedSzenario(null)
    setSimulationErgebnis(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Szenario-Simulation</h1>
          <p className="text-muted-foreground mt-1">
            Analysieren Sie die Auswirkungen operativer Störungen auf die Supply Chain
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={allesZuruecksetzen}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Zurücksetzen
          </Button>
          <Button 
            onClick={simulationStarten}
            disabled={aktiveSzenarien.length === 0 || simulationLaeuft}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {simulationLaeuft ? 'Läuft...' : 'Simulation starten'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="konfiguration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="konfiguration">Konfiguration</TabsTrigger>
          <TabsTrigger value="ergebnisse" disabled={!simulationErgebnis}>
            Ergebnisse {simulationErgebnis && '✓'}
          </TabsTrigger>
        </TabsList>

        {/* Konfiguration Tab */}
        <TabsContent value="konfiguration" className="space-y-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Linke Spalte: Szenario-Auswahl */}
            <div className="col-span-4 space-y-4">
              <SzenarioAuswahlListe
                selectedSzenario={selectedSzenario}
                onSelect={setSelectedSzenario}
                aktiveSzenarien={aktiveSzenarien}
                onEntfernen={szenarioEntfernen}
              />
            </div>

            {/* Rechte Spalte: Szenario-Konfiguration */}
            <div className="col-span-8">
              {selectedSzenario ? (
                <SzenarioKonfiguration
                  szenarioTyp={selectedSzenario}
                  onHinzufuegen={szenarioHinzufuegen}
                />
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-400 p-12">
                    <AlertCircle className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg font-medium">Wählen Sie ein Szenario aus der Liste links</p>
                    <p className="text-sm mt-2">Konfigurieren Sie die Parameter und fügen Sie es zur Simulation hinzu</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Ergebnisse Tab */}
        <TabsContent value="ergebnisse" className="space-y-6">
          {simulationErgebnis && (
            <SimulationErgebnisse ergebnis={simulationErgebnis} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Szenario-Auswahl Liste Komponente
 */
function SzenarioAuswahlListe({
  selectedSzenario,
  onSelect,
  aktiveSzenarien,
  onEntfernen
}: {
  selectedSzenario: SzenarioTyp | null
  onSelect: (typ: SzenarioTyp) => void
  aktiveSzenarien: SzenarioConfig[]
  onEntfernen: (index: number) => void
}) {
  const szenarien = [
    {
      id: 'marketingaktion' as SzenarioTyp,
      name: 'Marketingaktion',
      icon: TrendingUp,
      farbe: 'blue',
      beschreibung: 'Erfolgreiche Marketing-Kampagne führt zu kurzfristiger Nachfrageerhöhung'
    },
    {
      id: 'maschinenausfall' as SzenarioTyp,
      name: 'Maschinenausfall',
      icon: Wrench,
      farbe: 'orange',
      beschreibung: 'Zulieferer kann georderte Menge nicht rechtzeitig liefern'
    },
    {
      id: 'wasserschaden' as SzenarioTyp,
      name: 'Wasserschaden / Sturm',
      icon: Droplet,
      farbe: 'red',
      beschreibung: 'Bestandsverlust durch Wasserschaden im Lager oder Container-Verlust'
    },
    {
      id: 'schiffsverspaetung' as SzenarioTyp,
      name: 'Schiffsverspätung',
      icon: Ship,
      farbe: 'purple',
      beschreibung: 'Wetterverhältnisse verzögern Ankunft von Seefracht'
    }
  ]

  return (
    <>
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
            const isSelected = selectedSzenario === szenario.id
            
            return (
              <button
                key={szenario.id}
                onClick={() => onSelect(szenario.id)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                  isSelected 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-6 w-6 mt-0.5 ${isSelected ? 'text-blue-700' : 'text-gray-400'}`} />
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
            <CardDescription>Werden in der Simulation berücksichtigt</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {aktiveSzenarien.map((sz, idx) => {
              const szenario = szenarien.find(s => s.id === sz.typ)
              if (!szenario) return null
              const Icon = szenario.icon
              
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-green-700" />
                    <span className="text-sm font-medium">{szenario.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEntfernen(idx)}
                    className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-700"
                  >
                    ×
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </>
  )
}

/**
 * Szenario-Konfiguration Komponente
 */
function SzenarioKonfiguration({
  szenarioTyp,
  onHinzufuegen
}: {
  szenarioTyp: SzenarioTyp
  onHinzufuegen: (typ: SzenarioTyp, parameter: Record<string, any>) => void
}) {
  const getDefaultParameter = (typ: SzenarioTyp) => {
    switch (typ) {
      case 'marketingaktion':
        return {
          startKW: 28,
          dauerWochen: 4,
          erhoehungProzent: 20,
          betroffeneVarianten: 'Alle'
        }
      case 'maschinenausfall':
        return {
          zulieferer: 'Spanien',
          startDatum: '2027-03-15',
          dauerTage: 7,
          reduktionProzent: 60,
          betroffeneTeile: 'Gabeln'
        }
      case 'wasserschaden':
        return {
          ort: 'Transport See',
          datum: '2027-02-20',
          verlustMenge: 1000,
          betroffeneTeile: 'Sättel (gemischt)'
        }
      case 'schiffsverspaetung':
        return {
          schiff: 'MSC Mara',
          ursprungAnkunft: '2027-02-16',
          verspaetungTage: 4,
          neueAnkunft: '2027-02-20'
        }
    }
  }

  const [parameter, setParameter] = useState<Record<string, any>>(getDefaultParameter(szenarioTyp))

  type FieldDef = {
    key: string
    label: string
    type: 'number' | 'date' | 'text' | 'select'
    options?: string[]
  }

  const szenarioDetails: Record<SzenarioTyp, {
    name: string
    icon: any
    beispiel: string
    fields: FieldDef[]
  }> = {
    marketingaktion: {
      name: 'Marketingaktion',
      icon: TrendingUp,
      beispiel: 'Zeitschrift "Mountain Biker" Sonderausgabe erhöht Nachfrage um 15-30%',
      fields: [
        { key: 'startKW', label: 'Start Kalenderwoche', type: 'number' },
        { key: 'dauerWochen', label: 'Dauer (Wochen)', type: 'number' },
        { key: 'erhoehungProzent', label: 'Nachfrage-Erhöhung (%)', type: 'number' },
        { key: 'betroffeneVarianten', label: 'Betroffene Varianten', type: 'text' }
      ]
    },
    maschinenausfall: {
      name: 'Maschinenausfall',
      icon: Wrench,
      beispiel: 'Produktionsmaschine in Saragossa fällt aus, Gabellieferung reduziert',
      fields: [
        { key: 'zulieferer', label: 'Betroffener Zulieferer', type: 'select', options: ['China', 'Spanien', 'Heilbronn'] },
        { key: 'startDatum', label: 'Ausfall ab Datum', type: 'date' },
        { key: 'dauerTage', label: 'Dauer (Tage)', type: 'number' },
        { key: 'reduktionProzent', label: 'Produktions-Reduktion (%)', type: 'number' },
        { key: 'betroffeneTeile', label: 'Betroffene Teile', type: 'text' }
      ]
    },
    wasserschaden: {
      name: 'Wasserschaden / Sturm',
      icon: Droplet,
      beispiel: 'Sturm auf See - Container mit Sätteln geht auf MSC Mara verloren',
      fields: [
        { key: 'ort', label: 'Ort des Schadens', type: 'select', options: ['Lager Dortmund', 'Lager China', 'Transport See', 'Transport Land'] },
        { key: 'datum', label: 'Datum des Ereignisses', type: 'date' },
        { key: 'verlustMenge', label: 'Verlorene Menge (Stück)', type: 'number' },
        { key: 'betroffeneTeile', label: 'Betroffene Teile', type: 'text' }
      ]
    },
    schiffsverspaetung: {
      name: 'Schiffsverspätung',
      icon: Ship,
      beispiel: 'MSC Mara verspätet sich um 4 Tage aufgrund von Sturm im Nordatlantik',
      fields: [
        { key: 'schiff', label: 'Betroffenes Schiff', type: 'select', options: ['MSC Gülsün', 'MSC Mina', 'MSC Mara', 'MSC Lausanne', 'MSC Samar'] },
        { key: 'ursprungAnkunft', label: 'Geplante Ankunft', type: 'date' },
        { key: 'verspaetungTage', label: 'Verspätung (Tage)', type: 'number' },
        { key: 'neueAnkunft', label: 'Neue Ankunft', type: 'date' }
      ]
    }
  }

  const details = szenarioDetails[szenarioTyp]
  const Icon = details.icon

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white rounded-full p-3">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>{details.name}</CardTitle>
            <CardDescription>Konfigurieren Sie die Szenario-Parameter</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Beispiel-Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-700 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-blue-900">Beispiel-Szenario</p>
              <p className="text-sm text-blue-800 mt-1">{details.beispiel}</p>
            </div>
          </div>
        </div>

        {/* Parameter-Formular */}
        <div className="space-y-4">
          <h3 className="font-semibold">Szenario-Parameter</h3>
          
          {details.fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              
              {field.type === 'number' && (
                <Input
                  id={field.key}
                  type="number"
                  value={parameter[field.key]}
                  onChange={(e) => setParameter({...parameter, [field.key]: parseInt(e.target.value) || 0})}
                  className="max-w-xs"
                />
              )}
              
              {field.type === 'date' && (
                <Input
                  id={field.key}
                  type="date"
                  value={parameter[field.key]}
                  onChange={(e) => setParameter({...parameter, [field.key]: e.target.value})}
                  className="max-w-xs"
                />
              )}
              
              {field.type === 'select' && field.options && (
                <select
                  id={field.key}
                  value={parameter[field.key]}
                  onChange={(e) => setParameter({...parameter, [field.key]: e.target.value})}
                  className="max-w-xs px-3 py-2 border rounded-md"
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              
              {field.type === 'text' && (
                <Input
                  id={field.key}
                  type="text"
                  value={parameter[field.key]}
                  onChange={(e) => setParameter({...parameter, [field.key]: e.target.value})}
                />
              )}
            </div>
          ))}
        </div>

        {/* Aktionen */}
        <div className="flex items-center justify-end pt-4 border-t">
          <Button 
            onClick={() => onHinzufuegen(szenarioTyp, parameter)} 
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Szenario hinzufügen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Simulation Ergebnisse Komponente
 */
function SimulationErgebnisse({ ergebnis }: { ergebnis: SimulationResult }) {
  // Daten für Vergleichsdiagramm
  const vergleichsDaten = [
    {
      metrik: 'Produktion',
      vorher: ergebnis.vorher.produktion,
      nachher: ergebnis.nachher.produktion,
      einheit: 'Bikes'
    },
    {
      metrik: 'Material',
      vorher: ergebnis.vorher.materialverfuegbarkeit,
      nachher: ergebnis.nachher.materialverfuegbarkeit,
      einheit: '%'
    },
    {
      metrik: 'Liefertreue',
      vorher: ergebnis.vorher.liefertreue,
      nachher: ergebnis.nachher.liefertreue,
      einheit: '%'
    }
  ]

  const getDifferenz = (vorher: number, nachher: number) => {
    const diff = nachher - vorher
    const prozent = ((diff / vorher) * 100).toFixed(1)
    return { diff, prozent }
  }

  return (
    <div className="space-y-6">
      {/* Übersicht-Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Produktionsauswirkung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(ergebnis.nachher.produktion, 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Vorher: {formatNumber(ergebnis.vorher.produktion, 0)} Bikes
            </div>
            <div className={`text-sm font-medium mt-2 ${
              ergebnis.nachher.produktion >= ergebnis.vorher.produktion 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {getDifferenz(ergebnis.vorher.produktion, ergebnis.nachher.produktion).prozent}% Änderung
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Materialverfügbarkeit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(ergebnis.nachher.materialverfuegbarkeit, 1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Vorher: {formatPercent(ergebnis.vorher.materialverfuegbarkeit, 1)}
            </div>
            <div className={`text-sm font-medium mt-2 ${
              ergebnis.nachher.materialverfuegbarkeit >= ergebnis.vorher.materialverfuegbarkeit 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {getDifferenz(ergebnis.vorher.materialverfuegbarkeit, ergebnis.nachher.materialverfuegbarkeit).prozent}% Änderung
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Liefertreue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(ergebnis.nachher.liefertreue, 1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Vorher: {formatPercent(ergebnis.vorher.liefertreue, 1)}
            </div>
            <div className={`text-sm font-medium mt-2 ${
              ergebnis.nachher.liefertreue >= ergebnis.vorher.liefertreue 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {getDifferenz(ergebnis.vorher.liefertreue, ergebnis.nachher.liefertreue).prozent}% Änderung
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auswirkungen Liste */}
      <Card>
        <CardHeader>
          <CardTitle>Identifizierte Auswirkungen</CardTitle>
          <CardDescription>Erwartete Konsequenzen der konfigurierten Szenarien</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ergebnis.auswirkungen.map((auswirkung, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{auswirkung}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vergleichsdiagramm */}
      <Card>
        <CardHeader>
          <CardTitle>Vorher/Nachher Vergleich</CardTitle>
          <CardDescription>Visuelle Gegenüberstellung der Auswirkungen</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vergleichsDaten}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="metrik" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                formatter={(value: any, name: string, props: any) => {
                  // Get the actual data key from the payload
                  const dataKey = props.dataKey
                  const item = vergleichsDaten.find(d => d.metrik === dataKey)
                  return `${formatNumber(value as number, 1)} ${item?.einheit || ''}`
                }}
              />
              <Legend />
              <Bar dataKey="vorher" fill="#3b82f6" name="Vorher (Baseline)" />
              <Bar dataKey="nachher" fill="#10b981" name="Nachher (Mit Szenarien)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Empfehlungen */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">Empfohlene Gegenmaßnahmen</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Erhöhen Sie die Sicherheitsbestände kritischer Komponenten</li>
            <li>• Aktivieren Sie zusätzliche Produktionsschichten bei Nachfragespitzen</li>
            <li>• Prüfen Sie alternative Lieferanten für zeitkritische Teile</li>
            <li>• Implementieren Sie einen Puffer für Transportverzögerungen</li>
            <li>• Kommunizieren Sie proaktiv mit Kunden bei absehbaren Verzögerungen</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
