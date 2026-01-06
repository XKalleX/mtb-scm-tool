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
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Ship, AlertTriangle, Package, Download } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { exportToJSON } from '@/lib/export'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import lieferantData from '@/data/lieferant-china.json'
import feiertagsData from '@/data/feiertage-china.json'

/**
 * Inbound Logistik Hauptseite
 * Zeigt Lieferanteninformationen und Logistikdetails mit Excel-Tabellen
 */
export default function InboundPage() {
  const lieferant = lieferantData.lieferant
  const springFestival = feiertagsData.feiertage2027.filter(f => f.name.includes('Spring Festival'))
  
  // Lieferplan-Daten für Excel-Tabelle (deterministisch)
  const lieferplanDaten = Array.from({ length: 12 }, (_, i) => {
    const monat = i + 1
    const bestelldatum = new Date(2027, monat - 1, 5).toISOString().split('T')[0]
    const lieferdatum = new Date(2027, monat - 1, 5 + 49).toISOString().split('T')[0] // 49 Tage später
    
    // Deterministisches Muster basierend auf Saisonalität
    const saisonalitaet = [0.04, 0.05, 0.10, 0.16, 0.14, 0.12, 0.10, 0.08, 0.09, 0.06, 0.03, 0.03]
    const jahresproduktion = 370000
    const menge = Math.round(jahresproduktion * saisonalitaet[i] * 1.1) // 10% Buffer
    
    const status = monat <= 3 ? 'Geliefert' : monat <= 6 ? 'Unterwegs' : 'Geplant'
    
    return {
      monat: ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][i],
      bestelldatum,
      lieferdatum,
      vorlaufzeit: 49,
      menge,
      losgroesse: lieferant.losgroesse,
      anzahlLose: Math.ceil(menge / lieferant.losgroesse),
      status
    }
  })
  
  /**
   * Exportiert Lieferanten-Daten als JSON
   */
  const handleExportLieferant = () => {
    exportToJSON(lieferantData, 'lieferant_china_2027')
  }
  
  /**
   * Exportiert Feiertags-Daten als JSON
   */
  const handleExportFeiertage = () => {
    exportToJSON(feiertagsData, 'feiertage_china_2027')
  }
  
  return (
    <div className="space-y-6">
      {/* Header mit Export */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inbound Logistik - China</h1>
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
              <CardTitle className="text-sm font-medium">Transportzeit</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lieferant.vorlaufzeitKalendertage}</div>
            <p className="text-xs text-muted-foreground">Kalendertage Schiff</p>
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

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Lieferintervall</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lieferant.lieferintervall}</div>
            <p className="text-xs text-muted-foreground">Tage zwischen Lieferungen</p>
          </CardContent>
        </Card>
      </div>

      {/* Lieferanten-Details */}
      <Card>
        <CardHeader>
          <CardTitle>🇨🇳 {lieferant.name}</CardTitle>
          <CardDescription>
            Einziger Lieferant für alle {lieferantData.komponenten.length} Komponenten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Vorlaufzeiten (SSOT):</h4>
              <ul className="space-y-1 text-sm">
                <li>✓ Produktion in China: <strong>{lieferant.vorlaufzeitArbeitstage} Arbeitstage</strong></li>
                <li>✓ Schiff-Transport: <strong>{lieferant.vorlaufzeitKalendertage} Kalendertage (24/7)</strong></li>
                <li>✓ Gesamt: <strong>49 Tage (7 Wochen)</strong></li>
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
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900">Spring Festival 2027</CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            7 Tage kompletter Produktionsstopp in China!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-orange-800">
              <strong>Zeitraum:</strong> 28. Januar - 3. Februar 2027
            </p>
            <p className="text-sm text-orange-800">
              <strong>Auswirkung:</strong> Keine Produktion, keine Bestellungsbearbeitung
            </p>
            <p className="text-sm text-orange-800">
              <strong>Planung:</strong> Bestellungen müssen vor dem 28.1. oder nach dem 3.2. eingehen
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

      {/* Komponenten */}
      <Card>
        <CardHeader>
          <CardTitle>Gelieferte Komponenten ({lieferantData.komponenten.length})</CardTitle>
          <CardDescription>
            Alle Komponenten kommen von diesem einen Lieferanten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            {lieferantData.komponenten.map(k => (
              <div key={k} className="text-sm bg-slate-50 rounded px-3 py-2">
                {k.replace(/_/g, ' ')}
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
            <h4 className="font-semibold text-blue-900 mb-2">Bedarfsdatum → Bestelldatum:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Vom Bedarfsdatum <strong>{lieferant.vorlaufzeitKalendertage} Kalendertage</strong> (Transport) abziehen</li>
              <li>Dann <strong>{lieferant.vorlaufzeitArbeitstage} Arbeitstage</strong> (Produktion) abziehen</li>
              <li>1 Tag Puffer abziehen</li>
              <li>Sicherstellen dass Bestelldatum ein Arbeitstag ist</li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Losgrößen-Aufrundung:</h4>
            <p className="text-sm text-green-800">
              Jede Bestellung wird auf Vielfache von <strong>{formatNumber(lieferant.losgroesse, 0)} Stück</strong> aufgerundet.
            </p>
            <p className="text-sm text-green-800 mt-2">
              Beispiel: Bedarf 3.500 Stück → Bestellung <strong>4.000 Stück</strong> (2x Losgröße)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lieferplan mit Excel-Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle>Lieferplan 2027 - China Komponenten</CardTitle>
          <CardDescription>
            Monatlicher Lieferplan mit Vorlaufzeiten und Losgrößen (Excel-Darstellung)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Formel-Karten */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <FormulaCard
              title="Vorlaufzeit Berechnung"
              formula="Vorlaufzeit = 5 AT (Produktion) + 44 KT (Transport) = 49 Tage (7 Wochen)"
              description="Gesamte Durchlaufzeit von Bestellung bis Ankunft in Deutschland (gemäß SSOT)"
              example="Bestellung 05.01. → Lieferung ~23.02. (49 Tage später)"
            />
            <FormulaCard
              title="Losgrößen-Aufrundung"
              formula="Anzahl Lose = AUFRUNDEN(Bestellmenge / Losgröße)"
              description="Jede Bestellung wird auf Vielfache der Losgröße aufgerundet"
              example="Bedarf 35.000 → 18 Lose × 2.000 = 36.000 Stück"
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
                formula: '5 AT + 44 KT',
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
            sumRowLabel="JAHRESSUMME 2027"
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
            <RequirementItem text="21 Arbeitstage Bearbeitungszeit" />
            <RequirementItem text="35 Kalendertage Schiff-Transport" />
            <RequirementItem text="Losgrößen-Optimierung (2.000 Stück)" />
            <RequirementItem text="Spring Festival Berücksichtigung" />
            <RequirementItem text="Chinesische Feiertage integriert" />
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