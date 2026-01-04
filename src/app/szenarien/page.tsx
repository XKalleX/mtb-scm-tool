'use client'

/**
 * ========================================
 * SZENARIEN-SIMULATION SEITE
 * ========================================
 * 
 * Globale Szenario-Verwaltung:
 * - Szenarien persistieren über Tab-Wechsel
 * - Auswirkungen auf gesamte Supply Chain
 * - Nur China als Lieferant (vereinfacht)
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
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react'
import { formatNumber, formatPercent } from '@/lib/utils'
import { useSzenarien, SzenarioTyp, berechneGlobaleAuswirkungen } from '@/contexts/SzenarienContext'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

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
 * Hauptseite für Szenario-Simulation mit globalem State
 */
export default function SzenarienPage() {
  const { szenarien, hinzufuegen, entfernen, zuruecksetzen, getAktiveSzenarien } = useSzenarien()
  const [selectedSzenario, setSelectedSzenario] = useState<SzenarioTyp | null>(null)
  const [simulationLaeuft, setSimulationLaeuft] = useState(false)
  const [simulationErgebnis, setSimulationErgebnis] = useState<SimulationResult | null>(null)

  /**
   * Startet die Simulation mit allen aktiven Szenarien
   */
  const simulationStarten = () => {
    setSimulationLaeuft(true)
    
    // Berechne Auswirkungen mit globalem Context
    setTimeout(() => {
      const aktiveSzenarien = getAktiveSzenarien()
      const auswirkungen = berechneGlobaleAuswirkungen(aktiveSzenarien)
      
      const ergebnis: SimulationResult = {
        vorher: {
          produktion: 370000,
          materialverfuegbarkeit: 98.5,
          liefertreue: 95.2
        },
        nachher: {
          produktion: Math.round(auswirkungen.produktionsmenge),
          materialverfuegbarkeit: Math.max(0, Math.round(auswirkungen.materialverfuegbarkeit * 10) / 10),
          liefertreue: Math.max(0, Math.round(auswirkungen.liefertreue * 10) / 10)
        },
        auswirkungen: generiereAuswirkungsText(aktiveSzenarien)
      }
      
      setSimulationErgebnis(ergebnis)
      setSimulationLaeuft(false)
    }, 1500)
  }

  /**
   * Generiert beschreibenden Text für Auswirkungen
   */
  const generiereAuswirkungsText = (szenarien: any[]) => {
    const texte: string[] = []
    
    szenarien.forEach(szenario => {
      switch (szenario.typ) {
        case 'marketingaktion':
          texte.push(`📈 Nachfrage +${szenario.parameter.erhoehungProzent}% für ${szenario.parameter.dauerWochen} Wochen`)
          texte.push(`⚠️ Erhöhte Materialanforderungen führen zu Engpässen`)
          break
        case 'maschinenausfall':
          texte.push(`🔧 China-Produktion fällt aus - Lieferung -${szenario.parameter.reduktionProzent}%`)
          texte.push(`❌ Lieferverzögerungen bei allen Komponenten aus China`)
          break
        case 'wasserschaden':
          texte.push(`💧 ${szenario.parameter.verlustMenge} Teile verloren`)
          texte.push(`⏱️ Nachbestellung benötigt ~56 Tage Vorlaufzeit aus China`)
          break
        case 'schiffsverspaetung':
          texte.push(`🚢 Schiff verspätet sich um ${szenario.parameter.verspaetungTage} Tage`)
          texte.push(`⏰ Produktionsverzögerungen für abhängige Varianten`)
          break
      }
    })
    
    return texte
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Szenario-Simulation (Global)</h1>
          <p className="text-muted-foreground mt-1">
            Szenarien bleiben über Tab-Wechsel erhalten und beeinflussen alle Berechnungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { zuruecksetzen(); setSimulationErgebnis(null); }}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Alle löschen
          </Button>
          <Button 
            onClick={simulationStarten}
            disabled={szenarien.length === 0 || simulationLaeuft}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {simulationLaeuft ? 'Läuft...' : 'Simulation starten'}
          </Button>
        </div>
      </div>

      {/* Info Card mit aktiven Szenarien */}
      {szenarien.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">✓ {szenarien.length} Aktive Szenarien</CardTitle>
            <CardDescription className="text-green-700">
              Diese Szenarien wirken sich auf alle Berechnungen im System aus
            </CardDescription>
          </CardHeader>
        </Card>
      )}

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
                aktiveSzenarien={szenarien}
                onEntfernen={entfernen}
              />
            </div>

            {/* Rechte Spalte: Szenario-Konfiguration */}
            <div className="col-span-8">
              {selectedSzenario ? (
                <SzenarioKonfiguration
                  szenarioTyp={selectedSzenario}
                  onHinzufuegen={(typ, params) => {
                    hinzufuegen(typ, params)
                    setSimulationErgebnis(null)
                  }}
                />
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-400 p-12">
                    <AlertCircle className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg font-medium">Wählen Sie ein Szenario aus der Liste links</p>
                    <p className="text-sm mt-2">Nur China-bezogene Szenarien verfügbar</p>
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
 * Szenario-Auswahl Liste Komponente - Vereinfacht für China-only
 */
function SzenarioAuswahlListe({
  selectedSzenario,
  onSelect,
  aktiveSzenarien,
  onEntfernen
}: {
  selectedSzenario: SzenarioTyp | null
  onSelect: (typ: SzenarioTyp) => void
  aktiveSzenarien: any[]
  onEntfernen: (id: string) => void
}) {
  // Nur China-relevante Szenarien
  const szenarien = [
    {
      id: 'marketingaktion' as SzenarioTyp,
      name: 'Marketingaktion',
      icon: TrendingUp,
      farbe: 'blue',
      beschreibung: 'Nachfrageerhöhung durch erfolgreiche Marketing-Kampagne'
    },
    {
      id: 'maschinenausfall' as SzenarioTyp,
      name: 'China Produktionsausfall',
      icon: Wrench,
      farbe: 'orange',
      beschreibung: 'Produktionsstörung beim China-Lieferanten (alle Komponenten betroffen)'
    },
    {
      id: 'wasserschaden' as SzenarioTyp,
      name: 'Transport-Schaden',
      icon: Droplet,
      farbe: 'red',
      beschreibung: 'Container-Verlust auf Seefracht von China nach DE'
    },
    {
      id: 'schiffsverspaetung' as SzenarioTyp,
      name: 'Schiffsverspätung',
      icon: Ship,
      farbe: 'purple',
      beschreibung: 'Verzögerung der Seefracht China → Hamburg/Bremerhaven'
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
            <CardDescription>Bleiben über Tab-Wechsel erhalten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {aktiveSzenarien.map((sz, idx) => {
              const szenario = szenarien.find(s => s.id === sz.typ)
              if (!szenario) return null
              const Icon = szenario.icon
              
              return (
                <div key={sz.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-green-700" />
                    <span className="text-sm font-medium">{szenario.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEntfernen(sz.id)}
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
 * Szenario-Konfiguration Komponente - Vereinfacht für China-only
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
          erhoehungProzent: 20
        }
      case 'maschinenausfall':
        return {
          startDatum: '2027-03-15',
          dauerTage: 7,
          reduktionProzent: 60
        }
      case 'wasserschaden':
        return {
          datum: '2027-02-20',
          verlustMenge: 1000,
          betroffeneTeile: 'Gemischte Komponenten aus China'
        }
      case 'schiffsverspaetung':
        return {
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
    type: 'number' | 'date' | 'text'
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
      beispiel: 'Zeitschrift "Mountain Biker" Sonderausgabe erhöht Nachfrage für alle MTB-Varianten um 20%',
      fields: [
        { key: 'startKW', label: 'Start Kalenderwoche', type: 'number' },
        { key: 'dauerWochen', label: 'Dauer (Wochen)', type: 'number' },
        { key: 'erhoehungProzent', label: 'Nachfrage-Erhöhung (%)', type: 'number' }
      ]
    },
    maschinenausfall: {
      name: 'China Produktionsausfall',
      icon: Wrench,
      beispiel: 'Produktionsstörung in China - ALLE Komponenten betroffen (Rahmen, Gabeln, Sättel)',
      fields: [
        { key: 'startDatum', label: 'Ausfall ab Datum', type: 'date' },
        { key: 'dauerTage', label: 'Dauer (Tage)', type: 'number' },
        { key: 'reduktionProzent', label: 'Produktions-Reduktion (%)', type: 'number' }
      ]
    },
    wasserschaden: {
      name: 'Transport-Schaden',
      icon: Droplet,
      beispiel: 'Sturm auf See - Container geht auf Seefracht China → Deutschland verloren',
      fields: [
        { key: 'datum', label: 'Datum des Ereignisses', type: 'date' },
        { key: 'verlustMenge', label: 'Verlorene Menge (Stück)', type: 'number' },
        { key: 'betroffeneTeile', label: 'Betroffene Teile', type: 'text' }
      ]
    },
    schiffsverspaetung: {
      name: 'Schiffsverspätung',
      icon: Ship,
      beispiel: 'Schiff verspätet sich um 4 Tage - Seefracht von China nach Hamburg/Bremerhaven',
      fields: [
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
