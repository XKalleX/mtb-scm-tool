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
          <Card>
            <CardHeader>
              <CardTitle>Produktionspläne pro Variante</CardTitle>
              <CardDescription>
                Jahresproduktion aufgeteilt nach Varianten mit Statistiken
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variante</TableHead>
                    <TableHead className="text-right">Jahresproduktion</TableHead>
                    <TableHead className="text-right">Ø pro Tag</TableHead>
                    <TableHead className="text-right">Peak-Monat (April)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stammdatenData.varianten.map(v => {
                    const jahresprod = stammdatenData.jahresproduktion.proVariante[v.id as keyof typeof stammdatenData.jahresproduktion.proVariante]
                    const durchschnitt = jahresprod / kalenderStats.arbeitstage
                    const aprilPeak = jahresprod * 0.16 // 16% im April
                    
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell className="text-right">{formatNumber(jahresprod, 0)}</TableCell>
                        <TableCell className="text-right">{formatNumber(durchschnitt, 1)}</TableCell>
                        <TableCell className="text-right">{formatNumber(aprilPeak, 0)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Saisonalität */}
          <Card>
            <CardHeader>
              <CardTitle>Saisonale Verteilung</CardTitle>
              <CardDescription>
                Monatsweise Produktionsverteilung (April = Peak mit 16%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { monat: 'Januar', anteil: 4 },
                  { monat: 'Februar', anteil: 5 },
                  { monat: 'März', anteil: 10 },
                  { monat: 'April', anteil: 16, isPeak: true },
                  { monat: 'Mai', anteil: 14 },
                  { monat: 'Juni', anteil: 12 },
                  { monat: 'Juli', anteil: 10 },
                  { monat: 'August', anteil: 8 },
                  { monat: 'September', anteil: 9 },
                  { monat: 'Oktober', anteil: 6 },
                  { monat: 'November', anteil: 3 },
                  { monat: 'Dezember', anteil: 3 },
                ].map(m => (
                  <div key={m.monat} className="flex items-center gap-4">
                    <div className="w-24 text-sm">{m.monat}</div>
                    <div className="flex-1 bg-slate-200 rounded-full h-6 relative">
                      <div 
                        className={`h-6 rounded-full ${m.isPeak ? 'bg-green-500' : 'bg-blue-500'} flex items-center justify-end px-2`}
                        style={{ width: `${m.anteil * 6.25}%` }}
                      >
                        <span className="text-xs text-white font-medium">{m.anteil}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stückliste Tab */}
        <TabsContent value="stueckliste" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stückliste - Mountain Bikes</CardTitle>
              <CardDescription>
                Komponenten pro Fahrrad: 1x Rahmen + 1x Gabel + 1x Sattel = 1 Fahrrad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Hinweis:</strong> {stuecklisteData.hinweis}
                </p>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variante</TableHead>
                    <TableHead>Rahmen</TableHead>
                    <TableHead>Gabel</TableHead>
                    <TableHead>Sattel</TableHead>
                    <TableHead className="text-right">Komponenten</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stammdatenData.varianten.map((v) => {
                    const stl = stuecklisteData.stuecklisten[v.id as keyof typeof stuecklisteData.stuecklisten]
                    if (!stl) return null
                    const komponenten = Object.keys(stl.komponenten).length
                    
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell className="text-sm">
                          {Object.values(stl.komponenten).find((k: any) => k.name.includes('Rahmen'))?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {Object.values(stl.komponenten).find((k: any) => k.name.includes('Gabel'))?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {Object.values(stl.komponenten).find((k: any) => k.name.includes('Sattel'))?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">{komponenten}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
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
              {produktionsplaene && (
                <ExcelTable
                  columns={[
                    {
                      key: 'datum',
                      label: 'Datum',
                      width: '120px',
                      format: (val) => formatDate(new Date(val))
                    },
                    {
                      key: 'wochentag',
                      label: 'Tag',
                      width: '80px',
                      align: 'center',
                      format: (val) => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(val).getDay()]
                    },
                    {
                      key: 'kw',
                      label: 'KW',
                      width: '70px',
                      align: 'center'
                    },
                    {
                      key: 'sollMenge',
                      label: 'Soll-Menge',
                      width: '120px',
                      align: 'right',
                      formula: '(Jahresproduktion / Arbeitstage) × Saisonaler Faktor',
                      format: (val) => formatNumber(val, 2)
                    },
                    {
                      key: 'istMenge',
                      label: 'Ist-Menge',
                      width: '120px',
                      align: 'right',
                      formula: 'RUNDEN(Soll-Menge + Kum. Error)',
                      format: (val) => formatNumber(val, 0)
                    },
                    {
                      key: 'kumulierterError',
                      label: 'Kum. Error',
                      width: '120px',
                      align: 'right',
                      formula: 'Kum. Error(t-1) + (Soll(t) - Ist(t))',
                      format: (val) => formatNumber(val, 3)
                    }
                  ]}
                  data={produktionsplaene[selectedVariante]
                    ?.filter((t: any) => t.istMenge > 0)
                    .map((tag: any) => {
                      const date = new Date(tag.datum)
                      // ISO week calculation: get the Thursday of the week
                      const thursday = new Date(date.getTime())
                      thursday.setDate(thursday.getDate() - (date.getDay() + 6) % 7 + 3)
                      const firstThursday = new Date(thursday.getFullYear(), 0, 4)
                      const weekNumber = Math.ceil(((thursday.getTime() - firstThursday.getTime()) / 86400000 + 1) / 7)
                      
                      return {
                        datum: tag.datum,
                        wochentag: tag.datum,
                        kw: weekNumber,
                        sollMenge: tag.sollMenge,
                        istMenge: tag.istMenge,
                        kumulierterError: tag.kumulierterError
                      }
                    }) || []
                  }
                  maxHeight="500px"
                  showFormulas={true}
                />
              )}
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
          <CardTitle>Erfüllte Anforderungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <RequirementItem text="365 Tage tagesgenaue Planung" />
            <RequirementItem text="8 MTB-Varianten parallel" />
            <RequirementItem text="Saisonale Nachfrage (April-Peak 16%)" />
            <RequirementItem text="Error-Management (Rundungsfehler)" />
            <RequirementItem text="Wochenenden & Feiertage berücksichtigt" />
            <RequirementItem text="Marketing-Zusatzaufträge möglich" />
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