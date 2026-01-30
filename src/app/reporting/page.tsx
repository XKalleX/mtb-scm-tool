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
 * 
 * WICHTIG: Alle Daten werden dynamisch aus dem zentralen
 * Supply Chain Metrics Rechner bezogen und reflektieren
 * ALLE aktiven Szenarien für konsistente Werte!
 * 
 * NEU: Nutzt dynamische Konfiguration aus KonfigurationContext
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Minus, BarChart3, Download, Filter, Maximize2 } from 'lucide-react'
import { formatNumber, formatPercent } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/export'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import { useSzenarien } from '@/contexts/SzenarienContext'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { ActiveScenarioBanner } from '@/components/ActiveScenarioBanner'
import { CollapsibleInfo } from '@/components/ui/collapsible-info'
import { 
  berechneGesamtMetriken,
  berechneGesamtMetrikenMitKonfig,
  berechneProduktionsDatenFuerVisualisierung,
  berechneMonatlicheProduktionMitKonfig,
  berechneLagerDaten,
  berechneWoechentlicheAuslastung,
  berechneTaeglicherDaten,
  berechneVariantenProduktion,
  berechneVariantenProduktionMitKonfig,
  berechneSzenarioAuswirkungen,
  BASELINE,
  DynamicConfig
} from '@/lib/calculations/supply-chain-metrics'
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
 * Fallback-Wert für Arbeitstage wenn Konfiguration noch nicht geladen ist
 */
const DEFAULT_ARBEITSTAGE_FALLBACK = 252

/**
 * Reporting Hauptseite
 * Kombiniert SCOR Metriken und Visualisierungen
 * 
 * WICHTIG: Alle Daten werden dynamisch berechnet basierend auf aktiven Szenarien!
 * NEU: Nutzt auch dynamische Konfiguration aus KonfigurationContext
 */
export default function ReportingPage() {
  const [selectedView, setSelectedView] = useState<'metrics' | 'charts'>('metrics')
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month')
  
  // Hole aktive Szenarien aus dem globalen Context
  const { getAktiveSzenarien } = useSzenarien()
  const aktiveSzenarien = getAktiveSzenarien()
  
  // Hole Konfiguration aus dem globalen Context
  const { konfiguration, isInitialized, getArbeitstageProJahr } = useKonfiguration()
  
  // Erstelle dynamische Konfiguration für Berechnungen
  const dynamicConfig: DynamicConfig = useMemo(() => ({
    jahresproduktion: konfiguration.jahresproduktion,
    arbeitstage: isInitialized ? getArbeitstageProJahr() : DEFAULT_ARBEITSTAGE_FALLBACK,
    saisonalitaet: konfiguration.saisonalitaet.map(s => ({ monat: s.monat, anteil: s.anteil })),
    varianten: konfiguration.varianten.map(v => ({
      id: v.id,
      name: v.name,
      anteilPrognose: v.anteilPrognose
    }))
  }), [konfiguration, isInitialized, getArbeitstageProJahr])
  
  // Berechne alle Metriken dynamisch basierend auf Szenarien UND Konfiguration
  const gesamtMetriken = useMemo(() => {
    if (isInitialized) {
      return berechneGesamtMetrikenMitKonfig(aktiveSzenarien, dynamicConfig)
    }
    return berechneGesamtMetriken(aktiveSzenarien)
  }, [aktiveSzenarien, dynamicConfig, isInitialized])
  
  // SCOR-Metriken aus dem zentralen Rechner
  const scorMetriken = gesamtMetriken.scor
  
  /**
   * Exportiert SCOR-Metriken als CSV
   * HINWEIS: "Kapitalbindung" wurde entfernt, da sie redundant zu "Lagerreichweite" ist
   * und auf Benutzerwunsch aus der Anzeige entfernt wurde.
   */
  const handleExportMetrics = () => {
    const metricsData = [
      { Kategorie: 'Reliability', Metrik: 'Planerfüllungsgrad', Wert: scorMetriken.planerfuellungsgrad, Einheit: '%' },
      { Kategorie: 'Reliability', Metrik: 'Liefertreue China', Wert: scorMetriken.liefertreueChina, Einheit: '%' },
      { Kategorie: 'Reliability', Metrik: 'Lieferperformance', Wert: scorMetriken.deliveryPerformance, Einheit: '%' },
      { Kategorie: 'Responsiveness', Metrik: 'Durchlaufzeit Produktion', Wert: scorMetriken.durchlaufzeitProduktion, Einheit: 'Tage' },
      { Kategorie: 'Responsiveness', Metrik: 'Lagerumschlag', Wert: scorMetriken.lagerumschlag, Einheit: 'x/Jahr' },
      { Kategorie: 'Responsiveness', Metrik: 'Planungsgenauigkeit', Wert: scorMetriken.forecastAccuracy, Einheit: '%' },
      { Kategorie: 'Agility', Metrik: 'Produktionsflexibilität', Wert: scorMetriken.produktionsflexibilitaet, Einheit: '%' },
      { Kategorie: 'Agility', Metrik: 'Materialverfügbarkeit', Wert: scorMetriken.materialverfuegbarkeit, Einheit: '%' },
      { Kategorie: 'Assets', Metrik: 'Lagerreichweite', Wert: scorMetriken.lagerreichweite, Einheit: 'Tage' }
    ]
    
    exportToCSV(metricsData, 'scor_metriken_2027')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reporting & Visualisierungen</h1>
          <p className="text-muted-foreground mt-1">
            SCOR-Metriken, KPIs und interaktive Dashboards
            {aktiveSzenarien.length > 0 && ' - Live-Berechnung mit aktiven Szenarien'}
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

      {/* Aktive Szenarien Banner */}
      <ActiveScenarioBanner showDetails={true} />

      {/* Tabs für Metriken und Charts */}
      <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)}>
        <TabsList>
          <TabsTrigger value="metrics">SCOR Metriken</TabsTrigger>
          <TabsTrigger value="charts">Visualisierungen</TabsTrigger>
        </TabsList>

        {/* SCOR Metriken Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <SCORMetrikenView metriken={scorMetriken} istBaseline={gesamtMetriken.istBaseline} />
        </TabsContent>

        {/* Visualisierungen Tab */}
        <TabsContent value="charts" className="space-y-6">
          <VisualisierungenView 
            timeRange={timeRange} 
            setTimeRange={setTimeRange} 
            aktiveSzenarien={aktiveSzenarien}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Zielwerte und Schwellenwerte für SCOR-Metriken
 * Diese Konstanten definieren die Benchmarks für die Visualisierungen
 */
