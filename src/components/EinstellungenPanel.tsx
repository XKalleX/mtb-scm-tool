'use client'

/**
 * ========================================
 * EINSTELLUNGEN KOMPONENTE
 * ========================================
 * 
 * Benutzerfreundliche UI zum Bearbeiten aller Konfigurationswerte:
 * - Jahresproduktion
 * - Saisonalität (monatliche Verteilung)
 * - MTB-Varianten und deren Anteile
 * - Feiertage (hinzufügen/bearbeiten/löschen)
 * - Lieferant-Parameter
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Calendar,
  Truck,
  Factory,
  BarChart,
  Package
} from 'lucide-react'
import { useKonfiguration, FeiertagConfig, STANDARD_KONFIGURATION } from '@/contexts/KonfigurationContext'
import { formatNumber } from '@/lib/utils'

/**
 * Hauptkomponente für Einstellungen
 */
export function EinstellungenPanel() {
  const { 
    konfiguration, 
    isInitialized,
    setJahresproduktion,
    setHeuteDatum,
    updateSaisonalitaet,
    updateVariante,
    addFeiertag,
    updateFeiertag,
    removeFeiertag,
    updateLieferant,
    updateProduktion,
    zuruecksetzenAufStandard,
    getJahresproduktionProVariante,
    getArbeitstageProJahr
  } = useKonfiguration()

  const [activeTab, setActiveTab] = useState('grunddaten')
  const [showConfirmReset, setShowConfirmReset] = useState(false)

  if (!isInitialized) {
    return <div className="text-center py-8">Lade Konfiguration...</div>
  }

  const handleReset = () => {
    // Reset UI state BEFORE calling context update to avoid race condition
    // When zuruecksetzenAufStandard() updates the context, it causes this component
    // to re-render, which could interfere with the state update if done afterwards
    setShowConfirmReset(false)
    zuruecksetzenAufStandard()
  }

  const arbeitstage = getArbeitstageProJahr()
  const produktionProVariante = getJahresproduktionProVariante()
  
  // Prüfe ob Saisonalität Summe = 100%
  const saisonalitaetSumme = konfiguration.saisonalitaet.reduce((sum, s) => sum + s.anteil, 0)
  const saisonalitaetValid = Math.abs(saisonalitaetSumme - 100) < 0.1

  // Prüfe ob Varianten-Anteile Summe = 100%
  const variantenSumme = konfiguration.varianten.reduce((sum, v) => sum + v.anteilPrognose * 100, 0)
  const variantenValid = Math.abs(variantenSumme - 100) < 0.1

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Einstellungen & Konfiguration</CardTitle>
          </div>
          <div className="flex gap-2">
            {showConfirmReset ? (
              <>
                <Button variant="destructive" size="sm" onClick={handleReset}>
                  <Check className="h-4 w-4 mr-1" />
                  Bestätigen
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowConfirmReset(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Abbrechen
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowConfirmReset(true)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Auf Standard zurücksetzen
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Passe alle relevanten Kennzahlen an. Änderungen werden automatisch gespeichert und wirken global.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="grunddaten" className="flex items-center gap-1">
              <Factory className="h-4 w-4" />
              Grunddaten
            </TabsTrigger>
            <TabsTrigger value="saisonalitaet" className="flex items-center gap-1">
              <BarChart className="h-4 w-4" />
              Saisonalität
            </TabsTrigger>
            <TabsTrigger value="varianten" className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              Varianten
            </TabsTrigger>
            <TabsTrigger value="feiertage" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Feiertage
            </TabsTrigger>
            <TabsTrigger value="lieferant" className="flex items-center gap-1">
              <Truck className="h-4 w-4" />
              Lieferant
            </TabsTrigger>
          </TabsList>

          {/* GRUNDDATEN TAB */}
          <TabsContent value="grunddaten" className="space-y-4 mt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jahresproduktion">Jahresproduktion (Bikes)</Label>
                  <Input
                    id="jahresproduktion"
                    type="number"
                    value={konfiguration.jahresproduktion ?? 0}
                    onChange={(e) => setJahresproduktion(parseInt(e.target.value) || 0)}
                    min={0}
                    step={1000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard: {formatNumber(STANDARD_KONFIGURATION.jahresproduktion, 0)} Bikes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heuteDatum">'Heute'-Datum (Frozen Zone)</Label>
                  <Input
                    id="heuteDatum"
                    type="date"
                    value={konfiguration.heuteDatum ?? '2027-04-15'}
                    onChange={(e) => setHeuteDatum(e.target.value)}
                    min="2027-01-01"
                    max="2027-12-31"
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard: {STANDARD_KONFIGURATION.heuteDatum} - Trennt Vergangenheit (Frozen Zone) von Zukunft (Planning Zone)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Produktionskapazität (Bikes/Stunde)</Label>
                  <Input
                    type="number"
                    value={konfiguration.produktion.kapazitaetProStunde ?? 0}
                    onChange={(e) => updateProduktion({ kapazitaetProStunde: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stunden pro Schicht</Label>
                  <Input
                    type="number"
                    value={konfiguration.produktion.stundenProSchicht ?? 0}
                    onChange={(e) => updateProduktion({ stundenProSchicht: parseInt(e.target.value) || 0 })}
                    min={1}
                    max={24}
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">Berechnete Werte:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Arbeitstage (ohne Wochenenden/Feiertage):</span>
                    <span className="font-medium">{arbeitstage} Tage</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Durchschnitt pro Arbeitstag:</span>
                    <span className="font-medium">{formatNumber(konfiguration.jahresproduktion / arbeitstage, 1)} Bikes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kapazität pro Schicht:</span>
                    <span className="font-medium">
                      {formatNumber(konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht, 0)} Bikes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Benötigte Schichten (Durchschnitt):</span>
                    <span className="font-medium">
                      {((konfiguration.jahresproduktion / arbeitstage) / 
                        (konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* SAISONALITÄT TAB */}
          <TabsContent value="saisonalitaet" className="space-y-4 mt-4">
            <div className={`p-3 rounded-lg flex items-center gap-2 ${saisonalitaetValid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {saisonalitaetValid ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              <span className="font-medium">Summe der Anteile: {saisonalitaetSumme.toFixed(1)}%</span>
              {!saisonalitaetValid && <span className="ml-2">(muss 100% ergeben!)</span>}
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Monat</TableHead>
                  <TableHead>Anteil (%)</TableHead>
                  <TableHead className="text-right">Produktion (Bikes)</TableHead>
                  <TableHead className="w-[200px]">Visualisierung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {konfiguration.saisonalitaet.map((s) => {
                  const menge = Math.round(konfiguration.jahresproduktion * (s.anteil / 100))
                  return (
                    <TableRow key={s.monat}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={s.anteil}
                          onChange={(e) => updateSaisonalitaet(s.monat, parseFloat(e.target.value) || 0)}
                          min={0}
                          max={100}
                          step={0.5}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(menge, 0)}</TableCell>
                      <TableCell>
                        <div className="w-full bg-slate-200 rounded-full h-4">
                          <div 
                            className={`h-4 rounded-full ${s.monat === 4 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(s.anteil * 5, 100)}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TabsContent>

          {/* VARIANTEN TAB */}
          <TabsContent value="varianten" className="space-y-4 mt-4">
            <div className={`p-3 rounded-lg flex items-center gap-2 ${variantenValid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {variantenValid ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              <span className="font-medium">Summe der Anteile: {variantenSumme.toFixed(1)}%</span>
              {!variantenValid && <span className="ml-2">(muss 100% ergeben!)</span>}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variante</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Anteil (%)</TableHead>
                  <TableHead className="text-right">Jahresproduktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {konfiguration.varianten.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>{v.kategorie}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={(v.anteilPrognose * 100).toFixed(1)}
                        onChange={(e) => updateVariante(v.id, { anteilPrognose: (parseFloat(e.target.value) || 0) / 100 })}
                        min={0}
                        max={100}
                        step={0.5}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(produktionProVariante[v.id], 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* FEIERTAGE TAB */}
          <TabsContent value="feiertage" className="space-y-4 mt-4">
            <FeiertagEditor />
          </TabsContent>

          {/* LIEFERANT TAB */}
          <TabsContent value="lieferant" className="space-y-4 mt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Lieferant Name</Label>
                  <Input
                    value={konfiguration.lieferant.name ?? ''}
                    onChange={(e) => updateLieferant({ name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vorlaufzeit Arbeitstage (Produktion)</Label>
                  <Input
                    type="number"
                    value={konfiguration.lieferant.vorlaufzeitArbeitstage ?? 0}
                    onChange={(e) => updateLieferant({ vorlaufzeitArbeitstage: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">Standard: {STANDARD_KONFIGURATION.lieferant.vorlaufzeitArbeitstage} Tage</p>
                </div>

                <div className="space-y-2">
                  <Label>Vorlaufzeit Kalendertage (Seefracht Shanghai → Hamburg)</Label>
                  <Input
                    type="number"
                    value={konfiguration.lieferant.vorlaufzeitKalendertage ?? 0}
                    onChange={(e) => updateLieferant({ vorlaufzeitKalendertage: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">Standard: {STANDARD_KONFIGURATION.lieferant.vorlaufzeitKalendertage} KT (24/7 Seefracht)</p>
                </div>

                <div className="space-y-2">
                  <Label>LKW-Transport China → Hafen (Arbeitstage)</Label>
                  <Input
                    type="number"
                    value={konfiguration.lieferant.lkwTransportChinaArbeitstage ?? 0}
                    onChange={(e) => updateLieferant({ lkwTransportChinaArbeitstage: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">Standard: {STANDARD_KONFIGURATION.lieferant.lkwTransportChinaArbeitstage} AT (Mo-Fr)</p>
                </div>

                <div className="space-y-2">
                  <Label>LKW-Transport Hamburg → Werk (Arbeitstage)</Label>
                  <Input
                    type="number"
                    value={konfiguration.lieferant.lkwTransportDeutschlandArbeitstage ?? 0}
                    onChange={(e) => updateLieferant({ lkwTransportDeutschlandArbeitstage: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">Standard: {STANDARD_KONFIGURATION.lieferant.lkwTransportDeutschlandArbeitstage} AT (Mo-Fr)</p>
                </div>

                <div className="space-y-2">
                  <Label>Gesamte Vorlaufzeit (Kalendertage)</Label>
                  <Input
                    type="number"
                    value={konfiguration.lieferant.gesamtVorlaufzeitTage ?? 0}
                    onChange={(e) => updateLieferant({ gesamtVorlaufzeitTage: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">Standard: {STANDARD_KONFIGURATION.lieferant.gesamtVorlaufzeitTage} Tage ({Math.ceil(STANDARD_KONFIGURATION.lieferant.gesamtVorlaufzeitTage / 7)} Wochen)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Losgröße (Mindestbestellung)</Label>
                  <Input
                    type="number"
                    value={konfiguration.lieferant.losgroesse ?? 0}
                    onChange={(e) => updateLieferant({ losgroesse: parseInt(e.target.value) || 0 })}
                    min={1}
                    step={100}
                  />
                  <p className="text-xs text-muted-foreground">Standard: {STANDARD_KONFIGURATION.lieferant.losgroesse} Stück</p>
                </div>

                <div className="space-y-2">
                  <Label>Lieferintervall (Tage)</Label>
                  <Input
                    type="number"
                    value={konfiguration.lieferant.lieferintervall ?? 0}
                    onChange={(e) => updateLieferant({ lieferintervall: parseInt(e.target.value) || 0 })}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kapazität (Stück/Tag)</Label>
                  <Input
                    type="number"
                    value={konfiguration.lieferant.kapazitaet ?? 0}
                    onChange={(e) => updateLieferant({ kapazitaet: parseInt(e.target.value) || 0 })}
                    min={0}
                    step={1000}
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-blue-900 mb-2">Transport-Sequenz (Reihenfolge wichtig!):</h4>
              <ol className="list-decimal list-inside text-blue-800 text-sm space-y-1">
                <li>Produktion: {konfiguration.lieferant.vorlaufzeitArbeitstage} AT (Mo-Fr ohne Feiertage)</li>
                <li>LKW China → Hafen: {konfiguration.lieferant.lkwTransportChinaArbeitstage} AT (Mo-Fr)</li>
                <li>Seefracht: {konfiguration.lieferant.vorlaufzeitKalendertage} KT (24/7 unterwegs)</li>
                <li>LKW Hamburg → Werk: {konfiguration.lieferant.lkwTransportDeutschlandArbeitstage} AT (Mo-Fr)</li>
              </ol>
              <p className="text-blue-900 font-bold mt-3">
                Gesamt: {konfiguration.lieferant.gesamtVorlaufzeitTage} Tage ({Math.ceil(konfiguration.lieferant.gesamtVorlaufzeitTage / 7)} Wochen)
              </p>
              <p className="text-xs text-blue-600 mt-2 italic">
                Hinweis: Reihenfolge ist wichtig für Feiertagsberechnung. AT = Arbeitstage (Mo-Fr), KT = Kalendertage (24/7)
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

/**
 * Sub-Komponente für Feiertage-Verwaltung
 */
function FeiertagEditor() {
  const { konfiguration, addFeiertag, updateFeiertag, removeFeiertag } = useKonfiguration()
  
  const [neuerFeiertag, setNeuerFeiertag] = useState<Partial<FeiertagConfig>>({
    datum: '',
    name: '',
    typ: 'gesetzlich',
    land: 'Deutschland'
  })
  const [editingDatum, setEditingDatum] = useState<string | null>(null)
  const [filterLand, setFilterLand] = useState<'alle' | 'Deutschland' | 'China'>('alle')

  const handleAddFeiertag = () => {
    if (neuerFeiertag.datum && neuerFeiertag.name) {
      addFeiertag(neuerFeiertag as FeiertagConfig)
      setNeuerFeiertag({ datum: '', name: '', typ: 'gesetzlich', land: 'Deutschland' })
    }
  }

  const gefilterteFeiertage = filterLand === 'alle' 
    ? konfiguration.feiertage 
    : konfiguration.feiertage.filter(f => f.land === filterLand)

  const deutscheFeiertage = konfiguration.feiertage.filter(f => f.land === 'Deutschland').length
  const chinesischeFeiertage = konfiguration.feiertage.filter(f => f.land === 'China').length

  return (
    <div className="space-y-4">
      {/* Statistik */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{konfiguration.feiertage.length}</div>
          <div className="text-sm text-muted-foreground">Feiertage gesamt</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{deutscheFeiertage}</div>
          <div className="text-sm text-muted-foreground">Deutschland (NRW)</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{chinesischeFeiertage}</div>
          <div className="text-sm text-muted-foreground">China (inkl. Spring Festival)</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button 
          variant={filterLand === 'alle' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilterLand('alle')}
        >
          Alle
        </Button>
        <Button 
          variant={filterLand === 'Deutschland' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilterLand('Deutschland')}
        >
          🇩🇪 Deutschland
        </Button>
        <Button 
          variant={filterLand === 'China' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilterLand('China')}
        >
          🇨🇳 China
        </Button>
      </div>

      {/* Neuer Feiertag Form */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Neuen Feiertag hinzufügen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Label>Datum</Label>
              <Input
                type="date"
                value={neuerFeiertag.datum || ''}
                onChange={(e) => setNeuerFeiertag(prev => ({ ...prev, datum: e.target.value }))}
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                placeholder="z.B. Ostermontag"
                value={neuerFeiertag.name || ''}
                onChange={(e) => setNeuerFeiertag(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Typ</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={neuerFeiertag.typ}
                onChange={(e) => setNeuerFeiertag(prev => ({ ...prev, typ: e.target.value as FeiertagConfig['typ'] }))}
              >
                <option value="gesetzlich">Gesetzlich</option>
                <option value="regional">Regional</option>
                <option value="betrieblich">Betrieblich</option>
                <option value="Festival">Festival</option>
              </select>
            </div>
            <div>
              <Label>Land</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={neuerFeiertag.land}
                onChange={(e) => setNeuerFeiertag(prev => ({ ...prev, land: e.target.value as FeiertagConfig['land'] }))}
              >
                <option value="Deutschland">Deutschland</option>
                <option value="China">China</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddFeiertag} disabled={!neuerFeiertag.datum || !neuerFeiertag.name}>
                <Plus className="h-4 w-4 mr-1" />
                Hinzufügen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feiertage Tabelle */}
      <div className="max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Land</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gefilterteFeiertage.map((f, index) => (
              <TableRow key={`${f.datum}-${f.land}-${index}`}>
                <TableCell>
                  {editingDatum === f.datum ? (
                    <Input
                      type="date"
                      defaultValue={f.datum}
                      onBlur={(e) => {
                        if (e.target.value !== f.datum) {
                          removeFeiertag(f.datum)
                          addFeiertag({ ...f, datum: e.target.value })
                        }
                        setEditingDatum(null)
                      }}
                    />
                  ) : (
                    new Date(f.datum).toLocaleDateString('de-DE')
                  )}
                </TableCell>
                <TableCell>
                  {editingDatum === f.datum ? (
                    <Input
                      defaultValue={f.name}
                      onBlur={(e) => updateFeiertag(f.datum, { name: e.target.value })}
                    />
                  ) : (
                    f.name
                  )}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    f.typ === 'gesetzlich' ? 'bg-blue-100 text-blue-800' :
                    f.typ === 'Festival' ? 'bg-red-100 text-red-800' :
                    f.typ === 'regional' ? 'bg-purple-100 text-purple-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {f.typ}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={f.land === 'Deutschland' ? 'text-blue-600' : 'text-red-600'}>
                    {f.land === 'Deutschland' ? '🇩🇪' : '🇨🇳'} {f.land}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingDatum(editingDatum === f.datum ? null : f.datum)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeFeiertag(f.datum)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
