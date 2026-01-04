'use client'

/**
 * ========================================
 * EXCEL-ÄHNLICHES DASHBOARD
 * ========================================
 * 
 * Hauptansicht im Excel-Stil mit:
 * - Tab-Navigation (wie Excel-Arbeitsblätter)
 * - Vollständige Tabellen mit Freeze Panes
 * - Zellformatierung und Farbcodierung
 * - Formel-Anzeige
 * - Filter und Sortierung
 * - Export-Funktionen
 */

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileSpreadsheet, 
  Download, 
  Filter, 
  SortAsc, 
  RefreshCw,
  Calculator,
  BarChart3,
  Settings,
  Play,
  Save
} from 'lucide-react'

export default function ExcelDashboard() {
  const [activeTab, setActiveTab] = useState('programmplanung')
  const [showFormulas, setShowFormulas] = useState(false)
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Excel-Style Ribbon */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-green-600" />
            <h1 className="text-lg font-semibold">
              Mountain Bike Supply Chain Management
            </h1>
            <span className="text-sm text-gray-500 ml-2">
              Adventure Works AG - Planungsjahr 2027
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <Play className="h-4 w-4 mr-2" />
              Simulation starten
            </Button>
          </div>
        </div>
        
        {/* Command Bar */}
        <div className="px-4 py-2 border-t bg-gray-50 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Calculator className="h-4 w-4 mr-2" />
              Formeln
            </Button>
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="ghost" size="sm">
              <SortAsc className="h-4 w-4 mr-2" />
              Sortieren
            </Button>
            <Button variant="ghost" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Diagramme
            </Button>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showFormulas}
                onChange={(e) => setShowFormulas(e.target.checked)}
                className="rounded"
              />
              Formeln anzeigen
            </label>
            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Excel-Style Worksheet Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="bg-white border-b">
          <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="programmplanung" 
              className="rounded-none border-b-2 data-[state=active]:border-green-600 data-[state=active]:bg-gray-50 px-6 py-2"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Programmplanung
            </TabsTrigger>
            <TabsTrigger 
              value="stueckliste"
              className="rounded-none border-b-2 data-[state=active]:border-green-600 data-[state=active]:bg-gray-50 px-6 py-2"
            >
              Stückliste
            </TabsTrigger>
            <TabsTrigger 
              value="inbound-china"
              className="rounded-none border-b-2 data-[state=active]:border-green-600 data-[state=active]:bg-gray-50 px-6 py-2"
            >
              Inbound China
            </TabsTrigger>
            <TabsTrigger 
              value="produktion"
              className="rounded-none border-b-2 data-[state=active]:border-green-600 data-[state=active]:bg-gray-50 px-6 py-2"
            >
              Produktion
            </TabsTrigger>
            <TabsTrigger 
              value="lagerbestand"
              className="rounded-none border-b-2 data-[state=active]:border-green-600 data-[state=active]:bg-gray-50 px-6 py-2"
            >
              Lagerbestand
            </TabsTrigger>
            <TabsTrigger 
              value="scor-metrics"
              className="rounded-none border-b-2 data-[state=active]:border-green-600 data-[state=active]:bg-gray-50 px-6 py-2"
            >
              SCOR Metriken
            </TabsTrigger>
            <TabsTrigger 
              value="szenarien"
              className="rounded-none border-b-2 data-[state=active]:border-green-600 data-[state=active]:bg-gray-50 px-6 py-2"
            >
              Szenarien
            </TabsTrigger>
            <TabsTrigger 
              value="visualisierung"
              className="rounded-none border-b-2 data-[state=active]:border-green-600 data-[state=active]:bg-gray-50 px-6 py-2"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Visualisierungen
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-white">
          <TabsContent value="programmplanung" className="m-0 h-full">
            <ProgrammplanungTable showFormulas={showFormulas} />
          </TabsContent>
          
          <TabsContent value="stueckliste" className="m-0 h-full">
            <StuecklisteTable />
          </TabsContent>
          
          <TabsContent value="inbound-china" className="m-0 h-full">
            <InboundChinaTable />
          </TabsContent>
          
          <TabsContent value="produktion" className="m-0 h-full">
            <ProduktionTable />
          </TabsContent>
          
          <TabsContent value="lagerbestand" className="m-0 h-full">
            <LagerbestandTable />
          </TabsContent>
          
          <TabsContent value="scor-metrics" className="m-0 h-full">
            <SCORMetrikenDashboard />
          </TabsContent>
          
          <TabsContent value="szenarien" className="m-0 h-full">
            <SzenarienManager />
          </TabsContent>
          
          <TabsContent value="visualisierung" className="m-0 h-full">
            <VisualisierungsDashboard />
          </TabsContent>
        </div>
      </Tabs>

      {/* Status Bar */}
      <div className="bg-white border-t px-4 py-1 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span>Bereit</span>
          <span>•</span>
          <span>370.000 Fahrräder/Jahr</span>
          <span>•</span>
          <span>8 Varianten</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Durchschnitt: --</span>
          <span>Summe: --</span>
          <span>Anzahl: --</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Programmplanung-Tabelle (Wochenbasis)
 */
