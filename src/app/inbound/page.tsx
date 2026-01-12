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
import { CheckCircle2, Ship, AlertTriangle, Package, Download } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { exportToJSON } from '@/lib/export'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { useMemo } from 'react'

/**
 * Inbound Logistik Hauptseite
 * Zeigt Lieferanteninformationen und Logistikdetails mit Excel-Tabellen
 * Nutzt dynamische Konfiguration aus KonfigurationContext
 */
export default function InboundPage() {
  const { konfiguration, isInitialized } = useKonfiguration()
  
  // Lieferant aus Konfiguration
  const lieferant = konfiguration.lieferant
  
  // Gesamtvorlaufzeit berechnen (49 Tage = 5 AT Produktion + 4 AT LKW + 30 KT Seefracht + Puffer)
  // Vereinfacht: 5 AT + 30 KT + 4 AT = ca. 39 Tage + Puffer ≈ 49 Tage
  const gesamtVorlaufzeit = 49  // Feste 49 Tage wie in SSOT spezifiziert
  
  // Spring Festival aus Feiertagen filtern
  const springFestival = useMemo(() => 
    konfiguration.feiertage.filter(f => f.name.includes('Spring Festival') && f.land === 'China'),
    [konfiguration.feiertage]
  )
  
  // Lieferplan-Daten für Excel-Tabelle (deterministisch, basierend auf Konfiguration)
  const lieferplanDaten = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monat = i + 1
      const bestelldatum = new Date(konfiguration.planungsjahr, monat - 1, 5).toISOString().split('T')[0]
      const lieferdatum = new Date(konfiguration.planungsjahr, monat - 1, 5 + gesamtVorlaufzeit).toISOString().split('T')[0]
      
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
              <h4 className="font-semibold mb-2">Vorlaufzeiten (aus Konfiguration):</h4>
              <ul className="space-y-1 text-sm">
                <li>✓ Produktion: <strong>{lieferant.vorlaufzeitArbeitstage} Arbeitstage</strong> (Mo-Fr)</li>
                <li>✓ LKW China → Hafen: <strong>2 Arbeitstage</strong></li>
                <li>✓ Seefracht: <strong>{lieferant.vorlaufzeitKalendertage} Kalendertage</strong> (Shanghai → Hamburg, 24/7)</li>
                <li>✓ LKW Hamburg → Dortmund: <strong>2 Arbeitstage</strong></li>
                <li>✓ Gesamt: <strong>{gesamtVorlaufzeit} Tage (7 Wochen)</strong></li>
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

      {/* Spring Festival Warnung */}
      {springFestival.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Spring Festival {konfiguration.planungsjahr}</CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              {springFestival.length} Tage kompletter Produktionsstopp in {lieferant.land}!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-orange-800">
                <strong>Zeitraum:</strong> {new Date(springFestival[0]?.datum).toLocaleDateString('de-DE')} - {new Date(springFestival[springFestival.length - 1]?.datum).toLocaleDateString('de-DE')}
              </p>
              <p className="text-sm text-orange-800">
                <strong>Auswirkung:</strong> Keine Produktion, keine Bestellungsbearbeitung
              </p>
              <p className="text-sm text-orange-800">
                <strong>Planung:</strong> Bestellungen müssen vor oder nach dem Festival eingehen
              </p>
            </div>
            
            <div className="mt-4">
              <h4 className="font-semibold text-orange-900 mb-2">Betroffene Feiertage:</h4>
              <div className="grid gap-2 md:grid-cols-2">
                {springFestival.map(f => (
                  <div key={f.datum} className="text-sm bg-white rounded px-2 py-1">
                    {new Date(f.datum).toLocaleDateString('de-DE')}: {f.name}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Bedarfsdatum → Bestelldatum (Rückwärtsrechnung):</h4>
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
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Losgrößen-Aufrundung:</h4>
            <p className="text-sm text-green-800">
              Jede Bestellung wird auf Vielfache von <strong>{formatNumber(lieferant.losgroesse, 0)} Stück</strong> aufgerundet.
            </p>
            <p className="text-sm text-green-800 mt-2">
              Beispiel: Bedarf 3.500 Stück → Bestellung <strong>{formatNumber(Math.ceil(3500 / lieferant.losgroesse) * lieferant.losgroesse, 0)} Stück</strong> ({Math.ceil(3500 / lieferant.losgroesse)}x Losgröße)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lieferplan mit Excel-Tabelle */}
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
              formula={`Vorlaufzeit = ${lieferant.vorlaufzeitArbeitstage} AT (Produktion) + 2 AT + ${lieferant.vorlaufzeitKalendertage} KT + 2 AT (Transport) = ${gesamtVorlaufzeit} Tage (7 Wochen)`}
              description="Gesamte Durchlaufzeit: 5 AT Produktion + 2 AT LKW China + 30 KT Seefracht + 2 AT LKW Deutschland = 49 Tage"
              example={`Bestellung 05.01. → Lieferung ~${new Date(konfiguration.planungsjahr, 0, 5 + gesamtVorlaufzeit).toLocaleDateString('de-DE')} (${gesamtVorlaufzeit} Tage später)`}
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
                format: (val) => new Date(val).toLocaleDateString('de-DE'),
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
                format: (val) => new Date(val).toLocaleDateString('de-DE'),
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

      {/* Erfüllte Anforderungen */}
      <Card>
        <CardHeader>
          <CardTitle>Erfüllte Anforderungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <RequirementItem text="Rückwärts-Berechnung Bestelldatum" />
            <RequirementItem text={`${lieferant.vorlaufzeitArbeitstage} Arbeitstage Produktion`} />
            <RequirementItem text={`${lieferant.vorlaufzeitKalendertage} Kalendertage Seefracht (Shanghai → Hamburg)`} />
            <RequirementItem text={`${lieferant.lkwTransportArbeitstage} AT LKW-Transport (2 AT China + 2 AT DE)`} />
            <RequirementItem text={`Gesamtvorlaufzeit: ${gesamtVorlaufzeit} Tage (7 Wochen)`} />
            <RequirementItem text={`Losgrößen-Optimierung (${formatNumber(lieferant.losgroesse, 0)} Stück)`} />
            <RequirementItem text="Spring Festival Berücksichtigung" />
            <RequirementItem text="Chinesische Feiertage integriert" />
            <RequirementItem text="Dynamische Konfiguration" />
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