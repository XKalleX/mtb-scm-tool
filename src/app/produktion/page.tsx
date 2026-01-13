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
 * 
 * NEU: Nutzt dynamische Konfiguration aus KonfigurationContext
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Factory, AlertTriangle, TrendingUp, Package, Download } from 'lucide-react'
import { CollapsibleInfo } from '@/components/ui/collapsible-info'
import { formatNumber } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/export'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { ActiveScenarioBanner } from '@/components/ActiveScenarioBanner'
import { useMemo } from 'react'
import { 
  generiereTagesproduktion, 
  berechneLagerbestaende,
  berechneProduktionsStatistiken 
} from '@/lib/calculations/zentrale-produktionsplanung'

/**
 * Produktion Hauptseite
 * Zeigt Produktionsstatus und Lagerbestände mit Excel-Tabellen
 * Nutzt dynamische Konfiguration aus KonfigurationContext
 */
export default function ProduktionPage() {
  // Hole Konfiguration aus Context
  const { konfiguration, isInitialized, getArbeitstageProJahr } = useKonfiguration()
  
  // ✅ ERMÄSSIGUNG: Nur 4 Sattel-Varianten gemäß SSOT
  // Quelle: kontext/Spezifikation_SSOT_MR.ts - BAUTEILE
  // Dynamisch berechnet basierend auf aktueller Jahresproduktion und Varianten-Anteilen
  const lagerbestaende = useMemo(() => 
    berechneLagerbestaende(konfiguration),
    [konfiguration]
  )
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TAGESPLANUNG für 365 Tage mit Saisonalität aus SSOT
  // ═══════════════════════════════════════════════════════════════════════════════
  // 
  // Quelle: zentrale-produktionsplanung.ts
  // Mit Error Management für exakte Jahresproduktion
  const tagesProduktion = useMemo(() => {
    const result = generiereTagesproduktion(konfiguration)
    
    // ✅ VALIDIERUNG: Log zur Kontrolle
    const summePlan = result.reduce((sum, tag) => sum + tag.planMenge, 0)
    const summeIst = result.reduce((sum, tag) => sum + tag.istMenge, 0)
    
    console.log(`📊 Tagesproduktion Validierung:`)
    console.log(`   Plan-Menge Summe: ${summePlan.toLocaleString('de-DE')} Bikes`)
    console.log(`   Ist-Menge Summe: ${summeIst.toLocaleString('de-DE')} Bikes`)
    console.log(`   Soll (Jahresproduktion): ${konfiguration.jahresproduktion.toLocaleString('de-DE')} Bikes`)
    console.log(`   Abweichung: ${(summePlan - konfiguration.jahresproduktion).toLocaleString('de-DE')} Bikes`)
    
    if (Math.abs(summePlan - konfiguration.jahresproduktion) <= 10) {
      console.log(`✅ Error Management funktioniert korrekt!`)
    }
    
    return result
  }, [konfiguration])
  
  // Berechne Produktionsstatistiken dynamisch
  const produktionsStats = useMemo(() => 
    berechneProduktionsStatistiken(tagesProduktion),
    [tagesProduktion]
  )
  
  // Warte bis Konfiguration geladen ist (nach allen Hooks!)
  if (!isInitialized) {
    return <div className="flex items-center justify-center h-screen">Lade Konfiguration...</div>
  }
  
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
            Produktionssteuerung mit FCFS-Regel (First-Come-First-Serve) • {formatNumber(konfiguration.jahresproduktion, 0)} Bikes/Jahr • Nur 4 Sattel-Varianten
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

      {/* Aktive Szenarien Banner */}
      <ActiveScenarioBanner showDetails={false} />

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
            Einfache First-Come-First-Serve Regel statt mathematischer Optimierung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CollapsibleInfo
            title="FCFS-Regel (First-Come-First-Serve)"
            variant="info"
            icon={<Factory className="h-4 w-4" />}
          >
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
          </CollapsibleInfo>

          <CollapsibleInfo
            title="ATP-Check (Available-to-Promise)"
            variant="info"
          >
            <p className="text-sm text-blue-800">
              Für jede Komponente in der Stückliste wird geprüft:<br/>
              <code className="bg-blue-100 px-2 py-1 rounded">
                Verfügbar im Lager ≥ Benötigt für Auftrag
              </code>
            </p>
          </CollapsibleInfo>
        </CardContent>
      </Card>

      {/* SEKTION 1: PRODUKTIONSSTEUERUNG */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Factory className="h-6 w-6 text-purple-600" />
            <CardTitle className="text-purple-900 text-xl">PRODUKTIONSSTEUERUNG (Production Control)</CardTitle>
          </div>
          <CardDescription className="text-purple-700">
            Granulare Tagesplanung über 365 Tage mit Saisonalität (Jan {konfiguration.saisonalitaet[0].anteil}%, Apr {konfiguration.saisonalitaet[3].anteil}% Peak, Dez {konfiguration.saisonalitaet[11].anteil}%) und Error Management für exakte {formatNumber(konfiguration.jahresproduktion, 0)} Bikes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Formel-Karte für Produktion */}
          <div className="mb-6 space-y-4">
            <FormulaCard
              title="Tagesproduktion"
              formula={`Jahresproduktion / Arbeitstage = ${formatNumber(konfiguration.jahresproduktion, 0)} / ${getArbeitstageProJahr()} = ${formatNumber(konfiguration.jahresproduktion / getArbeitstageProJahr(), 0)} Bikes/Tag (Vollauslastung)`}
              description="Theoretische Tagesproduktion bei allen Arbeitstagen. Mit Saisonalität: Q1 ca. 70% des Durchschnitts"
              example={`Q1 (Jan-März): ${formatNumber(konfiguration.jahresproduktion / getArbeitstageProJahr(), 0)} × 0,7 = ${formatNumber((konfiguration.jahresproduktion / getArbeitstageProJahr()) * 0.7, 0)} Bikes/Tag durchschnittlich`}
            />
            <FormulaCard
              title="Schichtplanung"
              formula={`Benötigte Schichten = ⌈Plan-Menge / Kapazität pro Schicht⌉, wobei Kapazität = ${konfiguration.produktion.kapazitaetProStunde} Bikes/h × ${konfiguration.produktion.stundenProSchicht}h = ${konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht} Bikes`}
              description="Anzahl der erforderlichen Schichten basierend auf Tagesproduktion"
              example={`${formatNumber(konfiguration.jahresproduktion / getArbeitstageProJahr(), 0)} Bikes geplant → ${formatNumber(konfiguration.jahresproduktion / getArbeitstageProJahr(), 0)} / ${konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht} = ${formatNumber((konfiguration.jahresproduktion / getArbeitstageProJahr()) / (konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht), 2)} → ${Math.ceil((konfiguration.jahresproduktion / getArbeitstageProJahr()) / (konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht))} Schichten nötig`}
            />
            <FormulaCard
              title="Produktionsauslastung"
              formula="Auslastung (%) = (Ist-Menge / Plan-Menge) × 100"
              description="Zeigt die tatsächliche Produktionsleistung im Verhältnis zur Planung"
              example="Tag 1: 711 / 710 × 100 = 100,1% Auslastung"
            />
          </div>

          {/* Tagesplanung Excel-Tabelle */}
          <ExcelTable
            columns={[
              {
                key: 'tag',
                label: 'Tag',
                width: '60px',
                align: 'center',
                sumable: false
              },
              {
                key: 'datum',
                label: 'Datum',
                width: '80px',
                align: 'center',
                format: (val) => val instanceof Date ? val.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : val,
                sumable: false
              },
              {
                key: 'wochentag',
                label: 'WT',
                width: '50px',
                align: 'center',
                sumable: false
              },
              {
                key: 'monat',
                label: 'Monat',
                width: '60px',
                align: 'center',
                sumable: false
              },
              {
                key: 'schichten',
                label: 'Schichten',
                width: '80px',
                align: 'center',
                formula: '⌈Plan / 1.040⌉',
                format: (val) => val > 0 ? val + ' Schicht(en)' : '-',
                sumable: true
              },
              {
                key: 'planMenge',
                label: 'Plan-Menge',
                width: '110px',
                align: 'right',
                format: (val) => val > 0 ? formatNumber(val, 0) + ' Bikes' : '-',
                sumable: true
              },
              {
                key: 'istMenge',
                label: 'Ist-Menge',
                width: '110px',
                align: 'right',
                format: (val) => val > 0 ? formatNumber(val, 0) + ' Bikes' : '-',
                sumable: true
              },
              {
                key: 'abweichung',
                label: 'Abweichung',
                width: '100px',
                align: 'right',
                formula: 'Ist - Plan',
                format: (val) => {
                  if (val === 0) return '±0'
                  const sign = val > 0 ? '+' : ''
                  return sign + formatNumber(val, 0)
                },
                sumable: true
              },
              {
                key: 'materialVerfuegbar',
                label: 'Material OK',
                width: '100px',
                align: 'center',
                formula: 'ATP-Check',
                format: (val) => val ? '✓ Ja' : '✗ Nein',
                sumable: false
              },
              {
                key: 'auslastung',
                label: 'Auslastung',
                width: '100px',
                align: 'right',
                formula: '(Ist / Plan) × 100',
                format: (val) => val > 0 ? formatNumber(val, 1) + ' %' : '-',
                sumable: false
              },
              {
                key: 'kumulativPlan',
                label: 'Σ Plan',
                width: '110px',
                align: 'right',
                formula: 'Σ(Plan)',
                format: (val) => formatNumber(val, 0),
                sumable: false
              },
              {
                key: 'kumulativIst',
                label: 'Σ Ist',
                width: '110px',
                align: 'right',
                formula: 'Σ(Ist)',
                format: (val) => formatNumber(val, 0),
                sumable: false
              }
            ]}
            data={tagesProduktion}
            maxHeight="500px"
            showFormulas={true}
            showSums={true}
            sumRowLabel="SUMME (365 Tage, ~250 Arbeitstage)"
          />
        </CardContent>
      </Card>

      {/* SEKTION 2: WAREHOUSE / LAGER */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-900 text-xl">WAREHOUSE / LAGER (Inventory Management)</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            Lagerverwaltung mit ATP-Check, Sicherheitsbeständen und Reichweitenberechnung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Formel-Karten für Lager */}
          <div className="mb-6 space-y-4">
            <FormulaCard
              title="ATP-Check Formel (Available-to-Promise)"
              formula="ATP = Verfügbarer Bestand - Sicherheitsbestand ≥ Bedarf, wobei 1 Sattel = 1 Bike"
              description="Vor jeder Produktion wird geprüft, ob genug Sättel verfügbar sind. Einfache 1:1 Stückliste!"
              example="Raceline: Verfügbar = 40.100 - 2.797 = 37.303, Bedarf = 400/Tag → ✓ 93 Tage Reichweite"
            />
            <FormulaCard
              title="Reichweite"
              formula="Reichweite (Tage) = Verfügbarer Bestand / Tagesbedarf"
              description="Zeigt an, wie lange der aktuelle Bestand bei gegebenem Verbrauch reicht"
              example="Fizik Tundra: (45.200 - 3.626) / 518 = 80,3 Tage"
            />
            <FormulaCard
              title="Kritischer Bestand"
              formula="Status = 'Kritisch' wenn Bestand < Sicherheitsbestand ODER Reichweite < 7 Tage"
              description="Warnsystem für Materialengpässe zur Vermeidung von Produktionsstopps"
              example="Sicherheitsbestand = 7 Tage Puffer bei durchschnittlichem Verbrauch"
            />
          </div>

          {/* Excel-ähnliche Lagertabelle */}
          <ExcelTable
            columns={[
              {
                key: 'komponente',
                label: 'Sattel-Variante',
                width: '150px',
                format: (val) => val.replace(/_/g, ' '),
                sumable: false
              },
              {
                key: 'verwendung',
                label: 'Verwendung (MTB-Varianten)',
                width: '250px',
                align: 'left',
                sumable: false
              },
              {
                key: 'bestand',
                label: 'Bestand',
                width: '110px',
                align: 'right',
                format: (val) => formatNumber(val, 0),
                sumable: true
              },
              {
                key: 'sicherheit',
                label: 'Sicherheitsbestand',
                width: '150px',
                align: 'right',
                format: (val) => formatNumber(val, 0),
                sumable: true
              },
              {
                key: 'bedarf',
                label: 'Tagesbedarf',
                width: '130px',
                align: 'right',
                format: (val) => formatNumber(val, 0) + ' /Tag',
                sumable: true
              },
              {
                key: 'verfuegbar',
                label: 'Verfügbar (ATP)',
                width: '140px',
                align: 'right',
                formula: 'Bestand - Sicherheitsbestand',
                format: (val) => formatNumber(val, 0),
                sumable: true
              },
              {
                key: 'reichweite',
                label: 'Reichweite',
                width: '110px',
                align: 'right',
                formula: 'Verfügbar / Tagesbedarf',
                format: (val) => formatNumber(val, 1) + ' Tage',
                sumable: false
              },
              {
                key: 'status',
                label: 'Status',
                width: '100px',
                align: 'center',
                format: (val) => val === 'ok' 
                  ? '✓ OK' 
                  : '⚠ Kritisch',
                sumable: false
              }
            ]}
            data={lagerbestaende.map(l => ({
              komponente: l.komponente,
              verwendung: l.verwendung,
              bestand: l.bestand,
              sicherheit: l.sicherheit,
              bedarf: l.bedarf,
              verfuegbar: l.bestand - l.sicherheit,
              reichweite: (l.bestand - l.sicherheit) / l.bedarf,
              status: l.status
            }))}
            maxHeight="500px"
            showFormulas={true}
            showSums={true}
            sumRowLabel="GESAMT Lagerbestand"
          />
        </CardContent>
      </Card>

      {/* Lagerbestand - alte Section entfernt, jetzt in Warehouse integriert */}

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

    </div>
  )
}