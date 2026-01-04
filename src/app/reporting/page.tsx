'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react'
import { formatNumber, formatPercent } from '@/lib/utils'

export default function ReportingPage() {
  // Beispiel SCOR-Metriken (später aus Berechnungen)
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
      <div>
        <h1 className="text-3xl font-bold">SCOR Metriken & Reporting</h1>
        <p className="text-muted-foreground mt-1">
          Key Performance Indicators - Reduziert ohne Outbound (Code-Lösung)
        </p>
      </div>

      {/* SCOR Übersicht */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">SCOR-Framework (reduziert)</CardTitle>
          <CardDescription className="text-blue-700">
            Supply Chain Operations Reference Model - Fokus auf Produktions- und Lager-KPIs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-800">
            Da diese Code-Lösung <strong>kein Outbound</strong> hat, konzentrieren sich die SCOR-Metriken 
            auf <strong>Reliability, Responsiveness, Agility, Costs und Assets</strong> innerhalb 
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