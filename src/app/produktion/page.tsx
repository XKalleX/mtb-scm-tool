'use client'

/**
 * ========================================
 * PRODUKTION & WAREHOUSE
 * ========================================
 * 
 * Produktionssteuerung mit:
 * - ATP-Check (Available-to-Promise)
 * - Proportionale Allokation (Gewichtungsprinzip) statt FCFS
 * - Lagerbestandsmanagement
 * - Materialfluss-Visualisierung
 * 
 * ✅ NEU: Szenarien-Integration global wirksam!
 * ✅ Zeigt Deltas (+X / -X) gegenüber Baseline
 * ✅ NEU: Proportionale Verteilung bei Materialengpass
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Factory, AlertTriangle, TrendingUp, Package, Download, Zap, Info, Calendar, CalendarDays, CalendarRange } from 'lucide-react'
import { CollapsibleInfo, CollapsibleInfoGroup, type InfoItem } from '@/components/ui/collapsible-info'
import { formatNumber, formatDate } from '@/lib/utils'
import { exportToCSV, exportToJSON, exportToXLSX, exportToMultiSheetXLSX } from '@/lib/export'
import ExcelTable, { FormulaCard } from '@/components/excel-table'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { ActiveScenarioBanner } from '@/components/ActiveScenarioBanner'
import { DeltaCell, DeltaBadge } from '@/components/DeltaCell'
import { useMemo, useState } from 'react'
import { 
  generiereTagesproduktion, 
  berechneLagerbestaende,
  berechneProduktionsStatistiken,
  type TagesProduktionEntry,
  type VariantenProduktionsplan
} from '@/lib/calculations/zentrale-produktionsplanung'
import { useSzenarioBerechnung } from '@/lib/hooks/useSzenarioBerechnung'
import { berechneIntegriertesWarehouse, konvertiereWarehouseZuExport, korrigiereProduktionsplaeneMitWarehouse } from '@/lib/calculations/warehouse-management'
import { berechneBedarfsBacklog } from '@/lib/calculations/bedarfs-backlog-rechnung'
import { TagesproduktionChart, LagerbestandChart, BacklogChart } from '@/components/ui/table-charts'
import { 
  aggregiereNachWoche, 
  aggregiereNachMonat
} from '@/lib/helpers/programm-aggregation'
import { generiereInboundLieferplan } from '@/lib/calculations/inbound-china'

/**
 * Zeitperioden für die Ansichtswahl
 */
type ZeitperiodeTyp = 'tag' | 'woche' | 'monat'

/**
 * Produktion Hauptseite
 * Zeigt Produktionsstatus und Lagerbestände mit Excel-Tabellen
 * ✅ Nutzt szenario-aware Berechnungen aus useSzenarioBerechnung Hook
 */
