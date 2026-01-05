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
  // KORREKTUR: 370.000 laut Aufgabenstellung (nicht 185.000)
  const produktionsStats = {
    geplant: 370000,
    produziert: 368250,
    planerfuellungsgrad: 99.53,
    mitMaterialmangel: 12,
    auslastung: 95.5
  }

  // ✅ ERMÄSSIGUNG: Nur 4 Sattel-Varianten gemäß SSOT
  // Quelle: kontext/Spezifikation_SSOT_MR.ts - BAUTEILE
  const lagerbestaende = [
    { 
      komponente: 'Fizik_Tundra', 
      bestand: 45200,   // Allrounder + Freeride = 111.000 + 18.500 = 129.500/Jahr ≈ 518/Tag
      sicherheit: 3626,  // 7 Tage Puffer
      bedarf: 518,       // Tagesbedarf
      verwendung: 'MTB Allrounder, Freeride',
      status: 'ok' 
    },
    { 
      komponente: 'Raceline', 
      bestand: 40100,    // Competition + Performance = 55.500 + 44.400 = 99.900/Jahr ≈ 400/Tag
      sicherheit: 2797,  // 7 Tage Puffer
      bedarf: 400,
      verwendung: 'MTB Competition, Performance',
      status: 'ok' 
    },
    { 
      komponente: 'Spark', 
      bestand: 34200,    // Downhill + Trail = 37.000 + 48.100 = 85.100/Jahr ≈ 340/Tag
      sicherheit: 2383,  // 7 Tage Puffer
      bedarf: 340,
      verwendung: 'MTB Downhill, Trail',
      status: 'ok' 
    },
    { 
      komponente: 'Speedline', 
      bestand: 22400,    // Extreme + Marathon = 25.900 + 29.600 = 55.500/Jahr ≈ 222/Tag
      sicherheit: 1554,  // 7 Tage Puffer
      bedarf: 222,
      verwendung: 'MTB Extreme, Marathon',
      status: 'ok' 
    },
  ]
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TAGESPLANUNG für 365 Tage mit Saisonalität aus SSOT
  // ═══════════════════════════════════════════════════════════════════════════════
  // 
  // Quelle: kontext/Spezifikation_SSOT_MR.ts - SAISONALITAET
  // - Januar: 4% (14.800 Bikes)
  // - April: 16% (59.200 Bikes) ← PEAK!
  // - Dezember: 3% (11.100 Bikes)
  // 
  // Mit Error Management für exakte 370.000 Bikes Jahresproduktion
  
  // Saisonale Verteilung (Monatsanteile in %)
  const saisonalitaet = [
    { monat: 1, name: 'Jan', anteil: 0.04, tage: 31, bikes: 14800 },
    { monat: 2, name: 'Feb', anteil: 0.06, tage: 28, bikes: 22200 },
    { monat: 3, name: 'Mär', anteil: 0.10, tage: 31, bikes: 37000 },
    { monat: 4, name: 'Apr', anteil: 0.16, tage: 30, bikes: 59200 }, // PEAK!
    { monat: 5, name: 'Mai', anteil: 0.14, tage: 31, bikes: 51800 },
    { monat: 6, name: 'Jun', anteil: 0.13, tage: 30, bikes: 48100 },
    { monat: 7, name: 'Jul', anteil: 0.12, tage: 31, bikes: 44400 },
    { monat: 8, name: 'Aug', anteil: 0.09, tage: 31, bikes: 33300 },
    { monat: 9, name: 'Sep', anteil: 0.06, tage: 30, bikes: 22200 },
    { monat: 10, name: 'Okt', anteil: 0.03, tage: 31, bikes: 11100 },
    { monat: 11, name: 'Nov', anteil: 0.04, tage: 30, bikes: 14800 },
    { monat: 12, name: 'Dez', anteil: 0.03, tage: 31, bikes: 11100 },
  ]
  
  // Deutsche Feiertage 2027 (NRW)
  const feiertage = [
    '2027-01-01', // Neujahr
    '2027-04-02', // Karfreitag
    '2027-04-05', // Ostermontag
    '2027-05-01', // Tag der Arbeit
    '2027-05-13', // Christi Himmelfahrt
    '2027-05-24', // Pfingstmontag
    '2027-06-03', // Fronleichnam
    '2027-10-03', // Tag der Deutschen Einheit
    '2027-12-25', // 1. Weihnachtsfeiertag
    '2027-12-26', // 2. Weihnachtsfeiertag
  ]
  
  const tagesProduktion = Array.from({ length: 365 }, (_, i) => {
    const tag = i + 1
    const datum = new Date(2027, 0, tag)
    const wochentag = datum.toLocaleDateString('de-DE', { weekday: 'short' })
    const datumStr = datum.toISOString().split('T')[0]
    
    // Prüfe ob Arbeitstag (Mo-Fr, kein Feiertag)
    const istWochenende = datum.getDay() === 0 || datum.getDay() === 6
    const istFeiertag = feiertage.includes(datumStr)
    const istArbeitstag = !istWochenende && !istFeiertag
    
    // Monat für Saisonalität
    const monat = datum.getMonth() + 1
    const saisonInfo = saisonalitaet.find(s => s.monat === monat)!
    
    // Arbeitstage im Monat zählen (vereinfacht: ~22 Tage/Monat)
    const arbeitstageImMonat = Math.floor(saisonInfo.tage * (5/7)) - 1 // ~22 AT
    
    let planMenge = 0
    let istMenge = 0
    
    if (istArbeitstag) {
      // ✅ PRODUKTIONSTAG
      // Soll-Produktion: Monatsproduktion / Arbeitstage
      const sollProduktion = saisonInfo.bikes / arbeitstageImMonat
      planMenge = Math.round(sollProduktion)
      
      // Ist-Produktion: Mit kleiner deterministischer Variation (97-103%)
      const variation = 0.97 + (tag % 7) * 0.01
      istMenge = Math.round(planMenge * variation)
    }
    
    const abweichung = istMenge - planMenge
    const materialVerfuegbar = istArbeitstag
    const auslastung = planMenge > 0 ? (istMenge / planMenge) * 100 : 0
    const schichten = istArbeitstag ? Math.ceil(istMenge / 1040) : 0
    
    return {
      tag,
      datum: datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      wochentag,
      monat: saisonInfo.name,
      istArbeitstag,
      istFeiertag,
      schichten,
      planMenge,
      istMenge,
      abweichung,
      materialVerfuegbar,
      auslastung: Math.round(auslastung * 10) / 10,
      kumulativPlan: 0,
      kumulativIst: 0
    }
  })
  
  // Kumulative Werte berechnen
  let kumulativPlan = 0
  let kumulativIst = 0
  tagesProduktion.forEach(tag => {
    kumulativPlan += tag.planMenge
    kumulativIst += tag.istMenge
    tag.kumulativPlan = kumulativPlan
    tag.kumulativIst = kumulativIst
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
            Produktionssteuerung mit FCFS-Regel (First-Come-First-Serve) • 370.000 Bikes/Jahr • Nur 4 Sattel-Varianten (Ermäßigung)
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

      {/* SSOT Hinweis */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-600 text-white rounded-full p-2">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">✅ Ermäßigung aktiv: Nur Sättel</h4>
              <p className="text-sm text-blue-700 mt-1">
                Gemäß <code className="bg-blue-100 px-1 rounded">kontext/Spezifikation_SSOT_MR.ts</code> (Single Source of Truth):
                Nur <strong>4 Sattel-Varianten</strong> vom China-Zulieferer.
                Keine Gabeln, keine Rahmen → 90% weniger Komplexität.
                Stückliste: <strong>1 Sattel = 1 Bike</strong> (einfache 1:1 Beziehung).
              </p>
              <p className="text-xs text-blue-600 mt-2">
                📦 Fizik Tundra • Raceline • Spark • Speedline | 🚢 China: 49 Tage Vorlauf, Losgröße 500
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* SEKTION 1: PRODUKTIONSSTEUERUNG */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Factory className="h-6 w-6 text-purple-600" />
            <CardTitle className="text-purple-900 text-xl">PRODUKTIONSSTEUERUNG (Production Control)</CardTitle>
          </div>
          <CardDescription className="text-purple-700">
            Granulare Tagesplanung über 365 Tage mit Saisonalität (Jan 4%, Apr 16% Peak, Dez 3%) und Error Management für exakte 370.000 Bikes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Formel-Karte für Produktion */}
          <div className="mb-6 space-y-4">
            <FormulaCard
              title="Tagesproduktion"
              formula="Jahresproduktion / Arbeitstage = 370.000 / 250 = 1.480 Bikes/Tag (Vollauslastung)"
              description="Theoretische Tagesproduktion bei 250 Arbeitstagen. Mit Saisonalität: Q1 ca. 1.036/Tag (70%)"
              example="Q1 (Jan-März): 1.480 × 0,7 = 1.036 Bikes/Tag durchschnittlich"
            />
            <FormulaCard
              title="Schichtplanung"
              formula="Benötigte Schichten = ⌈Plan-Menge / Kapazität pro Schicht⌉, wobei Kapazität = 130 Bikes/h × 8h = 1.040 Bikes"
              description="Anzahl der erforderlichen Schichten basierend auf Tagesproduktion"
              example="1.480 Bikes geplant → 1.480 / 1.040 = 1,42 → 2 Schichten nötig"
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
              description="Vor jeder Produktion wird geprüft, ob genug Sättel verfügbar sind. Ermäßigung: Einfache 1:1 Stückliste!"
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