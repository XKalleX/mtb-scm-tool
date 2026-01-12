'use client'

/**
 * ========================================
 * DASHBOARD - ÜBERSICHTSSEITE
 * ========================================
 * 
 * Kompakte Übersichtsseite mit:
 * - Wichtige KPIs auf einen Blick
 * - Schnellzugriff auf alle Module
 * - Aktuelle Warnungen und Hinweise
 * - Aktive Szenarien Status
 * - Einstellungen/Konfiguration (global editierbar)
 */

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileSpreadsheet, 
  Download, 
  Factory,
  BarChart3,
  Package,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ArrowRight,
  Zap,
  Settings
} from 'lucide-react'
import { useSzenarien, berechneGlobaleAuswirkungen, BASELINE_WERTE } from '@/contexts/SzenarienContext'
import { useKonfiguration, STANDARD_KONFIGURATION } from '@/contexts/KonfigurationContext'
import { useMemo, useState } from 'react'
import { EinstellungenPanel } from '@/components/EinstellungenPanel'
import { formatNumber } from '@/lib/utils'

/**
 * Fallback-Wert für Arbeitstage wenn Konfiguration noch nicht geladen ist
 * Entspricht durchschnittlicher Anzahl Arbeitstage pro Jahr in Deutschland
 */
const DEFAULT_ARBEITSTAGE_FALLBACK = 252

/**
 * Dashboard Hauptkomponente mit Szenarien-Integration und Live-Berechnungen
 */
