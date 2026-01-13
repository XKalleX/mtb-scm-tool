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
 * NEU: Nutzt dynamische Konfiguration aus KonfigurationContext
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Ship, AlertTriangle, Package, Download, Calendar } from 'lucide-react'
import { CollapsibleInfo } from '@/components/ui/collapsible-info'
import { formatNumber, addDays } from '@/lib/utils'
import { exportToJSON } from '@/lib/export'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { ActiveScenarioBanner } from '@/components/ActiveScenarioBanner'
import { useMemo } from 'react'
import { generiereAlleVariantenProduktionsplaene } from '@/lib/calculations/zentrale-produktionsplanung'
import { generiereTaeglicheBestellungen, type TaeglicheBestellung } from '@/lib/calculations/inbound-china'

/**
 * Inbound Logistik Hauptseite
 * Zeigt Lieferanteninformationen und Logistikdetails mit Excel-Tabellen
 * Nutzt dynamische Konfiguration aus KonfigurationContext
 */
export default function InboundPage() {
  const { konfiguration, isInitialized } = useKonfiguration()
  
  // Lieferant aus Konfiguration
  const lieferant = konfiguration.lieferant
  
  // Gesamtvorlaufzeit aus Konfiguration (konfigurierbar durch Einstellungen)
  // Die Transportsequenz zeigt die Reihenfolge: Produktion → LKW China → Schiff → LKW DE
  // Feiertage werden bei der Berechnung in lib/kalender.ts berücksichtigt
  const gesamtVorlaufzeit = lieferant.gesamtVorlaufzeitTage
  
  // Spring Festival aus Feiertagen filtern
  const springFestival = useMemo(() => 
    konfiguration.feiertage.filter(f => f.name.includes('Spring Festival') && f.land === 'China'),
    [konfiguration.feiertage]
  )
  
  // ✅ NEUE BESTELLLOGIK: Tägliche Bedarfsermittlung
  // Generiere Produktionspläne für alle Varianten
  const produktionsplaene = useMemo(() => {
    return generiereAlleVariantenProduktionsplaene(konfiguration)
  }, [konfiguration])
  
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
  
  // Berechne tägliche Bestellungen (inkl. Vorjahr!)
  const taeglicheBestellungen = useMemo(() => {
    return generiereTaeglicheBestellungen(produktionsplaeneFormatiert, konfiguration.planungsjahr)
  }, [produktionsplaeneFormatiert, konfiguration.planungsjahr])
  
  // Statistiken über Bestellungen
  const bestellStatistik = useMemo(() => {
    const gesamt = taeglicheBestellungen.length
    const vorjahr = taeglicheBestellungen.filter(b => b.istVorjahr).length
    const planungsjahr = gesamt - vorjahr
    
    const gesamtMenge = taeglicheBestellungen.reduce((sum, b) => {
      return sum + Object.values(b.komponenten).reduce((s, m) => s + m, 0)
    }, 0)
    
    return {
      gesamt,
      vorjahr,
      planungsjahr,
      gesamtMenge,
      durchschnittProBestellung: gesamt > 0 ? gesamtMenge / gesamt : 0
    }
  }, [taeglicheBestellungen])
  
  // Lieferplan-Daten für Excel-Tabelle (deterministisch, basierend auf Konfiguration)
  const lieferplanDaten = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monat = i + 1
      // Bestelldatum: 5. Tag des Monats
      const bestelldatumObj = new Date(konfiguration.planungsjahr, monat - 1, 5)
      
      // Validierung: Prüfe ob Datum gültig ist
      const bestelldatum = isNaN(bestelldatumObj.getTime()) 
        ? `${konfiguration.planungsjahr}-${String(monat).padStart(2, '0')}-05`
        : bestelldatumObj.toISOString().split('T')[0]
      
      // Lieferdatum: Bestelldatum + Vorlaufzeit (korrekte Addition mit addDays)
      const lieferdatumObj = addDays(bestelldatumObj, gesamtVorlaufzeit)
      
      // Validierung: Prüfe ob Datum gültig ist
      const lieferdatum = isNaN(lieferdatumObj.getTime())
        ? '-'
        : lieferdatumObj.toISOString().split('T')[0]
      
      // Menge basierend auf Saisonalität aus Konfiguration
      const saisonAnteil = konfiguration.saisonalitaet[i]?.anteil || 8.33
      const menge = Math.round(konfiguration.jahresproduktion * (saisonAnteil / 100) * 1.1) // 10% Buffer
      
      const status = monat <= 3 ? 'Geliefert' : monat <= 6 ? 'Unterwegs' : 'Geplant'
      
      return {
        monat: ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][i],
        bestelldatum,
        lieferdatum,
        vorlaufzeit: gesamtVorlaufzeit,
        menge,
        losgroesse: lieferant.losgroesse,
        anzahlLose: Math.ceil(menge / lieferant.losgroesse),
        status
      }
    })
  }, [konfiguration, lieferant, gesamtVorlaufzeit])
  
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

      {/* Übersicht Cards */}
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

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Seefracht</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lieferant.vorlaufzeitKalendertage}</div>
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

      {/* Lieferanten-Details */}
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

      {/* Spring Festival Warnung - COLLAPSIBLE */}
      {springFestival.length > 0 && (
        <CollapsibleInfo
          title={`Spring Festival ${konfiguration.planungsjahr}`}
          variant="warning"
          icon={<AlertTriangle className="h-5 w-5" />}
          defaultOpen={false}
        >
          <div className="space-y-3 text-sm text-orange-800">
            <p className="font-semibold">
              {springFestival.length} Tage kompletter Produktionsstopp in {lieferant.land}!
            </p>
            <div className="space-y-2">
              <p>
                <strong>Zeitraum:</strong> {springFestival[0]?.datum ? new Date(springFestival[0].datum).toLocaleDateString('de-DE') : '-'} - {springFestival[springFestival.length - 1]?.datum ? new Date(springFestival[springFestival.length - 1].datum).toLocaleDateString('de-DE') : '-'}
              </p>
              <p>
                <strong>Auswirkung:</strong> Keine Produktion, keine Bestellungsbearbeitung
              </p>
              <p>
                <strong>Planung:</strong> Bestellungen müssen vor oder nach dem Festival eingehen
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Betroffene Feiertage:</h4>
              <div className="grid gap-2 md:grid-cols-2">
                {springFestival.map(f => {
                  const datum = f.datum ? new Date(f.datum) : null
                  const datumStr = datum && !isNaN(datum.getTime()) ? datum.toLocaleDateString('de-DE') : '-'
                  return (
                    <div key={f.datum || f.name} className="text-sm bg-white rounded px-2 py-1 border border-orange-200">
                      {datumStr}: {f.name}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CollapsibleInfo>
      )}

      {/* Komponenten */}
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

      {/* Bestelllogik */}
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

      {/* ✅ NEUE SEKTION: TÄGLICHE BESTELLUNGEN */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-orange-600" />
            <CardTitle className="text-orange-900 text-xl">
              TÄGLICHE BESTELLLOGIK (Daily Ordering)
            </CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            Gemäß PDF-Anforderung: Tägliche Bedarfsermittlung + Bestellung bei Losgröße 500 oder Sicherheitsbestand
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

          {/* Info-Box */}
          <CollapsibleInfo
            title="Wichtige Konzepte der täglichen Bestelllogik"
            variant="info"
            icon={<Calendar className="h-5 w-5" />}
            defaultOpen={true}
          >
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">1. Tägliche Bedarfsermittlung</h4>
                <p className="text-sm text-blue-800">
                  Jeden Tag wird der Bedarf aus dem Produktionsplan ermittelt und akkumuliert.
                  Losgröße {lieferant.losgroesse} muss erreicht werden.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-blue-900 mb-2">2. Bestellung bei Losgröße ODER Sicherheitsbestand</h4>
                <p className="text-sm text-blue-800">
                  Bestellung erfolgt wenn:<br/>
                  • Akkumulierter Bedarf ≥ {lieferant.losgroesse} Stück ODER<br/>
                  • Alle 14 Tage (Sicherheitsbestand-Prüfung)
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-blue-900 mb-2">3. ✅ Bestellungen müssen VOR 2027 beginnen!</h4>
                <p className="text-sm text-blue-800 font-bold">
                  49 Tage Vorlaufzeit → Erste Bestellung: ~12. November 2026<br/>
                  Damit am 01.01.2027 Material für Produktionsstart verfügbar ist.
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

          {/* Excel-Tabelle mit täglichen Bestellungen */}
          <div className="mt-6">
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
                    if (val === 'initial') return '🎯 Initial'
                    if (val === 'losgroesse') return '📦 Losgröße'
                    return '⚠️ Sicherheit'
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
            />
          </div>
        </CardContent>
      </Card>

      {/* Lieferplan mit Excel-Tabelle (ALTE monatliche Ansicht als Referenz) */}
      <Card className="border-gray-300">
        <CardHeader>
          <CardTitle>📅 Monatlicher Lieferplan (Referenz-Ansicht)</CardTitle>
          <CardDescription>
            Vereinfachte monatliche Darstellung - Die tägliche Bestelllogik oben ist die korrekte Implementierung!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CollapsibleInfo
            title="Hinweis: Monatliche vs. Tägliche Bestellungen"
            variant="warning"
            icon={<AlertTriangle className="h-5 w-5" />}
            defaultOpen={false}
          >
            <p className="text-sm text-orange-800">
              Diese monatliche Ansicht dient nur als Übersicht. Die korrekte Implementierung gemäß PDF-Anforderungen
              ist die <strong>tägliche Bestelllogik</strong> oben, die täglich den Bedarf ermittelt und bei Erreichen
              der Losgröße oder Unterschreiten des Sicherheitsbestands bestellt.
            </p>
          </CollapsibleInfo>
        </CardContent>
      </Card>

      {/* Alte monatliche Lieferplan-Tabelle - jetzt als Referenz */}
      <Card>
        <CardHeader>
          <CardTitle>Lieferplan {konfiguration.planungsjahr} - {lieferant.land} Komponenten</CardTitle>
          <CardDescription>
            Monatlicher Lieferplan mit Vorlaufzeiten und Losgrößen (Excel-Darstellung)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Formel-Karten */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <FormulaCard
              title="Vorlaufzeit Berechnung"
              formula={`Vorlaufzeit = ${lieferant.vorlaufzeitArbeitstage} AT (Produktion) + ${lieferant.lkwTransportChinaArbeitstage} AT (LKW China) + ${lieferant.vorlaufzeitKalendertage} KT (Seefracht) + ${lieferant.lkwTransportDeutschlandArbeitstage} AT (LKW DE) = ${gesamtVorlaufzeit} Tage (${Math.ceil(gesamtVorlaufzeit / 7)} Wochen)`}
              description={`Sequenz: 1. Produktion (${lieferant.vorlaufzeitArbeitstage} AT) → 2. LKW China→Hafen (${lieferant.lkwTransportChinaArbeitstage} AT) → 3. Seefracht (${lieferant.vorlaufzeitKalendertage} KT) → 4. LKW Hamburg→Werk (${lieferant.lkwTransportDeutschlandArbeitstage} AT). Reihenfolge wichtig für Feiertagsberechnung!`}
              example={(() => {
                const beispielDatum = new Date(konfiguration.planungsjahr, 0, 5)
                const lieferdatum = addDays(beispielDatum, gesamtVorlaufzeit)
                const lieferdatumStr = !isNaN(lieferdatum.getTime()) ? lieferdatum.toLocaleDateString('de-DE') : '-'
                return `Bestellung 05.01. → Lieferung ~${lieferdatumStr} (${gesamtVorlaufzeit} Tage später)`
              })()}
            />
            <FormulaCard
              title="Losgrößen-Aufrundung"
              formula="Anzahl Lose = AUFRUNDEN(Bestellmenge / Losgröße)"
              description="Jede Bestellung wird auf Vielfache der Losgröße aufgerundet"
              example={`Bedarf 35.000 → ${Math.ceil(35000 / lieferant.losgroesse)} Lose × ${formatNumber(lieferant.losgroesse, 0)} = ${formatNumber(Math.ceil(35000 / lieferant.losgroesse) * lieferant.losgroesse, 0)} Stück`}
            />
          </div>

          {/* Excel-ähnliche Tabelle */}
          <ExcelTable
            columns={[
              {
                key: 'monat',
                label: 'Monat',
                width: '80px',
                align: 'center',
                sumable: false
              },
              {
                key: 'bestelldatum',
                label: 'Bestelldatum',
                width: '120px',
                align: 'center',
                format: (val) => {
                  const date = new Date(val)
                  return !isNaN(date.getTime()) ? date.toLocaleDateString('de-DE') : val
                },
                sumable: false
              },
              {
                key: 'vorlaufzeit',
                label: 'Vorlaufzeit',
                width: '100px',
                align: 'center',
                formula: `${lieferant.vorlaufzeitArbeitstage} AT + ${lieferant.vorlaufzeitKalendertage} KT`,
                format: (val) => `${val} Tage`,
                sumable: false
              },
              {
                key: 'lieferdatum',
                label: 'Lieferdatum',
                width: '120px',
                align: 'center',
                formula: 'Bestelldatum + Vorlaufzeit',
                format: (val) => {
                  const date = new Date(val)
                  return !isNaN(date.getTime()) ? date.toLocaleDateString('de-DE') : val
                },
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
                formula: 'AUFRUNDEN(Menge / Losgröße)',
                format: (val) => `${val} Lose`,
                sumable: true
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
            sumRowLabel={`JAHRESSUMME ${konfiguration.planungsjahr}`}
          />
        </CardContent>
      </Card>

    </div>
  )
}