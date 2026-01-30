'use client'

/**
 * ========================================
 * TABLE CHARTS COMPONENTS
 * ========================================
 * 
 * Wiederverwendbare Visualisierungskomponenten für Tabellen
 * - Automatisch unter Tabellen eingebunden
 * - Basiert auf echten Daten aus den Berechnungen
 * - Reagiert auf Szenarien und Konfigurationsänderungen
 * 
 * WICHTIG: Alle Daten werden DYNAMISCH aus dem Kontext bezogen!
 */

import { useMemo } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Farben für Visualisierungen (konsistent mit anderen Dashboards)
 */
const COLORS = {
  primary: '#10b981',    // green-500
  secondary: '#3b82f6',  // blue-500
  warning: '#f59e0b',    // amber-500
  danger: '#ef4444',     // red-500
  info: '#8b5cf6',       // purple-500
  success: '#22c55e',    // green-500
  neutral: '#6b7280'     // gray-500
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

/**
 * Saisonale Produktionsverteilung als Balkendiagramm
 * Zeigt monatliche Anteile mit Peak-Markierung
 */
export interface SaisonalitaetChartProps {
  daten: Array<{
    monat: string
    name: string
    anteil: number
    bikes: number
  }>
  jahresproduktion: number
  height?: number
}

export function SaisonalitaetChart({ daten, jahresproduktion, height = 300 }: SaisonalitaetChartProps) {
  const peakMonat = useMemo(() => {
    return daten.reduce((max, m) => m.anteil > max.anteil ? m : max)
  }, [daten])

  const chartData = useMemo(() => {
    return daten.map(d => ({
      name: d.name,
      anteil: d.anteil,
      bikes: d.bikes,
      isPeak: d.monat === peakMonat.monat
    }))
  }, [daten, peakMonat])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">📊 Saisonale Produktionsverteilung</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis 
              yAxisId="left" 
              tick={{ fontSize: 11 }} 
              label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 11 }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'anteil') return [`${value}%`, 'Anteil']
                return [value.toLocaleString('de-DE'), 'Bikes']
              }}
              labelFormatter={(label) => `Monat: ${label}`}
            />
            <Legend />
            <Bar 
              yAxisId="left" 
              dataKey="anteil" 
              fill={COLORS.secondary} 
              name="Anteil (%)"
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="bikes" 
              stroke={COLORS.primary} 
              strokeWidth={2}
              dot={{ fill: COLORS.primary }}
              name="Bikes"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Variantenverteilung als Pie Chart
 * Zeigt Aufteilung der Jahresproduktion nach Varianten
 */
export interface VariantenChartProps {
  daten: Array<{
    id: string
    name: string
    anteil: number
    menge: number
  }>
  height?: number
}

