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
  berechneProduktionsStatistiken,
  berechneTagesLagerbestaende
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
  
  // ✅ NEU: Tägliche Lagerbestandsentwicklung (365 Tage × 4 Bauteile)
  const tagesLagerbestaende = useMemo(() => 
    berechneTagesLagerbestaende(konfiguration, tagesProduktion),
    [konfiguration, tagesProduktion]
  )
  
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
          {/* Formel-Karte für Produktion */}
          <div className="mb-6 space-y-4">
            <FormulaCard
              title="Tagesproduktion mit Error Management"
              formula={`Jahresproduktion / Arbeitstage = ${formatNumber(konfiguration.jahresproduktion, 0)} / ${getArbeitstageProJahr()} = ${formatNumber(konfiguration.jahresproduktion / getArbeitstageProJahr(), 2)} Bikes/Tag (Ø)`}
              description={`Theoretische Tagesproduktion bei allen Arbeitstagen. Tatsächliche Produktion variiert durch Saisonalität und Error Management zur Vermeidung von Rundungsfehlern. Daten aus: src/data/stammdaten.json (jahresproduktion), src/data/feiertage-deutschland.json (Arbeitstage). Code-Referenz: src/lib/calculations/zentrale-produktionsplanung.ts > generiereTagesproduktion() > Error Management Logik (Zeilen 240-269).`}
              example={`Jan-März (Q1): Saisonalität ${formatNumber((konfiguration.saisonalitaet[0].anteil + konfiguration.saisonalitaet[1].anteil + konfiguration.saisonalitaet[2].anteil), 1)}% = ca. ${formatNumber((konfiguration.jahresproduktion / getArbeitstageProJahr()) * ((konfiguration.saisonalitaet[0].anteil + konfiguration.saisonalitaet[1].anteil + konfiguration.saisonalitaet[2].anteil) / 100 / 3), 0)} Bikes/Tag durchschnittlich`}
            />
            <FormulaCard
              title="Schichtplanung & Kapazität"
              formula={`Benötigte Schichten = ⌈Plan-Menge / Kapazität pro Schicht⌉, wobei Kapazität = ${konfiguration.produktion.kapazitaetProStunde} Bikes/h × ${konfiguration.produktion.stundenProSchicht}h = ${konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht} Bikes`}
              description={`Anzahl der erforderlichen Schichten basierend auf Tagesproduktion und Werkskapazität. Daten aus: src/data/stammdaten.json > produktion.kapazitaetProStunde und produktion.stundenProSchicht. Code-Referenz: src/lib/calculations/zentrale-produktionsplanung.ts > generiereTagesproduktion() > Zeile 289 (schichten Berechnung).`}
              example={`${formatNumber(konfiguration.jahresproduktion / getArbeitstageProJahr(), 0)} Bikes geplant → ${formatNumber(konfiguration.jahresproduktion / getArbeitstageProJahr(), 0)} / ${konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht} = ${formatNumber((konfiguration.jahresproduktion / getArbeitstageProJahr()) / (konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht), 2)} → ${Math.ceil((konfiguration.jahresproduktion / getArbeitstageProJahr()) / (konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht))} Schichten nötig`}
            />
            <FormulaCard
              title="Produktionsauslastung (Capacity Utilization)"
              formula="Auslastung (%) = (Ist-Menge / Max. Kapazität) × 100, wobei Max. Kapazität = Schichten × Kapazität pro Schicht"
              description={`Zeigt die tatsächliche Werksauslastung basierend auf produzierter Menge im Verhältnis zur theoretischen Maximalkapazität. Korrekte Berechnung: Nicht gegen Plan-Menge, sondern gegen maximale Kapazität der eingesetzten Schichten. Code-Referenz: src/lib/calculations/zentrale-produktionsplanung.ts > generiereTagesproduktion() > Zeilen 286-293 (Auslastung Berechnung). SCOR-Metrik: Asset Management > Capacity Utilization.`}
              example={`Tag mit 1.000 Bikes produziert, 1 Schicht (${konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht} Bikes Max.) → 1.000 / ${konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht} × 100 = ${formatNumber((1000 / (konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht)) * 100, 1)}% Auslastung`}
            />
            <FormulaCard
              title="Error Management Konzept (Rundungsfehler-Korrektur)"
              formula="Wenn kumulativer_Fehler ≥ 0.5 → Aufrunden | Wenn kumulativer_Fehler ≤ -0.5 → Abrunden | Sonst → Normal runden"
              description={`KRITISCHES KONZEPT zur Vermeidung systematischer Jahresabweichungen. Problem: 370.000 / ${getArbeitstageProJahr()} = ${formatNumber(konfiguration.jahresproduktion / getArbeitstageProJahr(), 5)} Bikes/Tag (Dezimal!). Naive Rundung würde zu ±100 Bikes Abweichung führen. Lösung: Kumulativer Fehler-Tracker pro Monat, der bei Überschreitung ±0.5 korrigiert. Validierung: Summe(Tagesproduktion[1..365]) === ${formatNumber(konfiguration.jahresproduktion, 0)} exakt! Code-Referenz: src/lib/calculations/zentrale-produktionsplanung.ts > generiereTagesproduktion() > Zeilen 243-268 (Error Management Logik). Dokumentiert in: kontext/Spezifikation_SSOT_MR.ts > ERROR_MANAGEMENT_KONZEPT (Zeilen 1273-1334).`}
              example={`Monat mit 20 Arbeitstagen, 22.000 Bikes geplant → 1.100,00 Bikes/Tag. Tag 1-19: je 1.100, Fehler = 0. Tag 20 mit Fehler: 1.100,00 - 1.100 = 0 → keine Korrektur. Jahressumme: exakt 370.000 Bikes ✓`}
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
            sumRowLabel={`SUMME (365 Tage, ${getArbeitstageProJahr()} Arbeitstage)`}
          />
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
            Mit ATP-Check, Sicherheitsbeständen und Reichweitenberechnung für alle 4 Sattel-Varianten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Formel-Karten für Lager */}
          <div className="mb-6 space-y-4">
            <FormulaCard
              title="ATP-Check Formel (Available-to-Promise)"
              formula="ATP = Verfügbarer Bestand - Sicherheitsbestand ≥ Bedarf, wobei 1 Sattel = 1 Bike (Ermäßigung: Einfache 1:1 Stückliste)"
              description={`Vor jeder Produktion wird geprüft, ob genug Sättel verfügbar sind. Einfache 1:1 Stückliste durch Code-Ermäßigung! Daten aus: src/data/stueckliste.json (Komponenten-Zuordnung), src/data/stammdaten.json (Bauteile). Code-Referenz: src/lib/calculations/zentrale-produktionsplanung.ts > berechneLagerbestaende() > Zeilen 431-501 (Lagerberechnung). Konzept dokumentiert in: kontext/Spezifikation_SSOT_MR.ts > ATP_CHECK_KONZEPT (Zeilen 1702-1755).`}
              example={`Raceline Sattel: Verfügbar = 40.100 - 2.797 = 37.303, Bedarf = 400/Tag → ✓ 93,3 Tage Reichweite. Formel: (40.100 - 2.797) / 400 = 93,3 Tage`}
            />
            <FormulaCard
              title="Reichweite (Days of Supply)"
              formula="Reichweite (Tage) = (Bestand - Sicherheitsbestand) / Tagesbedarf"
              description={`Zeigt an, wie lange der aktuelle Bestand bei gegebenem Verbrauch reicht. Sicherheitsbestand = 7 Tage Puffer. Tagesbedarf = Jahresbedarf / 365 Tage. Code-Referenz: src/lib/calculations/zentrale-produktionsplanung.ts > berechneLagerbestaende() > Zeile 477 (Tagesbedarf), Zeile 478 (Sicherheit), Zeile 479 (Bestand 35% Lagerquote). SCOR-Metrik: Asset Management > Inventory Days of Supply (Zielwert: 7-14 Tage).`}
              example={`Fizik Tundra: Jahresbedarf = ${formatNumber(Math.round(konfiguration.jahresproduktion * 0.52), 0)} Sättel (52% der Bikes). Tagesbedarf = ${formatNumber(Math.round(konfiguration.jahresproduktion * 0.52 / 365), 0)}/Tag. Sicherheit = ${formatNumber(Math.round(konfiguration.jahresproduktion * 0.52 / 365 * 7), 0)} (7 Tage). Bestand = ${formatNumber(Math.round(konfiguration.jahresproduktion * 0.52 * 0.35), 0)} (35%). Reichweite = (${formatNumber(Math.round(konfiguration.jahresproduktion * 0.52 * 0.35), 0)} - ${formatNumber(Math.round(konfiguration.jahresproduktion * 0.52 / 365 * 7), 0)}) / ${formatNumber(Math.round(konfiguration.jahresproduktion * 0.52 / 365), 0)} = ${formatNumber((Math.round(konfiguration.jahresproduktion * 0.52 * 0.35) - Math.round(konfiguration.jahresproduktion * 0.52 / 365 * 7)) / Math.round(konfiguration.jahresproduktion * 0.52 / 365), 1)} Tage`}
            />
            <FormulaCard
              title="Kritischer Bestand & Status"
              formula="Status = 'Kritisch' wenn Bestand < Sicherheitsbestand ODER Reichweite < 7 Tage | 'Niedrig' wenn Reichweite < 14 Tage | Sonst 'OK'"
              description={`Warnsystem für Materialengpässe zur Vermeidung von Produktionsstopps. Sicherheitsbestand = 7 Tage Tagesbedarf als Puffer für unvorhergesehene Verzögerungen (z.B. Schiffsverspätung, Spring Festival). Code-Referenz: src/lib/calculations/zentrale-produktionsplanung.ts > berechneLagerbestaende() > Zeilen 481-486 (Status-Logik). Datenquelle: Dynamisch berechnet aus Stückliste (src/data/stueckliste.json) und Produktionsplan.`}
              example={`Sicherheitsbestand Logik: 7 Tage Puffer bei durchschnittlichem Verbrauch. Bei China-Vorlaufzeit 49 Tage (7 Wochen) ist dies kritischer Frühwarnindikator. Quelle: kontext/Spezifikation_SSOT_MR.ts > ZULIEFERER_CHINA.vorlaufzeit (Zeilen 582-586).`}
            />
            <FormulaCard
              title="Jahresbedarf Berechnung (aus Stückliste)"
              formula="Jahresbedarf(Komponente) = Σ(Produktion(Variante) × Menge in Stückliste) für alle Varianten die Komponente verwenden"
              description={`Berechnet den Gesamtbedarf einer Komponente (z.B. Fizik Tundra Sattel) über alle MTB-Varianten die diese verwenden. Daten aus: src/data/stueckliste.json (Zuordnung MTB → Komponente), src/data/stammdaten.json > varianten (Anteile). Code-Referenz: src/lib/calculations/zentrale-produktionsplanung.ts > berechneLagerbestaende() > Zeilen 457-469 (Bedarfsberechnung). Ermäßigung: Einfache 1:1 Stückliste (1 Sattel = 1 Bike)!`}
              example={`Fizik Tundra wird verwendet in: Downhill (${formatNumber(konfiguration.jahresproduktion * 0.10, 0)} Bikes), Freeride (${formatNumber(konfiguration.jahresproduktion * 0.05, 0)}), Performance (${formatNumber(konfiguration.jahresproduktion * 0.12, 0)}). Jahresbedarf = ${formatNumber(konfiguration.jahresproduktion * 0.10, 0)} + ${formatNumber(konfiguration.jahresproduktion * 0.05, 0)} + ${formatNumber(konfiguration.jahresproduktion * 0.12, 0)} = ${formatNumber(konfiguration.jahresproduktion * (0.10 + 0.05 + 0.12), 0)} Sättel/Jahr`}
            />
            <FormulaCard
              title="Lagerbewegung (Tagesbasis)"
              formula="Endbestand = Anfangsbestand + Zugänge - Verbrauch, wobei Verbrauch = Σ(Produktion × Stücklistenmenge) für alle Varianten"
              description={`Simuliert tägliche Lagerbewegungen über 365 Tage. Zugänge: Vereinfacht als konstante Nachlieferung (Tagesbedarf × 1,1). In Realität: Inbound-Logik mit Losgrößen 500 und Vorlaufzeit 49 Tage. Verbrauch: Berechnet aus Tagesproduktion und Stückliste (1:1). Code-Referenz: src/lib/calculations/zentrale-produktionsplanung.ts > berechneTagesLagerbestaende() > Zeilen 503-682 (Komplette Tages-Simulation). Anfangsbestand: 35% des Jahresbedarfs am 01.01.2027.`}
              example={`Tag 100 (Arbeitstag): Fizik Tundra Anfangsbestand 50.000, Zugang +${formatNumber(Math.round(konfiguration.jahresproduktion * 0.52 / 365 * 1.1), 0)}, Verbrauch -${formatNumber(Math.round(konfiguration.jahresproduktion * 0.52 / 365), 0)} → Endbestand ${formatNumber(50000 + Math.round(konfiguration.jahresproduktion * 0.52 / 365 * 1.1) - Math.round(konfiguration.jahresproduktion * 0.52 / 365), 0)}`}
            />
          </div>

          {/* Tägliche Lagerbestände für ALLE Bauteile - Excel-Tabelle */}
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
                  key: 'sicherheit',
                  label: 'Sicherheit',
                  width: '90px',
                  align: 'right',
                  formula: '7 Tage Puffer',
                  format: (val) => formatNumber(val, 0),
                  sumable: false
                },
                {
                  key: 'verfuegbar',
                  label: 'Verfügbar (ATP)',
                  width: '120px',
                  align: 'right',
                  formula: 'Endbestand - Sicherheit',
                  format: (val) => formatNumber(val, 0),
                  sumable: false
                },
                {
                  key: 'reichweite',
                  label: 'Reichweite',
                  width: '90px',
                  align: 'right',
                  formula: 'Verfügbar / Tagesbedarf',
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
                  sicherheit: bauteil.sicherheit,
                  verfuegbar: bauteil.verfuegbar,
                  reichweite: bauteil.reichweite,
                  status: bauteil.status
                }))
              })}
              maxHeight="600px"
              showFormulas={true}
              showSums={false}
            />
            
            <p className="text-xs text-green-600 mt-3">
              💡 <strong>Hinweis:</strong> Zeigt alle 365 Tage × 4 Komponenten = 1.460 Zeilen. 
              Zugang vereinfacht als Tagesbedarf × 1,1 (In Realität: Inbound mit Losgrößen 500 + Vorlaufzeit 49 Tage).
              Code-Referenz: src/lib/calculations/zentrale-produktionsplanung.ts → berechneTagesLagerbestaende() (Zeilen 566-680)
            </p>
          </div>

          {/* Übersicht: Aggregierte Lagerbestände */}
          <div>
            <h4 className="font-semibold text-green-900 mb-3">Übersicht: Aggregierte Lagerbestände (Aktueller Stand)</h4>
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
              maxHeight="300px"
              showFormulas={true}
              showSums={true}
              sumRowLabel="GESAMT Lagerbestand"
            />
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