export default function ProduktionPage() {
  // State für Zeitperiodenansicht (Tag/Woche/Monat)
  const [zeitperiodeProduktion, setZeitperiodeProduktion] = useState<ZeitperiodeTyp>('tag')
  const [zeitperiodeWarehouse, setZeitperiodeWarehouse] = useState<ZeitperiodeTyp>('tag')
  
  // Hole Konfiguration aus Context
  const { konfiguration, isInitialized, getArbeitstageProJahr } = useKonfiguration()
  
  // ✅ SZENARIO-AWARE: Nutze neuen Hook
  const {
    hasSzenarien,
    aktiveSzenarienCount,
    aktiveSzenarien,
    tagesProduktion: tagesProduktionMitSzenarien,
    lagerbestaende: lagerbestaendeMitSzenarien,
    variantenPlaene: variantenPlaeneMitSzenarien, // ✅ NEU: Für Warehouse-Berechnungen
    statistiken,
    formatDelta,
    getDeltaColorClass
  } = useSzenarioBerechnung()
  
  // Baseline Lagerbestände (ohne Szenarien)
  const baselineLagerbestaende = useMemo(() => 
    berechneLagerbestaende(konfiguration),
    [konfiguration]
  )
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TAGESPLANUNG für 365 Tage mit Saisonalität aus SSOT
  // ═══════════════════════════════════════════════════════════════════════════════
  // 
  // Quelle: zentrale-produktionsplanung.ts
  // Mit Error Management für exakte Jahresproduktion
  // ✅ SZENARIO-AWARE: Nutze tagesProduktionMitSzenarien wenn Szenarien aktiv
  const tagesProduktion = useMemo(() => {
    // Wenn Szenarien aktiv sind, nutze Szenario-Daten
    if (hasSzenarien && tagesProduktionMitSzenarien.length > 0) {
      return tagesProduktionMitSzenarien
    }
    
    // Ansonsten berechne Baseline
    const result = generiereTagesproduktion(konfiguration)
    
    // ✅ VALIDIERUNG: Log zur Kontrolle
    const summePlan = result.reduce((sum, tag) => sum + tag.planMenge, 0)
    const summeIst = result.reduce((sum, tag) => sum + tag.istMenge, 0)
    
    console.log(`📊 Tagesproduktion Validierung:`)
    console.log(`   Plan-Menge Summe: ${summePlan.toLocaleString('de-DE')} Bikes`)
    console.log(`   Ist-Menge Summe: ${summeIst.toLocaleString('de-DE')} Bikes`)
    console.log(`   Soll (Jahresproduktion): ${konfiguration.jahresproduktion.toLocaleString('de-DE')} Bikes`)
    console.log(`   Abweichung: ${(summePlan - konfiguration.jahresproduktion).toLocaleString('de-DE')} Bikes`)
    
    if (Math.abs(summePlan - konfiguration.jahresproduktion) <= 10) {
      console.log(`✅ Error Management funktioniert korrekt!`)
    }
    
    return result
  }, [konfiguration, hasSzenarien, tagesProduktionMitSzenarien])
  
  // Lagerbestände (szenario-aware)
  const lagerbestaende = hasSzenarien ? lagerbestaendeMitSzenarien : baselineLagerbestaende
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ✅ NEU: INTEGRIERTES WAREHOUSE MANAGEMENT (FIXES ALL ISSUES!)
  // ═══════════════════════════════════════════════════════════════════════════════
  // 
  // Verwendet berechneIntegriertesWarehouse() statt der alten fehlerhaften
  // berechneTagesLagerbestaende() Funktion.
  // 
  // FIXES:
  // - Realistische lot-basierte Lieferungen (500 Stück, 49 Tage)
  // - Keine Verbrauch ab Tag 1 ohne Lieferung
  // - ATP-Checks vor jedem Verbrauch
  // - Full OEM-Inbound-Warehouse Integration
  
  // ✅ KRITISCH: Nutze IMMER variantenPlaene aus useSzenarioBerechnung Hook!
  // Dieser enthält:
  // - Baseline-Pläne (wenn keine Szenarien aktiv)
  // - Szenario-Pläne (wenn Szenarien aktiv)
  // - Manuelle Anpassungen aus OEM-Seite (immer, wenn vorhanden)
  // 
  // WICHTIG: NICHT mehr lokal berechnen, sonst gehen manuelle Anpassungen verloren!
  // NOTE: Type-Cast ist sicher weil TagesProduktionMitDelta extends TagesProduktionEntry
  // (hat alle benötigten Felder plus zusätzliche Delta-Felder)
  const variantenProduktionsplaeneForWarehouse = useMemo(() => {
    return variantenPlaeneMitSzenarien as Record<string, VariantenProduktionsplan>
  }, [variantenPlaeneMitSzenarien])
  
  // ✅ KRITISCH: Generiere Hafenlogistik-Lieferplan ZUERST!
  // Dies ist die EINZIGE Quelle für Materialzugänge im System
  const inboundLieferplan = useMemo(() => {
    // Bereite Stücklisten-Map vor
    const stuecklistenMap: Record<string, { komponenten: Record<string, { name: string; menge: number; einheit: string }> }> = {}
    konfiguration.stueckliste.forEach(s => {
      if (!stuecklistenMap[s.mtbVariante]) {
        stuecklistenMap[s.mtbVariante] = { komponenten: {} }
      }
      stuecklistenMap[s.mtbVariante].komponenten[s.bauteilId] = {
        name: s.bauteilName,
        menge: s.menge,
        einheit: s.einheit || 'Stück'
      }
    })
    
    // Konvertiere Produktionspläne zu Format für Inbound
    const produktionsplaeneFormatiert: Record<string, Array<{datum: Date; varianteId: string; istMenge: number; planMenge: number}>> = {}
    Object.entries(variantenProduktionsplaeneForWarehouse).forEach(([varianteId, plan]) => {
      produktionsplaeneFormatiert[varianteId] = plan.tage.map((tag: TagesProduktionEntry) => ({
        datum: tag.datum,
        varianteId: varianteId,
        istMenge: tag.istMenge,
        planMenge: tag.planMenge
      }))
    })
    
    // ✅ Generiere Inbound-Lieferplan mit Hafenlogistik-Simulation
    console.log('🚢 Starte Hafenlogistik-Simulation für Produktion/Backlog...')
    return generiereInboundLieferplan(
      produktionsplaeneFormatiert,
      konfiguration.planungsjahr,
      konfiguration.lieferant.gesamtVorlaufzeitTage,
      konfiguration.feiertage,
      stuecklistenMap,
      konfiguration.lieferant.losgroesse,
      aktiveSzenarien // ✅ Szenarien hinzugefügt
    )
  }, [variantenProduktionsplaeneForWarehouse, konfiguration, aktiveSzenarien])
  
  // ✅ Szenarien werden jetzt bereits in generiereInboundLieferplan() angewendet
  // Keine separate Anwendung mehr nötig
  const lieferungenMitSzenarien = useMemo(() => {
    return inboundLieferplan.lieferungenAmWerk
  }, [inboundLieferplan.lieferungenAmWerk])
  
  // ✅ NEU: Berechne Bedarfs-Backlog-Rechnung MIT Szenario-modifizierten Lieferungen
  // Zeigt die tatsächliche Produktion basierend auf REALER Materialverfügbarkeit aus Hafenlogistik
  const backlogErgebnis = useMemo(() => {
    const plaeneAlsEntries: Record<string, TagesProduktionEntry[]> = {}
    Object.entries(variantenProduktionsplaeneForWarehouse).forEach(([varianteId, plan]) => {
      plaeneAlsEntries[varianteId] = plan.tage
    })
    
    // ✅ KRITISCH: Nutze Szenario-modifizierte Lieferungen!
    return berechneBedarfsBacklog(
      plaeneAlsEntries, 
      konfiguration,
      lieferungenMitSzenarien // ✅ Szenarien bereits angewendet
    )
  }, [variantenProduktionsplaeneForWarehouse, konfiguration, lieferungenMitSzenarien])
  
  // ✅ INTEGRIERTES WAREHOUSE: Realistische Bestandsführung
  const warehouseResult = useMemo(() => {
    return berechneIntegriertesWarehouse(
      konfiguration,
      variantenProduktionsplaeneForWarehouse,
      [], // Keine Zusatzbestellungen hier
      aktiveSzenarien // ✅ KRITISCH: Übergebe aktive Szenarien für Lieferungs-Modifikation!
    )
  }, [konfiguration, variantenProduktionsplaeneForWarehouse, aktiveSzenarien])
  
  // 🎯 KERN-FIX: Korrigiere Produktionspläne mit tatsächlichen Warehouse-Daten
  // Dies löst das Delta-Problem: istMenge wird auf Basis des tatsächlichen
  // Material-Verbrauchs gesetzt, nicht auf planMenge!
  const korrigiertePlaene = useMemo(() => {
    return korrigiereProduktionsplaeneMitWarehouse(
      variantenProduktionsplaeneForWarehouse,
      warehouseResult,
      konfiguration
    )
  }, [variantenProduktionsplaeneForWarehouse, warehouseResult, konfiguration])
  
  // ✅ NEU: Nutze korrigierte Pläne für Tagesproduktion-Anzeige
  // ✅ NEU: Berechne maximalen verfügbaren Tag (kann > 365 sein bei Verspätungen!)
  const maxTag = useMemo(() => {
    return warehouseResult.tage.reduce((max, t) => Math.max(max, t.tag), 365)
  }, [warehouseResult])
  
  // ✅ NEU: Prüfe ob Post-Jahresende-Tage existieren
  const hatPostJahresendeTage = maxTag > 365
  
  // Aggregiere über alle Varianten für Gesamt-Tagesansicht
  const tagesProduktionFormatiert = useMemo(() => {
    // Erstelle aggregierte Tagesansicht aus korrigierten Varianten-Plänen
    const tagesAggregiert: TagesProduktionEntry[] = []
    
    // Hole Warehouse-Daten für exakte Produktions-Zahlen (SSOT!)
    const jahr2027Tage = warehouseResult.tage.filter(t => t.tag >= 1 && t.tag <= maxTag)
    
    // ✅ INFO: Log wenn Post-Jahresende-Tage existieren
    if (maxTag > 365) {
      console.log(`ℹ️ Produktion erweitert bis Tag ${maxTag} (${maxTag - 365} Tage nach Jahresende wegen Backlog)`)
    }
    
    // ✅ NEU: Erstelle Lookup für Warehouse-Verbrauch pro Tag
    // Dies ist die EINZIGE Quelle der Wahrheit für tatsächliche Produktion
    const warehouseVerbrauchProTag: Record<number, number> = {}
    const backlogProTag: Record<number, number> = {}
    const hatEngpassProTag: Record<number, boolean> = {}
    
    jahr2027Tage.forEach(warehouseTag => {
      let tagesVerbrauch = 0
      let tagesBacklog = 0
      
      warehouseTag.bauteile.forEach(bauteil => {
        tagesVerbrauch += bauteil.verbrauch
        tagesBacklog += bauteil.produktionsBacklog.backlogNachher
      })
      
      warehouseVerbrauchProTag[warehouseTag.tag] = tagesVerbrauch
      backlogProTag[warehouseTag.tag] = tagesBacklog
      
      // ✅ KRITISCHER FIX (Issue #295): Material OK basiert auf Backlog-Änderung!
      // Wenn Backlog ZUNIMMT (backlogNachher > backlogVorher) → Materialmangel!
      // Dies berücksichtigt ALLE Fälle:
      // - Backlog steigt an = nicht alles produziert werden konnte = Materialmangel
      // - Backlog bleibt gleich oder sinkt = kein neuer Materialmangel
      // An Nicht-Arbeitstagen wird in bedarfs-backlog-rechnung.ts der Backlog nicht verändert.
      const hatBacklogZunahme = warehouseTag.bauteile.some(bauteil => 
        bauteil.produktionsBacklog.backlogNachher > bauteil.produktionsBacklog.backlogVorher
      )
      hatEngpassProTag[warehouseTag.tag] = warehouseTag.istArbeitstag && hatBacklogZunahme
    })
    
    // Kapazitätsberechnung: 130 Bikes/h * 8h = 1040 Bikes pro Schicht
    const kapazitaetProSchicht = 
      konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht
    const maxSchichtenProTag = konfiguration.produktion.maxSchichtenProTag || 3
    
    // ✅ FIX: Erweitere Loop bis maxTag (kann > 365 sein bei Verspätungen!)
    // Initialisiere alle verfügbaren Tage (inkl. Post-Jahresende bei Backlog)
    for (let tag = 1; tag <= maxTag; tag++) {
      // Hole ersten Tag als Template (alle haben gleiche Basis-Infos)
      const ersterPlan = Object.values(korrigiertePlaene)[0]
      if (!ersterPlan || tag - 1 >= ersterPlan.tage.length) continue
      
      const templateTag = ersterPlan.tage[tag - 1]
      
      // Aggregiere Plan über alle Varianten (Plan ist immer korrekt, aus OEM mit Error Management)
      let gesamtPlan = 0
      Object.values(korrigiertePlaene).forEach(plan => {
        const variantenTag = plan.tage[tag - 1]
        gesamtPlan += variantenTag.planMenge
      })
      
      // ✅ KRITISCHER FIX: Nutze Warehouse-Verbrauch DIREKT als IST-Menge!
      // Dies vermeidet Rundungsfehler bei der proportionalen Verteilung auf Varianten.
      // Da 1 Sattel = 1 Bike, entspricht der Verbrauch exakt der Produktion.
      const gesamtIst = warehouseVerbrauchProTag[tag] || 0
      
      // Material-Engpass aus Warehouse
      const hatMaterialEngpass = hatEngpassProTag[tag] || false
      
      // ✅ FIX: Berechne Schichten basierend auf tatsächlicher IST-Menge + Backlog
      // Bei Backlog benötigen wir mehr Schichten um aufzuholen
      const tagesBacklog = backlogProTag[tag] || 0
      const gesamtProduktionsbedarf = gesamtIst + tagesBacklog
      const schichten = templateTag.istArbeitstag 
        ? Math.min(Math.ceil(gesamtProduktionsbedarf / kapazitaetProSchicht), maxSchichtenProTag) 
        : 0
      
      // ✅ FIX: Berechne Auslastung basierend auf tatsächlicher Produktion
      // Auslastung = (Tatsächlich produziert / Max. Kapazität) * 100
      const maxKapazitaetHeute = schichten * kapazitaetProSchicht
      const auslastung = maxKapazitaetHeute > 0 
        ? (gesamtIst / maxKapazitaetHeute) * 100 
        : 0
      
      tagesAggregiert.push({
        ...templateTag,
        planMenge: gesamtPlan,
        istMenge: gesamtIst,
        abweichung: gesamtIst - gesamtPlan,
        // ✅ FIX: schichten und auslastung korrekt berechnet
        schichten: schichten,
        auslastung: Math.round(auslastung * 10) / 10,
        // ✅ KRITISCHER FIX (Issue #295): materialVerfuegbar Logik
        // HINWEIS: Der Wert ist für Nicht-Arbeitstage irrelevant, da die UI-Anzeige
        // immer "-" zeigt wenn istArbeitstag === false. Der true-Fallback ist nur für Konsistenz.
        // An Arbeitstagen: basierend auf tatsächlichem Material-Engpass aus Warehouse
        materialVerfuegbar: !templateTag.istArbeitstag 
          ? true  // Fallback-Wert (UI zeigt "-" basierend auf istArbeitstag)
          : !hatMaterialEngpass,
        backlog: tagesBacklog
      })
    }
    
    // Berechne kumulative Werte
    let kumulativPlan = 0
    let kumulativIst = 0
    tagesAggregiert.forEach(tag => {
      kumulativPlan += tag.planMenge
      kumulativIst += tag.istMenge
      tag.kumulativPlan = kumulativPlan
      tag.kumulativIst = kumulativIst
      tag.kumulativSoll = kumulativPlan
    })
    
    return tagesAggregiert
  }, [korrigiertePlaene, warehouseResult, konfiguration.produktion, maxTag])
  
  // ✅ NEU: Aggregierte Ansichten für Produktionssteuerung
  const wochenProduktion = useMemo(() => {
    return aggregiereNachWoche(tagesProduktionFormatiert)
  }, [tagesProduktionFormatiert])
  
  const monatsProduktion = useMemo(() => {
    return aggregiereNachMonat(tagesProduktionFormatiert)
  }, [tagesProduktionFormatiert])
  
  // Konvertiere für Darstellung (inkl. Post-Jahresende bei Verspätungen)
  const tagesLagerbestaende = useMemo(() => {
    // ✅ FIX: Ermittle maximalen Tag dynamisch (kann > 365 sein bei Verspätungen!)
    const maxTag = warehouseResult.tage.reduce((max, t) => Math.max(max, t.tag), 365)
    const jahr2027Tage = warehouseResult.tage.filter(t => t.tag >= 1 && t.tag <= maxTag)
    
    // Konvertiere zu altem Format für UI-Kompatibilität
    // Mappe 'negativ' Status zu 'kritisch' für UI (zeigt explizit kritische Bestände an)
    const mapStatus = (status: 'hoch' | 'ok' | 'niedrig' | 'kritisch' | 'negativ'): 'hoch' | 'ok' | 'niedrig' | 'kritisch' => {
      if (status === 'negativ') {
        // Negative Bestände sollten nicht auftreten (ATP-Check verhindert), aber falls doch: kritisch
        console.warn('⚠️ Negative inventory detected! ATP check may have failed.')
        return 'kritisch'
      }
      return status
    }
    
    return jahr2027Tage.map(tag => ({
      tag: tag.tag,
      datum: tag.datum,
      wochentag: tag.wochentag,
      monat: tag.monat,
      istArbeitstag: tag.istArbeitstag,
      bauteile: tag.bauteile.map(b => ({
        bauteilId: b.bauteilId,
        bauteilName: b.bauteilName,
        anfangsBestand: b.anfangsBestand,
        zugang: b.zugang,
        verbrauch: b.verbrauch,
        endBestand: b.endBestand,
        reichweite: b.reichweiteTage,
        status: mapStatus(b.status),
        // NEU: Backlog-Informationen
        backlogVorher: b.produktionsBacklog.backlogVorher,
        backlogNachher: b.produktionsBacklog.backlogNachher,
        nichtProduziert: b.produktionsBacklog.nichtProduziertHeute,
        nachgeholt: b.produktionsBacklog.nachgeholt
      }))
    }))
  }, [warehouseResult, maxTag])
  
  // ✅ NEU: Aggregierte Ansichten für Warehouse (Woche/Monat)
  const wochenLagerbestaende = useMemo(() => {
    // Gruppiere nach Woche und aggregiere Bauteile
    const wochenMap = new Map<number, typeof tagesLagerbestaende[0][]>()
    
    tagesLagerbestaende.forEach(tag => {
      const kw = getKalenderWoche(tag.datum)
      if (!wochenMap.has(kw)) {
        wochenMap.set(kw, [])
      }
      wochenMap.get(kw)!.push(tag)
    })
    
    return Array.from(wochenMap.entries()).map(([kw, tage]) => {
      // Aggregiere Bauteile
      const bauteilMap = new Map<string, any>()
      
      tage.forEach(tag => {
        tag.bauteile.forEach(b => {
          if (!bauteilMap.has(b.bauteilId)) {
            bauteilMap.set(b.bauteilId, {
              bauteilId: b.bauteilId,
              bauteilName: b.bauteilName,
              anfangsBestand: 0,
              zugang: 0,
              verbrauch: 0,
              endBestand: 0,
              reichweite: 0,
              status: 'ok' as const,
              backlogVorher: 0,
              backlogNachher: 0,
              nichtProduziert: 0,
              nachgeholt: 0
            })
          }
          
          const bauteil = bauteilMap.get(b.bauteilId)!
          bauteil.zugang += b.zugang
          bauteil.verbrauch += b.verbrauch
          // Use last day's backlog values (most accurate for period aggregation)
          bauteil.backlogVorher = b.backlogVorher
          bauteil.backlogNachher = b.backlogNachher
          bauteil.nichtProduziert += b.nichtProduziert
          bauteil.nachgeholt += b.nachgeholt
        })
      })
      
      // Berechne Durchschnittswerte
      Array.from(bauteilMap.values()).forEach(b => {
        const letzterTag = tage[tage.length - 1]
        const bauteilLetzterTag = letzterTag.bauteile.find(bt => bt.bauteilId === b.bauteilId)
        if (bauteilLetzterTag) {
          b.endBestand = bauteilLetzterTag.endBestand
          b.reichweite = bauteilLetzterTag.reichweite
          b.status = bauteilLetzterTag.status
        }
      })
      
      return {
        woche: kw,
        jahr: 2027,
        startDatum: tage[0].datum,
        endDatum: tage[tage.length - 1].datum,
        tageInWoche: tage.length,
        istArbeitstag: tage.some(t => t.istArbeitstag),
        bauteile: Array.from(bauteilMap.values())
      }
    })
  }, [tagesLagerbestaende])
  
  const monatsLagerbestaende = useMemo(() => {
    // Gruppiere nach Monat und aggregiere Bauteile
    const monatsMap = new Map<number, typeof tagesLagerbestaende[0][]>()
    
    tagesLagerbestaende.forEach(tag => {
      const monat = tag.monat
      if (!monatsMap.has(monat)) {
        monatsMap.set(monat, [])
      }
      monatsMap.get(monat)!.push(tag)
    })
    
    return Array.from(monatsMap.entries()).map(([monat, tage]) => {
      // Aggregiere Bauteile
      const bauteilMap = new Map<string, any>()
      
      tage.forEach(tag => {
        tag.bauteile.forEach(b => {
          if (!bauteilMap.has(b.bauteilId)) {
            bauteilMap.set(b.bauteilId, {
              bauteilId: b.bauteilId,
              bauteilName: b.bauteilName,
              anfangsBestand: 0,
              zugang: 0,
              verbrauch: 0,
              endBestand: 0,
              reichweite: 0,
              status: 'ok' as const,
              backlogVorher: 0,
              backlogNachher: 0,
              nichtProduziert: 0,
              nachgeholt: 0
            })
          }
          
          const bauteil = bauteilMap.get(b.bauteilId)!
          bauteil.zugang += b.zugang
          bauteil.verbrauch += b.verbrauch
          // Use last day's backlog values (most accurate for period aggregation)
          bauteil.backlogVorher = b.backlogVorher
          bauteil.backlogNachher = b.backlogNachher
          bauteil.nichtProduziert += b.nichtProduziert
          bauteil.nachgeholt += b.nachgeholt
        })
      })
      
      // Berechne Durchschnittswerte
      Array.from(bauteilMap.values()).forEach(b => {
        const letzterTag = tage[tage.length - 1]
        const bauteilLetzterTag = letzterTag.bauteile.find(bt => bt.bauteilId === b.bauteilId)
        if (bauteilLetzterTag) {
          b.endBestand = bauteilLetzterTag.endBestand
          b.reichweite = bauteilLetzterTag.reichweite
          b.status = bauteilLetzterTag.status
        }
      })
      
      const monatName = new Date(2027, monat - 1, 1).toLocaleDateString('de-DE', { month: 'long' })
      
      return {
        monat: monat,
        monatName: monatName,
        jahr: 2027,
        startDatum: tage[0].datum,
        endDatum: tage[tage.length - 1].datum,
        tageInMonat: tage.length,
        istArbeitstag: tage.some(t => t.istArbeitstag),
        bauteile: Array.from(bauteilMap.values())
      }
    })
  }, [tagesLagerbestaende])
  
  // Helper für Kalenderwoche
  function getKalenderWoche(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
  
  // Warehouse-Statistiken für Anzeige
  const warehouseStats = warehouseResult.jahresstatistik
  
  // Berechne Produktionsstatistiken dynamisch (szenario-aware)
  // ✅ KRITISCHER FIX: Nutze tagesProduktionFormatiert als EINZIGE Quelle für IST-Produktion!
  // Dadurch zeigt die Statistik-Kachel denselben Wert wie die Tabellen-Summe
  const produktionsStats = useMemo(() => {
    // ✅ FIX: Berechne IST-Summe aus tagesProduktionFormatiert (=korrigierte Pläne, gleiche Datenquelle wie Tabelle!)
    // Vorher wurde warehouseResult.jahresstatistik.gesamtProduziertTatsaechlich verwendet,
    // aber das enthielt Double-Counting durch redundanten Backlog-Abbau in Step 3e.
    const summeIstProduktion = tagesProduktionFormatiert.reduce((sum, tag) => sum + tag.istMenge, 0)
    
    // ✅ KRITISCH: Nutze IMMER die Summe aus variantenPlaeneMitSzenarien!
    // Diese enthält sowohl Szenarien-Anpassungen ALS AUCH manuelle OEM-Anpassungen.
    // NIEMALS den Fallback konfiguration.jahresproduktion nutzen, da dieser
    // manuelle Anpassungen NICHT berücksichtigt!
    const geplantMenge = variantenPlaeneMitSzenarien && Object.keys(variantenPlaeneMitSzenarien).length > 0
      ? Object.values(variantenPlaeneMitSzenarien).reduce((sum, plan) => sum + plan.jahresProduktion, 0)
      : konfiguration.jahresproduktion // Fallback nur wenn Hook noch nicht initialisiert
    
    // Materialengpass-Tage aus Warehouse (dort ist es korrekt berechnet)
    const tageOhneMaterial = warehouseResult.jahresstatistik.tageMitBacklog
    
    // ✅ FIX: Planerfüllung = Produziert / Plan * 100 (nicht ATP-Erfolgsrate!)
    // Die alte "liefertreue" war % der Tage ohne ATP-Fehler, was irreführend war.
    // Korrekt: Wie viel % der geplanten Produktion wurde tatsächlich erreicht?
    const planerfuellungProzent = geplantMenge > 0 
      ? (summeIstProduktion / geplantMenge) * 100 
      : 100
    
    const baseStats = berechneProduktionsStatistiken(tagesProduktion)
    
    if (hasSzenarien) {
      return {
        geplant: geplantMenge,
        produziert: summeIstProduktion,
        abweichung: summeIstProduktion - geplantMenge,
        planerfuellungsgrad: planerfuellungProzent,
        arbeitstage: statistiken.arbeitstage,
        schichtenGesamt: statistiken.schichtenGesamt,
        mitMaterialmangel: tageOhneMaterial,
        auslastung: statistiken.auslastung
      }
    }
    
    return {
      ...baseStats,
      geplant: geplantMenge,
      produziert: summeIstProduktion,
      abweichung: summeIstProduktion - geplantMenge,
      planerfuellungsgrad: planerfuellungProzent,
      mitMaterialmangel: tageOhneMaterial
    }
  }, [tagesProduktion, hasSzenarien, statistiken, warehouseResult, konfiguration.jahresproduktion, tagesProduktionFormatiert, variantenPlaeneMitSzenarien])
  
  // ✅ Aggregierte Lagerbestandsdaten für Chart (außerhalb JSX)
  const lagerbestandChartDaten = useMemo(() => {
    const aggregierteDaten: Record<number, { bestand: number; zugang: number; abgang: number }> = {}
    
    tagesLagerbestaende.forEach(tag => {
      if (!aggregierteDaten[tag.tag]) {
        aggregierteDaten[tag.tag] = { bestand: 0, zugang: 0, abgang: 0 }
      }
      
      tag.bauteile.forEach(b => {
        aggregierteDaten[tag.tag].bestand += b.endBestand
        aggregierteDaten[tag.tag].zugang += b.zugang
        aggregierteDaten[tag.tag].abgang += b.verbrauch
      })
    })
    
    return Object.entries(aggregierteDaten).map(([tagStr, data]) => ({
      tag: parseInt(tagStr),
      datum: tagesLagerbestaende.find(t => t.tag === parseInt(tagStr))?.datum,
      bestand: data.bestand,
      zugang: data.zugang,
      abgang: data.abgang,
      status: 'ok' as const
    }))
  }, [tagesLagerbestaende])
  
  // Warte bis Konfiguration geladen ist (nach allen Hooks!)
  if (!isInitialized) {
    return <div className="flex items-center justify-center h-screen">Lade Konfiguration...</div>
  }
  
  /**
   * Exportiert Lagerbestände als CSV (NEU: Mit integriertem Warehouse)
   */
  const handleExportLager = () => {
    const data = konvertiereWarehouseZuExport(warehouseResult)
    exportToCSV(data, 'warehouse_2027_integriert_vollstaendig', { cleanEmojis: true })
  }
  
  /**
   * Exportiert Produktionsstatistik als JSON
   */
  const handleExportProduktion = () => {
    exportToJSON(produktionsStats, 'produktions_statistik_2027')
  }
  
  /**
   * ✅ NEU: Exportiert Produktionssteuerung als CSV
   * Zeigt Plan/Ist-Mengen, Abweichungen, Schichten, Auslastung
   */
  const handleExportProduktionssteuerungCSV = () => {
    if (!tagesProduktionFormatiert || tagesProduktionFormatiert.length === 0) {
      console.warn('Keine Produktionsdaten zum Exportieren')
      return
    }
    
    // Wähle Daten basierend auf aktueller Zeitperiode
    let data: any[] = []
    
    if (zeitperiodeProduktion === 'tag') {
      data = tagesProduktionFormatiert.map(t => ({
        'Datum': formatDate(t.datum),
        'Wochentag': t.datum.toLocaleDateString('de-DE', { weekday: 'long' }),
        'Arbeitstag': t.istArbeitstag ? 'Ja' : 'Nein',
        'Plan-Menge': t.planMenge,
        'Ist-Menge': t.istMenge,
        'Abweichung': t.abweichung,
        'Schichten': t.schichten,
        'Auslastung (%)': t.auslastung,
        'Material Verfügbar': t.materialVerfuegbar ? 'Ja' : 'Nein',
        'Backlog': t.backlog || 0,
        'Kumulativ Plan': t.kumulativPlan,
        'Kumulativ Ist': t.kumulativIst
      }))
    } else if (zeitperiodeProduktion === 'woche') {
      data = wochenProduktion.map(w => ({
        'KW': w.kalenderwoche,
        'Jahr': w.jahr,
        'Start': formatDate(w.startDatum),
        'Ende': formatDate(w.endDatum),
        'Plan-Menge': w.planMenge,
        'Ist-Menge': w.istMenge,
        'Abweichung': w.istMenge - w.planMenge,
        'Kumulativ Plan': w.kumulativPlan,
        'Kumulativ Ist': w.kumulativIst
      }))
    } else {
      data = monatsProduktion.map(m => ({
        'Monat': m.monatName,
        'Jahr': m.jahr,
        'Plan-Menge': m.planMenge,
        'Ist-Menge': m.istMenge,
        'Abweichung': m.istMenge - m.planMenge,
        'Arbeitstage': m.anzahlArbeitstage,
        'Kumulativ Plan': m.kumulativPlan,
        'Kumulativ Ist': m.kumulativIst
      }))
    }
    
    const periodeName = zeitperiodeProduktion === 'tag' ? 'Tagesansicht' : 
                       zeitperiodeProduktion === 'woche' ? 'Wochenansicht' : 'Monatsansicht'
    
    exportToCSV(
      data,
      `produktionssteuerung_${periodeName}_${konfiguration.planungsjahr}_vollstaendig`,
      { cleanEmojis: true }
    )
  }
  
  /**
   * ✅ NEU: Exportiert Produktionssteuerung als XLSX
   */
  const handleExportProduktionssteuerungXLSX = async () => {
    if (!tagesProduktionFormatiert || tagesProduktionFormatiert.length === 0) {
      console.warn('Keine Produktionsdaten zum Exportieren')
      return
    }
    
    try {
      // Wähle Daten basierend auf aktueller Zeitperiode
      let data: any[] = []
      let sheetName = ''
      
      if (zeitperiodeProduktion === 'tag') {
        sheetName = 'Tagesansicht'
        data = tagesProduktionFormatiert.map(t => ({
          'Datum': formatDate(t.datum),
          'Wochentag': t.datum.toLocaleDateString('de-DE', { weekday: 'long' }),
          'Arbeitstag': t.istArbeitstag ? 'Ja' : 'Nein',
          'Plan-Menge': t.planMenge,
          'Ist-Menge': t.istMenge,
          'Abweichung': t.abweichung,
          'Schichten': t.schichten,
          'Auslastung (%)': t.auslastung,
          'Material Verfügbar': t.materialVerfuegbar ? 'Ja' : 'Nein',
          'Backlog': t.backlog || 0,
          'Kumulativ Plan': t.kumulativPlan,
          'Kumulativ Ist': t.kumulativIst
        }))
      } else if (zeitperiodeProduktion === 'woche') {
        sheetName = 'Wochenansicht'
        data = wochenProduktion.map(w => ({
          'KW': w.kalenderwoche,
          'Jahr': w.jahr,
          'Start': formatDate(w.startDatum),
          'Ende': formatDate(w.endDatum),
          'Plan-Menge': w.planMenge,
          'Ist-Menge': w.istMenge,
          'Abweichung': w.istMenge - w.planMenge,
          'Kumulativ Plan': w.kumulativPlan,
          'Kumulativ Ist': w.kumulativIst
        }))
      } else {
        sheetName = 'Monatsansicht'
        data = monatsProduktion.map(m => ({
          'Monat': m.monatName,
          'Jahr': m.jahr,
          'Plan-Menge': m.planMenge,
          'Ist-Menge': m.istMenge,
          'Abweichung': m.istMenge - m.planMenge,
          'Arbeitstage': m.anzahlArbeitstage,
          'Kumulativ Plan': m.kumulativPlan,
          'Kumulativ Ist': m.kumulativIst
        }))
      }
      
      await exportToXLSX(
        data,
        `produktionssteuerung_${sheetName}_${konfiguration.planungsjahr}_vollstaendig`,
        {
          sheetName: sheetName,
          title: `Produktionssteuerung ${sheetName} ${konfiguration.planungsjahr}`,
          author: 'MTB SCM Tool - WI3 Team',
          freezeHeader: true,
          autoFilter: true
        }
      )
    } catch (error) {
      console.error('Fehler beim Produktionssteuerung XLSX-Export:', error)
    }
  }
  
  /**
   * ✅ NEU: Exportiert Warehouse als XLSX mit Formatierung
   */
  const handleExportWarehouseXLSX = async () => {
    try {
      const data = konvertiereWarehouseZuExport(warehouseResult)
      
      await exportToXLSX(
        data,
        'warehouse_2027_integriert_vollstaendig',
        {
          sheetName: 'Warehouse',
          title: 'Warehouse Management 2027 - Integriert',
          author: 'MTB SCM Tool - WI3 Team',
          freezeHeader: true,
          autoFilter: true
        }
      )
    } catch (error) {
      console.error('Fehler beim Warehouse XLSX-Export:', error)
    }
  }
  
  /**
   * ✅ NEU: Exportiert ALLES als Multi-Sheet XLSX
   * Sheets: Warehouse, Produktion, Statistiken, Backlog
   */
  const handleExportAlles = async () => {
    try {
      const sheets = [
        // Sheet 1: Warehouse
        {
          name: 'Warehouse',
          data: konvertiereWarehouseZuExport(warehouseResult),
          title: 'Warehouse Management 2027'
        },
        // Sheet 2: Tagesproduktion
        {
          name: 'Tagesproduktion',
          data: tagesProduktion.map(t => ({
            'Datum': t.datum.toISOString().split('T')[0],
            'Plan-Menge': t.planMenge,
            'Ist-Menge': t.istMenge,
            'Abweichung': t.abweichung,
            'Schichten': t.schichten,
            'Auslastung': t.auslastung
          })),
          title: 'Tagesproduktion 2027'
        },
        // Sheet 3: Statistiken
        {
          name: 'Statistiken',
          data: [produktionsStats],
          title: 'Produktionsstatistiken 2027'
        }
      ]
      
      await exportToMultiSheetXLSX(
        sheets,
        `produktion_komplett_${konfiguration.planungsjahr}`,
        {
          author: 'MTB SCM Tool - WI3 Team',
          freezeHeader: true,
          autoFilter: true
        }
      )
    } catch (error) {
      console.error('Fehler beim Multi-Sheet Export:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header mit Export */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produktion & Warehouse</h1>
          <p className="text-muted-foreground mt-1">
            Produktionssteuerung mit Proportionaler Allokation • {formatNumber(konfiguration.jahresproduktion, 0)} Bikes/Jahr • Nur 4 Sattel-Varianten
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportLager}>
            <Download className="h-4 w-4 mr-2" />
            CSV Export
          </Button>
          <Button variant="outline" onClick={handleExportWarehouseXLSX}>
            <Download className="h-4 w-4 mr-2" />
            Excel Export
          </Button>
          <Button variant="outline" onClick={handleExportAlles}>
            <Download className="h-4 w-4 mr-2" />
            Alles (XLSX)
          </Button>
          <Button variant="outline" onClick={handleExportProduktion}>
            <Download className="h-4 w-4 mr-2" />
            Statistik (JSON)
          </Button>
        </div>
      </div>

      {/* Aktive Szenarien Banner */}
      <ActiveScenarioBanner showDetails={false} />

      {/* ✅ SZENARIEN AKTIV: Zeige Auswirkungen auf Produktion */}
      {hasSzenarien && (
        <CollapsibleInfo
          title={`Szenarien aktiv (${aktiveSzenarienCount})`}
          variant="success"
          icon={<Zap className="h-5 w-5" />}
          defaultOpen={true}
        >
          <div className="text-sm text-green-800">
            <p className="mb-3">
              <strong>✅ Szenarien wirken sich auf Produktion & Lager aus!</strong> Die Werte zeigen 
              die Auswirkungen der aktiven Szenarien im Vergleich zum Baseline-Plan.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-green-300">
              <div>
                <div className="text-xs text-green-600">Produktion Delta</div>
                <DeltaBadge delta={statistiken.deltaProduziert} suffix=" Bikes" />
              </div>
              <div>
                <div className="text-xs text-green-600">Planerfüllung</div>
                <DeltaBadge delta={statistiken.deltaPlanerfuellungsgrad} suffix="%" />
              </div>
              <div>
                <div className="text-xs text-green-600">Materialmangel</div>
                <DeltaBadge delta={statistiken.deltaMitMaterialmangel} suffix=" Tage" inverseLogic={true} />
              </div>
              <div>
                <div className="text-xs text-green-600">Auslastung</div>
                <DeltaBadge delta={statistiken.deltaAuslastung} suffix="%" />
              </div>
            </div>
          </div>
        </CollapsibleInfo>
      )}

      {/* ✅ KONSOLIDIERTE INFO-BOXEN */}
      <CollapsibleInfoGroup
        groupTitle="Produktionslogik & Konzepte"
        items={[
          {
            id: 'proportional',
            title: 'Proportionale Allokation (Gewichtungsprinzip)',
            icon: <Factory className="h-4 w-4" />,
            variant: 'info',
            content: (
              <div className="space-y-3">
                <p className="text-sm text-blue-700">
                  <strong>NEU:</strong> Faire prozentuale Verteilung bei Materialengpass statt FCFS
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>
                    <strong>Schritt 1: ATP-Check</strong> - Prüfe für jeden Produktionsauftrag: 
                    Ist genug Material im Lager?
                  </li>
                  <li>
                    <strong>Schritt 2a: Genug Material</strong> - Alle Varianten erhalten 100%
                  </li>
                  <li>
                    <strong>Schritt 2b: Engpass</strong> - Proportionale Verteilung: 
                    Jede Variante erhält gleichen % Anteil (z.B. 50% bei halber Verfügbarkeit)
                  </li>
                  <li>
                    <strong>Fair:</strong> Keine Variante wird bevorzugt oder komplett ausgeschlossen
                  </li>
                </ol>
                <p className="text-xs text-blue-600 mt-2">
                  Beispiel: 4 Varianten je 500 benötigt = 2000 gesamt, nur 1000 verfügbar → Jede bekommt 250 (50%)
                </p>
              </div>
            )
          },
          {
            id: 'atp',
            title: 'ATP-Check (Available-to-Promise)',
            icon: <Package className="h-4 w-4" />,
            variant: 'info',
            content: (
              <div className="text-sm text-blue-800">
                <p className="mb-2">
                  Für jede Komponente in der Stückliste wird geprüft:
                </p>
                <code className="bg-blue-100 px-3 py-2 rounded block">
                  Verfügbar im Lager ≥ Benötigt für Auftrag
                </code>
                <p className="mt-2 text-xs text-blue-600">
                  Diese Prüfung erfolgt VOR jedem Produktionsstart und verhindert negative Lagerbestände.
                </p>
              </div>
            )
          }
        ]}
        variant="info"
        icon={<Info className="h-5 w-5" />}
        defaultOpen={false}
      />

      {/* Übersicht Cards - MIT SZENARIO-DELTAS */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={hasSzenarien ? 'border-green-200' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Geplante Produktion
                {hasSzenarien && <Zap className="h-3 w-3 inline ml-1 text-green-600" />}
              </CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <DeltaCell 
              value={produktionsStats.geplant} 
              delta={hasSzenarien ? statistiken.deltaGeplant : 0}
            />
            <p className="text-xs text-muted-foreground">MTBs Jahresplan</p>
          </CardContent>
        </Card>

        <Card className={hasSzenarien ? 'border-green-200' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Tatsächlich produziert
                {hasSzenarien && <Zap className="h-3 w-3 inline ml-1 text-green-600" />}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <DeltaCell 
              value={produktionsStats.produziert}
              delta={hasSzenarien ? statistiken.deltaProduziert : 0}
            />
            <p className="text-xs text-muted-foreground">
              {formatNumber(produktionsStats.planerfuellungsgrad, 2)}% Planerfüllung
            </p>
          </CardContent>
        </Card>

        <Card className={hasSzenarien && statistiken.deltaMitMaterialmangel > 0 ? 'border-red-200' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Materialmangel
                {hasSzenarien && statistiken.deltaMitMaterialmangel !== 0 && <Zap className="h-3 w-3 inline ml-1 text-orange-600" />}
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <DeltaCell 
              value={produktionsStats.mitMaterialmangel}
              delta={hasSzenarien ? statistiken.deltaMitMaterialmangel : 0}
              inverseLogic={true}
            />
            <p className="text-xs text-muted-foreground">Tage betroffen</p>
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

      {/* SEKTION 1: PRODUKTIONSSTEUERUNG */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Factory className="h-6 w-6 text-purple-600" />
            <CardTitle className="text-purple-900 text-xl">PRODUKTIONSSTEUERUNG (Production Control)</CardTitle>
          </div>
          <CardDescription className="text-purple-700">
            Granulare Tagesplanung über 365 Tage mit Saisonalität (Jan {konfiguration.saisonalitaet[0].anteil}%, Apr {konfiguration.saisonalitaet[3].anteil}% Peak, Dez {konfiguration.saisonalitaet[11].anteil}%) und Error Management für exakte {formatNumber(konfiguration.jahresproduktion, 0)} Bikes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ✅ NEU: Zeitperioden-Schalter + Export-Buttons */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-purple-900">Tagesproduktion über das Jahr</h4>
            <div className="flex gap-2">
              {/* Zeitperioden-Toggle */}
              <div className="flex gap-1 mr-4">
                <Button
                  variant={zeitperiodeProduktion === 'tag' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setZeitperiodeProduktion('tag')}
                  className={zeitperiodeProduktion === 'tag' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Tag
                </Button>
                <Button
                  variant={zeitperiodeProduktion === 'woche' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setZeitperiodeProduktion('woche')}
                  className={zeitperiodeProduktion === 'woche' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  KW
                </Button>
                <Button
                  variant={zeitperiodeProduktion === 'monat' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setZeitperiodeProduktion('monat')}
                  className={zeitperiodeProduktion === 'monat' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                <CalendarRange className="h-4 w-4 mr-1" />
                Monat
              </Button>
              </div>
              {/* ✅ NEU: Export-Buttons für Produktionssteuerung */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportProduktionssteuerungCSV}
              >
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportProduktionssteuerungXLSX}
              >
                <Download className="h-4 w-4 mr-1" />
                XLSX
              </Button>
            </div>
          </div>
          
          {/* ✅ TABELLE ZUERST (User-Anforderung: Tabellen vor Erklärungen) */}
          {/* ✅ DYNAMISCHE ANZEIGE: Tag / Woche / Monat */}
          {zeitperiodeProduktion === 'tag' && (
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
                format: (val) => val instanceof Date ? val.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : val,
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
                format: (val, row) => {
                  // An Nicht-Arbeitstagen: "-" anzeigen
                  if (row && row.istArbeitstag === false) return '-'
                  // An Arbeitstagen: Schichten anzeigen (auch 0)
                  return val > 0 ? val + ' Schicht(en)' : '0'
                },
                sumable: true
              },
              {
                key: 'planMenge',
                label: 'Plan-Menge',
                width: '110px',
                align: 'right',
                format: (val, row) => {
                  // An Nicht-Arbeitstagen: "-" anzeigen
                  if (row && row.istArbeitstag === false) return '-'
                  // An Arbeitstagen: Menge anzeigen (auch 0)
                  return formatNumber(val, 0) + ' Bikes'
                },
                sumable: true
              },
              {
                key: 'istMenge',
                label: 'Ist-Menge',
                width: '110px',
                align: 'right',
                format: (val, row) => {
                  // An Nicht-Arbeitstagen: "-" anzeigen
                  if (row && row.istArbeitstag === false) return '-'
                  // An Arbeitstagen: Menge anzeigen (auch 0)
                  return formatNumber(val, 0) + ' Bikes'
                },
                sumable: true
              },
              {
                key: 'abweichung',
                label: 'Abweichung',
                width: '100px',
                align: 'right',
                formula: 'Ist - Plan',
                format: (val, row) => {
                  // An Nicht-Arbeitstagen: "-" anzeigen
                  if (row && row.istArbeitstag === false) return '-'
                  // An Arbeitstagen: Abweichung anzeigen
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
                format: (val, row) => {
                  // An Nicht-Arbeitstagen zeigen wir "-"
                  if (row && row.istArbeitstag === false) return '-'
                  // Boolean zu Ja/Nein konvertieren
                  if (val === true) return '✅ Ja'
                  if (val === false) return '❌ Nein'
                  return '-'
                },
                sumable: false
              },
              {
                key: 'backlog',
                label: 'Backlog',
                width: '100px',
                align: 'right',
                formula: 'Σ(Bedarf - Bestellt)',
                format: (val, row) => {
                  // ✅ FIX: An Nicht-Arbeitstagen "-" anzeigen statt Backlog-Wert
                  // Der Backlog wird nur an Arbeitstagen auf-/abgebaut
                  if (row && row.istArbeitstag === false) return '-'
                  return val > 0 ? formatNumber(val, 0) + ' Stk' : '0'
                },
                sumable: false
              },
              {
                key: 'auslastung',
                label: 'Auslastung',
                width: '100px',
                align: 'right',
                formula: '(Ist / Plan) × 100',
                format: (val, row) => {
                  // An Nicht-Arbeitstagen: "-" anzeigen
                  if (row && row.istArbeitstag === false) return '-'
                  // An Arbeitstagen: Auslastung anzeigen (auch 0%)
                  return formatNumber(val, 1) + ' %'
                },
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
            data={tagesProduktionFormatiert}
            maxHeight="600px"
            showFormulas={true}
            showSums={true}
            sumRowLabel={hatPostJahresendeTage 
              ? `SUMME (${maxTag} Tage, ${getArbeitstageProJahr()} Arbeitstage + ${maxTag - 365} Post-Jahresende)`
              : `SUMME (365 Tage, ${getArbeitstageProJahr()} Arbeitstage)`
            }
            dateColumnKey="datum"
            highlightRow={(row) => {
              // Markiere Tage > 365 als Post-Jahresende
              if (row.tag > 365) {
                return {
                  color: 'bg-amber-50 border-l-4 border-amber-400',
                  tooltip: `Post-Jahresende Tag ${row.tag} (${row.tag - 365} Tage nach 31.12.2027) - Backlog-Abbau`
                }
              }
              return null
            }}
          />
          )}
          
          {/* ✅ WOCHEN-ANSICHT */}
          {zeitperiodeProduktion === 'woche' && (
          <ExcelTable
            columns={[
              {
                key: 'kalenderwoche',
                label: 'KW',
                width: '60px',
                align: 'center',
                sumable: false
              },
              {
                key: 'startDatum',
                label: 'Von',
                width: '80px',
                align: 'center',
                format: (val) => val instanceof Date ? val.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : val,
                sumable: false
              },
              {
                key: 'endDatum',
                label: 'Bis',
                width: '80px',
                align: 'center',
                format: (val) => val instanceof Date ? val.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : val,
                sumable: false
              },
              {
                key: 'anzahlArbeitstage',
                label: 'AT',
                width: '50px',
                align: 'center',
                sumable: true
              },
              {
                key: 'schichten',
                label: 'Schichten',
                width: '80px',
                align: 'center',
                format: (val, row) => {
                  // Berechne Schichten basierend auf istMenge
                  if (!row) return '-'
                  const kapProSchicht = konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht
                  const schichten = Math.ceil(row.istMenge / kapProSchicht)
                  return schichten > 0 ? schichten.toString() : '-'
                },
                sumable: true
              },
              {
                key: 'planMenge',
                label: 'Plan-Menge',
                width: '110px',
                align: 'right',
                format: (val) => formatNumber(val, 0) + ' Bikes',
                sumable: true
              },
              {
                key: 'istMenge',
                label: 'Ist-Menge',
                width: '110px',
                align: 'right',
                format: (val) => formatNumber(val, 0) + ' Bikes',
                sumable: true
              },
              {
                key: 'abweichung',
                label: 'Abweichung',
                width: '100px',
                align: 'right',
                formula: 'Ist - Plan',
                format: (val, row) => {
                  if (!row) return '-'
                  const abw = row.istMenge - row.planMenge
                  if (abw === 0) return '±0'
                  const sign = abw > 0 ? '+' : ''
                  return sign + formatNumber(abw, 0)
                },
                sumable: true
              },
              {
                key: 'auslastung',
                label: 'Auslastung',
                width: '100px',
                align: 'right',
                format: (val, row) => {
                  // Berechne Auslastung
                  if (!row) return '-'
                  const kapProSchicht = konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht
                  const maxKap = Math.ceil(row.istMenge / kapProSchicht) * kapProSchicht
                  const ausl = maxKap > 0 ? (row.istMenge / maxKap) * 100 : 0
                  return formatNumber(ausl, 1) + ' %'
                },
                sumable: false
              },
              {
                key: 'kumulativPlan',
                label: 'Σ Plan',
                width: '110px',
                align: 'right',
                format: (val) => formatNumber(val, 0),
                sumable: false
              },
              {
                key: 'kumulativIst',
                label: 'Σ Ist',
                width: '110px',
                align: 'right',
                format: (val) => formatNumber(val, 0),
                sumable: false
              }
            ]}
            data={wochenProduktion}
            maxHeight="600px"
            showFormulas={true}
            showSums={true}
            sumRowLabel={`SUMME (${wochenProduktion.length} Wochen)`}
          />
          )}
          
          {/* ✅ MONATS-ANSICHT */}
          {zeitperiodeProduktion === 'monat' && (
          <ExcelTable
            columns={[
              {
                key: 'monatName',
                label: 'Monat',
                width: '100px',
                align: 'center',
                format: (val) => val,
                sumable: false
              },
              {
                key: 'anzahlArbeitstage',
                label: 'AT',
                width: '50px',
                align: 'center',
                sumable: true
              },
              {
                key: 'schichten',
                label: 'Schichten',
                width: '80px',
                align: 'center',
                format: (val, row) => {
                  // Berechne Schichten basierend auf istMenge
                  if (!row) return '-'
                  const kapProSchicht = konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht
                  const schichten = Math.ceil(row.istMenge / kapProSchicht)
                  return schichten > 0 ? schichten.toString() : '-'
                },
                sumable: true
              },
              {
                key: 'planMenge',
                label: 'Plan-Menge',
                width: '110px',
                align: 'right',
                format: (val) => formatNumber(val, 0) + ' Bikes',
                sumable: true
              },
              {
                key: 'istMenge',
                label: 'Ist-Menge',
                width: '110px',
                align: 'right',
                format: (val) => formatNumber(val, 0) + ' Bikes',
                sumable: true
              },
              {
                key: 'abweichung',
                label: 'Abweichung',
                width: '100px',
                align: 'right',
                formula: 'Ist - Plan',
                format: (val, row) => {
                  if (!row) return '-'
                  const abw = row.istMenge - row.planMenge
                  if (abw === 0) return '±0'
                  const sign = abw > 0 ? '+' : ''
                  return sign + formatNumber(abw, 0)
                },
                sumable: true
              },
              {
                key: 'auslastung',
                label: 'Auslastung',
                width: '100px',
                align: 'right',
                format: (val, row) => {
                  // Berechne Auslastung
                  if (!row) return '-'
                  const kapProSchicht = konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht
                  const maxKap = Math.ceil(row.istMenge / kapProSchicht) * kapProSchicht
                  const ausl = maxKap > 0 ? (row.istMenge / maxKap) * 100 : 0
                  return formatNumber(ausl, 1) + ' %'
                },
                sumable: false
              },
              {
                key: 'kumulativPlan',
                label: 'Σ Plan',
                width: '110px',
                align: 'right',
                format: (val) => formatNumber(val, 0),
                sumable: false
              },
              {
                key: 'kumulativIst',
                label: 'Σ Ist',
                width: '110px',
                align: 'right',
                format: (val) => formatNumber(val, 0),
                sumable: false
              }
            ]}
            data={monatsProduktion}
            maxHeight="600px"
            showFormulas={true}
            showSums={true}
            sumRowLabel={`SUMME (12 Monate)`}
          />
          )}
          
          {/* ✅ VISUALISIERUNGEN: Plan vs Ist + Backlog-Entwicklung */}
          <div className="mt-6 space-y-6">
            {/* Chart 1: Plan vs Ist Produktion (monatlich) */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="text-sm font-semibold mb-3">
                Plan vs. Ist Produktion (monatlich)
              </h4>
              <TagesproduktionChart
                daten={tagesProduktionFormatiert.map(t => ({
                  tag: t.tag,
                  datum: t.datum,
                  planMenge: t.planMenge,
                  istMenge: t.istMenge,
                  monat: t.monat
                }))}
                aggregation="monat"
                height={250}
                showDelta={true}
              />
            </div>
            
            {/* Chart 2: Backlog-Entwicklung (täglich mit Monats-X-Achse) */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Backlog-Entwicklung (täglich)
              </h4>
              <BacklogChart
                daten={tagesProduktionFormatiert.map(t => ({
                  tag: t.tag,
                  datum: t.datum,
                  backlog: typeof t.backlog === 'number' ? t.backlog : 0,
                  monat: t.monat
                }))}
                height={250}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Täglicher Produktions-Backlog (nicht produzierte Mengen aufgrund von Materialengpässen). X-Achse formatiert auf Monatsbasis für bessere Lesbarkeit.
              </p>
            </div>
          </div>
          
          {/* ✅ FORMEL-KARTEN NACH DER TABELLE UND CHART (User-Anforderung: Tabellen vor Erklärungen) */}
          <div className="mt-6">
            <CollapsibleInfoGroup
              groupTitle="Berechnungsformeln und Konzepte"
              items={[
                {
                  id: 'tagesproduktion',
                  title: 'Tagesproduktion mit Error Management',
                  icon: <Factory className="h-4 w-4" />,
                  variant: 'info',
                  content: (
                    <div className="space-y-2 text-sm">
                      <div className="bg-blue-100 px-3 py-2 rounded font-mono text-xs">
                        Jahresproduktion / Arbeitstage = {formatNumber(konfiguration.jahresproduktion, 0)} / {getArbeitstageProJahr()} = {formatNumber(konfiguration.jahresproduktion / getArbeitstageProJahr(), 2)} Bikes/Tag (Ø)
                      </div>
                      <p className="text-blue-800">
                        Tatsächliche Produktion variiert durch Saisonalität und Error Management zur Vermeidung von Rundungsfehlern.
                      </p>
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        <strong>Beispiel:</strong> Jan-März (Q1): ca. {formatNumber((konfiguration.jahresproduktion / getArbeitstageProJahr()) * 0.7, 0)} Bikes/Tag
                      </div>
                    </div>
                  )
                },
                {
                  id: 'schichtplanung',
                  title: 'Schichtplanung & Kapazität',
                  icon: <Factory className="h-4 w-4" />,
                  variant: 'info',
                  content: (
                    <div className="space-y-2 text-sm">
                      <div className="bg-blue-100 px-3 py-2 rounded font-mono text-xs">
                        Schichten = ⌈Plan / {konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht}⌉
                      </div>
                      <p className="text-blue-800">
                        Berechnung der benötigten Schichten basierend auf Tagesproduktion und Werkskapazität.
                      </p>
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        <strong>Beispiel:</strong> {formatNumber(konfiguration.jahresproduktion / getArbeitstageProJahr(), 0)} Bikes → {Math.ceil((konfiguration.jahresproduktion / getArbeitstageProJahr()) / (konfiguration.produktion.kapazitaetProStunde * konfiguration.produktion.stundenProSchicht))} Schichten
                      </div>
                    </div>
                  )
                },
                {
                  id: 'error-management',
                  title: 'Error Management (Rundungsfehler-Korrektur)',
                  icon: <AlertTriangle className="h-4 w-4" />,
                  variant: 'success',
                  content: (
                    <div className="space-y-2 text-sm">
                      <div className="bg-green-100 px-3 py-2 rounded font-mono text-xs">
                        Kumulativer Fehler ≥ ±0.5 → Korrektur durch Auf-/Abrunden
                      </div>
                      <p className="text-green-800">
                        Verhindert systematische Abweichung von ±100 Bikes. Validierung: Summe = exakt 370.000 Bikes.
                      </p>
                      <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        <strong>Validierung:</strong> Jahressumme exakt 370.000 Bikes ✓
                      </div>
                    </div>
                  )
                }
              ]}
              variant="info"
              icon={<Info className="h-5 w-5" />}
              defaultOpen={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* SEKTION 2: WAREHOUSE / LAGER - TAGESBASIS */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-900 text-xl">WAREHOUSE / LAGER (Inventory Management) - Tagesbasis</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            Tägliche Lagerbewegungen über 365 Tage: Anfangsbestand + Zugänge - Verbrauch = Endbestand. 
            Mit Reichweitenberechnung für alle 4 Sattel-Varianten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ✅ NEU: Zeitperioden-Schalter */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-green-900">Lagerbestandsentwicklung über das Jahr</h4>
            <div className="flex gap-2">
              <Button
                variant={zeitperiodeWarehouse === 'tag' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setZeitperiodeWarehouse('tag')}
                className={zeitperiodeWarehouse === 'tag' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Tag
              </Button>
              <Button
                variant={zeitperiodeWarehouse === 'woche' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setZeitperiodeWarehouse('woche')}
                className={zeitperiodeWarehouse === 'woche' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <CalendarDays className="h-4 w-4 mr-1" />
                KW
              </Button>
              <Button
                variant={zeitperiodeWarehouse === 'monat' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setZeitperiodeWarehouse('monat')}
                className={zeitperiodeWarehouse === 'monat' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <CalendarRange className="h-4 w-4 mr-1" />
                Monat
              </Button>
            </div>
          </div>
          
          {/* ✅ TABELLE ZUERST (User-Anforderung: Tabellen vor Erklärungen) */}
          <div className="mb-6">
            <p className="text-sm text-green-700 mb-4">
              <strong>Detaillierte Lagerbewegungen:</strong> Anfangsbestand + Zugang - Verbrauch = Endbestand. 
              Zeigt Reichweite und Status für alle 4 Sattel-Varianten.
            </p>
            
            {/* Detaillierte Tabelle: Pro Komponente alle Bewegungen */}
            {zeitperiodeWarehouse === 'tag' && (
            <ExcelTable
              columns={[
                {
                  key: 'tag',
                  label: 'Tag',
                  width: '50px',
                  align: 'center',
                  sumable: false
                },
                {
                  key: 'datum',
                  label: 'Datum',
                  width: '75px',
                  align: 'center',
                  format: (val) => val instanceof Date ? val.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : val,
                  sumable: false
                },
                {
                  key: 'wochentag',
                  label: 'WT',
                  width: '45px',
                  align: 'center',
                  sumable: false
                },
                {
                  key: 'komponente',
                  label: 'Komponente',
                  width: '110px',
                  align: 'left',
                  sumable: false
                },
                {
                  key: 'anfangsBestand',
                  label: 'Anfang',
                  width: '85px',
                  align: 'right',
                  formula: 'Bestand Vortag',
                  format: (val) => formatNumber(val, 0),
                  sumable: false
                },
                {
                  key: 'zugang',
                  label: 'Zugang',
                  width: '85px',
                  align: 'right',
                  formula: 'Lieferung',
                  format: (val) => val > 0 ? '+' + formatNumber(val, 0) : '-',
                  sumable: false
                },
                {
                  key: 'verbrauch',
                  label: 'Verbrauch',
                  width: '90px',
                  align: 'right',
                  formula: 'Produktion',
                  format: (val) => val > 0 ? '-' + formatNumber(val, 0) : '-',
                  sumable: false
                },
                {
                  key: 'endBestand',
                  label: 'Endbestand',
                  width: '100px',
                  align: 'right',
                  formula: 'Anfang + Zugang - Verbrauch',
                  format: (val) => formatNumber(val, 0),
                  sumable: false
                },
                {
                  key: 'reichweite',
                  label: 'Reichweite',
                  width: '90px',
                  align: 'right',
                  formula: 'Endbestand / Tagesbedarf',
                  format: (val) => formatNumber(val, 1) + ' Tage',
                  sumable: false
                },
                {
                  key: 'status',
                  label: 'Status',
                  width: '80px',
                  align: 'center',
                  format: (val) => {
                    if (val === 'kritisch') return '🔴 Kritisch'
                    if (val === 'niedrig') return '🟡 Niedrig'
                    if (val === 'hoch') return '🔵 Hoch'
                    return '🟢 OK'
                  },
                  sumable: false
                }
              ]}
              data={tagesLagerbestaende.flatMap(tag => {
                return tag.bauteile.map(bauteil => ({
                  tag: tag.tag,
                  datum: tag.datum,
                  wochentag: tag.wochentag,
                  komponente: bauteil.bauteilName,
                  anfangsBestand: bauteil.anfangsBestand,
                  zugang: bauteil.zugang,
                  verbrauch: bauteil.verbrauch,
                  endBestand: bauteil.endBestand,
                  reichweite: bauteil.reichweite,
                  status: bauteil.status
                }))
              })}
              maxHeight="600px"
              showFormulas={true}
              showSums={false}
              dateColumnKey="datum"
              highlightRow={(row) => {
                // Markiere Tage > 365 als Post-Jahresende
                if (row.tag > 365) {
                  return {
                    color: 'bg-amber-50 border-l-4 border-amber-400',
                    tooltip: `Post-Jahresende Tag ${row.tag} (${row.tag - 365} Tage nach 31.12.2027) - Backlog-Abbau`
                  }
                }
                return null
              }}
            />
            )}
            
            {/* ✅ WOCHEN-ANSICHT */}
            {zeitperiodeWarehouse === 'woche' && (
            <ExcelTable
              columns={[
                {
                  key: 'woche',
                  label: 'KW',
                  width: '60px',
                  align: 'center',
                  sumable: false
                },
                {
                  key: 'startDatum',
                  label: 'Von',
                  width: '80px',
                  align: 'center',
                  format: (val) => val instanceof Date ? val.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : val,
                  sumable: false
                },
                {
                  key: 'endDatum',
                  label: 'Bis',
                  width: '80px',
                  align: 'center',
                  format: (val) => val instanceof Date ? val.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : val,
                  sumable: false
                },
                {
                  key: 'komponente',
                  label: 'Komponente',
                  width: '110px',
                  align: 'left',
                  sumable: false
                },
                {
                  key: 'zugang',
                  label: 'Zugang',
                  width: '90px',
                  align: 'right',
                  formula: 'Σ Lieferungen',
                  format: (val) => val > 0 ? '+' + formatNumber(val, 0) : '-',
                  sumable: false
                },
                {
                  key: 'verbrauch',
                  label: 'Verbrauch',
                  width: '100px',
                  align: 'right',
                  formula: 'Σ Produktion',
                  format: (val) => val > 0 ? '-' + formatNumber(val, 0) : '-',
                  sumable: false
                },
                {
                  key: 'endBestand',
                  label: 'Endbestand',
                  width: '110px',
                  align: 'right',
                  format: (val) => formatNumber(val, 0),
                  sumable: false
                },
                {
                  key: 'reichweite',
                  label: 'Reichweite',
                  width: '100px',
                  align: 'right',
                  format: (val) => formatNumber(val, 1) + ' Tage',
                  sumable: false
                },
                {
                  key: 'status',
                  label: 'Status',
                  width: '90px',
                  align: 'center',
                  format: (val) => {
                    if (val === 'kritisch') return '🔴 Kritisch'
                    if (val === 'niedrig') return '🟡 Niedrig'
                    if (val === 'hoch') return '🔵 Hoch'
                    return '🟢 OK'
                  },
                  sumable: false
                }
              ]}
              data={wochenLagerbestaende.flatMap(woche => {
                return woche.bauteile.map(bauteil => ({
                  woche: woche.woche,
                  startDatum: woche.startDatum,
                  endDatum: woche.endDatum,
                  komponente: bauteil.bauteilName,
                  zugang: bauteil.zugang,
                  verbrauch: bauteil.verbrauch,
                  endBestand: bauteil.endBestand,
                  reichweite: bauteil.reichweite,
                  status: bauteil.status
                }))
              })}
              maxHeight="600px"
              showFormulas={true}
              showSums={false}
            />
            )}
            
            {/* ✅ MONATS-ANSICHT */}
            {zeitperiodeWarehouse === 'monat' && (
            <ExcelTable
              columns={[
                {
                  key: 'monatName',
                  label: 'Monat',
                  width: '100px',
                  align: 'center',
                  sumable: false
                },
                {
                  key: 'komponente',
                  label: 'Komponente',
                  width: '110px',
                  align: 'left',
                  sumable: false
                },
                {
                  key: 'zugang',
                  label: 'Zugang',
                  width: '100px',
                  align: 'right',
                  formula: 'Σ Lieferungen',
                  format: (val) => val > 0 ? '+' + formatNumber(val, 0) : '-',
                  sumable: false
                },
                {
                  key: 'verbrauch',
                  label: 'Verbrauch',
                  width: '110px',
                  align: 'right',
                  formula: 'Σ Produktion',
                  format: (val) => val > 0 ? '-' + formatNumber(val, 0) : '-',
                  sumable: false
                },
                {
                  key: 'endBestand',
                  label: 'Endbestand',
                  width: '120px',
                  align: 'right',
                  format: (val) => formatNumber(val, 0),
                  sumable: false
                },
                {
                  key: 'reichweite',
                  label: 'Reichweite',
                  width: '110px',
                  align: 'right',
                  format: (val) => formatNumber(val, 1) + ' Tage',
                  sumable: false
                },
                {
                  key: 'status',
                  label: 'Status',
                  width: '100px',
                  align: 'center',
                  format: (val) => {
                    if (val === 'kritisch') return '🔴 Kritisch'
                    if (val === 'niedrig') return '🟡 Niedrig'
                    if (val === 'hoch') return '🔵 Hoch'
                    return '🟢 OK'
                  },
                  sumable: false
                }
              ]}
              data={monatsLagerbestaende.flatMap(monat => {
                return monat.bauteile.map(bauteil => ({
                  monatName: monat.monatName,
                  komponente: bauteil.bauteilName,
                  zugang: bauteil.zugang,
                  verbrauch: bauteil.verbrauch,
                  endBestand: bauteil.endBestand,
                  reichweite: bauteil.reichweite,
                  status: bauteil.status
                }))
              })}
              maxHeight="600px"
              showFormulas={true}
              showSums={false}
            />
            )}
            
            {/* ✅ VISUALISIERUNG: Lagerbestandsentwicklung */}
            <div className="mt-6">
              <LagerbestandChart
                daten={lagerbestandChartDaten}
                aggregation="woche"
                height={300}
              />
            </div>
            
            <p className="text-xs text-green-600 mt-3">
              💡 <strong>Hinweis:</strong> Je nach gewählter Ansicht (Tag/KW/Monat) werden die Daten entsprechend aggregiert. 
              <strong>✅ Realistische Bestandsführung:</strong> Losgröße 500 Stück, 49 Tage Vorlaufzeit, Anfangsbestand = 0.
              Code-Referenz: src/lib/calculations/warehouse-management.ts → Funktion berechneIntegriertesWarehouse()
            </p>
          </div>

          {/* ✅ FORMEL-KARTEN NACH DER TABELLE (User-Anforderung: Tabellen vor Erklärungen) */}
          <div className="mt-6 space-y-4">
            <CollapsibleInfoGroup
              groupTitle="Berechnungsformeln und Konzepte"
              items={[
                {
                  id: 'lagerbewegung',
                  title: 'Lagerbewegung (Tagesbasis)',
                  icon: <Package className="h-4 w-4" />,
                  variant: 'success',
                  content: (
                    <div className="space-y-2 text-sm">
                      <div className="bg-green-100 px-3 py-2 rounded font-mono text-xs">
                        Endbestand = Anfangsbestand + Zugänge - Verbrauch
                      </div>
                      <p className="text-green-800">
                        Simuliert tägliche Lagerbewegungen über 365 Tage mit realistischen Losgrößen (500 Stück) und 49 Tage Vorlaufzeit. Anfangsbestand: 0 (Just-in-Time).
                      </p>
                      <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        <strong>Beispiel:</strong> Tag 100: Fizik Tundra Anfang 2.000, Zugang +0, Verbrauch -{formatNumber(Math.round(konfiguration.jahresproduktion * 0.52 / 365), 0)} → Endbestand {formatNumber(2000 - Math.round(konfiguration.jahresproduktion * 0.52 / 365), 0)}
                      </div>
                    </div>
                  )
                },
                {
                  id: 'reichweite',
                  title: 'Reichweite (Days of Supply)',
                  icon: <TrendingUp className="h-4 w-4" />,
                  variant: 'success',
                  content: (
                    <div className="space-y-2 text-sm">
                      <div className="bg-green-100 px-3 py-2 rounded font-mono text-xs">
                        Reichweite = Bestand / Tagesbedarf (in Tagen)
                      </div>
                      <p className="text-green-800">
                        Zeigt wie lange der aktuelle Bestand bei gegebenem Verbrauch reicht. SCOR-Metrik: Asset Management → Inventory Days of Supply.
                      </p>
                      <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        <strong>Beispiel:</strong> Fizik Tundra: Bestand 2.000 / Tagesbedarf 527 = 3,8 Tage Reichweite
                      </div>
                    </div>
                  )
                }
              ]}
              variant="success"
              icon={<Info className="h-5 w-5" />}
              defaultOpen={false}
            />
          </div>
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
              <div className="text-xs text-muted-foreground mt-1">9 AT + 30 KT</div>
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

    </div>
  )
}