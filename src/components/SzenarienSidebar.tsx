'use client'

/**
 * ========================================
 * SZENARIEN SIDEBAR
 * ========================================
 * 
 * Persistent sidebar for scenario management:
 * - Always visible across all pages
 * - Add, edit, and delete scenarios
 * - Shows active scenarios status
 * - Floating button to open/close sidebar
 */

import { useState } from 'react'
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Zap, 
  Plus, 
  TrendingUp, 
  Wrench, 
  Droplet, 
  Ship,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Info
} from 'lucide-react'
import { useSzenarien, SzenarioTyp, SzenarioConfig } from '@/contexts/SzenarienContext'
import szenarioDefaults from '@/data/szenario-defaults.json'

/**
 * Floating button that opens the scenario sidebar
 */
export function SzenarienFloatingButton() {
  const { szenarien } = useSzenarien()
  const activeCount = szenarien.filter(s => s.aktiv).length

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="fixed right-6 bottom-6 z-40 bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          aria-label="Szenarien verwalten"
        >
          <Zap className="h-6 w-6" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SzenarienSidebarContent />
      </SheetContent>
    </Sheet>
  )
}

/**
 * Sidebar content with scenario management
 */
function SzenarienSidebarContent() {
  const { szenarien, hinzufuegen, entfernen, zuruecksetzen, getAktiveSzenarien } = useSzenarien()
  const [selectedSzenario, setSelectedSzenario] = useState<SzenarioTyp | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const aktiveSzenarien = getAktiveSzenarien()

  return (
    <div className="space-y-6 mt-6">
      <SheetHeader>
        <SheetTitle className="text-2xl">Szenario-Manager</SheetTitle>
        <SheetDescription>
          Verwalten Sie Szenarien, die sich auf alle Berechnungen auswirken
        </SheetDescription>
      </SheetHeader>

      {/* Active Scenarios Overview */}
      <Card className={aktiveSzenarien.length > 0 ? "border-green-200 bg-green-50" : "border-gray-200"}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className={aktiveSzenarien.length > 0 ? "h-5 w-5 text-green-600" : "h-5 w-5 text-gray-400"} />
            Aktive Szenarien ({aktiveSzenarien.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aktiveSzenarien.length === 0 ? (
            <p className="text-sm text-gray-500">Keine aktiven Szenarien</p>
          ) : (
            <div className="space-y-2">
              {aktiveSzenarien.map((szenario) => (
                <SzenarioListItem
                  key={szenario.id}
                  szenario={szenario}
                  onRemove={entfernen}
                  onEdit={setEditingId}
                />
              ))}
            </div>
          )}
          {aktiveSzenarien.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={zuruecksetzen}
              className="w-full mt-4 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Alle löschen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Add New Scenario Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Neues Szenario hinzufügen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SzenarioTypeSelector
            selectedSzenario={selectedSzenario}
            onSelect={setSelectedSzenario}
          />
          
          {selectedSzenario && (
            <SzenarioForm
              szenarioTyp={selectedSzenario}
              onAdd={(typ, params) => {
                hinzufuegen(typ, params)
                setSelectedSzenario(null)
              }}
              onCancel={() => setSelectedSzenario(null)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Scenario list item with delete button
 */
function SzenarioListItem({
  szenario,
  onRemove,
  onEdit
}: {
  szenario: SzenarioConfig
  onRemove: (id: string) => void
  onEdit: (id: string) => void
}) {
  const szenarien = [
    { id: 'marketingaktion' as SzenarioTyp, name: 'Marketingaktion', icon: TrendingUp },
    { id: 'maschinenausfall' as SzenarioTyp, name: 'China Produktionsausfall', icon: Wrench },
    { id: 'wasserschaden' as SzenarioTyp, name: 'Transport-Schaden', icon: Droplet },
    { id: 'schiffsverspaetung' as SzenarioTyp, name: 'Schiffsverspätung', icon: Ship }
  ]

  const szenarioInfo = szenarien.find(s => s.id === szenario.typ)
  if (!szenarioInfo) return null

  const Icon = szenarioInfo.icon

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-green-200 rounded-lg">
      <div className="flex items-center gap-2 flex-1">
        <Icon className="h-4 w-4 text-green-700" />
        <div className="flex-1">
          <span className="text-sm font-medium block">{szenarioInfo.name}</span>
          <span className="text-xs text-gray-500">{getSzenarioSummary(szenario)}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(szenario.id)}
        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

/**
 * Get human-readable summary of scenario parameters
 */
function getSzenarioSummary(szenario: SzenarioConfig): string {
  switch (szenario.typ) {
    case 'marketingaktion':
      return `+${szenario.parameter.erhoehungProzent}% für ${szenario.parameter.dauerWochen} Wochen`
    case 'maschinenausfall':
      return `-${szenario.parameter.reduktionProzent}% für ${szenario.parameter.dauerTage} Tage`
    case 'wasserschaden':
      return `${szenario.parameter.verlustMenge} Teile verloren`
    case 'schiffsverspaetung':
      return `+${szenario.parameter.verspaetungTage} Tage Verzögerung`
    default:
      return ''
  }
}

/**
 * Scenario type selector with buttons
 */
function SzenarioTypeSelector({
  selectedSzenario,
  onSelect
}: {
  selectedSzenario: SzenarioTyp | null
  onSelect: (typ: SzenarioTyp) => void
}) {
  const szenarien = [
    { id: 'marketingaktion' as SzenarioTyp, name: 'Marketingaktion', icon: TrendingUp, color: 'blue' },
    { id: 'maschinenausfall' as SzenarioTyp, name: 'China Ausfall', icon: Wrench, color: 'orange' },
    { id: 'wasserschaden' as SzenarioTyp, name: 'Transport-Schaden', icon: Droplet, color: 'red' },
    { id: 'schiffsverspaetung' as SzenarioTyp, name: 'Schiffsverspätung', icon: Ship, color: 'purple' }
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {szenarien.map((szenario) => {
        const Icon = szenario.icon
        const isSelected = selectedSzenario === szenario.id
        
        return (
          <button
            key={szenario.id}
            onClick={() => onSelect(szenario.id)}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              isSelected 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Icon className={`h-5 w-5 mb-1 ${isSelected ? 'text-blue-700' : 'text-gray-400'}`} />
            <div className="text-xs font-medium">{szenario.name}</div>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Scenario configuration form
 * WICHTIG: Nutzt Standardwerte aus JSON, die vom Nutzer änderbar sind
 */
function SzenarioForm({
  szenarioTyp,
  onAdd,
  onCancel
}: {
  szenarioTyp: SzenarioTyp
  onAdd: (typ: SzenarioTyp, parameter: Record<string, any>) => void
  onCancel: () => void
}) {
  /**
   * Lädt Standardparameter aus JSON-Konfiguration
   * Diese sind NUR Vorschläge und können vom Nutzer beliebig geändert werden
   */
  const getDefaultParameter = (typ: SzenarioTyp) => {
    const szenarioData = szenarioDefaults.szenarien[typ]
    return szenarioData?.standardParameter || {}
  }

  const [parameter, setParameter] = useState<Record<string, any>>(getDefaultParameter(szenarioTyp))

  type FieldDef = {
    key: string
    label: string
    type: 'number' | 'date' | 'text'
    min?: number | string
    max?: number | string
  }

  /**
   * Lädt Feld-Definitionen aus JSON-Konfiguration
   * Ermöglicht zentrale Verwaltung aller Szenario-Parameter
   */
  const getSzenarioFields = (typ: SzenarioTyp): FieldDef[] => {
    const szenarioData = szenarioDefaults.szenarien[typ]
    if (!szenarioData) return []

    const paramDefs = szenarioData.parameterDefinitionen
    return Object.entries(paramDefs).map(([key, def]: [string, any]) => ({
      key,
      label: def.label,
      type: def.typ as 'number' | 'date' | 'text',
      min: def.min,
      max: def.max
    }))
  }

  const fields = getSzenarioFields(szenarioTyp)
  
  /**
   * Lädt Beispieltext aus JSON-Konfiguration
   */
  const getBeispielText = (typ: SzenarioTyp): string => {
    return szenarioDefaults.szenarien[typ]?.beispiel || ''
  }

  return (
    <div className="space-y-4 border-t pt-4">
      {/* Beispiel-Box aus JSON */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-700 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-xs text-blue-900">Beispiel-Szenario</p>
            <p className="text-xs text-blue-800 mt-1">{getBeispielText(szenarioTyp)}</p>
          </div>
        </div>
      </div>

      {/* Parameter-Formular mit Standardwerten (änderbar) */}
      <div className="space-y-3">
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
          💡 Die vorausgefüllten Werte sind Vorschläge aus der JSON-Konfiguration. 
          Sie können alle Parameter beliebig anpassen.
        </div>
        
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={field.key} className="text-xs">{field.label}</Label>
            
            {field.type === 'number' && (
              <Input
                id={field.key}
                type="number"
                value={parameter[field.key]}
                min={field.min as number}
                max={field.max as number}
                onChange={(e) => setParameter({...parameter, [field.key]: parseInt(e.target.value) || 0})}
                className="h-8 text-sm"
              />
            )}
            
            {field.type === 'date' && (
              <Input
                id={field.key}
                type="date"
                value={parameter[field.key]}
                min={field.min as string}
                max={field.max as string}
                onChange={(e) => setParameter({...parameter, [field.key]: e.target.value})}
                className="h-8 text-sm"
              />
            )}
            
            {field.type === 'text' && (
              <Input
                id={field.key}
                type="text"
                value={parameter[field.key]}
                onChange={(e) => setParameter({...parameter, [field.key]: e.target.value})}
                className="h-8 text-sm"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={() => onAdd(szenarioTyp, parameter)} 
          className="flex-1 bg-green-600 hover:bg-green-700 h-9"
          size="sm"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Hinzufügen
        </Button>
        <Button 
          onClick={onCancel}
          variant="outline"
          className="h-9"
          size="sm"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
