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
  const getDefaultParameter = (typ: SzenarioTyp) => {
    switch (typ) {
      case 'marketingaktion':
        return { startKW: 28, dauerWochen: 4, erhoehungProzent: 20 }
      case 'maschinenausfall':
        return { startDatum: '2027-03-15', dauerTage: 7, reduktionProzent: 60 }
      case 'wasserschaden':
        return { datum: '2027-02-20', verlustMenge: 1000, betroffeneTeile: 'Gemischte Komponenten aus China' }
      case 'schiffsverspaetung':
        return { ursprungAnkunft: '2027-02-16', verspaetungTage: 4, neueAnkunft: '2027-02-20' }
    }
  }

  const [parameter, setParameter] = useState<Record<string, any>>(getDefaultParameter(szenarioTyp))

  type FieldDef = {
    key: string
    label: string
    type: 'number' | 'date' | 'text'
  }

  const szenarioFields: Record<SzenarioTyp, FieldDef[]> = {
    marketingaktion: [
      { key: 'startKW', label: 'Start KW', type: 'number' },
      { key: 'dauerWochen', label: 'Dauer (Wochen)', type: 'number' },
      { key: 'erhoehungProzent', label: 'Erhöhung (%)', type: 'number' }
    ],
    maschinenausfall: [
      { key: 'startDatum', label: 'Ausfall ab', type: 'date' },
      { key: 'dauerTage', label: 'Dauer (Tage)', type: 'number' },
      { key: 'reduktionProzent', label: 'Reduktion (%)', type: 'number' }
    ],
    wasserschaden: [
      { key: 'datum', label: 'Datum', type: 'date' },
      { key: 'verlustMenge', label: 'Verlorene Menge', type: 'number' },
      { key: 'betroffeneTeile', label: 'Betroffene Teile', type: 'text' }
    ],
    schiffsverspaetung: [
      { key: 'ursprungAnkunft', label: 'Geplante Ankunft', type: 'date' },
      { key: 'verspaetungTage', label: 'Verspätung (Tage)', type: 'number' },
      { key: 'neueAnkunft', label: 'Neue Ankunft', type: 'date' }
    ]
  }

  const fields = szenarioFields[szenarioTyp]

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={field.key} className="text-xs">{field.label}</Label>
            
            {field.type === 'number' && (
              <Input
                id={field.key}
                type="number"
                value={parameter[field.key]}
                onChange={(e) => setParameter({...parameter, [field.key]: parseInt(e.target.value) || 0})}
                className="h-8 text-sm"
              />
            )}
            
            {field.type === 'date' && (
              <Input
                id={field.key}
                type="date"
                value={parameter[field.key]}
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
