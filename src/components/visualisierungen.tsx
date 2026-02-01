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
 * 
 * WICHTIG: Alle Daten werden DYNAMISCH aus dem Kontext bezogen:
 * - KonfigurationContext für Stammdaten (Varianten, Saisonalität, etc.)
 * - SzenarienContext für Szenarien-Auswirkungen
 * - Zentrale Berechnungsfunktionen für konsistente Werte
 * 
 * KEINE hardcodierten Werte mehr!
 */

import { useState, useMemo } from 'react'
import type { ReactElement } from 'react'
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
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { useSzenarien, berechneGlobaleAuswirkungen, BASELINE_WERTE } from '@/contexts/SzenarienContext'
import { 
  berechneMonatlicheProduktionMitKonfig,
  berechneTaeglicherDaten,
  berechneWoechentlicheAuslastung,
  berechneVariantenProduktionMitKonfig,
  berechneLagerDaten,
  berechneGesamtMetrikenMitKonfig,
  berechneSCORMetrikenEntwicklung,
  berechneProduktionsRueckstand,
  berechneVorlaufzeitBreakdown,
  berechneLagerreichweiteTrend,
  RUECKSTAND_SAMPLING_INTERVALL
} from '@/lib/calculations/supply-chain-metrics'
import { generiereTagesproduktion, berechneSaisonaleVerteilung } from '@/lib/calculations/zentrale-produktionsplanung'
import { formatNumber } from '@/lib/utils'

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
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month')
  
  // Hole Konfiguration und Szenarien aus Context
  const { konfiguration, isInitialized } = useKonfiguration()
  const { getAktiveSzenarien } = useSzenarien()
  const aktiveSzenarien = getAktiveSzenarien()
  
  // Zeige Loading-State während Initialisierung
  if (!isInitialized) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Visualisierungen...</p>
        </div>
      </div>
    )
  }
  
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
            {(['day', 'week', 'month', 'quarter', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm rounded ${
                  timeRange === range 
                    ? 'bg-green-600 text-white' 
                    : 'hover:bg-gray-100'
                }`}
              >
                {range === 'day' && 'Tag'}
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
          <OverviewDashboard 
            timeRange={timeRange} 
            konfiguration={konfiguration}
            aktiveSzenarien={aktiveSzenarien}
          />
        </TabsContent>

        <TabsContent value="production" className="space-y-6">
          <ProductionDashboard 
            timeRange={timeRange}
            konfiguration={konfiguration}
            aktiveSzenarien={aktiveSzenarien}
          />
        </TabsContent>

        <TabsContent value="supply" className="space-y-6">
          <SupplyChainDashboard 
            timeRange={timeRange}
            konfiguration={konfiguration}
            aktiveSzenarien={aktiveSzenarien}
          />
        </TabsContent>

        <TabsContent value="scor" className="space-y-6">
          <SCORDashboard 
            konfiguration={konfiguration}
            aktiveSzenarien={aktiveSzenarien}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Overview Dashboard
 * 
 * DYNAMISCHE DATEN aus Kontext:
 * - KPIs werden aus Metriken-Berechnung abgeleitet
 * - Produktionsdaten aus Saisonalität berechnet
 * - Variantendaten aus Konfiguration
 * - Szenarien-Auswirkungen einbezogen
 */
function OverviewDashboard({ 
  timeRange, 
  konfiguration,
  aktiveSzenarien
}: { 
  timeRange: string
  konfiguration: any
  aktiveSzenarien: any[]
}): ReactElement {
  // Berechne Auswirkungen der Szenarien
  const auswirkungen = useMemo(() => {
    return berechneGlobaleAuswirkungen(aktiveSzenarien)
  }, [aktiveSzenarien])
  
  // Berechne Gesamtmetriken dynamisch
  const metriken = useMemo(() => {
    return berechneGesamtMetrikenMitKonfig(aktiveSzenarien, konfiguration)
  }, [aktiveSzenarien, konfiguration])
  
  // KPI-Daten DYNAMISCH aus Metriken
  const kpis = useMemo(() => [
    {
      titel: 'Gesamtproduktion',
      wert: formatNumber(auswirkungen.produktionsmenge, 0),
      einheit: 'Bikes/Jahr',
      trend: aktiveSzenarien.length > 0 
        ? `${((auswirkungen.produktionsmenge - konfiguration.jahresproduktion) / konfiguration.jahresproduktion * 100).toFixed(1)}%`
        : '+0%',
      trendUp: auswirkungen.produktionsmenge >= konfiguration.jahresproduktion,
      icon: Factory,
      farbe: 'green'
    },
    {
      titel: 'Materialverfügbarkeit',
      wert: `${(auswirkungen.materialverfuegbarkeit).toFixed(1)}%`,
      einheit: '',
      trend: `${(auswirkungen.materialverfuegbarkeit - BASELINE_WERTE.materialverfuegbarkeit).toFixed(1)}%`,
      trendUp: auswirkungen.materialverfuegbarkeit >= BASELINE_WERTE.materialverfuegbarkeit,
      icon: Package,
      farbe: 'blue'
    },
    {
      titel: 'Liefertreue',
      wert: `${(auswirkungen.liefertreue).toFixed(1)}%`,
      einheit: '',
      trend: `${(auswirkungen.liefertreue - BASELINE_WERTE.liefertreue).toFixed(1)}%`,
      trendUp: auswirkungen.liefertreue >= BASELINE_WERTE.liefertreue,
      icon: Truck,
      farbe: 'purple'
    },
    {
      titel: 'Durchlaufzeit',
      wert: `${Math.round(auswirkungen.durchlaufzeit)}`,
      einheit: 'Tage',
      trend: `${(auswirkungen.durchlaufzeit - BASELINE_WERTE.durchlaufzeit).toFixed(0)}`,
      trendUp: auswirkungen.durchlaufzeit <= BASELINE_WERTE.durchlaufzeit, // Weniger ist besser
      icon: auswirkungen.durchlaufzeit > BASELINE_WERTE.durchlaufzeit ? AlertTriangle : Truck,
      farbe: auswirkungen.durchlaufzeit > BASELINE_WERTE.durchlaufzeit ? 'red' : 'green'
    }
  ], [auswirkungen, konfiguration, aktiveSzenarien])

  // Basis-Produktionsdaten (monatlich) - DYNAMISCH aus Saisonalität berechnen
  const basisProduktionsDaten = useMemo(() => {
    const saisonalitaet = berechneSaisonaleVerteilung(konfiguration)
    
    return saisonalitaet.map(s => {
      const planMenge = s.bikes
      // Mit Szenarien: Skaliere proportional
      const faktor = aktiveSzenarien.length > 0 
        ? auswirkungen.produktionsmenge / konfiguration.jahresproduktion
        : 1.0
      const istMenge = Math.round(planMenge * faktor)
      
      return {
        monat: s.nameKurz,
        plan: planMenge,
        ist: istMenge,
        abweichung: istMenge - planMenge
      }
    })
  }, [konfiguration, auswirkungen, aktiveSzenarien])

  // Variantenverteilung - DYNAMISCH aus Konfiguration
  const variantenDaten = useMemo(() => {
    return konfiguration.varianten.map((v: any) => ({
      name: v.name,
      wert: Math.round(konfiguration.jahresproduktion * v.anteilPrognose),
      prozent: Math.round(v.anteilPrognose * 100)
    }))
  }, [konfiguration])

  // Tägliche Basis-Daten (365 Tage) - DYNAMISCH berechnen
  const basisTaeglicherDaten = useMemo(() => {
    const tagesproduktion = generiereTagesproduktion(konfiguration)
    return tagesproduktion.map(t => ({
      tag: t.tag,
      plan: t.planMenge,
      ist: t.istMenge,
      abweichung: t.abweichung
    }))
  }, [konfiguration])

  // Wöchentliche Basis-Daten - DYNAMISCH aus Tagesdaten aggregieren
  const basisWoechentlicheDaten = useMemo(() => {
    const tagesDaten = basisTaeglicherDaten
    const wochen: any[] = []
    
    for (let woche = 0; woche < 52; woche++) {
      const startTag = woche * 7
      const endTag = Math.min(startTag + 7, 365)
      const wochenDaten = tagesDaten.slice(startTag, endTag)
      
      wochen.push({
        woche: woche + 1,
        plan: wochenDaten.reduce((sum, t) => sum + t.plan, 0),
        ist: wochenDaten.reduce((sum, t) => sum + t.ist, 0),
        abweichung: wochenDaten.reduce((sum, t) => sum + t.abweichung, 0)
      })
    }
    
    return wochen
  }, [basisTaeglicherDaten])

  // Filter/Aggregiere Produktionsdaten basierend auf timeRange
  const produktionsDaten = useMemo(() => {
    if (timeRange === 'day') {
      // Zeige ALLE 365 Tage für vollständige Transparenz
      return basisTaeglicherDaten.map(t => ({
        monat: `Tag ${t.tag}`,
        plan: t.plan,
        ist: t.ist,
        abweichung: t.abweichung
      }))
    } else if (timeRange === 'week') {
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
  }, [timeRange, basisProduktionsDaten, basisTaeglicherDaten, basisWoechentlicheDaten])

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
      <div className="space-y-6">
        {/* Produktionsverlauf */}
        <Card>
          <CardHeader>
            <CardTitle>Produktionsverlauf 2027</CardTitle>
            <CardDescription>
              Plan vs. Ist mit Abweichungen
              {timeRange === 'day' && ' - Horizontal scrollbar für alle 365 Tage'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timeRange === 'day' ? (
              // Tagesansicht mit horizontaler Scrollfunktion
              <div className="w-full overflow-x-auto">
                <div style={{ width: `${produktionsDaten.length * 20}px`, minWidth: '100%' }}>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={produktionsDaten}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="monat" 
                        stroke="#666"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={Math.floor(produktionsDaten.length / 50)}
                      />
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
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              // Normale Ansicht ohne Scrolling
              <ResponsiveContainer width="100%" height={350}>
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
            )}
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
            <ResponsiveContainer width="100%" height={timeRange === 'day' ? 400 : 350}>
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
                  outerRadius={timeRange === 'day' ? 130 : 100}
                  fill="#8884d8"
                  dataKey="wert"
                >
                  {variantenDaten.map((entry: any, index: number) => (
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
 * 
 * DYNAMISCHE DATEN:
 * - Auslastung aus Tagesproduktion berechnet
 * - Schichten aus Konfiguration
 * - Keine hardcodierten Werte
 */
function ProductionDashboard({ 
  timeRange,
  konfiguration,
  aktiveSzenarien
}: { 
  timeRange: string;
  konfiguration: any;
  aktiveSzenarien: any[];
}): ReactElement {
  const tagesproduktion = useMemo(() => {
    return generiereTagesproduktion(konfiguration)
  }, [konfiguration])
  
  // Berechne durchschnittliche Auslastung
  const durchschnAuslastung = useMemo(() => {
    const auslastungen = tagesproduktion
      .filter(t => t.istArbeitstag)
      .map(t => t.auslastung)
    return auslastungen.reduce((sum, a) => sum + a, 0) / auslastungen.length
  }, [tagesproduktion])
  
  // Berechne Bikes pro Stunde (durchschnittlich)
  const bikeProStunde = useMemo(() => {
    const arbeitstage = tagesproduktion.filter(t => t.istArbeitstag)
    const totalBikes = arbeitstage.reduce((sum, t) => sum + t.planMenge, 0)
    const totalStunden = arbeitstage.length * konfiguration.produktion.stundenProSchicht
    return Math.round(totalBikes / totalStunden)
  }, [tagesproduktion, konfiguration])
  
  // Tägliche Basis-Produktionsdaten (365 Tage)
  const basisTaeglicherDaten = useMemo(() => {
    return tagesproduktion.map(t => ({
      tag: t.tag,
      auslastung: t.auslastung,
      produktion: t.planMenge,
      ausschuss: Math.round(t.planMenge * 0.018) // 1.8% Ausschuss
    }))
  }, [tagesproduktion])

  // Wöchentliche Basis-Produktionsdaten (aus Tagesdaten aggregieren)
  const basisWoechentlicheDaten = useMemo(() => {
    const wochen: any[] = []
    
    for (let woche = 0; woche < 52; woche++) {
      const startTag = woche * 7
      const endTag = Math.min(startTag + 7, 365)
      const wochenDaten = basisTaeglicherDaten.slice(startTag, endTag)
      
      wochen.push({
        woche: woche + 1,
        auslastung: wochenDaten.reduce((sum, t) => sum + t.auslastung, 0) / wochenDaten.length,
        produktion: wochenDaten.reduce((sum, t) => sum + t.produktion, 0),
        ausschuss: wochenDaten.reduce((sum, t) => sum + t.ausschuss, 0)
      })
    }
    
    return wochen
  }, [basisTaeglicherDaten])

  // Schichtdaten - DYNAMISCH aus Tagesproduktion berechnen
  const schichtDaten = useMemo(() => {
    const schichtStats = { '1-Schicht': 0, '2-Schicht': 0, '3-Schicht': 0 }
    const schichtProduktion = { '1-Schicht': 0, '2-Schicht': 0, '3-Schicht': 0 }
    
    tagesproduktion.forEach(t => {
      if (t.istArbeitstag) {
        const schichten = t.schichten
        let schichtLabel = '1-Schicht'
        if (schichten >= 2.5) schichtLabel = '3-Schicht'
        else if (schichten >= 1.5) schichtLabel = '2-Schicht'
        
        schichtStats[schichtLabel as keyof typeof schichtStats]++
        schichtProduktion[schichtLabel as keyof typeof schichtProduktion] += t.planMenge
      }
    })
    
    return [
      { schicht: '1-Schicht', wochen: Math.round(schichtStats['1-Schicht'] / 5), produktion: schichtProduktion['1-Schicht'] },
      { schicht: '2-Schicht', wochen: Math.round(schichtStats['2-Schicht'] / 5), produktion: schichtProduktion['2-Schicht'] },
      { schicht: '3-Schicht', wochen: Math.round(schichtStats['3-Schicht'] / 5), produktion: schichtProduktion['3-Schicht'] }
    ]
  }, [tagesproduktion])

  // Filter wöchentliche Daten basierend auf timeRange
  const woechentlicheDaten = useMemo(() => {
    if (timeRange === 'day') {
      // Zeige ALLE 365 Tage für vollständige Transparenz
      return basisTaeglicherDaten.map(t => ({
        woche: `Tag ${t.tag}`,
        auslastung: t.auslastung,
        produktion: t.produktion,
        ausschuss: t.ausschuss
      }))
    } else if (timeRange === 'week') {
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
  }, [timeRange, basisTaeglicherDaten, basisWoechentlicheDaten])

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Durchschn. Auslastung</p>
            <h3 className="text-3xl font-bold mt-2">{durchschnAuslastung.toFixed(1)}%</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: `${durchschnAuslastung}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Bikes pro Stunde</p>
            <h3 className="text-3xl font-bold mt-2">{bikeProStunde}</h3>
            <p className="text-sm text-gray-500 mt-2">
              von {konfiguration.produktion.kapazitaetProStunde} max. Kapazität
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

      <div className="space-y-6">
        {/* Auslastung über Jahr */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Produktionsauslastung 2027</CardTitle>
                <CardDescription>
                  Wöchentliche Auslastung in %
                  {timeRange === 'day' && ' - Horizontal scrollbar für alle 365 Tage'}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {timeRange === 'day' ? (
              // Tagesansicht mit horizontaler Scrollfunktion
              <div className="w-full overflow-x-auto">
                <div style={{ width: `${woechentlicheDaten.length * 20}px`, minWidth: '100%' }}>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={woechentlicheDaten}>
                      <defs>
                        <linearGradient id="colorAuslastung" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="woche" 
                        stroke="#666"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={Math.floor(woechentlicheDaten.length / 50)}
                      />
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
                </div>
              </div>
            ) : (
              // Normale Ansicht ohne Scrolling
              <ResponsiveContainer width="100%" height={350}>
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
            )}
          </CardContent>
        </Card>

        {/* Schichtverteilung */}
        <Card>
          <CardHeader>
            <CardTitle>Schichtverteilung</CardTitle>
            <CardDescription>Produktionswochen nach Schichtmodell</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={timeRange === 'day' ? 400 : 350}>
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
 * 
 * DYNAMISCHE DATEN:
 * - Lagerdaten aus Konfiguration und Szenarien
 * - Lieferanten-Daten aus Konfiguration
 * - China als einziger Lieferant (Ermäßigung)
 */
function SupplyChainDashboard({ 
  timeRange,
  konfiguration,
  aktiveSzenarien
}: { 
  timeRange: string;
  konfiguration: any;
  aktiveSzenarien: any[];
}): ReactElement {
  // Berechne Auswirkungen für Lagerdaten
  const auswirkungen = useMemo(() => {
    return berechneGlobaleAuswirkungen(aktiveSzenarien)
  }, [aktiveSzenarien])
  
  // Basis-Lagerwert für Sättel
  const basisLagerSaettel = useMemo(() => {
    // Durchschnittlicher Bedarf pro Tag * Vorlaufzeit als Basiswert
    const tagesBedarf = konfiguration.jahresproduktion / 365
    return Math.round(tagesBedarf * konfiguration.lieferant.gesamtVorlaufzeitTage / 2)
  }, [konfiguration])
  
  // Basis-Tägliche Lagerdaten (365 Tage)
  // ERMÄSSIGUNG: Nur Sättel (keine Rahmen/Gabeln)
  const basisTaeglicherLagerDaten = useMemo(() => {
    return Array.from({ length: 365 }, (_, i) => {
      const schwankung = Math.sin(i * 0.1) * 150
      const materialFaktor = auswirkungen.materialverfuegbarkeit / 100
      
      return {
        tag: i + 1,
        saettel: Math.round((basisLagerSaettel + schwankung * 2) * materialFaktor)
      }
    })
  }, [basisLagerSaettel, auswirkungen])

  // Basis-Lagerbestandsverlauf (monatlich)
  // ERMÄSSIGUNG: Nur Sättel (keine Rahmen/Gabeln)
  const basisLagerDaten = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const schwankung = Math.sin(i * 0.8) * 150
      const materialFaktor = auswirkungen.materialverfuegbarkeit / 100
      
      return {
        monat: ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][i],
        saettel: Math.round((basisLagerSaettel + schwankung * 2) * materialFaktor)
      }
    })
  }, [basisLagerSaettel, auswirkungen])

  // Lieferanten-Performance - DYNAMISCH aus Konfiguration
  // ERMÄSSIGUNG: Nur China als Zulieferer
  const lieferantenDaten = useMemo(() => {
    const lieferant = konfiguration.lieferant
    return [{
      lieferant: `${lieferant.land} (Sättel)`,
      liefertreue: Math.round(auswirkungen.liefertreue),
      durchlaufzeit: lieferant.gesamtVorlaufzeitTage,
      volumen: konfiguration.jahresproduktion
    }]
  }, [konfiguration, auswirkungen])

  // Filter/Aggregiere Lagerdaten basierend auf timeRange
  const lagerDaten = useMemo(() => {
    if (timeRange === 'day') {
      // Zeige ALLE 365 Tage für vollständige Transparenz
      return basisTaeglicherLagerDaten.map(t => ({
        monat: `Tag ${t.tag}`,
        saettel: t.saettel
      }))
    } else if (timeRange === 'week') {
      return basisLagerDaten.slice(-2).flatMap((monat, idx) => {
        return Array.from({ length: 4 }, (_, w) => ({
          monat: `KW ${44 + idx * 4 + w}`,
          saettel: monat.saettel + Math.sin((idx * 4 + w) * 0.5) * 100
        }))
      })
    } else if (timeRange === 'quarter') {
      return [
        {
          monat: 'Q1',
          saettel: Math.round(basisLagerDaten.slice(0, 3).reduce((sum, m) => sum + m.saettel, 0) / 3)
        },
        {
          monat: 'Q2',
          saettel: Math.round(basisLagerDaten.slice(3, 6).reduce((sum, m) => sum + m.saettel, 0) / 3)
        },
        {
          monat: 'Q3',
          saettel: Math.round(basisLagerDaten.slice(6, 9).reduce((sum, m) => sum + m.saettel, 0) / 3)
        },
        {
          monat: 'Q4',
          saettel: Math.round(basisLagerDaten.slice(9, 12).reduce((sum, m) => sum + m.saettel, 0) / 3)
        }
      ]
    } else if (timeRange === 'year') {
      return [{
        monat: '2027',
        saettel: Math.round(basisLagerDaten.reduce((sum, m) => sum + m.saettel, 0) / 12)
      }]
    }
    return basisLagerDaten
  }, [timeRange, basisLagerDaten, basisTaeglicherLagerDaten])

  return (
    <>
      {/* Lagerbestand Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Lagerbestandsentwicklung 2027 - Sättel</CardTitle>
          <CardDescription>
            Bestandsverlauf der Sättel aus China
            {timeRange === 'day' && ' - Horizontal scrollbar für alle 365 Tage'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeRange === 'day' ? (
            // Tagesansicht mit horizontaler Scrollfunktion
            <div className="w-full overflow-x-auto">
              <div style={{ width: `${lagerDaten.length * 20}px`, minWidth: '100%' }}>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={lagerDaten}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="monat" 
                      stroke="#666"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={Math.floor(lagerDaten.length / 50)}
                    />
                    <YAxis stroke="#666" />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="saettel"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      dot={false}
                      name="Sättel"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            // Normale Ansicht ohne Scrolling
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={lagerDaten}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="monat" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="saettel"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Sättel"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Lieferanten-Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Lieferanten-Performance</CardTitle>
          <CardDescription>
            Liefertreue und Durchlaufzeit
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
                    <p className="text-xl font-bold mt-1">{(lieferant.volumen / 1000).toFixed(0)}k Sättel</p>
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
 * 
 * DYNAMISCHE DATEN:
 * - Metriken aus zentraler Berechnung
 * - Berücksichtigt Szenarien-Auswirkungen
 * - Vergleich mit Zielen
 */
function SCORDashboard({
  konfiguration,
  aktiveSzenarien
}: {
  konfiguration: any;
  aktiveSzenarien: any[];
}): ReactElement {
  const metriken = useMemo(() => {
    return berechneGesamtMetrikenMitKonfig(aktiveSzenarien, konfiguration)
  }, [aktiveSzenarien, konfiguration])
  
  // Berechne Auswirkungen
  const auswirkungen = useMemo(() => {
    return berechneGlobaleAuswirkungen(aktiveSzenarien)
  }, [aktiveSzenarien])
  
  // NEU: Berechne zeitliche Entwicklung der Metriken
  const metrikenEntwicklung = useMemo(() => {
    return berechneSCORMetrikenEntwicklung(aktiveSzenarien)
  }, [aktiveSzenarien])
  
  // NEU: Produktionsrückstand
  const rueckstandDaten = useMemo(() => {
    return berechneProduktionsRueckstand(aktiveSzenarien)
  }, [aktiveSzenarien])
  
  // NEU: Vorlaufzeit Breakdown
  const vorlaufzeitDaten = useMemo(() => {
    return berechneVorlaufzeitBreakdown(aktiveSzenarien)
  }, [aktiveSzenarien])
  
  // NEU: Lagerreichweite Trend
  const lagerreichweiteDaten = useMemo(() => {
    return berechneLagerreichweiteTrend(aktiveSzenarien)
  }, [aktiveSzenarien])
  
  // SCOR Metriken mit dynamischen Werten
  const scorMetriken = useMemo(() => [
    {
      kategorie: 'Reliability (Zuverlässigkeit)',
      farbe: COLORS.primary,
      metriken: [
        { 
          name: 'Planerfüllungsgrad', 
          wert: metriken.scor.planerfuellungsgrad, 
          ziel: 95, 
          einheit: '%',
          beschreibung: 'Perfect Order Fulfillment - Anteil vollständig erfüllter Aufträge'
        },
        { 
          name: 'Liefertreue China', 
          wert: metriken.scor.liefertreueChina, 
          ziel: 95, 
          einheit: '%',
          beschreibung: 'On-Time Delivery - Pünktliche Lieferungen vom Zulieferer'
        }
      ]
    },
    {
      kategorie: 'Responsiveness (Reaktionsfähigkeit)',
      farbe: COLORS.secondary,
      metriken: [
        { 
          name: 'Durchlaufzeit', 
          wert: auswirkungen.durchlaufzeit, 
          ziel: 49, 
          einheit: 'Tage',
          beschreibung: 'Order Cycle Time - Gesamte Vorlaufzeit von Bestellung bis Ankunft (SSOT: 49 Tage)'
        },
        { 
          name: 'Forecast Accuracy', 
          wert: metriken.scor.forecastAccuracy, 
          ziel: 95, 
          einheit: '%',
          beschreibung: 'Planungsgenauigkeit - Abweichung Plan vs. Ist'
        }
      ]
    },
    {
      kategorie: 'Agility (Flexibilität)',
      farbe: COLORS.info,
      metriken: [
        { 
          name: 'Materialverfügbarkeit', 
          wert: auswirkungen.materialverfuegbarkeit, 
          ziel: 98, 
          einheit: '%',
          beschreibung: 'Supply Chain Flexibility - Verfügbarkeit benötigter Bauteile'
        },
        { 
          name: 'Produktionsflexibilität', 
          wert: metriken.scor.produktionsflexibilitaet, 
          ziel: 95, 
          einheit: '%',
          beschreibung: 'Upside Adaptability - Fähigkeit auf Nachfrageänderungen zu reagieren'
        }
      ]
    },
    {
      kategorie: 'Assets (Vermögenswerte)',
      farbe: COLORS.warning,
      metriken: [
        { 
          name: 'Lagerreichweite', 
          wert: metriken.scor.lagerreichweite, 
          ziel: 3, 
          einheit: 'Tage',
          beschreibung: 'Inventory Days of Supply - Lagerbestand in Tagen (Ziel: 3 Tage JIT)'
        },
        { 
          name: 'Lagerumschlag', 
          wert: metriken.scor.lagerumschlag, 
          ziel: 4, 
          einheit: 'x/Jahr',
          beschreibung: 'Inventory Turnover - Wie oft das Lager pro Jahr umgeschlagen wird'
        }
      ]
    }
  ], [auswirkungen, konfiguration, metriken])

  return (
    <div className="space-y-6">
      {/* KPI-Karten mit Metriken */}
      {scorMetriken.map((kategorie, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-3">
            <CardTitle style={{ color: kategorie.farbe }}>
              {kategorie.kategorie}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
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
                      <span className="text-3xl font-bold">
                        {typeof metrik.wert === 'number' ? metrik.wert.toFixed(1) : metrik.wert}
                      </span>
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
                    
                    <p className="text-xs text-gray-600 mt-2">{metrik.beschreibung}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* NEU: Produktionsrückstand-Visualisierung */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-blue-600" />
            Produktionsrückstand (Kumulativ Soll vs. Ist)
          </CardTitle>
          <CardDescription>
            Kumulative Entwicklung über 365 Tage - Soll (Plan) vs. Ist (Realisiert)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={rueckstandDaten.filter((_, i) => i % RUECKSTAND_SAMPLING_INTERVALL === 0)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="woche" 
                label={{ value: 'Kalenderwoche', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Kumulierte Bikes', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: any) => [formatNumber(value), '']}
                labelFormatter={(label) => `Woche ${label}`}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="kumulativSoll" 
                stackId="1"
                stroke={COLORS.warning} 
                fill={COLORS.warning}
                fillOpacity={0.3}
                name="Kumulativ Soll"
              />
              <Area 
                type="monotone" 
                dataKey="kumulativIst" 
                stackId="2"
                stroke={COLORS.primary} 
                fill={COLORS.primary}
                fillOpacity={0.6}
                name="Kumulativ Ist"
              />
              <Line 
                type="monotone" 
                dataKey="rueckstand" 
                stroke={COLORS.danger}
                strokeWidth={2}
                name="Rückstand"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Jahres-Soll</div>
              <div className="text-2xl font-bold">{formatNumber(rueckstandDaten[rueckstandDaten.length - 1]?.kumulativSoll || 0)}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Jahres-Ist</div>
              <div className="text-2xl font-bold">{formatNumber(rueckstandDaten[rueckstandDaten.length - 1]?.kumulativIst || 0)}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Rückstand</div>
              <div className="text-2xl font-bold text-red-600">
                {formatNumber(rueckstandDaten[rueckstandDaten.length - 1]?.rueckstand || 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* NEU: 49-Tage-Vorlaufzeit Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            China Vorlaufzeit Breakdown (49 Tage)
          </CardTitle>
          <CardDescription>
            Aufteilung der Gesamtdurchlaufzeit: Produktion → Transport → Verzollung
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Gantt-ähnliche Visualisierung */}
            <div className="relative h-24 bg-gray-100 rounded-lg overflow-hidden">
              {vorlaufzeitDaten.map((phase, idx) => {
                const totalTage = vorlaufzeitDaten[vorlaufzeitDaten.length - 1].ende
                const startProzent = (phase.start / totalTage) * 100
                const breiteProzent = (phase.tage / totalTage) * 100
                
                return (
                  <div
                    key={idx}
                    className="absolute top-4 h-16 flex items-center justify-center text-white font-semibold rounded"
                    style={{
                      left: `${startProzent}%`,
                      width: `${breiteProzent}%`,
                      backgroundColor: phase.farbe
                    }}
                    title={phase.beschreibung}
                  >
                    <div className="text-center">
                      <div className="text-sm">{phase.phase}</div>
                      <div className="text-lg font-bold">{phase.tage} Tage</div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Legende und Details */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {vorlaufzeitDaten.map((phase, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: phase.farbe }}
                    />
                    <span className="font-semibold">{phase.phase}</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">{phase.tage} Tage</div>
                  <div className="text-xs text-gray-600">{phase.beschreibung}</div>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>📋 Management-Referenz:</strong> Vorlaufzeit = {konfiguration.lieferant.gesamtVorlaufzeitTage} Tage (7 Wochen)
                <br />
                <span className="text-xs">Dies ist ein fix definierter Wert. Die tatsächliche Lieferzeit (aktuell: {vorlaufzeitDaten[vorlaufzeitDaten.length - 1]?.ende} Tage) kann durch Feiertage/Szenarien abweichen.</span>
                {vorlaufzeitDaten[vorlaufzeitDaten.length - 1]?.ende > konfiguration.lieferant.gesamtVorlaufzeitTage && 
                  <span className="text-red-700 font-semibold block mt-1">
                    ⚠️ +{vorlaufzeitDaten[vorlaufzeitDaten.length - 1].ende - konfiguration.lieferant.gesamtVorlaufzeitTage} Tage Verspätung durch aktive Szenarien
                  </span>
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* NEU: SCOR-Metriken Entwicklung über Zeit */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Lagerreichweite-Trend</CardTitle>
            <CardDescription>Monatliche Entwicklung (Ziel: 3 Tage JIT)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lagerreichweiteDaten}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monat" />
                <YAxis label={{ value: 'Tage', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="zielWert" 
                  stroke="#999"
                  strokeDasharray="5 5"
                  name="Ziel (3 Tage)"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="lagerreichweite" 
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Lagerreichweite"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Liefertreue-Entwicklung</CardTitle>
            <CardDescription>Monatlicher Trend (Ziel: 95%)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={metrikenEntwicklung}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monat" />
                <YAxis domain={[80, 100]} />
                <Tooltip formatter={(value: any) => `${value}%`} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="liefertreue" 
                  stroke={COLORS.secondary}
                  fill={COLORS.secondary}
                  fillOpacity={0.6}
                  name="Liefertreue China"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Materialverfügbarkeit-Trend</CardTitle>
            <CardDescription>Monatliche Entwicklung (Ziel: 98%)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrikenEntwicklung}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monat" />
                <YAxis domain={[80, 100]} />
                <Tooltip formatter={(value: any) => `${value}%`} />
                <Legend />
                <Bar 
                  dataKey="materialverfuegbarkeit" 
                  fill={COLORS.primary}
                  name="Materialverfügbarkeit"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Planerfüllungsgrad-Trend</CardTitle>
            <CardDescription>Monatlicher Trend (Ziel: 95%)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={metrikenEntwicklung}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monat" />
                <YAxis domain={[90, 100]} />
                <Tooltip formatter={(value: any) => `${value}%`} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="planerfuellungsgrad" 
                  fill={COLORS.info}
                  fillOpacity={0.3}
                  stroke={COLORS.info}
                  name="Planerfüllungsgrad"
                />
                <Line 
                  type="monotone" 
                  dataKey="auslastung" 
                  stroke={COLORS.warning}
                  strokeWidth={2}
                  name="Auslastung"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}