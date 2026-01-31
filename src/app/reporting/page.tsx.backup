'use client'

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GRANULARES REPORTING & ZEITREIHEN-VISUALISIERUNGEN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ziel: Detaillierte Zeitreihen-Analysen statt einfacher Endergebnis-Charts
 * 
 * User-Feedback: "Die Grafiken sind mir zu einfach und nichts aussagend. 
 * Ich will auf granularer Basis sehen wie sich die Werte zusammensetzen."
 * 
 * HAUPTFEATURES:
 * - TAB 1: KPIs Übersicht (kompakt, schneller Überblick)
 * - TAB 2: Zeitreihen Detailansicht (7 Sub-Tabs mit granularen Analysen)
 * 
 * DATENQUELLEN (ALLE ECHT, NICHT SIMULIERT!):
 * 1. generiereAlleVariantenProduktionsplaene() - OEM Planung (365 Tage)
 * 2. generiereTaeglicheBestellungen() - Inbound Logistik
 * 3. berechneIntegriertesWarehouse() - Warehouse Management
 * 4. reporting-aggregation.ts - Aggregationsfunktionen
 * 
 * ZEITREIHEN-ANALYSEN:
 * 1. Planerfüllungsgrad - Monatlich, wöchentlich, Stacked Bars
 * 2. Liefertreue China - Timeline Scatter, monatliche Performance
 * 3. Durchlaufzeit - Waterfall Breakdown, Min/Avg/Max
 * 4. Lagerumschlag - Composed Chart (Area + Line), Heatmap
 * 5. Planungsgenauigkeit - Dual Axis (Plan vs. Ist), Box Plot Simulation
 * 6. Materialverfügbarkeit - Stacked Area, ATP-Checks über Zeit
 * 7. Lagerreichweite - Multi-Line pro Variante, Heatmap Woche x Variante
 * 
 * KONZEPTE:
 * - Responsive Charts mit ResponsiveContainer
 * - Deutsche Beschriftungen
 * - Export-Funktionen (CSV/JSON) pro Chart
 * - CustomTooltips mit detaillierten Infos
 * - Performance-Optimierung mit useMemo
 * 
 * @author WI3 Team - Adventure Works AG
 * @version 2.0 - Granulare Zeitreihen-Analyse
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Package,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Truck,
  Activity
} from 'lucide-react'
import { formatNumber, formatPercent } from '@/lib/utils'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { useSzenarien } from '@/contexts/SzenarienContext'
import { ActiveScenarioBanner } from '@/components/ActiveScenarioBanner'

// Berechnungsmodule (ECHTE DATEN!)
import { generiereAlleVariantenProduktionsplaene } from '@/lib/calculations/zentrale-produktionsplanung'
import { generiereTaeglicheBestellungen } from '@/lib/calculations/inbound-china'
import { berechneIntegriertesWarehouse } from '@/lib/calculations/warehouse-management'

// Aggregations-Helper für Visualisierungen
import {
  MONATSNAMEN,
  MONATSNAMEN_KURZ,
  aggregierePlanerfuellungNachMonat,
  aggregierePlanerfuellungNachWoche,
  analysiereLieferungenTimeline,
  aggregiereLieferperformanceNachMonat,
  getDurchlaufzeitBreakdown,
  aggregiereDurchlaufzeitNachMonat,
  aggregiereLagerumschlagNachMonat,
  aggregiereLagerbestandHeatmap,
  aggregierePlanungsgenauigkeitNachMonat,
  aggregiereMaterialverfuegbarkeit,
  aggregiereTaeglicheMaterialverfuegbarkeit,
  aggregiereLagerreichweiteNachMonat,
  aggregiereLagerreichweiteHeatmap
} from '@/lib/helpers/reporting-aggregation'

// Recharts Visualisierungen
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
  Brush
} from 'recharts'

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FARB-SCHEMA FÜR VISUALISIERUNGEN
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const COLORS = {
  primary: '#10b981',      // Grün - Erfolg, Plan erfüllt
  secondary: '#3b82f6',    // Blau - Ist-Werte, Sekundäre Info
  warning: '#f59e0b',      // Orange - Warnung, Mittel
  danger: '#ef4444',       // Rot - Kritisch, Fehler
  info: '#8b5cf6',         // Violett - Information
  success: '#22c55e',      // Hellgrün - Sehr gut
  neutral: '#64748b',      // Grau - Neutral
  highlight: '#ec4899'     // Pink - Highlight
}

// Heatmap Gradient (Niedrig → Hoch)
const HEATMAP_COLORS = [
  '#ef4444',  // Rot - Kritisch niedrig
  '#f59e0b',  // Orange - Niedrig
  '#fbbf24',  // Gelb - Mittel
  '#10b981',  // Grün - Gut
  '#3b82f6'   // Blau - Sehr gut
]

