'use client'

/**
 * ========================================
 * INTERAKTIVE VISUALISIERUNGEN
 * ========================================
 * 
 * Power BI-ähnliche Dashboards mit:
 * - Interaktiven Charts (Recharts)
 * - Drill-Down Funktionalität
 * - Cross-Filtering
 * - KPI-Karten
 * - Zeitreihen-Analysen
 */

import { useState } from 'react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Package,
  Factory,
  Truck,
  AlertTriangle,
  Download,
  Maximize2,
  Filter
} from 'lucide-react'

const COLORS = {
  primary: '#10b981',    // green-500
  secondary: '#3b82f6',  // blue-500
  warning: '#f59e0b',    // amber-500
  danger: '#ef4444',     // red-500
  info: '#8b5cf6',       // purple-500
  success: '#22c55e'     // green-500
}

const VARIANTEN_FARBEN = [
  '#10b981', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316'  // orange
]

export default function VisualisierungsDashboard() {
  const [selectedView, setSelectedView] = useState<'overview' | 'production' | 'supply' | 'scor'>('overview')
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  
  return (
    <div className="p-6 space-y-6 bg-gray-50">
      {/* Header mit Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Supply Chain Visualisierungen</h2>
          <p className="text-sm text-gray-600 mt-1">
            Interaktive Analysen und KPI-Dashboards
          </p>
        </div>
        
        <div className="flex items-center gap-2">
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

      {/* View Tabs */}
      <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)}>
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="production">Produktion</TabsTrigger>
          <TabsTrigger value="supply">Supply Chain</TabsTrigger>
          <TabsTrigger value="scor">SCOR Metriken</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewDashboard />
        </TabsContent>

        <TabsContent value="production" className="space-y-6">
          <ProductionDashboard />
        </TabsContent>

        <TabsContent value="supply" className="space-y-6">
          <SupplyChainDashboard />
        </TabsContent>

        <TabsContent value="scor" className="space-y-6">
          <SCORDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Overview Dashboard
 */
