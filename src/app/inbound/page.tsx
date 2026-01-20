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
import { istChinaFeiertag, ladeChinaFeiertage } from '@/lib/kalender'
import { isWeekend } from '@/lib/utils'

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
    
    /**
     * 🎯 FIX: EXAKTE Mengenverteilung (kein Aufrunden!)
     * 
     * Problem: Bei 5000 Sätteln würde rundeAufLosgroesse() pro Variante aufrunden:
     *   - 1250 → 1500 (pro Variante)
     *   - 1500 * 4 = 6000 (1000 zu viel!)
     * 
     * Lösung: Menge wird hier bereits EXAKT verteilt
     *   - 1250 + 1250 + 1250 + 1250 = 5000 (korrekt!)
     * 
     * WICHTIG: Die Eingabe-Menge wird vom Benutzer bereits auf Losgröße 
     * gerundet (via step={losgroesse} im Input), daher keine weitere 
     * Aufrundung nötig!
     */
    const basisMenge = Math.floor(menge / 4)
    const restMenge = menge - (basisMenge * 3)  // Rest geht an die letzte Variante
    const komponenten: Record<string, number> = {
      'SAT_FT': basisMenge,
      'SAT_RL': basisMenge,
      'SAT_SP': basisMenge,
      'SAT_SL': restMenge  // Rest für letzte Variante
    }
    
    // Erstelle Zusatzbestellung OHNE weitere Aufrundung
    // Parameter: bestelldatum, komponenten, vorlaufzeit, skipLosgroessenRundung=false
    // (false = keine Aufrundung, da Mengen bereits exakt verteilt sind)
    const neueBestellung = erstelleZusatzbestellung(
      datum,
      komponenten,
      konfiguration.lieferant.gesamtVorlaufzeitTage,
      false
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
  
  /**
   * 🎯 FIX 5: ALLE 365 Tage anzeigen (nicht nur Bestelltage)
   * 
   * Generiert für jeden Tag des Jahres 2027 einen Eintrag:
   * - Bestellungen: Wenn eine Bestellung existiert, zeige diese
   * - Keine Bestellung: Zeige Grund (Wochenende, Feiertag, Losgröße nicht erreicht)
   * - Visuelle Markierung für besondere Tage
   */
  const alleTageMitBestellungen = useMemo(() => {
    const jahr = konfiguration.planungsjahr
    const feiertage = ladeChinaFeiertage()
    const alleTage: any[] = []
    
    // Erstelle Map für schnelle Bestellungs-Lookup
    const bestellungenMap = new Map<string, TaeglicheBestellung>()
    taeglicheBestellungen.forEach(b => {
      const datum = b.bestelldatum instanceof Date ? b.bestelldatum : new Date(b.bestelldatum)
      const key = datum.toISOString().split('T')[0]
      bestellungenMap.set(key, b)
    })
    
    // Iteriere über alle Tage des Jahres (365 oder 366 bei Schaltjahr)
    const jahresTage = new Date(jahr, 11, 31).getDate() === 31 && 
                      new Date(jahr, 1, 29).getMonth() === 1 ? 366 : 365
    
    for (let tag = 1; tag <= jahresTage; tag++) {
      const datum = new Date(jahr, 0, tag)
      const datumKey = datum.toISOString().split('T')[0]
      const bestellung = bestellungenMap.get(datumKey)
      
      // Prüfe Tag-Typ
      const istWochenende = isWeekend(datum)
      const feiertag = istChinaFeiertag(datum)
      const istFeiertag = feiertag.length > 0
      
      if (bestellung) {
        // Tag MIT Bestellung
        const bedarfsdatum = bestellung.bedarfsdatum instanceof Date ? bestellung.bedarfsdatum : new Date(bestellung.bedarfsdatum)
        const erwarteteAnkunft = bestellung.erwarteteAnkunft instanceof Date ? bestellung.erwarteteAnkunft : new Date(bestellung.erwarteteAnkunft)
        const menge = Object.values(bestellung.komponenten).reduce((sum, m) => sum + m, 0)
        
        // Erstelle formatierte Felder für visuelle Markierung
        const dateStr = datum.toLocaleDateString('de-DE')
        const datumFormatiert = istFeiertag ? `🔴 ${dateStr}` : istWochenende ? `🟡 ${dateStr}` : `🟢 ${dateStr}`
        
        let grundFormatiert = ''
        if (bestellung.grund === 'losgroesse') {
          grundFormatiert = '✓ Bestellung (Losgröße erreicht)'
        } else if (bestellung.grund === 'zusatzbestellung') {
          grundFormatiert = '✓ Zusatzbestellung (manuell)'
        } else {
          grundFormatiert = '✓ Bestellung'
        }
        
        alleTage.push({
          datum,
          bestelldatum: datum,
          datumFormatiert,
          istVorjahr: bestellung.istVorjahr,
          bedarfsdatum,
          vorlaufzeit: lieferant.gesamtVorlaufzeitTage,
          vorlaufzeitFormatiert: `${lieferant.gesamtVorlaufzeitTage} Tage`,
          menge,
          mengeFormatiert: formatNumber(menge, 0) + ' Stk',
          grund: bestellung.grund,
          grundFormatiert,
          erwarteteAnkunft,
          erwarteteAnkunftFormatiert: erwarteteAnkunft.toLocaleDateString('de-DE'),
          status: bestellung.status,
          hatBestellung: true,
          istWochenende,
          istFeiertag,
          feiertagName: istFeiertag ? feiertag[0].name : undefined
        })
      } else {
        // Tag OHNE Bestellung - ermittle Grund
        let grund = 'Losgröße nicht erreicht'
        let grundFormatiert = '⚠️ Losgröße nicht erreicht'
        
        if (istWochenende) {
          grund = 'Wochenende'
          grundFormatiert = '❌ Wochenende (keine Produktion)'
        } else if (istFeiertag) {
          grund = `Feiertag: ${feiertag[0].name}`
          grundFormatiert = `❌ Feiertag: ${feiertag[0].name}`
        }
        
        const dateStr = datum.toLocaleDateString('de-DE')
        const datumFormatiert = istFeiertag ? `🔴 ${dateStr}` : istWochenende ? `🟡 ${dateStr}` : `⚪ ${dateStr}`
        
        alleTage.push({
          datum,
          bestelldatum: datum,
          datumFormatiert,
          istVorjahr: false,
          bedarfsdatum: null,
          vorlaufzeit: null,
          vorlaufzeitFormatiert: '-',
          menge: 0,
          mengeFormatiert: '-',
          grund,
          grundFormatiert,
          erwarteteAnkunft: null,
          erwarteteAnkunftFormatiert: '-',
          status: '-',
          hatBestellung: false,
          istWochenende,
          istFeiertag,
          feiertagName: istFeiertag ? feiertag[0].name : undefined
        })
      }
    }
    
    return alleTage
  }, [taeglicheBestellungen, konfiguration.planungsjahr, lieferant.gesamtVorlaufzeitTage])
  
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

          {/* ✅ TÄGLICHE BESTELLLOGIK (SSOT) */}
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
                        min={`${konfiguration.planungsjahr - 1}-10-01`}
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

                {/* Excel-Tabelle mit ALLEN Tagen des Jahres */}
                <div className="mb-2 text-xs text-muted-foreground">
                  ✅ Zeigt ALLE Tage des Jahres {konfiguration.planungsjahr} (inkl. Wochenenden/Feiertage) | 🟢 = Bestellung | 🟡 = Wochenende | 🔴 = Feiertag
                </div>
                <ExcelTable
                  columns={[
                    {
                      key: 'datumFormatiert',
                      label: 'Datum',
                      width: '110px',
                      align: 'center',
                      sumable: false
                    },
                    {
                      key: 'mengeFormatiert',
                      label: 'Bestellmenge',
                      width: '120px',
                      align: 'right',
                      sumable: false
                    },
                    {
                      key: 'grundFormatiert',
                      label: 'Status / Grund',
                      width: '200px',
                      align: 'left',
                      sumable: false
                    },
                    {
                      key: 'vorlaufzeitFormatiert',
                      label: 'Vorlaufzeit',
                      width: '90px',
                      align: 'center',
                      sumable: false
                    },
                    {
                      key: 'erwarteteAnkunftFormatiert',
                      label: 'Ankunft',
                      width: '110px',
                      align: 'center',
                      sumable: false
                    }
                  ]}
                  data={alleTageMitBestellungen}
                  maxHeight="400px"
                  showFormulas={false}
                  showSums={false}
                  sumRowLabel={`GESAMT: ${bestellStatistik.gesamt} Bestellungen von ${alleTageMitBestellungen.length} Tagen (${bestellStatistik.vorjahr} aus 2026)`}
                  dateColumnKey="bestelldatum"
                />

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
            </div>
        </CardContent>
      </Card>

      {/* Lieferanten-Details - Informationen (ausklappbar) */}
      <CollapsibleInfo
        title={`${lieferant.land === 'China' ? '🇨🇳' : '🏭'} ${lieferant.name} - Lieferanten-Details`}
        variant="info"
        icon={<Ship className="h-5 w-5" />}
        defaultOpen={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Einziger Lieferant für alle {konfiguration.bauteile.length} Komponenten
          </p>
          
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
        </div>
      </CollapsibleInfo>

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