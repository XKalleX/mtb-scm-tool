'use client'

/**
 * ========================================
 * STAMMDATEN VISUALISIERUNG
 * ========================================
 * 
 * Diese Seite visualisiert alle Stammdaten aus den JSON-Dateien:
 * - stammdaten.json (Projekt, MTB-Varianten, Produktion, Zulieferer, Szenarien)
 * - saisonalitaet.json (Monatliche Verteilung)
 * - stueckliste.json (Bike-Sattel-Zuordnung)
 * - lieferant-china.json (Lieferant Details, Komponenten)
 * - feiertage-china.json (Chinesische Feiertage 2027)
 * - szenario-defaults.json (Standard-Parameter für Szenarien)
 * 
 * ZWECK: Schnelles Erkennen von fehlenden oder falschen Daten
 * QUELLE: Alle Daten werden dynamisch aus JSON-Dateien geladen
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database, Package, Calendar, TrendingUp, Factory, Globe, AlertTriangle, FileJson } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { CollapsibleInfo } from '@/components/ui/collapsible-info'

// Import aller JSON-Dateien
import stammdatenData from '@/data/stammdaten.json'
import saisonalitaetData from '@/data/saisonalitaet.json'
import stuecklisteData from '@/data/stueckliste.json'
import lieferantChinaData from '@/data/lieferant-china.json'
import feiertageChina from '@/data/feiertage-china.json'
import feiertageDeutschland from '@/data/feiertage-deutschland.json'
import szenarioDefaults from '@/data/szenario-defaults.json'

export default function StammdatenPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="h-8 w-8" />
          Stammdaten Übersicht
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualisierung aller JSON-Stammdaten (Single Source of Truth)
        </p>
      </div>

      {/* Hinweis */}
      <CollapsibleInfo
        title="Über diese Seite"
        variant="info"
        icon={<FileJson className="h-5 w-5" />}
        defaultOpen={false}
      >
        <div className="text-sm space-y-2">
          <p>
            Diese Seite zeigt alle Stammdaten aus den JSON-Dateien im <code className="bg-slate-100 px-2 py-0.5 rounded">/src/data</code> Verzeichnis.
          </p>
          <p>
            <strong>Zweck:</strong> Schnelles Erkennen von fehlenden oder falschen Daten. Alle Daten werden dynamisch aus den JSON-Dateien geladen.
          </p>
          <p>
            <strong>SSOT (Single Source of Truth):</strong> Alle Berechnungen im System verwenden diese JSON-Dateien als Datenquelle.
          </p>
        </div>
      </CollapsibleInfo>

      {/* 1. Stammdaten.json */}
      <StammdatenCard />

      {/* 2. MTB-Varianten */}
      <MTBVariantenCard />

      {/* 3. Saisonalität */}
      <SaisonalitaetCard />

      {/* 4. Stückliste (Bike → Sattel Mapping) */}
      <StuecklisteCard />

      {/* 5. Lieferant China */}
      <LieferantChinaCard />

      {/* 6. Feiertage China */}
      <FeiertageCard />

      {/* 7. Szenario Defaults */}
      <SzenarioDefaultsCard />
    </div>
  )
}

/**
 * 1. Stammdaten Übersicht (Projekt-Info)
 */
