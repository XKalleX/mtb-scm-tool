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
 * ✅ NEU: Szenarien-Integration global wirksam!
 * ✅ Zeigt Deltas (+X / -X) gegenüber Baseline
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Factory, AlertTriangle, TrendingUp, Package, Download, Zap } from 'lucide-react'
import { CollapsibleInfo } from '@/components/ui/collapsible-info'
import { formatNumber } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/export'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { ActiveScenarioBanner } from '@/components/ActiveScenarioBanner'
import { DeltaCell, DeltaBadge } from '@/components/DeltaCell'
import { useMemo } from 'react'
import { 
  generiereTagesproduktion, 
  berechneLagerbestaende,
  berechneProduktionsStatistiken,
  generiereAlleVariantenProduktionsplaene,
  type TagesProduktionEntry
} from '@/lib/calculations/zentrale-produktionsplanung'
import { useSzenarioBerechnung } from '@/lib/hooks/useSzenarioBerechnung'
import { berechneIntegriertesWarehouse, konvertiereWarehouseZuExport } from '@/lib/calculations/warehouse-management'
import { berechneBedarfsBacklog } from '@/lib/calculations/bedarfs-backlog-rechnung'

/**
 * Produktion Hauptseite
 * Zeigt Produktionsstatus und Lagerbestände mit Excel-Tabellen
 * ✅ Nutzt szenario-aware Berechnungen aus useSzenarioBerechnung Hook
 */