function OverviewDashboard() {
  // KPI-Daten
  const kpis = [
    {
      titel: 'Gesamtproduktion',
      wert: '370.000',
      einheit: 'Bikes/Jahr',
      trend: '+12%',
      trendUp: true,
      icon: Factory,
      farbe: 'green'
    },
    {
      titel: 'Lagerbestand',
      wert: '24.500',
      einheit: 'Teile',
      trend: '-5%',
      trendUp: false,
      icon: Package,
      farbe: 'blue'
    },
    {
      titel: 'Liefertreue',
      wert: '94.2%',
      einheit: '',
      trend: '+2.1%',
      trendUp: true,
      icon: Truck,
      farbe: 'purple'
    },
    {
      titel: 'Kritische Teile',
      wert: '3',
      einheit: 'Engpässe',
      trend: '+1',
      trendUp: false,
      icon: AlertTriangle,
      farbe: 'red'
    }
  ]

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

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <Card key={idx}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      {kpi.titel}
                    </p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">
                        {kpi.wert}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {kpi.einheit}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 mt-2 text-sm ${
                      kpi.trendUp ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {kpi.trendUp ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="font-medium">{kpi.trend}</span>
                      <span className="text-gray-500">vs. Vormonat</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg bg-${kpi.farbe}-50`}>
                    <Icon className={`h-6 w-6 text-${kpi.farbe}-600`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Produktionsverlauf */}
        <Card>
          <CardHeader>
            <CardTitle>Produktionsverlauf 2027</CardTitle>
            <CardDescription>
              Plan vs. Ist mit Abweichungen
            </CardDescription>
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
            <CardDescription>
              Jahresproduktion nach Varianten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={variantenDaten}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => {
                    const name = entry.name?.toString() || ''
                    const prozent = entry.prozent || 0
                    return `${name.replace('MTB ', '')}: ${prozent}%`
                  }}
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
                    if (value === undefined || value === null || typeof value !== 'number') return '0 Bikes'
                    return value.toLocaleString('de-DE') + ' Bikes'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

/**
 * Production Dashboard
 */
function ProductionDashboard() {
  // Wöchentliche Produktionsdaten
  const woechentlicheDaten = Array.from({ length: 52 }, (_, i) => ({
    woche: i + 1,
    auslastung: 75 + Math.random() * 20,
    produktion: 6000 + Math.random() * 2000,
    ausschuss: Math.random() * 150
  }))

  // Schichtdaten
  const schichtDaten = [
    { schicht: '1-Schicht', wochen: 12, produktion: 72000 },
    { schicht: '2-Schicht', wochen: 28, produktion: 196000 },
    { schicht: '3-Schicht', wochen: 12, produktion: 102000 }
  ]

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Durchschn. Auslastung</p>
            <h3 className="text-3xl font-bold mt-2">87.3%</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '87.3%' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Bikes pro Stunde</p>
            <h3 className="text-3xl font-bold mt-2">112</h3>
            <p className="text-sm text-gray-500 mt-2">
              von 130 max. Kapazität
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Ausschussquote</p>
            <h3 className="text-3xl font-bold mt-2">1.8%</h3>
            <p className="text-sm text-green-600 mt-2">
              ↓ 0.3% vs. Vormonat
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Auslastung über Jahr */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Produktionsauslastung 2027</CardTitle>
                <CardDescription>Wöchentliche Auslastung in %</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
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

        {/* Schichtverteilung */}
        <Card>
          <CardHeader>
            <CardTitle>Schichtverteilung</CardTitle>
            <CardDescription>Produktionswochen nach Schichtmodell</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={schichtDaten} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#666" />
                <YAxis dataKey="schicht" type="category" stroke="#666" />
                <Tooltip />
                <Bar dataKey="wochen" fill={COLORS.secondary} name="Wochen" />
                <Bar dataKey="produktion" fill={COLORS.primary} name="Produktion" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

/**
 * Supply Chain Dashboard
 */
function SupplyChainDashboard() {
  // Lagerbestandsverlauf
  const lagerDaten = Array.from({ length: 12 }, (_, i) => ({
    monat: ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][i],
    rahmen: 1200 + Math.random() * 400,
    gabeln: 2100 + Math.random() * 600,
    saettel: 3800 + Math.random() * 800
  }))

  // Lieferanten-Performance
  const lieferantenDaten = [
    { lieferant: 'China (Sättel)', liefertreue: 96, durchlaufzeit: 42, kosten: 85000 },
    { lieferant: 'Spanien (Gabeln)', liefertreue: 89, durchlaufzeit: 14, kosten: 125000 },
    { lieferant: 'Heilbronn (Rahmen)', liefertreue: 98, durchlaufzeit: 4, kosten: 95000 }
  ]

  return (
    <>
      {/* Lagerbestand Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Lagerbestandsentwicklung 2027</CardTitle>
          <CardDescription>
            Bestandsverläufe der Hauptkomponenten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
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

      {/* Lieferanten-Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Lieferanten-Performance</CardTitle>
          <CardDescription>
            Liefertreue, Durchlaufzeit und Kosten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lieferantenDaten.map((lieferant, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{lieferant.lieferant}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    lieferant.liefertreue >= 95 ? 'bg-green-100 text-green-800' :
                    lieferant.liefertreue >= 85 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {lieferant.liefertreue >= 95 ? 'Exzellent' :
                     lieferant.liefertreue >= 85 ? 'Gut' : 'Verbesserungsbedarf'}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Liefertreue</p>
                    <p className="text-xl font-bold mt-1">{lieferant.liefertreue}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-green-600 h-1.5 rounded-full"
                        style={{ width: `${lieferant.liefertreue}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Durchlaufzeit</p>
                    <p className="text-xl font-bold mt-1">{lieferant.durchlaufzeit} Tage</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Jahresvolumen</p>
                    <p className="text-xl font-bold mt-1">€{(lieferant.kosten / 1000).toFixed(0)}k</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

/**
 * SCOR Metriken Dashboard
 */
function SCORDashboard() {
  const scorMetriken = [
    {
      kategorie: 'Reliability (Zuverlässigkeit)',
      farbe: COLORS.primary,
      metriken: [
        { name: 'Perfect Order Fulfillment', wert: 94.2, ziel: 95, einheit: '%' },
        { name: 'Order Accuracy', wert: 98.1, ziel: 98, einheit: '%' }
      ]
    },
    {
      kategorie: 'Responsiveness (Reaktionsfähigkeit)',
      farbe: COLORS.secondary,
      metriken: [
        { name: 'Order Cycle Time', wert: 42, ziel: 45, einheit: 'Tage' },
        { name: 'Production Cycle Time', wert: 5.2, ziel: 6, einheit: 'Std' }
      ]
    },
    {
      kategorie: 'Agility (Flexibilität)',
      farbe: COLORS.info,
      metriken: [
        { name: 'Supply Chain Flexibility', wert: 87, ziel: 85, einheit: '%' },
        { name: 'Upside Adaptability', wert: 21, ziel: 20, einheit: 'Tage' }
      ]
    },
    {
      kategorie: 'Cost (Kosten)',
      farbe: COLORS.warning,
      metriken: [
        { name: 'Total SC Cost', wert: 12.5, ziel: 13, einheit: '% Umsatz' },
        { name: 'Cost of Goods Sold', wert: 67, ziel: 70, einheit: '% Umsatz' }
      ]
    },
    {
      kategorie: 'Assets (Vermögenswerte)',
      farbe: COLORS.danger,
      metriken: [
        { name: 'Cash-to-Cash Cycle', wert: 56, ziel: 60, einheit: 'Tage' },
        { name: 'Inventory Days of Supply', wert: 42, ziel: 45, einheit: 'Tage' }
      ]
    }
  ]

  return (
    <div className="space-y-6">
      {scorMetriken.map((kategorie, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-3">
            <CardTitle style={{ color: kategorie.farbe }}>
              {kategorie.kategorie}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {kategorie.metriken.map((metrik, midx) => {
                const erreichung = (metrik.wert / metrik.ziel) * 100
                const status = erreichung >= 100 ? 'success' :
                              erreichung >= 90 ? 'warning' : 'danger'
                
                return (
                  <div key={midx} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{metrik.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        status === 'success' ? 'bg-green-100 text-green-800' :
                        status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {status === 'success' ? '✓ Ziel erreicht' :
                         status === 'warning' ? '⚠ Nahe Ziel' :
                         '✗ Unter Ziel'}
                      </span>
                    </div>
                    
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold">{metrik.wert}</span>
                      <span className="text-gray-500">
                        / {metrik.ziel} {metrik.einheit}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Zielerreichung</span>
                        <span>{erreichung.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            status === 'success' ? 'bg-green-600' :
                            status === 'warning' ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}
                          style={{ width: `${Math.min(erreichung, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}