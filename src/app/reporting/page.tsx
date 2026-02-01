'use client'

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCOR-METRIKEN REPORTING - KOMPAKTE VISUALISIERUNG
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 6 SCOR-Metriken mit Übersicht + Detail-Tabs:
 * 
 * TAB 1: Übersicht - Alle 6 KPIs als Cards mit Ampel + Trend + Mini-Sparkline
 * TAB 2-7: Detail-Tabs pro KPI mit:
 *   - SCOR-Kategorie Badge (farbcodiert)
 *   - Großer KPI-Wert mit Ampel und Trend
 *   - Kurze Erklärung
 *   - 2 aussagekräftige Charts (responsive)
 *   - Export-Button (CSV + JSON)
 * 
 * DATENQUELLE: scor-metrics-real.ts (100% Realdaten)
 * 
 * @author WI3 Team - Adventure Works AG
 * @version 1.0
 */

import { useMemo } from 'react'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { berechneSCORMetrikenReal } from '@/lib/calculations/scor-metrics-real'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  ComposedChart, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ReferenceLine
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Minus, Download, 
  CheckCircle2, AlertCircle, XCircle
} from 'lucide-react'

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 */

type SCORKategorie = 'RELIABILITY' | 'RESPONSIVENESS' | 'AGILITY' | 'ASSETS'

