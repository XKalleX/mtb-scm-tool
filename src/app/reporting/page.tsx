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
import { exportToCSV, exportToJSON } from '@/lib/export'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
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
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month')
  
  /**
   * Exportiert SCOR-Metriken als CSV
   */
  const handleExportMetrics = () => {
    const metricsData = [
      { Kategorie: 'Reliability', Metrik: 'Planerfüllungsgrad', Wert: scorMetriken.planerfuellungsgrad, Einheit: '%' },
      { Kategorie: 'Reliability', Metrik: 'Liefertreue China', Wert: scorMetriken.liefertreueChina, Einheit: '%' },
      { Kategorie: 'Responsiveness', Metrik: 'Durchlaufzeit Produktion', Wert: scorMetriken.durchlaufzeitProduktion, Einheit: 'Tage' },
      { Kategorie: 'Responsiveness', Metrik: 'Lagerumschlag', Wert: scorMetriken.lagerumschlag, Einheit: 'x/Jahr' },
      { Kategorie: 'Agility', Metrik: 'Produktionsflexibilität', Wert: scorMetriken.produktionsflexibilitaet, Einheit: '%' },
      { Kategorie: 'Agility', Metrik: 'Materialverfügbarkeit', Wert: scorMetriken.materialverfuegbarkeit, Einheit: '%' },
      { Kategorie: 'Costs', Metrik: 'Gesamtkosten', Wert: scorMetriken.gesamtkosten, Einheit: 'EUR' },
      { Kategorie: 'Costs', Metrik: 'Herstellkosten', Wert: scorMetriken.herstellkosten, Einheit: 'EUR' },
      { Kategorie: 'Assets', Metrik: 'Lagerbestandswert', Wert: scorMetriken.lagerbestandswert, Einheit: 'EUR' },
      { Kategorie: 'Assets', Metrik: 'Kapitalbindung', Wert: scorMetriken.kapitalbindung, Einheit: 'Tage' }
    ]
    
    exportToCSV(metricsData, 'scor_metriken_2027')
  }

  
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
          <Button variant="outline" onClick={handleExportMetrics}>
            <Download className="h-4 w-4 mr-2" />
            Export Metriken
          </Button>
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
              value={formatPercent(metriken.planerfuellungsgrad, 2)}
              description="% der geplanten Produktion erreicht"
              status={getStatus(metriken.planerfuellungsgrad, 95, 85)}
            />
            <MetricRow
              label="Liefertreue China"
              value={formatPercent(metriken.liefertreueChina, 1)}
              description="% pünktliche Lieferungen vom Lieferanten"
              status={getStatus(metriken.liefertreueChina, 95, 85)}
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
              value={`${metriken.durchlaufzeitProduktion} Tage`}
              description="Bestellung China → Fertige Produktion"
              status="neutral"
            />
            <MetricRow
              label="Lagerumschlag"
              value={`${formatNumber(metriken.lagerumschlag, 1)}x pro Jahr`}
              description="Wie oft wird Lager umgeschlagen"
              status={getStatus(metriken.lagerumschlag, 4, 2)}
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
              value={formatPercent(metriken.produktionsflexibilitaet, 2)}
              description="% Aufträge vollständig produziert"
              status={getStatus(metriken.produktionsflexibilitaet, 95, 85)}
            />
            <MetricRow
              label="Materialverfügbarkeit"
              value={formatPercent(metriken.materialverfuegbarkeit, 1)}
              description="% der Zeit genug Material vorhanden"
              status={getStatus(metriken.materialverfuegbarkeit, 95, 85)}
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
                  {formatNumber(metriken.herstellkosten, 0)} €
                </TableCell>
                <TableCell className="text-right">
                  {formatPercent((metriken.herstellkosten / metriken.gesamtkosten) * 100, 1)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Beschaffungskosten</TableCell>
                <TableCell className="text-right">
                  {formatNumber(metriken.beschaffungskosten, 0)} €
                </TableCell>
                <TableCell className="text-right">
                  {formatPercent((metriken.beschaffungskosten / metriken.gesamtkosten) * 100, 1)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Lagerkosten</TableCell>
                <TableCell className="text-right">
                  {formatNumber(metriken.lagerkosten, 0)} €
                </TableCell>
                <TableCell className="text-right">
                  {formatPercent((metriken.lagerkosten / metriken.gesamtkosten) * 100, 1)}
                </TableCell>
              </TableRow>
              <TableRow className="font-bold bg-slate-50">
                <TableCell>GESAMT</TableCell>
                <TableCell className="text-right">
                  {formatNumber(metriken.gesamtkosten, 0)} €
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
              value={`${formatNumber(metriken.lagerbestandswert, 0)} €`}
              description="Wert der gebundenen Komponenten"
              status="neutral"
            />
            <MetricRow
              label="Kapitalbindung"
              value={`${formatNumber(metriken.kapitalbindung, 1)} Tage`}
              description="Durchschnittliche Lagerdauer"
              status={getStatusInverted(metriken.kapitalbindung, 30, 45)}
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
                {formatNumber(metriken.gesamtproduktion, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">MTBs</div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Produktionstage</div>
              <div className="text-2xl font-bold mt-1">
                {metriken.produktionstage}
              </div>
              <div className="text-xs text-muted-foreground mt-1">von 365 Tagen</div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Durchschnitt pro Tag</div>
              <div className="text-2xl font-bold mt-1">
                {formatNumber(metriken.durchschnittProTag, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Bikes/Tag</div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Auslastung</div>
              <div className="text-2xl font-bold mt-1">
                {formatPercent(metriken.auslastung, 2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Kapazität genutzt</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SCOR Metriken Excel-Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle>Alle SCOR-Metriken im Überblick</CardTitle>
          <CardDescription>
            Vollständige Übersicht aller KPIs mit Zielwerten und Status (Excel-Darstellung)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExcelTable
            columns={[
              {
                key: 'kategorie',
                label: 'SCOR Kategorie',
                width: '150px',
                align: 'left',
                sumable: false
              },
              {
                key: 'metrik',
                label: 'Metrik',
                width: '200px',
                align: 'left',
                sumable: false
              },
              {
                key: 'istwert',
                label: 'Ist-Wert',
                width: '120px',
                align: 'right',
                format: (val) => val,
                sumable: false
              },
              {
                key: 'zielwert',
                label: 'Ziel-Wert',
                width: '120px',
                align: 'right',
                format: (val) => val,
                sumable: false
              },
              {
                key: 'zielerreichung',
                label: 'Zielerreichung',
                width: '130px',
                align: 'right',
                formula: '(Ist / Ziel) × 100',
                format: (val) => formatPercent(val, 1),
                sumable: true
              },
              {
                key: 'status',
                label: 'Status',
                width: '100px',
                align: 'center',
                format: (val) => {
                  if (val === 'good') return '✓ Gut'
                  if (val === 'medium') return '◐ Mittel'
                  return '✗ Schwach'
                },
                sumable: false
              }
            ]}
            data={[
              {
                kategorie: 'Reliability',
                metrik: 'Planerfüllungsgrad',
                istwert: formatPercent(metriken.planerfuellungsgrad, 2),
                zielwert: '95,0 %',
                zielerreichung: (metriken.planerfuellungsgrad / 95) * 100,
                status: metriken.planerfuellungsgrad >= 95 ? 'good' : 'medium'
              },
              {
                kategorie: 'Reliability',
                metrik: 'Liefertreue China',
                istwert: formatPercent(metriken.liefertreueChina, 1),
                zielwert: '95,0 %',
                zielerreichung: (metriken.liefertreueChina / 95) * 100,
                status: metriken.liefertreueChina >= 95 ? 'good' : metriken.liefertreueChina >= 85 ? 'medium' : 'bad'
              },
              {
                kategorie: 'Responsiveness',
                metrik: 'Durchlaufzeit',
                istwert: `${metriken.durchlaufzeitProduktion} Tage`,
                zielwert: '60 Tage',
                zielerreichung: (60 / metriken.durchlaufzeitProduktion) * 100,
                status: metriken.durchlaufzeitProduktion <= 60 ? 'good' : 'medium'
              },
              {
                kategorie: 'Responsiveness',
                metrik: 'Lagerumschlag',
                istwert: `${formatNumber(metriken.lagerumschlag, 1)}x`,
                zielwert: '4,0x',
                zielerreichung: (metriken.lagerumschlag / 4) * 100,
                status: metriken.lagerumschlag >= 4 ? 'good' : 'medium'
              },
              {
                kategorie: 'Agility',
                metrik: 'Produktionsflexibilität',
                istwert: formatPercent(metriken.produktionsflexibilitaet, 2),
                zielwert: '95,0 %',
                zielerreichung: (metriken.produktionsflexibilitaet / 95) * 100,
                status: metriken.produktionsflexibilitaet >= 95 ? 'good' : 'medium'
              },
              {
                kategorie: 'Agility',
                metrik: 'Materialverfügbarkeit',
                istwert: formatPercent(metriken.materialverfuegbarkeit, 1),
                zielwert: '95,0 %',
                zielerreichung: (metriken.materialverfuegbarkeit / 95) * 100,
                status: metriken.materialverfuegbarkeit >= 95 ? 'good' : 'medium'
              },
              {
                kategorie: 'Costs',
                metrik: 'Gesamtkosten',
                istwert: formatNumber(metriken.gesamtkosten, 0) + ' €',
                zielwert: '≤ 190M €',
                zielerreichung: (190000000 / metriken.gesamtkosten) * 100,
                status: metriken.gesamtkosten <= 190000000 ? 'good' : 'medium'
              },
              {
                kategorie: 'Assets',
                metrik: 'Kapitalbindung',
                istwert: `${formatNumber(metriken.kapitalbindung, 1)} Tage`,
                zielwert: '≤ 30 Tage',
                zielerreichung: (30 / metriken.kapitalbindung) * 100,
                status: metriken.kapitalbindung <= 30 ? 'good' : 'medium'
              }
            ]}
            maxHeight="500px"
            showFormulas={true}
            showSums={true}
            sumRowLabel="DURCHSCHNITT Zielerreichung"
            groupBy="kategorie"
            subtotalLabel="Kategorie-Durchschnitt"
          />
        </CardContent>
      </Card>
    </>
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

  // Tägliche Basis-Daten (365 Tage)
  const basisTaeglicherDaten = Array.from({ length: 365 }, (_, i) => {
    const basisProduktion = 1014  // 370.000 / 365 ≈ 1014 Bikes/Tag
    const saisonaleFaktor = Math.sin((i / 365) * Math.PI * 2) * 200
    return {
      tag: i + 1,
      plan: Math.round((basisProduktion + saisonaleFaktor) * 1.05),
      ist: Math.round(basisProduktion + saisonaleFaktor),
      abweichung: Math.round((basisProduktion + saisonaleFaktor) * -0.05)
    }
  })

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

  // Basis-Lagerbestandsverlauf (monatlich, deterministisch)
  // ERMÄSSIGUNG: Nur Sättel (keine Rahmen/Gabeln)
  const basisLagerDaten = Array.from({ length: 12 }, (_, i) => {
    const baseSaettel = 3800
    
    // Sinuswelle für natürliche Schwankungen
    const schwankung = Math.sin(i * 0.8) * 150
    
    return {
      monat: ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][i],
      saettel: baseSaettel + schwankung * 2
    }
  })

  // Tägliche Lagerdaten (365 Tage)
  // ERMÄSSIGUNG: Nur Sättel (keine Rahmen/Gabeln)
  const basisTaeglicherLagerDaten = Array.from({ length: 365 }, (_, i) => {
    const baseSaettel = 3800
    const schwankung = Math.sin(i * 0.1) * 150
    
    return {
      tag: i + 1,
      saettel: baseSaettel + schwankung * 2
    }
  })

  // Wöchentliche Auslastung (deterministisch)
  const basisWoechentlicheDaten = Array.from({ length: 52 }, (_, i) => {
    const basisAuslastung = 85
    const saisonaleFaktor = Math.sin((i / 52) * Math.PI * 2) * 10 // Jährliche Schwankung
    
    return {
      woche: i + 1,
      auslastung: basisAuslastung + saisonaleFaktor,
      produktion: 6000 + saisonaleFaktor * 100
    }
  })

  // Tägliche Auslastung (365 Tage)
  const basisTaeglicherAuslastung = Array.from({ length: 365 }, (_, i) => {
    const basisAuslastung = 85
    const saisonaleFaktor = Math.sin((i / 365) * Math.PI * 2) * 10
    
    return {
      tag: i + 1,
      auslastung: basisAuslastung + saisonaleFaktor,
      produktion: 1014 + saisonaleFaktor * 10
    }
  })

  // Filter/Aggregiere Produktionsdaten basierend auf timeRange
  const produktionsDaten = (() => {
    if (timeRange === 'day') {
      // Zeige ALLE 365 Tage für vollständige Transparenz
      return basisTaeglicherDaten.map(t => ({
        monat: `Tag ${t.tag}`,
        plan: t.plan,
        ist: t.ist,
        abweichung: t.abweichung
      }))
    } else if (timeRange === 'week') {
      // Zeige die letzten 8 Wochen basierend auf wöchentlichen Daten
      return basisWoechentlicheDaten.slice(-8).map(w => ({
        monat: `KW ${w.woche}`,
        plan: Math.round(w.produktion * 1.05),
        ist: Math.round(w.produktion),
        abweichung: Math.round(w.produktion * -0.05)
      }))
    } else if (timeRange === 'quarter') {
      // Aggregiere nach Quartalen
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
      // Zeige Jahressumme
      return [{
        monat: '2027',
        plan: basisProduktionsDaten.reduce((sum, m) => sum + m.plan, 0),
        ist: basisProduktionsDaten.reduce((sum, m) => sum + m.ist, 0),
        abweichung: basisProduktionsDaten.reduce((sum, m) => sum + m.abweichung, 0)
      }]
    }
    // Standard: Monat - zeige alle 12 Monate
    return basisProduktionsDaten
  })()

  // Filter/Aggregiere Lagerdaten basierend auf timeRange
  const lagerDaten = (() => {
    if (timeRange === 'day') {
      // Zeige ALLE 365 Tage für vollständige Transparenz
      return basisTaeglicherLagerDaten.map(t => ({
        monat: `Tag ${t.tag}`,
        saettel: t.saettel
      }))
    } else if (timeRange === 'week') {
      // Zeige die letzten 8 Wochen (berechnet aus Monatsdaten, deterministisch)
      return basisLagerDaten.slice(-2).flatMap((monat, idx) => {
        return Array.from({ length: 4 }, (_, w) => ({
          monat: `KW ${44 + idx * 4 + w}`,
          saettel: monat.saettel + Math.sin((idx * 4 + w) * 0.5) * 100
        }))
      })
    } else if (timeRange === 'quarter') {
      // Aggregiere nach Quartalen (Durchschnitt)
      return [
        {
          monat: 'Q1',
          saettel: basisLagerDaten.slice(0, 3).reduce((sum, m) => sum + m.saettel, 0) / 3
        },
        {
          monat: 'Q2',
          saettel: basisLagerDaten.slice(3, 6).reduce((sum, m) => sum + m.saettel, 0) / 3
        },
        {
          monat: 'Q3',
          saettel: basisLagerDaten.slice(6, 9).reduce((sum, m) => sum + m.saettel, 0) / 3
        },
        {
          monat: 'Q4',
          saettel: basisLagerDaten.slice(9, 12).reduce((sum, m) => sum + m.saettel, 0) / 3
        }
      ]
    } else if (timeRange === 'year') {
      // Zeige Jahresdurchschnitt
      return [{
        monat: '2027',
        saettel: basisLagerDaten.reduce((sum, m) => sum + m.saettel, 0) / 12
      }]
    }
    // Standard: Monat
    return basisLagerDaten
  })()

  // Filter wöchentliche Daten basierend auf timeRange
  const woechentlicheDaten = (() => {
    if (timeRange === 'day') {
      // Zeige ALLE 365 Tage für vollständige Transparenz
      return basisTaeglicherAuslastung.map(t => ({
        woche: `Tag ${t.tag}`,
        auslastung: t.auslastung,
        produktion: t.produktion
      }))
    } else if (timeRange === 'week') {
      // Zeige die letzten 8 Wochen
      return basisWoechentlicheDaten.slice(-8)
    } else if (timeRange === 'quarter') {
      // Zeige 4 Quartale (aggregiere je 13 Wochen)
      return [1, 2, 3, 4].map(q => {
        const startWeek = (q - 1) * 13
        const quarterData = basisWoechentlicheDaten.slice(startWeek, startWeek + 13)
        return {
          woche: `Q${q}`,
          auslastung: quarterData.reduce((sum, w) => sum + w.auslastung, 0) / quarterData.length,
          produktion: quarterData.reduce((sum, w) => sum + w.produktion, 0)
        }
      })
    } else if (timeRange === 'year') {
      // Zeige Jahressumme
      return [{
        woche: '2027',
        auslastung: basisWoechentlicheDaten.reduce((sum, w) => sum + w.auslastung, 0) / 52,
        produktion: basisWoechentlicheDaten.reduce((sum, w) => sum + w.produktion, 0)
      }]
    }
    // Standard: Monat - aggregiere zu 12 Monaten
    return Array.from({ length: 12 }, (_, m) => {
      const monthName = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][m]
      const startWeek = Math.floor(m * 52 / 12)
      const endWeek = Math.floor((m + 1) * 52 / 12)
      const monthData = basisWoechentlicheDaten.slice(startWeek, endWeek)
      return {
        woche: monthName,
        auslastung: monthData.reduce((sum, w) => sum + w.auslastung, 0) / monthData.length,
        produktion: monthData.reduce((sum, w) => sum + w.produktion, 0)
      }
    })
  })()

  // Helper für Zeitbereichs-Beschriftungen
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'day': return 'Täglich'
      case 'week': return 'Wöchentlich'
      case 'quarter': return 'Quartalsweise'
      case 'year': return 'Jährlich'
      default: return 'Monatlich'
    }
  }

  const getXAxisLabel = () => {
    switch (timeRange) {
      case 'day': return 'Tag'
      case 'week': return 'Kalenderwoche'
      case 'quarter': return 'Quartal'
      case 'year': return 'Jahr'
      default: return 'Monat'
    }
  }

  return (
    <div className="space-y-6">
      {/* Zeitbereichs-Auswahl */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Interaktive Visualisierungen</h3>
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
      </div>

      {/* Charts Grid - Volle Breite für Tagesansicht, sonst 2-spaltig */}
      <div className={timeRange === 'day' ? 'space-y-6' : 'grid grid-cols-2 gap-6'}>
        {/* Produktionsverlauf */}
        <Card>
          <CardHeader>
            <CardTitle>Produktionsverlauf 2027</CardTitle>
            <CardDescription>
              Plan vs. Ist mit Abweichungen ({getTimeRangeLabel()})
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
                        label={{ value: getXAxisLabel(), position: 'insideBottom', offset: -10, style: { fontWeight: 'bold' } }}
                      />
                      <YAxis 
                        stroke="#666"
                        label={{ value: 'Produktion (Bikes)', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold', textAnchor: 'middle' } }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px'
                        }}
                        formatter={(value) => {
                          if (value === undefined || value === null) return 'N/A'
                          if (typeof value !== 'number') return String(value)
                          return value.toLocaleString('de-DE') + ' Bikes'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
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
                  <XAxis 
                    dataKey="monat" 
                    stroke="#666"
                    label={{ value: getXAxisLabel(), position: 'insideBottom', offset: -5, style: { fontWeight: 'bold' } }}
                  />
                  <YAxis 
                    stroke="#666"
                    label={{ value: 'Produktion (Bikes)', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold', textAnchor: 'middle' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                    formatter={(value) => {
                      if (value === undefined || value === null) return 'N/A'
                      if (typeof value !== 'number') return String(value)
                      return value.toLocaleString('de-DE') + ' Bikes'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
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

        {/* Variantenverteilung - unverändert (keine Zeitbereichs-Abhängigkeit) */}
        <Card>
          <CardHeader>
            <CardTitle>Produktvariantenverteilung</CardTitle>
            <CardDescription>Jahresproduktion nach Varianten</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={timeRange === 'day' ? 400 : 350}>
              <PieChart>
                <Pie
                  data={variantenDaten}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name.replace('MTB ', '')}: ${entry.prozent}%`}
                  outerRadius={timeRange === 'day' ? 130 : 100}
                  fill="#8884d8"
                  dataKey="wert"
                >
                  {variantenDaten.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={VARIANTEN_FARBEN[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    if (value === undefined || value === null) return 'N/A'
                    if (typeof value !== 'number') return String(value)
                    return value.toLocaleString('de-DE') + ' Bikes'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lagerbestandsentwicklung */}
        <Card>
          <CardHeader>
            <CardTitle>Lagerbestandsentwicklung 2027 - Sättel</CardTitle>
            <CardDescription>
              Bestandsverlauf der Sättel aus China ({getTimeRangeLabel()})
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
                        label={{ value: getXAxisLabel(), position: 'insideBottom', offset: -10, style: { fontWeight: 'bold' } }}
                      />
                      <YAxis 
                        stroke="#666"
                        label={{ value: 'Bestand (Stück)', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold', textAnchor: 'middle' } }}
                      />
                      <Tooltip 
                        formatter={(value) => {
                          if (value === undefined || value === null) return 'N/A'
                          if (typeof value !== 'number') return String(value)
                          return Math.round(value).toLocaleString('de-DE') + ' Stück'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
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
                  <XAxis 
                    dataKey="monat" 
                    stroke="#666"
                    label={{ value: getXAxisLabel(), position: 'insideBottom', offset: -5, style: { fontWeight: 'bold' } }}
                  />
                  <YAxis 
                    stroke="#666"
                    label={{ value: 'Bestand (Stück)', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold', textAnchor: 'middle' } }}
                  />
                  <Tooltip 
                    formatter={(value) => {
                      if (value === undefined || value === null) return 'N/A'
                      if (typeof value !== 'number') return String(value)
                      return Math.round(value).toLocaleString('de-DE') + ' Stück'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
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

        {/* Produktionsauslastung */}
        <Card>
          <CardHeader>
            <CardTitle>Produktionsauslastung 2027</CardTitle>
            <CardDescription>
              Auslastung in % ({getTimeRangeLabel()})
              {timeRange === 'day' && ' - Horizontal scrollbar für alle 365 Tage'}
            </CardDescription>
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
                        label={{ value: getXAxisLabel(), position: 'insideBottom', offset: -10, style: { fontWeight: 'bold' } }}
                      />
                      <YAxis 
                        stroke="#666" 
                        domain={[0, 100]}
                        label={{ value: 'Auslastung (%)', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold', textAnchor: 'middle' } }}
                      />
                      <Tooltip 
                        formatter={(value) => {
                          if (value === undefined || value === null) return 'N/A'
                          if (typeof value !== 'number') return String(value)
                          return value.toFixed(1) + '%'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
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
                  <XAxis 
                    dataKey="woche" 
                    stroke="#666"
                    label={{ value: getXAxisLabel(), position: 'insideBottom', offset: -5, style: { fontWeight: 'bold' } }}
                  />
                  <YAxis 
                    stroke="#666" 
                    domain={[0, 100]}
                    label={{ value: 'Auslastung (%)', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold', textAnchor: 'middle' } }}
                  />
                  <Tooltip 
                    formatter={(value) => {
                      if (value === undefined || value === null) return 'N/A'
                      if (typeof value !== 'number') return String(value)
                      return value.toFixed(1) + '%'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
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
      </div>

      {/* Zusätzliche Visualisierungen - zweite Reihe */}
      <div className="grid grid-cols-2 gap-6">
        {/* Kostenverteilung Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Kostenverteilung 2027</CardTitle>
            <CardDescription>Aufschlüsselung nach Kostenarten</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Herstellkosten', value: 185000000 },
                    { name: 'Beschaffungskosten', value: 1250000 },
                    { name: 'Lagerkosten', value: 1250000 }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${((entry.value / 187500000) * 100).toFixed(1)}%`}
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill={COLORS.primary} />
                  <Cell fill={COLORS.warning} />
                  <Cell fill={COLORS.info} />
                </Pie>
                <Tooltip
                  formatter={(value: any) => {
                    if (typeof value === 'number') {
                      return formatNumber(value, 0) + ' €'
                    }
                    return String(value)
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Wöchentlicher Durchsatz - UNABHÄNGIG von Zeitfiltern */}
        <Card>
          <CardHeader>
            <CardTitle>Wöchentlicher Produktionsdurchsatz</CardTitle>
            <CardDescription>Alle 52 KWs in 2027 (unabhängig von Zeitfiltern) - Horizontal scrollbar</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Horizontale Scrollfunktion für alle 52 Wochen */}
            <div className="w-full overflow-x-auto">
              <div style={{ width: `${52 * 40}px`, minWidth: '100%' }}>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart 
                    data={Array.from({ length: 52 }, (_, i) => {
                      const basisDurchsatz = 7000
                      const schwankung = Math.sin(i * 0.7) * 400
                      
                      return {
                        woche: `KW ${i + 1}`,
                        durchsatz: Math.round(basisDurchsatz + schwankung)
                      }
                    })}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="woche"
                      stroke="#666"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      label={{ value: 'Kalenderwoche', position: 'insideBottom', offset: -10, style: { fontWeight: 'bold' } }}
                    />
                    <YAxis 
                      stroke="#666"
                      label={{ value: 'Bikes pro Woche', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold', textAnchor: 'middle' } }}
                    />
                    <Tooltip 
                      formatter={(value: any) => {
                        if (typeof value === 'number') {
                          return formatNumber(value, 0) + ' Bikes'
                        }
                        return String(value)
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar
                      dataKey="durchsatz"
                      fill={COLORS.primary}
                      name="Wöchentliche Produktion"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}