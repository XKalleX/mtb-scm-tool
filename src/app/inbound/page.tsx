'use client'

/**
 * ========================================
 * INBOUND LOGISTIK - CHINA
 * ========================================
 * 
 * Verwaltung des China-Lieferanten mit:
 * - Vorlaufzeiten-Berechnung
 * - Spring Festival Berücksichtigung
 * - Losgrößen-Optimierung
 * - Bestellplanung
 * 
 * ✅ NEU: Szenarien-Integration global wirksam!
 * ✅ Zeigt Deltas (+X / -X) bei Schiffsverspätungen etc.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Ship, AlertTriangle, Package, Download, Calendar, Zap, Plus } from 'lucide-react'
import { CollapsibleInfo } from '@/components/ui/collapsible-info'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatNumber, addDays } from '@/lib/utils'
import { exportToJSON } from '@/lib/export'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { ActiveScenarioBanner } from '@/components/ActiveScenarioBanner'
import { DeltaCell, DeltaBadge } from '@/components/DeltaCell'
import { useMemo, useState, useCallback } from 'react'
import { generiereAlleVariantenProduktionsplaene } from '@/lib/calculations/zentrale-produktionsplanung'
import { generiereTaeglicheBestellungen, erstelleZusatzbestellung, type TaeglicheBestellung } from '@/lib/calculations/inbound-china'
import { useSzenarioBerechnung } from '@/lib/hooks/useSzenarioBerechnung'

/**
 * Inbound Logistik Hauptseite
 * Zeigt Lieferanteninformationen und Logistikdetails mit Excel-Tabellen
 * ✅ Nutzt szenario-aware Berechnungen
 */