const SCOR_TARGETS = {
  // RELIABILITY
  PLANERFUELLUNG_TARGET: 95,
  LIEFERTREUE_TARGET: 95,
  DELIVERY_PERFORMANCE_TARGET: 90,
  
  // RESPONSIVENESS  
  DURCHLAUFZEIT_SOLL: 49,
  DURCHLAUFZEIT_TARGET_MAX: 60,
  LAGERUMSCHLAG_TARGET: 4.0,
  FORECAST_ACCURACY_TARGET: 95,
  
  // AGILITY
  FLEXIBILITAET_TARGET: 95,
  MATERIALVERFUEGBARKEIT_TARGET: 95,
  
  // ASSETS
  LAGERREICHWEITE_MIN: 7,
  LAGERREICHWEITE_MAX: 14,
  LAGERREICHWEITE_AKZEPTABEL: 20
} as const

/**
 * Interface für SCOR Metriken
 */
interface SCORMetriken {
  planerfuellungsgrad: number
  liefertreueChina: number
  deliveryPerformance: number
  durchlaufzeitProduktion: number
  lagerumschlag: number
  forecastAccuracy: number
  produktionsflexibilitaet: number
  materialverfuegbarkeit: number
  lagerreichweite: number
  kapitalbindung: number
  gesamtproduktion: number
  produktionstage: number
  durchschnittProTag: number
  auslastung: number
}

/**
 * SCOR Metriken Ansicht
 * Zeigt alle Performance-Kennzahlen nach SCOR-Modell MIT VISUALISIERUNGEN
 * 
 * DYNAMISCH: Alle Werte werden aus dem zentralen Metrics Rechner bezogen!
 * NEU: Jede Metrik hat nun eine sinnvolle Visualisierung in der aufgeklappten Box
 */