interface KategorieConfig {
  farbe: string
  bgClass: string
  textClass: string
  label: string
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KONSTANTEN
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const KATEGORIE_CONFIG: Record<SCORKategorie, KategorieConfig> = {
  RELIABILITY: {
    farbe: '#3b82f6',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-700',
    label: 'Zuverlässigkeit'
  },
  RESPONSIVENESS: {
    farbe: '#10b981',
    bgClass: 'bg-green-500',
    textClass: 'text-green-700',
    label: 'Reaktionsfähigkeit'
  },
  AGILITY: {
    farbe: '#f97316',
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-700',
    label: 'Flexibilität'
  },
  ASSETS: {
    farbe: '#a855f7',
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-700',
    label: 'Anlagenverwaltung'
  }
}

const STATUS_CONFIG = {
  gut: { icon: CheckCircle2, farbe: 'text-green-600', bg: 'bg-green-100', label: 'Gut' },
  mittel: { icon: AlertCircle, farbe: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Mittel' },
  schlecht: { icon: XCircle, farbe: 'text-red-600', bg: 'bg-red-100', label: 'Schlecht' }
}

const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  tertiary: '#f97316',
  quaternary: '#a855f7',
  grid: '#e5e7eb',
  text: '#6b7280'
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HAUPTKOMPONENTE
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export default function ReportingPage() {
  const { konfiguration } = useKonfiguration()

  // Berechne SCOR-Metriken (mit Memoization für Performance)
  const { metriken, zeitreihen } = useMemo(() => {
    console.log('🎯 Berechne SCOR-Metriken für Reporting...')
    return berechneSCORMetrikenReal(konfiguration)
  }, [konfiguration])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">SCOR-Metriken Reporting</h1>
        <p className="text-muted-foreground">
          Supply Chain Operations Reference Model - 6 Kernmetriken aus 4 Kategorien
        </p>
      </div>

      {/* Tab-Navigation */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="planerfuellung">Planerfüllung</TabsTrigger>
          <TabsTrigger value="liefertreue">Liefertreue</TabsTrigger>
          <TabsTrigger value="durchlaufzeit">Durchlaufzeit</TabsTrigger>
          <TabsTrigger value="planungsgenauigkeit">Planungsgen.</TabsTrigger>
          <TabsTrigger value="materialverfuegbarkeit">Material</TabsTrigger>
          <TabsTrigger value="lagerreichweite">Lagerreichw.</TabsTrigger>
        </TabsList>

        {/* TAB 1: ÜBERSICHT */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard 
              metrik={metriken.planerfuellungsgrad}
              zeitreiheDaten={zeitreihen.planerfuellungMonatlich.map(m => m.erfuellungsgrad)}
            />
            <KPICard 
              metrik={metriken.liefertreueChina}
              zeitreiheDaten={zeitreihen.liefertreueLieferungen.length > 0 
                ? Array.from({ length: 12 }, (_, i) => {
                    const monat = i + 1
                    const lieferungenImMonat = zeitreihen.liefertreueLieferungen.filter(l => {
                      const bestellMonat = new Date(l.bestelldatum).getMonth() + 1
                      return bestellMonat === monat
                    })
                    if (lieferungenImMonat.length === 0) return 100
                    const puenktlich = lieferungenImMonat.filter(l => l.puenktlich).length
                    return (puenktlich / lieferungenImMonat.length) * 100
                  })
                : Array(12).fill(100)
              }
            />
            <KPICard 
              metrik={metriken.durchlaufzeit}
              zeitreiheDaten={zeitreihen.durchlaufzeitDetails.monatlich.map(m => m.durchschnitt)}
              inverse // Niedriger = besser
            />
            <KPICard 
              metrik={metriken.planungsgenauigkeit}
              zeitreiheDaten={zeitreihen.planungsgenauigkeitMonatlich.map(m => m.genauigkeit)}
            />
            <KPICard 
              metrik={metriken.materialverfuegbarkeit}
              zeitreiheDaten={zeitreihen.materialverfuegbarkeitMonatlich.map(m => m.erfuellungsrate)}
            />
            <KPICard 
              metrik={metriken.lagerreichweite}
              zeitreiheDaten={zeitreihen.lagerreichweiteMonatlich.map(m => m.reichweiteTage)}
            />
          </div>
        </TabsContent>

        {/* TAB 2: PLANERFÜLLUNGSGRAD */}
        <TabsContent value="planerfuellung" className="space-y-6">
          <MetrikDetailView
            metrik={metriken.planerfuellungsgrad}
            charts={[
              <MonatlicherVerlaufChart 
                key="monatlich"
                data={zeitreihen.planerfuellungMonatlich}
                dataKey="erfuellungsgrad"
                label="Erfüllungsgrad (%)"
                zielwert={95}
              />,
              <PlanerfuellungMonatlichChart
                key="balken"
                data={zeitreihen.planerfuellungMonatlich}
              />
            ]}
            exportData={{
              csv: convertToCSV(zeitreihen.planerfuellungMonatlich),
              json: zeitreihen.planerfuellungMonatlich
            }}
          />
        </TabsContent>

        {/* TAB 3: LIEFERTREUE CHINA */}
        <TabsContent value="liefertreue" className="space-y-6">
          <MetrikDetailView
            metrik={metriken.liefertreueChina}
            charts={[
              <LiefertreueLieferungenScatter
                key="scatter"
                data={zeitreihen.liefertreueLieferungen}
              />,
              <MonatlicheLiefertreueBars
                key="bars"
                data={zeitreihen.liefertreueLieferungen}
              />
            ]}
            exportData={{
              csv: convertToCSV(zeitreihen.liefertreueLieferungen),
              json: zeitreihen.liefertreueLieferungen
            }}
          />
        </TabsContent>

        {/* TAB 4: DURCHLAUFZEIT */}
        <TabsContent value="durchlaufzeit" className="space-y-6">
          <MetrikDetailView
            metrik={metriken.durchlaufzeit}
            charts={[
              <DurchlaufzeitWaterfallChart
                key="waterfall"
                data={zeitreihen.durchlaufzeitDetails.komponenten}
              />,
              <MonatlicheDurchlaufzeitChart
                key="monatlich"
                data={zeitreihen.durchlaufzeitDetails.monatlich}
              />
            ]}
            exportData={{
              csv: convertToCSV(zeitreihen.durchlaufzeitDetails.monatlich),
              json: zeitreihen.durchlaufzeitDetails
            }}
          />
        </TabsContent>

        {/* TAB 5: PLANUNGSGENAUIGKEIT */}
        <TabsContent value="planungsgenauigkeit" className="space-y-6">
          <MetrikDetailView
            metrik={metriken.planungsgenauigkeit}
            charts={[
              <PlanVsIstDualAxisChart
                key="dualaxis"
                data={zeitreihen.planungsgenauigkeitMonatlich}
              />,
              <MonatlicheAbweichungChart
                key="abweichung"
                data={zeitreihen.planungsgenauigkeitMonatlich}
              />
            ]}
            exportData={{
              csv: convertToCSV(zeitreihen.planungsgenauigkeitMonatlich),
              json: zeitreihen.planungsgenauigkeitMonatlich
            }}
          />
        </TabsContent>

        {/* TAB 6: MATERIAL-VERFÜGBARKEIT */}
        <TabsContent value="materialverfuegbarkeit" className="space-y-6">
          <MetrikDetailView
            metrik={metriken.materialverfuegbarkeit}
            charts={[
              <MonatlicheVerfuegbarkeitAreaChart
                key="area"
                data={zeitreihen.materialverfuegbarkeitMonatlich}
              />,
              <TaeglicheVerfuegbarkeitHeatmap
                key="heatmap"
                data={zeitreihen.materialverfuegbarkeitMonatlich}
              />
            ]}
            exportData={{
              csv: convertToCSV(zeitreihen.materialverfuegbarkeitMonatlich),
              json: zeitreihen.materialverfuegbarkeitMonatlich
            }}
          />
        </TabsContent>

        {/* TAB 7: LAGERREICHWEITE */}
        <TabsContent value="lagerreichweite" className="space-y-6">
          <MetrikDetailView
            metrik={metriken.lagerreichweite}
            charts={[
              <ReichweiteProVarianteChart
                key="varianten"
                data={zeitreihen.lagerreichweiteMonatlich}
              />,
              <ReichweiteHeatmapChart
                key="heatmap"
                data={zeitreihen.lagerreichweiteMonatlich}
              />
            ]}
            exportData={{
              csv: convertToCSV(zeitreihen.lagerreichweiteMonatlich),
              json: zeitreihen.lagerreichweiteMonatlich
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KOMPONENTEN: KPI CARDS (ÜBERSICHT)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface KPICardProps {
  metrik: any
  zeitreiheDaten: number[]
  inverse?: boolean // true = niedriger ist besser (z.B. Durchlaufzeit)
}

function KPICard({ metrik, zeitreiheDaten, inverse = false }: KPICardProps) {
  const config = KATEGORIE_CONFIG[metrik.kategorie as SCORKategorie]
  const statusConfig = STATUS_CONFIG[metrik.status as 'gut' | 'mittel' | 'schlecht']
  const StatusIcon = statusConfig.icon

  // Trend-Icon
  const TrendIcon = metrik.trend > 0 ? TrendingUp : metrik.trend < 0 ? TrendingDown : Minus
  const trendFarbe = inverse 
    ? (metrik.trend > 0 ? 'text-red-600' : metrik.trend < 0 ? 'text-green-600' : 'text-gray-400')
    : (metrik.trend > 0 ? 'text-green-600' : metrik.trend < 0 ? 'text-red-600' : 'text-gray-400')

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Badge className={`${config.bgClass} text-white`}>
              {config.label}
            </Badge>
            <CardTitle className="text-sm font-medium">
              {metrik.label}
            </CardTitle>
          </div>
          <StatusIcon className={`h-5 w-5 ${statusConfig.farbe}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Hauptwert */}
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold">
              {metrik.wert.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">
              {metrik.einheit}
            </span>
          </div>

          {/* Trend */}
          <div className="flex items-center space-x-1">
            <TrendIcon className={`h-4 w-4 ${trendFarbe}`} />
            <span className={`text-sm ${trendFarbe}`}>
              {Math.abs(metrik.trend).toFixed(1)}% vs. Vormonat
            </span>
          </div>

          {/* Mini-Sparkline */}
          <div className="h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={zeitreiheDaten.map((v, i) => ({ wert: v }))}>
                <Line 
                  type="monotone" 
                  dataKey="wert" 
                  stroke={config.farbe}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Zielwert */}
          <div className="text-xs text-muted-foreground">
            Zielwert: {metrik.zielwert} {metrik.einheit}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KOMPONENTEN: DETAIL VIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface MetrikDetailViewProps {
  metrik: any
  charts: React.ReactNode[]
  exportData: { csv: string; json: any }
}

function MetrikDetailView({ metrik, charts, exportData }: MetrikDetailViewProps) {
  const config = KATEGORIE_CONFIG[metrik.kategorie as SCORKategorie]
  const statusConfig = STATUS_CONFIG[metrik.status as 'gut' | 'mittel' | 'schlecht']
  const StatusIcon = statusConfig.icon

  const TrendIcon = metrik.trend > 0 ? TrendingUp : metrik.trend < 0 ? TrendingDown : Minus
  const trendFarbe = metrik.trend > 0 ? 'text-green-600' : metrik.trend < 0 ? 'text-red-600' : 'text-gray-400'

  return (
    <div className="space-y-6">
      {/* Header mit KPI-Wert */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <Badge className={`${config.bgClass} text-white`}>
                SCOR: {config.label}
              </Badge>
              <CardTitle className="text-2xl">{metrik.label}</CardTitle>
              <CardDescription>{metrik.beschreibung}</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadCSV(exportData.csv, `${metrik.label}.csv`)}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadJSON(exportData.json, `${metrik.label}.json`)}
              >
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {/* Wert */}
            <div className="flex items-baseline space-x-3">
              <span className="text-5xl font-bold">
                {metrik.wert.toFixed(1)}
              </span>
              <span className="text-xl text-muted-foreground">
                {metrik.einheit}
              </span>
            </div>

            {/* Status + Trend */}
            <div className="text-right space-y-2">
              <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${statusConfig.bg}`}>
                <StatusIcon className={`h-5 w-5 ${statusConfig.farbe}`} />
                <span className={`font-medium ${statusConfig.farbe}`}>
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center justify-end space-x-1">
                <TrendIcon className={`h-5 w-5 ${trendFarbe}`} />
                <span className={`text-sm ${trendFarbe}`}>
                  {Math.abs(metrik.trend).toFixed(1)}% vs. Vormonat
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Zielwert: {metrik.zielwert} {metrik.einheit}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart, idx) => (
          <Card key={idx}>
            <CardContent className="pt-6">
              {chart}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CHART KOMPONENTEN
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Chart 1: Monatlicher Verlauf (Line + ReferenceLine für Zielwert)
function MonatlicherVerlaufChart({ data, dataKey, label, zielwert }: any) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Monatlicher Verlauf</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis 
            dataKey="monatName" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <ReferenceLine 
            y={zielwert} 
            stroke={CHART_COLORS.quaternary}
            strokeDasharray="5 5"
            label="Zielwert"
          />
          <Line 
            type="monotone" 
            dataKey={dataKey}
            name={label}
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart 2: Planerfüllung Monatlich (Bar Chart mit Plan/Ist)
function PlanerfuellungMonatlichChart({ data }: any) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Plan vs. Ist pro Monat</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis 
            dataKey="monatName" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="planMenge" name="Plan" fill={CHART_COLORS.primary} opacity={0.6} />
          <Bar dataKey="istMenge" name="Ist" fill={CHART_COLORS.secondary} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart 2b: Heatmap (BarChart mit color-coding)
function WoechentlicheHeatmap({ data, title }: any) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis 
            dataKey="monatName" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="erfuellungsgrad" name="Erfüllungsgrad (%)">
            {data.map((entry: any, index: number) => (
              <Cell 
                key={`cell-${index}`}
                fill={entry.erfuellungsgrad >= 95 ? '#10b981' : entry.erfuellungsgrad >= 85 ? '#f59e0b' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart 3: Liefertreue Scatter (Timeline)
function LiefertreueLieferungenScatter({ data }: any) {
  const chartData = data.slice(0, 50) // Erste 50 Lieferungen für Übersicht

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Lieferungen Timeline (erste 50)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis 
            dataKey="bestelldatum" 
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            dataKey="vorlaufzeitTage"
            label={{ value: 'Vorlaufzeit (Tage)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <p className="font-medium">{data.bestellungId}</p>
                    <p className="text-sm">Bestellt: {data.bestelldatum}</p>
                    <p className="text-sm">Erwartet: {data.erwarteteAnkunft}</p>
                    {data.tatsaechlicheAnkunft && (
                      <p className="text-sm">Angekommen: {data.tatsaechlicheAnkunft}</p>
                    )}
                    <p className={`text-sm font-medium ${data.puenktlich ? 'text-green-600' : 'text-red-600'}`}>
                      {data.puenktlich ? '✓ Pünktlich' : '✗ Verspätet'}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Scatter 
            data={chartData} 
            fill={CHART_COLORS.primary}
          >
            {chartData.map((entry: any, index: number) => (
              <Cell 
                key={`cell-${index}`}
                fill={entry.puenktlich ? '#10b981' : '#ef4444'}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart 4: Monatliche Liefertreue (Bars)
function MonatlicheLiefertreueBars({ data }: any) {
  // Initialisiere alle 12 Monate
  const monatlich: Record<number, any> = {}
  for (let m = 1; m <= 12; m++) {
    monatlich[m] = { 
      monat: m, 
      monatName: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][m - 1],
      puenktlich: 0, 
      gesamt: 0 
    }
  }
  
  // Aggregiere Lieferungen nach Bestellmonat
  data.forEach((lieferung: any) => {
    const monat = new Date(lieferung.bestelldatum).getMonth() + 1
    if (monatlich[monat]) {
      monatlich[monat].gesamt += 1
      if (lieferung.puenktlich) {
        monatlich[monat].puenktlich += 1
      }
    }
  })

  const chartData = Object.values(monatlich).map((m: any) => ({
    monat: m.monatName,
    liefertreue: m.gesamt > 0 ? (m.puenktlich / m.gesamt) * 100 : 100,
    anzahl: m.gesamt
  }))

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Monatliche Liefertreue</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis dataKey="monat" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-white p-2 border rounded shadow">
                    <p className="font-medium">{data.monat}</p>
                    <p className="text-sm">Liefertreue: {data.liefertreue.toFixed(1)}%</p>
                    <p className="text-sm">Lieferungen: {data.anzahl}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <ReferenceLine y={95} stroke={CHART_COLORS.quaternary} strokeDasharray="5 5" label="Ziel: 95%" />
          <Bar dataKey="liefertreue" name="Liefertreue (%)">
            {chartData.map((entry: any, index: number) => (
              <Cell 
                key={`cell-${index}`}
                fill={entry.liefertreue >= 95 ? '#10b981' : entry.liefertreue >= 85 ? '#f59e0b' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart 5: Durchlaufzeit Waterfall
function DurchlaufzeitWaterfallChart({ data }: any) {
  let kumulativ = 0
  const chartData = data.map((komponente: any) => {
    const start = kumulativ
    kumulativ += komponente.tage
    return {
      name: komponente.name,
      tage: komponente.tage,
      start,
      ende: kumulativ
    }
  })

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Durchlaufzeit-Komponenten (Waterfall)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis 
            type="category" 
            dataKey="name" 
            tick={{ fontSize: 10 }}
            width={150}
          />
          <Tooltip />
          <Bar dataKey="tage" fill={CHART_COLORS.primary}>
            {chartData.map((entry: any, index: number) => (
              <Cell 
                key={`cell-${index}`}
                fill={[CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary, CHART_COLORS.quaternary, '#6366f1'][index % 5]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="text-sm text-muted-foreground text-center">
        Gesamtdurchlaufzeit: {chartData[chartData.length - 1].ende} Tage
      </div>
    </div>
  )
}

// Chart 6: Monatliche Durchlaufzeit (Min/Avg/Max)
function MonatlicheDurchlaufzeitChart({ data }: any) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Monatliche Durchlaufzeit (Min/Ø/Max)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis 
            dataKey="monatName" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} label={{ value: 'Tage', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-white p-2 border rounded shadow">
                    <p className="font-medium">{data.monatName}</p>
                    <p className="text-sm">Min: {data.min.toFixed(1)} Tage</p>
                    <p className="text-sm">Ø: {data.durchschnitt.toFixed(1)} Tage</p>
                    <p className="text-sm">Max: {data.max.toFixed(1)} Tage</p>
                    <p className="text-sm">Lieferungen: {data.anzahlLieferungen}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="min" 
            name="Min"
            stroke={CHART_COLORS.secondary}
            strokeDasharray="5 5"
          />
          <Line 
            type="monotone" 
            dataKey="durchschnitt" 
            name="Durchschnitt"
            stroke={CHART_COLORS.primary}
            strokeWidth={3}
          />
          <Line 
            type="monotone" 
            dataKey="max" 
            name="Max"
            stroke={CHART_COLORS.tertiary}
            strokeDasharray="5 5"
          />
          <ReferenceLine 
            y={49} 
            stroke={CHART_COLORS.quaternary}
            strokeDasharray="3 3"
            label="Ziel: 49d"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart 7: Plan vs. Ist (Dual Axis)
function PlanVsIstDualAxisChart({ data }: any) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Plan vs. Ist-Produktion</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis 
            dataKey="monatName" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12 }}
            label={{ value: 'Stückzahl', angle: -90, position: 'insideLeft' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            label={{ value: 'Genauigkeit (%)', angle: 90, position: 'insideRight' }}
          />
          <Tooltip />
          <Legend />
          <Bar 
            yAxisId="left"
            dataKey="planMenge" 
            name="Plan"
            fill={CHART_COLORS.primary}
            opacity={0.6}
          />
          <Bar 
            yAxisId="left"
            dataKey="istMenge" 
            name="Ist"
            fill={CHART_COLORS.secondary}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="genauigkeit" 
            name="Genauigkeit (%)"
            stroke={CHART_COLORS.tertiary}
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart 8: Monatliche Abweichung
function MonatlicheAbweichungChart({ data }: any) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Monatliche Abweichung (Plan - Ist)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis 
            dataKey="monatName" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} label={{ value: 'Abweichung (Stück)', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-white p-2 border rounded shadow">
                    <p className="font-medium">{data.monatName}</p>
                    <p className="text-sm">Plan: {data.planMenge.toLocaleString()}</p>
                    <p className="text-sm">Ist: {data.istMenge.toLocaleString()}</p>
                    <p className="text-sm font-bold">Abweichung: {data.abweichung.toLocaleString()} Stück</p>
                    <p className="text-sm">Genauigkeit: {data.genauigkeit.toFixed(1)}%</p>
                  </div>
                )
              }
              return null
            }}
          />
          <ReferenceLine y={0} stroke="#000" />
          <Bar dataKey="abweichung" name="Abweichung (Plan - Ist)">
            {data.map((entry: any, index: number) => (
              <Cell 
                key={`cell-${index}`}
                fill={Math.abs(entry.abweichung) < 1000 ? '#10b981' : Math.abs(entry.abweichung) < 3000 ? '#f59e0b' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart 9: Monatliche Verfügbarkeit (Area)
function MonatlicheVerfuegbarkeitAreaChart({ data }: any) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Monatliche Material-Verfügbarkeit</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis 
            dataKey="monatName" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} label={{ value: 'Verfügbarkeit (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-white p-2 border rounded shadow">
                    <p className="font-medium">{data.monatName}</p>
                    <p className="text-sm">Verfügbarkeit: {data.erfuellungsrate.toFixed(1)}%</p>
                    <p className="text-sm">Tage erfüllt: {data.tageErfuellt}/{data.tageGesamt}</p>
                    <p className="text-sm text-red-600">Kritische Tage: {data.kritischeTage}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Legend />
          <ReferenceLine 
            y={95} 
            stroke={CHART_COLORS.quaternary}
            strokeDasharray="5 5"
            label="Ziel: 95%"
          />
          <Area 
            type="monotone" 
            dataKey="erfuellungsrate" 
            name="Verfügbarkeit (%)"
            fill={CHART_COLORS.primary}
            stroke={CHART_COLORS.primary}
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart 10: Tägliche Verfügbarkeit Heatmap
function TaeglicheVerfuegbarkeitHeatmap({ data }: any) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Erfüllungsrate pro Monat</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis 
            dataKey="monatName" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
          <Tooltip />
          <Bar dataKey="erfuellungsrate" name="Erfüllungsrate (%)">
            {data.map((entry: any, index: number) => (
              <Cell 
                key={`cell-${index}`}
                fill={entry.erfuellungsrate >= 95 ? '#10b981' : entry.erfuellungsrate >= 85 ? '#f59e0b' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart 11: Reichweite pro Variante (Multi-Line)
function ReichweiteProVarianteChart({ data }: any) {
  // Extrahiere Varianten-IDs
  const variantenIds = data.length > 0 ? Object.keys(data[0].varianten) : []

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Lagerreichweite pro Sattel-Variante</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis 
            dataKey="monatName" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            label={{ value: 'Reichweite (Tage)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip />
          <Legend />
          <ReferenceLine 
            y={5} 
            stroke={CHART_COLORS.quaternary}
            strokeDasharray="5 5"
            label="Ziel: 5d"
          />
          {variantenIds.slice(0, 4).map((id, idx) => (
            <Line 
              key={id}
              type="monotone" 
              dataKey={`varianten.${id}`}
              name={`Sattel ${id}`}
              stroke={[CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary, CHART_COLORS.quaternary][idx]}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart 12: Reichweite Heatmap
function ReichweiteHeatmapChart({ data }: any) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Durchschnittliche Lagerreichweite</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis 
            dataKey="monatName" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} label={{ value: 'Reichweite (Tage)', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-white p-2 border rounded shadow">
                    <p className="font-medium">{data.monatName}</p>
                    <p className="text-sm">Reichweite: {data.reichweiteTage.toFixed(1)} Tage</p>
                    <p className="text-sm">Ø Bestand: {data.durchschnittBestand.toFixed(0)}</p>
                    <p className="text-sm">Ø Verbrauch: {data.durchschnittVerbrauch.toFixed(0)}/Tag</p>
                  </div>
                )
              }
              return null
            }}
          />
          <ReferenceLine 
            y={5} 
            stroke={CHART_COLORS.quaternary}
            strokeDasharray="5 5"
            label="Ziel: 5d"
          />
          <Bar dataKey="reichweiteTage" name="Reichweite (Tage)">
            {data.map((entry: any, index: number) => (
              <Cell 
                key={`cell-${index}`}
                fill={
                  entry.reichweiteTage >= 4 && entry.reichweiteTage <= 7 
                    ? '#10b981' 
                    : entry.reichweiteTage >= 2 && entry.reichweiteTage <= 10 
                      ? '#f59e0b' 
                      : '#ef4444'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HELPER-FUNKTIONEN: EXPORT
 * ═══════════════════════════════════════════════════════════════════════════════
 */

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header]
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value)
      }
      return value
    }).join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

function downloadJSON(json: any, filename: string) {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}