export default function Dashboard() {
  const { szenarien, getAktiveSzenarien } = useSzenarien()
  const { konfiguration, isInitialized, getArbeitstageProJahr } = useKonfiguration()
  const aktiveSzenarien = getAktiveSzenarien()
  const [showSettings, setShowSettings] = useState(false)
  
  // Berechne Auswirkungen der aktiven Szenarien in Echtzeit
  const auswirkungen = useMemo(() => {
    return berechneGlobaleAuswirkungen(aktiveSzenarien)
  }, [aktiveSzenarien])

  // Berechne Änderungen gegenüber Baseline
  // Nutze Konfiguration statt hardcodierter Werte
  const jahresproduktion = konfiguration.jahresproduktion
  
  // Berechne Produktionsmenge mit Szenarien-Effekten
  // Wenn Szenarien aktiv sind, skaliere den Effekt proportional zur konfigurierten Jahresproduktion
  const produktionsmenge = aktiveSzenarien.length > 0 
    ? Math.round(jahresproduktion * (auswirkungen.produktionsmenge / STANDARD_KONFIGURATION.jahresproduktion))
    : jahresproduktion

  const produktionsDiff = produktionsmenge - jahresproduktion
  const produktionsProzent = ((produktionsDiff / jahresproduktion) * 100).toFixed(1)
  const liefertreueDiff = auswirkungen.liefertreue - BASELINE_WERTE.liefertreue
  const liefertreueProzent = (liefertreueDiff).toFixed(1)

  // Arbeitstage aus Konfiguration berechnen
  const arbeitstage = isInitialized ? getArbeitstageProJahr() : DEFAULT_ARBEITSTAGE_FALLBACK

  // Spring Festival Daten aus Konfiguration
  const springFestival = konfiguration.feiertage.filter(f => f.name.includes('Spring Festival'))
  const springFestivalStart = springFestival.length > 0 ? springFestival[0].datum : '2027-01-28'
  const springFestivalEnde = springFestival.length > 0 ? springFestival[springFestival.length - 1].datum : '2027-02-04'

  // Vorlaufzeit aus Konfiguration (49 Tage gesamt)
  const gesamtVorlaufzeit = 49  // Fixiert auf 49 Tage gemäß SSOT

  // Peak-Monat aus Saisonalität ermitteln
  const peakMonat = konfiguration.saisonalitaet.reduce((max, s) => s.anteil > max.anteil ? s : max)
  
  if (!isInitialized) {
    return <div className="text-center py-8">Lade Dashboard...</div>
  }
  
  return (
    <div className="space-y-6">
      {/* Willkommens-Bereich mit Settings Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supply Chain Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Übersicht über alle wichtigen Kennzahlen und Funktionen
            {aktiveSzenarien.length > 0 && ' - Live-Berechnung mit aktiven Szenarien'}
          </p>
        </div>
        <Button
          variant={showSettings ? 'default' : 'outline'}
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4 mr-2" />
          {showSettings ? 'Einstellungen schließen' : 'Einstellungen öffnen'}
        </Button>
      </div>

      {/* Einstellungen Panel (einklappbar) */}
      {showSettings && <EinstellungenPanel />}

      {/* KPI Cards - Wichtigste Kennzahlen mit Live-Updates */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Jahresproduktion"
          value={formatNumber(produktionsmenge, 0)}
          unit="Bikes"
          icon={Factory}
          trend={aktiveSzenarien.length > 0 ? `${parseFloat(produktionsProzent) > 0 ? '+' : ''}${produktionsProzent}%` : undefined}
          trendUp={produktionsDiff >= 0}
        />
        <KPICard
          title="Produktionstage"
          value={arbeitstage.toString()}
          unit="Tage"
          icon={Calendar}
          trend="von 365"
          trendUp={true}
        />
        <KPICard
          title="Liefertreue"
          value={`${auswirkungen.liefertreue.toFixed(1)}%`}
          unit=""
          icon={TrendingUp}
          trend={aktiveSzenarien.length > 0 ? `${liefertreueDiff > 0 ? '+' : ''}${liefertreueProzent}%` : undefined}
          trendUp={liefertreueDiff >= 0}
        />
        <KPICard
          title="Materialverfügbarkeit"
          value={`${auswirkungen.materialverfuegbarkeit.toFixed(1)}%`}
          unit=""
          icon={Package}
          trend={aktiveSzenarien.length > 0 ? 'Live' : 'Baseline'}
          trendUp={auswirkungen.materialverfuegbarkeit >= 95}
        />
      </div>

      {/* Aktuelle Warnungen - dynamisch aus Konfiguration */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900">Wichtige Hinweise</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-orange-800">
            <li>• Spring Festival China: <strong>{new Date(springFestivalStart).toLocaleDateString('de-DE')} - {new Date(springFestivalEnde).toLocaleDateString('de-DE')}</strong> ({springFestival.length} Tage Produktionsstopp)</li>
            <li>• {peakMonat.name}-Peak: <strong>{peakMonat.anteil}%</strong> der Jahresproduktion (Kapazitätsplanung beachten)</li>
            <li>• China-Vorlaufzeit: <strong>{gesamtVorlaufzeit} Tage (7 Wochen)</strong> = {konfiguration.lieferant.vorlaufzeitArbeitstage} AT Produktion + 2 AT + {konfiguration.lieferant.vorlaufzeitKalendertage} KT Seefracht + 2 AT LKW</li>
            <li>• Losgröße Sättel: <strong>{formatNumber(konfiguration.lieferant.losgroesse, 0)} Stück</strong> (Mindestbestellung)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Aktive Szenarien Status */}
      {aktiveSzenarien.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-900">Aktive Szenarien ({aktiveSzenarien.length})</CardTitle>
            </div>
            <CardDescription className="text-green-700">
              Diese Szenarien wirken sich auf alle Berechnungen aus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aktiveSzenarien.map((szenario) => (
                <div key={szenario.id} className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
                  <span className="text-sm font-medium text-green-900">
                    {szenario.typ === 'marketingaktion' && '📈 Marketingaktion'}
                    {szenario.typ === 'maschinenausfall' && '🔧 China Produktionsausfall'}
                    {szenario.typ === 'wasserschaden' && '💧 Transport-Schaden'}
                    {szenario.typ === 'schiffsverspaetung' && '🚢 Schiffsverspätung'}
                  </span>
                  <span className="text-xs text-green-700">Aktiv</span>
                </div>
              ))}
            </div>
            <Link href="/szenarien">
              <Button variant="outline" className="w-full mt-4">
                <Zap className="h-4 w-4 mr-2" />
                Szenarien verwalten
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Modul-Navigation */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Module</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ModulCard
            title="OEM Programmplanung"
            description="Tagesgenaue Produktionsplanung für alle 8 MTB-Varianten mit Saisonalität"
            icon={FileSpreadsheet}
            href="/oem-programm"
            color="blue"
          />
          <ModulCard
            title="Inbound China"
            description="Lieferanten-Management, Bestellplanung und Vorlaufzeiten-Berechnung"
            icon={Download}
            href="/inbound"
            color="green"
          />
          <ModulCard
            title="Produktion"
            description="Produktionssteuerung, Schichtplanung und Kapazitätsmanagement"
            icon={Factory}
            href="/produktion"
            color="purple"
          />
          <ModulCard
            title="Reporting"
            description="SCOR-Metriken, KPIs und interaktive Visualisierungen"
            icon={BarChart3}
            href="/reporting"
            color="orange"
          />
          <ModulCard
            title="Szenarien"
            description="Simulieren Sie operative Störungen (global wirksam)"
            icon={Zap}
            href="/szenarien"
            color="purple"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * KPI Card Komponente
 * Zeigt eine einzelne Kennzahl mit Trend-Indikator
 */
function KPICard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend, 
  trendUp 
}: { 
  title: string
  value: string
  unit: string
  icon: any
  trend?: string
  trendUp: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{unit}</p>
        {trend && (
          <p className={`text-xs mt-2 ${trendUp ? 'text-green-600' : 'text-gray-600'}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Modul Card Komponente
 * Navigations-Card zu einem Modul mit Beschreibung
 */
function ModulCard({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  color 
}: { 
  title: string
  description: string
  icon: any
  href: string
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    green: 'bg-green-50 text-green-700 hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
    orange: 'bg-orange-50 text-orange-700 hover:bg-orange-100'
  }

  return (
    <Link href={href}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
            <Icon className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="ghost" className="w-full justify-between" asChild>
            <span>
              Öffnen
              <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}