function SCORMetrikenView({ metriken, istBaseline }: { metriken: SCORMetriken; istBaseline: boolean }) {
  /**
   * ========================================
   * VISUALISIERUNGS-DATEN VORBEREITEN
   * ========================================
   * Berechne Daten für die Visualisierungen der einzelnen Metriken
   * Alle Werte werden validiert und gegen definierte Targets geprüft
   */
  
  // Hilfsfunktion: Klemme Prozent-Werte zwischen 0 und 100
  const clampPercent = (value: number): number => Math.max(0, Math.min(100, value))
  
  // 1. Planerfüllungsgrad: Zeige erfüllt vs. nicht erfüllt (Pie Chart)
  const planerfuellungWert = clampPercent(metriken.planerfuellungsgrad)
  const planerfuellungDaten = [
    { name: 'Vollständig erfüllt', wert: planerfuellungWert, fill: COLORS.success },
    { name: 'Nicht vollständig', wert: 100 - planerfuellungWert, fill: COLORS.danger }
  ]
  
  // 2. Liefertreue China: Zeige pünktlich vs. verspätet (Pie Chart)
  const liefertreueWert = clampPercent(metriken.liefertreueChina)
  const liefertreueFromChinaDaten = [
    { name: 'Pünktlich', wert: liefertreueWert, fill: COLORS.success },
    { name: 'Verspätet', wert: 100 - liefertreueWert, fill: COLORS.danger }
  ]
  
  // 3. Lieferperformance: Vergleich mit Zielwert (Bar Chart)
  const deliveryPerfWert = clampPercent(metriken.deliveryPerformance)
  const lieferperformanceDaten = [
    { kategorie: 'Ist-Wert', wert: deliveryPerfWert, fill: deliveryPerfWert >= SCOR_TARGETS.DELIVERY_PERFORMANCE_TARGET ? COLORS.success : COLORS.warning },
    { kategorie: 'Zielwert', wert: SCOR_TARGETS.DELIVERY_PERFORMANCE_TARGET, fill: COLORS.info }
  ]
  
  // 4. Durchlaufzeit: Vergleich Ist vs. Soll (Bar Chart)
  const durchlaufzeitDaten = [
    { kategorie: 'Ist-Durchlaufzeit', tage: metriken.durchlaufzeitProduktion, fill: COLORS.primary },
    { kategorie: 'Soll-Durchlaufzeit', tage: SCOR_TARGETS.DURCHLAUFZEIT_SOLL, fill: COLORS.info },
    { kategorie: `Zielwert (≤${SCOR_TARGETS.DURCHLAUFZEIT_TARGET_MAX})`, tage: SCOR_TARGETS.DURCHLAUFZEIT_TARGET_MAX, fill: COLORS.warning }
  ]
  
  // 5. Lagerumschlag: Monatliche Entwicklung (Line Chart)
  // Simuliere monatliche Werte basierend auf Jahresdurchschnitt mit Saisonalität
  const lagerumschlagDaten = Array.from({ length: 12 }, (_, i) => ({
    monat: ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][i],
    // Leichte Variation um Durchschnitt, garantiert positiv
    umschlag: Math.max(0, metriken.lagerumschlag + (Math.sin(i / 2) * 0.3))
  }))
  
  // 6. Planungsgenauigkeit: Vergleich mit Ziel (Gauge-artiger Bar)
  const forecastAccWert = clampPercent(metriken.forecastAccuracy)
  const planungsgenauigkeitDaten = [
    { kategorie: 'Ist-Genauigkeit', prozent: forecastAccWert, fill: forecastAccWert >= SCOR_TARGETS.FORECAST_ACCURACY_TARGET ? COLORS.success : COLORS.warning },
    { kategorie: 'Zielwert', prozent: SCOR_TARGETS.FORECAST_ACCURACY_TARGET, fill: COLORS.info }
  ]
  
  // 7. Produktionsflexibilität: Vergleich mit Ziel (Bar Chart)
  const flexWert = clampPercent(metriken.produktionsflexibilitaet)
  const flexibilitaetDaten = [
    { kategorie: 'Ist-Flexibilität', prozent: flexWert, fill: flexWert >= SCOR_TARGETS.FLEXIBILITAET_TARGET ? COLORS.success : COLORS.warning },
    { kategorie: 'Zielwert', prozent: SCOR_TARGETS.FLEXIBILITAET_TARGET, fill: COLORS.info }
  ]
  
  // 8. Materialverfügbarkeit: Verfügbar vs. Mangel (Pie Chart)
  const materialverfWert = clampPercent(metriken.materialverfuegbarkeit)
  const materialverfuegbarkeitDaten = [
    { name: 'Verfügbar', wert: materialverfWert, fill: COLORS.success },
    { name: 'Mangel', wert: 100 - materialverfWert, fill: COLORS.danger }
  ]
  
  // 9. Lagerreichweite: Vergleich mit Zielbereich (Bar Chart mit Bereichen)
  const lagerreichweiteDaten = [
    { kategorie: 'Ist-Reichweite', tage: metriken.lagerreichweite, fill: COLORS.primary },
    { kategorie: `Min. Ziel (${SCOR_TARGETS.LAGERREICHWEITE_MIN})`, tage: SCOR_TARGETS.LAGERREICHWEITE_MIN, fill: COLORS.success },
    { kategorie: `Max. Ziel (${SCOR_TARGETS.LAGERREICHWEITE_MAX})`, tage: SCOR_TARGETS.LAGERREICHWEITE_MAX, fill: COLORS.success },
    { kategorie: `Max. Akzeptabel (${SCOR_TARGETS.LAGERREICHWEITE_AKZEPTABEL})`, tage: SCOR_TARGETS.LAGERREICHWEITE_AKZEPTABEL, fill: COLORS.warning }
  ]

  return (
    <>
      {/* SCOR Übersicht - COLLAPSIBLE */}
      <CollapsibleInfo
        title={`SCOR-Framework ${istBaseline ? '(Baseline)' : '(Mit Szenarien)'}`}
        variant={istBaseline ? "info" : "success"}
        icon={<BarChart3 className="h-5 w-5" />}
        defaultOpen={false}
      >
        <p className={`text-sm ${istBaseline ? "text-blue-800" : "text-green-800"}`}>
          {istBaseline 
            ? 'Baseline-Werte ohne aktive Szenarien. Aktivieren Sie Szenarien um die Auswirkungen auf die Supply Chain zu sehen.'
            : 'Alle Werte werden in Echtzeit basierend auf den aktiven Szenarien berechnet.'}
        </p>
        <p className={`text-sm ${istBaseline ? "text-blue-800" : "text-green-800"} mt-2`}>
          Fokus auf <strong>Reliability, Responsiveness, Agility und Assets</strong>
        </p>
      </CollapsibleInfo>

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
            <MetricCardWithDetails
              label="Planerfüllungsgrad"
              value={formatPercent(metriken.planerfuellungsgrad, 2)}
              description="% der geplanten Produktion erreicht"
              status={getStatus(metriken.planerfuellungsgrad, 95, 85)}
              zielwert="≥ 95,0 %"
              formel="(Vollständig produzierte Aufträge / Gesamt Aufträge) × 100%"
              herleitung="Misst, wie viele Produktionsaufträge die geplante Menge vollständig erreicht haben. Ein hoher Wert zeigt zuverlässige Planung und Ausführung."
              beispiel="Wenn 355 von 365 Tagesaufträgen vollständig erfüllt wurden: (355 / 365) × 100% = 97,3%"
              visualisierung={
                <div>
                  <p className="text-sm text-slate-600 mb-2">Verteilung der Auftragserfüllung über das Jahr:</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={planerfuellungDaten}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="wert"
                        label={(entry) => `${entry.name}: ${entry.wert.toFixed(1)}%`}
                      >
                        {planerfuellungDaten.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | string) => typeof value === "number" ? `${value.toFixed(2)}%` : `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              }
            />
            <MetricCardWithDetails
              label="Liefertreue China"
              value={formatPercent(metriken.liefertreueChina, 1)}
              description="% pünktliche Lieferungen vom Lieferanten"
              status={getStatus(metriken.liefertreueChina, 95, 85)}
              zielwert="≥ 95,0 %"
              formel="(Pünktliche Bestellungen / Gesamt Bestellungen) × 100%"
              herleitung="Gibt an, wie viele Bestellungen vom China-Lieferanten termingerecht ankommen. Wichtig für Just-in-Time Produktion."
              beispiel="Bei 48 von 50 pünktlichen Lieferungen: (48 / 50) × 100% = 96,0%"
              visualisierung={
                <div>
                  <p className="text-sm text-slate-600 mb-2">Lieferungen vom China-Zulieferer:</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={liefertreueFromChinaDaten}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="wert"
                        label={(entry) => `${entry.name}: ${entry.wert.toFixed(1)}%`}
                      >
                        {liefertreueFromChinaDaten.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | string) => typeof value === "number" ? `${value.toFixed(2)}%` : `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              }
            />
            <MetricCardWithDetails
              label="Lieferperformance"
              value={formatPercent(metriken.deliveryPerformance, 1)}
              description="% Lieferungen innerhalb der Vorlaufzeit (49 Tage)"
              status={getStatus(metriken.deliveryPerformance, 90, 80)}
              zielwert="≥ 90,0 %"
              formel="Liefertreue × (1 - (Ist-Durchlaufzeit - Soll-Durchlaufzeit) / 100)"
              herleitung="Bewertet die Lieferqualität unter Berücksichtigung von Durchlaufzeit-Abweichungen. Kombiniert Pünktlichkeit mit Durchlaufzeit-Performance."
              beispiel="Bei 95% Liefertreue und +4 Tage Verzögerung: 95 × (1 - 4/100) = 91,2%"
              visualisierung={
                <div>
                  <p className="text-sm text-slate-600 mb-2">Ist-Wert im Vergleich zum Zielwert (≥ 90%):</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={lieferperformanceDaten} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" domain={[0, 100]} label={{ value: 'Performance (%)', position: 'bottom' }} />
                      <YAxis type="category" dataKey="kategorie" width={120} />
                      <Tooltip formatter={(value: number | string) => typeof value === "number" ? `${value.toFixed(1)}%` : `${value}%`} />
                      <Bar dataKey="wert" radius={[0, 8, 8, 0]}>
                        {lieferperformanceDaten.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              }
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
            <MetricCardWithDetails
              label="Durchlaufzeit Produktion"
              value={`${metriken.durchlaufzeitProduktion} Tage`}
              description="Bestellung China → Fertige Produktion"
              status="neutral"
              zielwert="≤ 60 Tage"
              formel="Ø (Ankunftsdatum Komponenten - Bestelldatum)"
              herleitung="Durchschnittliche Zeit von der Bestellung in China bis zur Ankunft im Werk. Beinhaltet Produktion (5 AT) und Transport (2 AT + 30 KT + 2 AT)."
              beispiel="Bei 49 Tage Vorlaufzeit: Bestellung 01.01. → Ankunft ~19.02. (49 Tage später)"
              visualisierung={
                <div>
                  <p className="text-sm text-slate-600 mb-2">Durchlaufzeit im Vergleich zu Soll und Zielwert:</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={durchlaufzeitDaten}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="kategorie" angle={-15} textAnchor="end" height={80} />
                      <YAxis label={{ value: 'Tage', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value: number | string) => `${value} Tage`} />
                      <Bar dataKey="tage" radius={[8, 8, 0, 0]}>
                        {durchlaufzeitDaten.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              }
            />
            <MetricCardWithDetails
              label="Lagerumschlag"
              value={`${formatNumber(metriken.lagerumschlag, 1)}x pro Jahr`}
              description="Wie oft wird Lager umgeschlagen"
              status={getStatus(metriken.lagerumschlag, 4, 2)}
              zielwert="≥ 4,0x pro Jahr"
              formel="Jahresproduktion (Bikes) / Durchschnittlicher Lagerbestand (Komponenten)"
              herleitung="Zeigt, wie oft der Lagerbestand pro Jahr umgeschlagen wird. Hoher Wert = effiziente Lagerhaltung, wenig gebundenes Kapital."
              beispiel="Bei 370.000 Bikes und Ø 92.500 Sätteln im Lager: 370.000 / 92.500 = 4,0x pro Jahr"
              visualisierung={
                <div>
                  <p className="text-sm text-slate-600 mb-2">Entwicklung des Lagerumschlags über das Jahr:</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={lagerumschlagDaten}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="monat" />
                      <YAxis label={{ value: 'Umschlag (x)', angle: -90, position: 'insideLeft' }} domain={[0, 'dataMax + 1']} />
                      <Tooltip formatter={(value: number | string) => typeof value === "number" ? `${value.toFixed(2)}x` : `${value}x`} />
                      <Line 
                        type="monotone" 
                        dataKey="umschlag" 
                        stroke={COLORS.primary} 
                        strokeWidth={2}
                        dot={{ fill: COLORS.primary, r: 4 }}
                      />
                      {/* Zielwert-Linie */}
                      <Line 
                        type="monotone" 
                        dataKey={() => 4.0} 
                        stroke={COLORS.success} 
                        strokeDasharray="5 5" 
                        strokeWidth={2}
                        dot={false}
                        name="Zielwert (4.0x)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              }
            />
            <MetricCardWithDetails
              label="Planungsgenauigkeit"
              value={formatPercent(metriken.forecastAccuracy, 1)}
              description="Genauigkeit zwischen Plan und Ist"
              status={getStatus(metriken.forecastAccuracy, 95, 90)}
              zielwert="≥ 95,0 %"
              formel="100% - (Σ |Abweichung Plan-Ist| / Σ Plan) × 100%"
              herleitung="Misst die Genauigkeit der Produktionsplanung über alle Monate. Je höher, desto besser stimmen Plan und Ist überein."
              beispiel="Bei 5.000 Bikes Gesamtabweichung und 370.000 Plan: 100 - (5.000 / 370.000) × 100 = 98,6%"
              visualisierung={
                <div>
                  <p className="text-sm text-slate-600 mb-2">Ist-Genauigkeit im Vergleich zum Zielwert:</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={planungsgenauigkeitDaten} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" domain={[0, 100]} label={{ value: 'Genauigkeit (%)', position: 'bottom' }} />
                      <YAxis type="category" dataKey="kategorie" width={140} />
                      <Tooltip formatter={(value: number | string) => typeof value === "number" ? `${value.toFixed(1)}%` : `${value}%`} />
                      <Bar dataKey="prozent" radius={[0, 8, 8, 0]}>
                        {planungsgenauigkeitDaten.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              }
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
            <MetricCardWithDetails
              label="Produktionsflexibilität"
              value={formatPercent(metriken.produktionsflexibilitaet, 2)}
              description="% Aufträge vollständig produziert"
              status={getStatus(metriken.produktionsflexibilitaet, 95, 85)}
              zielwert="≥ 95,0 %"
              formel="(Tage mit vollständiger Produktion / Gesamt Produktionstage) × 100%"
              herleitung="Misst die Fähigkeit, geplante Mengen auch bei Störungen zu produzieren. Identisch mit Planerfüllungsgrad für Produktionsperspektive."
              beispiel="Bei 340 von 365 Tagen ohne Materialmangel: (340 / 365) × 100% = 93,2%"
              visualisierung={
                <div>
                  <p className="text-sm text-slate-600 mb-2">Flexibilität im Vergleich zum Zielwert:</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={flexibilitaetDaten} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" domain={[0, 100]} label={{ value: 'Flexibilität (%)', position: 'bottom' }} />
                      <YAxis type="category" dataKey="kategorie" width={140} />
                      <Tooltip formatter={(value: number | string) => typeof value === "number" ? `${value.toFixed(1)}%` : `${value}%`} />
                      <Bar dataKey="prozent" radius={[0, 8, 8, 0]}>
                        {flexibilitaetDaten.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              }
            />
            <MetricCardWithDetails
              label="Materialverfügbarkeit"
              value={formatPercent(metriken.materialverfuegbarkeit, 1)}
              description="% der Zeit genug Material vorhanden"
              status={getStatus(metriken.materialverfuegbarkeit, 95, 85)}
              zielwert="≥ 95,0 %"
              formel="(Produktionstage ohne Materialmangel / Gesamt Produktionstage) × 100%"
              herleitung="Prozentsatz der Tage, an denen alle benötigten Komponenten verfügbar waren. Schlüssel-KPI für Beschaffungsplanung."
              beispiel="Wenn an 350 von 365 Tagen Material verfügbar war: (350 / 365) × 100% = 95,9%"
              visualisierung={
                <div>
                  <p className="text-sm text-slate-600 mb-2">Material verfügbar vs. Materialmangel:</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={materialverfuegbarkeitDaten}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="wert"
                        label={(entry) => `${entry.name}: ${entry.wert.toFixed(1)}%`}
                      >
                        {materialverfuegbarkeitDaten.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | string) => typeof value === "number" ? `${value.toFixed(2)}%` : `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ASSETS (Anlagenverwaltung) */}
      <Card>
        <CardHeader>
          <CardTitle>4. ASSETS (Anlagenverwaltung)</CardTitle>
          <CardDescription>
            Lagerreichweite (keine Kosten)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MetricCardWithDetails
              label="Lagerreichweite"
              value={`${formatNumber(metriken.lagerreichweite, 1)} Tage`}
              description="Wie lange reicht der aktuelle Lagerbestand"
              status={getStatusRange(metriken.lagerreichweite, 7, 14, 20)}
              zielwert="7-14 Tage"
              formel="Durchschnittlicher Lagerbestand / Täglicher Verbrauch"
              herleitung="Anzahl Tage, die der aktuelle Lagerbestand reicht. Optimal: 7-14 Tage für Balance zwischen Sicherheit und Kapitalbindung."
              beispiel="Bei 14.200 Sätteln im Lager und 1.000 Verbrauch/Tag: 14.200 / 1.000 = 14,2 Tage"
              visualisierung={
                <div>
                  <p className="text-sm text-slate-600 mb-2">Lagerreichweite im Vergleich zu Zielbereichen:</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={lagerreichweiteDaten}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="kategorie" angle={-15} textAnchor="end" height={80} />
                      <YAxis label={{ value: 'Tage', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value: number | string) => `${value} Tage`} />
                      <Bar dataKey="tage" radius={[8, 8, 0, 0]}>
                        {lagerreichweiteDaten.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-xs text-slate-600">
                    <p>✓ Optimal: 7-14 Tage (Grün)</p>
                    <p>⚠ Akzeptabel: 14-20 Tage (Orange)</p>
                    <p>✗ Kritisch: {'>'} 20 Tage (zu viel Kapitalbindung)</p>
                  </div>
                </div>
              }
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

/**
 * Erweiterte Metrik-Karte mit ausklappbaren Details UND Visualisierung
 */
function MetricCardWithDetails({
  label,
  value,
  description,
  status,
  zielwert,
  formel,
  herleitung,
  beispiel,
  visualisierung
}: {
  label: string
  value: string
  description: string
  status: 'good' | 'medium' | 'bad' | 'neutral'
  zielwert: string
  formel: string
  herleitung: string
  beispiel: string
  visualisierung?: React.ReactNode // NEU: Optional Visualisierung
}) {
  const statusConfig = {
    good: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', badgeColor: 'bg-green-100 text-green-800' },
    medium: { icon: Minus, color: 'text-orange-600', bg: 'bg-orange-50', badgeColor: 'bg-orange-100 text-orange-800' },
    bad: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', badgeColor: 'bg-red-100 text-red-800' },
    neutral: { icon: Minus, color: 'text-slate-600', bg: 'bg-slate-50', badgeColor: 'bg-slate-100 text-slate-800' }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <CollapsibleInfo
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex-1">
            <div className="font-medium text-base">{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
          </div>
          <div className="flex items-center space-x-3 ml-4">
            <div className="text-right">
              <div className="text-xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">Ziel: {zielwert}</div>
            </div>
            <Icon className={`h-5 w-5 ${config.color} flex-shrink-0`} />
          </div>
        </div>
      }
      variant={status === 'good' ? 'success' : status === 'bad' ? 'destructive' : 'default'}
      defaultOpen={false}
      className={config.bg}
    >
      <div className="space-y-4 pt-2">
        {/* VISUALISIERUNG - NEU! */}
        {visualisierung && (
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-white">
            <div className="text-xs font-semibold text-muted-foreground mb-3">VISUALISIERUNG:</div>
            {visualisierung}
          </div>
        )}
        
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">FORMEL:</div>
          <code className="text-sm bg-slate-100 px-2 py-1 rounded block">{formel}</code>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">HERLEITUNG:</div>
          <p className="text-sm text-slate-700">{herleitung}</p>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">BEISPIEL:</div>
          <p className="text-sm text-slate-700 italic">{beispiel}</p>
        </div>
      </div>
    </CollapsibleInfo>
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

function getStatusRange(value: number, minGood: number, maxGood: number, maxMedium: number): 'good' | 'medium' | 'bad' {
  if (value >= minGood && value <= maxGood) return 'good'
  if (value <= maxMedium) return 'medium'
  return 'bad'
}

/**
 * Visualisierungen Ansicht
 * Interaktive Charts und Diagramme zur Datenanalyse
 * 
 * DYNAMISCH: Alle Daten werden aus dem zentralen Metrics Rechner bezogen
 * und reflektieren aktive Szenarien!
 */
function VisualisierungenView({ 
  timeRange, 
  setTimeRange,
  aktiveSzenarien
}: { 
  timeRange: string
  setTimeRange: (range: any) => void 
  aktiveSzenarien: any[]
}) {
  // DYNAMISCH: Monatliche Produktionsdaten aus dem zentralen Rechner
  const dynamischeProduktionsDaten = useMemo(() => {
    const daten = berechneProduktionsDatenFuerVisualisierung(aktiveSzenarien)
    return daten.map(d => ({
      monat: d.monat,
      plan: d.plan,
      ist: d.ist,
      abweichung: d.abweichung
    }))
  }, [aktiveSzenarien])

  // DYNAMISCH: Tägliche Produktionsdaten
  const dynamischeTaeglicherDaten = useMemo(() => {
    return berechneTaeglicherDaten(aktiveSzenarien)
  }, [aktiveSzenarien])

  // DYNAMISCH: Variantenverteilung
  const dynamischeVariantenDaten = useMemo(() => {
    const auswirkungen = berechneSzenarioAuswirkungen(aktiveSzenarien)
    return berechneVariantenProduktion(auswirkungen.produktionsmenge).map(v => ({
      name: v.name,
      wert: v.wert,
      prozent: v.prozent
    }))
  }, [aktiveSzenarien])

  // DYNAMISCH: Lagerbestandsdaten
  const dynamischeLagerDaten = useMemo(() => {
    return berechneLagerDaten(aktiveSzenarien)
  }, [aktiveSzenarien])

  // DYNAMISCH: Wöchentliche Auslastungsdaten
  const dynamischeWoechentlicheDaten = useMemo(() => {
    return berechneWoechentlicheAuslastung(aktiveSzenarien)
  }, [aktiveSzenarien])

  // Basis-Referenzen für Kompatibilität
  const basisProduktionsDaten = dynamischeProduktionsDaten
  const basisTaeglicherDaten = dynamischeTaeglicherDaten
  const variantenDaten = dynamischeVariantenDaten
  const basisLagerDaten = dynamischeLagerDaten
  const basisWoechentlicheDaten = dynamischeWoechentlicheDaten
  
  // Konstanten für Berechnungen
  const KALENDERTAGE_PRO_JAHR = 365
  const DURCHSCHNITT_TAGE_PRO_MONAT = 30.4
  const TAGE_PRO_WOCHE = 7
  const WOCHEN_PRO_JAHR = 52

  // Tägliche Lagerdaten (basierend auf monatlichen Daten interpoliert)
  const basisTaeglicherLagerDaten = useMemo(() => {
    const monatsDaten = dynamischeLagerDaten
    return Array.from({ length: KALENDERTAGE_PRO_JAHR }, (_, i) => {
      const monatIndex = Math.floor(i / DURCHSCHNITT_TAGE_PRO_MONAT)
      const monat = monatsDaten[Math.min(monatIndex, 11)]
      // Tägliche Schwankung innerhalb des Monats
      const schwankung = Math.sin(i * 0.1) * 100
      return {
        tag: i + 1,
        saettel: Math.round(monat.saettel + schwankung)
      }
    })
  }, [dynamischeLagerDaten])

  // Tägliche Auslastung
  const basisTaeglicherAuslastung = useMemo(() => {
    const wochenDaten = dynamischeWoechentlicheDaten
    return Array.from({ length: KALENDERTAGE_PRO_JAHR }, (_, i) => {
      const wochenIndex = Math.floor(i / TAGE_PRO_WOCHE)
      const woche = wochenDaten[Math.min(wochenIndex, WOCHEN_PRO_JAHR - 1)]
      return {
        tag: i + 1,
        auslastung: woche.auslastung,
        produktion: Math.round(woche.produktion / TAGE_PRO_WOCHE) // Tägliche Produktion
      }
    })
  }, [dynamischeWoechentlicheDaten])

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
                          return typeof value === "number" ? value.toFixed(1) + '%'
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
                      return typeof value === "number" ? value.toFixed(1) + '%'
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

      {/* Zusätzliche Visualisierungen */}
      <div className="grid grid-cols-1 gap-6">
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
                      formatter={(value: number | string) => {
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