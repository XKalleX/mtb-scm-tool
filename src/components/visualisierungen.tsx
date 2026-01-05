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
          <OverviewDashboard timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="production" className="space-y-6">
          <ProductionDashboard timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="supply" className="space-y-6">
          <SupplyChainDashboard timeRange={timeRange} />
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
function OverviewDashboard({ timeRange }: { timeRange: string }) {
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

  // Basis-Produktionsdaten (monatlich)
  const basisProduktionsDaten = [
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

  // Wöchentliche Basis-Daten
  const basisWoechentlicheDaten = Array.from({ length: 52 }, (_, i) => {
    const basisProduktion = 7000
    const saisonaleFaktor = Math.sin((i / 52) * Math.PI * 2) * 500
    return {
      woche: i + 1,
      plan: Math.round((basisProduktion + saisonaleFaktor) * 1.05),
      ist: Math.round(basisProduktion + saisonaleFaktor),
      abweichung: Math.round((basisProduktion + saisonaleFaktor) * -0.05)
    }
  })

  // Filter/Aggregiere Produktionsdaten basierend auf timeRange
  const produktionsDaten = (() => {
    if (timeRange === 'week') {
      return basisWoechentlicheDaten.slice(-8).map(w => ({
        monat: `KW ${w.woche}`,
        plan: w.plan,
        ist: w.ist,
        abweichung: w.abweichung
      }))
    } else if (timeRange === 'quarter') {
      return [
        {
          monat: 'Q1',
          plan: basisProduktionsDaten.slice(0, 3).reduce((sum, m) => sum + m.plan, 0),
          ist: basisProduktionsDaten.slice(0, 3).reduce((sum, m) => sum + m.ist, 0),
          abweichung: basisProduktionsDaten.slice(0, 3).reduce((sum, m) => sum + m.abweichung, 0)
        },
        {
          monat: 'Q2',
          plan: basisProduktionsDaten.slice(3, 6).reduce((sum, m) => sum + m.plan, 0),
          ist: basisProduktionsDaten.slice(3, 6).reduce((sum, m) => sum + m.ist, 0),
          abweichung: basisProduktionsDaten.slice(3, 6).reduce((sum, m) => sum + m.abweichung, 0)
        },
        {
          monat: 'Q3',
          plan: basisProduktionsDaten.slice(6, 9).reduce((sum, m) => sum + m.plan, 0),
          ist: basisProduktionsDaten.slice(6, 9).reduce((sum, m) => sum + m.ist, 0),
          abweichung: basisProduktionsDaten.slice(6, 9).reduce((sum, m) => sum + m.abweichung, 0)
        },
        {
          monat: 'Q4',
          plan: basisProduktionsDaten.slice(9, 12).reduce((sum, m) => sum + m.plan, 0),
          ist: basisProduktionsDaten.slice(9, 12).reduce((sum, m) => sum + m.ist, 0),
          abweichung: basisProduktionsDaten.slice(9, 12).reduce((sum, m) => sum + m.abweichung, 0)
        }
      ]
    } else if (timeRange === 'year') {
      return [{
        monat: '2027',
        plan: basisProduktionsDaten.reduce((sum, m) => sum + m.plan, 0),
        ist: basisProduktionsDaten.reduce((sum, m) => sum + m.ist, 0),
        abweichung: basisProduktionsDaten.reduce((sum, m) => sum + m.abweichung, 0)
      }]
    }
    return basisProduktionsDaten
  })()

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
function ProductionDashboard({ timeRange }: { timeRange: string }) {
  // Wöchentliche Basis-Produktionsdaten (deterministisch)
  const basisWoechentlicheDaten = Array.from({ length: 52 }, (_, i) => {
    const basisAuslastung = 85
    const saisonaleFaktor = Math.sin((i / 52) * Math.PI * 2) * 10
    return {
      woche: i + 1,
      auslastung: basisAuslastung + saisonaleFaktor,
      produktion: 6000 + saisonaleFaktor * 100,
      ausschuss: 100 + saisonaleFaktor * 5
    }
  })

  // Schichtdaten
  const schichtDaten = [
    { schicht: '1-Schicht', wochen: 12, produktion: 72000 },
    { schicht: '2-Schicht', wochen: 28, produktion: 196000 },
    { schicht: '3-Schicht', wochen: 12, produktion: 102000 }
  ]

  // Filter wöchentliche Daten basierend auf timeRange
  const woechentlicheDaten = (() => {
    if (timeRange === 'week') {
      return basisWoechentlicheDaten.slice(-8)
    } else if (timeRange === 'quarter') {
      return [1, 2, 3, 4].map(q => {
        const startWeek = (q - 1) * 13
        const quarterData = basisWoechentlicheDaten.slice(startWeek, startWeek + 13)
        return {
          woche: `Q${q}`,
          auslastung: quarterData.reduce((sum, w) => sum + w.auslastung, 0) / quarterData.length,
          produktion: quarterData.reduce((sum, w) => sum + w.produktion, 0),
          ausschuss: quarterData.reduce((sum, w) => sum + w.ausschuss, 0)
        }
      })
    } else if (timeRange === 'year') {
      return [{
        woche: '2027',
        auslastung: basisWoechentlicheDaten.reduce((sum, w) => sum + w.auslastung, 0) / 52,
        produktion: basisWoechentlicheDaten.reduce((sum, w) => sum + w.produktion, 0),
        ausschuss: basisWoechentlicheDaten.reduce((sum, w) => sum + w.ausschuss, 0)
      }]
    }
    // Standard: Monat - aggregiere zu 12 Monaten
    return Array.from({ length: 12 }, (_, m) => {
      const startWeek = Math.floor(m * 52 / 12)
      const endWeek = Math.floor((m + 1) * 52 / 12)
      const monthData = basisWoechentlicheDaten.slice(startWeek, endWeek)
      return {
        woche: ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][m],
        auslastung: monthData.reduce((sum, w) => sum + w.auslastung, 0) / monthData.length,
        produktion: monthData.reduce((sum, w) => sum + w.produktion, 0),
        ausschuss: monthData.reduce((sum, w) => sum + w.ausschuss, 0)
      }
    })
  })()

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
function SupplyChainDashboard({ timeRange }: { timeRange: string }) {
  // Basis-Lagerbestandsverlauf (monatlich, deterministisch)
  const basisLagerDaten = Array.from({ length: 12 }, (_, i) => {
    const baseRahmen = 1200
    const baseGabeln = 2100
    const baseSaettel = 3800
    const schwankung = Math.sin(i * 0.8) * 150
    
    return {
      monat: ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][i],
      rahmen: baseRahmen + schwankung,
      gabeln: baseGabeln + schwankung * 1.5,
      saettel: baseSaettel + schwankung * 2
    }
  })

  // Lieferanten-Performance
  const lieferantenDaten = [
    { lieferant: 'China (Sättel)', liefertreue: 96, durchlaufzeit: 42, kosten: 85000 },
    { lieferant: 'Spanien (Gabeln)', liefertreue: 89, durchlaufzeit: 14, kosten: 125000 },
    { lieferant: 'Heilbronn (Rahmen)', liefertreue: 98, durchlaufzeit: 4, kosten: 95000 }
  ]

  // Filter/Aggregiere Lagerdaten basierend auf timeRange
  const lagerDaten = (() => {
    if (timeRange === 'week') {
      return basisLagerDaten.slice(-2).flatMap((monat, idx) => {
        return Array.from({ length: 4 }, (_, w) => ({
          monat: `KW ${44 + idx * 4 + w}`,
          rahmen: monat.rahmen + Math.sin((idx * 4 + w) * 0.5) * 50,
          gabeln: monat.gabeln + Math.sin((idx * 4 + w) * 0.5) * 75,
          saettel: monat.saettel + Math.sin((idx * 4 + w) * 0.5) * 100
        }))
      })
    } else if (timeRange === 'quarter') {
      return [
        {
          monat: 'Q1',
          rahmen: basisLagerDaten.slice(0, 3).reduce((sum, m) => sum + m.rahmen, 0) / 3,
          gabeln: basisLagerDaten.slice(0, 3).reduce((sum, m) => sum + m.gabeln, 0) / 3,
          saettel: basisLagerDaten.slice(0, 3).reduce((sum, m) => sum + m.saettel, 0) / 3
        },
        {
          monat: 'Q2',
          rahmen: basisLagerDaten.slice(3, 6).reduce((sum, m) => sum + m.rahmen, 0) / 3,
          gabeln: basisLagerDaten.slice(3, 6).reduce((sum, m) => sum + m.gabeln, 0) / 3,
          saettel: basisLagerDaten.slice(3, 6).reduce((sum, m) => sum + m.saettel, 0) / 3
        },
        {
          monat: 'Q3',
          rahmen: basisLagerDaten.slice(6, 9).reduce((sum, m) => sum + m.rahmen, 0) / 3,
          gabeln: basisLagerDaten.slice(6, 9).reduce((sum, m) => sum + m.gabeln, 0) / 3,
          saettel: basisLagerDaten.slice(6, 9).reduce((sum, m) => sum + m.saettel, 0) / 3
        },
        {
          monat: 'Q4',
          rahmen: basisLagerDaten.slice(9, 12).reduce((sum, m) => sum + m.rahmen, 0) / 3,
          gabeln: basisLagerDaten.slice(9, 12).reduce((sum, m) => sum + m.gabeln, 0) / 3,
          saettel: basisLagerDaten.slice(9, 12).reduce((sum, m) => sum + m.saettel, 0) / 3
        }
      ]
    } else if (timeRange === 'year') {
      return [{
        monat: '2027',
        rahmen: basisLagerDaten.reduce((sum, m) => sum + m.rahmen, 0) / 12,
        gabeln: basisLagerDaten.reduce((sum, m) => sum + m.gabeln, 0) / 12,
        saettel: basisLagerDaten.reduce((sum, m) => sum + m.saettel, 0) / 12
      }]
    }
    return basisLagerDaten
  })()

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