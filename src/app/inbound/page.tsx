'use client'

/**
 * ========================================
 * INBOUND LOGISTIK - CHINA
 * ========================================
 * 
 * Verwaltung des China-Lieferanten mit:
 * - Vorlaufzeiten-Berechnung mit detailliertem Materialfluss
 * - Schiffe fahren NUR mittwochs ab Shanghai!
 * - LKWs fahren NICHT am Wochenende (Sa/So)
 * - Material verfügbar am NÄCHSTEN TAG nach Ankunft
 * - Spring Festival Berücksichtigung
 * - Losgrößen-Optimierung
 * - Proportionale Allokation statt FCFS
 * - Bestellplanung
 * 
 * ✅ NEU: Szenarien-Integration global wirksam!
 * ✅ Zeigt Deltas (+X / -X) bei Schiffsverspätungen etc.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Ship, Package, Download, Calendar, CalendarDays, CalendarRange, Zap, Plus, Info } from 'lucide-react'
import { CollapsibleInfo, CollapsibleInfoGroup, type InfoItem } from '@/components/ui/collapsible-info'
import { BestellungenChart } from '@/components/ui/table-charts'
import { formatNumber, addDays, toLocalISODateString } from '@/lib/utils'
import { exportToJSON } from '@/lib/export'
import ExcelTable from '@/components/excel-table'
import { useKonfiguration } from '@/contexts/KonfigurationContext'
import { ActiveScenarioBanner } from '@/components/ActiveScenarioBanner'
import { DeltaCell, DeltaBadge } from '@/components/DeltaCell'
import { useMemo, useState, useCallback } from 'react'
import { generiereAlleVariantenProduktionsplaene, type TagesProduktionEntry } from '@/lib/calculations/zentrale-produktionsplanung'
import { generiereTaeglicheBestellungen, erstelleZusatzbestellung, type TaeglicheBestellung } from '@/lib/calculations/inbound-china'
import { berechneBedarfsBacklog, type BedarfsBacklogErgebnis } from '@/lib/calculations/bedarfs-backlog-rechnung'
import { useSzenarioBerechnung } from '@/lib/hooks/useSzenarioBerechnung'
import { istDeutschlandFeiertag, ladeDeutschlandFeiertage } from '@/lib/kalender'
import { isWeekend, getWeekNumber } from '@/lib/utils'
import type { TagesProduktionsplan } from '@/types'

/**
 * Zeitperioden für die Ansichtswahl (Tag, Woche, Monat)
 */
type ZeitperiodeTyp = 'tag' | 'woche' | 'monat'

/**
 * Typ für eine Zeile in der Inbound-Tabelle
 */
