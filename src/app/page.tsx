'use client'

/**
 * ========================================
 * DASHBOARD - ÜBERSICHTSSEITE
 * ========================================
 * 
 * Kompakte Übersichtsseite mit:
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
  Zap,
  ArrowRight
} from 'lucide-react'
import { useSzenarien } from '@/contexts/SzenarienContext'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { ActiveScenarioBanner } from '@/components/ActiveScenarioBanner'
import { CollapsibleInfo } from '@/components/ui/collapsible-info'

/**
 * Dashboard Hauptkomponente mit Szenarien-Integration und Live-Berechnungen
 */
export default function Dashboard() {
  const { getAktiveSzenarien } = useSzenarien()
  const { isInitialized } = useKonfiguration()
  const aktiveSzenarien = getAktiveSzenarien()
  
  if (!isInitialized) {
    return <div className="text-center py-8">Lade Dashboard...</div>
  }
  
  return (
    <div className="space-y-6">
      {/* Willkommens-Bereich */}
      <div>
        <h1 className="text-3xl font-bold">Supply Chain Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Übersicht über alle Funktionen
          {aktiveSzenarien.length > 0 && ' - Live-Berechnung mit aktiven Szenarien'}
        </p>
      </div>

      {/* Aktive Szenarien Banner */}
      <ActiveScenarioBanner showDetails={false} />

      {/* Aktive Szenarien Status - COLLAPSIBLE */}
      {aktiveSzenarien.length > 0 && (
        <CollapsibleInfo
          title={`Aktive Szenarien (${aktiveSzenarien.length})`}
          variant="success"
          icon={<Zap className="h-5 w-5" />}
          defaultOpen={true}
        >
          <p className="text-sm text-green-700 mb-4">
            Diese Szenarien wirken sich auf alle Berechnungen aus
          </p>
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
        </CollapsibleInfo>
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

import { LucideIcon } from 'lucide-react'

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
  icon: LucideIcon
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