function ProgrammplanungTable({ showFormulas }: { showFormulas: boolean }) {
  const wochen = 52
  const varianten = [
    'MTB Allrounder',
    'MTB Competition',
    'MTB Downhill',
    'MTB Extreme',
    'MTB Freeride',
    'MTB Marathon',
    'MTB Performance',
    'MTB Trail'
  ]
  
  const jahresmengen = {
    'MTB Allrounder': 111000,
    'MTB Competition': 55500,
    'MTB Downhill': 37000,
    'MTB Extreme': 25900,
    'MTB Freeride': 18500,
    'MTB Marathon': 29600,
    'MTB Performance': 44400,
    'MTB Trail': 48100
  }
  
  return (
    <div className="h-full overflow-auto">
      <table className="min-w-full divide-y divide-gray-200 border-collapse">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="sticky left-0 z-20 bg-gray-100 px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r">
              Variante
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
              Jahres-<br/>menge
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">
              Ø pro<br/>Woche
            </th>
            {Array.from({ length: 12 }, (_, i) => (
              <th key={i} className="px-4 py-2 text-center text-xs font-semibold text-gray-700">
                KW {i * 4 + 1}-{i * 4 + 4}
              </th>
            ))}
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 bg-blue-50">
              Gesamt
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {varianten.map((variante, idx) => {
            const jahresmenge = jahresmengen[variante as keyof typeof jahresmengen]
            const proWoche = Math.round(jahresmenge / 52)
            
            return (
              <tr key={variante} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="sticky left-0 z-10 bg-inherit px-4 py-2 text-sm font-medium text-gray-900 border-r">
                  {variante}
                </td>
                <td className="px-4 py-2 text-sm text-right text-gray-700 font-semibold">
                  {jahresmenge.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-sm text-right text-gray-500">
                  {proWoche.toLocaleString()}
                </td>
                {Array.from({ length: 12 }, (_, i) => {
                  const wert = proWoche * 4
                  return (
                    <td key={i} className="px-4 py-2 text-sm text-right hover:bg-blue-50 cursor-pointer">
                      {showFormulas ? (
                        <span className="text-blue-600">={proWoche}*4</span>
                      ) : (
                        wert.toLocaleString()
                      )}
                    </td>
                  )
                })}
                <td className="px-4 py-2 text-sm text-right font-bold bg-blue-50">
                  {jahresmenge.toLocaleString()}
                </td>
              </tr>
            )
          })}
          <tr className="bg-green-50 font-bold">
            <td className="sticky left-0 z-10 bg-green-50 px-4 py-2 text-sm border-r">
              Gesamt
            </td>
            <td className="px-4 py-2 text-sm text-right">
              370.000
            </td>
            <td className="px-4 py-2 text-sm text-right">
              7.115
            </td>
            {Array.from({ length: 12 }, (_, i) => (
              <td key={i} className="px-4 py-2 text-sm text-right">
                28.460
              </td>
            ))}
            <td className="px-4 py-2 text-sm text-right">
              370.000
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/**
 * Stückliste-Tabelle
 */
function StuecklisteTable() {
  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Stückliste - Mountain Bikes</h2>
        <p className="text-sm text-gray-600">
          Komponenten pro Fahrradvariantentyp: 1x Rahmen + 1x Gabel + 1x Sattel = 1 Fahrrad
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        {/* Rahmen */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-green-700">Rahmen</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 py-1">Variante</th>
                <th className="text-left px-2 py-1">Rahmentyp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="px-2 py-1">MTB Allrounder</td><td className="px-2 py-1">Aluminium 7005DB</td></tr>
              <tr><td className="px-2 py-1">MTB Competition</td><td className="px-2 py-1">Carbon Monocoque</td></tr>
              <tr><td className="px-2 py-1">MTB Downhill</td><td className="px-2 py-1">Aluminium 7005TB</td></tr>
              <tr><td className="px-2 py-1">MTB Extreme</td><td className="px-2 py-1">Carbon Monocoque</td></tr>
              <tr><td className="px-2 py-1">MTB Freeride</td><td className="px-2 py-1">Aluminium 7005TB</td></tr>
              <tr><td className="px-2 py-1">MTB Marathon</td><td className="px-2 py-1">Aluminium 7005DB</td></tr>
              <tr><td className="px-2 py-1">MTB Performance</td><td className="px-2 py-1">Aluminium 7005TB</td></tr>
              <tr><td className="px-2 py-1">MTB Trail</td><td className="px-2 py-1">Carbon Monocoque</td></tr>
            </tbody>
          </table>
        </Card>

        {/* Gabeln */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-blue-700">Gabeln</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 py-1">Variante</th>
                <th className="text-left px-2 py-1">Gabeltyp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="px-2 py-1">MTB Allrounder</td><td className="px-2 py-1">Fox 32 F100</td></tr>
              <tr><td className="px-2 py-1">MTB Competition</td><td className="px-2 py-1">Fox Talas 140</td></tr>
              <tr><td className="px-2 py-1">MTB Downhill</td><td className="px-2 py-1">Rock Shox Recon 351</td></tr>
              <tr><td className="px-2 py-1">MTB Extreme</td><td className="px-2 py-1">Rock Shox Reba</td></tr>
              <tr><td className="px-2 py-1">MTB Freeride</td><td className="px-2 py-1">Fox 32 F80</td></tr>
              <tr><td className="px-2 py-1">MTB Marathon</td><td className="px-2 py-1">Rock Shox Recon SL</td></tr>
              <tr><td className="px-2 py-1">MTB Performance</td><td className="px-2 py-1">Rock Shox Reba</td></tr>
              <tr><td className="px-2 py-1">MTB Trail</td><td className="px-2 py-1">SR Suntour Raidon</td></tr>
            </tbody>
          </table>
        </Card>

        {/* Sättel */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-orange-700">Sättel</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 py-1">Variante</th>
                <th className="text-left px-2 py-1">Satteltyp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="px-2 py-1">MTB Allrounder</td><td className="px-2 py-1">Spark</td></tr>
              <tr><td className="px-2 py-1">MTB Competition</td><td className="px-2 py-1">Speed line</td></tr>
              <tr><td className="px-2 py-1">MTB Downhill</td><td className="px-2 py-1">Fizik Tundra</td></tr>
              <tr><td className="px-2 py-1">MTB Extreme</td><td className="px-2 py-1">Spark</td></tr>
              <tr><td className="px-2 py-1">MTB Freeride</td><td className="px-2 py-1">Fizik Tundra</td></tr>
              <tr><td className="px-2 py-1">MTB Marathon</td><td className="px-2 py-1">Race line</td></tr>
              <tr><td className="px-2 py-1">MTB Performance</td><td className="px-2 py-1">Fizik Tundra</td></tr>
              <tr><td className="px-2 py-1">MTB Trail</td><td className="px-2 py-1">Speed line</td></tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

/**
 * Weitere Komponenten werden fortgesetzt...
 */
function InboundChinaTable() {
  return <div className="p-6">Inbound China Tabelle - In Entwicklung</div>
}

function ProduktionTable() {
  return <div className="p-6">Produktions-Tabelle - In Entwicklung</div>
}

function LagerbestandTable() {
  return <div className="p-6">Lagerbestand-Tabelle - In Entwicklung</div>
}

function SCORMetrikenDashboard() {
  return <div className="p-6">SCOR Metriken Dashboard - In Entwicklung</div>
}

function SzenarienManager() {
  return <div className="p-6">Szenarien-Manager - In Entwicklung</div>
}

function VisualisierungsDashboard() {
  return <div className="p-6">Visualisierungen - In Entwicklung</div>
}