interface InboundTableRow {
  bedarfsdatum: Date
  bedarfsdatumFormatiert: string
  bestelldatum: Date
  bestelldatumFormatiert: string
  istVorjahr: boolean
  vorlaufzeit: number | null
  vorlaufzeitFormatiert: string
  menge: number
  mengeFormatiert: string
  bestellmenge: number          // ✅ NEU: Tatsächliche Bestellmenge (Summe aller Komponenten)
  SAT_FT_bestellt: number
  SAT_RL_bestellt: number
  SAT_SP_bestellt: number
  SAT_SL_bestellt: number
  grund: string
  grundFormatiert: string
  erwarteteAnkunft: Date | null
  erwarteteAnkunftFormatiert: string
  status: string
  hatBestellung: boolean
  istWochenende: boolean
  istFeiertag: boolean
  feiertagName?: string
  // NEU: Backlog-Tracking
  tagesBedarf: number           // Bedarf für diesen Tag (aus OEM-Plan)
  akkumulierterBacklog: number  // Backlog der sich bis zu diesem Tag angehäuft hat
  // ✅ NEU: Bestellungs-IDs
  bestellungsIds?: string       // Komma-getrennte Liste von Bestellungs-IDs
  // ✅ NEU: Detaillierter Materialfluss (wie Referenz-Implementierung)
  produktionsstart?: string     // 1_Produktion_Fertig (Produktionsende bei Zulieferer)
  lkwAbfahrtChina?: string      // 2_Abfahrt_LKW_CN
  ankunftHafenChina?: string    // 3_Ankunft_Hafen_CN (Shanghai)
  schiffAbfahrt?: string        // 4_Abfahrt_Schiff (nur Mittwoch!)
  ankunftHafenDE?: string       // 5_Ankunft_Hafen_DE (Hamburg)
  verfuegbarAb?: string         // 6_Verfügbar_OEM (Verfügbarkeitsdatum)
}

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
  
  // ✅ NEU: State für Zeitperiode (Tag/Woche/Monat Toggle wie in OEM)
  const [zeitperiode, setZeitperiode] = useState<ZeitperiodeTyp>('tag')
  
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
     * Exakte Mengenverteilung (kein Aufrunden!)
     * Die Eingabe-Menge wird vom Benutzer bereits auf Losgröße gerundet 
     * (via step={losgroesse} im Input), daher keine weitere Aufrundung nötig.
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
      false,
      konfiguration.feiertage,
      lieferant.losgroesse
    )
    
    setZusatzBestellungen(prev => [...prev, neueBestellung])
    // Datum NICHT zurücksetzen, damit weitere Bestellungen mit ähnlichem Datum einfacher sind
    setNeueBestellungMenge('500')  // Nur Menge zurücksetzen
  }, [neueBestellungDatum, neueBestellungMenge, konfiguration.lieferant.gesamtVorlaufzeitTage])
  
  // Lieferant aus Konfiguration
  const lieferant = konfiguration.lieferant
  
  // Bereite Stücklisten-Map vor (für inbound-china Funktion)
  const stuecklistenMap = useMemo(() => {
    const map: Record<string, { komponenten: Record<string, { name: string; menge: number; einheit: string }> }> = {}
    konfiguration.stueckliste.forEach(s => {
      if (!map[s.mtbVariante]) {
        map[s.mtbVariante] = { komponenten: {} }
      }
      map[s.mtbVariante].komponenten[s.bauteilId] = {
        name: s.bauteilName,
        menge: s.menge,
        einheit: s.einheit
      }
    })
    return map
  }, [konfiguration.stueckliste])
  
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
    const result: Record<string, TagesProduktionsplan[]> = {}
    Object.entries(produktionsplaene).forEach(([varianteId, plan]) => {
      result[varianteId] = plan.tage.map(tag => ({
        datum: tag.datum,
        varianteId: varianteId,
        sollMenge: tag.planMenge,
        istMenge: tag.istMenge,
        kumulierterError: tag.monatsFehlerNachher,
        istMarketing: tag.istMarketing || false,
        marketingMenge: tag.marketingMenge
      }))
    })
    return result
  }, [produktionsplaene])
  
  // Berechne tägliche Bestellungen mit fixer Vorlaufzeit aus Konfiguration
  const generierteBestellungen = useMemo(() => {
    return generiereTaeglicheBestellungen(
      produktionsplaeneFormatiert, 
      konfiguration.planungsjahr,
      lieferant.gesamtVorlaufzeitTage, // Fixe Vorlaufzeit aus Konfiguration
      konfiguration.feiertage, // Feiertage aus Konfiguration
      stuecklistenMap, // Stücklisten aus Konfiguration
      lieferant.losgroesse, // Losgröße aus Konfiguration
      lieferant.lieferintervall // Lieferintervall aus Konfiguration
    )
  }, [produktionsplaeneFormatiert, konfiguration.planungsjahr, lieferant.gesamtVorlaufzeitTage, konfiguration.feiertage, stuecklistenMap, lieferant.losgroesse, lieferant.lieferintervall])
  
  // ✅ NEU: Berechne Bedarfs-Backlog-Rechnung mit dem neuen System
  // Zeigt für jeden Tag: Bedarf, Backlog, Bestellung, Materialverfügbarkeit
  const backlogErgebnis = useMemo(() => {
    // Konvertiere Produktionspläne zum richtigen Format (TagesProduktionEntry[])
    const plaeneAlsEntries: Record<string, TagesProduktionEntry[]> = {}
    Object.entries(produktionsplaene).forEach(([varianteId, plan]) => {
      plaeneAlsEntries[varianteId] = plan.tage
    })
    return berechneBedarfsBacklog(plaeneAlsEntries, konfiguration)
  }, [produktionsplaene, konfiguration])
  
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
   * Bestelllogik iteriert durch BEDARFSDATUM:
   * - Bedarfsdatum = wann Sättel im Werk benötigt werden (01.01.2027 - 31.12.2027)
   * - Bestelldatum = wann bestellt werden muss (49 Tage VOR Bedarfsdatum)
   * - Tatsächliche Ankunft = berechnet aus Bestelldatum + Vorlaufzeit
   * - NEU: Backlog = akkumulierte unbestellte Mengen
   */
  const alleTageMitBestellungen = useMemo(() => {
    const jahr = konfiguration.planungsjahr
    const vorlaufzeit = lieferant.gesamtVorlaufzeitTage
    // Deutsche Feiertage für Produktionsbedarf (Produktion findet in DEUTSCHLAND statt)
    const feiertage = ladeDeutschlandFeiertage()
    const alleTage: InboundTableRow[] = []
    
    // NEU: Berechne Backlog aus backlogErgebnis (Order-Backlog = warten auf Losgröße)
    const backlogProTag: Record<number, number> = {}
    const bedarfProTag: Record<number, number> = {}
    
    Object.values(backlogErgebnis.komponenten).forEach(komponente => {
      komponente.tagesDetails.forEach(detail => {
        if (!backlogProTag[detail.tag]) {
          backlogProTag[detail.tag] = 0
          bedarfProTag[detail.tag] = 0
        }
        backlogProTag[detail.tag] += detail.backlogNachher
        bedarfProTag[detail.tag] += detail.bedarf
      })
    })
    
    /**
     * Mehrere Bestellungen pro Bedarfsdatum aggregieren:
     * Sammle alle Bestellungen für denselben Tag, nicht überschreiben
     */
    const bestellungenNachBedarfsdatum = new Map<string, TaeglicheBestellung[]>()
    taeglicheBestellungen.forEach(b => {
      const bedarfsdatum = b.bedarfsdatum instanceof Date ? b.bedarfsdatum : new Date(b.bedarfsdatum)
      const key = toLocalISODateString(bedarfsdatum)
      
      const existing = bestellungenNachBedarfsdatum.get(key) || []
      existing.push(b)
      bestellungenNachBedarfsdatum.set(key, existing)
    })
    
    // Iteriere über alle BEDARFSDATEN des Jahres (01.01.2027 - 31.12.2027)
    const jahresTage = new Date(jahr, 11, 31).getDate() === 31 && 
                      new Date(jahr, 1, 29).getMonth() === 1 ? 366 : 365
    
    for (let tag = 1; tag <= jahresTage; tag++) {
      const bedarfsdatum = new Date(jahr, 0, tag)
      const bedarfsdatumKey = toLocalISODateString(bedarfsdatum)
      
      // Berechne wann für diesen Bedarf bestellt werden müsste (49 Tage vorher)
      const theoretischesBestelldatum = addDays(bedarfsdatum, -vorlaufzeit)
      
      // Prüfe Tag-Typ für Bedarfsdatum (Produktion in DEUTSCHLAND)
      const istWochenende = isWeekend(bedarfsdatum)
      const feiertag = istDeutschlandFeiertag(bedarfsdatum)
      const istFeiertag = feiertag.length > 0
      
      // An Feiertagen/Wochenenden gibt es keine Produktion, also auch keinen Bedarf
      const istProduktionsTag = !istWochenende && !istFeiertag
      
      // Nur an Produktionstagen nach Bestellungen suchen
      const bestellungenFuerTag = istProduktionsTag 
        ? bestellungenNachBedarfsdatum.get(bedarfsdatumKey) 
        : undefined
      
      const bedarfsdatumStr = bedarfsdatum.toLocaleDateString('de-DE')
      
      // NEU: Hole Backlog und Bedarf für diesen Tag
      const tagesBedarf = bedarfProTag[tag] || 0
      const akkumulierterBacklog = backlogProTag[tag] || 0
      
      if (istProduktionsTag && bestellungenFuerTag && bestellungenFuerTag.length > 0) {
        /**
         * Aggregiere mehrere Bestellungen für denselben Tag:
         * Summiere alle Mengen, zeige frühestes Bestelldatum
         */
        const gesamtMenge = bestellungenFuerTag.reduce((sum, b) => {
          return sum + Object.values(b.komponenten).reduce((s, m) => s + m, 0)
        }, 0)
        
        // Frühestes Bestelldatum finden (falls mehrere Bestellungen)
        const fruehestesBestelldatum = bestellungenFuerTag.reduce((fruehestes, b) => {
          const bDatum = b.bestelldatum instanceof Date ? b.bestelldatum : new Date(b.bestelldatum)
          return bDatum < fruehestes ? bDatum : fruehestes
        }, bestellungenFuerTag[0].bestelldatum instanceof Date 
            ? bestellungenFuerTag[0].bestelldatum 
            : new Date(bestellungenFuerTag[0].bestelldatum))
        
        // Erwartete Ankunft (von erster Bestellung)
        const bestellung = bestellungenFuerTag[0]
        const erwarteteAnkunft = bestellung.erwarteteAnkunft instanceof Date ? bestellung.erwarteteAnkunft : new Date(bestellung.erwarteteAnkunft)
        
        // Farbmarkierung basierend auf Bedarfsdatum-Typ
        const bedarfsdatumFormatiert = istFeiertag ? `🔴 ${bedarfsdatumStr}` : istWochenende ? `🟡 ${bedarfsdatumStr}` : `🟢 ${bedarfsdatumStr}`
        
        // Gründe kombinieren
        const gruende = [...new Set(bestellungenFuerTag.map(b => b.grund))]
        let grundFormatiert = ''
        if (bestellungenFuerTag.length > 1) {
          grundFormatiert = `✓ ${bestellungenFuerTag.length} Bestellungen (${gruende.join(', ')})`
        } else if (bestellung.grund === 'losgroesse') {
          grundFormatiert = '✓ Bestellung (Losgröße erreicht)'
        } else if (bestellung.grund === 'zusatzbestellung') {
          grundFormatiert = '✓ Zusatzbestellung (manuell)'
        } else {
          grundFormatiert = '✓ Bestellung'
        }
        
        // ✅ NEU: Aggregiere Komponenten-Details für alle Bestellungen
        const komponentenAggregiert: Record<string, number> = {}
        bestellungenFuerTag.forEach(b => {
          Object.entries(b.komponenten).forEach(([kompId, menge]) => {
            komponentenAggregiert[kompId] = (komponentenAggregiert[kompId] || 0) + menge
          })
        })
        
        // ✅ NEU: Sammle Bestellungs-IDs
        const bestellungsIds = bestellungenFuerTag.map(b => b.id).join(', ')
        
        // ✅ NEU: Extrahiere Materialfluss-Details von der ersten Bestellung
        const materialfluss = bestellung.materialfluss
        
        alleTage.push({
          bedarfsdatum,
          bedarfsdatumFormatiert,
          bestelldatum: fruehestesBestelldatum,
          bestelldatumFormatiert: fruehestesBestelldatum.toLocaleDateString('de-DE'),
          istVorjahr: bestellung.istVorjahr,
          vorlaufzeit: vorlaufzeit,
          vorlaufzeitFormatiert: `${vorlaufzeit} Tage`,
          menge: tagesBedarf,  // ✅ TÄGLICHER OEM-BEDARF (nicht Losgröße!)
          mengeFormatiert: formatNumber(tagesBedarf, 0) + ' Sättel (OEM-Bedarf)',
          bestellmenge: gesamtMenge,  // ✅ NEU: Tatsächliche Bestellmenge (Losgröße-basiert)
          // ✅ NEU: Komponenten-Details einzeln
          SAT_FT_bestellt: komponentenAggregiert['SAT_FT'] || 0,
          SAT_RL_bestellt: komponentenAggregiert['SAT_RL'] || 0,
          SAT_SP_bestellt: komponentenAggregiert['SAT_SP'] || 0,
          SAT_SL_bestellt: komponentenAggregiert['SAT_SL'] || 0,
          grund: bestellung.grund,
          grundFormatiert,
          erwarteteAnkunft,
          erwarteteAnkunftFormatiert: erwarteteAnkunft.toLocaleDateString('de-DE'),
          status: bestellung.status,
          hatBestellung: true,
          istWochenende,
          istFeiertag,
          feiertagName: istFeiertag ? feiertag[0].name : undefined,
          // NEU: Backlog-Tracking
          tagesBedarf,
          akkumulierterBacklog,
          // ✅ NEU: Bestellungs-IDs
          bestellungsIds,
          // ✅ NEU: Detaillierter Materialfluss (wie Referenz-Implementierung)
          produktionsstart: materialfluss?.produktionsende 
            ? (materialfluss.produktionsende instanceof Date 
                ? materialfluss.produktionsende.toLocaleDateString('de-DE') 
                : new Date(materialfluss.produktionsende).toLocaleDateString('de-DE'))
            : undefined,
          lkwAbfahrtChina: materialfluss?.lkwAbfahrtChina
            ? (materialfluss.lkwAbfahrtChina instanceof Date
                ? materialfluss.lkwAbfahrtChina.toLocaleDateString('de-DE')
                : new Date(materialfluss.lkwAbfahrtChina).toLocaleDateString('de-DE'))
            : undefined,
          ankunftHafenChina: materialfluss?.ankunftHafenShanghai
            ? (materialfluss.ankunftHafenShanghai instanceof Date
                ? materialfluss.ankunftHafenShanghai.toLocaleDateString('de-DE')
                : new Date(materialfluss.ankunftHafenShanghai).toLocaleDateString('de-DE'))
            : undefined,
          schiffAbfahrt: bestellung.schiffAbfahrtMittwoch
            ? (bestellung.schiffAbfahrtMittwoch instanceof Date
                ? bestellung.schiffAbfahrtMittwoch.toLocaleDateString('de-DE') + ' (Mi)'
                : new Date(bestellung.schiffAbfahrtMittwoch).toLocaleDateString('de-DE') + ' (Mi)')
            : undefined,
          ankunftHafenDE: materialfluss?.schiffAnkunftHamburg
            ? (materialfluss.schiffAnkunftHamburg instanceof Date
                ? materialfluss.schiffAnkunftHamburg.toLocaleDateString('de-DE')
                : new Date(materialfluss.schiffAnkunftHamburg).toLocaleDateString('de-DE'))
            : undefined,
          verfuegbarAb: bestellung.verfuegbarAb
            ? (bestellung.verfuegbarAb instanceof Date
                ? bestellung.verfuegbarAb.toLocaleDateString('de-DE')
                : new Date(bestellung.verfuegbarAb).toLocaleDateString('de-DE'))
            : undefined
        })
      } else {
        // Kein Bedarf/Keine Bestellung für dieses Datum - ermittle Grund
        let grund = 'Kein Bedarf (Losgröße noch nicht erreicht)'
        let grundFormatiert = '⚠️ Losgröße nicht erreicht'
        
        if (istWochenende) {
          grund = 'Wochenende (keine Produktion)'
          grundFormatiert = '❌ Wochenende (keine Produktion)'
        } else if (istFeiertag) {
          grund = `Feiertag: ${feiertag[0].name}`
          grundFormatiert = `❌ Feiertag: ${feiertag[0].name}`
        }
        
        const bedarfsdatumFormatiert = istFeiertag ? `🔴 ${bedarfsdatumStr}` : istWochenende ? `🟡 ${bedarfsdatumStr}` : `⚪ ${bedarfsdatumStr}`
        
        alleTage.push({
          bedarfsdatum,
          bedarfsdatumFormatiert,
          bestelldatum: theoretischesBestelldatum,
          bestelldatumFormatiert: theoretischesBestelldatum.toLocaleDateString('de-DE'),
          istVorjahr: theoretischesBestelldatum.getFullYear() < jahr,
          vorlaufzeit: null,
          vorlaufzeitFormatiert: '-',
          menge: 0,
          mengeFormatiert: '-',
          bestellmenge: 0,  // ✅ NEU: Keine Bestellung = 0
          // ✅ NEU: Komponenten-Details für Tage ohne Bestellung = 0
          SAT_FT_bestellt: 0,
          SAT_RL_bestellt: 0,
          SAT_SP_bestellt: 0,
          SAT_SL_bestellt: 0,
          grund,
          grundFormatiert,
          erwarteteAnkunft: null,
          erwarteteAnkunftFormatiert: '-',
          status: '-',
          hatBestellung: false,
          istWochenende,
          istFeiertag,
          feiertagName: istFeiertag ? feiertag[0].name : undefined,
          // NEU: Backlog-Tracking
          tagesBedarf,
          akkumulierterBacklog
        })
      }
    }
    
    return alleTage
  }, [taeglicheBestellungen, konfiguration.planungsjahr, lieferant.gesamtVorlaufzeitTage, backlogErgebnis])
  
  /**
   * ✅ NEU: Nur Bestellungen filtern (keine "Losgröße nicht erreicht" Zeilen)
   * Dies zeigt nur tatsächliche Bestellungen in der Tagesansicht
   */
  const nurBestellungen = useMemo(() => {
    return alleTageMitBestellungen.filter(row => row.hatBestellung)
  }, [alleTageMitBestellungen])
  
  /**
   * ✅ NEU: Bestellungen nach Kalenderwoche aggregieren
   */
  const bestellungenNachWoche = useMemo(() => {
    const wochenMap = new Map<number, {
      kalenderwoche: number
      jahr: number
      bestellungen: number
      gesamtMenge: number
      oemBedarf: number
      erstesBestelldatum: Date
      letztesBestelldatum: Date
    }>()
    
    nurBestellungen.forEach(row => {
      const kw = getWeekNumber(row.bedarfsdatum)
      const jahr = row.bedarfsdatum.getFullYear()
      const menge = Object.values({
        SAT_FT: row.SAT_FT_bestellt,
        SAT_RL: row.SAT_RL_bestellt,
        SAT_SP: row.SAT_SP_bestellt,
        SAT_SL: row.SAT_SL_bestellt
      }).reduce((sum, v) => sum + v, 0)
      
      if (!wochenMap.has(kw)) {
        wochenMap.set(kw, {
          kalenderwoche: kw,
          jahr,
          bestellungen: 0,
          gesamtMenge: 0,
          oemBedarf: 0,
          erstesBestelldatum: row.bestelldatum,
          letztesBestelldatum: row.bestelldatum
        })
      }
      
      const woche = wochenMap.get(kw)!
      woche.bestellungen++
      woche.gesamtMenge += menge
      woche.oemBedarf += row.tagesBedarf
      if (row.bestelldatum < woche.erstesBestelldatum) woche.erstesBestelldatum = row.bestelldatum
      if (row.bestelldatum > woche.letztesBestelldatum) woche.letztesBestelldatum = row.bestelldatum
    })
    
    return Array.from(wochenMap.values()).sort((a, b) => a.kalenderwoche - b.kalenderwoche)
  }, [nurBestellungen])
  
  /**
   * ✅ NEU: Bestellungen nach Monat aggregieren
   */
  const bestellungenNachMonat = useMemo(() => {
    const monatsnamen = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                         'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    const monatsMap = new Map<number, {
      monat: number
      monatName: string
      jahr: number
      bestellungen: number
      gesamtMenge: number
      oemBedarf: number
    }>()
    
    // Initialisiere alle Monate
    for (let m = 0; m < 12; m++) {
      monatsMap.set(m, {
        monat: m + 1,
        monatName: monatsnamen[m],
        jahr: konfiguration.planungsjahr,
        bestellungen: 0,
        gesamtMenge: 0,
        oemBedarf: 0
      })
    }
    
    nurBestellungen.forEach(row => {
      const monat = row.bedarfsdatum.getMonth()
      const menge = Object.values({
        SAT_FT: row.SAT_FT_bestellt,
        SAT_RL: row.SAT_RL_bestellt,
        SAT_SP: row.SAT_SP_bestellt,
        SAT_SL: row.SAT_SL_bestellt
      }).reduce((sum, v) => sum + v, 0)
      
      const entry = monatsMap.get(monat)!
      entry.bestellungen++
      entry.gesamtMenge += menge
      entry.oemBedarf += row.tagesBedarf
    })
    
    return Array.from(monatsMap.values()).sort((a, b) => a.monat - b.monat)
  }, [nurBestellungen, konfiguration.planungsjahr])
  
  /**
   * ✅ NEU: OEM-Bedarf Gesamtsumme (aus Produktionsplanung, NICHT aus Bestellungen)
   */
  const oemBedarfGesamt = useMemo(() => {
    return Object.values(produktionsplaene).reduce((sum, plan) => {
      return sum + plan.tage.reduce((s, tag) => s + tag.planMenge, 0)
    }, 0)
  }, [produktionsplaene])
  
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
                <CardTitle className="text-sm font-medium">Liefertreue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${backlogErgebnis.gesamtstatistik.liefertreue >= 95 ? 'text-green-600' : backlogErgebnis.gesamtstatistik.liefertreue >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {formatNumber(backlogErgebnis.gesamtstatistik.liefertreue, 1)}%
                </div>
                <p className="text-xs text-muted-foreground">Produziert / Bedarf</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Ø Backlog</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${backlogErgebnis.gesamtstatistik.durchschnittlicherBacklog < 250 ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatNumber(backlogErgebnis.gesamtstatistik.durchschnittlicherBacklog, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Sättel nicht sofort bestellt</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Engpass-Quote</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${backlogErgebnis.gesamtstatistik.engpassQuote < 10 ? 'text-green-600' : backlogErgebnis.gesamtstatistik.engpassQuote < 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {formatNumber(backlogErgebnis.gesamtstatistik.engpassQuote, 1)}%
                </div>
                <p className="text-xs text-muted-foreground">Tage mit Material-Engpass</p>
              </CardContent>
            </Card>
          </div>

          {/* ✅ BESTELLLOGIK MIT TAG/KW/MONAT TOGGLE */}
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Bestelllogik (Ordering)</h3>
                <p className="text-sm text-muted-foreground">
                  OEM-Bedarf Gesamt: <strong>{formatNumber(oemBedarfGesamt, 0)} Sättel</strong> | Bestellungen: <strong>{bestellStatistik.gesamt}</strong> | Losgröße: {lieferant.losgroesse}
                </p>
              </div>
              {/* Zeitperioden-Schalter */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1" role="group" aria-label="Zeitperioden-Auswahl">
                <Button
                  variant={zeitperiode === 'tag' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setZeitperiode('tag')}
                  className="gap-1"
                >
                  <Calendar className="h-4 w-4" />
                  Tag
                </Button>
                <Button
                  variant={zeitperiode === 'woche' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setZeitperiode('woche')}
                  className="gap-1"
                >
                  <CalendarDays className="h-4 w-4" />
                  Woche
                </Button>
                <Button
                  variant={zeitperiode === 'monat' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setZeitperiode('monat')}
                  className="gap-1"
                >
                  <CalendarRange className="h-4 w-4" />
                  Monat
                </Button>
              </div>
            </div>

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
                      {neueBestellungDatum && (
                        <p className="text-xs text-blue-600 mt-1">
                          Gewählt: {(() => {
                            const date = new Date(neueBestellungDatum);
                            return isNaN(date.getTime()) ? 'Ungültiges Datum' : date.toLocaleDateString('de-DE');
                          })()}
                        </p>
                      )}
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

            {/* ✅ MONATSANSICHT */}
            {zeitperiode === 'monat' && (
              <>
                <div className="mb-2 text-xs text-muted-foreground">
                  📅 Monatsansicht: Aggregierte Bestellungen pro Monat (Bestellmenge = OEM-Bedarf)
                </div>
                <ExcelTable
                  columns={[
                    { key: 'monatName', label: 'Monat', width: '120px', align: 'left', sumable: false },
                    { key: 'bestellungen', label: 'Bestellungen', width: '100px', align: 'right', sumable: true },
                    { key: 'gesamtMenge', label: 'Bestellmenge', width: '150px', align: 'right', sumable: true, format: (v: number) => formatNumber(v, 0) + ' Stk' }
                  ]}
                  data={bestellungenNachMonat}
                  maxHeight="600px"
                  showFormulas={false}
                  showSums={true}
                  sumRowLabel={`GESAMT: ${bestellStatistik.gesamt} Bestellungen`}
                />
              </>
            )}

            {/* ✅ WOCHENANSICHT */}
            {zeitperiode === 'woche' && (
              <>
                <div className="mb-2 text-xs text-muted-foreground">
                  📅 Wochenansicht: Aggregierte Bestellungen pro Kalenderwoche (Bestellmenge = OEM-Bedarf)
                </div>
                <ExcelTable
                  columns={[
                    { key: 'kalenderwoche', label: 'KW', width: '60px', align: 'center', sumable: false, format: (v: number) => `KW ${v}` },
                    { key: 'bestellungen', label: 'Best.', width: '70px', align: 'right', sumable: true },
                    { key: 'gesamtMenge', label: 'Bestellmenge', width: '150px', align: 'right', sumable: true, format: (v: number) => formatNumber(v, 0) + ' Stk' }
                  ]}
                  data={bestellungenNachWoche}
                  maxHeight="600px"
                  showFormulas={false}
                  showSums={true}
                  sumRowLabel={`GESAMT: ${bestellStatistik.gesamt} Bestellungen`}
                />
              </>
            )}

            {/* ✅ TAGESANSICHT */}
            {zeitperiode === 'tag' && (
              <>
                {/* Excel-Tabelle: Tägliche Bestelllogik mit detailliertem Materialfluss */}
                <div className="mb-2 text-xs text-muted-foreground">
                  ✅ Zeigt granulare Materialfluss-Stationen (0️⃣-7️⃣) | Vorlaufzeit = {gesamtVorlaufzeit} Tage
                </div>
                <ExcelTable
                  columns={[
                    {
                      key: 'bestellungsIds',
                      label: 'Bestellungs-ID(s)',
                      width: '140px',
                      align: 'left',
                      sumable: false,
                      format: (v: string) => v || '-'
                    },
                    {
                      key: 'bestelldatumFormatiert',
                      label: '0️⃣ Bestellung',
                      width: '110px',
                      align: 'center',
                      sumable: false
                    },
                    {
                      key: 'produktionsstart',
                      label: '1️⃣ Prod. Fertig',
                      width: '110px',
                      align: 'center',
                      sumable: false,
                      format: (v: string) => v || '-'
                    },
                    {
                      key: 'lkwAbfahrtChina',
                      label: '2️⃣ LKW ab CN',
                      width: '110px',
                      align: 'center',
                      sumable: false,
                      format: (v: string) => v || '-'
                    },
                    {
                      key: 'ankunftHafenChina',
                      label: '3️⃣ Hafen CN',
                      width: '110px',
                      align: 'center',
                      sumable: false,
                      format: (v: string) => v || '-'
                    },
                    {
                      key: 'schiffAbfahrt',
                      label: '4️⃣ Schiff ab',
                      width: '120px',
                      align: 'center',
                      sumable: false,
                      format: (v: string) => v || '-'
                    },
                    {
                      key: 'ankunftHafenDE',
                      label: '5️⃣ Hafen DE',
                      width: '110px',
                      align: 'center',
                      sumable: false,
                      format: (v: string) => v || '-'
                    },
                    {
                      key: 'erwarteteAnkunftFormatiert',
                      label: '6️⃣ Ank. Werk',
                      width: '110px',
                      align: 'center',
                      sumable: false
                    },
                    {
                      key: 'verfuegbarAb',
                      label: '7️⃣ Verfügbar',
                      width: '110px',
                      align: 'center',
                      sumable: false,
                      format: (v: string) => v || '-'
                    },
                    {
                      key: 'bestellmenge',
                      label: 'Bestellmenge',
                      width: '110px',
                      align: 'right',
                      sumable: true,
                      format: (v: number) => v > 0 ? formatNumber(v, 0) + ' Stk' : '-'
                    }
                  ]}
                  data={nurBestellungen}
                  maxHeight="600px"
                  showFormulas={false}
                  showSums={true}
                  sumRowLabel={`GESAMT: ${bestellStatistik.gesamt} Bestellungen, ${formatNumber(bestellStatistik.gesamtMenge, 0)} Sättel bestellt`}
                  dateColumnKey="bedarfsdatum"
                  highlightRow={(row) => {
                    // Verspätung = erwarteteAnkunft > bedarfsdatum
                    if (row.hatBestellung && row.erwarteteAnkunft && row.bedarfsdatum) {
                      const ankunft = row.erwarteteAnkunft instanceof Date 
                        ? row.erwarteteAnkunft 
                        : new Date(row.erwarteteAnkunft)
                      const bedarf = row.bedarfsdatum instanceof Date 
                        ? row.bedarfsdatum 
                        : new Date(row.bedarfsdatum)
                      
                      // Berechne Verspätung in Tagen
                      const verspaetungTage = Math.floor((ankunft.getTime() - bedarf.getTime()) / (1000 * 60 * 60 * 24))
                      
                      if (verspaetungTage > 0) {
                        // Verspätung: Rot/Orange je nach Schwere
                        if (verspaetungTage > 5) {
                          return {
                            color: 'bg-red-100 hover:bg-red-200 border-l-4 border-red-500',
                            tooltip: `⚠️ KRITISCHE VERSPÄTUNG: ${verspaetungTage} Tage zu spät!`
                          }
                        } else {
                          return {
                            color: 'bg-orange-100 hover:bg-orange-200 border-l-4 border-orange-500',
                            tooltip: `⚠️ Verspätung: ${verspaetungTage} Tag(e) zu spät`
                          }
                        }
                      }
                    }
                    return null
                  }}
                />
              </>
            )}

                {/* ✅ NEU: HAFEN & VERSAND LOGISTIK */}
                <div className="mt-8 bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Ship className="h-5 w-5 text-blue-600" />
                    Versand & Hafen Logistik
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Übersicht der Verschiffungen: Losgrößen-Bündelung am Hafen Shanghai, Schiff nur mittwochs, Lieferverlauf nach Dortmund
                  </p>
                  
                  {/* Versand-Statistik */}
                  <div className="grid gap-4 md:grid-cols-4 mb-4">
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-xs text-gray-500">Durchschn. Wartezeit Hafen</div>
                      <div className="text-xl font-bold text-blue-600">
                        {(() => {
                          const bestellungenMitWartezeit = taeglicheBestellungen.filter(b => b.wartetageAmHafen !== undefined)
                          const avg = bestellungenMitWartezeit.length > 0 
                            ? bestellungenMitWartezeit.reduce((sum, b) => sum + (b.wartetageAmHafen || 0), 0) / bestellungenMitWartezeit.length
                            : 0
                          return formatNumber(avg, 1) + ' Tage'
                        })()}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-xs text-gray-500">Schiffsabfahrten</div>
                      <div className="text-xl font-bold text-blue-600">
                        {(() => {
                          const uniqueMittwoche = new Set(
                            taeglicheBestellungen
                              .filter(b => b.schiffAbfahrtMittwoch)
                              .map(b => b.schiffAbfahrtMittwoch?.toISOString())
                          )
                          return uniqueMittwoche.size
                        })()} Mittwochs
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-xs text-gray-500">Gesamtmenge verschifft</div>
                      <div className="text-xl font-bold text-blue-600">
                        {formatNumber(bestellStatistik.gesamtMenge, 0)} Sättel
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-xs text-gray-500">Durchschn. Losgröße/Schiff</div>
                      <div className="text-xl font-bold text-blue-600">
                        {(() => {
                          const uniqueMittwoche = new Set(
                            taeglicheBestellungen
                              .filter(b => b.schiffAbfahrtMittwoch)
                              .map(b => b.schiffAbfahrtMittwoch?.toISOString())
                          )
                          return uniqueMittwoche.size > 0 
                            ? formatNumber(bestellStatistik.gesamtMenge / uniqueMittwoche.size, 0) + ' Stk'
                            : '-'
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Shipment Tracking Table mit Bundle-Visualisierung */}
                  <div className="mb-2 text-xs text-muted-foreground">
                    ✅ Bestellungen werden am Hafen Shanghai gebündelt | Farbige Markierung zeigt Bundles
                  </div>
                  <ExcelTable
                    columns={[
                      { key: 'bundleMarker', label: 'Bundle', width: '70px', align: 'center', sumable: false },
                      { key: 'bestellungId', label: 'Best.-ID', width: '120px', align: 'left', sumable: false },
                      { key: 'bestelldatumFormatiert', label: 'Bestellung', width: '100px', align: 'center', sumable: false },
                      { key: 'ankunftHafen', label: 'Hafen CN', width: '100px', align: 'center', sumable: false },
                      { key: 'menge', label: 'Menge', width: '90px', align: 'right', sumable: true, format: (v: number) => v > 0 ? formatNumber(v, 0) + ' Stk' : '-' },
                      { key: 'schiffAbfahrt', label: 'Schiff ab', width: '110px', align: 'center', sumable: false },
                      { key: 'wartetage', label: 'Wait', width: '60px', align: 'center', sumable: false },
                      { key: 'erwarteteAnkunftFormatiert', label: 'Hamburg', width: '100px', align: 'center', sumable: false },
                      { key: 'verfuegbarAb', label: 'Verfügbar', width: '100px', align: 'center', sumable: false },
                      { key: 'hafenBacklog', label: 'Am Hafen', width: '100px', align: 'right', sumable: false }
                    ]}
                    data={(() => {
                      const sorted = taeglicheBestellungen
                        .filter(b => Object.values(b.komponenten).reduce((sum, m) => sum + m, 0) > 0)
                        .sort((a, b) => {
                          const dA = a.schiffAbfahrtMittwoch instanceof Date ? a.schiffAbfahrtMittwoch : new Date(a.schiffAbfahrtMittwoch || a.bestelldatum)
                          const dB = b.schiffAbfahrtMittwoch instanceof Date ? b.schiffAbfahrtMittwoch : new Date(b.schiffAbfahrtMittwoch || b.bestelldatum)
                          return dA.getTime() - dB.getTime()
                        })
                      // Bundle-Farben für visuelle Gruppierung (außerhalb der Schleife für Performance)
                      const BUNDLE_COLORS = ['bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-orange-50', 'bg-pink-50', 'bg-yellow-50']
                      const bundleMap = new Map<string, number>()
                      let bundleNr = 1
                      let akkumuliertAmHafen = 0
                      return sorted.map((b, idx) => {
                        const menge = Object.values(b.komponenten).reduce((sum, m) => sum + m, 0)
                        const key = b.schiffAbfahrtMittwoch ? (b.schiffAbfahrtMittwoch instanceof Date ? b.schiffAbfahrtMittwoch.toISOString() : new Date(b.schiffAbfahrtMittwoch).toISOString()) : 'none'
                        if (!bundleMap.has(key)) bundleMap.set(key, bundleNr++)
                        const bid = bundleMap.get(key)
                        akkumuliertAmHafen += menge
                        const next = sorted[idx + 1]
                        const nextKey = next?.schiffAbfahrtMittwoch ? (next.schiffAbfahrtMittwoch instanceof Date ? next.schiffAbfahrtMittwoch.toISOString() : new Date(next.schiffAbfahrtMittwoch).toISOString()) : 'x'
                        const isLast = key !== nextKey
                        // Zeigt akkumulierte Menge am Hafen: ⏳ = wartet noch, ✈️ = wird verschifft
                        const hafenAnzeige = isLast ? `✈️ ${formatNumber(akkumuliertAmHafen, 0)}` : `⏳ ${formatNumber(akkumuliertAmHafen, 0)}`
                        if (isLast) akkumuliertAmHafen = 0
                        return {
                          bundleMarker: bid ? `#${bid}` : '-',
                          bundleColor: BUNDLE_COLORS[(bid || 1) % BUNDLE_COLORS.length],
                          bestellungId: b.id,
                          bestelldatumFormatiert: (b.bestelldatum instanceof Date ? b.bestelldatum : new Date(b.bestelldatum)).toLocaleDateString('de-DE'),
                          ankunftHafen: b.materialfluss?.ankunftHafenShanghai ? ((b.materialfluss.ankunftHafenShanghai instanceof Date ? b.materialfluss.ankunftHafenShanghai : new Date(b.materialfluss.ankunftHafenShanghai)).toLocaleDateString('de-DE')) : '-',
                          menge,
                          schiffAbfahrt: b.schiffAbfahrtMittwoch ? ((b.schiffAbfahrtMittwoch instanceof Date ? b.schiffAbfahrtMittwoch : new Date(b.schiffAbfahrtMittwoch)).toLocaleDateString('de-DE') + ' (Mi)') : '-',
                          wartetage: b.wartetageAmHafen !== undefined ? b.wartetageAmHafen + 'd' : '-',
                          erwarteteAnkunftFormatiert: (b.erwarteteAnkunft instanceof Date ? b.erwarteteAnkunft : new Date(b.erwarteteAnkunft)).toLocaleDateString('de-DE'),
                          verfuegbarAb: b.verfuegbarAb ? ((b.verfuegbarAb instanceof Date ? b.verfuegbarAb : new Date(b.verfuegbarAb)).toLocaleDateString('de-DE')) : '-',
                          hafenBacklog: hafenAnzeige
                        }
                      })
                    })()}
                    maxHeight="600px"
                    showFormulas={false}
                    showSums={true}
                    sumRowLabel={`GESAMT: ${bestellStatistik.gesamt} Lieferungen, ${formatNumber(bestellStatistik.gesamtMenge, 0)} Sättel`}
                    highlightRow={(row: any) => row.bundleColor ? { color: row.bundleColor + ' border-l-4 border-blue-400', tooltip: `Bundle ${row.bundleMarker}` } : null}
                  />
                  
                  {/* Chart: Monatliche Liefermengen */}
                  <div className="mt-4">
                    <BestellungenChart
                      daten={taeglicheBestellungen.map(b => ({
                        bestelldatum: b.bestelldatum instanceof Date ? b.bestelldatum : new Date(b.bestelldatum),
                        menge: Object.values(b.komponenten).reduce((sum, m) => sum + m, 0),
                        komponenten: b.komponenten,
                        status: b.status
                      }))}
                      aggregation="monat"
                      height={250}
                    />
                  </div>
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
            </div>
        </CardContent>
      </Card>

      {/* ✅ KONSOLIDIERTE INFO-BOXEN: Lieferanten-Details + Bestelllogik */}
      <CollapsibleInfoGroup
        groupTitle="Detaillierte Informationen"
        items={[
          {
            id: 'lieferant-details',
            title: `${lieferant.land === 'China' ? '🇨🇳' : '🏭'} ${lieferant.name} - Lieferanten-Details`,
            icon: <Ship className="h-4 w-4" />,
            variant: 'info',
            content: (
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
            )
          },
          {
            id: 'bedarfsdatum-bestelldatum',
            title: 'Bedarfsdatum → Bestelldatum (Rückwärtsrechnung)',
            icon: <Calendar className="h-4 w-4" />,
            variant: 'info',
            content: (
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Vom Bedarfsdatum <strong>{gesamtVorlaufzeit} Tage</strong> (Gesamtvorlaufzeit) abziehen</li>
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
            )
          },
          {
            id: 'losgroessen-aufrundung',
            title: 'Losgrößen-Aufrundung',
            icon: <Package className="h-4 w-4" />,
            variant: 'success',
            content: (
              <div className="space-y-2">
                <p className="text-sm">
                  Jede Bestellung wird auf Vielfache von <strong>{formatNumber(lieferant.losgroesse, 0)} Stück</strong> aufgerundet.
                </p>
                <p className="text-sm">
                  Beispiel: Bedarf 3.500 Stück → Bestellung <strong>{formatNumber(Math.ceil(3500 / lieferant.losgroesse) * lieferant.losgroesse, 0)} Stück</strong> ({Math.ceil(3500 / lieferant.losgroesse)}x Losgröße)
                </p>
              </div>
            )
          }
        ]}
        variant="info"
        icon={<Info className="h-5 w-5" />}
        defaultOpen={false}
      />

    </div>
  )
}