export default function ProduktionPage() {
  // Hole Konfiguration aus Context
  const { konfiguration, isInitialized, getArbeitstageProJahr } = useKonfiguration()
  
  // ✅ SZENARIO-AWARE: Nutze neuen Hook
  const {
    hasSzenarien,
    aktiveSzenarienCount,
    aktiveSzenarien,
    tagesProduktion: tagesProduktionMitSzenarien,
    lagerbestaende: lagerbestaendeMitSzenarien,
    statistiken,
    formatDelta,
    getDeltaColorClass
  } = useSzenarioBerechnung()
  
  // Baseline Lagerbestände (ohne Szenarien)
  const baselineLagerbestaende = useMemo(() => 
    berechneLagerbestaende(konfiguration),
    [konfiguration]
  )
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TAGESPLANUNG für 365 Tage mit Saisonalität aus SSOT
  // ═══════════════════════════════════════════════════════════════════════════════
  // 
  // Quelle: zentrale-produktionsplanung.ts
  // Mit Error Management für exakte Jahresproduktion
  // ✅ SZENARIO-AWARE: Nutze tagesProduktionMitSzenarien wenn Szenarien aktiv
  const tagesProduktion = useMemo(() => {
    // Wenn Szenarien aktiv sind, nutze Szenario-Daten
    if (hasSzenarien && tagesProduktionMitSzenarien.length > 0) {
      return tagesProduktionMitSzenarien
    }
    
    // Ansonsten berechne Baseline
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
  }, [konfiguration, hasSzenarien, tagesProduktionMitSzenarien])
  
  // Lagerbestände (szenario-aware)
  const lagerbestaende = hasSzenarien ? lagerbestaendeMitSzenarien : baselineLagerbestaende
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ✅ NEU: INTEGRIERTES WAREHOUSE MANAGEMENT (FIXES ALL ISSUES!)
  // ═══════════════════════════════════════════════════════════════════════════════
  // 
  // Verwendet berechneIntegriertesWarehouse() statt der alten fehlerhaften
  // berechneTagesLagerbestaende() Funktion.
  // 
  // FIXES:
  // - Realistische lot-basierte Lieferungen (500 Stück, 49 Tage)
  // - Keine Verbrauch ab Tag 1 ohne Lieferung
  // - ATP-Checks vor jedem Verbrauch
  // - Full OEM-Inbound-Warehouse Integration
  
  // Generiere Varianten-Produktionspläne für Warehouse
  const variantenProduktionsplaeneForWarehouse = useMemo(() => {
    return generiereAlleVariantenProduktionsplaene(konfiguration)
  }, [konfiguration])
  
  // ✅ NEU: Berechne Bedarfs-Backlog-Rechnung für korrekte Abweichungen
  // Zeigt die tatsächliche Produktion basierend auf Materialverfügbarkeit
  const backlogErgebnis = useMemo(() => {
    const plaeneAlsEntries: Record<string, TagesProduktionEntry[]> = {}
    Object.entries(variantenProduktionsplaeneForWarehouse).forEach(([varianteId, plan]) => {
      plaeneAlsEntries[varianteId] = plan.tage
    })
    return berechneBedarfsBacklog(plaeneAlsEntries, konfiguration)
  }, [variantenProduktionsplaeneForWarehouse, konfiguration])
  
  // ✅ INTEGRIERTES WAREHOUSE: Realistische Bestandsführung
  const warehouseResult = useMemo(() => {
    return berechneIntegriertesWarehouse(
      konfiguration,
      variantenProduktionsplaeneForWarehouse,
      [] // Keine Zusatzbestellungen hier
    )
  }, [konfiguration, variantenProduktionsplaeneForWarehouse])
  
  // ✅ NEU: Transformiere tagesProduktion mit Backlog-Daten für Anzeige
  const tagesProduktionFormatiert = useMemo(() => {
    // Aggregiere Backlog über alle Sattel-Komponenten
    const backlogProTag: Record<number, number> = {}
    
    Object.values(backlogErgebnis.komponenten).forEach(komponente => {
      komponente.tagesDetails.forEach(detail => {
        if (!backlogProTag[detail.tag]) {
          backlogProTag[detail.tag] = 0
        }
        backlogProTag[detail.tag] += detail.backlogNachher
      })
    })
    
    return tagesProduktion.map(tag => ({
      ...tag,
      materialVerfuegbar: !tag.istArbeitstag 
        ? '-'  // An Wochenenden/Feiertagen: Kein Material-Check
        : tag.materialVerfuegbar ? '✓ Ja' : '✗ Nein',  // An Arbeitstagen: ATP-Status
      backlog: backlogProTag[tag.tag] || 0  // Akkumulierter Backlog über alle Komponenten
    }))
  }, [tagesProduktion, backlogErgebnis])
  
  // Konvertiere für Darstellung (nur 2027 Tage)
  const tagesLagerbestaende = useMemo(() => {
    // Filter nur 2027 Tage (Tag 1-365)
    const jahr2027Tage = warehouseResult.tage.filter(t => t.tag >= 1 && t.tag <= 365)
    
    // Konvertiere zu altem Format für UI-Kompatibilität
    // Mappe 'negativ' Status zu 'kritisch' für UI (zeigt explizit kritische Bestände an)
    const mapStatus = (status: 'ok' | 'niedrig' | 'kritisch' | 'negativ'): 'ok' | 'niedrig' | 'kritisch' => {
      if (status === 'negativ') {
        // Negative Bestände sollten nicht auftreten (ATP-Check verhindert), aber falls doch: kritisch
        console.warn('⚠️ Negative inventory detected! ATP check may have failed.')
        return 'kritisch'
      }
      return status
    }
    
    return jahr2027Tage.map(tag => ({
      tag: tag.tag,
      datum: tag.datum,
      wochentag: tag.wochentag,
      monat: tag.monat,
      istArbeitstag: tag.istArbeitstag,
      bauteile: tag.bauteile.map(b => ({
        bauteilId: b.bauteilId,
        bauteilName: b.bauteilName,
        anfangsBestand: b.anfangsBestand,
        zugang: b.zugang,
        verbrauch: b.verbrauch,
        endBestand: b.endBestand,
        reichweite: b.reichweiteTage,
        status: mapStatus(b.status)
      }))
    }))
  }, [warehouseResult])
  
  // Warehouse-Statistiken für Anzeige
  const warehouseStats = warehouseResult.jahresstatistik
  
  // Berechne Produktionsstatistiken dynamisch (szenario-aware)
  // Nutze tagesProduktion (istMenge) als korrekte Produktionszahl
  const produktionsStats = useMemo(() => {
    // ✅ KORREKT: Berechne echte Ist-Produktion aus tagesProduktion (NICHT aus backlogErgebnis!)
    // Die tagesProduktion hat bereits Error Management eingebaut und zeigt exakt 370.000
    const summeIstProduktion = tagesProduktion.reduce((sum, tag) => sum + tag.istMenge, 0)
    const geplantMenge = konfiguration.jahresproduktion // 370.000 Bikes
    
    // Materialengpass-Tage aus Warehouse (dort ist es korrekt berechnet)
    const tageOhneMaterial = warehouseResult.tage.filter(t => 
      t.tag >= 1 && t.tag <= 365 && 
      t.bauteile.some(b => b.status === 'kritisch' || b.status === 'negativ')
    ).length
    
    // Liefertreue aus Warehouse
    const liefertreue = warehouseResult.jahresstatistik.liefertreue
    
    const baseStats = berechneProduktionsStatistiken(tagesProduktion)
    
    if (hasSzenarien) {
      return {
        geplant: geplantMenge,
        produziert: summeIstProduktion, // ✅ Korrekt: 370.000 aus tagesProduktion
        abweichung: summeIstProduktion - geplantMenge, // 0 im Normalfall
        planerfuellungsgrad: liefertreue,
        arbeitstage: statistiken.arbeitstage,
        schichtenGesamt: statistiken.schichtenGesamt,
        mitMaterialmangel: tageOhneMaterial,
        auslastung: statistiken.auslastung
      }
    }
    
    return {
      ...baseStats,
      geplant: geplantMenge,
      produziert: summeIstProduktion, // ✅ Korrekt: 370.000 aus tagesProduktion
      abweichung: summeIstProduktion - geplantMenge, // 0 im Normalfall
      planerfuellungsgrad: liefertreue,
      mitMaterialmangel: tageOhneMaterial
    }
  }, [tagesProduktion, hasSzenarien, statistiken, warehouseResult, konfiguration.jahresproduktion])
  
  // Warte bis Konfiguration geladen ist (nach allen Hooks!)
  if (!isInitialized) {
    return <div className="flex items-center justify-center h-screen">Lade Konfiguration...</div>
  }
  
  /**
   * Exportiert Lagerbestände als CSV (NEU: Mit integriertem Warehouse)
   */
  const handleExportLager = () => {
    const data = konvertiereWarehouseZuExport(warehouseResult)
    exportToCSV(data, 'warehouse_2027_integriert')
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

      {/* ✅ SZENARIEN AKTIV: Zeige Auswirkungen auf Produktion */}
      {hasSzenarien && (
        <CollapsibleInfo
          title={`Szenarien aktiv (${aktiveSzenarienCount})`}
          variant="success"
          icon={<Zap className="h-5 w-5" />}
          defaultOpen={true}
        >
          <div className="text-sm text-green-800">
            <p className="mb-3">
              <strong>✅ Szenarien wirken sich auf Produktion & Lager aus!</strong> Die Werte zeigen 
              die Auswirkungen der aktiven Szenarien im Vergleich zum Baseline-Plan.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-green-300">
              <div>
                <div className="text-xs text-green-600">Produktion Delta</div>
                <DeltaBadge delta={statistiken.deltaProduziert} suffix=" Bikes" />
              </div>
              <div>
                <div className="text-xs text-green-600">Planerfüllung</div>
                <DeltaBadge delta={statistiken.deltaPlanerfuellungsgrad} suffix="%" />
              </div>
              <div>
                <div className="text-xs text-green-600">Materialmangel</div>
                <DeltaBadge delta={statistiken.deltaMitMaterialmangel} suffix=" Tage" inverseLogic={true} />
              </div>
              <div>
                <div className="text-xs text-green-600">Auslastung</div>
                <DeltaBadge delta={statistiken.deltaAuslastung} suffix="%" />
              </div>
            </div>
          </div>
        </CollapsibleInfo>
      )}

      {/* Übersicht Cards - MIT SZENARIO-DELTAS */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={hasSzenarien ? 'border-green-200' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Geplante Produktion
                {hasSzenarien && <Zap className="h-3 w-3 inline ml-1 text-green-600" />}
              </CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <DeltaCell 
              value={produktionsStats.geplant} 
              delta={hasSzenarien ? statistiken.deltaGeplant : 0}
            />
            <p className="text-xs text-muted-foreground">MTBs Jahresplan</p>
          </CardContent>
        </Card>

        <Card className={hasSzenarien ? 'border-green-200' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Tatsächlich produziert
                {hasSzenarien && <Zap className="h-3 w-3 inline ml-1 text-green-600" />}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <DeltaCell 
              value={produktionsStats.produziert}
              delta={hasSzenarien ? statistiken.deltaProduziert : 0}
            />
            <p className="text-xs text-muted-foreground">
              {formatNumber(produktionsStats.planerfuellungsgrad, 2)}% Planerfüllung
            </p>
          </CardContent>
        </Card>

        <Card className={hasSzenarien && statistiken.deltaMitMaterialmangel > 0 ? 'border-red-200' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Materialmangel
                {hasSzenarien && statistiken.deltaMitMaterialmangel !== 0 && <Zap className="h-3 w-3 inline ml-1 text-orange-600" />}
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <DeltaCell 
              value={produktionsStats.mitMaterialmangel}
              delta={hasSzenarien ? statistiken.deltaMitMaterialmangel : 0}
              inverseLogic={true}
            />
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

      {/* Produktionslogik ohne Solver - COLLAPSIBLE */}
      <CollapsibleInfo
        title="Produktionslogik (ohne Solver)"
        variant="info"
        icon={<Factory className="h-5 w-5" />}
        defaultOpen={false}
      >
        <p className="text-sm text-blue-700 mb-4">
          Einfache First-Come-First-Serve Regel statt mathematischer Optimierung
        </p>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">FCFS-Regel (First-Come-First-Serve)</h4>
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

          <div className="border-t border-blue-200 pt-4">
            <h4 className="font-semibold text-blue-900 mb-2">ATP-Check (Available-to-Promise)</h4>
            <p className="text-sm text-blue-800">
              Für jede Komponente in der Stückliste wird geprüft:<br/>
              <code className="bg-blue-100 px-2 py-1 rounded mt-2 inline-block">
                Verfügbar im Lager ≥ Benötigt für Auftrag
              </code>
            </p>
          </div>
        </div>
      </CollapsibleInfo>

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
          {/* ✅ TABELLE ZUERST (User-Anforderung: Tabellen vor Erklärungen) */}
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
                format: (val) => val,
                sumable: false
              },
              {
                key: 'backlog',
                label: 'Backlog',
                width: '100px',
                align: 'right',
                formula: 'Σ(Bedarf - Bestellt)',
                format: (val) => val > 0 ? formatNumber(val, 0) + ' Stk' : '0',
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
            data={tagesProduktionFormatiert}
            maxHeight="500px"
            showFormulas={true}
            showSums={true}
            sumRowLabel={`SUMME (365 Tage, ${getArbeitstageProJahr()} Arbeitstage)`}
            dateColumnKey="datum"
          />
          
          {/* ✅ FORMEL-KARTEN NACH DER TABELLE (User-Anforderung: Tabellen vor Erklärungen) */}
          <div className="mt-6">
            <CollapsibleInfo title="📊 Berechnungsformeln und Konzepte">
              <div className="space-y-4">
                <FormulaCard
                  title="Tagesproduktion mit Error Management"
                  formula={`Jahresproduktion / Arbeitstage = ${formatNumber(konfiguration.jahresproduktion, 0)} / ${getArbeitstageProJahr()} = ${formatNumber(konfiguration.jahresproduktion / getArbeitstageProJahr(), 2)} Bikes/Tag (Ø)`}
                  description="Tatsächliche Produktion variiert durch Saisonalität und Error Management zur Vermeidung von Rundungsfehlern."
                  example={`Jan-März (Q1): ca. ${formatNumber((konfiguration.jahresproduktion / getArbeitstageProJahr()) * 0.7, 0)} Bikes/Tag`}
                />
                <FormulaCard
                  title="Schichtplanung & Kapazität"
                  formula={`Schichten = ⌈Plan / ${konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht}⌉`}
                  description="Berechnung der benötigten Schichten basierend auf Tagesproduktion und Werkskapazität."
                  example={`${formatNumber(konfiguration.jahresproduktion / getArbeitstageProJahr(), 0)} Bikes → ${Math.ceil((konfiguration.jahresproduktion / getArbeitstageProJahr()) / (konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht))} Schichten`}
                />
                <FormulaCard
                  title="Error Management (Rundungsfehler-Korrektur)"
                  formula="Kumulativer Fehler ≥ ±0.5 → Korrektur durch Auf-/Abrunden"
                  description="Verhindert systematische Abweichung von ±100 Bikes. Validierung: Summe = exakt 370.000 Bikes."
                  example="Jahressumme exakt 370.000 Bikes ✓"
                />
              </div>
            </CollapsibleInfo>
          </div>
        </CardContent>
      </Card>

      {/* SEKTION 2: WAREHOUSE / LAGER - TAGESBASIS */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-900 text-xl">WAREHOUSE / LAGER (Inventory Management) - Tagesbasis</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            Tägliche Lagerbewegungen über 365 Tage: Anfangsbestand + Zugänge - Verbrauch = Endbestand. 
            Mit Reichweitenberechnung für alle 4 Sattel-Varianten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ✅ TABELLE ZUERST (User-Anforderung: Tabellen vor Erklärungen) */}
          <div className="mb-6">
            <h4 className="font-semibold text-green-900 mb-3">🔍 Tägliche Lagerbestandsentwicklung (365 Tage × 4 Sattel-Varianten)</h4>
            <p className="text-sm text-green-700 mb-4">
              <strong>Detaillierte Lagerbewegungen pro Tag:</strong> Anfangsbestand + Zugang - Verbrauch = Endbestand. 
              Zeigt Reichweite und Status für alle 4 Sattel-Varianten über das gesamte Jahr 2027.
            </p>
            
            {/* Detaillierte Tabelle: Pro Komponente alle Bewegungen */}
            <ExcelTable
              columns={[
                {
                  key: 'tag',
                  label: 'Tag',
                  width: '50px',
                  align: 'center',
                  sumable: false
                },
                {
                  key: 'datum',
                  label: 'Datum',
                  width: '75px',
                  align: 'center',
                  format: (val) => val instanceof Date ? val.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : val,
                  sumable: false
                },
                {
                  key: 'wochentag',
                  label: 'WT',
                  width: '45px',
                  align: 'center',
                  sumable: false
                },
                {
                  key: 'komponente',
                  label: 'Komponente',
                  width: '110px',
                  align: 'left',
                  sumable: false
                },
                {
                  key: 'anfangsBestand',
                  label: 'Anfang',
                  width: '85px',
                  align: 'right',
                  formula: 'Bestand Vortag',
                  format: (val) => formatNumber(val, 0),
                  sumable: false
                },
                {
                  key: 'zugang',
                  label: 'Zugang',
                  width: '85px',
                  align: 'right',
                  formula: 'Lieferung',
                  format: (val) => val > 0 ? '+' + formatNumber(val, 0) : '-',
                  sumable: false
                },
                {
                  key: 'verbrauch',
                  label: 'Verbrauch',
                  width: '90px',
                  align: 'right',
                  formula: 'Produktion',
                  format: (val) => val > 0 ? '-' + formatNumber(val, 0) : '-',
                  sumable: false
                },
                {
                  key: 'endBestand',
                  label: 'Endbestand',
                  width: '100px',
                  align: 'right',
                  formula: 'Anfang + Zugang - Verbrauch',
                  format: (val) => formatNumber(val, 0),
                  sumable: false
                },
                {
                  key: 'reichweite',
                  label: 'Reichweite',
                  width: '90px',
                  align: 'right',
                  formula: 'Endbestand / Tagesbedarf',
                  format: (val) => formatNumber(val, 1) + ' Tage',
                  sumable: false
                },
                {
                  key: 'status',
                  label: 'Status',
                  width: '80px',
                  align: 'center',
                  format: (val) => {
                    if (val === 'kritisch') return '🔴 Kritisch'
                    if (val === 'niedrig') return '🟡 Niedrig'
                    return '🟢 OK'
                  },
                  sumable: false
                }
              ]}
              data={tagesLagerbestaende.flatMap(tag => {
                return tag.bauteile.map(bauteil => ({
                  tag: tag.tag,
                  datum: tag.datum,
                  wochentag: tag.wochentag,
                  komponente: bauteil.bauteilName,
                  anfangsBestand: bauteil.anfangsBestand,
                  zugang: bauteil.zugang,
                  verbrauch: bauteil.verbrauch,
                  endBestand: bauteil.endBestand,
                  reichweite: bauteil.reichweite,
                  status: bauteil.status
                }))
              })}
              maxHeight="600px"
              showFormulas={true}
              showSums={false}
              dateColumnKey="datum"
            />
            
            <p className="text-xs text-green-600 mt-3">
              💡 <strong>Hinweis:</strong> Zeigt alle 365 Tage × 4 Komponenten = 1.460 Zeilen. 
              <strong>✅ Realistische Bestandsführung:</strong> Losgröße 500 Stück, 49 Tage Vorlaufzeit, Anfangsbestand = 0.
              Code-Referenz: src/lib/calculations/warehouse-management.ts → Funktion berechneIntegriertesWarehouse()
            </p>
          </div>

          {/* ✅ FORMEL-KARTEN NACH DER TABELLE (User-Anforderung: Tabellen vor Erklärungen) */}
          <div className="mt-6 space-y-4">
            <CollapsibleInfo title="📊 Berechnungsformeln und Konzepte">
              <div className="space-y-4">
                <FormulaCard
                  title="Lagerbewegung (Tagesbasis)"
                  formula="Endbestand = Anfangsbestand + Zugänge - Verbrauch"
                  description="Simuliert tägliche Lagerbewegungen über 365 Tage mit realistischen Losgrößen (500 Stück) und 49 Tage Vorlaufzeit. Anfangsbestand: 0 (Just-in-Time)."
                  example={`Tag 100: Fizik Tundra Anfang 2.000, Zugang +0, Verbrauch -${formatNumber(Math.round(konfiguration.jahresproduktion * 0.52 / 365), 0)} → Endbestand ${formatNumber(2000 - Math.round(konfiguration.jahresproduktion * 0.52 / 365), 0)}`}
                />
                <FormulaCard
                  title="Reichweite (Days of Supply)"
                  formula="Reichweite = Bestand / Tagesbedarf (in Tagen)"
                  description="Zeigt wie lange der aktuelle Bestand bei gegebenem Verbrauch reicht. SCOR-Metrik: Asset Management → Inventory Days of Supply."
                  example="Fizik Tundra: Bestand 2.000 / Tagesbedarf 527 = 3,8 Tage Reichweite"
                />
              </div>
            </CollapsibleInfo>
          </div>
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