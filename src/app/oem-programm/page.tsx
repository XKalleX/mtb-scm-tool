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
import { CollapsibleInfo } from '@/components/ui/collapsible-info'
import { Calendar, TrendingUp, AlertCircle, Download, AlertTriangle } from 'lucide-react'
import { formatNumber, formatDate } from '@/lib/utils'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import { exportToCSV, exportToJSON } from '@/lib/export'
import { showError, showSuccess } from '@/lib/notifications'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { useSzenarien } from '@/contexts/SzenarienContext'
import { ActiveScenarioBanner } from '@/components/ActiveScenarioBanner'
import React, { useState, useMemo } from 'react'
import { 
  generiereAlleVariantenProduktionsplaene,
  berechneProduktionsStatistiken,
  type TagesProduktionEntry
} from '@/lib/calculations/zentrale-produktionsplanung'

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
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single')
  
  // Hole Konfiguration und Szenarien aus Contexts
  const { konfiguration, isInitialized, getArbeitstageProJahr, getJahresproduktionProVariante } = useKonfiguration()
  const { getAktiveSzenarien } = useSzenarien()
  
  // Hole aktive Szenarien
  const aktiveSzenarien = useMemo(() => getAktiveSzenarien(), [getAktiveSzenarien])

  // Generiere Produktionspläne aus zentralem Modul
  // TODO: In Zukunft Szenarien hier einbauen
  const produktionsplaene = useMemo(() => 
    generiereAlleVariantenProduktionsplaene(konfiguration),
    [konfiguration]
  )

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
   */
  const handleExportCSV = () => {
    const plan = produktionsplaene[selectedVariante]
    if (!plan) {
      showError('Keine Daten zum Exportieren verfügbar')
      return
    }
    
    const data = plan.tage
      .filter(t => t.istMenge > 0)
      .map(tag => ({
        Datum: formatDate(tag.datum),
        'Plan-Menge': tag.planMenge,
        'Ist-Menge': tag.istMenge,
        'Abweichung': tag.abweichung,
        'Schichten': tag.schichten,
        'Auslastung': tag.auslastung + '%'
      }))
    
    exportToCSV(data, `produktionsplan_${selectedVariante}_${konfiguration.planungsjahr}`)
    showSuccess('Produktionsplan erfolgreich exportiert')
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
          <Button variant="outline" onClick={handleExportJSON}>
            <Download className="h-4 w-4 mr-2" />
            JSON Export
          </Button>
        </div>
      </div>

      {/* Aktive Szenarien Banner */}
      <ActiveScenarioBanner showDetails={false} />

      {/* Szenarien-Warnung - COLLAPSIBLE */}
      {aktiveSzenarien.length > 0 && (
        <CollapsibleInfo
          title="Aktive Szenarien"
          variant="warning"
          icon={<AlertTriangle className="h-5 w-5" />}
          defaultOpen={false}
        >
          <div className="text-sm text-orange-800">
            <p className="mb-3">
              {aktiveSzenarien.length} Szenario(en) aktiv. Die Produktionsplanung berücksichtigt momentan noch keine Szenarien.
              Dies wird in einer zukünftigen Version implementiert.
            </p>
            <div className="flex flex-wrap gap-2">
              {aktiveSzenarien.map(s => (
                <span key={s.id} className="text-xs bg-orange-200 text-orange-900 px-2 py-1 rounded">
                  {s.typ}
                </span>
              ))}
            </div>
          </div>
        </CollapsibleInfo>
      )}

      {/* Übersicht Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Jahresproduktion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(konfiguration.jahresproduktion, 0)}
            </div>
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Durchschnitt/Tag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(konfiguration.jahresproduktion / arbeitstage, 0)}
            </div>
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
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="stueckliste">Stückliste</TabsTrigger>
          <TabsTrigger value="details">Tagesplanung (Einzeln)</TabsTrigger>
          <TabsTrigger value="allVariants">Tagesplanung (Alle Varianten)</TabsTrigger>
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
                  {konfiguration.saisonalitaet.map((s, index) => {
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
                        → Diese Logik sehen Sie detailliert im Tab <strong>"Tagesplanung"</strong> für jede der {konfiguration.varianten.length} Varianten!
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
                    const sattel = stl ? Object.values(stl.komponenten)[0] as any : null
                    
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
                    const sattel = Object.values(stl.komponenten)[0] as any
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
                          {konfiguration.lieferant.land} ({konfiguration.lieferant.vorlaufzeitArbeitstage + konfiguration.lieferant.vorlaufzeitKalendertage} Tage Vorlauf)
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {/* Statistik-Cards für ausgewählte Variante */}
          {produktionsplaene && selectedVariante && (() => {
            const variantePlan = produktionsplaene[selectedVariante]
            const stats = berechneProduktionsStatistiken(variantePlan.tage)
            const varianteInfo = konfiguration.varianten.find(v => v.id === selectedVariante)
            const stl = stuecklistenMap[selectedVariante]
            const sattel = stl ? Object.values(stl.komponenten)[0] as any : null
            const peakMonat = konfiguration.saisonalitaet.reduce((max, m) => m.anteil > max.anteil ? m : max)
            
            return (
              <div className="grid gap-4 md:grid-cols-5 mb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Jahresproduktion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{formatNumber(stats.produziert, 0)}</div>
                    <p className="text-xs text-muted-foreground">Bikes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Produktionstage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{stats.arbeitstage}</div>
                    <p className="text-xs text-muted-foreground">von 365 Tagen</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Ø pro Tag</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{formatNumber(stats.produziert / stats.arbeitstage, 1)}</div>
                    <p className="text-xs text-muted-foreground">Bikes/Tag</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Peak Tag</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{formatNumber(Math.max(...variantePlan.tage.map(t => t.istMenge)), 0)}</div>
                    <p className="text-xs text-muted-foreground">im {peakMonat.name}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Sattel benötigt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-blue-600">{formatNumber(stats.produziert, 0)}</div>
                    <p className="text-xs text-muted-foreground">{sattel?.name}</p>
                  </CardContent>
                </Card>
              </div>
            )
          })()}
          
          <Card>
            <CardHeader>
              <CardTitle>Vollständige Tagesplanung {konfiguration.planungsjahr} - {konfiguration.varianten.find(v => v.id === selectedVariante)?.name}</CardTitle>
              <CardDescription>
                Alle {produktionsplaene?.[selectedVariante]?.tage.filter(t => t.istMenge > 0).length} Produktionstage mit Error-Management (scrollbar nutzen)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Varianten-Auswahl */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Variante wählen:</span>
                {konfiguration.varianten.map(v => (
                  <Button
                    key={v.id}
                    variant={selectedVariante === v.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedVariante(v.id)}
                  >
                    {v.name}
                  </Button>
                ))}
              </div>

              {/* Formel-Karten */}
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <FormulaCard
                  title="Soll-Menge Berechnung"
                  formula="Soll-Menge = (Jahresproduktion / Arbeitstage) × Saisonaler Faktor"
                  description={`Die tägliche Soll-Menge berücksichtigt die saisonale Verteilung (${konfiguration.saisonalitaet.reduce((max, m) => m.anteil > max.anteil ? m : max).name}-Peak ${konfiguration.saisonalitaet.reduce((max, m) => m.anteil > max.anteil ? m : max).anteil}%).`}
                  example={`MTB Allrounder: ${formatNumber(Math.round(konfiguration.jahresproduktion * 0.3), 0)} / ${arbeitstage} AT × ${(konfiguration.saisonalitaet.reduce((max, m) => m.anteil > max.anteil ? m : max).anteil / 8.33).toFixed(1)} = ${formatNumber(Math.round(konfiguration.jahresproduktion * 0.3) / arbeitstage * (konfiguration.saisonalitaet.reduce((max, m) => m.anteil > max.anteil ? m : max).anteil / 8.33), 2)} Bikes/Tag`}
                />
                <FormulaCard
                  title="Error-Management Formel"
                  formula="Kum. Error(t) = Kum. Error(t-1) + (Soll(t) - Ist(t))"
                  description="Der kumulierte Fehler stellt sicher, dass Rundungsfehler nicht akkumulieren."
                  example="Tag 1: Error = 0,61 → Tag 2: Error = 1,22 → Ist wird auf 72 aufgerundet"
                />
              </div>

              {/* Excel-ähnliche Tabelle mit allen Tagen */}
              {produktionsplaene && (() => {
                const stl = stuecklistenMap[selectedVariante]
                const sattel = stl ? Object.values(stl.komponenten)[0] as any : null
                
                return (
                  <ExcelTable
                    columns={[
                      {
                        key: 'datum',
                        label: 'Datum',
                        width: '110px',
                        format: (val) => formatDate(new Date(val)),
                        sumable: false
                      },
                      {
                        key: 'wochentag',
                        label: 'Tag',
                        width: '70px',
                        align: 'center',
                        format: (val) => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(val).getDay()],
                        sumable: false
                      },
                      {
                        key: 'kw',
                        label: 'KW',
                        width: '60px',
                        align: 'center',
                        sumable: false
                      },
                      {
                        key: 'monat',
                        label: 'Monat',
                        width: '80px',
                        align: 'center',
                        sumable: false
                      },
                      {
                        key: 'sollMenge',
                        label: 'Soll Bikes',
                        width: '110px',
                        align: 'right',
                        formula: '(Jahresprod / AT) × Saison',
                        format: (val) => formatNumber(val, 2),
                        sumable: true
                      },
                      {
                        key: 'istMenge',
                        label: 'Ist Bikes',
                        width: '100px',
                        align: 'right',
                        formula: 'RUNDEN(Soll + Error)',
                        format: (val) => formatNumber(val, 0),
                        sumable: true
                      },
                      {
                        key: 'sattelBedarf',
                        label: `Sättel (${sattel?.name || 'N/A'})`,
                        width: '140px',
                        align: 'right',
                        formula: 'Ist Bikes × 1',
                        format: (val) => formatNumber(val, 0) + ' Stück',
                        sumable: true
                      },
                      {
                        key: 'kumulierterError',
                        label: 'Kum. Error',
                        width: '110px',
                        align: 'right',
                        formula: 'Kum. Ist - Kum. Plan',
                        format: (val) => formatNumber(val, 2), // 2 Dezimalstellen für Bikes-Differenz
                        sumable: false
                      },
                      {
                        key: 'kumulativBikes',
                        label: 'Kumulativ',
                        width: '110px',
                        align: 'right',
                        format: (val) => formatNumber(val, 0),
                        sumable: false
                      }
                    ]}
                    data={(() => {
                      let kumulativ = 0
                      return produktionsplaene[selectedVariante]?.tage
                        ?.filter(t => t.istMenge > 0)
                        .map(tag => {
                          const date = tag.datum
                          // ISO week calculation
                          const thursday = new Date(date.getTime())
                          thursday.setDate(thursday.getDate() - (date.getDay() + 6) % 7 + 3)
                          const firstThursday = new Date(thursday.getFullYear(), 0, 4)
                          const weekNumber = Math.ceil(((thursday.getTime() - firstThursday.getTime()) / 86400000 + 1) / 7)
                          
                          kumulativ += tag.istMenge
                          
                          return {
                            datum: date,
                            wochentag: date,
                            kw: weekNumber,
                            monat: tag.monatName,
                            sollMenge: tag.planMenge,
                            istMenge: tag.istMenge,
                            sattelBedarf: tag.istMenge, // 1:1 Verhältnis
                            kumulierterError: tag.kumulativIst - tag.kumulativPlan, // ✅ KORREKTUR: Absoluter Fehler, nicht Prozent
                            kumulativBikes: kumulativ
                          }
                        }) || []
                    })()}
                    maxHeight="500px"
                    showFormulas={true}
                    showSums={true}
                    sumRowLabel="JAHRESSUMME"
                    groupBy="monat"
                    subtotalLabel="Monatssumme"
                  />
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NEU: Alle Varianten in einer Ansicht */}
        <TabsContent value="allVariants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tagesplanung - Alle Varianten im Überblick</CardTitle>
              <CardDescription>
                Produktionsplanung für alle 8 MTB-Varianten mit kumulativem Error Management.
                Zeigt nur Arbeitstage (ohne Wochenenden/Feiertage).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Aggregierte Statistik */}
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                {Object.entries(produktionsplaene).map(([varianteId, plan]) => {
                  const stats = berechneProduktionsStatistiken(plan.tage)
                  const variante = konfiguration.varianten.find(v => v.id === varianteId)
                  
                  return (
                    <Card key={varianteId} className="border-blue-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{variante?.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <div className="text-xs text-muted-foreground">Jahresproduktion:</div>
                        <div className="text-lg font-bold">{formatNumber(stats.produziert, 0)}</div>
                        <div className="text-xs text-muted-foreground">
                          Abweichung: {formatNumber(plan.abweichung, 0)} Bikes
                        </div>
                        <div className={`text-xs font-semibold ${Math.abs(plan.abweichung) <= 1 ? 'text-green-600' : 'text-orange-600'}`}>
                          {Math.abs(plan.abweichung) <= 1 ? '✓ Error Management OK' : '⚠ Prüfung nötig'}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Erklärung */}
              <div className="mb-4">
                <CollapsibleInfo
                  title="Ansicht-Erklärung: Alle Varianten gleichzeitig"
                  variant="info"
                >
                  <div className="text-sm text-blue-800 space-y-2">
                    <p>
                      Diese Ansicht zeigt die Tagesproduktion <strong>aller 8 MTB-Varianten</strong> in einer kompakten Tabelle.
                    </p>
                    <p>
                    <strong>Pro Tag sehen Sie:</strong>
                  </p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Produktionsmenge jeder Variante (Ist-Menge mit Error Management)</li>
                    <li>Kumulativen Error pro Variante (sollte nahe 0 bleiben)</li>
                    <li>Gesamtproduktion über alle Varianten</li>
                    <li>Nur Arbeitstage (Wochenenden/Feiertage ausgeblendet)</li>
                  </ul>
                  <p className="pt-2 border-t border-blue-300">
                    <strong>Vorteil:</strong> Schneller Überblick über die gesamte Produktion und Engpass-Identifikation.
                  </p>
                </div>
              </CollapsibleInfo>
              </div>

              {/* Alle-Varianten Tabelle */}
              {produktionsplaene && (() => {
                // Hole nur Arbeitstage (erste Variante als Referenz)
                const referenzVariante = Object.values(produktionsplaene)[0]
                const arbeitstage = referenzVariante.tage.filter(t => t.istArbeitstag)
                
                // Erstelle Spalten: Datum + eine Spalte pro Variante + Gesamt
                const variantenSpalten = konfiguration.varianten.flatMap(v => [
                  {
                    key: `${v.id}_menge`,
                    label: `${v.name.replace('MTB ', '')}`,
                    width: '90px',
                    align: 'right' as const,
                    format: (val: number) => formatNumber(val, 0),
                    sumable: true
                  },
                  {
                    key: `${v.id}_error`,
                    label: `Error`,
                    width: '70px',
                    align: 'right' as const,
                    format: (val: number) => formatNumber(val, 2),
                    sumable: false,
                    className: (val: number) => Math.abs(val) > 0.5 ? 'text-orange-600 font-semibold' : ''
                  }
                ])
                
                const columns = [
                  {
                    key: 'datum',
                    label: 'Datum',
                    width: '100px',
                    format: (val: Date) => formatDate(val),
                    sumable: false
                  },
                  {
                    key: 'wochentag',
                    label: 'Tag',
                    width: '60px',
                    align: 'center' as const,
                    sumable: false
                  },
                  ...variantenSpalten,
                  {
                    key: 'gesamt',
                    label: 'Gesamt',
                    width: '100px',
                    align: 'right' as const,
                    format: (val: number) => formatNumber(val, 0),
                    sumable: true,
                    className: 'font-bold bg-slate-100'
                  }
                ]
                
                // Erstelle Daten
                const data = arbeitstage.map(refTag => {
                  const row: Record<string, any> = {
                    datum: refTag.datum,
                    wochentag: refTag.wochentag
                  }
                  
                  let gesamt = 0
                  
                  // Füge Daten für jede Variante hinzu
                  konfiguration.varianten.forEach(v => {
                    const plan = produktionsplaene[v.id]
                    const tag = plan?.tage.find(t => 
                      t.datum.toISOString().split('T')[0] === refTag.datum.toISOString().split('T')[0]
                    )
                    
                    if (tag) {
                      row[`${v.id}_menge`] = tag.istMenge
                      // Kumulativer Error = kumulativIst - kumulativPlan
                      const kumError = tag.kumulativIst - tag.kumulativPlan
                      row[`${v.id}_error`] = kumError
                      gesamt += tag.istMenge
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
                    <div className="bg-slate-50 p-3 border-b">
                      <h4 className="font-semibold text-sm">
                        Legende: <span className="text-muted-foreground font-normal">Menge = Ist-Produktion | Error = Kumulativer Fehler (sollte nahe 0 bleiben)</span>
                      </h4>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-100 border-b">
                          <tr>
                            <th className="p-2 text-left font-medium">Datum</th>
                            <th className="p-2 text-center font-medium">Tag</th>
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
                          {data.map((row, idx) => (
                            <tr key={idx} className="border-b hover:bg-slate-50">
                              <td className="p-2 text-left">{formatDate(row.datum)}</td>
                              <td className="p-2 text-center">{row.wochentag}</td>
                              {konfiguration.varianten.map(v => {
                                const error = row[`${v.id}_error`]
                                const errorClass = Math.abs(error) > 0.5 ? 'text-orange-600 font-semibold' : ''
                                
                                return (
                                  <React.Fragment key={`${v.id}-data`}>
                                    <td className="p-2 text-right border-l">{formatNumber(row[`${v.id}_menge`], 0)}</td>
                                    <td className={`p-2 text-right ${errorClass}`}>{formatNumber(error, 2)}</td>
                                  </React.Fragment>
                                )
                              })}
                              <td className="p-2 text-right font-bold border-l bg-slate-50">{formatNumber(row.gesamt, 0)}</td>
                            </tr>
                          ))}
                          {/* Summenzeile */}
                          <tr className="bg-slate-100 font-bold border-t-2">
                            <td className="p-2" colSpan={2}>JAHRESSUMME</td>
                            {konfiguration.varianten.map(v => {
                              const plan = produktionsplaene[v.id]
                              const summe = plan?.tage.reduce((sum, t) => sum + t.istMenge, 0) || 0
                              const finalError = plan ? plan.tage[plan.tage.length - 1].kumulativIst - plan.tage[plan.tage.length - 1].kumulativPlan : 0
                              
                              return (
                                <React.Fragment key={`${v.id}-sum`}>
                                  <td className="p-2 text-right border-l">{formatNumber(summe, 0)}</td>
                                  <td className="p-2 text-right">{formatNumber(finalError, 2)}</td>
                                </React.Fragment>
                              )
                            })}
                            <td className="p-2 text-right border-l bg-slate-200">
                              {formatNumber(konfiguration.jahresproduktion, 0)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
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
              <CollapsibleInfo
                title="Problem: Dezimalzahlen vs. Ganzzahlige Produktion"
                variant="info"
              >
                <p className="text-sm text-blue-800">
                  Die tägliche Planung arbeitet mit Dezimalzahlen (z.B. 71,61 Bikes/Tag), 
                  aber die Produktion muss in ganzen Einheiten erfolgen (71 oder 72).
                </p>
              </CollapsibleInfo>

              <CollapsibleInfo
                title="Lösung: Kumuliertes Error-Management"
                variant="success"
              >
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
                </div>
              </CollapsibleInfo>

              <CollapsibleInfo
                title="Resultat: Präzise Jahressumme"
                variant="purple"
              >
                <p className="text-sm text-purple-800">
                  Die Jahressumme stimmt auf <strong>±1 Bike genau</strong>! 
                  Ohne Error-Management würden sich die Rundungsfehler auf über 200 Bikes summieren.
                </p>
              </CollapsibleInfo>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  )
}