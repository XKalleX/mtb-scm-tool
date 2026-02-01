'use client'

/**
 * ========================================
 * OEM PRODUKTIONSPROGRAMM
 * ========================================
 * 
 * Tagesgenaue Produktionsplanung mit:
 * - 365 Tage Planung für alle 8 MTB-Varianten
 * - Saisonale Verteilung (April-Peak)
 * - Error-Management für Rundungsfehler
 * - Stücklisten-Übersicht
 * - Szenarien-Integration (Marketing, Maschinenausfall, etc.)
 * - Ansicht für alle Varianten gleichzeitig
 * 
 * ✅ DYNAMISCH: Alle Werte aus KonfigurationContext
 * ✅ SZENARIEN: Berücksichtigt aktive Szenarien aus SzenarienContext
 * ✅ ERROR MANAGEMENT: Kumulativer Fehler korrekt berechnet und angezeigt
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CollapsibleInfo, CollapsibleInfoGroup, InfoItem } from '@/components/ui/collapsible-info'
import { VariantenPieChart, TagesproduktionChart, KomponentenBarChart, AlleVariantenProduktionChart } from '@/components/ui/table-charts'
import { TrendingUp, AlertCircle, Download, Zap, Info, Calendar, CalendarDays, CalendarRange, Edit2, Check, X } from 'lucide-react'
import { formatNumber, formatDate, toLocalISODateString } from '@/lib/utils'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import { exportToCSV, exportToJSON, exportToXLSX, exportToMultiSheetXLSX } from '@/lib/export'
import { showError, showSuccess } from '@/lib/notifications'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { ActiveScenarioBanner } from '@/components/ActiveScenarioBanner'
import { DeltaCell, DeltaBadge } from '@/components/DeltaCell'
import React, { useState, useMemo, useCallback } from 'react'
import { 
  generiereAlleVariantenProduktionsplaene,
  berechneProduktionsStatistiken
} from '@/lib/calculations/zentrale-produktionsplanung'
import { useSzenarioBerechnung } from '@/lib/hooks/useSzenarioBerechnung'
import { getDateRowBackgroundClasses, getDateTooltip } from '@/lib/date-classification'
import { 
  aggregiereNachWoche, 
  aggregiereNachMonat,
  WochenProduktionEntry,
  MonatsProduktionEntry
} from '@/lib/helpers/programm-aggregation'

/**
 * Zeitperioden für die Ansichtswahl
 */
type ZeitperiodeTyp = 'tag' | 'woche' | 'monat'

/**
 * Type für Stücklisten-Komponenten
 */
interface StuecklistenKomponente {
  name: string
  menge: number
}

/**
 * OEM Programm Hauptseite
 * Zeigt Produktionsplanung und Stücklisten
 * 
 * ✅ Nutzt dynamische Konfiguration aus KonfigurationContext
 * ✅ Berücksichtigt aktive Szenarien aus SzenarienContext
 * ✅ Zeigt kumulativen Error korrekt an
 */