function StammdatenCard() {
  const data = stammdatenData as any

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Projekt-Stammdaten
        </CardTitle>
        <CardDescription>stammdaten.json - Projekt-Übersicht</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Projekt-Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="Projekt" value={data.projekt.name} />
          <InfoItem label="Kunde" value={data.projekt.kunde} />
          <InfoItem label="Standort" value={data.projekt.standort} />
          <InfoItem label="Planungsjahr" value={data.projekt.planungsjahr} />
        </div>

        {/* Jahresproduktion */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Jahresproduktion</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoItem 
              label="Gesamtvolumen" 
              value={formatNumber(data.jahresproduktion.gesamt, 0) + ' Bikes'} 
              highlight={true}
            />
            <InfoItem label="Peak-Monat" value={data.saisonalitaet.peakMonth} />
            <InfoItem 
              label="Peak-Anteil" 
              value={Math.round((data.saisonalitaet.monatlicheVerteilung.april) * 100) + '%'} 
            />
          </div>
        </div>

        {/* Produktion Kapazität */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Produktionskapazität</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoItem label="Standort" value={data.produktion.standort} />
            <InfoItem label="Kapazität" value={data.produktion.kapazitaet.proStunde + ' Bikes/h'} />
            <InfoItem label="Stunden/Schicht" value={data.produktion.schichten.stundenProSchicht + 'h'} />
          </div>
        </div>

        {/* Zulieferer Kurzinfo */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Zulieferer</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem label="Name" value={data.zulieferer.china.name} />
            <InfoItem label="Standort" value={data.zulieferer.china.standort} />
            <InfoItem label="Vorlaufzeit" value={data.zulieferer.china.gesamtDurchlaufzeit.minimum + ' Tage'} highlight={true} />
            <InfoItem label="Losgröße" value={data.zulieferer.china.losgroessen.saettel + ' Stück'} />
          </div>
        </div>

        {/* Code-Ermäßigung Hinweis */}
        <div className="border-t pt-4">
          <CollapsibleInfo
            title="Code-Ermäßigungen (Vereinfachungen)"
            variant="info"
            icon={<AlertTriangle className="h-4 w-4" />}
            defaultOpen={false}
          >
            <div className="text-sm space-y-1">
              {data.hinweise.vereinfachungen.map((v: string, idx: number) => (
                <div key={idx}>• {v}</div>
              ))}
            </div>
          </CollapsibleInfo>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 2. MTB-Varianten Details
 */
function MTBVariantenCard() {
  const data = stammdatenData as any
  const varianten = data.varianten

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          MTB-Varianten ({varianten.length})
        </CardTitle>
        <CardDescription>stammdaten.json - Alle Mountain Bike Varianten</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {varianten.map((v: any) => (
            <div key={v.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-lg">{v.name}</h4>
                    <Badge variant="outline">{v.kategorie}</Badge>
                    <Badge variant="secondary">{Math.round(v.anteilPrognose * 100)}%</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{v.beschreibung}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span><strong>Gewicht:</strong> {v.gewicht} kg</span>
                    <span><strong>Jahresproduktion:</strong> {formatNumber(data.jahresproduktion.proVariante[v.id], 0)} Bikes</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {v.farben.map((f: string) => (
                      <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 3. Saisonalität
 */
function SaisonalitaetCard() {
  const data = saisonalitaetData as any
  const monatlich = data.saisonalitaetMonatlich

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Saisonale Verteilung
        </CardTitle>
        <CardDescription>saisonalitaet.json - Monatliche Produktionsanteile</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {monatlich.map((m: any) => {
            const isPeak = m.anteil >= 14
            const isLow = m.anteil <= 4
            
            return (
              <div 
                key={m.monat} 
                className={`border rounded-lg p-3 ${
                  isPeak ? 'bg-orange-50 border-orange-300' : 
                  isLow ? 'bg-slate-50 border-slate-300' : 
                  'bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{m.name}</span>
                  <Badge variant={isPeak ? 'destructive' : isLow ? 'secondary' : 'outline'}>
                    {m.anteil}%
                  </Badge>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      isPeak ? 'bg-orange-500' : 
                      isLow ? 'bg-slate-400' : 
                      'bg-blue-500'
                    }`}
                    style={{ width: `${(m.anteil / 16) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.beschreibung}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-4 p-3 bg-slate-100 rounded">
          <p className="text-sm">
            <strong>Summe:</strong> {data.summeCheck}% • <strong>Hinweis:</strong> {data.hinweis}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 4. Stückliste (Bike → Sattel)
 */
function StuecklisteCard() {
  const data = stuecklisteData as any
  const stuecklisten = data.stuecklisten

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Stückliste (Bike → Sattel Mapping)
        </CardTitle>
        <CardDescription>stueckliste.json - Ermäßigung: Nur 4 Sattel-Varianten</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Hinweis:</strong> {data.hinweis}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(stuecklisten).map(([key, value]: [string, any]) => (
            <div key={key} className="border rounded-lg p-3">
              <div className="font-medium mb-2">{key}</div>
              {Object.entries(value.komponenten).map(([compKey, comp]: [string, any]) => (
                <div key={compKey} className="flex items-center justify-between text-sm bg-slate-50 rounded p-2">
                  <div>
                    <Badge variant="outline" className="mr-2">{compKey}</Badge>
                    <span>{comp.name}</span>
                  </div>
                  <span className="text-muted-foreground">{comp.menge} {comp.einheit}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 5. Lieferant China
 */
function LieferantChinaCard() {
  const data = lieferantChinaData as any
  const lieferant = data.lieferant

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="h-5 w-5" />
          Lieferant China
        </CardTitle>
        <CardDescription>lieferant-china.json - Einziger Lieferant (Code-Ermäßigung)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lieferant Basisinfo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="Name" value={lieferant.name} />
          <InfoItem label="Land" value={lieferant.land} />
          <InfoItem label="Losgröße" value={lieferant.losgroesse + ' Stück'} highlight={true} />
          <InfoItem label="Lieferintervall" value={lieferant.lieferintervall + ' Tage'} />
        </div>

        {/* Vorlaufzeiten */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Vorlaufzeiten</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem label="Produktion" value={lieferant.vorlaufzeitArbeitstage + ' AT'} />
            <InfoItem label="LKW China" value={lieferant.lkwTransportChinaArbeitstage + ' AT'} />
            <InfoItem label="Seefracht" value={lieferant.vorlaufzeitKalendertage + ' KT'} />
            <InfoItem label="LKW Deutschland" value={lieferant.lkwTransportDeutschlandArbeitstage + ' AT'} />
          </div>
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
            <p className="text-sm font-medium">
              <strong>Gesamt-Vorlaufzeit:</strong> {lieferant.gesamtVorlaufzeitTage} Tage ({Math.ceil(lieferant.gesamtVorlaufzeitTage / 7)} Wochen)
            </p>
          </div>
        </div>

        {/* Transport-Sequenz */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Transport-Sequenz</h4>
          <div className="space-y-2">
            {lieferant.transportSequenz.map((schritt: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded">
                <Badge>{schritt.schritt}</Badge>
                <div className="flex-1">
                  <div className="font-medium">{schritt.typ}</div>
                  <div className="text-sm text-muted-foreground">
                    {schritt.von} → {schritt.nach}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{schritt.dauer} {schritt.einheit}</div>
                  <div className="text-xs text-muted-foreground">{schritt.beschreibung}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Komponenten */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Gelieferte Komponenten ({data.komponenten.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.komponenten.map((kompId: string) => {
              const details = data.komponentenDetails[kompId]
              return (
                <div key={kompId} className="border rounded p-3">
                  <Badge variant="outline" className="mb-2">{details.id}</Badge>
                  <div className="font-medium text-sm">{details.name}</div>
                  <div className="text-xs text-muted-foreground">{details.beschreibung}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Besonderheiten */}
        <div className="border-t pt-4">
          <CollapsibleInfo
            title="Besonderheiten & Details"
            variant="info"
            defaultOpen={false}
          >
            <ul className="space-y-1 text-sm">
              {lieferant.besonderheiten.map((b: string, idx: number) => (
                <li key={idx}>• {b}</li>
              ))}
            </ul>
          </CollapsibleInfo>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 6. Feiertage China
 */
/**
 * 6. Feiertage (Deutschland + China)
 */
function FeiertageCard() {
  const chinaData = feiertageChina as any
  const deutschlandData = feiertageDeutschland as any
  
  // Deutschland
  const feiertage2026DE = deutschlandData.feiertage2026
  const feiertage2027DE = deutschlandData.feiertage2027
  
  // China
  const feiertage2026CN = chinaData.feiertage2026
  const feiertage2027CN = chinaData.feiertage2027
  
  const springFestival2026 = feiertage2026CN.filter((f: any) => f.name.includes('Spring Festival'))
  const springFestival2027 = feiertage2027CN.filter((f: any) => f.name.includes('Spring Festival'))

  return (
    <div className="space-y-6">
      {/* Deutschland Feiertage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Deutsche Feiertage (NRW)
          </CardTitle>
          <CardDescription>feiertage-deutschland.json - Gesetzliche Feiertage für NRW (11 Tage)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wichtiger Hinweis */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-semibold text-blue-900 mb-2">ℹ️ {deutschlandData.wichtig}</h4>
            <p className="text-sm text-blue-800">{deutschlandData.hinweis}</p>
          </div>

          {/* Feiertage 2026 */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Jahr 2026 ({feiertage2026DE.length} Feiertage)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {feiertage2026DE.map((f: any) => (
                <div key={f.datum} className="border rounded p-2 bg-blue-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(f.datum).toLocaleDateString('de-DE')}</div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-blue-100">{f.typ}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feiertage 2027 */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Jahr 2027 ({feiertage2027DE.length} Feiertage)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {feiertage2027DE.map((f: any) => (
                <div key={f.datum} className="border rounded p-2 bg-blue-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(f.datum).toLocaleDateString('de-DE')}</div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-blue-100">{f.typ}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* China Feiertage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Chinesische Feiertage
          </CardTitle>
          <CardDescription>feiertage-china.json - Relevant für Produktion und Transport</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wichtiger Hinweis */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded">
            <h4 className="font-semibold text-orange-900 mb-2">⚠️ Wichtig: Spring Festival</h4>
            <p className="text-sm text-orange-800 mb-1">• 2026: {chinaData.wichtig2026}</p>
            <p className="text-sm text-orange-800">• 2027: {chinaData.wichtig2027}</p>
            <p className="text-sm text-orange-800 mt-2">{chinaData.hinweis}</p>
          </div>

          {/* Spring Festival 2026 hervorheben */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Spring Festival 2026 ({springFestival2026.length} Tage)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {springFestival2026.map((f: any) => (
                <div key={f.datum} className="border border-orange-300 bg-orange-50 rounded p-2">
                  <div className="text-sm font-medium">{new Date(f.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
                  <div className="text-xs text-orange-700 line-clamp-2">{f.name.replace('Spring Festival ', '')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Spring Festival 2027 hervorheben */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Spring Festival 2027 ({springFestival2027.length} Tage)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {springFestival2027.map((f: any) => (
                <div key={f.datum} className="border border-orange-300 bg-orange-50 rounded p-2">
                  <div className="text-sm font-medium">{new Date(f.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
                  <div className="text-xs text-orange-700 line-clamp-2">{f.name.replace('Spring Festival ', '')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alle Feiertage 2026 */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Alle Feiertage 2026 ({feiertage2026CN.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {feiertage2026CN.map((f: any) => (
                <div 
                  key={f.datum} 
                  className={`border rounded p-2 ${
                    f.name.includes('Spring Festival') 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-medium text-sm line-clamp-1">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(f.datum).toLocaleDateString('de-DE')}</div>
                    </div>
                    <Badge variant="outline" className="text-xs ml-2">{f.typ}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alle Feiertage 2027 */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Alle Feiertage 2027 ({feiertage2027CN.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {feiertage2027CN.map((f: any) => (
                <div 
                  key={f.datum} 
                  className={`border rounded p-2 ${
                    f.name.includes('Spring Festival') 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-medium text-sm line-clamp-1">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(f.datum).toLocaleDateString('de-DE')}</div>
                    </div>
                    <Badge variant="outline" className="text-xs ml-2">{f.typ}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 7. Szenario Defaults
 */
function SzenarioDefaultsCard() {
  const data = szenarioDefaults as any
  const szenarien = Object.entries(data.szenarien)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Szenario Standard-Parameter
        </CardTitle>
        <CardDescription>szenario-defaults.json - Voreinstellungen für operative Szenarien</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p><strong>Version:</strong> {data.version}</p>
          <p><strong>Beschreibung:</strong> {data.description}</p>
          <p className="mt-2 text-muted-foreground">Quelle: {data.meta.quelle}</p>
        </div>

        <div className="space-y-4">
          {szenarien.map(([key, szenario]: [string, any]) => (
            <div key={key} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-lg">{szenario.name}</h4>
                  <p className="text-sm text-muted-foreground">{szenario.beschreibung}</p>
                </div>
                <Badge variant="outline">{szenario.id}</Badge>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Standard-Parameter:</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(szenario.standardParameter).map(([paramKey, paramValue]: [string, any]) => {
                    const def = szenario.parameterDefinitionen[paramKey]
                    return (
                      <div key={paramKey} className="bg-slate-50 rounded p-2">
                        <div className="text-xs text-muted-foreground">{def?.label || paramKey}</div>
                        <div className="font-medium">{paramValue} {def?.einheit || ''}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {szenario.beispiel && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <strong>Beispiel:</strong> {szenario.beispiel}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Hilfsfunktion: Info-Item Darstellung
 */
function InfoItem({ 
  label, 
  value, 
  highlight = false 
}: { 
  label: string
  value: string | number
  highlight?: boolean 
}) {
  return (
    <div className={`${highlight ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50'} rounded p-3`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`font-medium ${highlight ? 'text-orange-900' : ''}`}>{value}</div>
    </div>
  )
}
