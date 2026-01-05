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
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, Calendar, TrendingUp, AlertCircle, Download } from 'lucide-react'
import { formatNumber, formatDate } from '@/lib/utils'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import { generiereAlleProduktionsplaene, berechneProduktionsstatistik } from '@/lib/calculations/oem-programm'
import { kalenderStatistik } from '@/lib/kalender'
import { exportToCSV, exportToJSON } from '@/lib/export'
import { showError, showSuccess } from '@/lib/notifications'
import stammdatenData from '@/data/stammdaten.json'
import stuecklisteData from '@/data/stueckliste.json'
import { useState, useEffect } from 'react'

/**
 * OEM Programm Hauptseite
 * Zeigt Produktionsplanung und Stücklisten
 */
export default function OEMProgrammPage() {
  const [produktionsplaene, setProduktionsplaene] = useState<any>(null)
  const [selectedVariante, setSelectedVariante] = useState('MTBAllrounder')
  
  useEffect(() => {
    // Generiere Produktionspläne beim Laden
    const plaene = generiereAlleProduktionsplaene()
    setProduktionsplaene(plaene)
  }, [])

  const kalenderStats = kalenderStatistik(2027)
  
  /**
   * Exportiert Produktionsplan als CSV
   */
  const handleExportCSV = () => {
    if (!produktionsplaene || !produktionsplaene[selectedVariante]) {
      showError('Keine Daten zum Exportieren verfügbar')
      return
    }
    
    const data = produktionsplaene[selectedVariante]
      .filter((t: any) => t.istMenge > 0)
      .map((tag: any) => ({
        Datum: formatDate(new Date(tag.datum)),
        'Soll-Menge': formatNumber(tag.sollMenge, 2),
        'Ist-Menge': tag.istMenge,
        'Kumulierter Error': formatNumber(tag.kumulierterError, 3)
      }))
    
    exportToCSV(data, `produktionsplan_${selectedVariante}_2027`)
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
    
    exportToJSON(produktionsplaene, 'alle_produktionsplaene_2027')
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

      {/* Übersicht Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Jahresproduktion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stammdatenData.jahresproduktion.gesamt, 0)}
            </div>
            <p className="text-xs text-muted-foreground">MTBs gesamt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Produktionstage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kalenderStats.arbeitstage}</div>
            <p className="text-xs text-muted-foreground">von 365 Tagen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Durchschnitt/Tag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stammdatenData.jahresproduktion.gesamt / kalenderStats.arbeitstage, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Bikes pro Arbeitstag</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Varianten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stammdatenData.varianten.length}</div>
            <p className="text-xs text-muted-foreground">MTB-Modelle</p>
          </CardContent>
        </Card>
      </div>

      {/* Hauptinhalt mit Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="stueckliste">Stückliste</TabsTrigger>
          <TabsTrigger value="details">Tagesplanung</TabsTrigger>
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
                    <div className="font-bold text-lg">{formatNumber(stammdatenData.jahresproduktion.gesamt, 0)} Bikes</div>
                    <div className="text-xs text-muted-foreground">Gesamtziel 2027</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="flex-1 text-center">
                    <div className="text-xs text-muted-foreground mb-1">2. Saisonale Verteilung</div>
                    <div className="font-bold text-lg text-green-600">Jan 4% ... Apr 16%</div>
                    <div className="text-xs text-muted-foreground">Monatliche Peaks</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="flex-1 text-center">
                    <div className="text-xs text-muted-foreground mb-1">3. Tagesplanung</div>
                    <div className="font-bold text-lg text-blue-600">{kalenderStats.arbeitstage} Tage</div>
                    <div className="text-xs text-muted-foreground">Mit Error-Management</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="flex-1 text-center">
                    <div className="text-xs text-muted-foreground mb-1">4. Sattel-Bedarf</div>
                    <div className="font-bold text-lg text-orange-600">{formatNumber(stammdatenData.jahresproduktion.gesamt, 0)} Stk</div>
                    <div className="text-xs text-muted-foreground">1:1 Verhältnis</div>
                  </div>
                </div>
              </div>

              {/* Saisonalität Balkendiagramm */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Saisonale Produktionsverteilung (% der Jahresproduktion)</h4>
                <div className="space-y-2">
                  {[
                    { monat: 'Januar', anteil: 4, bikes: Math.round(370_000 * 0.04) },
                    { monat: 'Februar', anteil: 5, bikes: Math.round(370_000 * 0.05) },
                    { monat: 'März', anteil: 10, bikes: Math.round(370_000 * 0.10) },
                    { monat: 'April', anteil: 16, isPeak: true, bikes: Math.round(370_000 * 0.16) },
                    { monat: 'Mai', anteil: 14, bikes: Math.round(370_000 * 0.14) },
                    { monat: 'Juni', anteil: 12, bikes: Math.round(370_000 * 0.12) },
                    { monat: 'Juli', anteil: 10, bikes: Math.round(370_000 * 0.10) },
                    { monat: 'August', anteil: 8, bikes: Math.round(370_000 * 0.08) },
                    { monat: 'September', anteil: 9, bikes: Math.round(370_000 * 0.09) },
                    { monat: 'Oktober', anteil: 6, bikes: Math.round(370_000 * 0.06) },
                    { monat: 'November', anteil: 3, bikes: Math.round(370_000 * 0.03) },
                    { monat: 'Dezember', anteil: 3, bikes: Math.round(370_000 * 0.03) },
                  ].map(m => (
                    <div key={m.monat} className="flex items-center gap-4">
                      <div className="w-20 text-sm font-medium">{m.monat}</div>
                      <div className="flex-1 bg-slate-200 rounded-full h-8 relative">
                        <div 
                          className={`h-8 rounded-full ${m.isPeak ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-blue-500'} flex items-center justify-between px-3`}
                          style={{ width: `${m.anteil * 6.25}%` }}
                        >
                          <span className="text-xs text-white font-medium">{m.anteil}%</span>
                          <span className="text-xs text-white">{formatNumber(m.bikes, 0)} Bikes</span>
                        </div>
                        {m.isPeak && (
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-green-600">
                            🏔️ PEAK
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Erklärung: Saisonalität → Tagesplanung */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Wie wird die Saisonalität auf die Tagesplanung übertragen?
                </h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    <strong>Schritt 1:</strong> April hat 16% der Jahresproduktion = {formatNumber(370_000 * 0.16, 0)} Bikes
                  </p>
                  <p>
                    <strong>Schritt 2:</strong> April 2027 hat ca. 22 Arbeitstage (ohne Wochenenden/Feiertage)
                  </p>
                  <p>
                    <strong>Schritt 3:</strong> {formatNumber(370_000 * 0.16, 0)} / 22 ≈ {formatNumber((370_000 * 0.16) / 22, 1)} Bikes pro Tag im April
                  </p>
                  <p>
                    <strong>Schritt 4:</strong> Error-Management korrigiert Rundungsfehler → exakt {formatNumber(370_000 * 0.16, 0)} Bikes am Monatsende
                  </p>
                  <p className="pt-2 border-t border-blue-300 mt-3">
                    → Diese Logik sehen Sie detailliert im Tab <strong>"Tagesplanung"</strong> für jede der 8 Varianten!
                  </p>
                </div>
              </div>
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
                    <TableHead className="text-right">Peak April</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stammdatenData.varianten.map(v => {
                    const jahresprod = stammdatenData.jahresproduktion.proVariante[v.id as keyof typeof stammdatenData.jahresproduktion.proVariante]
                    const durchschnitt = jahresprod / kalenderStats.arbeitstage
                    const aprilPeak = jahresprod * 0.16 // 16% im April
                    const stl = stuecklisteData.stuecklisten[v.id as keyof typeof stuecklisteData.stuecklisten]
                    const sattel = stl ? Object.values(stl.komponenten)[0] as any : null
                    
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell className="text-sm text-blue-600">{sattel?.name || 'N/A'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatNumber(jahresprod, 0)} Bikes</TableCell>
                        <TableCell className="text-right text-blue-600">{formatNumber(jahresprod, 0)} Stk</TableCell>
                        <TableCell className="text-right">{formatNumber(durchschnitt, 1)}</TableCell>
                        <TableCell className="text-right">{formatNumber(aprilPeak, 0)}</TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={2}>GESAMT</TableCell>
                    <TableCell className="text-right">{formatNumber(stammdatenData.jahresproduktion.gesamt, 0)} Bikes</TableCell>
                    <TableCell className="text-right text-blue-600">{formatNumber(stammdatenData.jahresproduktion.gesamt, 0)} Stk</TableCell>
                    <TableCell className="text-right">{formatNumber(stammdatenData.jahresproduktion.gesamt / kalenderStats.arbeitstage, 1)}</TableCell>
                    <TableCell className="text-right">{formatNumber(stammdatenData.jahresproduktion.gesamt * 0.16, 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stückliste Tab - NUR SÄTTEL (Code-Ermäßigung!) */}
        <TabsContent value="stueckliste" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stückliste - Mountain Bikes (Code-Ermäßigung)</CardTitle>
              <CardDescription>
                Vereinfachte Stückliste: 1x Sattel = 1 Fahrrad (Rahmen & Gabeln vereinfacht)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-900">
                  <strong>📋 CODE-ERMÄSSIGUNG AKTIV:</strong> {stuecklisteData.hinweis}
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  In der Vollversion würde jedes Bike aus 1 Rahmen + 1 Gabel + 1 Sattel bestehen. 
                  Für die Code-Lösung fokussieren wir auf die Sättel-Beschaffung aus China.
                </p>
              </div>
              
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
                  {stammdatenData.varianten.map((v) => {
                    const stl = stuecklisteData.stuecklisten[v.id as keyof typeof stuecklisteData.stuecklisten]
                    if (!stl) return null
                    
                    // Nur Sattel extrahieren
                    const sattel = Object.values(stl.komponenten)[0] as any
                    const jahresprod = stammdatenData.jahresproduktion.proVariante[v.id as keyof typeof stammdatenData.jahresproduktion.proVariante]
                    
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
                          China (49 Tage Vorlauf)
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={3}>GESAMT Sättel benötigt:</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(stammdatenData.jahresproduktion.gesamt, 0)} Stück
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Sattel-Varianten Übersicht */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3">Sattel-Varianten Aggregation (für Bestellung):</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {['Fizik Tundra', 'Raceline', 'Spark', 'Speedline'].map(sattelName => {
                    const bedarf = stammdatenData.varianten
                      .filter(v => {
                        const stl = stuecklisteData.stuecklisten[v.id as keyof typeof stuecklisteData.stuecklisten]
                        const sattel = stl ? Object.values(stl.komponenten)[0] as any : null
                        return sattel?.name === sattelName
                      })
                      .reduce((sum, v) => {
                        return sum + (stammdatenData.jahresproduktion.proVariante[v.id as keyof typeof stammdatenData.jahresproduktion.proVariante] || 0)
                      }, 0)
                    
                    return (
                      <div key={sattelName} className="bg-slate-50 border rounded-lg p-3">
                        <div className="text-sm font-medium">{sattelName}</div>
                        <div className="text-lg font-bold text-blue-600">{formatNumber(bedarf, 0)} Stück/Jahr</div>
                        <div className="text-xs text-muted-foreground">
                          ≈ {formatNumber(bedarf / 252, 0)} Stück/Arbeitstag
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
            const stats = berechneProduktionsstatistik(variantePlan)
            const varianteInfo = stammdatenData.varianten.find(v => v.id === selectedVariante)
            const stl = stuecklisteData.stuecklisten[selectedVariante as keyof typeof stuecklisteData.stuecklisten]
            const sattel = stl ? Object.values(stl.komponenten)[0] as any : null
            
            return (
              <div className="grid gap-4 md:grid-cols-5 mb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Jahresproduktion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{formatNumber(stats.gesamt, 0)}</div>
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
                    <div className="text-xl font-bold">{formatNumber(stats.durchschnitt, 1)}</div>
                    <p className="text-xs text-muted-foreground">Bikes/Tag</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Peak Tag</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{formatNumber(stats.maxProTag, 0)}</div>
                    <p className="text-xs text-muted-foreground">im April</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Sattel benötigt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-blue-600">{formatNumber(stats.gesamt, 0)}</div>
                    <p className="text-xs text-muted-foreground">{sattel?.name}</p>
                  </CardContent>
                </Card>
              </div>
            )
          })()}
          
          <Card>
            <CardHeader>
              <CardTitle>Vollständige Tagesplanung 2027 - {stammdatenData.varianten.find(v => v.id === selectedVariante)?.name}</CardTitle>
              <CardDescription>
                Alle {produktionsplaene?.[selectedVariante]?.filter((t: any) => t.istMenge > 0).length} Produktionstage mit Error-Management (scrollbar nutzen)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Varianten-Auswahl */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Variante wählen:</span>
                {stammdatenData.varianten.map(v => (
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
                  description="Die tägliche Soll-Menge berücksichtigt die saisonale Verteilung (April-Peak 16%)."
                  example="MTB Allrounder: 111.000 / 252 AT × 1,6 (April) = 704,76 Bikes/Tag"
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
                const stl = stuecklisteData.stuecklisten[selectedVariante as keyof typeof stuecklisteData.stuecklisten]
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
                        formula: 'Error(t-1) + (Soll - Ist)',
                        format: (val) => formatNumber(val, 3),
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
                      return produktionsplaene[selectedVariante]
                        ?.filter((t: any) => t.istMenge > 0)
                        .map((tag: any) => {
                          const date = new Date(tag.datum)
                          // ISO week calculation
                          const thursday = new Date(date.getTime())
                          thursday.setDate(thursday.getDate() - (date.getDay() + 6) % 7 + 3)
                          const firstThursday = new Date(thursday.getFullYear(), 0, 4)
                          const weekNumber = Math.ceil(((thursday.getTime() - firstThursday.getTime()) / 86400000 + 1) / 7)
                          
                          kumulativ += tag.istMenge
                          
                          return {
                            datum: tag.datum,
                            wochentag: tag.datum,
                            kw: weekNumber,
                            monat: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][date.getMonth()],
                            sollMenge: tag.sollMenge,
                            istMenge: tag.istMenge,
                            sattelBedarf: tag.istMenge, // 1:1 Verhältnis
                            kumulierterError: tag.kumulierterError,
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

        <TabsContent value="error" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error-Management Erklärung</CardTitle>
              <CardDescription>
                Wie Rundungsfehler systematisch korrigiert werden
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Problem:</h4>
                <p className="text-sm text-blue-800">
                  Die tägliche Planung arbeitet mit Dezimalzahlen (z.B. 71,61 Bikes/Tag), 
                  aber die Produktion muss in ganzen Einheiten erfolgen (71 oder 72).
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Lösung: Kumuliertes Error-Management</h4>
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
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">Resultat:</h4>
                <p className="text-sm text-purple-800">
                  Die Jahressumme stimmt auf <strong>±1 Bike genau</strong>! 
                  Ohne Error-Management würden sich die Rundungsfehler auf über 200 Bikes summieren.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Erfüllte Anforderungen */}
      <Card>
        <CardHeader>
          <CardTitle>Erfüllte Anforderungen (Code-Ermäßigung)</CardTitle>
          <CardDescription>
            Fokus auf Kernkonzepte mit vereinfachter Stückliste
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <RequirementItem text="✓ 365 Tage tagesgenaue Planung" />
            <RequirementItem text="✓ 8 MTB-Varianten parallel" />
            <RequirementItem text="✓ Saisonale Nachfrage (April-Peak 16%)" />
            <RequirementItem text="✓ Error-Management (Rundungsfehler)" />
            <RequirementItem text="✓ Nur Sättel (4 Varianten, 1:1)" />
            <RequirementItem text="✓ Sattel-Bedarf = Bike-Produktion" />
            <RequirementItem text="✓ Wochenenden & Feiertage berücksichtigt" />
            <RequirementItem text="✓ Roter Faden: Saison → Tagesplanung" />
            <RequirementItem text="✓ Marketing-Zusatzaufträge möglich" />
            <RequirementItem text="✓ China-Zulieferer (49 Tage Vorlauf)" />
          </div>
          
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              <strong>💡 Code-Ermäßigung aktiv:</strong> Vereinfachte Stückliste mit nur Sätteln ermöglicht
              Fokus auf Supply-Chain-Kernkonzepte (Vorlaufzeit, Losgrößen, Error-Management) ohne 
              unnötige Komplexität von 14 Bauteilen.
            </p>
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