export default function OEMProgrammPage() {
  const [selectedVariante, setSelectedVariante] = useState('MTBAllrounder')
  // State für Zeitperiodenansicht (Tag/Woche/Monat)
  const [zeitperiode, setZeitperiode] = useState<ZeitperiodeTyp>('tag')
  // State für manuelle Produktionsanpassungen (Wochen- oder Monatsbasis)
  // Key: "<zeitperiode>_<periode>_<varianteId>", Value: Anpassungsmenge (+ oder -)
  const [produktionsAnpassungen, setProduktionsAnpassungen] = useState<Record<string, number>>({})
  // Editing State
  const [editingCell, setEditingCell] = useState<{row: number, varianteId: string} | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  
  // Hole Konfiguration aus Context
  const { konfiguration, isInitialized, getArbeitstageProJahr, getJahresproduktionProVariante } = useKonfiguration()
  
  // ✅ NEUER HOOK: Nutze szenario-aware Berechnungen
  const {
    hasSzenarien,
    aktiveSzenarienCount,
    aktiveSzenarien,
    variantenPlaene,
    statistiken
  } = useSzenarioBerechnung()

  // Baseline-Produktionspläne (für Vergleich wenn keine Szenarien aktiv)
  const baselineProduktionsplaene = useMemo(() => 
    generiereAlleVariantenProduktionsplaene(konfiguration),
    [konfiguration]
  )
  
  // ✅ WICHTIG: Nutze Szenario-Pläne wenn Szenarien aktiv, sonst Baseline
  // Das stellt sicher, dass ALLE Tabellen die Szenarien-Auswirkungen anzeigen!
  const produktionsplaene = useMemo(() => {
    if (hasSzenarien && Object.keys(variantenPlaene).length > 0) {
      return variantenPlaene
    }
    return baselineProduktionsplaene
  }, [hasSzenarien, variantenPlaene, baselineProduktionsplaene])

  // Berechne Statistiken aus Konfiguration
  const arbeitstage = isInitialized ? getArbeitstageProJahr() : 252
  const jahresproduktionProVariante = isInitialized ? getJahresproduktionProVariante() : {}
  
  // Erstelle stueckliste basierend auf Konfiguration
  const stuecklistenMap = useMemo(() => {
    const map: Record<string, { komponenten: Record<string, { name: string; menge: number }> }> = {}
    konfiguration.stueckliste.forEach(s => {
      if (!map[s.mtbVariante]) {
        map[s.mtbVariante] = { komponenten: {} }
      }
      map[s.mtbVariante].komponenten[s.bauteilId] = { 
        name: s.bauteilName, 
        menge: s.menge 
      }
    })
    return map
  }, [konfiguration.stueckliste])
  
  if (!isInitialized) {
    return <div className="text-center py-8">Lade Konfiguration...</div>
  }
  
  /**
   * Exportiert Produktionsplan als CSV
   * ✅ VOLLSTÄNDIGER EXPORT: ALLE 365 Tage (nicht nur Tage mit Produktion > 0)
   * ✅ ZUSÄTZLICHE SPALTEN: Wochentag, Feiertag-Info für bessere Analyse
   */
  /**
   * Exportiert Produktionsplan als CSV
   * ✅ ALLE VARIANTEN: Exportiert alle 8 MTB-Varianten in einer Datei
   * ✅ VOLLSTÄNDIGER EXPORT: ALLE 365 Tage
   * ✅ ZUSÄTZLICHE SPALTEN: Wochentag, Feiertag-Info für bessere Analyse
   */
  const handleExportCSV = () => {
    if (!produktionsplaene || Object.keys(produktionsplaene).length === 0) {
      showError('Keine Daten zum Exportieren verfügbar')
      return
    }
    
    // ✅ FIX: Exportiere ALLE Varianten, nicht nur selectedVariante
    const alleVariantenData: any[] = []
    
    // Iteriere über alle Varianten
    Object.entries(produktionsplaene).forEach(([varianteId, plan]) => {
      const varianteName = plan.varianteName || varianteId
      
      // Füge alle 365 Tage dieser Variante hinzu
      plan.tage.forEach(tag => {
        const datum = tag.datum
        const wochentag = datum.toLocaleDateString('de-DE', { weekday: 'long' })
        const istWochenende = datum.getDay() === 0 || datum.getDay() === 6
        
        alleVariantenData.push({
          'MTB-Variante': varianteName,
          'Varianten-ID': varianteId,
          Datum: formatDate(tag.datum),
          Wochentag: wochentag,
          'Ist Wochenende': istWochenende ? 'Ja' : 'Nein',
          'Plan-Menge': tag.planMenge,
          'Ist-Menge': tag.istMenge,
          'Abweichung': tag.abweichung,
          'Schichten': tag.schichten,
          'Auslastung': tag.auslastung + '%',
          'Fehler (kumulativ)': tag.monatsFehlerNachher?.toFixed(3) || '0.000'
        })
      })
    })
    
    const variantenCount = Object.keys(produktionsplaene).length
    exportToCSV(
      alleVariantenData, 
      `produktionsplan_alle_varianten_${konfiguration.planungsjahr}_vollstaendig`,
      { cleanEmojis: true } // Entferne Emojis für bessere CSV-Kompatibilität
    )
    showSuccess(`✅ Produktionsplan exportiert (${variantenCount} Varianten × 365 Tage = ${alleVariantenData.length} Zeilen!)`)
  }
  
  /**
   * Exportiert alle Daten als JSON
   */
  const handleExportJSON = () => {
    if (!produktionsplaene) {
      showError('Keine Daten zum Exportieren verfügbar')
      return
    }
    
    exportToJSON(produktionsplaene, `alle_produktionsplaene_${konfiguration.planungsjahr}`)
    showSuccess('Daten erfolgreich als JSON exportiert')
  }
  
  /**
   * Exportiert Produktionsplan als XLSX (Excel-Format mit Formatierung)
   * ✅ ALLE VARIANTEN: Multi-Sheet Export mit einem Sheet pro Variante
   * ✅ VOLLSTÄNDIGER EXPORT: ALLE 365 Tage pro Variante
   * ✅ FORMATIERUNG: Header, Freeze Panes, Auto-Filter
   */
  const handleExportXLSX = async () => {
    if (!produktionsplaene || Object.keys(produktionsplaene).length === 0) {
      showError('Keine Daten zum Exportieren verfügbar')
      return
    }
    
    try {
      // ✅ FIX: Erstelle Multi-Sheet XLSX mit allen Varianten
      const sheets = Object.entries(produktionsplaene).map(([varianteId, plan]) => {
        const varianteName = plan.varianteName || varianteId
        
        // Exportiere alle 365 Tage dieser Variante
        const data = plan.tage.map(tag => {
          const datum = tag.datum
          const wochentag = datum.toLocaleDateString('de-DE', { weekday: 'long' })
          const istWochenende = datum.getDay() === 0 || datum.getDay() === 6
          
          return {
            Datum: formatDate(tag.datum),
            Wochentag: wochentag,
            'Ist Wochenende': istWochenende ? 'Ja' : 'Nein',
            'Plan-Menge': tag.planMenge,
            'Ist-Menge': tag.istMenge,
            'Abweichung': tag.abweichung,
            'Schichten': tag.schichten,
            'Auslastung (%)': tag.auslastung,
            'Fehler (kumulativ)': parseFloat(tag.monatsFehlerNachher?.toFixed(3) || '0')
          }
        })
        
        return {
          name: varianteName.substring(0, 31), // Excel Limit: 31 Zeichen
          data: data,
          title: `Produktionsplan ${varianteName} - ${konfiguration.planungsjahr}`,
          columnWidths: {
            'Datum': 12,
            'Wochentag': 12,
            'Ist Wochenende': 14,
            'Plan-Menge': 12,
            'Ist-Menge': 12,
            'Abweichung': 12,
            'Schichten': 10,
            'Auslastung (%)': 14,
            'Fehler (kumulativ)': 18
          }
        }
      })
      
      await exportToMultiSheetXLSX(
        sheets,
        `produktionsplan_alle_varianten_${konfiguration.planungsjahr}_vollstaendig`,
        {
          author: 'MTB SCM Tool - WI3 Team',
          freezeHeader: true,
          autoFilter: true
        }
      )
      
      const totalRows = sheets.reduce((sum, s) => sum + s.data.length, 0)
      showSuccess(`✅ Excel-Datei exportiert (${sheets.length} Sheets, ${totalRows} Zeilen gesamt - Vollständig!)`)
    } catch (error) {
      console.error('Fehler beim XLSX-Export:', error)
      showError('Fehler beim Excel-Export')
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header mit Export-Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OEM Produktionsprogrammplanung</h1>
          <p className="text-muted-foreground mt-1">
            Tagesgenaue Planung für 365 Tage × 8 Varianten mit Error-Management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV Export
          </Button>
          <Button variant="outline" onClick={handleExportXLSX}>
            <Download className="h-4 w-4 mr-2" />
            Excel Export
          </Button>
          <Button variant="outline" onClick={handleExportJSON}>
            <Download className="h-4 w-4 mr-2" />
            JSON Export
          </Button>
        </div>
      </div>

      {/* Aktive Szenarien Banner */}
      <ActiveScenarioBanner showDetails={false} />

      {/* ✅ SZENARIEN AKTIV: Zeige Auswirkungen */}
      {hasSzenarien && (
        <CollapsibleInfo
          title={`Szenarien aktiv (${aktiveSzenarienCount})`}
          variant="success"
          icon={<Zap className="h-5 w-5" />}
          defaultOpen={true}
        >
          <div className="text-sm text-green-800">
            <p className="mb-3">
              <strong>✅ Szenarien wirken sich auf alle Berechnungen aus!</strong> Die Produktionsplanung 
              zeigt jetzt Deltas (+ / -) gegenüber dem Baseline-Plan. Betroffene Zeilen sind markiert.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {aktiveSzenarien.map(s => (
                <span key={s.id} className="text-xs bg-green-200 text-green-900 px-2 py-1 rounded flex items-center gap-1">
                  {s.typ === 'marketingaktion' && '📈'}
                  {s.typ === 'maschinenausfall' && '🔧'}
                  {s.typ === 'wasserschaden' && '💧'}
                  {s.typ === 'schiffsverspaetung' && '🚢'}
                  {s.typ}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-green-300">
              <div>
                <div className="text-xs text-green-600">Plan-Delta</div>
                <DeltaBadge delta={statistiken.deltaGeplant} suffix=" Bikes" />
              </div>
              <div>
                <div className="text-xs text-green-600">Ist-Delta</div>
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
            </div>
          </div>
        </CollapsibleInfo>
      )}

      {/* Übersicht Cards - MIT SZENARIO-DELTAS */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={hasSzenarien ? 'border-green-200' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Jahresproduktion
              {hasSzenarien && <Zap className="h-3 w-3 inline ml-1 text-green-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DeltaCell 
              value={hasSzenarien ? statistiken.geplant : konfiguration.jahresproduktion}
              delta={statistiken.deltaGeplant}
              format={{ suffix: '' }}
            />
            <p className="text-xs text-muted-foreground">MTBs gesamt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Produktionstage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{arbeitstage}</div>
            <p className="text-xs text-muted-foreground">von 365 Tagen</p>
          </CardContent>
        </Card>

        <Card className={hasSzenarien ? 'border-green-200' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Durchschnitt/Tag
              {hasSzenarien && <Zap className="h-3 w-3 inline ml-1 text-green-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DeltaCell 
              value={hasSzenarien ? Math.round(statistiken.produziert / arbeitstage) : Math.round(konfiguration.jahresproduktion / arbeitstage)}
              delta={hasSzenarien ? Math.round(statistiken.deltaProduziert / arbeitstage) : 0}
              format={{ suffix: '' }}
            />
            <p className="text-xs text-muted-foreground">Bikes pro Arbeitstag</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Varianten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{konfiguration.varianten.length}</div>
            <p className="text-xs text-muted-foreground">MTB-Modelle</p>
          </CardContent>
        </Card>
      </div>

      {/* Hauptinhalt mit Tabs */}
      <Tabs defaultValue="allVariants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="allVariants">Tagesplanung (Alle Varianten)</TabsTrigger>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="stueckliste">Stückliste</TabsTrigger>
          <TabsTrigger value="error">Error-Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Roter Faden: Saisonalität → Tagesplanung */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Saisonale Verteilung & Tagesplanung
              </CardTitle>
              <CardDescription>
                Von der Jahresplanung (370.000 Bikes) über saisonale Verteilung zur tagesgenauen Produktion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Roter Faden Visualisierung */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex-1 text-center">
                    <div className="text-xs text-muted-foreground mb-1">1. Jahresproduktion</div>
                    <div className="font-bold text-lg">{formatNumber(konfiguration.jahresproduktion, 0)} Bikes</div>
                    <div className="text-xs text-muted-foreground">Gesamtziel {konfiguration.planungsjahr}</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="flex-1 text-center">
                    <div className="text-xs text-muted-foreground mb-1">2. Saisonale Verteilung</div>
                    <div className="font-bold text-lg text-green-600">Jan {konfiguration.saisonalitaet[0]?.anteil}% ... Apr {konfiguration.saisonalitaet[3]?.anteil}%</div>
                    <div className="text-xs text-muted-foreground">Monatliche Peaks</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="flex-1 text-center">
                    <div className="text-xs text-muted-foreground mb-1">3. Tagesplanung</div>
                    <div className="font-bold text-lg text-blue-600">{arbeitstage} Tage</div>
                    <div className="text-xs text-muted-foreground">Mit Error-Management</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="flex-1 text-center">
                    <div className="text-xs text-muted-foreground mb-1">4. Sattel-Bedarf</div>
                    <div className="font-bold text-lg text-orange-600">{formatNumber(konfiguration.jahresproduktion, 0)} Stk</div>
                    <div className="text-xs text-muted-foreground">1:1 Verhältnis</div>
                  </div>
                </div>
              </div>

              {/* Saisonalität Balkendiagramm */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Saisonale Produktionsverteilung (% der Jahresproduktion)</h4>
                <div className="space-y-2">
                  {konfiguration.saisonalitaet.map((s) => {
                    const bikes = Math.round(konfiguration.jahresproduktion * (s.anteil / 100))
                    const peakMonat = konfiguration.saisonalitaet.reduce((max, m) => m.anteil > max.anteil ? m : max)
                    const isPeak = s.monat === peakMonat.monat
                    
                    return (
                      <div key={s.monat} className="flex items-center gap-4">
                        <div className="w-20 text-sm font-medium">{s.name}</div>
                        <div className="flex-1 bg-slate-200 rounded-full h-8 relative">
                          <div 
                            className={`h-8 rounded-full ${isPeak ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-blue-500'} flex items-center justify-between px-3`}
                            style={{ width: `${Math.min(s.anteil * 6.25, 100)}%` }}
                          >
                            <span className="text-xs text-white font-medium">{s.anteil}%</span>
                            <span className="text-xs text-white">{formatNumber(bikes, 0)} Bikes</span>
                          </div>
                          {isPeak && (
                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-green-600">
                              🏔️ PEAK
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Erklärung: Saisonalität → Tagesplanung */}
              <CollapsibleInfo
                title="Wie wird die Saisonalität auf die Tagesplanung übertragen?"
                variant="info"
                icon={<AlertCircle className="h-4 w-4" />}
              >
                {(() => {
                  const peakMonat = konfiguration.saisonalitaet.reduce((max, m) => m.anteil > max.anteil ? m : max)
                  const peakProduktion = Math.round(konfiguration.jahresproduktion * (peakMonat.anteil / 100))
                  const peakArbeitstage = 22 // Approximation
                  
                  return (
                    <div className="text-sm text-blue-800 space-y-2">
                      <p>
                        <strong>Schritt 1:</strong> {peakMonat.name} hat {peakMonat.anteil}% der Jahresproduktion = {formatNumber(peakProduktion, 0)} Bikes
                      </p>
                      <p>
                        <strong>Schritt 2:</strong> {peakMonat.name} {konfiguration.planungsjahr} hat ca. {peakArbeitstage} Arbeitstage (ohne Wochenenden/Feiertage)
                      </p>
                      <p>
                        <strong>Schritt 3:</strong> {formatNumber(peakProduktion, 0)} / {peakArbeitstage} ≈ {formatNumber(peakProduktion / peakArbeitstage, 1)} Bikes pro Tag im {peakMonat.name}
                      </p>
                      <p>
                        <strong>Schritt 4:</strong> Error-Management korrigiert Rundungsfehler → exakt {formatNumber(peakProduktion, 0)} Bikes am Monatsende
                      </p>
                      <p className="pt-2 border-t border-blue-300 mt-3">
                        → Diese Logik sehen Sie detailliert im Tab <strong>&quot;Tagesplanung&quot;</strong> für jede der {konfiguration.varianten.length} Varianten!
                      </p>
                    </div>
                  )
                })()}
              </CollapsibleInfo>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Produktionspläne pro Variante</CardTitle>
              <CardDescription>
                Jahresproduktion aufgeteilt nach Varianten mit Sattel-Bedarf
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variante</TableHead>
                    <TableHead>Sattel-Typ</TableHead>
                    <TableHead className="text-right">Jahresproduktion</TableHead>
                    <TableHead className="text-right">Sattel-Bedarf</TableHead>
                    <TableHead className="text-right">Ø pro AT</TableHead>
                    <TableHead className="text-right">Peak Monat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {konfiguration.varianten.map(v => {
                    const jahresprod = jahresproduktionProVariante[v.id] || Math.round(konfiguration.jahresproduktion * v.anteilPrognose)
                    const durchschnitt = jahresprod / arbeitstage
                    const peakMonat = konfiguration.saisonalitaet.reduce((max, m) => m.anteil > max.anteil ? m : max)
                    const peakProduktion = jahresprod * (peakMonat.anteil / 100)
                    const stl = stuecklistenMap[v.id]
                    const sattel = stl ? Object.values(stl.komponenten)[0] as StuecklistenKomponente : null
                    
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell className="text-sm text-blue-600">{sattel?.name || 'N/A'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatNumber(jahresprod, 0)} Bikes</TableCell>
                        <TableCell className="text-right text-blue-600">{formatNumber(jahresprod, 0)} Stk</TableCell>
                        <TableCell className="text-right">{formatNumber(durchschnitt, 1)}</TableCell>
                        <TableCell className="text-right">{formatNumber(peakProduktion, 0)}</TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={2}>GESAMT</TableCell>
                    <TableCell className="text-right">{formatNumber(konfiguration.jahresproduktion, 0)} Bikes</TableCell>
                    <TableCell className="text-right text-blue-600">{formatNumber(konfiguration.jahresproduktion, 0)} Stk</TableCell>
                    <TableCell className="text-right">{formatNumber(konfiguration.jahresproduktion / arbeitstage, 1)}</TableCell>
                    <TableCell className="text-right">{formatNumber(konfiguration.jahresproduktion * (konfiguration.saisonalitaet.reduce((max, m) => m.anteil > max.anteil ? m : max).anteil / 100), 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* 📊 VISUALISIERUNG: Varianten-Pie-Chart */}
              <div className="mt-6">
                <VariantenPieChart
                  daten={konfiguration.varianten.map(v => {
                    const jahresprod = jahresproduktionProVariante[v.id] || Math.round(konfiguration.jahresproduktion * v.anteilPrognose)
                    return {
                      id: v.id,
                      name: v.name.replace('MTB ', ''),
                      anteil: v.anteilPrognose,
                      menge: jahresprod
                    }
                  })}
                  height={350}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stückliste Tab - NUR SÄTTEL */}
        <TabsContent value="stueckliste" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stückliste - Mountain Bikes</CardTitle>
              <CardDescription>
                Vereinfachte Stückliste: 1x Sattel = 1 Fahrrad (Rahmen & Gabeln vereinfacht)
              </CardDescription>
            </CardHeader>
            <CardContent>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variante</TableHead>
                    <TableHead>Sattel-Typ</TableHead>
                    <TableHead className="text-right">Menge/Bike</TableHead>
                    <TableHead className="text-right">Jahresbedarf</TableHead>
                    <TableHead>Zulieferer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {konfiguration.varianten.map((v) => {
                    const stl = stuecklistenMap[v.id]
                    if (!stl) return null
                    
                    // Nur Sattel extrahieren
                    const sattel = Object.values(stl.komponenten)[0] as StuecklistenKomponente
                    const jahresprod = jahresproduktionProVariante[v.id] || Math.round(konfiguration.jahresproduktion * v.anteilPrognose)
                    
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell className="text-sm font-medium text-blue-600">
                          {sattel?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">{sattel?.menge || 1}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatNumber(jahresprod, 0)} Stück
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {konfiguration.lieferant.land} ({konfiguration.lieferant.gesamtVorlaufzeitTage} Tage Vorlauf)
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={3}>GESAMT Sättel benötigt:</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(konfiguration.jahresproduktion, 0)} Stück
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Sattel-Varianten Übersicht */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3">Sattel-Varianten Aggregation (für Bestellung):</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {konfiguration.bauteile.map(bauteil => {
                    const bedarf = konfiguration.stueckliste
                      .filter(s => s.bauteilId === bauteil.id)
                      .reduce((sum, s) => {
                        const variante = konfiguration.varianten.find(v => v.id === s.mtbVariante)
                        if (!variante) return sum
                        return sum + Math.round(konfiguration.jahresproduktion * variante.anteilPrognose) * s.menge
                      }, 0)
                    
                    return (
                      <div key={bauteil.id} className="bg-slate-50 border rounded-lg p-3">
                        <div className="text-sm font-medium">{bauteil.name}</div>
                        <div className="text-lg font-bold text-blue-600">{formatNumber(bedarf, 0)} Stück/Jahr</div>
                        <div className="text-xs text-muted-foreground">
                          ≈ {formatNumber(bedarf / arbeitstage, 0)} Stück/Arbeitstag
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 📊 VISUALISIERUNG: Komponenten-Bar-Chart */}
              <div className="mt-6">
                <KomponentenBarChart
                  daten={konfiguration.bauteile.map(bauteil => {
                    const bedarf = konfiguration.stueckliste
                      .filter(s => s.bauteilId === bauteil.id)
                      .reduce((sum, s) => {
                        const variante = konfiguration.varianten.find(v => v.id === s.mtbVariante)
                        if (!variante) return sum
                        return sum + Math.round(konfiguration.jahresproduktion * variante.anteilPrognose) * s.menge
                      }, 0)
                    
                    return {
                      id: bauteil.id,
                      name: bauteil.name,
                      bedarf: bedarf
                    }
                  })}
                  height={200}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NEU: Alle Varianten in einer Ansicht */}
        <TabsContent value="allVariants" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Produktionsplanung - Alle Varianten</CardTitle>
                  <CardDescription>
                    Produktionsplanung für alle 8 MTB-Varianten mit kumulativem Error Management
                  </CardDescription>
                </div>
                {/* Zeitperioden-Schalter */}
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1" role="group" aria-label="Zeitperioden-Auswahl">
                  <Button
                    variant={zeitperiode === 'tag' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setZeitperiode('tag')}
                    className="gap-1"
                  >
                    <Calendar className="h-4 w-4" />
                    Tag
                  </Button>
                  <Button
                    variant={zeitperiode === 'woche' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setZeitperiode('woche')}
                    className="gap-1"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Woche
                  </Button>
                  <Button
                    variant={zeitperiode === 'monat' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setZeitperiode('monat')}
                    className="gap-1"
                  >
                    <CalendarRange className="h-4 w-4" />
                    Monat
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Kompakte Varianten-Statistik (8 Kacheln in einer Zeile) */}
              <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
                {Object.entries(produktionsplaene).map(([varianteId, plan]) => {
                  const stats = berechneProduktionsStatistiken(plan.tage)
                  const variante = konfiguration.varianten.find(v => v.id === varianteId)
                  
                  return (
                    <div 
                      key={varianteId} 
                      className={`border rounded-lg p-2 text-center ${Math.abs(plan.abweichung) <= 1 ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}`}
                    >
                      <div className="text-xs font-medium truncate" title={variante?.name}>
                        {variante?.name.replace('MTB ', '')}
                      </div>
                      <div className="text-sm font-bold">{formatNumber(stats.produziert, 0)}</div>
                      <div className={`text-[10px] ${Math.abs(plan.abweichung) <= 1 ? 'text-green-600' : 'text-orange-600'}`}>
                        {Math.abs(plan.abweichung) <= 1 ? '✓ OK' : `Δ ${plan.abweichung}`}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Tabellen-Ansicht basierend auf Zeitperiode */}
              {produktionsplaene && (() => {
                const referenzVariante = Object.values(produktionsplaene)[0]
                
                // Generiere aggregierte Daten je nach Zeitperiode
                if (zeitperiode === 'woche') {
                  // Wochenansicht
                  const wochenDaten = konfiguration.varianten.map(v => ({
                    varianteId: v.id,
                    varianteName: v.name,
                    wochen: aggregiereNachWoche(produktionsplaene[v.id].tage)
                  }))
                  
                  // Finde alle eindeutigen Kalenderwochen
                  const alleKWs = [...new Set(wochenDaten.flatMap(v => v.wochen.map(w => w.kalenderwoche)))].sort((a, b) => a - b)
                  
                  return (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-slate-50 p-2 border-b flex items-center justify-between">
                        <h4 className="font-semibold text-sm">
                          Wochenansicht (KW 1-{Math.max(...alleKWs)}) - {alleKWs.length} Kalenderwochen
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          Doppelklick auf Zelle zum Bearbeiten
                        </span>
                      </div>
                      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-slate-100 border-b">
                            <tr>
                              <th className="p-2 text-left font-medium">KW</th>
                              <th className="p-2 text-left font-medium">Zeitraum</th>
                              <th className="p-2 text-center font-medium">AT</th>
                              {konfiguration.varianten.map(v => (
                                <th key={v.id} className="p-2 text-right font-medium border-l">
                                  {v.name.replace('MTB ', '')}
                                </th>
                              ))}
                              <th className="p-2 text-right font-medium border-l bg-slate-200">Gesamt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {alleKWs.map((kw, rowIdx) => {
                              let gesamt = 0
                              
                              return (
                                <tr key={kw} className="border-b hover:bg-slate-50">
                                  <td className="p-2 text-left font-medium">KW {kw}</td>
                                  <td className="p-2 text-left text-xs text-muted-foreground">
                                    {(() => {
                                      const woche = wochenDaten[0]?.wochen.find(w => w.kalenderwoche === kw)
                                      if (woche) {
                                        return `${formatDate(woche.startDatum)} - ${formatDate(woche.endDatum)}`
                                      }
                                      return '-'
                                    })()}
                                  </td>
                                  <td className="p-2 text-center text-xs">
                                    {wochenDaten[0]?.wochen.find(w => w.kalenderwoche === kw)?.anzahlArbeitstage || 0}
                                  </td>
                                  {konfiguration.varianten.map(v => {
                                    const varianteData = wochenDaten.find(vd => vd.varianteId === v.id)
                                    const woche = varianteData?.wochen.find(w => w.kalenderwoche === kw)
                                    const menge = woche?.planMenge || 0
                                    gesamt += menge
                                    
                                    const isEditing = editingCell?.row === rowIdx && editingCell?.varianteId === v.id
                                    
                                    return (
                                      <td 
                                        key={`${kw}-${v.id}`} 
                                        className="p-2 text-right border-l cursor-pointer hover:bg-blue-50"
                                        onDoubleClick={() => {
                                          setEditingCell({ row: rowIdx, varianteId: v.id })
                                          setEditValue(menge.toString())
                                        }}
                                      >
                                        {isEditing ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              className="w-16 px-1 py-0.5 text-right border rounded text-sm"
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              aria-label={`Produktionsmenge für ${v.name} in KW ${kw} bearbeiten`}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  const newValue = parseInt(editValue) || 0
                                                  const delta = newValue - menge
                                                  if (delta !== 0) {
                                                    setProduktionsAnpassungen(prev => ({
                                                      ...prev,
                                                      [`woche_${kw}_${v.id}`]: (prev[`woche_${kw}_${v.id}`] || 0) + delta
                                                    }))
                                                    showSuccess(`KW ${kw}, ${v.name}: ${delta > 0 ? '+' : ''}${delta} Bikes angepasst`)
                                                  }
                                                  setEditingCell(null)
                                                } else if (e.key === 'Escape') {
                                                  setEditingCell(null)
                                                }
                                              }}
                                              autoFocus
                                            />
                                            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setEditingCell(null)}>
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          formatNumber(menge, 0)
                                        )}
                                      </td>
                                    )
                                  })}
                                  <td className="p-2 text-right font-bold border-l bg-slate-50">{formatNumber(gesamt, 0)}</td>
                                </tr>
                              )
                            })}
                            {/* Summenzeile */}
                            <tr className="bg-slate-100 font-bold border-t-2">
                              <td className="p-2" colSpan={3}>JAHRESSUMME</td>
                              {konfiguration.varianten.map(v => {
                                const varianteData = wochenDaten.find(vd => vd.varianteId === v.id)
                                const summe = varianteData?.wochen.reduce((sum, w) => sum + w.planMenge, 0) || 0
                                return (
                                  <td key={`sum-${v.id}`} className="p-2 text-right border-l">{formatNumber(summe, 0)}</td>
                                )
                              })}
                              <td className="p-2 text-right border-l bg-slate-200">
                                {formatNumber(wochenDaten.reduce((total, vd) => 
                                  total + vd.wochen.reduce((sum, w) => sum + w.planMenge, 0), 0
                                ), 0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                } else if (zeitperiode === 'monat') {
                  // Monatsansicht
                  const monatsDaten = konfiguration.varianten.map(v => ({
                    varianteId: v.id,
                    varianteName: v.name,
                    monate: aggregiereNachMonat(produktionsplaene[v.id].tage)
                  }))
                  
                  return (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-slate-50 p-2 border-b flex items-center justify-between">
                        <h4 className="font-semibold text-sm">
                          Monatsansicht (Januar - Dezember)
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          Doppelklick auf Zelle zum Bearbeiten
                        </span>
                      </div>
                      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-slate-100 border-b">
                            <tr>
                              <th className="p-2 text-left font-medium">Monat</th>
                              <th className="p-2 text-center font-medium">AT</th>
                              <th className="p-2 text-center font-medium">Saisonalität</th>
                              {konfiguration.varianten.map(v => (
                                <th key={v.id} className="p-2 text-right font-medium border-l">
                                  {v.name.replace('MTB ', '')}
                                </th>
                              ))}
                              <th className="p-2 text-right font-medium border-l bg-slate-200">Gesamt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monatsDaten[0]?.monate.map((monat, rowIdx) => {
                              let gesamt = 0
                              const saisonAnteil = konfiguration.saisonalitaet.find(s => s.monat === monat.monat)?.anteil || 0
                              
                              return (
                                <tr key={monat.monat} className="border-b hover:bg-slate-50">
                                  <td className="p-2 text-left font-medium">{monat.monatName}</td>
                                  <td className="p-2 text-center text-xs">{monat.anzahlArbeitstage}</td>
                                  <td className="p-2 text-center">
                                    <span className={`text-xs px-2 py-0.5 rounded ${saisonAnteil >= 12 ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
                                      {saisonAnteil}%
                                    </span>
                                  </td>
                                  {konfiguration.varianten.map(v => {
                                    const varianteData = monatsDaten.find(vd => vd.varianteId === v.id)
                                    const monatEntry = varianteData?.monate.find(m => m.monat === monat.monat)
                                    const menge = monatEntry?.planMenge || 0
                                    gesamt += menge
                                    
                                    const isEditing = editingCell?.row === rowIdx && editingCell?.varianteId === v.id
                                    
                                    return (
                                      <td 
                                        key={`${monat.monat}-${v.id}`} 
                                        className="p-2 text-right border-l cursor-pointer hover:bg-blue-50"
                                        onDoubleClick={() => {
                                          setEditingCell({ row: rowIdx, varianteId: v.id })
                                          setEditValue(menge.toString())
                                        }}
                                      >
                                        {isEditing ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              className="w-20 px-1 py-0.5 text-right border rounded text-sm"
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              aria-label={`Produktionsmenge für ${v.name} in ${monat.monatName} bearbeiten`}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  const newValue = parseInt(editValue) || 0
                                                  const delta = newValue - menge
                                                  if (delta !== 0) {
                                                    setProduktionsAnpassungen(prev => ({
                                                      ...prev,
                                                      [`monat_${monat.monat}_${v.id}`]: (prev[`monat_${monat.monat}_${v.id}`] || 0) + delta
                                                    }))
                                                    showSuccess(`${monat.monatName}, ${v.name}: ${delta > 0 ? '+' : ''}${delta} Bikes angepasst`)
                                                  }
                                                  setEditingCell(null)
                                                } else if (e.key === 'Escape') {
                                                  setEditingCell(null)
                                                }
                                              }}
                                              autoFocus
                                            />
                                            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setEditingCell(null)}>
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          formatNumber(menge, 0)
                                        )}
                                      </td>
                                    )
                                  })}
                                  <td className="p-2 text-right font-bold border-l bg-slate-50">{formatNumber(gesamt, 0)}</td>
                                </tr>
                              )
                            })}
                            {/* Summenzeile */}
                            <tr className="bg-slate-100 font-bold border-t-2">
                              <td className="p-2" colSpan={3}>JAHRESSUMME</td>
                              {konfiguration.varianten.map(v => {
                                const varianteData = monatsDaten.find(vd => vd.varianteId === v.id)
                                const summe = varianteData?.monate.reduce((sum, m) => sum + m.planMenge, 0) || 0
                                return (
                                  <td key={`sum-${v.id}`} className="p-2 text-right border-l">{formatNumber(summe, 0)}</td>
                                )
                              })}
                              <td className="p-2 text-right border-l bg-slate-200">
                                {formatNumber(monatsDaten.reduce((total, vd) => 
                                  total + vd.monate.reduce((sum, m) => sum + m.planMenge, 0), 0
                                ), 0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                } else {
                  // Tagesansicht (Standard)
                  const alleTage = referenzVariante.tage
                  
                  // Erstelle Daten für ALLE Tage
                  const data = alleTage.map(refTag => {
                    const wochentag = refTag.datum.getDay()
                    const istWochenende = wochentag === 0 || wochentag === 6
                    
                    // Status-Ermittlung
                    let status = '🟢 Produktionstag'
                    if (refTag.istFeiertag && refTag.feiertagsName) {
                      status = `🔴 ${refTag.feiertagsName}`
                    } else if (istWochenende) {
                      status = wochentag === 0 ? '🟡 Sonntag' : '🟡 Samstag'
                    }
                    
                    const row: Record<string, string | number | Date> = {
                      datum: refTag.datum,
                      wochentag: refTag.wochentag,
                      status: status
                    }
                    
                    let gesamt = 0
                    
                    // Füge Daten für jede Variante hinzu
                    konfiguration.varianten.forEach(v => {
                      const plan = produktionsplaene[v.id]
                      const tag = plan?.tage.find(t => 
                        toLocalISODateString(t.datum) === toLocalISODateString(refTag.datum)
                      )
                      
                      if (tag) {
                        row[`${v.id}_menge`] = tag.planMenge
                        row[`${v.id}_error`] = tag.monatsFehlerNachher
                        gesamt += tag.planMenge
                      } else {
                        row[`${v.id}_menge`] = 0
                        row[`${v.id}_error`] = 0
                      }
                    })
                    
                    row.gesamt = gesamt
                    
                    return row
                  })
                  
                  return (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-slate-50 p-2 border-b">
                        <h4 className="font-semibold text-sm">
                          Legende: <span className="text-muted-foreground font-normal">🔴 = Feiertag | 🟡 = Wochenende | 🟢 = Produktionstag | Error = Monatlicher Error-Tracker (±0.5 = optimal)</span>
                        </h4>
                      </div>
                      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-slate-100 border-b">
                            <tr>
                              <th className="p-2 text-left font-medium">Datum</th>
                              <th className="p-2 text-center font-medium">Tag</th>
                              <th className="p-2 text-left font-medium">Status</th>
                              {konfiguration.varianten.map(v => (
                                <th key={v.id} colSpan={2} className="p-2 text-center font-medium border-l">
                                  {v.name.replace('MTB ', '')}
                                </th>
                              ))}
                              <th className="p-2 text-right font-medium border-l bg-slate-200">Gesamt</th>
                            </tr>
                            <tr className="bg-slate-50 text-xs text-muted-foreground">
                              <th className="p-1"></th>
                              <th className="p-1"></th>
                              <th className="p-1"></th>
                              {konfiguration.varianten.map(v => (
                                <React.Fragment key={`${v.id}-sub`}>
                                  <th className="p-1 text-right border-l">Bikes</th>
                                  <th className="p-1 text-right">Error</th>
                                </React.Fragment>
                              ))}
                              <th className="p-1 text-right border-l bg-slate-200">Bikes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.map((row, idx) => {
                              const date = row.datum as Date
                              const dateClasses = getDateRowBackgroundClasses(date) || 'hover:bg-slate-50'
                              const tooltip = getDateTooltip(date)
                              
                              return (
                                <tr key={idx} className={`border-b ${dateClasses}`} title={tooltip}>
                                  <td className="p-2 text-left">{formatDate(row.datum as Date)}</td>
                                  <td className="p-2 text-center">{row.wochentag as string}</td>
                                  <td className="p-2 text-left text-xs">{row.status as string}</td>
                                  {konfiguration.varianten.map(v => {
                                    const menge = row[`${v.id}_menge`] as number
                                    const error = row[`${v.id}_error`] as number
                                    const errorClass = Math.abs(error) > 0.5 ? 'text-orange-600 font-semibold' : ''
                                    
                                    return (
                                      <React.Fragment key={`${v.id}-data`}>
                                        <td className="p-2 text-right border-l">{menge === 0 ? '-' : formatNumber(menge, 0)}</td>
                                        <td className={`p-2 text-right ${errorClass}`}>{formatNumber(error, 2)}</td>
                                      </React.Fragment>
                                    )
                                  })}
                                  <td className="p-2 text-right font-bold border-l bg-slate-50">{(row.gesamt as number) === 0 ? '-' : formatNumber(row.gesamt as number, 0)}</td>
                                </tr>
                              )
                            })}
                            {/* Summenzeile */}
                            {(() => {
                              const gesamtSumme = konfiguration.varianten.reduce((total, v) => {
                                const plan = produktionsplaene[v.id]
                                const varianteSumme = plan?.tage.reduce((sum, t) => sum + t.planMenge, 0) || 0
                                return total + varianteSumme
                              }, 0)
                              
                              return (
                                <tr className="bg-slate-100 font-bold border-t-2">
                                  <td className="p-2" colSpan={3}>JAHRESSUMME</td>
                                  {konfiguration.varianten.map(v => {
                                    const plan = produktionsplaene[v.id]
                                    const summe = plan?.tage.reduce((sum, t) => sum + t.planMenge, 0) || 0
                                    const finalError = plan && plan.tage.length > 0 
                                      ? plan.tage.filter(t => t.istArbeitstag).slice(-1)[0]?.monatsFehlerNachher || 0
                                      : 0
                                    
                                    return (
                                      <React.Fragment key={`${v.id}-sum`}>
                                        <td className="p-2 text-right border-l">{formatNumber(summe, 0)}</td>
                                        <td className="p-2 text-right">{formatNumber(finalError, 3)}</td>
                                      </React.Fragment>
                                    )
                                  })}
                                  <td className="p-2 text-right border-l bg-slate-200">
                                    {formatNumber(gesamtSumme, 0)}
                                  </td>
                                </tr>
                              )
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                }
              })()}

              {/* Produktionsverlauf-Chart - passt sich an Zeitperiode an */}
              {produktionsplaene && (() => {
                // Varianten-Namen Map erstellen
                const variantenNamen: Record<string, string> = {}
                konfiguration.varianten.forEach(v => {
                  variantenNamen[v.id] = v.name
                })

                // Chart-Daten basierend auf Zeitperiode generieren
                if (zeitperiode === 'monat') {
                  // Monatsansicht
                  const monatsDaten = konfiguration.varianten.map(v => ({
                    varianteId: v.id,
                    monate: aggregiereNachMonat(produktionsplaene[v.id].tage)
                  }))
                  
                  const chartData = monatsDaten[0]?.monate.map(monat => {
                    const dataPoint: { label: string; gesamt: number; varianten: Record<string, number>; [key: string]: string | number | Record<string, number> } = {
                      label: monat.monatName.substring(0, 3),
                      gesamt: 0,
                      varianten: {}
                    }
                    
                    konfiguration.varianten.forEach(v => {
                      const varianteMonat = monatsDaten.find(md => md.varianteId === v.id)?.monate.find(m => m.monat === monat.monat)
                      const menge = varianteMonat?.planMenge || 0
                      dataPoint[v.id] = menge
                      dataPoint.varianten[v.id] = menge
                      dataPoint.gesamt += menge
                    })
                    
                    return dataPoint
                  }) || []
                  
                  return (
                    <AlleVariantenProduktionChart
                      daten={chartData}
                      variantenNamen={variantenNamen}
                      zeitperiode="monat"
                      height={350}
                    />
                  )
                } else if (zeitperiode === 'woche') {
                  // Wochenansicht
                  const wochenDaten = konfiguration.varianten.map(v => ({
                    varianteId: v.id,
                    wochen: aggregiereNachWoche(produktionsplaene[v.id].tage)
                  }))
                  
                  const alleKWs = [...new Set(wochenDaten.flatMap(wd => wd.wochen.map(w => w.kalenderwoche)))].sort((a, b) => a - b)
                  
                  const chartData = alleKWs.map(kw => {
                    const dataPoint: { label: string; gesamt: number; varianten: Record<string, number>; [key: string]: string | number | Record<string, number> } = {
                      label: `KW ${kw}`,
                      gesamt: 0,
                      varianten: {}
                    }
                    
                    konfiguration.varianten.forEach(v => {
                      const varianteWoche = wochenDaten.find(wd => wd.varianteId === v.id)?.wochen.find(w => w.kalenderwoche === kw)
                      const menge = varianteWoche?.planMenge || 0
                      dataPoint[v.id] = menge
                      dataPoint.varianten[v.id] = menge
                      dataPoint.gesamt += menge
                    })
                    
                    return dataPoint
                  })
                  
                  return (
                    <AlleVariantenProduktionChart
                      daten={chartData}
                      variantenNamen={variantenNamen}
                      zeitperiode="woche"
                      height={350}
                    />
                  )
                } else {
                  // Tagesansicht - ALLE Tage zeigen für präzise Darstellung
                  // Jeder einzelne Tag wird als Datenpunkt dargestellt
                  const referenzVariante = Object.values(produktionsplaene)[0]
                  const alleTage = referenzVariante.tage
                  
                  const chartData = alleTage.map(refTag => {
                    const dataPoint: { label: string; gesamt: number; varianten: Record<string, number>; [key: string]: string | number | Record<string, number> } = {
                      label: formatDate(refTag.datum),
                      gesamt: 0,
                      varianten: {}
                    }
                    
                    konfiguration.varianten.forEach(v => {
                      const tag = produktionsplaene[v.id]?.tage.find(t => 
                        toLocalISODateString(t.datum) === toLocalISODateString(refTag.datum)
                      )
                      const menge = tag?.planMenge || 0
                      dataPoint[v.id] = menge
                      dataPoint.varianten[v.id] = menge
                      dataPoint.gesamt += menge
                    })
                    
                    return dataPoint
                  })
                  
                  return (
                    <AlleVariantenProduktionChart
                      daten={chartData}
                      variantenNamen={variantenNamen}
                      zeitperiode="tag"
                      height={350}
                    />
                  )
                }
              })()}

              {/* Info-Box UNTER der Tabelle */}
              <div className="mt-4">
                <CollapsibleInfo
                  title="Ansicht-Erklärung: Alle Varianten gleichzeitig"
                  variant="info"
                  defaultOpen={false}
                >
                  <div className="text-sm text-blue-800 space-y-2">
                    <p>
                      Diese Ansicht zeigt die Produktionsplanung <strong>aller 8 MTB-Varianten</strong> in einer kompakten Tabelle.
                    </p>
                    <p>
                      <strong>Zeitperioden-Schalter:</strong> Wechseln Sie zwischen Tag, Woche und Monat-Ansicht mit den Buttons oben rechts.
                    </p>
                    <p>
                      <strong>Bearbeitung:</strong> In der Wochen- und Monatsansicht können Sie Werte per Doppelklick bearbeiten. 
                      Änderungen wirken sich auf alle nachfolgenden Berechnungen aus.
                    </p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>Produktionsmenge jeder Variante (Plan-Menge mit Error Management)</li>
                      <li>Kumulativen Error pro Variante (sollte nahe 0 bleiben)</li>
                      <li>Gesamtproduktion über alle Varianten</li>
                      <li>🔴 = Feiertag | 🟡 = Wochenende | 🟢 = Produktionstag</li>
                    </ul>
                    <p className="pt-2 border-t border-blue-300">
                      <strong>Vorteil:</strong> Schneller Überblick über die gesamte Produktion und Engpass-Identifikation.
                    </p>
                  </div>
                </CollapsibleInfo>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="error" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error-Management Erklärung</CardTitle>
              <CardDescription>
                Wie Rundungsfehler systematisch korrigiert werden
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 📦 KONSOLIDIERT: Gruppierte InfoBoxen */}
              <CollapsibleInfoGroup
                groupTitle="Error-Management Konzept"
                icon={<Info className="h-5 w-5" />}
                variant="info"
                defaultOpen={false}
                items={[
                  {
                    id: 'problem',
                    title: 'Problem: Dezimalzahlen vs. Ganzzahlige Produktion',
                    variant: 'info',
                    icon: <AlertCircle className="h-4 w-4" />,
                    content: (
                      <p className="text-sm text-blue-800">
                        Die tägliche Planung arbeitet mit Dezimalzahlen (z.B. 71,61 Bikes/Tag), 
                        aber die Produktion muss in ganzen Einheiten erfolgen (71 oder 72).
                        Ohne Korrektur würden sich diese Rundungsfehler über das Jahr zu ±100-200 Bikes summieren!
                      </p>
                    )
                  },
                  {
                    id: 'loesung',
                    title: 'Lösung: Kumuliertes Error-Management',
                    variant: 'success',
                    icon: <TrendingUp className="h-4 w-4" />,
                    content: (
                      <div className="text-sm text-green-800 space-y-2">
                        <p>
                          <strong>Tag 1:</strong> Soll 71,61 → Ist 71, Error = +0,61
                        </p>
                        <p>
                          <strong>Tag 2:</strong> Soll 71,61 → Error = 1,22 → <span className="font-bold">Ist 72 ✓</span>, Error = 0,22
                        </p>
                        <p>
                          <strong>Tag 3:</strong> Soll 71,61 → Error = 0,83 → Ist 71, Error = 0,83
                        </p>
                        <p>
                          <strong>Tag 4:</strong> Soll 71,61 → Error = 1,44 → <span className="font-bold">Ist 72 ✓</span>, Error = 0,44
                        </p>
                        <div className="mt-3 pt-2 border-t border-green-300">
                          <strong>Algorithmus:</strong> Der Error wird mitgeführt und bei Überschreiten von ±0,5 
                          durch Auf-/Abrunden korrigiert.
                        </div>
                      </div>
                    )
                  },
                  {
                    id: 'resultat',
                    title: 'Resultat: Präzise Jahressumme',
                    variant: 'purple',
                    icon: <Zap className="h-4 w-4" />,
                    content: (
                      <div className="text-sm text-purple-800 space-y-2">
                        <p>
                          Die Jahressumme stimmt auf <strong>±1 Bike genau</strong>! 
                          Ohne Error-Management würden sich die Rundungsfehler auf über 200 Bikes summieren.
                        </p>
                        <div className="bg-purple-100 p-2 rounded mt-2">
                          <strong>Validierung:</strong> Σ(Tagesproduktion[1..365]) = 370.000 Bikes (exakt)
                        </div>
                      </div>
                    )
                  },
                  {
                    id: 'monatlich',
                    title: 'Monatliches Error-Management',
                    variant: 'info',
                    icon: <AlertCircle className="h-4 w-4" />,
                    content: (
                      <div className="text-sm text-blue-800 space-y-2">
                        <p>
                          Der Error-Tracker wird <strong>monatlich zurückgesetzt</strong> auf 0, 
                          damit Fehler nicht über Monate hinweg kumulieren.
                        </p>
                        <p>
                          <strong>Vorteil:</strong> Jeder Monat ist unabhängig und erreicht seine Sollproduktion präzise.
                          Der Error am Monatsende sollte immer ≤ ±0,5 sein.
                        </p>
                        <div className="bg-blue-100 p-2 rounded mt-2">
                          <strong>Prüfpunkt:</strong> In der Tabelle &quot;Tagesplanung&quot; sehen Sie die Spalte 
                          &quot;Monats-Error&quot;, die diesen Tracker visualisiert.
                        </div>
                      </div>
                    )
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  )
}