// Sattel-Varianten Farben (4 Varianten)
const SATTEL_COLORS = {
  'SAT_FT': '#10b981',  // Freeride Team - Grün
  'SAT_FR': '#3b82f6',  // Freeride - Blau
  'SAT_TC': '#f59e0b',  // Team Carbon - Orange
  'SAT_XC': '#8b5cf6'   // XC Carbon - Violett
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HILFSFUNKTIONEN
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Berechnet Heatmap-Farbe basierend auf Wert und Skala
 */
function getHeatmapColor(value: number, min: number, max: number): string {
  if (max === min) return HEATMAP_COLORS[2] // Mittel
  
  const normalized = (value - min) / (max - min)
  const index = Math.floor(normalized * (HEATMAP_COLORS.length - 1))
  return HEATMAP_COLORS[Math.max(0, Math.min(HEATMAP_COLORS.length - 1, index))]
}

/**
 * Berechnet Lagerreichweite-Farbe (Ziel: 7-14 Tage)
 */
function getLagerreichweiteColor(tage: number): string {
  if (tage < 3) return COLORS.danger      // Kritisch
  if (tage < 7) return COLORS.warning     // Niedrig
  if (tage <= 14) return COLORS.success   // Optimal
  if (tage <= 21) return COLORS.info      // Hoch
  return COLORS.neutral                    // Sehr hoch
}

/**
 * Berechnet Status-Badge-Farbe
 */
function getStatusColor(prozent: number): string {
  if (prozent >= 98) return COLORS.success
  if (prozent >= 95) return COLORS.primary
  if (prozent >= 90) return COLORS.warning
  return COLORS.danger
}

/**
 * Formatiert Datum für Tooltip
 */
function formatDateTooltip(datum: Date | string): string {
  const d = typeof datum === 'string' ? new Date(datum) : datum
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Export-Funktionen
 */
function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return
  
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(row => 
    Object.values(row).map(v => 
      typeof v === 'number' ? v : `"${v}"`
    ).join(',')
  ).join('\n')
  
  const csv = `${headers}\n${rows}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

function exportToJSON(data: any, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`
  link.click()
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CUSTOM TOOLTIPS FÜR CHARTS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const CustomTooltipPlanerfuellung = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null
  
  const data = payload[0].payload
  
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm mb-2">{data.monatName || `KW ${data.kalenderwoche}`}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Plan:</span>
          <span className="font-semibold">{formatNumber(data.planMenge)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Ist:</span>
          <span className="font-semibold">{formatNumber(data.istMenge)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Erfüllungsgrad:</span>
          <span className="font-semibold" style={{ color: getStatusColor(data.planerfuellungsgrad) }}>
            {formatPercent(data.planerfuellungsgrad)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Tage erfüllt:</span>
          <span className="font-semibold">{data.auftragErfuellt} / {data.auftragGesamt}</span>
        </div>
      </div>
    </div>
  )
}

const CustomTooltipLieferung = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null
  
  const data = payload[0].payload
  
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm mb-2">Bestellung {data.bestellungId?.substring(0, 8)}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Bestellt:</span>
          <span className="font-semibold">{formatDateTooltip(data.bestelldatum)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Ankunft:</span>
          <span className="font-semibold">{formatDateTooltip(data.erwarteteAnkunft)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Vorlaufzeit:</span>
          <span className="font-semibold">{data.vorlaufzeitTage} Tage</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Menge:</span>
          <span className="font-semibold">{formatNumber(data.menge)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Status:</span>
          <span className={`font-semibold ${data.puenktlich ? 'text-green-600' : 'text-red-600'}`}>
            {data.puenktlich ? 'Pünktlich' : 'Verspätet'}
          </span>
        </div>
      </div>
    </div>
  )
}

const CustomTooltipDurchlaufzeit = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null
  
  const data = payload[0].payload
  
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm mb-2">{data.komponente}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Dauer:</span>
          <span className="font-semibold">{data.tage} Tage</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Typ:</span>
          <span className="font-semibold">
            {data.typ === 'arbeitstage' ? 'Arbeitstage' : 'Kalendertage'}
          </span>
        </div>
        <div className="text-gray-600 mt-2 text-xs italic">
          {data.beschreibung}
        </div>
      </div>
    </div>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HAUPTKOMPONENTE: REPORTING DASHBOARD
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export default function ReportingPage() {
  // State
  const [hauptTab, setHauptTab] = useState<'overview' | 'timeseries'>('timeseries')
  const [detailTab, setDetailTab] = useState<'planerfuellung' | 'liefertreue' | 'durchlaufzeit' | 'lagerumschlag' | 'planungsgenauigkeit' | 'materialverfuegbarkeit' | 'lagerreichweite'>('planerfuellung')
  
  // Contexts
  const { konfiguration, isInitialized } = useKonfiguration()
  const { getAktiveSzenarien } = useSzenarien()
  const aktiveSzenarien = getAktiveSzenarien()
  
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * DATEN-BERECHNUNG (ALLE ECHT!)
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  
  // 1. OEM Produktionsplanung (365 Tage, alle Varianten)
  const alleProduktionsplaene = useMemo(() => {
    console.log('🔄 Berechne OEM Produktionsplanung...')
    return generiereAlleVariantenProduktionsplaene(konfiguration)
  }, [konfiguration])
  
  // 2. Inbound Logistik (Bestellungen von China)
  const bestellungen = useMemo(() => {
    console.log('🔄 Berechne Inbound Bestellungen...')
    
    // Konvertiere VariantenProduktionsplan zu TagesProduktionsplan[]
    const tagesplaene: Record<string, any[]> = {}
    Object.entries(alleProduktionsplaene).forEach(([varianteId, plan]) => {
      tagesplaene[varianteId] = plan.tage
    })
    
    // Konvertiere Stückliste zu Map-Format
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
    
    return generiereTaeglicheBestellungen(
      tagesplaene,
      2027,
      konfiguration.lieferant.gesamtVorlaufzeitTage,
      konfiguration.feiertage,
      stuecklistenMap,
      konfiguration.lieferant.losgroesse,
      konfiguration.lieferant.lieferintervall
    )
  }, [alleProduktionsplaene, konfiguration])
  
  // 3. Warehouse Management (Lagerbestand, ATP-Checks)
  const warehouse = useMemo(() => {
    console.log('🔄 Berechne Warehouse Management...')
    return berechneIntegriertesWarehouse(
      konfiguration,
      alleProduktionsplaene,
      bestellungen
    )
  }, [konfiguration, alleProduktionsplaene, bestellungen])
  
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * AGGREGIERTE DATEN FÜR VISUALISIERUNGEN
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  
  // 1. PLANERFÜLLUNGSGRAD
  const planerfuellungMonatlich = useMemo(() => 
    aggregierePlanerfuellungNachMonat(alleProduktionsplaene),
    [alleProduktionsplaene]
  )
  
  const planerfuellungWoechentlich = useMemo(() => 
    aggregierePlanerfuellungNachWoche(alleProduktionsplaene),
    [alleProduktionsplaene]
  )
  
  // 2. LIEFERTREUE CHINA
  const lieferTimeline = useMemo(() => 
    analysiereLieferungenTimeline(bestellungen),
    [bestellungen]
  )
  
  const lieferperformanceMonatlich = useMemo(() => 
    aggregiereLieferperformanceNachMonat(lieferTimeline),
    [lieferTimeline]
  )
  
  // 3. DURCHLAUFZEIT
  const durchlaufzeitBreakdown = useMemo(() => 
    getDurchlaufzeitBreakdown(),
    []
  )
  
  const durchlaufzeitMonatlich = useMemo(() => 
    aggregiereDurchlaufzeitNachMonat(lieferTimeline),
    [lieferTimeline]
  )
  
  // 4. LAGERUMSCHLAG
  const lagerumschlagMonatlich = useMemo(() => 
    aggregiereLagerumschlagNachMonat(warehouse.tage, alleProduktionsplaene),
    [warehouse, alleProduktionsplaene]
  )
  
  const lagerbestandHeatmap = useMemo(() => 
    aggregiereLagerbestandHeatmap(warehouse.tage),
    [warehouse]
  )
  
  // 5. PLANUNGSGENAUIGKEIT
  const planungsgenauigkeitMonatlich = useMemo(() => 
    aggregierePlanungsgenauigkeitNachMonat(alleProduktionsplaene),
    [alleProduktionsplaene]
  )
  
  // 6. MATERIALVERFÜGBARKEIT
  const materialverfuegbarkeit = useMemo(() => 
    aggregiereMaterialverfuegbarkeit(warehouse.tage),
    [warehouse]
  )
  
  const materialverfuegbarheitTaeglich = useMemo(() => 
    aggregiereTaeglicheMaterialverfuegbarkeit(warehouse.tage),
    [warehouse]
  )
  
  // 7. LAGERREICHWEITE
  const lagerreichweiteMonatlich = useMemo(() => 
    aggregiereLagerreichweiteNachMonat(warehouse.tage),
    [warehouse]
  )
  
  const lagerreichweiteHeatmap = useMemo(() => 
    aggregiereLagerreichweiteHeatmap(warehouse.tage),
    [warehouse]
  )
  
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * KPI SUMMARY (für Overview Tab)
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const kpiSummary = useMemo(() => {
    // Durchschnitte berechnen
    const durchschnittPlanerfuellung = planerfuellungMonatlich.reduce((sum, m) => sum + m.planerfuellungsgrad, 0) / 12
    const durchschnittLiefertreue = lieferperformanceMonatlich.reduce((sum, m) => sum + m.liefertreue, 0) / 12
    const durchschnittVerfuegbarkeit = materialverfuegbarkeit.reduce((sum, m) => sum + m.verfuegbarkeitsrate, 0) / 12
    const durchschnittGenauigkeit = planungsgenauigkeitMonatlich.reduce((sum, m) => sum + m.genauigkeit, 0) / 12
    
    // Gesamtproduktion
    const gesamtPlan = planerfuellungMonatlich.reduce((sum, m) => sum + m.planMenge, 0)
    const gesamtIst = planerfuellungMonatlich.reduce((sum, m) => sum + m.istMenge, 0)
    
    // Lieferungen
    const gesamtLieferungen = lieferperformanceMonatlich.reduce((sum, m) => sum + m.gesamtLieferungen, 0)
    const puenktlicheLieferungen = lieferperformanceMonatlich.reduce((sum, m) => sum + m.puenktlicheLieferungen, 0)
    
    return {
      planerfuellung: durchschnittPlanerfuellung,
      liefertreue: durchschnittLiefertreue,
      materialverfuegbarkeit: durchschnittVerfuegbarkeit,
      planungsgenauigkeit: durchschnittGenauigkeit,
      gesamtPlan,
      gesamtIst,
      abweichung: gesamtIst - gesamtPlan,
      gesamtLieferungen,
      puenktlicheLieferungen,
      durchschnittVorlaufzeit: 49 // Konstant aus Konfiguration
    }
  }, [planerfuellungMonatlich, lieferperformanceMonatlich, materialverfuegbarkeit, planungsgenauigkeitMonatlich])
  
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * RENDER: HAUPTSTRUKTUR
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header mit Export-Buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reporting & Visualisierungen</h1>
          <p className="text-muted-foreground mt-1">
            Granulare Zeitreihen-Analysen der Supply Chain Performance
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportToJSON({
                planerfuellung: planerfuellungMonatlich,
                liefertreue: lieferperformanceMonatlich,
                lagerumschlag: lagerumschlagMonatlich,
                planungsgenauigkeit: planungsgenauigkeitMonatlich,
                materialverfuegbarkeit: materialverfuegbarkeit
              }, 'reporting_komplett')
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Alle Daten (JSON)
          </Button>
        </div>
      </div>
      
      {/* Aktive Szenarien Banner */}
      {aktiveSzenarien.length > 0 && <ActiveScenarioBanner />}
      
      {/* Haupt-Tabs */}
      <Tabs value={hauptTab} onValueChange={(v) => setHauptTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview">KPIs Übersicht</TabsTrigger>
          <TabsTrigger value="timeseries">Zeitreihen Detailansicht</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: KPIs ÜBERSICHT (kompakt) */}
        <TabsContent value="overview" className="space-y-6">
          <KPIsOverview kpiSummary={kpiSummary} />
        </TabsContent>
        
        {/* TAB 2: ZEITREIHEN DETAILANSICHT */}
        <TabsContent value="timeseries" className="space-y-6">
          <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as any)}>
            <TabsList className="grid w-full grid-cols-7 h-auto">
              <TabsTrigger value="planerfuellung" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Planerfüllung
              </TabsTrigger>
              <TabsTrigger value="liefertreue" className="text-xs">
                <Truck className="h-3 w-3 mr-1" />
                Liefertreue
              </TabsTrigger>
              <TabsTrigger value="durchlaufzeit" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Durchlaufzeit
              </TabsTrigger>
              <TabsTrigger value="lagerumschlag" className="text-xs">
                <Package className="h-3 w-3 mr-1" />
                Lagerumschlag
              </TabsTrigger>
              <TabsTrigger value="planungsgenauigkeit" className="text-xs">
                <BarChart3 className="h-3 w-3 mr-1" />
                Genauigkeit
              </TabsTrigger>
              <TabsTrigger value="materialverfuegbarkeit" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Material
              </TabsTrigger>
              <TabsTrigger value="lagerreichweite" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Reichweite
              </TabsTrigger>
            </TabsList>
            
            {/* Sub-Tab 1: PLANERFÜLLUNGSGRAD */}
            <TabsContent value="planerfuellung" className="space-y-6">
              <PlanerfuellungDetailView 
                monatlich={planerfuellungMonatlich}
                woechentlich={planerfuellungWoechentlich}
              />
            </TabsContent>
            
            {/* Sub-Tab 2: LIEFERTREUE CHINA */}
            <TabsContent value="liefertreue" className="space-y-6">
              <LiefertreuDetailView 
                timeline={lieferTimeline}
                monatlich={lieferperformanceMonatlich}
              />
            </TabsContent>
            
            {/* Sub-Tab 3: DURCHLAUFZEIT */}
            <TabsContent value="durchlaufzeit" className="space-y-6">
              <DurchlaufzeitDetailView 
                breakdown={durchlaufzeitBreakdown}
                monatlich={durchlaufzeitMonatlich}
              />
            </TabsContent>
            
            {/* Sub-Tab 4: LAGERUMSCHLAG */}
            <TabsContent value="lagerumschlag" className="space-y-6">
              <LagerumschlagDetailView 
                monatlich={lagerumschlagMonatlich}
                heatmap={lagerbestandHeatmap}
                warehouseTage={warehouse.tage}
              />
            </TabsContent>
            
            {/* Sub-Tab 5: PLANUNGSGENAUIGKEIT */}
            <TabsContent value="planungsgenauigkeit" className="space-y-6">
              <PlanungsgenauigkeitDetailView 
                monatlich={planungsgenauigkeitMonatlich}
              />
            </TabsContent>
            
            {/* Sub-Tab 6: MATERIALVERFÜGBARKEIT */}
            <TabsContent value="materialverfuegbarkeit" className="space-y-6">
              <MaterialverfuegbarkeitDetailView 
                monatlich={materialverfuegbarkeit}
                taeglich={materialverfuegbarheitTaeglich}
              />
            </TabsContent>
            
            {/* Sub-Tab 7: LAGERREICHWEITE */}
            <TabsContent value="lagerreichweite" className="space-y-6">
              <LagerreichweiteDetailView 
                monatlich={lagerreichweiteMonatlich}
                heatmap={lagerreichweiteHeatmap}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUB-KOMPONENTE 1: KPIs ÜBERSICHT (kompakt)
 * ═══════════════════════════════════════════════════════════════════════════════
 */
function KPIsOverview({ kpiSummary }: { kpiSummary: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Card: Planerfüllungsgrad */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Planerfüllungsgrad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: getStatusColor(kpiSummary.planerfuellung) }}>
              {formatPercent(kpiSummary.planerfuellung)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Durchschnitt über 12 Monate
            </p>
          </CardContent>
        </Card>
        
        {/* KPI Card: Liefertreue China */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Liefertreue China
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: getStatusColor(kpiSummary.liefertreue) }}>
              {formatPercent(kpiSummary.liefertreue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpiSummary.puenktlicheLieferungen} / {kpiSummary.gesamtLieferungen} pünktlich
            </p>
          </CardContent>
        </Card>
        
        {/* KPI Card: Materialverfügbarkeit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Materialverfügbarkeit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: getStatusColor(kpiSummary.materialverfuegbarkeit) }}>
              {formatPercent(kpiSummary.materialverfuegbarkeit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ATP-Checks erfüllt
            </p>
          </CardContent>
        </Card>
        
        {/* KPI Card: Planungsgenauigkeit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Planungsgenauigkeit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: getStatusColor(kpiSummary.planungsgenauigkeit) }}>
              {formatPercent(kpiSummary.planungsgenauigkeit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Plan vs. Ist Übereinstimmung
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Produktions-Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle>Jahresproduktion 2027</CardTitle>
          <CardDescription>Soll vs. Ist Vergleich</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Plan</p>
              <p className="text-2xl font-bold text-green-600">{formatNumber(kpiSummary.gesamtPlan)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Ist</p>
              <p className="text-2xl font-bold text-blue-600">{formatNumber(kpiSummary.gesamtIst)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Abweichung</p>
              <p className={`text-2xl font-bold ${kpiSummary.abweichung >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpiSummary.abweichung >= 0 ? '+' : ''}{formatNumber(kpiSummary.abweichung)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUB-KOMPONENTE 2: PLANERFÜLLUNGSGRAD DETAILANSICHT
 * ═══════════════════════════════════════════════════════════════════════════════
 */
function PlanerfuellungDetailView({ 
  monatlich, 
  woechentlich 
}: { 
  monatlich: any[]
  woechentlich: any[]
}) {
  return (
    <div className="space-y-6">
      {/* Chart 1: Monatlicher Planerfüllungsgrad (Line Chart) */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Monatlicher Planerfüllungsgrad</CardTitle>
              <CardDescription>Entwicklung der Planerfüllung über 12 Monate</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(monatlich, 'planerfuellung_monatlich')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monatlich}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monatKurz" />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Planerfüllungsgrad %', angle: -90, position: 'insideLeft' }}
                domain={[0, 100]}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                label={{ value: 'Menge (Bikes)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip content={<CustomTooltipPlanerfuellung />} />
              <Legend />
              <ReferenceLine yAxisId="left" y={95} stroke={COLORS.warning} strokeDasharray="3 3" label="Ziel 95%" />
              <ReferenceLine yAxisId="left" y={100} stroke={COLORS.success} strokeDasharray="3 3" label="Ideal 100%" />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="planerfuellungsgrad" 
                stroke={COLORS.primary} 
                strokeWidth={3}
                name="Planerfüllungsgrad %"
                dot={{ r: 6 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="istMenge" 
                stroke={COLORS.secondary} 
                strokeWidth={2}
                name="Ist-Produktion"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Chart 2: Wöchentliche Erfüllung (Bar Chart mit Scrollbar) */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Wöchentliche Planerfüllung</CardTitle>
              <CardDescription>Detaillierte Erfüllung pro Kalenderwoche (52 Wochen)</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(woechentlich, 'planerfuellung_woechentlich')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={woechentlich}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="kalenderwoche" label={{ value: 'Kalenderwoche', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'Planerfüllungsgrad %', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltipPlanerfuellung />} />
              <Legend />
              <ReferenceLine y={95} stroke={COLORS.warning} strokeDasharray="3 3" label="Ziel 95%" />
              <Bar dataKey="planerfuellungsgrad" name="Planerfüllungsgrad %">
                {woechentlich.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.planerfuellungsgrad)} />
                ))}
              </Bar>
              <Brush dataKey="kalenderwoche" height={30} stroke={COLORS.primary} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Chart 3: Stacked Bar - Erfüllt vs. Nicht erfüllt */}
      <Card>
        <CardHeader>
          <CardTitle>Monatliche Erfüllung - Tage erfüllt vs. nicht erfüllt</CardTitle>
          <CardDescription>Anzahl Arbeitstage mit vollständiger Planerfüllung</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monatlich}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monatKurz" />
              <YAxis label={{ value: 'Anzahl Tage', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="auftragErfuellt" stackId="a" fill={COLORS.success} name="Tage erfüllt" />
              <Bar 
                dataKey={(entry) => entry.auftragGesamt - entry.auftragErfuellt} 
                stackId="a" 
                fill={COLORS.danger} 
                name="Tage nicht erfüllt" 
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUB-KOMPONENTE 3: LIEFERTREUE CHINA DETAILANSICHT
 * ═══════════════════════════════════════════════════════════════════════════════
 */
function LiefertreuDetailView({ 
  timeline, 
  monatlich 
}: { 
  timeline: any[]
  monatlich: any[]
}) {
  // Prepare Scatter Data: Sample every 5th delivery for performance
  const scatterData = timeline.filter((_, idx) => idx % 5 === 0).map(l => ({
    bestelldatum: l.bestelldatum.getTime(),
    bestelldatumStr: l.bestelldatumStr,
    ankunft: l.erwarteteAnkunft.getTime(),
    vorlaufzeit: l.vorlaufzeitTage,
    puenktlich: l.puenktlich ? 1 : 0,
    status: l.puenktlich ? 'Pünktlich' : 'Verspätet',
    ...l
  }))
  
  return (
    <div className="space-y-6">
      {/* Chart 1: Timeline Scatter - Jede Lieferung */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Lieferungs-Timeline</CardTitle>
              <CardDescription>
                Jede Bestellung auf Zeitachse (Grün = pünktlich, Rot = verspätet) - Sample von {scatterData.length} Lieferungen
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(timeline, 'lieferungen_timeline')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="ankunft" 
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(timestamp) => {
                  const d = new Date(timestamp)
                  return d.toLocaleDateString('de-DE', { month: 'short' })
                }}
                label={{ value: 'Ankunftsdatum', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                dataKey="vorlaufzeit" 
                type="number"
                label={{ value: 'Vorlaufzeit (Tage)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltipLieferung />} />
              <Legend />
              <ReferenceLine y={49} stroke={COLORS.info} strokeDasharray="3 3" label="Standard: 49 Tage" />
              <Scatter name="Pünktliche Lieferungen" data={scatterData.filter(d => d.puenktlich === 1)} fill={COLORS.success} />
              <Scatter name="Verspätete Lieferungen" data={scatterData.filter(d => d.puenktlich === 0)} fill={COLORS.danger} />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Chart 2: Monatliche Lieferungen - Stacked Bar */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Monatliche Lieferperformance</CardTitle>
              <CardDescription>Pünktliche vs. verspätete Lieferungen pro Monat</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(monatlich, 'lieferperformance_monatlich')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monatlich}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monatKurz" />
              <YAxis label={{ value: 'Anzahl Lieferungen', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="puenktlicheLieferungen" stackId="a" fill={COLORS.success} name="Pünktlich" />
              <Bar dataKey="verspaeteteLieferungen" stackId="a" fill={COLORS.danger} name="Verspätet" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Chart 3: Liefertreue-Entwicklung (Line Chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Liefertreue-Entwicklung über Zeit</CardTitle>
          <CardDescription>Monatliche Liefertreue in Prozent</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monatlich}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monatKurz" />
              <YAxis domain={[0, 100]} label={{ value: 'Liefertreue %', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={95} stroke={COLORS.warning} strokeDasharray="3 3" label="Ziel 95%" />
              <ReferenceLine y={100} stroke={COLORS.success} strokeDasharray="3 3" label="Perfekt 100%" />
              <Line 
                type="monotone" 
                dataKey="liefertreue" 
                stroke={COLORS.primary} 
                strokeWidth={3}
                name="Liefertreue %"
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUB-KOMPONENTE 4: DURCHLAUFZEIT DETAILANSICHT
 * ═══════════════════════════════════════════════════════════════════════════════
 */
function DurchlaufzeitDetailView({ 
  breakdown, 
  monatlich 
}: { 
  breakdown: any[]
  monatlich: any[]
}) {
  // Prepare Waterfall Data (kumulative Werte)
  const waterfallData = breakdown.slice(0, -1).map((item, idx) => {
    const kumulative = breakdown.slice(0, idx + 1).reduce((sum, b) => sum + b.tage, 0)
    return {
      ...item,
      kumulative
    }
  })
  
  return (
    <div className="space-y-6">
      {/* Chart 1: Waterfall Chart - Breakdown der 49 Tage */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Durchlaufzeit-Breakdown</CardTitle>
              <CardDescription>Detaillierte Aufschlüsselung der 49 Tage Vorlaufzeit</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(breakdown, 'durchlaufzeit_breakdown')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={waterfallData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="komponente" angle={-15} textAnchor="end" height={80} />
              <YAxis label={{ value: 'Tage', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltipDurchlaufzeit />} />
              <Legend />
              <Bar dataKey="tage" name="Teilschritte (Tage)" stackId="a">
                {waterfallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.primary} />
                ))}
              </Bar>
              <Line 
                type="stepAfter" 
                dataKey="kumulative" 
                stroke={COLORS.danger} 
                strokeWidth={3}
                name="Kumulative Dauer"
                dot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          
          {/* Breakdown-Tabelle */}
          <div className="mt-6 border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Komponente</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold">Tage</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Typ</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Beschreibung</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {breakdown.map((item, idx) => (
                  <tr key={idx} className={idx === breakdown.length - 1 ? 'bg-muted/50 font-semibold' : ''}>
                    <td className="px-4 py-2 text-sm">{item.komponente}</td>
                    <td className="px-4 py-2 text-sm text-right">{item.tage}</td>
                    <td className="px-4 py-2 text-sm">
                      {item.typ === 'arbeitstage' ? 'Arbeitstage' : 'Kalendertage'}
                    </td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{item.beschreibung}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Chart 2: Monatliche Durchlaufzeit - Line Chart mit Min/Max */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Durchlaufzeit-Entwicklung</CardTitle>
              <CardDescription>Min / Durchschnitt / Max Vorlaufzeit pro Monat</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(monatlich, 'durchlaufzeit_monatlich')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={monatlich}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monatName" />
              <YAxis label={{ value: 'Vorlaufzeit (Tage)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={49} stroke={COLORS.info} strokeDasharray="3 3" label="Standard: 49 Tage" />
              <Area 
                dataKey="maxVorlaufzeit" 
                fill={COLORS.neutral} 
                fillOpacity={0.2}
                stroke="none"
                name="Max-Bereich"
              />
              <Line 
                type="monotone" 
                dataKey="durchschnittVorlaufzeit" 
                stroke={COLORS.primary} 
                strokeWidth={3}
                name="Durchschnitt"
                dot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="minVorlaufzeit" 
                stroke={COLORS.secondary} 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Minimum"
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUB-KOMPONENTE 5: LAGERUMSCHLAG DETAILANSICHT
 * ═══════════════════════════════════════════════════════════════════════════════
 */
function LagerumschlagDetailView({ 
  monatlich, 
  heatmap,
  warehouseTage
}: { 
  monatlich: any[]
  heatmap: any[]
  warehouseTage: any[]
}) {
  // Prepare Composed Chart Data (Lagerbestand + Produktion)
  const composedData = monatlich.map(m => ({
    ...m,
    lagerbestandArea: m.durchschnittLagerbestand // For Area Chart
  }))
  
  // Calculate Heatmap Color Scale
  const allBestaende = heatmap.flatMap(h => h.monatlicheBestaende.map((m: any) => m.durchschnittBestand))
  const minBestand = Math.min(...allBestaende)
  const maxBestand = Math.max(...allBestaende)
  
  return (
    <div className="space-y-6">
      {/* Chart 1: Composed Chart - Lagerbestand (Area) + Produktion (Line) */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Lagerbestand & Produktionsmenge</CardTitle>
              <CardDescription>Durchschnittlicher Lagerbestand (Area) vs. Produktionsmenge (Linie)</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(monatlich, 'lagerumschlag_monatlich')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={composedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monatKurz" />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Lagerbestand (Stück)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                label={{ value: 'Produktion (Bikes)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip />
              <Legend />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="lagerbestandArea" 
                fill={COLORS.info} 
                fillOpacity={0.3}
                stroke={COLORS.info}
                strokeWidth={2}
                name="Ø Lagerbestand"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="produktionsMenge" 
                stroke={COLORS.primary} 
                strokeWidth={3}
                name="Produktion"
                dot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Chart 2: Monatlicher Lagerumschlag (Bar Chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Monatlicher Lagerumschlag</CardTitle>
          <CardDescription>Lagerumschlag = Produktion / Durchschnittlicher Lagerbestand</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monatlich}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monatKurz" />
              <YAxis label={{ value: 'Lagerumschlag', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={1} stroke={COLORS.warning} strokeDasharray="3 3" label="Ziel: > 1" />
              <Bar dataKey="lagerumschlag" name="Lagerumschlag">
                {monatlich.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.lagerumschlag >= 1 ? COLORS.success : COLORS.danger} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Chart 3: Heatmap - Lagerbestand nach Variante x Monat */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Lagerbestand Heatmap</CardTitle>
              <CardDescription>Durchschnittlicher Lagerbestand pro Sattel-Variante und Monat</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToJSON(heatmap, 'lagerbestand_heatmap')}
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex flex-col gap-2">
                {/* Header */}
                <div className="flex gap-2">
                  <div className="w-32 text-xs font-semibold px-2 py-1">Variante</div>
                  {MONATSNAMEN_KURZ.map((m, idx) => (
                    <div key={idx} className="w-16 text-xs font-semibold text-center px-2 py-1">
                      {m}
                    </div>
                  ))}
                </div>
                
                {/* Heatmap Rows */}
                {heatmap.map((bauteil, bIdx) => (
                  <div key={bIdx} className="flex gap-2 items-center">
                    <div className="w-32 text-xs font-medium px-2 py-1 truncate" title={bauteil.bauteilName}>
                      {bauteil.bauteilName.split(' ').slice(-2).join(' ')}
                    </div>
                    {bauteil.monatlicheBestaende.map((monat: any, mIdx: number) => (
                      <div
                        key={mIdx}
                        className="w-16 h-12 rounded flex items-center justify-center text-xs font-semibold text-white shadow-sm"
                        style={{
                          backgroundColor: getHeatmapColor(monat.durchschnittBestand, minBestand, maxBestand)
                        }}
                        title={`${MONATSNAMEN[monat.monat - 1]}: ${formatNumber(monat.durchschnittBestand)}`}
                      >
                        {formatNumber(monat.durchschnittBestand)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Legende:</span>
                <div className="flex items-center gap-1">
                  {HEATMAP_COLORS.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-4 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground ml-2">
                  {formatNumber(minBestand)} - {formatNumber(maxBestand)} Stück
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUB-KOMPONENTE 6: PLANUNGSGENAUIGKEIT DETAILANSICHT
 * ═══════════════════════════════════════════════════════════════════════════════
 */
function PlanungsgenauigkeitDetailView({ 
  monatlich 
}: { 
  monatlich: any[]
}) {
  // Box Plot Data Simulation (Min, Q1, Median, Q3, Max)
  const boxPlotData = monatlich.map(m => {
    const abweichungProzent = m.abweichungProzent
    return {
      monat: m.monatKurz,
      min: Math.min(-5, abweichungProzent - 2),
      q1: abweichungProzent - 1,
      median: abweichungProzent,
      q3: abweichungProzent + 1,
      max: Math.max(5, abweichungProzent + 2)
    }
  })
  
  return (
    <div className="space-y-6">
      {/* Chart 1: Dual Axis - Plan vs. Ist (Bars) + Abweichung % (Line) */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Plan vs. Ist mit Abweichung</CardTitle>
              <CardDescription>Monatliche Soll-Produktion vs. Ist-Produktion mit prozentualer Abweichung</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(monatlich, 'planungsgenauigkeit_monatlich')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={monatlich}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monatKurz" />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Menge (Bikes)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                label={{ value: 'Abweichung %', angle: 90, position: 'insideRight' }}
              />
              <Tooltip />
              <Legend />
              <ReferenceLine yAxisId="right" y={0} stroke={COLORS.neutral} strokeDasharray="3 3" />
              <Bar yAxisId="left" dataKey="planMenge" fill={COLORS.primary} name="Plan" />
              <Bar yAxisId="left" dataKey="istMenge" fill={COLORS.secondary} name="Ist" />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="abweichungProzent" 
                stroke={COLORS.danger} 
                strokeWidth={3}
                name="Abweichung %"
                dot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Chart 2: Genauigkeit über Zeit (Line Chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Planungsgenauigkeit-Entwicklung</CardTitle>
          <CardDescription>Genauigkeit = 100% - |Abweichung%|</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monatlich}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monatKurz" />
              <YAxis domain={[0, 100]} label={{ value: 'Genauigkeit %', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={95} stroke={COLORS.warning} strokeDasharray="3 3" label="Ziel 95%" />
              <ReferenceLine y={99} stroke={COLORS.success} strokeDasharray="3 3" label="Sehr gut 99%" />
              <Line 
                type="monotone" 
                dataKey="genauigkeit" 
                stroke={COLORS.primary} 
                strokeWidth={3}
                name="Genauigkeit %"
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Chart 3: Abweichungs-Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle>Detaillierte Abweichungs-Analyse</CardTitle>
          <CardDescription>Monatliche Aufschlüsselung von Plan, Ist und Abweichung</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Monat</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold">Plan</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold">Ist</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold">Abweichung</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold">Abweichung %</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold">Genauigkeit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monatlich.map((m, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm font-medium">{m.monatName}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatNumber(m.planMenge)}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatNumber(m.istMenge)}</td>
                    <td className={`px-4 py-2 text-sm text-right font-semibold ${m.abweichung >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.abweichung >= 0 ? '+' : ''}{formatNumber(m.abweichung)}
                    </td>
                    <td className={`px-4 py-2 text-sm text-right font-semibold ${m.abweichungProzent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.abweichungProzent >= 0 ? '+' : ''}{formatPercent(m.abweichungProzent)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right" style={{ color: getStatusColor(m.genauigkeit) }}>
                      {formatPercent(m.genauigkeit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUB-KOMPONENTE 7: MATERIALVERFÜGBARKEIT DETAILANSICHT
 * ═══════════════════════════════════════════════════════════════════════════════
 */
function MaterialverfuegbarkeitDetailView({ 
  monatlich, 
  taeglich 
}: { 
  monatlich: any[]
  taeglich: any[]
}) {
  // Prepare Stacked Area Data (nur Arbeitstage)
  const stackedAreaData = taeglich
    .filter(t => t.istArbeitstag)
    .map(t => ({
      tag: t.tag,
      datumStr: t.datumStr,
      verfuegbar: t.materialVerfuegbar ? 1 : 0,
      mangel: t.materialVerfuegbar ? 0 : 1,
      monat: t.monat
    }))
  
  return (
    <div className="space-y-6">
      {/* Chart 1: Stacked Area - Tägliche Verfügbarkeit */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Tägliche Materialverfügbarkeit</CardTitle>
              <CardDescription>
                Grün = Material verfügbar, Rot = Materialmangel (nur Arbeitstage, Sample von {Math.min(stackedAreaData.length, 100)} Tagen)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(taeglich, 'materialverfuegbarkeit_taeglich')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={stackedAreaData.slice(0, 100)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="tag" 
                label={{ value: 'Tag im Jahr', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Status', angle: -90, position: 'insideLeft' }}
                domain={[0, 1]}
                ticks={[0, 1]}
                tickFormatter={(v) => v === 1 ? 'Verfügbar' : 'Mangel'}
              />
              <Tooltip 
                labelFormatter={(label) => `Tag ${label}`}
                formatter={(value, name) => [value === 1 ? 'Ja' : 'Nein', name]}
              />
              <Legend />
              <Area 
                type="stepAfter"
                dataKey="verfuegbar" 
                stackId="1"
                stroke={COLORS.success} 
                fill={COLORS.success} 
                fillOpacity={0.8}
                name="Material verfügbar"
              />
              <Area 
                type="stepAfter"
                dataKey="mangel" 
                stackId="1"
                stroke={COLORS.danger} 
                fill={COLORS.danger} 
                fillOpacity={0.8}
                name="Materialmangel"
              />
              <Brush dataKey="tag" height={30} stroke={COLORS.primary} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Chart 2: Monatliche Häufigkeit Engpässe (Bar Chart) */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Monatliche Materialengpässe</CardTitle>
              <CardDescription>Anzahl Tage mit Materialmangel pro Monat</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(monatlich, 'materialverfuegbarkeit_monatlich')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monatlich}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monatKurz" />
              <YAxis label={{ value: 'Anzahl Tage', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="tageMaterialmangel" fill={COLORS.danger} name="Tage mit Mangel" />
              <Bar dataKey="tageMaterialVerfuegbar" fill={COLORS.success} name="Tage verfügbar" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Chart 3: Verfügbarkeitsrate über Zeit (Line Chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Verfügbarkeitsrate-Entwicklung</CardTitle>
          <CardDescription>Monatliche Verfügbarkeitsrate in Prozent</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monatlich}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monatKurz" />
              <YAxis domain={[0, 100]} label={{ value: 'Verfügbarkeitsrate %', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={95} stroke={COLORS.warning} strokeDasharray="3 3" label="Ziel 95%" />
              <ReferenceLine y={100} stroke={COLORS.success} strokeDasharray="3 3" label="Perfekt 100%" />
              <Line 
                type="monotone" 
                dataKey="verfuegbarkeitsrate" 
                stroke={COLORS.primary} 
                strokeWidth={3}
                name="Verfügbarkeit %"
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUB-KOMPONENTE 8: LAGERREICHWEITE DETAILANSICHT
 * ═══════════════════════════════════════════════════════════════════════════════
 */
function LagerreichweiteDetailView({ 
  monatlich, 
  heatmap 
}: { 
  monatlich: any[]
  heatmap: any[]
}) {
  // Prepare Multi-Line Data (pro Sattel-Variante)
  // Transformiere monatlich nach Varianten
  const sattelVarianten = monatlich[0]?.bauteile.map((b: any) => b.bauteilId) || []
  
  const multiLineData = MONATSNAMEN_KURZ.map((monatKurz, idx) => {
    const monat = monatlich[idx]
    const dataPoint: any = { monat: monatKurz, monatIdx: idx + 1 }
    
    monat?.bauteile.forEach((b: any) => {
      dataPoint[b.bauteilId] = b.durchschnittReichweite
    })
    
    return dataPoint
  })
  
  // Heatmap Color Scale
  const allReichweiten = heatmap.flatMap(w => w.bauteile.map((b: any) => b.durchschnittReichweite))
  const minReichweite = Math.min(...allReichweiten, 0)
  const maxReichweite = Math.max(...allReichweiten, 30)
  
  return (
    <div className="space-y-6">
      {/* Chart 1: Multi-Line - Reichweite pro Sattel-Variante */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Lagerreichweite pro Sattel-Variante</CardTitle>
              <CardDescription>Durchschnittliche Reichweite in Tagen (Zielbereich: 7-14 Tage)</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToJSON(monatlich, 'lagerreichweite_monatlich')}
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={multiLineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monat" />
              <YAxis label={{ value: 'Reichweite (Tage)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              
              {/* Zielbereich 7-14 Tage */}
              <ReferenceArea y1={7} y2={14} fill={COLORS.success} fillOpacity={0.1} label="Optimal" />
              <ReferenceLine y={7} stroke={COLORS.warning} strokeDasharray="3 3" label="Min 7 Tage" />
              <ReferenceLine y={14} stroke={COLORS.warning} strokeDasharray="3 3" label="Max 14 Tage" />
              
              {/* Linien pro Sattel-Variante */}
              {sattelVarianten.map((sattelId: string, idx: number) => (
                <Line
                  key={sattelId}
                  type="monotone"
                  dataKey={sattelId}
                  stroke={Object.values(SATTEL_COLORS)[idx] || COLORS.neutral}
                  strokeWidth={2}
                  name={sattelId}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Chart 2: Heatmap - Woche x Variante */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Lagerreichweite Heatmap (Wöchentlich)</CardTitle>
              <CardDescription>Durchschnittliche Reichweite pro Kalenderwoche und Sattel-Variante</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToJSON(heatmap, 'lagerreichweite_heatmap')}
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="space-y-4">
                {/* Für jede Sattel-Variante eine Zeile */}
                {sattelVarianten.map((sattelId: string, sIdx: number) => (
                  <div key={sattelId} className="space-y-1">
                    <h4 className="text-xs font-semibold">{sattelId}</h4>
                    <div className="flex gap-1 flex-wrap">
                      {heatmap.slice(0, 52).map((woche, wIdx) => {
                        const bauteil = woche.bauteile.find((b: any) => b.bauteilId === sattelId)
                        const reichweite = bauteil?.durchschnittReichweite || 0
                        
                        return (
                          <div
                            key={wIdx}
                            className="w-12 h-12 rounded flex items-center justify-center text-xs font-semibold text-white shadow-sm"
                            style={{
                              backgroundColor: getLagerreichweiteColor(reichweite)
                            }}
                            title={`KW${woche.kalenderwoche}: ${reichweite.toFixed(1)} Tage`}
                          >
                            {woche.kalenderwoche}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h5 className="text-sm font-semibold mb-2">Legende Reichweite (Tage):</h5>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: COLORS.danger }} />
                    <span>&lt; 3: Kritisch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: COLORS.warning }} />
                    <span>3-6: Niedrig</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: COLORS.success }} />
                    <span>7-14: Optimal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: COLORS.info }} />
                    <span>15-21: Hoch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: COLORS.neutral }} />
                    <span>&gt; 21: Sehr hoch</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Chart 3: Reichweiten-Statistik Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle>Monatliche Reichweiten-Statistik</CardTitle>
          <CardDescription>Min / Durchschnitt / Max pro Monat und Variante</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="space-y-6">
              {monatlich.map((monat, mIdx) => (
                <div key={mIdx}>
                  <h4 className="text-sm font-semibold mb-2">{monat.monatName}</h4>
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Variante</th>
                        <th className="px-3 py-2 text-right">Min</th>
                        <th className="px-3 py-2 text-right">Ø</th>
                        <th className="px-3 py-2 text-right">Max</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {monat.bauteile.map((b: any, bIdx: number) => (
                        <tr key={bIdx}>
                          <td className="px-3 py-2">{b.bauteilId}</td>
                          <td className="px-3 py-2 text-right">{b.minReichweite.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{b.durchschnittReichweite.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right">{b.maxReichweite.toFixed(1)}</td>
                          <td className="px-3 py-2">
                            <span 
                              className="px-2 py-1 rounded text-white text-xs font-semibold"
                              style={{ backgroundColor: getLagerreichweiteColor(b.durchschnittReichweite) }}
                            >
                              {b.durchschnittReichweite < 3 ? 'Kritisch' :
                               b.durchschnittReichweite < 7 ? 'Niedrig' :
                               b.durchschnittReichweite <= 14 ? 'Optimal' :
                               b.durchschnittReichweite <= 21 ? 'Hoch' : 'Sehr hoch'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
