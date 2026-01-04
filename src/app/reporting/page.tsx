'use client'

/**
 * ========================================
 * REPORTING & VISUALISIERUNGEN
 * ========================================
 * 
 * Zentrale Seite für:
 * - SCOR Metriken und KPIs
 * - Interaktive Visualisierungen
 * - Performance-Dashboards
 * - Grafische Auswertungen
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Minus, BarChart3, Download, Filter, Maximize2 } from 'lucide-react'
import { formatNumber, formatPercent } from '@/lib/utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'

// Farben für Visualisierungen
const COLORS = {
  primary: '#10b981',
  secondary: '#3b82f6',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#8b5cf6',
  success: '#22c55e'
}

const VARIANTEN_FARBEN = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
]

/**
 * Reporting Hauptseite
 * Kombiniert SCOR Metriken und Visualisierungen
 */
export default function ReportingPage() {
  const [selectedView, setSelectedView] = useState<'metrics' | 'charts'>('metrics')
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  
  // SCOR-Metriken Beispieldaten
  const scorMetriken = {
    // RELIABILITY
    planerfuellungsgrad: 99.86,
    liefertreueChina: 94.5,
    
    // RESPONSIVENESS
    durchlaufzeitProduktion: 56,
    lagerumschlag: 4.2,
    
    // AGILITY
    produktionsflexibilitaet: 99.86,
    materialverfuegbarkeit: 98.3,
    
    // COSTS
    gesamtkosten: 187500000,
    herstellkosten: 185000000,
    lagerkosten: 1250000,
    beschaffungskosten: 1250000,
    
    // ASSETS
    lagerbestandswert: 12500000,
    kapitalbindung: 24.7,
    
    // PRODUKTIONS-KPIs
    gesamtproduktion: 184750,
    produktionstage: 252,
    durchschnittProTag: 733,
    auslastung: 99.86
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reporting & Visualisierungen</h1>
          <p className="text-muted-foreground mt-1">
            SCOR-Metriken, KPIs und interaktive Dashboards
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs für Metriken und Charts */}
      <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)}>
        <TabsList>
          <TabsTrigger value="metrics">SCOR Metriken</TabsTrigger>
          <TabsTrigger value="charts">Visualisierungen</TabsTrigger>
        </TabsList>

        {/* SCOR Metriken Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <SCORMetrikenView metriken={scorMetriken} />
        </TabsContent>

        {/* Visualisierungen Tab */}
        <TabsContent value="charts" className="space-y-6">
          <VisualisierungenView timeRange={timeRange} setTimeRange={setTimeRange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * SCOR Metriken Ansicht
 * Zeigt alle Performance-Kennzahlen nach SCOR-Modell
 */
function SCORMetrikenView({ metriken }: { metriken: any }) {
  return (
    <>
      {/* SCOR Übersicht */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">SCOR-Framework</CardTitle>
          <CardDescription className="text-blue-700">
            Supply Chain Operations Reference Model - Fokus auf Produktions- und Lager-KPIs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-800">
            Konzentration auf <strong>Reliability, Responsiveness, Agility, Costs und Assets</strong> innerhalb 
            der Produktion und des Lagers.
          </p>
        </CardContent>
      </Card>

      {/* RELIABILITY (Zuverlässigkeit) */}
      <Card>
        <CardHeader>
          <CardTitle>1. RELIABILITY (Zuverlässigkeit)</CardTitle>
          <CardDescription>
            Wie zuverlässig werden Pläne erfüllt?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MetricRow
              label="Planerfüllungsgrad"
              value={formatPercent(scorMetriken.planerfuellungsgrad, 2)}
              description="% der geplanten Produktion erreicht"
              status={getStatus(scorMetriken.planerfuellungsgrad, 95, 85)}
            />
            <MetricRow
              label="Liefertreue China"
              value={formatPercent(scorMetriken.liefertreueChina, 1)}
              description="% pünktliche Lieferungen vom Lieferanten"
              status={getStatus(scorMetriken.liefertreueChina, 95, 85)}
            />
          </div>
        </CardContent>
      </Card>

      {/* RESPONSIVENESS (Reaktionsfähigkeit) */}
      <Card>
        <CardHeader>
          <CardTitle>2. RESPONSIVENESS (Reaktionsfähigkeit)</CardTitle>
          <CardDescription>
            Wie schnell reagiert die Supply Chain?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MetricRow
              label="Durchlaufzeit Produktion"
              value={`${scorMetriken.durchlaufzeitProduktion} Tage`}
              description="Bestellung China → Fertige Produktion"
              status="neutral"
            />
            <MetricRow
              label="Lagerumschlag"
              value={`${formatNumber(scorMetriken.lagerumschlag, 1)}x pro Jahr`}
              description="Wie oft wird Lager umgeschlagen"
              status={getStatus(scorMetriken.lagerumschlag, 4, 2)}
            />
          </div>
        </CardContent>
      </Card>

      {/* AGILITY (Flexibilität) */}
      <Card>
        <CardHeader>
          <CardTitle>3. AGILITY (Flexibilität)</CardTitle>
          <CardDescription>
            Wie flexibel kann die Supply Chain reagieren?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MetricRow
              label="Produktionsflexibilität"
              value={formatPercent(scorMetriken.produktionsflexibilitaet, 2)}
              description="% Aufträge vollständig produziert"
              status={getStatus(scorMetriken.produktionsflexibilitaet, 95, 85)}
            />
            <MetricRow
              label="Materialverfügbarkeit"
              value={formatPercent(scorMetriken.materialverfuegbarkeit, 1)}
              description="% der Zeit genug Material vorhanden"
              status={getStatus(scorMetriken.materialverfuegbarkeit, 95, 85)}
            />
          </div>
        </CardContent>
      </Card>

      {/* COSTS (Kosten) */}
      <Card>
        <CardHeader>
          <CardTitle>4. COSTS (Kosten)</CardTitle>
          <CardDescription>
            Kosten-Übersicht der Supply Chain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kostenart</TableHead>
                <TableHead className="text-right">Betrag (EUR)</TableHead>
                <TableHead className="text-right">Anteil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Herstellkosten</TableCell>
                <TableCell className="text-right">
                  {formatNumber(scorMetriken.herstellkosten, 0)} €
                </TableCell>
                <TableCell className="text-right">
                  {formatPercent((scorMetriken.herstellkosten / scorMetriken.gesamtkosten) * 100, 1)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Beschaffungskosten</TableCell>
                <TableCell className="text-right">
                  {formatNumber(scorMetriken.beschaffungskosten, 0)} €
                </TableCell>
                <TableCell className="text-right">
                  {formatPercent((scorMetriken.beschaffungskosten / scorMetriken.gesamtkosten) * 100, 1)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Lagerkosten</TableCell>
                <TableCell className="text-right">
                  {formatNumber(scorMetriken.lagerkosten, 0)} €
                </TableCell>
                <TableCell className="text-right">
                  {formatPercent((scorMetriken.lagerkosten / scorMetriken.gesamtkosten) * 100, 1)}
                </TableCell>
              </TableRow>
              <TableRow className="font-bold bg-slate-50">
                <TableCell>GESAMT</TableCell>
                <TableCell className="text-right">
                  {formatNumber(scorMetriken.gesamtkosten, 0)} €
                </TableCell>
                <TableCell className="text-right">100,0 %</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ASSETS (Vermögenswerte) */}
      <Card>
        <CardHeader>
          <CardTitle>5. ASSETS (Vermögenswerte)</CardTitle>
          <CardDescription>
            Kapitalbindung und Lagerwerte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MetricRow
              label="Lagerbestandswert"
              value={`${formatNumber(scorMetriken.lagerbestandswert, 0)} €`}
              description="Wert der gebundenen Komponenten"
              status="neutral"
            />
            <MetricRow
              label="Kapitalbindung"
              value={`${formatNumber(scorMetriken.kapitalbindung, 1)} Tage`}
              description="Durchschnittliche Lagerdauer"
              status={getStatusInverted(scorMetriken.kapitalbindung, 30, 45)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Produktions-KPIs */}
      <Card>
        <CardHeader>
          <CardTitle>Produktions-KPIs</CardTitle>
          <CardDescription>
            Zusätzliche Kennzahlen zur Produktion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Gesamtproduktion</div>
              <div className="text-2xl font-bold mt-1">
                {formatNumber(scorMetriken.gesamtproduktion, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">MTBs</div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Produktionstage</div>
              <div className="text-2xl font-bold mt-1">
                {scorMetriken.produktionstage}
              </div>
              <div className="text-xs text-muted-foreground mt-1">von 365 Tagen</div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Durchschnitt pro Tag</div>
              <div className="text-2xl font-bold mt-1">
                {formatNumber(scorMetriken.durchschnittProTag, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Bikes/Tag</div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Auslastung</div>
              <div className="text-2xl font-bold mt-1">
                {formatPercent(scorMetriken.auslastung, 2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Kapazität genutzt</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricRow({
  label,
  value,
  description,
  status
}: {
  label: string
  value: string
  description: string
  status: 'good' | 'medium' | 'bad' | 'neutral'
}) {
  const statusConfig = {
    good: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    medium: { icon: Minus, color: 'text-orange-600', bg: 'bg-orange-50' },
    bad: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    neutral: { icon: Minus, color: 'text-slate-600', bg: 'bg-slate-50' }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${config.bg}`}>
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="text-xl font-bold">{value}</div>
        <Icon className={`h-5 w-5 ${config.color}`} />
      </div>
    </div>
  )
}

function getStatus(value: number, goodThreshold: number, mediumThreshold: number): 'good' | 'medium' | 'bad' {
  if (value >= goodThreshold) return 'good'
  if (value >= mediumThreshold) return 'medium'
  return 'bad'
}

function getStatusInverted(value: number, goodThreshold: number, mediumThreshold: number): 'good' | 'medium' | 'bad' {
  if (value <= goodThreshold) return 'good'
  if (value <= mediumThreshold) return 'medium'
  return 'bad'
}

/**
 * Visualisierungen Ansicht
 * Interaktive Charts und Diagramme zur Datenanalyse
 */
function VisualisierungenView({ 
  timeRange, 
  setTimeRange 
}: { 
  timeRange: string
  setTimeRange: (range: any) => void 
}) {
  // Produktionsdaten (monatlich)
  const produktionsDaten = [
    { monat: 'Jan', plan: 14800, ist: 14200, abweichung: -600 },
    { monat: 'Feb', plan: 22200, ist: 21800, abweichung: -400 },
    { monat: 'Mrz', plan: 37000, ist: 36500, abweichung: -500 },
    { monat: 'Apr', plan: 59200, ist: 58100, abweichung: -1100 },
    { monat: 'Mai', plan: 51800, ist: 51200, abweichung: -600 },
    { monat: 'Jun', plan: 48100, ist: 47900, abweichung: -200 },
    { monat: 'Jul', plan: 44400, ist: 44800, abweichung: 400 },
    { monat: 'Aug', plan: 33300, ist: 33100, abweichung: -200 },
    { monat: 'Sep', plan: 22200, ist: 22500, abweichung: 300 },
    { monat: 'Okt', plan: 11100, ist: 11300, abweichung: 200 },
    { monat: 'Nov', plan: 14800, ist: 14600, abweichung: -200 },
    { monat: 'Dez', plan: 11100, ist: 11000, abweichung: -100 }
  ]

  // Variantenverteilung
  const variantenDaten = [
    { name: 'MTB Allrounder', wert: 111000, prozent: 30 },
    { name: 'MTB Competition', wert: 55500, prozent: 15 },
    { name: 'MTB Downhill', wert: 37000, prozent: 10 },
    { name: 'MTB Extreme', wert: 25900, prozent: 7 },
    { name: 'MTB Freeride', wert: 18500, prozent: 5 },
    { name: 'MTB Marathon', wert: 29600, prozent: 8 },
    { name: 'MTB Performance', wert: 44400, prozent: 12 },
    { name: 'MTB Trail', wert: 48100, prozent: 13 }
  ]

  // Lagerbestandsverlauf
  const lagerDaten = Array.from({ length: 12 }, (_, i) => ({
    monat: ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][i],
    rahmen: 1200 + Math.random() * 400,
    gabeln: 2100 + Math.random() * 600,
    saettel: 3800 + Math.random() * 800
  }))

  // Wöchentliche Auslastung
  const woechentlicheDaten = Array.from({ length: 52 }, (_, i) => ({
    woche: i + 1,
    auslastung: 75 + Math.random() * 20,
    produktion: 6000 + Math.random() * 2000
  }))

  return (
    <div className="space-y-6">
      {/* Zeitbereichs-Auswahl */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Interaktive Visualisierungen</h3>
        <div className="flex items-center gap-1 bg-white border rounded-lg p-1">
          {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm rounded ${
                timeRange === range 
                  ? 'bg-green-600 text-white' 
                  : 'hover:bg-gray-100'
              }`}
            >
              {range === 'week' && 'Woche'}
              {range === 'month' && 'Monat'}
              {range === 'quarter' && 'Quartal'}
              {range === 'year' && 'Jahr'}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Produktionsverlauf */}
        <Card>
          <CardHeader>
            <CardTitle>Produktionsverlauf 2027</CardTitle>
            <CardDescription>Plan vs. Ist mit Abweichungen</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={produktionsDaten}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="monat" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar dataKey="plan" fill={COLORS.secondary} name="Plan" opacity={0.8} />
                <Bar dataKey="ist" fill={COLORS.primary} name="Ist" />
                <Line
                  type="monotone"
                  dataKey="abweichung"
                  stroke={COLORS.danger}
                  strokeWidth={2}
                  name="Abweichung"
                  dot={{ fill: COLORS.danger }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Variantenverteilung */}
        <Card>
          <CardHeader>
            <CardTitle>Produktvariantenverteilung</CardTitle>
            <CardDescription>Jahresproduktion nach Varianten</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={variantenDaten}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name.replace('MTB ', '')}: ${entry.prozent}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="wert"
                >
                  {variantenDaten.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={VARIANTEN_FARBEN[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    if (typeof value === 'number') {
                      return value.toLocaleString('de-DE') + ' Bikes'
                    }
                    return '0 Bikes'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lagerbestandsentwicklung */}
        <Card>
          <CardHeader>
            <CardTitle>Lagerbestandsentwicklung 2027</CardTitle>
            <CardDescription>Bestandsverläufe der Hauptkomponenten</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lagerDaten}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="monat" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="rahmen"
                  stroke={VARIANTEN_FARBEN[0]}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Rahmen"
                />
                <Line
                  type="monotone"
                  dataKey="gabeln"
                  stroke={VARIANTEN_FARBEN[1]}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Gabeln"
                />
                <Line
                  type="monotone"
                  dataKey="saettel"
                  stroke={VARIANTEN_FARBEN[3]}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Sättel"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Produktionsauslastung */}
        <Card>
          <CardHeader>
            <CardTitle>Produktionsauslastung 2027</CardTitle>
            <CardDescription>Wöchentliche Auslastung in %</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={woechentlicheDaten}>
                <defs>
                  <linearGradient id="colorAuslastung" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="woche" stroke="#666" />
                <YAxis stroke="#666" domain={[0, 100]} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="auslastung"
                  stroke={COLORS.primary}
                  fillOpacity={1}
                  fill="url(#colorAuslastung)"
                  name="Auslastung %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}