export function VariantenPieChart({ daten, height = 300 }: VariantenChartProps) {
  const chartData = useMemo(() => {
    return daten.map((d, i) => ({
      name: d.name,
      value: d.menge,
      anteil: Math.round(d.anteil * 100),
      fill: VARIANTEN_FARBEN[i % VARIANTEN_FARBEN.length]
    }))
  }, [daten])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">🥧 Variantenverteilung</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, anteil }) => `${name}: ${anteil}%`}
              labelLine={{ stroke: COLORS.neutral, strokeWidth: 1 }}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [value.toLocaleString('de-DE'), 'Bikes']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Tagesproduktion als Liniendiagramm
 * Zeigt Plan vs. Ist-Produktion über Zeit
 */
export interface TagesproduktionChartProps {
  daten: Array<{
    tag: number
    datum?: Date
    planMenge: number
    istMenge: number
    monat?: number
  }>
  aggregation?: 'tag' | 'woche' | 'monat'
  height?: number
  showDelta?: boolean
}

export function TagesproduktionChart({ 
  daten, 
  aggregation = 'woche', 
  height = 300,
  showDelta = false 
}: TagesproduktionChartProps) {
  const chartData = useMemo(() => {
    if (aggregation === 'tag') {
      // Zeige jeden 5. Tag für bessere Lesbarkeit
      return daten
        .filter((_, i) => i % 5 === 0)
        .map(d => ({
          label: `Tag ${d.tag}`,
          plan: d.planMenge,
          ist: d.istMenge,
          delta: d.istMenge - d.planMenge
        }))
    } else if (aggregation === 'woche') {
      // Aggregiere zu Wochen
      const wochen: Record<number, { plan: number; ist: number }> = {}
      daten.forEach(d => {
        const woche = Math.ceil(d.tag / 7)
        if (!wochen[woche]) {
          wochen[woche] = { plan: 0, ist: 0 }
        }
        wochen[woche].plan += d.planMenge
        wochen[woche].ist += d.istMenge
      })
      return Object.entries(wochen).map(([woche, values]) => ({
        label: `KW ${woche}`,
        plan: values.plan,
        ist: values.ist,
        delta: values.ist - values.plan
      }))
    } else {
      // Aggregiere zu Monaten
      const monate: Record<number, { plan: number; ist: number; name: string }> = {}
      const monatNamen = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
      daten.forEach(d => {
        const monat = d.monat ?? Math.ceil(d.tag / 30)
        if (!monate[monat]) {
          monate[monat] = { plan: 0, ist: 0, name: monatNamen[(monat - 1) % 12] }
        }
        monate[monat].plan += d.planMenge
        monate[monat].ist += d.istMenge
      })
      return Object.values(monate).map((values) => ({
        label: values.name,
        plan: values.plan,
        ist: values.ist,
        delta: values.ist - values.plan
      }))
    }
  }, [daten, aggregation])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          📈 Produktion ({aggregation === 'tag' ? 'täglich' : aggregation === 'woche' ? 'wöchentlich' : 'monatlich'})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={aggregation === 'woche' ? 3 : 0} />
            <YAxis 
              tick={{ fontSize: 11 }} 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                const labelMap: Record<string, string> = {
                  plan: 'Plan',
                  ist: 'Ist',
                  delta: 'Abweichung'
                }
                return [value.toLocaleString('de-DE'), labelMap[name] || name]
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="plan" 
              fill={COLORS.secondary}
              fillOpacity={0.2}
              stroke={COLORS.secondary}
              strokeWidth={2}
              name="Plan"
            />
            <Line 
              type="monotone" 
              dataKey="ist" 
              stroke={COLORS.primary} 
              strokeWidth={2}
              dot={{ fill: COLORS.primary, r: 3 }}
              name="Ist"
            />
            {showDelta && (
              <Bar 
                dataKey="delta" 
                fill={COLORS.warning} 
                opacity={0.5}
                name="Abweichung"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Lagerbestand Chart
 * Zeigt Lagerbestandsentwicklung über Zeit
 */
export interface LagerbestandChartProps {
  daten: Array<{
    tag: number
    datum?: Date
    bestand: number
    zugang: number
    abgang: number
    status?: 'ok' | 'niedrig' | 'kritisch'
  }>
  aggregation?: 'tag' | 'woche' | 'monat'
  height?: number
}

export function LagerbestandChart({ 
  daten, 
  aggregation = 'woche', 
  height = 300 
}: LagerbestandChartProps) {
  const chartData = useMemo(() => {
    if (aggregation === 'tag') {
      return daten
        .filter((_, i) => i % 3 === 0) // Jeden 3. Tag
        .map(d => ({
          label: `Tag ${d.tag}`,
          bestand: d.bestand,
          zugang: d.zugang,
          abgang: d.abgang
        }))
    } else if (aggregation === 'woche') {
      const wochen: Record<number, { bestand: number; zugang: number; abgang: number }> = {}
      daten.forEach(d => {
        const woche = Math.ceil(d.tag / 7)
        if (!wochen[woche]) {
          wochen[woche] = { bestand: 0, zugang: 0, abgang: 0 }
        }
        // Nimm den letzten Bestand der Woche
        wochen[woche].bestand = d.bestand
        wochen[woche].zugang += d.zugang
        wochen[woche].abgang += d.abgang
      })
      return Object.entries(wochen).map(([woche, values]) => ({
        label: `KW ${woche}`,
        ...values
      }))
    } else {
      const monatNamen = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
      const monate: Record<number, { bestand: number; zugang: number; abgang: number; name: string }> = {}
      daten.forEach(d => {
        const monat = Math.ceil(d.tag / 30)
        if (!monate[monat]) {
          monate[monat] = { bestand: 0, zugang: 0, abgang: 0, name: monatNamen[(monat - 1) % 12] }
        }
        monate[monat].bestand = d.bestand
        monate[monat].zugang += d.zugang
        monate[monat].abgang += d.abgang
      })
      return Object.values(monate).map(values => ({
        label: values.name,
        bestand: values.bestand,
        zugang: values.zugang,
        abgang: values.abgang
      }))
    }
  }, [daten, aggregation])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">📦 Lagerbestandsentwicklung</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={aggregation === 'woche' ? 3 : 0} />
            <YAxis 
              tick={{ fontSize: 11 }} 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                const labelMap: Record<string, string> = {
                  bestand: 'Bestand',
                  zugang: 'Zugang',
                  abgang: 'Abgang'
                }
                return [value.toLocaleString('de-DE'), labelMap[name] || name]
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="bestand" 
              fill={COLORS.primary}
              fillOpacity={0.3}
              stroke={COLORS.primary}
              strokeWidth={2}
              name="Bestand"
            />
            <Bar 
              dataKey="zugang" 
              fill={COLORS.success} 
              opacity={0.7}
              name="Zugang"
              stackId="flow"
            />
            <Bar 
              dataKey="abgang" 
              fill={COLORS.danger} 
              opacity={0.7}
              name="Abgang"
              stackId="flow"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Bestellungen Chart
 * Zeigt Bestellhistorie und geplante Lieferungen
 */
export interface BestellungenChartProps {
  daten: Array<{
    bestelldatum: Date
    menge: number
    komponenten?: Record<string, number>
    status?: string
  }>
  aggregation?: 'tag' | 'woche' | 'monat'
  height?: number
}

export function BestellungenChart({ 
  daten, 
  aggregation = 'woche', 
  height = 300 
}: BestellungenChartProps) {
  const chartData = useMemo(() => {
    if (daten.length === 0) return []

    if (aggregation === 'monat') {
      const monatNamen = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
      const monate: Record<string, { menge: number; anzahl: number }> = {}
      
      daten.forEach(d => {
        const datum = d.bestelldatum instanceof Date ? d.bestelldatum : new Date(d.bestelldatum)
        const monat = datum.getMonth()
        const key = monatNamen[monat]
        
        if (!monate[key]) {
          monate[key] = { menge: 0, anzahl: 0 }
        }
        monate[key].menge += d.menge
        monate[key].anzahl += 1
      })
      
      return monatNamen.map(name => ({
        label: name,
        menge: monate[name]?.menge || 0,
        anzahl: monate[name]?.anzahl || 0
      }))
    } else if (aggregation === 'woche') {
      const wochen: Record<number, { menge: number; anzahl: number }> = {}
      
      daten.forEach(d => {
        const datum = d.bestelldatum instanceof Date ? d.bestelldatum : new Date(d.bestelldatum)
        const startOfYear = new Date(datum.getFullYear(), 0, 1)
        const dayOfYear = Math.floor((datum.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
        const woche = Math.ceil((dayOfYear + 1) / 7)
        
        if (!wochen[woche]) {
          wochen[woche] = { menge: 0, anzahl: 0 }
        }
        wochen[woche].menge += d.menge
        wochen[woche].anzahl += 1
      })
      
      return Object.entries(wochen)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([woche, values]) => ({
          label: `KW ${woche}`,
          menge: values.menge,
          anzahl: values.anzahl
        }))
    } else {
      // Tag
      const tage: Record<string, { menge: number; anzahl: number }> = {}
      
      daten.forEach(d => {
        const datum = d.bestelldatum instanceof Date ? d.bestelldatum : new Date(d.bestelldatum)
        const key = datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        
        if (!tage[key]) {
          tage[key] = { menge: 0, anzahl: 0 }
        }
        tage[key].menge += d.menge
        tage[key].anzahl += 1
      })
      
      return Object.entries(tage)
        .slice(0, 30) // Nur erste 30 Tage
        .map(([label, values]) => ({
          label,
          menge: values.menge,
          anzahl: values.anzahl
        }))
    }
  }, [daten, aggregation])

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">📦 Bestellungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Keine Bestelldaten verfügbar
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">📦 Bestellungen ({aggregation === 'monat' ? 'monatlich' : aggregation === 'woche' ? 'wöchentlich' : 'täglich'})</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={aggregation === 'woche' ? 3 : 0} />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 11 }} 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }} 
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                const labelMap: Record<string, string> = {
                  menge: 'Menge (Stück)',
                  anzahl: 'Anzahl Bestellungen'
                }
                return [value.toLocaleString('de-DE'), labelMap[name] || name]
              }}
            />
            <Legend />
            <Bar 
              yAxisId="left"
              dataKey="menge" 
              fill={COLORS.secondary} 
              name="Bestellmenge"
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="anzahl" 
              stroke={COLORS.warning} 
              strokeWidth={2}
              dot={{ fill: COLORS.warning }}
              name="Anzahl Bestellungen"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Vorlaufzeit Breakdown Chart
 * Zeigt die Zusammensetzung der Vorlaufzeit
 */
export interface VorlaufzeitChartProps {
  produktion: number
  lkwChina: number
  seefracht: number
  lkwDeutschland: number
  gesamt: number
  height?: number
}

export function VorlaufzeitChart({ 
  produktion, 
  lkwChina, 
  seefracht, 
  lkwDeutschland, 
  gesamt,
  height = 200 
}: VorlaufzeitChartProps) {
  const chartData = [
    { name: 'Produktion', tage: produktion, fill: COLORS.primary },
    { name: 'LKW China', tage: lkwChina, fill: COLORS.secondary },
    { name: 'Seefracht', tage: seefracht, fill: COLORS.info },
    { name: 'LKW DE', tage: lkwDeutschland, fill: COLORS.warning }
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">🚢 Vorlaufzeit-Zusammensetzung ({gesamt} Tage gesamt)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
            <Tooltip 
              formatter={(value: number) => [`${value} Tage`, 'Dauer']}
            />
            <Bar 
              dataKey="tage" 
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Stückliste / Komponenten Chart
 * Zeigt Bedarf nach Komponenten
 */
export interface KomponentenChartProps {
  daten: Array<{
    id: string
    name: string
    bedarf: number
  }>
  height?: number
}

export function KomponentenBarChart({ daten, height = 250 }: KomponentenChartProps) {
  const chartData = useMemo(() => {
    return daten.map((d, i) => ({
      name: d.name,
      bedarf: d.bedarf,
      fill: VARIANTEN_FARBEN[i % VARIANTEN_FARBEN.length]
    }))
  }, [daten])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">🔧 Komponentenbedarf pro Jahr</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              type="number" 
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
            <Tooltip 
              formatter={(value: number) => [value.toLocaleString('de-DE'), 'Stück/Jahr']}
            />
            <Bar 
              dataKey="bedarf" 
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * SCOR Metriken Radar Chart
 * Zeigt alle SCOR-Kategorien als Spinnennetz
 */
export interface SCORChartProps {
  metriken: {
    planerfuellungsgrad: number
    liefertreueChina: number
    durchlaufzeitProduktion: number
    lagerumschlag: number
    produktionsflexibilitaet: number
    materialverfuegbarkeit: number
    lagerreichweite: number
  }
  height?: number
}

export function SCORBarChart({ metriken, height = 250 }: SCORChartProps) {
  const chartData = [
    { name: 'Planerfüllung', wert: metriken.planerfuellungsgrad, ziel: 95, einheit: '%' },
    { name: 'Liefertreue', wert: metriken.liefertreueChina, ziel: 95, einheit: '%' },
    { name: 'Flexibilität', wert: metriken.produktionsflexibilitaet, ziel: 95, einheit: '%' },
    { name: 'Material', wert: metriken.materialverfuegbarkeit, ziel: 95, einheit: '%' },
    { name: 'Umschlag', wert: metriken.lagerumschlag * 10, ziel: 40, einheit: 'x10' },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">📊 SCOR-Metriken Übersicht</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart 
            data={chartData} 
            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis 
              tick={{ fontSize: 11 }} 
              domain={[0, 100]}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'wert') return [`${value.toFixed(1)}`, 'Ist']
                return [`${value}`, 'Ziel']
              }}
            />
            <Legend />
            <Bar 
              dataKey="wert" 
              fill={COLORS.primary} 
              name="Ist"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="ziel" 
              fill={COLORS.secondary} 
              name="Ziel"
              opacity={0.3}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Fertigerzeugnisse Chart (Finished Goods)
 * Zeigt kumulative Bike-Produktion über Zeit
 * 
 * WICHTIG: Zeigt fertige Bikes, nicht Rohstoffe (Sättel)!
 * Sollte am Jahresende exakt 370.000 erreichen.
 */
export interface FertigerzeugnisseChartProps {
  daten: Array<{
    tag: number
    datum?: Date
    kumulativIst: number  // Kumulative Ist-Produktion
    kumulativPlan: number // Kumulative Plan-Produktion
    monat?: number
  }>
  jahresproduktion: number
  aggregation?: 'tag' | 'woche' | 'monat'
  height?: number
}

export function FertigerzeugnisseChart({ 
  daten, 
  jahresproduktion,
  aggregation = 'woche', 
  height = 300 
}: FertigerzeugnisseChartProps) {
  const chartData = useMemo(() => {
    if (aggregation === 'tag') {
      // Zeige jeden 5. Tag für bessere Lesbarkeit
      return daten
        .filter((_, i) => i % 5 === 0)
        .map(d => ({
          label: `Tag ${d.tag}`,
          kumulativIst: d.kumulativIst,
          kumulativPlan: d.kumulativPlan
        }))
    } else if (aggregation === 'woche') {
      // Nimm letzten Wert jeder Woche
      const wochen: Record<number, { kumulativIst: number; kumulativPlan: number }> = {}
      daten.forEach(d => {
        const woche = Math.ceil(d.tag / 7)
        wochen[woche] = { kumulativIst: d.kumulativIst, kumulativPlan: d.kumulativPlan }
      })
      return Object.entries(wochen).map(([woche, values]) => ({
        label: `KW ${woche}`,
        ...values
      }))
    } else {
      // Nimm letzten Wert jedes Monats
      const monatNamen = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
      const monate: Record<number, { kumulativIst: number; kumulativPlan: number; name: string }> = {}
      daten.forEach(d => {
        const monat = d.monat ?? Math.ceil(d.tag / 30)
        monate[monat] = { 
          kumulativIst: d.kumulativIst, 
          kumulativPlan: d.kumulativPlan,
          name: monatNamen[(monat - 1) % 12]
        }
      })
      return Object.values(monate).map(values => ({
        label: values.name,
        kumulativIst: values.kumulativIst,
        kumulativPlan: values.kumulativPlan
      }))
    }
  }, [daten, aggregation])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          🚴 Fertigerzeugnisse (Kumulativ) - Ziel: {jahresproduktion.toLocaleString('de-DE')} Bikes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={aggregation === 'woche' ? 3 : 0} />
            <YAxis 
              tick={{ fontSize: 11 }} 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              domain={[0, jahresproduktion * 1.05]}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                const labelMap: Record<string, string> = {
                  kumulativIst: 'Produziert (Ist)',
                  kumulativPlan: 'Geplant (Plan)'
                }
                return [value.toLocaleString('de-DE') + ' Bikes', labelMap[name] || name]
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="kumulativPlan" 
              fill={COLORS.secondary}
              fillOpacity={0.2}
              stroke={COLORS.secondary}
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Plan"
            />
            <Area 
              type="monotone" 
              dataKey="kumulativIst" 
              fill={COLORS.success}
              fillOpacity={0.4}
              stroke={COLORS.success}
              strokeWidth={3}
              name="Ist"
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-center text-muted-foreground mt-2">
          ✅ Zeigt kumulative Produktion fertiger Bikes. Ziel: {jahresproduktion.toLocaleString('de-DE')} am Jahresende.
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * Feiertage Chart
 * Zeigt Verteilung der Feiertage über das Jahr
 */
export interface FeiertageChartProps {
  daten: Array<{
    monat: number
    name: string
    anzahlDE: number
    anzahlCN: number
  }>
  height?: number
}

export function FeiertageChart({ daten, height = 200 }: FeiertageChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">📅 Feiertage pro Monat</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={daten} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="anzahlDE" 
              fill={COLORS.secondary} 
              name="Deutschland"
              stackId="a"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="anzahlCN" 
              fill={COLORS.danger} 
              name="China"
              stackId="a"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