export default function InboundPage() {
  const { konfiguration, isInitialized } = useKonfiguration()
  
  // ✅ SZENARIO-AWARE: Nutze neuen Hook
  const {
    hasSzenarien,
    aktiveSzenarienCount,
    aktiveSzenarien,
    modifikation,
    variantenPlaene,
    formatDelta
  } = useSzenarioBerechnung()
  
  // ✅ NEU: State für Zusatzbestellungen
  const [zusatzBestellungen, setZusatzBestellungen] = useState<TaeglicheBestellung[]>([])
  const [neueBestellungDatum, setNeueBestellungDatum] = useState<string>('')
  const [neueBestellungMenge, setNeueBestellungMenge] = useState<string>('500')
  
  // ✅ NEU: Handler für Zusatzbestellung
  const handleZusatzbestellung = useCallback(() => {
    if (!neueBestellungDatum || !neueBestellungMenge) return
    
    const datum = new Date(neueBestellungDatum)
    if (isNaN(datum.getTime())) return
    
    const menge = parseInt(neueBestellungMenge, 10)
    if (isNaN(menge) || menge < 1) return
    
    // Erstelle Zusatzbestellung für alle Sattel-Varianten (gleichverteilt)
    // Verwende Floor für die ersten 3, und berechne den Rest für die letzte Variante
    // um exakt die angeforderte Menge zu verteilen
    const basisMenge = Math.floor(menge / 4)
    const restMenge = menge - (basisMenge * 3)  // Rest geht an die letzte Variante
    const komponenten: Record<string, number> = {
      'SAT_FT': basisMenge,
      'SAT_RL': basisMenge,
      'SAT_SP': basisMenge,
      'SAT_SL': restMenge  // Rest für letzte Variante
    }
    
    const neueBestellung = erstelleZusatzbestellung(
      datum,
      komponenten,
      konfiguration.lieferant.gesamtVorlaufzeitTage
    )
    
    setZusatzBestellungen(prev => [...prev, neueBestellung])
    setNeueBestellungDatum('')
    setNeueBestellungMenge('500')
  }, [neueBestellungDatum, neueBestellungMenge, konfiguration.lieferant.gesamtVorlaufzeitTage])
  
  // Lieferant aus Konfiguration
  const lieferant = konfiguration.lieferant
  
  // Gesamtvorlaufzeit aus Konfiguration + Szenario-Modifikation
  // Bei Schiffsverspätung erhöht sich die Vorlaufzeit
  const baseVorlaufzeit = lieferant.gesamtVorlaufzeitTage
  const gesamtVorlaufzeit = baseVorlaufzeit + modifikation.vorlaufzeitAenderung
  const vorlaufzeitDelta = modifikation.vorlaufzeitAenderung
  
  // ✅ SZENARIO-AWARE Produktionspläne für Bedarfsermittlung
  // Generiere Baseline-Produktionspläne für alle Varianten
  const baselineProduktionsplaene = useMemo(() => {
    return generiereAlleVariantenProduktionsplaene(konfiguration)
  }, [konfiguration])
  
  // ✅ WICHTIG: Nutze Szenario-Pläne wenn Szenarien aktiv, sonst Baseline
  // Das stellt sicher, dass Bestellmengen die Szenarien-Auswirkungen berücksichtigen!
  const produktionsplaene = useMemo(() => {
    if (hasSzenarien && Object.keys(variantenPlaene).length > 0) {
      return variantenPlaene
    }
    return baselineProduktionsplaene
  }, [hasSzenarien, variantenPlaene, baselineProduktionsplaene])
  
  // Konvertiere zu TagesProduktionsplan Format für Inbound-Berechnung
  const produktionsplaeneFormatiert = useMemo(() => {
    const result: Record<string, any[]> = {}
    Object.entries(produktionsplaene).forEach(([varianteId, plan]) => {
      result[varianteId] = plan.tage.map(tag => ({
        datum: tag.datum,
        varianteId: varianteId,
        istMenge: tag.istMenge,
        planMenge: tag.planMenge
      }))
    })
    return result
  }, [produktionsplaene])
  
  // ✅ KORRIGIERT: Berechne tägliche Bestellungen mit fixer Vorlaufzeit aus Konfiguration
  // Vorlaufzeit ist IMMER 49 Tage (konfigurierbar in Einstellungen, aber fix - nicht dynamisch kalkuliert)
  const generierteBestellungen = useMemo(() => {
    return generiereTaeglicheBestellungen(
      produktionsplaeneFormatiert, 
      konfiguration.planungsjahr,
      lieferant.gesamtVorlaufzeitTage // Fixe Vorlaufzeit aus Konfiguration (49 Tage)
    )
  }, [produktionsplaeneFormatiert, konfiguration.planungsjahr, lieferant.gesamtVorlaufzeitTage])
  
  // ✅ Kombiniere generierte + Zusatzbestellungen
  const taeglicheBestellungen = useMemo(() => {
    const alle = [...generierteBestellungen, ...zusatzBestellungen]
    // Sortiere nach Bestelldatum
    return alle.sort((a, b) => {
      const dateA = a.bestelldatum instanceof Date ? a.bestelldatum : new Date(a.bestelldatum)
      const dateB = b.bestelldatum instanceof Date ? b.bestelldatum : new Date(b.bestelldatum)
      return dateA.getTime() - dateB.getTime()
    })
  }, [generierteBestellungen, zusatzBestellungen])
  
  // Statistiken über Bestellungen (inkl. Zusatzbestellungen)
  const bestellStatistik = useMemo(() => {
    const gesamt = taeglicheBestellungen.length
    const vorjahr = taeglicheBestellungen.filter(b => b.istVorjahr).length
    const planungsjahr = gesamt - vorjahr
    const zusatzBestellungenCount = taeglicheBestellungen.filter(b => b.grund === 'zusatzbestellung').length
    
    const gesamtMenge = taeglicheBestellungen.reduce((sum, b) => {
      return sum + Object.values(b.komponenten).reduce((s, m) => s + m, 0)
    }, 0)
    
    return {
      gesamt,
      vorjahr,
      planungsjahr,
      zusatzBestellungenCount,
      gesamtMenge,
      durchschnittProBestellung: gesamt > 0 ? gesamtMenge / gesamt : 0
    }
  }, [taeglicheBestellungen])
  
  // ✅ KORRIGIERT: Monatliche Übersicht aus täglichen Bestellungen aggregieren
  // Keine unabhängige Berechnung mehr - gleiche Datenquelle = gleiche Summen!
  const lieferplanDaten = useMemo(() => {
    const planungsjahr = konfiguration.planungsjahr
    const result: any[] = []
    
    // Gruppiere tägliche Bestellungen nach Jahr und Monat
    const monatlicheAggregation: Record<string, {
      jahr: number;
      monat: number;
      bestellungen: TaeglicheBestellung[];
      gesamtMenge: number;
    }> = {}
    
    taeglicheBestellungen.forEach(bestellung => {
      const datum = bestellung.bestelldatum instanceof Date 
        ? bestellung.bestelldatum 
        : new Date(bestellung.bestelldatum)
      
      const jahr = datum.getFullYear()
      const monat = datum.getMonth() + 1
      const key = `${jahr}-${monat}`
      
      // Berechne Gesamtmenge dieser Bestellung
      const menge = Object.values(bestellung.komponenten).reduce((sum, m) => sum + m, 0)
      
      if (!monatlicheAggregation[key]) {
        monatlicheAggregation[key] = {
          jahr,
          monat,
          bestellungen: [],
          gesamtMenge: 0
        }
      }
      
      monatlicheAggregation[key].bestellungen.push(bestellung)
      monatlicheAggregation[key].gesamtMenge += menge
    })
    
    // Konvertiere zu Array und sortiere nach Datum
    // NUR relevante Monate: Oktober 2026 bis November 2027
    const monatNamen = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    
    Object.values(monatlicheAggregation)
      .sort((a, b) => {
        if (a.jahr !== b.jahr) return a.jahr - b.jahr
        return a.monat - b.monat
      })
      .forEach(agg => {
        // Berechne erstes und letztes Bestelldatum im Monat
        const ersteBestellung = agg.bestellungen[0]?.bestelldatum
        const letzteBestellung = agg.bestellungen[agg.bestellungen.length - 1]?.bestelldatum
        
        // Berechne durchschnittliche Ankunft
        const ersteAnkunft = agg.bestellungen[0]?.erwarteteAnkunft
        
        // Status basierend auf durchschnittlichem Bestelldatum
        let status = 'Geplant'
        const ersteDatum = ersteBestellung instanceof Date ? ersteBestellung : new Date(ersteBestellung)
        if (ersteDatum.getFullYear() < planungsjahr) {
          status = 'Geliefert'
        } else if (ersteDatum.getMonth() < 3) {
          status = 'Unterwegs'
        }
        
        result.push({
          jahr: agg.jahr,
          monat: monatNamen[agg.monat - 1],
          monatNummer: agg.monat,
          anzahlBestellungen: agg.bestellungen.length,
          menge: agg.gesamtMenge,
          losgroesse: lieferant.losgroesse,
          anzahlLose: Math.ceil(agg.gesamtMenge / lieferant.losgroesse),
          vorlaufzeit: gesamtVorlaufzeit,
          status
        })
      })
    
    return result
  }, [taeglicheBestellungen, konfiguration.planungsjahr, lieferant.losgroesse, gesamtVorlaufzeit])
  
  /**
   * Exportiert Lieferanten-Daten als JSON
   */
  const handleExportLieferant = () => {
    exportToJSON({ lieferant: konfiguration.lieferant }, `lieferant_${konfiguration.planungsjahr}`)
  }
  
  /**
   * Exportiert Feiertags-Daten als JSON
   */
  const handleExportFeiertage = () => {
    exportToJSON({ feiertage: konfiguration.feiertage }, `feiertage_${konfiguration.planungsjahr}`)
  }
  
  if (!isInitialized) {
    return <div className="text-center py-8">Lade Konfiguration...</div>
  }
  
  return (
    <div className="space-y-6">
      {/* Header mit Export */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inbound Logistik - {lieferant.land}</h1>
          <p className="text-muted-foreground mt-1">
            Einziger Lieferant für ALLE Komponenten
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportLieferant}>
            <Download className="h-4 w-4 mr-2" />
            Export Lieferant
          </Button>
          <Button variant="outline" onClick={handleExportFeiertage}>
            <Download className="h-4 w-4 mr-2" />
            Export Feiertage
          </Button>
        </div>
      </div>

      {/* Aktive Szenarien Banner */}
      <ActiveScenarioBanner showDetails={false} />

      {/* ✅ SZENARIEN AKTIV: Zeige Auswirkungen auf Inbound */}
      {hasSzenarien && (
        <CollapsibleInfo
          title={`Szenarien aktiv (${aktiveSzenarienCount})`}
          variant="success"
          icon={<Zap className="h-5 w-5" />}
          defaultOpen={true}
        >
          <div className="text-sm text-green-800">
            <p className="mb-3">
              <strong>✅ Szenarien wirken sich auf die Inbound-Logistik aus!</strong>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-green-300">
              <div>
                <div className="text-xs text-green-600">Vorlaufzeit Delta</div>
                <DeltaBadge delta={vorlaufzeitDelta} suffix=" Tage" inverseLogic={true} />
              </div>
              <div>
                <div className="text-xs text-green-600">Bedarf-Faktor</div>
                <span className={`text-sm font-medium ${modifikation.produktionsFaktor !== 1.0 ? 'text-orange-600' : ''}`}>
                  {formatNumber(modifikation.produktionsFaktor * 100, 1)}%
                  {modifikation.produktionsFaktor > 1.0 && (
                    <span className="text-xs text-orange-500 ml-1">↑ +{formatNumber((modifikation.produktionsFaktor - 1) * 100, 0)}%</span>
                  )}
                  {modifikation.produktionsFaktor < 1.0 && (
                    <span className="text-xs text-red-500 ml-1">↓ {formatNumber((modifikation.produktionsFaktor - 1) * 100, 0)}%</span>
                  )}
                </span>
              </div>
              {modifikation.materialverfuegbarkeitFaktor !== 1.0 && (
                <div>
                  <div className="text-xs text-orange-600">Material-Verfügbarkeit</div>
                  <span className="text-sm font-medium text-orange-700">
                    {formatNumber(modifikation.materialverfuegbarkeitFaktor * 100, 1)}%
                  </span>
                </div>
              )}
              {modifikation.materialVerlust > 0 && (
                <div>
                  <div className="text-xs text-red-600">Material-Verlust</div>
                  <span className="text-sm font-medium text-red-700">
                    -{formatNumber(modifikation.materialVerlust, 0)} Teile
                  </span>
                </div>
              )}
            </div>
          </div>
        </CollapsibleInfo>
      )}

      {/* Übersicht Cards - MIT SZENARIO-DELTAS */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Bearbeitungszeit</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lieferant.vorlaufzeitArbeitstage}</div>
            <p className="text-xs text-muted-foreground">Arbeitstage Produktion</p>
          </CardContent>
        </Card>

        <Card className={vorlaufzeitDelta > 0 ? 'border-orange-200' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Seefracht
                {vorlaufzeitDelta > 0 && <Zap className="h-3 w-3 inline ml-1 text-orange-600" />}
              </CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <DeltaCell 
              value={lieferant.vorlaufzeitKalendertage + vorlaufzeitDelta}
              delta={vorlaufzeitDelta}
              inverseLogic={true}
            />
            <p className="text-xs text-muted-foreground">Kalendertage Schiff (24/7)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">LKW-Transport</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lieferant.lkwTransportArbeitstage}</div>
            <p className="text-xs text-muted-foreground">AT (2 China + 2 DE)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Losgröße</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(lieferant.losgroesse, 0)}</div>
            <p className="text-xs text-muted-foreground">Stück Mindestbestellung</p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ HAUPTSEKTION: Bestellansichten mit Tabs (Tägliche + Monatliche Ansicht) */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-orange-600" />
            <CardTitle className="text-orange-900 text-xl">
              Bestellplanung & Logistik
            </CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            Tägliche und monatliche Ansicht der Bestellungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Statistik-Karten */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Gesamt Bestellungen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bestellStatistik.gesamt}</div>
                <p className="text-xs text-muted-foreground">Über gesamten Zeitraum</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Vorjahr (2026)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{bestellStatistik.vorjahr}</div>
                <p className="text-xs text-muted-foreground">Vorlauf-Bestellungen</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Planungsjahr {konfiguration.planungsjahr}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{bestellStatistik.planungsjahr}</div>
                <p className="text-xs text-muted-foreground">Laufende Bestellungen</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Gesamt-Menge</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(bestellStatistik.gesamtMenge, 0)}</div>
                <p className="text-xs text-muted-foreground">Sättel bestellt</p>
              </CardContent>
            </Card>
          </div>

          {/* ✅ TABS: Tägliche vs. Monatliche Ansicht */}
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="daily">
                <Calendar className="h-4 w-4 mr-2" />
                Tägliche Bestelllogik
              </TabsTrigger>
              <TabsTrigger value="monthly">
                <Package className="h-4 w-4 mr-2" />
                Monatliche Übersicht
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: TÄGLICHE BESTELLLOGIK */}
            <TabsContent value="daily" className="space-y-4">
              <div className="bg-white rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Tägliche Bestelllogik (Daily Ordering)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Gemäß PDF-Anforderung: Tägliche Bedarfsermittlung + Bestellung bei Losgröße {lieferant.losgroesse}
                </p>

                {/* ✅ NEU: Zusatzbestellungs-Formular */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Zusatzbestellung eingeben
                  </h4>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <Label htmlFor="bestelldatum" className="text-xs text-blue-800">
                        Bestelldatum
                      </Label>
                      <Input
                        id="bestelldatum"
                        type="date"
                        value={neueBestellungDatum}
                        onChange={(e) => setNeueBestellungDatum(e.target.value)}
                        min={`${konfiguration.planungsjahr}-01-02`}
                        max={`${konfiguration.planungsjahr}-11-12`}
                        className="bg-white"
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <Label htmlFor="bestellmenge" className="text-xs text-blue-800">
                        Menge (Sättel)
                      </Label>
                      <Input
                        id="bestellmenge"
                        type="number"
                        value={neueBestellungMenge}
                        onChange={(e) => setNeueBestellungMenge(e.target.value)}
                        min={lieferant.losgroesse}
                        step={lieferant.losgroesse}
                        placeholder={`Min. ${lieferant.losgroesse}`}
                        className="bg-white"
                      />
                    </div>
                    <div className="text-xs text-blue-700 flex-1 min-w-[150px]">
                      Ankunft: {neueBestellungDatum 
                        ? addDays(new Date(neueBestellungDatum), gesamtVorlaufzeit).toLocaleDateString('de-DE')
                        : '-'
                      }
                    </div>
                    <Button 
                      onClick={handleZusatzbestellung}
                      disabled={!neueBestellungDatum || !neueBestellungMenge}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nachbestellen
                    </Button>
                  </div>
                  {zusatzBestellungen.length > 0 && (
                    <p className="text-xs text-blue-600 mt-2">
                      ✓ {zusatzBestellungen.length} Zusatzbestellung(en) hinzugefügt
                    </p>
                  )}
                </div>

                {/* Excel-Tabelle mit täglichen Bestellungen */}
                <ExcelTable
                  columns={[
                    {
                      key: 'bestelldatum',
                      label: 'Bestelldatum',
                      width: '110px',
                      align: 'center',
                      format: (val) => {
                        if (val instanceof Date && !isNaN(val.getTime())) {
                          return val.toLocaleDateString('de-DE')
                        }
                        return val || '-'
                      },
                      sumable: false
                    },
                    {
                      key: 'istVorjahr',
                      label: 'Jahr',
                      width: '60px',
                      align: 'center',
                      format: (val) => val ? '2026' : '2027',
                      sumable: false
                    },
                    {
                      key: 'bedarfsdatum',
                      label: 'Bedarfsdatum',
                      width: '110px',
                      align: 'center',
                      format: (val) => {
                        if (val instanceof Date && !isNaN(val.getTime())) {
                          return val.toLocaleDateString('de-DE')
                        }
                        return val || '-'
                      },
                      sumable: false
                    },
                    {
                      key: 'vorlaufzeit',
                      label: 'Vorlaufzeit',
                      width: '90px',
                      align: 'center',
                      format: (val) => `${val} Tage`,
                      sumable: false
                    },
                    {
                      key: 'menge',
                      label: 'Bestellmenge',
                      width: '120px',
                      align: 'right',
                      format: (val) => formatNumber(val, 0) + ' Stk',
                      sumable: true
                    },
                    {
                      key: 'grund',
                      label: 'Grund',
                      width: '130px',
                      align: 'center',
                      format: (val) => {
                        if (val === 'losgroesse') return '📦 Losgröße'
                        if (val === 'zusatzbestellung') return '➕ Zusatz'
                        return '📦 Losgröße'
                      },
                      sumable: false
                    },
                    {
                      key: 'erwarteteAnkunft',
                      label: 'Ankunft',
                      width: '110px',
                      align: 'center',
                      format: (val) => {
                        if (val instanceof Date && !isNaN(val.getTime())) {
                          return val.toLocaleDateString('de-DE')
                        }
                        return val || '-'
                      },
                      sumable: false
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      width: '100px',
                      align: 'center',
                      format: (val) => {
                        if (val === 'geliefert') return '✅ Geliefert'
                        if (val === 'unterwegs') return '🚢 Unterwegs'
                        return '📋 Bestellt'
                      },
                      sumable: false
                    }
                  ]}
                  data={taeglicheBestellungen.map((b, idx) => {
                    // Sichere Date-Konvertierung mit Validierung
                    const bestelldatum = b.bestelldatum instanceof Date ? b.bestelldatum : new Date(b.bestelldatum)
                    const bedarfsdatum = b.bedarfsdatum instanceof Date ? b.bedarfsdatum : new Date(b.bedarfsdatum)
                    const erwarteteAnkunft = b.erwarteteAnkunft instanceof Date ? b.erwarteteAnkunft : new Date(b.erwarteteAnkunft)
                    
                    // Berechne Vorlaufzeit in Tagen (mit Validierung für ungültige Daten)
                    const vorlaufzeitMs = erwarteteAnkunft.getTime() - bestelldatum.getTime()
                    const vorlaufzeitTage = isNaN(vorlaufzeitMs) ? 0 : Math.round(vorlaufzeitMs / (1000 * 60 * 60 * 24))
                    
                    // Berechne Gesamtmenge
                    const menge = Object.values(b.komponenten).reduce((sum, m) => sum + m, 0)
                    
                    return {
                      bestelldatum,
                      istVorjahr: b.istVorjahr,
                      bedarfsdatum,
                      vorlaufzeit: vorlaufzeitTage,
                      menge,
                      grund: b.grund,
                      erwarteteAnkunft,
                      status: b.status
                    }
                  })}
                  maxHeight="400px"
                  showFormulas={false}
                  showSums={true}
                  sumRowLabel={`GESAMT (${bestellStatistik.gesamt} Bestellungen, davon ${bestellStatistik.vorjahr} aus 2026)`}
                  dateColumnKey="bestelldatum"
                />
              </div>

              {/* Info-Box unter der Tabelle */}
              <CollapsibleInfo
                title="Wichtige Konzepte der täglichen Bestelllogik"
                variant="info"
                icon={<Calendar className="h-5 w-5" />}
                defaultOpen={false}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">1. Tägliche Bedarfsermittlung</h4>
                    <p className="text-sm text-blue-800">
                      Jeden Tag wird der Bedarf aus dem Produktionsplan für den Liefertag (+{gesamtVorlaufzeit} Tage) ermittelt.
                      Losgröße {lieferant.losgroesse} muss erreicht werden.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">2. Bestellung bei Losgröße</h4>
                    <p className="text-sm text-blue-800">
                      Bestellung erfolgt nur wenn:<br/>
                      • Akkumulierter Bedarf ≥ {lieferant.losgroesse} Stück<br/>
                      • Keine Über-Bestellung: Nur benötigte Menge (370.000 = 370.000 Sättel)
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">3. ✅ Bestellzeitraum: Okt 2026 - Nov 2027</h4>
                    <p className="text-sm text-blue-800 font-bold">
                      {gesamtVorlaufzeit} Tage Vorlaufzeit → Erste Bestellung: ~Mitte Oktober 2026<br/>
                      Letzte Bestellung: ~12. November 2027 (31.12.2027 - {gesamtVorlaufzeit} Tage)
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">4. Aggregation über alle 4 Sattel-Varianten</h4>
                    <p className="text-sm text-blue-800">
                      Bedarf wird über alle Sattel-Typen summiert (Fizik Tundra, Raceline, Spark, Speedline).
                    </p>
                  </div>
                </div>
              </CollapsibleInfo>
            </TabsContent>

            {/* TAB 2: MONATLICHE ÜBERSICHT */}
            <TabsContent value="monthly" className="space-y-4">
              <div className="bg-white rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Monatliche Übersicht (Okt {konfiguration.planungsjahr - 1} - Nov {konfiguration.planungsjahr})</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  ✅ Aggregiert aus täglichen Bestellungen - identische Summen garantiert!
                </p>

                {/* Formel-Karten */}
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <FormulaCard
                    title="Vorlaufzeit (fix)"
                    formula={`Vorlaufzeit = ${gesamtVorlaufzeit} Tage (7 Wochen) - FEST konfiguriert`}
                    description={`Produktion: ${lieferant.vorlaufzeitArbeitstage} AT + LKW: ${lieferant.lkwTransportArbeitstage} AT + Seefracht: ${lieferant.vorlaufzeitKalendertage} KT`}
                    example={`Bestellung 15.10. → Lieferung ~03.12. (${gesamtVorlaufzeit} Tage später)`}
                  />
                  <FormulaCard
                    title="Monatliche Aggregation"
                    formula="Monatsmenge = Σ(Tägliche Bestellungen im Monat)"
                    description="Summen aus täglicher Bestelllogik - 100% konsistent"
                    example={`${bestellStatistik.gesamt} Bestellungen → ${formatNumber(bestellStatistik.gesamtMenge, 0)} Sättel gesamt`}
                  />
                </div>

                {/* Excel-ähnliche Tabelle */}
                <ExcelTable
                  columns={[
                    {
                      key: 'jahr',
                      label: 'Jahr',
                      width: '70px',
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
                      key: 'anzahlBestellungen',
                      label: 'Bestellungen',
                      width: '100px',
                      align: 'center',
                      sumable: true
                    },
                    {
                      key: 'menge',
                      label: 'Bestellmenge',
                      width: '120px',
                      align: 'right',
                      format: (val) => formatNumber(val, 0) + ' Stk',
                      sumable: true
                    },
                    {
                      key: 'losgroesse',
                      label: 'Losgröße',
                      width: '100px',
                      align: 'right',
                      format: (val) => formatNumber(val, 0),
                      sumable: false
                    },
                    {
                      key: 'anzahlLose',
                      label: 'Anzahl Lose',
                      width: '110px',
                      align: 'center',
                      format: (val) => `${val} Lose`,
                      sumable: true
                    },
                    {
                      key: 'vorlaufzeit',
                      label: 'Vorlaufzeit',
                      width: '100px',
                      align: 'center',
                      format: (val) => `${val} Tage`,
                      sumable: false
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      width: '100px',
                      align: 'center',
                      format: (val) => {
                        const colors: Record<string, string> = {
                          'Geliefert': '✓ Geliefert',
                          'Unterwegs': '🚢 Unterwegs',
                          'Geplant': '📅 Geplant'
                        }
                        return colors[val] || val
                      },
                      sumable: false
                    }
                  ]}
                  data={lieferplanDaten}
                  maxHeight="500px"
                  showFormulas={true}
                  showSums={true}
                  sumRowLabel={`GESAMT (${bestellStatistik.gesamt} Bestellungen = ${formatNumber(bestellStatistik.gesamtMenge, 0)} Sättel)`}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Lieferanten-Details - Informationen */}
      <Card>
        <CardHeader>
          <CardTitle>{lieferant.land === 'China' ? '🇨🇳' : '🏭'} {lieferant.name}</CardTitle>
          <CardDescription>
            Einziger Lieferant für alle {konfiguration.bauteile.length} Komponenten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Transport-Sequenz (Reihenfolge wichtig für Feiertage!):</h4>
              <ul className="space-y-1 text-sm">
                {lieferant.transportSequenz && lieferant.transportSequenz.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">{step.schritt}.</span>
                    <span>
                      <strong>{step.typ}:</strong> {step.dauer} {step.einheit} 
                      {step.von !== step.nach && ` (${step.von} → ${step.nach})`}
                      <span className="text-muted-foreground text-xs ml-1">- {step.beschreibung}</span>
                    </span>
                  </li>
                ))}
                <li className="pt-2 border-t">
                  <strong>Gesamt: {gesamtVorlaufzeit} Tage ({Math.ceil(gesamtVorlaufzeit / 7)} Wochen)</strong>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Besonderheiten:</h4>
              <ul className="space-y-1 text-sm">
                {lieferant.besonderheiten.map((b, idx) => (
                  <li key={idx}>✓ {b}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Komponenten - Informationen */}
      <Card>
        <CardHeader>
          <CardTitle>Gelieferte Komponenten ({konfiguration.bauteile.length})</CardTitle>
          <CardDescription>
            Alle Komponenten kommen von diesem einen Lieferanten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            {konfiguration.bauteile.map(b => (
              <div key={b.id} className="text-sm bg-slate-50 rounded px-3 py-2">
                <span className="font-medium">{b.name}</span>
                <span className="text-muted-foreground ml-2">({b.kategorie})</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bestelllogik Info-Boxen - unter den Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Bestelllogik (Rückwärts-Berechnung)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CollapsibleInfo
            title="Bedarfsdatum → Bestelldatum (Rückwärtsrechnung)"
            variant="info"
          >
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Vom Bedarfsdatum <strong>49 Tage</strong> (Gesamtvorlaufzeit) abziehen</li>
              <li>Detailaufschlüsselung:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>2 AT LKW-Transport (Hamburg → Dortmund)</li>
                  <li>{lieferant.vorlaufzeitKalendertage} KT Seefracht (Shanghai → Hamburg)</li>
                  <li>2 AT LKW-Transport (China → Hafen Shanghai)</li>
                  <li>{lieferant.vorlaufzeitArbeitstage} AT Produktion beim Zulieferer</li>
                </ul>
              </li>
              <li>1 Tag Puffer für Bestellverarbeitung abziehen</li>
              <li>Sicherstellen dass Bestelldatum ein Arbeitstag ist</li>
            </ol>
          </CollapsibleInfo>

          <CollapsibleInfo
            title="Losgrößen-Aufrundung"
            variant="success"
          >
            <p className="text-sm text-green-800">
              Jede Bestellung wird auf Vielfache von <strong>{formatNumber(lieferant.losgroesse, 0)} Stück</strong> aufgerundet.
            </p>
            <p className="text-sm text-green-800 mt-2">
              Beispiel: Bedarf 3.500 Stück → Bestellung <strong>{formatNumber(Math.ceil(3500 / lieferant.losgroesse) * lieferant.losgroesse, 0)} Stück</strong> ({Math.ceil(3500 / lieferant.losgroesse)}x Losgröße)
            </p>
          </CollapsibleInfo>
        </CardContent>
      </Card>

    </div>
  )
}