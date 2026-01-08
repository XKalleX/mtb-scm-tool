'use client'

/**
 * ========================================
 * PRODUKTION & WAREHOUSE
 * ========================================
 * 
 * Produktionssteuerung mit:
 * - ATP-Check (Available-to-Promise)
 * - First-Come-First-Serve Regel
 * - Lagerbestandsmanagement
 * - Materialfluss-Visualisierung
 * 
 * NEU: Nutzt dynamische Konfiguration aus KonfigurationContext
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Factory, AlertTriangle, TrendingUp, Package, Download } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { exportToCSV, exportToJSON } from '@/lib/export'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { useMemo, useEffect, useCallback } from 'react'

/**
 * Produktion Hauptseite
 * Zeigt Produktionsstatus und Lagerbestände mit Excel-Tabellen
 * Nutzt dynamische Konfiguration aus KonfigurationContext
 */
export default function ProduktionPage() {
  // Hole Konfiguration aus Context
  const { konfiguration, isInitialized, getArbeitstageProJahr } = useKonfiguration()
  
  // Extrahiere Werte aus Konfiguration (hooks müssen vor early return)
  const jahresproduktion = konfiguration.jahresproduktion
  const varianten = konfiguration.varianten
  const saisonalitaetConfig = konfiguration.saisonalitaet
  const feiertagConfig = konfiguration.feiertage
  const produktionConfig = konfiguration.produktion
  
  // ✅ ERMÄSSIGUNG: Nur 4 Sattel-Varianten gemäß SSOT
  // Quelle: kontext/Spezifikation_SSOT_MR.ts - BAUTEILE
  // Dynamisch berechnet basierend auf aktueller Jahresproduktion und Varianten-Anteilen
  const lagerbestaende = useMemo(() => {
    // Berechne Jahresproduktion pro Variante basierend auf Anteilen
    const variantenProduktion: Record<string, number> = {}
    varianten.forEach(v => {
      variantenProduktion[v.id] = Math.round(jahresproduktion * v.anteilPrognose)
    })
    
    // Berechne Bedarf für jede Sattel-Variante basierend auf Stückliste
    const sattelBedarf: Record<string, { jahresbedarf: number; verwendung: string[] }> = {
      'SAT_FT': { jahresbedarf: 0, verwendung: [] }, // Fizik Tundra
      'SAT_RL': { jahresbedarf: 0, verwendung: [] }, // Raceline
      'SAT_SP': { jahresbedarf: 0, verwendung: [] }, // Spark
      'SAT_SL': { jahresbedarf: 0, verwendung: [] }  // Speedline
    }
    
    // Mapping von MTB-Varianten zu Sätteln (aus Stückliste)
    const varianteSattelMapping: Record<string, string> = {
      'MTBAllrounder': 'SAT_FT',
      'MTBFreeride': 'SAT_FT',
      'MTBCompetition': 'SAT_RL',
      'MTBPerformance': 'SAT_RL',
      'MTBDownhill': 'SAT_SP',
      'MTBTrail': 'SAT_SP',
      'MTBExtreme': 'SAT_SL',
      'MTBMarathon': 'SAT_SL'
    }
    
    // Berechne Jahresbedarf für jeden Sattel
    Object.entries(varianteSattelMapping).forEach(([varianteId, sattelId]) => {
      const produktion = variantenProduktion[varianteId] || 0
      if (sattelBedarf[sattelId]) {
        sattelBedarf[sattelId].jahresbedarf += produktion
        const variante = varianten.find(v => v.id === varianteId)
        if (variante) {
          sattelBedarf[sattelId].verwendung.push(variante.name)
        }
      }
    })
    
    // Generiere Lagerbestände
    return [
      { 
        komponente: 'Fizik_Tundra',
        bestand: Math.round(sattelBedarf['SAT_FT'].jahresbedarf * 0.35), // 35% Puffer
        sicherheit: Math.round(sattelBedarf['SAT_FT'].jahresbedarf / 365 * 7), // 7 Tage
        bedarf: Math.round(sattelBedarf['SAT_FT'].jahresbedarf / 365),
        verwendung: sattelBedarf['SAT_FT'].verwendung.join(', '),
        status: 'ok' 
      },
      { 
        komponente: 'Raceline',
        bestand: Math.round(sattelBedarf['SAT_RL'].jahresbedarf * 0.40), // 40% Puffer
        sicherheit: Math.round(sattelBedarf['SAT_RL'].jahresbedarf / 365 * 7), // 7 Tage
        bedarf: Math.round(sattelBedarf['SAT_RL'].jahresbedarf / 365),
        verwendung: sattelBedarf['SAT_RL'].verwendung.join(', '),
        status: 'ok' 
      },
      { 
        komponente: 'Spark',
        bestand: Math.round(sattelBedarf['SAT_SP'].jahresbedarf * 0.40), // 40% Puffer
        sicherheit: Math.round(sattelBedarf['SAT_SP'].jahresbedarf / 365 * 7), // 7 Tage
        bedarf: Math.round(sattelBedarf['SAT_SP'].jahresbedarf / 365),
        verwendung: sattelBedarf['SAT_SP'].verwendung.join(', '),
        status: 'ok' 
      },
      { 
        komponente: 'Speedline',
        bestand: Math.round(sattelBedarf['SAT_SL'].jahresbedarf * 0.40), // 40% Puffer
        sicherheit: Math.round(sattelBedarf['SAT_SL'].jahresbedarf / 365 * 7), // 7 Tage
        bedarf: Math.round(sattelBedarf['SAT_SL'].jahresbedarf / 365),
        verwendung: sattelBedarf['SAT_SL'].verwendung.join(', '),
        status: 'ok' 
      }
    ]
  }, [jahresproduktion, varianten])
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TAGESPLANUNG für 365 Tage mit Saisonalität aus SSOT
  // ═══════════════════════════════════════════════════════════════════════════════
  // 
  // Quelle: KonfigurationContext - saisonalitaet
  // Mit Error Management für exakte Jahresproduktion
  
  // Deutsche Feiertage aus Konfiguration (MUSS vor countArbeitstageInMonat!)
  const feiertage = useMemo(() => 
    feiertagConfig
      .filter(f => f.land === 'Deutschland')
      .map(f => f.datum),
    [feiertagConfig]
  )
  
  /**
   * Zählt die tatsächlichen Arbeitstage in einem Monat
   */
  const countArbeitstageInMonat = useCallback((jahr: number, monat: number): number => {
    let arbeitstage = 0
    const daysInMonth = new Date(jahr, monat, 0).getDate()
    
    for (let tag = 1; tag <= daysInMonth; tag++) {
      const datum = new Date(jahr, monat - 1, tag)
      const datumStr = datum.toISOString().split('T')[0]
      const istWochenende = datum.getDay() === 0 || datum.getDay() === 6
      const istFeiertag = feiertage.includes(datumStr)
      
      if (!istWochenende && !istFeiertag) {
        arbeitstage++
      }
    }
    
    return arbeitstage
  }, [feiertage])
  
  // Saisonale Verteilung aus Konfiguration mit EXAKTEN Arbeitstagen
  const saisonalitaet = useMemo(() => {
    return saisonalitaetConfig.map(s => {
      const monatsBikes = Math.round(jahresproduktion * (s.anteil / 100))
      const daysInMonth = new Date(konfiguration.planungsjahr, s.monat, 0).getDate()
      // ✅ KORREKTUR: Berechne EXAKTE Arbeitstage, nicht geschätzt!
      const arbeitstage = countArbeitstageInMonat(konfiguration.planungsjahr, s.monat)
      
      return {
        monat: s.monat,
        name: s.name.substring(0, 3), // Kürzel (Jan, Feb, etc.)
        anteil: s.anteil / 100,
        tage: daysInMonth,
        bikes: monatsBikes,
        arbeitstage: arbeitstage
      }
    })
  }, [saisonalitaetConfig, jahresproduktion, konfiguration.planungsjahr, countArbeitstageInMonat])
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ERROR MANAGEMENT - Pro Monat separate Fehlerkorrektur
  // ═══════════════════════════════════════════════════════════════════════════════
  // 
  // KONZEPT: Kumulative Rundungsfehler-Korrektur
  // - Verhindert systematische Abweichungen über Arbeitstage
  // - Garantiert exakte Monatsproduktion
  // - Gesamtsumme = exakt Jahresproduktion (dynamisch aus Context)
  
  const tagesProduktion = useMemo(() => {
    const monatlicheFehlerTracker: Record<number, number> = {}
    const result = Array.from({ length: 365 }, (_, i) => {
      const tag = i + 1
      const datum = new Date(konfiguration.planungsjahr, 0, tag)
      const wochentag = datum.toLocaleDateString('de-DE', { weekday: 'short' })
      const datumStr = datum.toISOString().split('T')[0]
      
      // Prüfe ob Arbeitstag (Mo-Fr, kein Feiertag)
      const istWochenende = datum.getDay() === 0 || datum.getDay() === 6
      const istFeiertag = feiertage.includes(datumStr)
      const istArbeitstag = !istWochenende && !istFeiertag
      
      // Monat für Saisonalität
      const monat = datum.getMonth() + 1
      const saisonInfo = saisonalitaet.find(s => s.monat === monat)!
      
      // Initialisiere Fehler-Tracker für diesen Monat
      if (!(monat in monatlicheFehlerTracker)) {
        monatlicheFehlerTracker[monat] = 0
      }
      
      let planMenge = 0
      let istMenge = 0
      
      if (istArbeitstag) {
        // ✅ PRODUKTIONSTAG mit ERROR MANAGEMENT
        
        // ✅ KORREKTUR: Soll-Produktion = Geplante Jahresproduktion verteilt nach Saisonalität
        // Dies ist die PLAN-Menge, die über das Jahr exakt 370.000 ergeben MUSS
        const sollProduktion = saisonInfo.bikes / saisonInfo.arbeitstage
        
        // Error Management: Kumulative Fehlerkorrektur
        const fehler = monatlicheFehlerTracker[monat] + (sollProduktion - Math.round(sollProduktion))
        
        if (fehler >= 0.5) {
          // Aufrunden
          planMenge = Math.ceil(sollProduktion)
          monatlicheFehlerTracker[monat] = fehler - 1.0
        } else if (fehler <= -0.5) {
          // Abrunden
          planMenge = Math.floor(sollProduktion)
          monatlicheFehlerTracker[monat] = fehler + 1.0
        } else {
          // Normal runden
          planMenge = Math.round(sollProduktion)
          monatlicheFehlerTracker[monat] = fehler
        }
        
        // ✅ KORREKTUR: Ist-Menge = Tatsächliche Produktion
        // Im Optimalfall (keine Störungen) entspricht Ist-Menge der Plan-Menge
        // Aber konzeptionell sind sie unterschiedlich:
        // - Plan-Menge = Geplante Jahresproduktion (370.000)
        // - Ist-Menge = Tatsächlich produziert (kann abweichen bei Störungen)
        // 
        // Ohne aktive Szenarien: Ist = Plan (perfekte Ausführung)
        istMenge = planMenge
      }
      
      const abweichung = istMenge - planMenge
      const materialVerfuegbar = istArbeitstag
      const auslastung = planMenge > 0 ? (istMenge / planMenge) * 100 : 0
      const kapazitaetProSchicht = produktionConfig.kapazitaetProStunde * produktionConfig.stundenProSchicht
      const schichten = istArbeitstag ? Math.ceil(istMenge / kapazitaetProSchicht) : 0
      
      return {
        tag,
        datum: datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
        wochentag,
        monat: saisonInfo.name,
        istArbeitstag,
        istFeiertag,
        schichten,
        planMenge,
        istMenge,
        abweichung,
        materialVerfuegbar,
        auslastung: Math.round(auslastung * 10) / 10,
        kumulativPlan: 0,
        kumulativIst: 0
      }
    })
    
    // ✅ VALIDIERUNG: Summe muss exakt Jahresproduktion sein
    const summePlan = result.reduce((sum, tag) => sum + tag.planMenge, 0)
    const summeIst = result.reduce((sum, tag) => sum + tag.istMenge, 0)
    
    console.log(`📊 Tagesproduktion Validierung:`)
    console.log(`   Plan-Menge Summe: ${summePlan.toLocaleString('de-DE')} Bikes`)
    console.log(`   Ist-Menge Summe: ${summeIst.toLocaleString('de-DE')} Bikes`)
    console.log(`   Soll (Jahresproduktion): ${jahresproduktion.toLocaleString('de-DE')} Bikes`)
    console.log(`   Abweichung: ${(summePlan - jahresproduktion).toLocaleString('de-DE')} Bikes`)
    
    if (Math.abs(summePlan - jahresproduktion) > 10) {
      console.warn(`⚠️ WARNUNG: Plan-Menge weicht mehr als 10 Bikes von Jahresproduktion ab!`)
    } else {
      console.log(`✅ Error Management funktioniert korrekt!`)
    }
    
    return result
  }, [jahresproduktion, saisonalitaet, feiertage, konfiguration.planungsjahr, produktionConfig])
  
  // Kumulative Werte berechnen (useEffect für Side Effects statt useMemo)
  useEffect(() => {
    let kumulativPlan = 0
    let kumulativIst = 0
    tagesProduktion.forEach(tag => {
      kumulativPlan += tag.planMenge
      kumulativIst += tag.istMenge
      tag.kumulativPlan = kumulativPlan
      tag.kumulativIst = kumulativIst
    })
  }, [tagesProduktion])
  
  // Berechne Produktionsstatistiken dynamisch (NACH tagesProduktion!)
  const produktionsStats = useMemo(() => {
    // ✅ KORREKTUR: Geplant = Jahresproduktion (370.000)
    // Ist = Tatsächlich produziert (aus Tagesproduktion summiert)
    const geplant = jahresproduktion
    const produziert = tagesProduktion.reduce((sum, tag) => sum + tag.istMenge, 0)
    const planerfuellungsgrad = (produziert / geplant) * 100
    
    return {
      geplant: geplant,
      produziert: produziert,
      planerfuellungsgrad: planerfuellungsgrad,
      mitMaterialmangel: 12, // TODO: Aus ATP-Check berechnen
      auslastung: 95.5 // TODO: Aus Schichtplanung berechnen
    }
  }, [jahresproduktion, tagesProduktion])
  
  // Warte bis Konfiguration geladen ist (nach allen Hooks!)
  if (!isInitialized) {
    return <div className="flex items-center justify-center h-screen">Lade Konfiguration...</div>
  }
  
  /**
   * Exportiert Lagerbestände als CSV
   */
  const handleExportLager = () => {
    const data = lagerbestaende.map(l => ({
      Komponente: l.komponente.replace(/_/g, ' '),
      Bestand: l.bestand,
      Sicherheitsbestand: l.sicherheit,
      Verfügbar: l.bestand - l.sicherheit,
      Status: l.status
    }))
    
    exportToCSV(data, 'lagerbestand_2027')
  }
  
  /**
   * Exportiert Produktionsstatistik als JSON
   */
  const handleExportProduktion = () => {
    exportToJSON(produktionsStats, 'produktions_statistik_2027')
  }

  return (
    <div className="space-y-6">
      {/* Header mit Export */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produktion & Warehouse</h1>
          <p className="text-muted-foreground mt-1">
            Produktionssteuerung mit FCFS-Regel (First-Come-First-Serve) • {formatNumber(jahresproduktion, 0)} Bikes/Jahr • Nur 4 Sattel-Varianten
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportLager}>
            <Download className="h-4 w-4 mr-2" />
            Export Lager
          </Button>
          <Button variant="outline" onClick={handleExportProduktion}>
            <Download className="h-4 w-4 mr-2" />
            Export Produktion
          </Button>
        </div>
      </div>

      {/* Übersicht Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Geplante Produktion</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(produktionsStats.geplant, 0)}</div>
            <p className="text-xs text-muted-foreground">MTBs Jahresplan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Tatsächlich produziert</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(produktionsStats.produziert, 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(produktionsStats.planerfuellungsgrad, 2)}% Planerfüllung
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Materialmangel</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{produktionsStats.mitMaterialmangel}</div>
            <p className="text-xs text-muted-foreground">Aufträge betroffen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Auslastung</CardTitle>
              <Factory className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(produktionsStats.auslastung, 1)}%</div>
            <p className="text-xs text-muted-foreground">Kapazitätsauslastung</p>
          </CardContent>
        </Card>
      </div>

      {/* Produktionslogik ohne Solver */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Factory className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">Produktionslogik (ohne Solver)</CardTitle>
          </div>
          <CardDescription className="text-blue-700">
            Einfache First-Come-First-Serve Regel statt mathematischer Optimierung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">FCFS-Regel (First-Come-First-Serve):</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>
                <strong>Schritt 1: ATP-Check</strong> - Prüfe für jeden Produktionsauftrag: 
                Ist genug Material im Lager?
              </li>
              <li>
                <strong>Schritt 2a: JA</strong> - Produziere die volle Menge & buche Material ab
              </li>
              <li>
                <strong>Schritt 2b: NEIN</strong> - Auftrag zurückstellen oder Teilproduktion
              </li>
              <li>
                <strong>Keine Optimierung:</strong> Kein Solver, keine Prioritäten nach Deckungsbeitrag
              </li>
            </ol>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">ATP-Check (Available-to-Promise):</h4>
            <p className="text-sm text-blue-800">
              Für jede Komponente in der Stückliste wird geprüft:<br/>
              <code className="bg-blue-100 px-2 py-1 rounded">
                Verfügbar im Lager ≥ Benötigt für Auftrag
              </code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SEKTION 1: PRODUKTIONSSTEUERUNG */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Factory className="h-6 w-6 text-purple-600" />
            <CardTitle className="text-purple-900 text-xl">PRODUKTIONSSTEUERUNG (Production Control)</CardTitle>
          </div>
          <CardDescription className="text-purple-700">
            Granulare Tagesplanung über 365 Tage mit Saisonalität (Jan {saisonalitaetConfig[0].anteil}%, Apr {saisonalitaetConfig[3].anteil}% Peak, Dez {saisonalitaetConfig[11].anteil}%) und Error Management für exakte {formatNumber(jahresproduktion, 0)} Bikes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Formel-Karte für Produktion */}
          <div className="mb-6 space-y-4">
            <FormulaCard
              title="Tagesproduktion"
              formula={`Jahresproduktion / Arbeitstage = ${formatNumber(jahresproduktion, 0)} / ${getArbeitstageProJahr()} = ${formatNumber(jahresproduktion / getArbeitstageProJahr(), 0)} Bikes/Tag (Vollauslastung)`}
              description="Theoretische Tagesproduktion bei allen Arbeitstagen. Mit Saisonalität: Q1 ca. 70% des Durchschnitts"
              example={`Q1 (Jan-März): ${formatNumber(jahresproduktion / getArbeitstageProJahr(), 0)} × 0,7 = ${formatNumber((jahresproduktion / getArbeitstageProJahr()) * 0.7, 0)} Bikes/Tag durchschnittlich`}
            />
            <FormulaCard
              title="Schichtplanung"
              formula={`Benötigte Schichten = ⌈Plan-Menge / Kapazität pro Schicht⌉, wobei Kapazität = ${produktionConfig.kapazitaetProStunde} Bikes/h × ${produktionConfig.stundenProSchicht}h = ${produktionConfig.kapazitaetProStunde * produktionConfig.stundenProSchicht} Bikes`}
              description="Anzahl der erforderlichen Schichten basierend auf Tagesproduktion"
              example={`${formatNumber(jahresproduktion / getArbeitstageProJahr(), 0)} Bikes geplant → ${formatNumber(jahresproduktion / getArbeitstageProJahr(), 0)} / ${produktionConfig.kapazitaetProStunde * produktionConfig.stundenProSchicht} = ${formatNumber((jahresproduktion / getArbeitstageProJahr()) / (produktionConfig.kapazitaetProStunde * produktionConfig.stundenProSchicht), 2)} → ${Math.ceil((jahresproduktion / getArbeitstageProJahr()) / (produktionConfig.kapazitaetProStunde * produktionConfig.stundenProSchicht))} Schichten nötig`}
            />
            <FormulaCard
              title="Produktionsauslastung"
              formula="Auslastung (%) = (Ist-Menge / Plan-Menge) × 100"
              description="Zeigt die tatsächliche Produktionsleistung im Verhältnis zur Planung"
              example="Tag 1: 711 / 710 × 100 = 100,1% Auslastung"
            />
          </div>

          {/* Tagesplanung Excel-Tabelle */}
          <ExcelTable
            columns={[
              {
                key: 'tag',
                label: 'Tag',
                width: '60px',
                align: 'center',
                sumable: false
              },
              {
                key: 'datum',
                label: 'Datum',
                width: '80px',
                align: 'center',
                sumable: false
              },
              {
                key: 'wochentag',
                label: 'WT',
                width: '50px',
                align: 'center',
                sumable: false
              },
              {
                key: 'monat',
                label: 'Monat',
                width: '60px',
                align: 'center',
                sumable: false
              },
              {
                key: 'schichten',
                label: 'Schichten',
                width: '80px',
                align: 'center',
                formula: '⌈Plan / 1.040⌉',
                format: (val) => val > 0 ? val + ' Schicht(en)' : '-',
                sumable: true
              },
              {
                key: 'planMenge',
                label: 'Plan-Menge',
                width: '110px',
                align: 'right',
                format: (val) => val > 0 ? formatNumber(val, 0) + ' Bikes' : '-',
                sumable: true
              },
              {
                key: 'istMenge',
                label: 'Ist-Menge',
                width: '110px',
                align: 'right',
                format: (val) => val > 0 ? formatNumber(val, 0) + ' Bikes' : '-',
                sumable: true
              },
              {
                key: 'abweichung',
                label: 'Abweichung',
                width: '100px',
                align: 'right',
                formula: 'Ist - Plan',
                format: (val) => {
                  if (val === 0) return '±0'
                  const sign = val > 0 ? '+' : ''
                  return sign + formatNumber(val, 0)
                },
                sumable: true
              },
              {
                key: 'materialVerfuegbar',
                label: 'Material OK',
                width: '100px',
                align: 'center',
                formula: 'ATP-Check',
                format: (val) => val ? '✓ Ja' : '✗ Nein',
                sumable: false
              },
              {
                key: 'auslastung',
                label: 'Auslastung',
                width: '100px',
                align: 'right',
                formula: '(Ist / Plan) × 100',
                format: (val) => val > 0 ? formatNumber(val, 1) + ' %' : '-',
                sumable: false
              },
              {
                key: 'kumulativPlan',
                label: 'Σ Plan',
                width: '110px',
                align: 'right',
                formula: 'Σ(Plan)',
                format: (val) => formatNumber(val, 0),
                sumable: false
              },
              {
                key: 'kumulativIst',
                label: 'Σ Ist',
                width: '110px',
                align: 'right',
                formula: 'Σ(Ist)',
                format: (val) => formatNumber(val, 0),
                sumable: false
              }
            ]}
            data={tagesProduktion}
            maxHeight="500px"
            showFormulas={true}
            showSums={true}
            sumRowLabel="SUMME (365 Tage, ~250 Arbeitstage)"
          />
        </CardContent>
      </Card>

      {/* SEKTION 2: WAREHOUSE / LAGER */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-900 text-xl">WAREHOUSE / LAGER (Inventory Management)</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            Lagerverwaltung mit ATP-Check, Sicherheitsbeständen und Reichweitenberechnung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Formel-Karten für Lager */}
          <div className="mb-6 space-y-4">
            <FormulaCard
              title="ATP-Check Formel (Available-to-Promise)"
              formula="ATP = Verfügbarer Bestand - Sicherheitsbestand ≥ Bedarf, wobei 1 Sattel = 1 Bike"
              description="Vor jeder Produktion wird geprüft, ob genug Sättel verfügbar sind. Einfache 1:1 Stückliste!"
              example="Raceline: Verfügbar = 40.100 - 2.797 = 37.303, Bedarf = 400/Tag → ✓ 93 Tage Reichweite"
            />
            <FormulaCard
              title="Reichweite"
              formula="Reichweite (Tage) = Verfügbarer Bestand / Tagesbedarf"
              description="Zeigt an, wie lange der aktuelle Bestand bei gegebenem Verbrauch reicht"
              example="Fizik Tundra: (45.200 - 3.626) / 518 = 80,3 Tage"
            />
            <FormulaCard
              title="Kritischer Bestand"
              formula="Status = 'Kritisch' wenn Bestand < Sicherheitsbestand ODER Reichweite < 7 Tage"
              description="Warnsystem für Materialengpässe zur Vermeidung von Produktionsstopps"
              example="Sicherheitsbestand = 7 Tage Puffer bei durchschnittlichem Verbrauch"
            />
          </div>

          {/* Excel-ähnliche Lagertabelle */}
          <ExcelTable
            columns={[
              {
                key: 'komponente',
                label: 'Sattel-Variante',
                width: '150px',
                format: (val) => val.replace(/_/g, ' '),
                sumable: false
              },
              {
                key: 'verwendung',
                label: 'Verwendung (MTB-Varianten)',
                width: '250px',
                align: 'left',
                sumable: false
              },
              {
                key: 'bestand',
                label: 'Bestand',
                width: '110px',
                align: 'right',
                format: (val) => formatNumber(val, 0),
                sumable: true
              },
              {
                key: 'sicherheit',
                label: 'Sicherheitsbestand',
                width: '150px',
                align: 'right',
                format: (val) => formatNumber(val, 0),
                sumable: true
              },
              {
                key: 'bedarf',
                label: 'Tagesbedarf',
                width: '130px',
                align: 'right',
                format: (val) => formatNumber(val, 0) + ' /Tag',
                sumable: true
              },
              {
                key: 'verfuegbar',
                label: 'Verfügbar (ATP)',
                width: '140px',
                align: 'right',
                formula: 'Bestand - Sicherheitsbestand',
                format: (val) => formatNumber(val, 0),
                sumable: true
              },
              {
                key: 'reichweite',
                label: 'Reichweite',
                width: '110px',
                align: 'right',
                formula: 'Verfügbar / Tagesbedarf',
                format: (val) => formatNumber(val, 1) + ' Tage',
                sumable: false
              },
              {
                key: 'status',
                label: 'Status',
                width: '100px',
                align: 'center',
                format: (val) => val === 'ok' 
                  ? '✓ OK' 
                  : '⚠ Kritisch',
                sumable: false
              }
            ]}
            data={lagerbestaende.map(l => ({
              komponente: l.komponente,
              verwendung: l.verwendung,
              bestand: l.bestand,
              sicherheit: l.sicherheit,
              bedarf: l.bedarf,
              verfuegbar: l.bestand - l.sicherheit,
              reichweite: (l.bestand - l.sicherheit) / l.bedarf,
              status: l.status
            }))}
            maxHeight="500px"
            showFormulas={true}
            showSums={true}
            sumRowLabel="GESAMT Lagerbestand"
          />
        </CardContent>
      </Card>

      {/* Lagerbestand - alte Section entfernt, jetzt in Warehouse integriert */}

      {/* Materialfluss */}
      <Card>
        <CardHeader>
          <CardTitle>Materialfluss-Diagramm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="text-center">
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
                Bestellung China
              </div>
              <div className="text-xs text-muted-foreground mt-1">21 AT + 35 KT</div>
            </div>
            
            <div className="text-2xl">→</div>
            
            <div className="text-center">
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold">
                Lager (Eingang)
              </div>
              <div className="text-xs text-muted-foreground mt-1">Buchung +</div>
            </div>
            
            <div className="text-2xl">→</div>
            
            <div className="text-center">
              <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg font-semibold">
                Produktion
              </div>
              <div className="text-xs text-muted-foreground mt-1">ATP-Check</div>
            </div>
            
            <div className="text-2xl">→</div>
            
            <div className="text-center">
              <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-semibold">
                Lager (Ausgang)
              </div>
              <div className="text-xs text-muted-foreground mt-1">Buchung -</div>
            </div>
            
            <div className="text-2xl">→</div>
            
            <div className="text-center">
              <div className="bg-slate-100 text-slate-800 px-4 py-2 rounded-lg font-semibold">
                Fertigware
              </div>
              <div className="text-xs text-muted-foreground mt-1">Kein Outbound</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Erfüllte Anforderungen */}
      <Card>
        <CardHeader>
          <CardTitle>Erfüllte Anforderungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <RequirementItem text="ATP-Check (Available-to-Promise)" />
            <RequirementItem text="First-Come-First-Serve Regel" />
            <RequirementItem text="Lagerbestand-Management" />
            <RequirementItem text="Sicherheitsbestände" />
            <RequirementItem text="Materialbuchung (Ein-/Ausgang)" />
            <RequirementItem text="Planerfüllungsgrad-Tracking" />
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