'use client'

/**
 * ========================================
 * PRODUKTION & WAREHOUSE
 * ========================================
 * 
 * Produktionssteuerung mit:
 * - ATP-Check (Available-to-Promise)
 * - First-Come-First-Serve Regel
 * - Lagerbestandsmanagement
 * - Materialfluss-Visualisierung
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Factory, AlertTriangle, TrendingUp, Package, Download } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/export'
import ExcelTable, { FormulaCard } from '@/components/excel-table'

/**
 * Produktion Hauptseite
 * Zeigt Produktionsstatus und Lagerbestände mit Excel-Tabellen
 */
export default function ProduktionPage() {
  // Beispiel-Daten (später aus State/Context)
  const produktionsStats = {
    geplant: 185000,
    produziert: 184750,
    planerfuellungsgrad: 99.86,
    mitMaterialmangel: 12,
    auslastung: 95.5
  }

  const lagerbestaende = [
    { komponente: 'Rahmen_Allrounder', bestand: 5200, sicherheit: 1000, bedarf: 4500, status: 'ok' },
    { komponente: 'Rahmen_Competition', bestand: 3800, sicherheit: 1000, bedarf: 3200, status: 'ok' },
    { komponente: 'Gabel_Fox32', bestand: 4500, sicherheit: 1000, bedarf: 3800, status: 'ok' },
    { komponente: 'Gabel_RockShox', bestand: 750, sicherheit: 1000, bedarf: 1200, status: 'kritisch' },
    { komponente: 'Sattel_Standard', bestand: 6100, sicherheit: 1000, bedarf: 5000, status: 'ok' },
    { komponente: 'Sattel_Premium', bestand: 850, sicherheit: 1000, bedarf: 900, status: 'kritisch' },
  ]
  
  // Wöchentliche Produktionsdaten für Excel-Tabelle (deterministisch)
  const wochenProduktion = Array.from({ length: 12 }, (_, i) => {
    const kw = i + 1
    // Deterministisches Muster basierend auf typischer Produktion
    const baseMenge = 7000
    const variation = Math.sin(kw * 0.5) * 500 // Sinuswelle für natürliche Variation
    const planMenge = Math.round(baseMenge + variation)
    
    // Kleinere deterministische Abweichung
    const istMenge = Math.round(planMenge * (0.98 + (kw % 3) * 0.01))
    const materialVerfuegbar = istMenge === planMenge
    const auslastung = (istMenge / planMenge) * 100
    
    return {
      kw,
      planMenge,
      istMenge,
      abweichung: istMenge - planMenge,
      materialVerfuegbar,
      auslastung: Math.round(auslastung * 10) / 10
    }
  })
  
  /**
   * Exportiert Lagerbestände als CSV
   */
  const handleExportLager = () => {
    const data = lagerbestaende.map(l => ({
      Komponente: l.komponente.replace(/_/g, ' '),
      Bestand: l.bestand,
      Sicherheitsbestand: l.sicherheit,
      Verfügbar: l.bestand - l.sicherheit,
      Status: l.status
    }))
    
    exportToCSV(data, 'lagerbestand_2027')
  }
  
  /**
   * Exportiert Produktionsstatistik als JSON
   */
  const handleExportProduktion = () => {
    exportToJSON(produktionsStats, 'produktions_statistik_2027')
  }

  return (
    <div className="space-y-6">
      {/* Header mit Export */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produktion & Warehouse</h1>
          <p className="text-muted-foreground mt-1">
            Produktionssteuerung ohne Solver - First-Come-First-Serve Regel
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportLager}>
            <Download className="h-4 w-4 mr-2" />
            Export Lager
          </Button>
          <Button variant="outline" onClick={handleExportProduktion}>
            <Download className="h-4 w-4 mr-2" />
            Export Produktion
          </Button>
        </div>
      </div>

      {/* Übersicht Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Geplante Produktion</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(produktionsStats.geplant, 0)}</div>
            <p className="text-xs text-muted-foreground">MTBs Jahresplan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Tatsächlich produziert</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(produktionsStats.produziert, 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(produktionsStats.planerfuellungsgrad, 2)}% Planerfüllung
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Materialmangel</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{produktionsStats.mitMaterialmangel}</div>
            <p className="text-xs text-muted-foreground">Aufträge betroffen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Auslastung</CardTitle>
              <Factory className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(produktionsStats.auslastung, 1)}%</div>
            <p className="text-xs text-muted-foreground">Kapazitätsauslastung</p>
          </CardContent>
        </Card>
      </div>

      {/* Produktionslogik ohne Solver */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Factory className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">Produktionslogik (ohne Solver)</CardTitle>
          </div>
          <CardDescription className="text-blue-700">
            Code-Lösung Ermäßigung: Einfache First-Come-First-Serve Regel statt mathematischer Optimierung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">FCFS-Regel (First-Come-First-Serve):</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>
                <strong>Schritt 1: ATP-Check</strong> - Prüfe für jeden Produktionsauftrag: 
                Ist genug Material im Lager?
              </li>
              <li>
                <strong>Schritt 2a: JA</strong> - Produziere die volle Menge & buche Material ab
              </li>
              <li>
                <strong>Schritt 2b: NEIN</strong> - Auftrag zurückstellen oder Teilproduktion
              </li>
              <li>
                <strong>Keine Optimierung:</strong> Kein Solver, keine Prioritäten nach Deckungsbeitrag
              </li>
            </ol>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">ATP-Check (Available-to-Promise):</h4>
            <p className="text-sm text-blue-800">
              Für jede Komponente in der Stückliste wird geprüft:<br/>
              <code className="bg-blue-100 px-2 py-1 rounded">
                Verfügbar im Lager ≥ Benötigt für Auftrag
              </code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Wöchentliche Produktionsplanung mit Excel-Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle>Wöchentliche Produktionsplanung (Beispiel Q1)</CardTitle>
          <CardDescription>
            Detaillierte Produktionsplanung mit ATP-Check und Auslastung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Formel-Karte */}
          <div className="mb-6">
            <FormulaCard
              title="Produktionsauslastung"
              formula="Auslastung (%) = (Ist-Menge / Plan-Menge) × 100"
              description="Zeigt die tatsächliche Produktionsleistung im Verhältnis zur Planung"
              example="KW 1: 7.100 / 7.200 = 98,6% Auslastung"
            />
          </div>

          {/* Excel-Tabelle */}
          <ExcelTable
            columns={[
              {
                key: 'kw',
                label: 'KW',
                width: '60px',
                align: 'center'
              },
              {
                key: 'planMenge',
                label: 'Plan-Menge',
                width: '120px',
                align: 'right',
                format: (val) => formatNumber(val, 0) + ' Bikes'
              },
              {
                key: 'istMenge',
                label: 'Ist-Menge',
                width: '120px',
                align: 'right',
                format: (val) => formatNumber(val, 0) + ' Bikes'
              },
              {
                key: 'abweichung',
                label: 'Abweichung',
                width: '110px',
                align: 'right',
                formula: 'Ist - Plan',
                format: (val) => {
                  const sign = val >= 0 ? '+' : ''
                  return sign + formatNumber(val, 0)
                }
              },
              {
                key: 'materialVerfuegbar',
                label: 'Material OK',
                width: '110px',
                align: 'center',
                formula: 'ATP-Check',
                format: (val) => val ? '✓ Ja' : '✗ Nein'
              },
              {
                key: 'auslastung',
                label: 'Auslastung',
                width: '110px',
                align: 'right',
                formula: '(Ist / Plan) × 100',
                format: (val) => formatNumber(val, 1) + ' %'
              }
            ]}
            data={wochenProduktion}
            maxHeight="400px"
            showFormulas={true}
          />
        </CardContent>
      </Card>

      {/* Lagerbestand */}
      <Card>
        <CardHeader>
          <CardTitle>Aktueller Lagerbestand</CardTitle>
          <CardDescription>
            Komponentenverfügbarkeit mit Sicherheitsbeständen (Excel-ähnliche Darstellung)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Formel-Karte */}
          <div className="mb-6">
            <FormulaCard
              title="ATP-Check Formel (Available-to-Promise)"
              formula="ATP = Verfügbarer Bestand - Sicherheitsbestand ≥ Bedarf"
              description="Vor jeder Produktion wird geprüft, ob genug Material verfügbar ist."
              example="Gabel_Fox32F100: 5.200 - 1.000 = 4.200 verfügbar ✓"
            />
          </div>

          {/* Excel-ähnliche Tabelle */}
          <ExcelTable
            columns={[
              {
                key: 'komponente',
                label: 'Komponente',
                width: '200px',
                format: (val) => val.replace(/_/g, ' ')
              },
              {
                key: 'bestand',
                label: 'Bestand',
                width: '120px',
                align: 'right',
                format: (val) => formatNumber(val, 0)
              },
              {
                key: 'sicherheit',
                label: 'Sicherheitsbestand',
                width: '150px',
                align: 'right',
                format: (val) => formatNumber(val, 0)
              },
              {
                key: 'bedarf',
                label: 'Wochenbedarf',
                width: '130px',
                align: 'right',
                format: (val) => formatNumber(val, 0)
              },
              {
                key: 'verfuegbar',
                label: 'Verfügbar (ATP)',
                width: '140px',
                align: 'right',
                formula: 'Bestand - Sicherheitsbestand',
                format: (val) => formatNumber(val, 0)
              },
              {
                key: 'reichweite',
                label: 'Reichweite',
                width: '110px',
                align: 'right',
                formula: 'Verfügbar / Wochenbedarf',
                format: (val) => formatNumber(val, 1) + ' Wo.'
              },
              {
                key: 'status',
                label: 'Status',
                width: '100px',
                align: 'center',
                format: (val) => val === 'ok' 
                  ? '✓ OK' 
                  : '⚠ Kritisch'
              }
            ]}
            data={lagerbestaende.map(l => ({
              komponente: l.komponente,
              bestand: l.bestand,
              sicherheit: l.sicherheit,
              bedarf: l.bedarf,
              verfuegbar: l.bestand - l.sicherheit,
              reichweite: (l.bestand - l.sicherheit) / l.bedarf,
              status: l.status
            }))}
            maxHeight="400px"
            showFormulas={true}
          />
        </CardContent>
      </Card>

      {/* Materialfluss */}
      <Card>
        <CardHeader>
          <CardTitle>Materialfluss-Diagramm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="text-center">
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
                Bestellung China
              </div>
              <div className="text-xs text-muted-foreground mt-1">21 AT + 35 KT</div>
            </div>
            
            <div className="text-2xl">→</div>
            
            <div className="text-center">
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold">
                Lager (Eingang)
              </div>
              <div className="text-xs text-muted-foreground mt-1">Buchung +</div>
            </div>
            
            <div className="text-2xl">→</div>
            
            <div className="text-center">
              <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg font-semibold">
                Produktion
              </div>
              <div className="text-xs text-muted-foreground mt-1">ATP-Check</div>
            </div>
            
            <div className="text-2xl">→</div>
            
            <div className="text-center">
              <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-semibold">
                Lager (Ausgang)
              </div>
              <div className="text-xs text-muted-foreground mt-1">Buchung -</div>
            </div>
            
            <div className="text-2xl">→</div>
            
            <div className="text-center">
              <div className="bg-slate-100 text-slate-800 px-4 py-2 rounded-lg font-semibold">
                Fertigware
              </div>
              <div className="text-xs text-muted-foreground mt-1">Kein Outbound</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Erfüllte Anforderungen */}
      <Card>
        <CardHeader>
          <CardTitle>Erfüllte Anforderungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <RequirementItem text="ATP-Check (Available-to-Promise)" />
            <RequirementItem text="First-Come-First-Serve Regel" />
            <RequirementItem text="Lagerbestand-Management" />
            <RequirementItem text="Sicherheitsbestände" />
            <RequirementItem text="Materialbuchung (Ein-/Ausgang)" />
            <RequirementItem text="Planerfüllungsgrad-Tracking" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RequirementItem({ text }: { text: string }) {
  return (
    <div className="flex items-center space-x-2 text-sm">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <span>{text}</span>
    </div>
  )
}