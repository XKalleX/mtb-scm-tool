'use client'

/**
 * FERTIGERZEUGNISSE CHART - WORKING VERSION
 * Simple LineChart with per-variant lines that ACTUALLY renders
 */

import { useMemo, Fragment } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

interface FertigerzeugnisseChartV2Props {
  daten: Array<{
    tag: number
    kumulativIst: number
    kumulativPlan: number
    varianten?: Record<string, { plan: number; ist: number }>
  }>
  varianten: Array<{ id: string; name: string }>
  jahresproduktion: number
}

interface WochenDaten {
  label: string
  kumulativIst: number
  kumulativPlan: number
  [key: string]: number | string // Für dynamische Varianten-Keys wie MTBAllrounder_ist
}

export function FertigerzeugnisseChartV2({ 
  daten, 
  varianten,
  jahresproduktion
}: FertigerzeugnisseChartV2Props) {
  
  // Aggregiere zu Wochen
  const chartData = useMemo(() => {
    const wochen: Record<number, WochenDaten> = {}
    
    daten.forEach(d => {
      const woche = Math.ceil(d.tag / 7)
      wochen[woche] = {
        label: `KW ${woche}`,
        kumulativIst: d.kumulativIst,
        kumulativPlan: d.kumulativPlan
      }
      
      // Flatten Varianten
      if (d.varianten) {
        Object.entries(d.varianten).forEach(([id, v]) => {
          wochen[woche][`${id}_ist`] = v.ist
          wochen[woche][`${id}_plan`] = v.plan
        })
      }
    })
    
    return Object.values(wochen)
  }, [daten])
  
  console.log('📊 FertigerzeugnisseChartV2 rendering:', {
    dataPoints: chartData.length,
    firstWeek: chartData[0],
    variants: varianten.map(v => v.id)
  })
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          🚴 Fertigerzeugnisse (Kumulativ) - Ziel: {jahresproduktion.toLocaleString('de-DE')} Bikes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 10 }} 
              interval={3}
            />
            <YAxis 
              tick={{ fontSize: 11 }} 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number) => value.toLocaleString('de-DE') + ' Bikes'}
            />
            <Legend />
            
            {/* Render Lines for each variant */}
            {varianten.map((v, idx) => (
              <Fragment key={v.id}>
                <Line
                  type="monotone"
                  dataKey={`${v.id}_ist`}
                  stroke={VARIANTEN_FARBEN[idx % VARIANTEN_FARBEN.length]}
                  strokeWidth={2.5}
                  dot={false}
                  name={`${v.name} (IST)`}
                />
                <Line
                  type="monotone"
                  dataKey={`${v.id}_plan`}
                  stroke={VARIANTEN_FARBEN[idx % VARIANTEN_FARBEN.length]}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                  dot={false}
                  name={`${v.name} (SOLL)`}
                />
              </Fragment>
            ))}
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-center text-muted-foreground mt-2">
          ✅ Zeigt kumulative Produktion pro MTB-Variante über 52 Wochen. ({varianten.length} Varianten)
        </p>
      </CardContent>
    </Card>
  )
}
