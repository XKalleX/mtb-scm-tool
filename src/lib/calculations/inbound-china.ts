/**
 * ========================================
 * INBOUND LOGISTIK - CHINA
 * ========================================
 * * Bestellungen beim einzigen Lieferanten (China) - nur Sättel!
 * * NEUE LOGIK gemäß Issue-Anforderungen:
 * - Schiffe fahren NUR mittwochs ab Shanghai
 * - LKWs fahren NICHT am Wochenende
 * - Material verfügbar am NÄCHSTEN TAG nach Ankunft
 * - Proportionale Allokation statt FCFS
 * * Alle Parameter aus KonfigurationContext oder JSON-Referenzen
 * - Losgröße, Lieferintervall aus JSON als Referenz
 * - Stückliste aus Config/Parameter
 * - Feiertage über Parameter
 */

import { TagesProduktionsplan } from '@/types'
import { addDays, generateId, isWeekend } from '@/lib/utils'
import { 
  berechneAnkunftsdatum, 
  istChinaFeiertag,
  istArbeitstag_Deutschland,
  naechsterArbeitstag_Deutschland,
  FeiertagsKonfiguration,
  berechneMaterialflussDetails,
  type MaterialflussDetails
} from '@/lib/kalender'
import lieferantChinaData from '@/data/lieferant-china.json'
// Make sure this file exists in your project structure
// import { berechneProportionaleAllokation, type BedarfsEintrag } from './proportionale-allokation' 

/**
 * Globaler Counter für lesbare Bestellungs-IDs
 * Format: B-JAHR-NNN (z.B. B-2027-001)
 */
let globalBestellungsNummer = 1

/**
 * Setzt den Bestellungs-Counter zurück (für neue Berechnungen)
 */
export function resetBestellungsNummer(): void {
  globalBestellungsNummer = 1
}

/**
 * Generiert eine lesbare Bestellungs-ID
 * Format: B-JAHR-NNN (z.B. B-2027-001)
 */
function generiereBestellungsId(jahr: number): string {
  return `B-${jahr}-${String(globalBestellungsNummer++).padStart(3, '0')}`
}

// Type für Komponente
type Komponente = {
  name: string;
  menge: number;
  einheit: string;
}

/**
 * Rundet Bestellmenge auf Losgröße auf
 * * @param menge - Benötigte Menge
 * @param losgroesse - Losgröße (aus KonfigurationContext oder JSON-Referenz)
 * @returns Aufgerundete Bestellmenge
 */
export function rundeAufLosgroesse(menge: number, losgroesse: number = lieferantChinaData.lieferant.losgroesse): number {
  if (menge === 0) return 0
  
  // Aufrunden auf nächstes Vielfaches der Losgröße
  return Math.ceil(menge / losgroesse) * losgroesse
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TÄGLICHE BESTELLLOGIK MIT NEUEM MATERIALFLUSS
 * ═══════════════════════════════════════════════════════════════════════════════
 * * Implementiert die korrekte Bestelllogik gemäß NEUEN Anforderungen:
 * * MATERIALFLUSS (gemäß Issue):
 * 1. OEM bestellt → Zulieferer: Eingang Bestellung
 * 2. Zulieferer: +5 AT Produktion → Warenausgang
 * 3. LKW China: +2 AT (nur Mo-Fr) → Hafen Shanghai
 * 4. Hafen Shanghai: Warten auf Mittwoch → Schiff fährt NUR mittwochs ab!
 * 5. Schiff: +30 KT → Hafen Hamburg
 * 6. LKW Deutschland: +2 AT (nur Mo-Fr) → Produktionsstandort
 * 7. Material verfügbar: NÄCHSTER TAG nach Ankunft!
 * * BESTELLLOGIK:
 * 1. TÄGLICH wird der Bedarf ermittelt (nicht monatlich!)
 * 2. Bestellung erfolgt wenn Losgröße erreicht ist (aus Konfiguration)
 * 3. Bestellungen beginnen VOR Planungsjahr (Vorlaufzeit aus Konfiguration!)
 * 4. Aggregation über alle Sattel-Varianten (aus Stückliste)
 * 5. KEINE Initial-Bestellung! Nur täglicher Bedarf bestellen
 * 6. Gesamtmenge = exakt Jahresproduktion (1:1 mit Produktion)
 * 7. PROPORTIONALE ALLOKATION statt FCFS bei Engpässen
 * * @param alleProduktionsplaene - Pläne aller MTB-Varianten
 * @param planungsjahr - Jahr (aus KonfigurationContext)
 * @param vorlaufzeitTage - Fixe Vorlaufzeit (aus KonfigurationContext)
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext
 * @returns Array von Bestellungen (inkl. Vorjahr!)
 */
export interface TaeglicheBestellung {
  id: string
  bestelldatum: Date
  bedarfsdatum: Date
  komponenten: Record<string, number> // Sattel-ID → Menge
  erwarteteAnkunft: Date
  verfuegbarAb: Date                  // NEU: Material verfügbar am nächsten Tag nach Ankunft
  status: 'bestellt' | 'unterwegs' | 'geliefert'
  istVorjahr: boolean // Bestellung aus 2026?
  grund: 'losgroesse' | 'zusatzbestellung'
  
  // NEU: Detaillierter Materialfluss
  materialfluss?: MaterialflussDetails
  schiffAbfahrtMittwoch?: Date        // Schiff fährt nur mittwochs!
  wartetageAmHafen?: number           // Tage die Ware am Hafen wartet (1-7 Tage bis zum nächsten Mittwoch)
}

// Puffer-Tage werden aus lieferant-china.json geladen (lieferintervall: 14 Tage)

/**
 * Generiert tägliche Bestellungen über das ganze Jahr (+ Vorlauf aus Vorjahr)
 * * NEU: Berücksichtigt detaillierten Materialfluss mit:
 * - Schiff nur mittwochs
 * - LKW nicht am Wochenende
 * - Material verfügbar am nächsten Tag nach Ankunft
 * * ⚠️ NOTE ON TYPE SAFETY:
 * Der Parameter `alleProduktionsplaene` ist bewusst als `any[]` typisiert, um
 * beide Varianten zu unterstützen:
 * 1. TagesProduktionsplan (mit sollMenge)
 * 2. Formatiertes Objekt (mit planMenge)
 * Das ist ein pragmatischer Trade-off zwischen Type-Safety und Flexibilität.
 * Die Funktion prüft beide Felder und fällt zurück auf 0 wenn keins existiert.
 * * @param alleProduktionsplaene - Pläne aller MTB-Varianten
 * @param planungsjahr - Jahr (aus KonfigurationContext)
 * @param vorlaufzeitTage - Fixe Vorlaufzeit (aus KonfigurationContext)
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext
 * @returns Array von Bestellungen (inkl. Vorjahr!)
 */
export function generiereTaeglicheBestellungen(
  alleProduktionsplaene: Record<string, any[]>,  // ✅ Generic any[] erlaubt TagesProduktionsplan oder formatierten Typ
  planungsjahr: number,
  vorlaufzeitTage: number,
  customFeiertage?: FeiertagsKonfiguration[],
  stuecklisten?: Record<string, { komponenten: Record<string, { name: string; menge: number; einheit: string }> }>,
  losgroesse: number = lieferantChinaData.lieferant.losgroesse,
  lieferintervall: number = lieferantChinaData.lieferant.lieferintervall
): TaeglicheBestellung[] {
  const bestellungen: TaeglicheBestellung[] = []
  
  // Reset Bestellungs-Counter für neue Berechnung
  resetBestellungsNummer()
  
  // Verwende übergebene Stücklisten oder leeres Objekt als Fallback
  const stklst = stuecklisten || {}
  const LOSGROESSE = losgroesse
  const VORLAUFZEIT_TAGE = vorlaufzeitTage
  const LOSGROESSE_SAMMEL_PUFFER_TAGE = lieferintervall
  
  // Berechne täglichen Bedarf pro Komponente für das ganze Jahr
  const taeglicheBedarf: Record<string, number[]> = {} // komponente -> array[365]
  
  // Initialisiere alle Sattel-Komponenten
  const alleKomponenten = new Set<string>()
  Object.values(stklst).forEach(sl => {
    const komponenten = sl.komponenten as Record<string, Komponente>
    Object.keys(komponenten).forEach(k => alleKomponenten.add(k))
  })
  
  alleKomponenten.forEach(k => {
    taeglicheBedarf[k] = Array(365).fill(0)
  })
  
  // Fülle täglichen Bedarf aus Produktionsplänen
  // ✅ WICHTIG: Nutze planMenge, NICHT istMenge!
  // Grund: Bestellungen müssen VORHER erfolgen, bevor Material da ist
  // istMenge wird später basierend auf Material-Verfügbarkeit gesetzt
  // Wir bestellen für den PLAN (370.000 Bikes), nicht für IST
  Object.entries(alleProduktionsplaene).forEach(([varianteId, plan]) => {
    const stueckliste = stklst[varianteId as keyof typeof stklst]
    if (!stueckliste) return
    
    const komponenten = stueckliste.komponenten as Record<string, Komponente>
    
    plan.forEach((tag, tagIndex) => {
      // ✅ KORREKT: Nutze planMenge (OEM Plan), NICHT istMenge
      // planMenge ist immer 370.000 Summe, istMenge hängt von Material ab
      // Kompatibilität: Unterstütze beide Feldnamen (planMenge und sollMenge)
      const planMenge = (tag as any).planMenge || (tag as any).sollMenge || 0
      
      if (planMenge > 0 && tagIndex < 365) {
        Object.entries(komponenten).forEach(([kompId, komp]) => {
          taeglicheBedarf[kompId][tagIndex] += planMenge * komp.menge
        })
      }
    })
  })
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // BESTELLZEITRAUM: Beginne früh genug für Produktionsstart
  // und ende am Jahresende (Lieferung darf Anfang 2028 erfolgen)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Berechne Startdatum: Jahresstart - Vorlaufzeit - Puffer für Losgröße-Sammlung
  const produktionsStart = new Date(planungsjahr, 0, 1)
  const bestellStart = addDays(produktionsStart, -VORLAUFZEIT_TAGE - LOSGROESSE_SAMMEL_PUFFER_TAGE)
  
  // ✅ FIX: Bestellungen bis Jahresende erlauben (nicht -49 Tage!)
  // Grund: Bedarf für gesamtes Jahr 2027 muss erfasst werden (370.000 Sättel)
  // Lieferung erfolgt zwar Anfang 2028, aber Bedarf entsteht Ende 2027
  const produktionsEnde = new Date(planungsjahr, 11, 31)
  const bestellEnde = new Date(planungsjahr, 11, 31)
  
  // Offene Bestellmengen pro Komponente (akkumuliert bis Losgröße erreicht)
  const offeneMengen: Record<string, number> = {}
  alleKomponenten.forEach(k => { offeneMengen[k] = 0 })
  
  // Tägliche Bedarfsprüfung vom Bestellstart bis Bestellende
  let aktuellerTag = new Date(bestellStart)
  
  while (aktuellerTag <= bestellEnde) {
    /**
     * Bedarfserfassung vor Wochenend-Prüfung:
     * 1. ZUERST den Bedarf für diesen Tag erfassen (auch an Wochenenden!)
     * 2. DANN prüfen ob BESTELLT werden kann (nur an Arbeitstagen)
     * An Wochenenden/Feiertagen sammelt sich der Bedarf an,
     * wird aber erst am nächsten Arbeitstag bestellt.
     */
    
    // Berechne welcher Produktionstag in der Zukunft beliefert werden soll
    // (heute + Vorlaufzeit aus Konfiguration)
    const lieferTag = addDays(aktuellerTag, VORLAUFZEIT_TAGE)
    const lieferTagIndex = Math.floor((lieferTag.getTime() - produktionsStart.getTime()) / (1000 * 60 * 60 * 24))
    
    // ✅ WICHTIG: Bedarf IMMER erfassen (auch an Wochenenden/Feiertagen!)
    // Nur Bedarf für das Planungsjahr sammeln
    if (lieferTagIndex >= 0 && lieferTagIndex < 365) {
      // Addiere Bedarf für den zukünftigen Liefertag zu offenen Mengen
      alleKomponenten.forEach(kompId => {
        offeneMengen[kompId] += taeglicheBedarf[kompId][lieferTagIndex] || 0
      })
    }
    
    // ✅ Prüfe JETZT erst ob BESTELLUNG möglich ist (nur an Arbeitstagen in CHINA!)
    // WICHTIG: Nur chinesische Feiertage relevant für Bestellungen bei China
    if (isWeekend(aktuellerTag) || istChinaFeiertag(aktuellerTag, customFeiertage).length > 0) {
      // An Wochenenden/Feiertagen (China): Bedarf ist erfasst, aber keine Bestellung
      // Bedarf bleibt in offeneMengen und wird am nächsten Arbeitstag verarbeitet
      aktuellerTag = addDays(aktuellerTag, 1)
      continue
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // LOSGRÖSSEN-CHECK: Gilt für TAGESGESAMTMENGE aller Sättel
    // ═══════════════════════════════════════════════════════════════════════════════
    // 
    // ✅ KORREKT IMPLEMENTIERT: Losgröße wird auf GESAMTMENGE angewendet!
    // 
    // Beispiel: Tagesbedarf verschiedener Sattel-Varianten
    //   - SAT_FT: 222 Stück (ALLR + COMP + DOWN)
    //   - SAT_RL: 111 Stück (TOUR + ENDUR)
    //   - SAT_SP:  74 Stück (TRAIL)
    //   - SAT_SL: 333 Stück (WOME + URBA)
    //   = 740 Sättel GESAMT
    // 
    // → Wenn Losgröße = 500: 740 >= 500 → ✅ Bestellung wird ausgelöst!
    // → Bestellt: 1x Losgröße = 500 Sättel (proportional verteilt)
    // → Rest (240 Stk) bleibt im Backlog für nächste Bestellung
    //
    const gesamtOffeneMenge = Array.from(alleKomponenten).reduce((sum, k) => sum + offeneMengen[k], 0)
    
    let sollBestellen = false
    const bestellKomponenten: Record<string, number> = {}
    
    if (gesamtOffeneMenge >= LOSGROESSE) {
      sollBestellen = true
      // Berechne wie viele ganze Lose bestellt werden können
      const anzahlLose = Math.floor(gesamtOffeneMenge / LOSGROESSE)
      const bestellMengeGesamt = anzahlLose * LOSGROESSE
      
      // Verteile die Bestellmenge proportional auf alle Komponenten
      // Jede Komponente bekommt ihren Anteil der Bestellung (maximal die offene Menge)
      let verteilt = 0
      const komponentenArray = Array.from(alleKomponenten)
      komponentenArray.forEach((kompId, idx) => {
        if (idx === komponentenArray.length - 1) {
          // Letzte Komponente bekommt den Rest (vermeidet Rundungsfehler)
          const rest = bestellMengeGesamt - verteilt
          bestellKomponenten[kompId] = Math.min(rest, offeneMengen[kompId])
          verteilt += bestellKomponenten[kompId]
        } else {
          // Proportionaler Anteil, maximal die offene Menge
          const anteil = offeneMengen[kompId] / gesamtOffeneMenge
          const menge = Math.min(Math.round(bestellMengeGesamt * anteil), offeneMengen[kompId])
          bestellKomponenten[kompId] = menge
          verteilt += menge
        }
        // Reduziere offene Menge um bestellte Menge
        offeneMengen[kompId] -= bestellKomponenten[kompId]
      })
    }
    
    if (sollBestellen) {
      const bestelldatum = new Date(aktuellerTag)
      let bedarfsdatum = addDays(bestelldatum, VORLAUFZEIT_TAGE)
      
      // Bedarfsdatum muss ein deutscher Arbeitstag sein (Produktion findet in Deutschland statt)
      if (!istArbeitstag_Deutschland(bedarfsdatum, customFeiertage)) {
        bedarfsdatum = naechsterArbeitstag_Deutschland(bedarfsdatum, customFeiertage)
      }
      
      // NEU: Berechne detaillierten Materialfluss mit Mittwochs-Schiff und LKW-Restriktionen
      const materialfluss = berechneMaterialflussDetails(bestelldatum, customFeiertage)
      
      // Erstelle lesbare Bestellungs-ID: B-JAHR-NNN (z.B. B-2027-001)
      const bestellungId = generiereBestellungsId(planungsjahr)
      
      bestellungen.push({
        id: bestellungId,
        bestelldatum,
        bedarfsdatum,
        komponenten: bestellKomponenten,
        erwarteteAnkunft: materialfluss.ankunftProduktion,
        verfuegbarAb: materialfluss.verfuegbarAb,  // NEU: Material erst am nächsten Tag verfügbar!
        status: bestelldatum.getFullYear() < planungsjahr ? 'geliefert' : 
                bestelldatum.getMonth() < 3 ? 'unterwegs' : 'bestellt',
        istVorjahr: bestelldatum.getFullYear() < planungsjahr,
        grund: 'losgroesse',
        // NEU: Materialfluss-Details
        materialfluss,
        schiffAbfahrtMittwoch: materialfluss.schiffAbfahrt,  // Schiff fährt NUR mittwochs!
        wartetageAmHafen: materialfluss.wartetageHafen
      })
    }
    
    aktuellerTag = addDays(aktuellerTag, 1)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FINALE BESTELLUNG: Restliche Mengen bestellen (auch wenn < Losgröße)
  // Keine Aufrundung für finale Bestellung (verhindert Überbestellung)
  // ═══════════════════════════════════════════════════════════════════════════════
  const restKomponenten: Record<string, number> = {}
  let hatRest = false
  
  alleKomponenten.forEach(kompId => {
    if (offeneMengen[kompId] > 0) {
      hatRest = true
      // Exakte Restmenge bestellen (keine Aufrundung)
      restKomponenten[kompId] = offeneMengen[kompId]
      offeneMengen[kompId] = 0
    }
  })
  
  if (hatRest) {
    const finalesBestelldatum = new Date(bestellEnde)
    let finalesBedarfsdatum = addDays(finalesBestelldatum, VORLAUFZEIT_TAGE)
    
    // Bedarfsdatum muss ein deutscher Arbeitstag sein
    if (!istArbeitstag_Deutschland(finalesBedarfsdatum, customFeiertage)) {
      finalesBedarfsdatum = naechsterArbeitstag_Deutschland(finalesBedarfsdatum, customFeiertage)
    }
    
    // NEU: Berechne detaillierten Materialfluss für finale Bestellung
    const materialfluss = berechneMaterialflussDetails(finalesBestelldatum, customFeiertage)
    
    // Erstelle lesbare Bestellungs-ID: B-JAHR-NNN (z.B. B-2027-239)
    const bestellungId = generiereBestellungsId(planungsjahr)
    
    bestellungen.push({
      id: bestellungId,
      bestelldatum: finalesBestelldatum,
      bedarfsdatum: finalesBedarfsdatum,
      komponenten: restKomponenten,
      erwarteteAnkunft: materialfluss.ankunftProduktion,
      verfuegbarAb: materialfluss.verfuegbarAb,  // NEU: Material erst am nächsten Tag verfügbar!
      status: 'bestellt',
      istVorjahr: false,
      grund: 'losgroesse',  // Finale Restbestellung (nicht auf Losgröße gerundet)
      // NEU: Materialfluss-Details
      materialfluss,
      schiffAbfahrtMittwoch: materialfluss.schiffAbfahrt,
      wartetageAmHafen: materialfluss.wartetageHafen
    })
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // VALIDIERUNG: Prüfe ob alle Sättel bestellt wurden
  // ═══════════════════════════════════════════════════════════════════════════════
  const gesamtBestellteSaettel = bestellungen.reduce((sum, b) => {
    return sum + Object.values(b.komponenten).reduce((s, m) => s + m, 0)
  }, 0)
  
  const gesamtBenoetigteSaettel = Object.values(taeglicheBedarf).reduce((sum, bedarf) => {
    return sum + bedarf.reduce((s, m) => s + m, 0)
  }, 0)
  
  // NEU: Berechne durchschnittliche Wartezeit am Hafen
  const durchschnittlicheWartezeit = bestellungen.length > 0
    ? bestellungen.reduce((sum, b) => sum + (b.wartetageAmHafen || 0), 0) / bestellungen.length
    : 0
  
  console.log(`
    ═══════════════════════════════════════════════════════════════════════════════
    BESTELLVALIDIERUNG (tägliche Bestelllogik - NEUER MATERIALFLUSS)
    ═══════════════════════════════════════════════════════════════════════════════
    Gesamtbedarf (aus Produktionsplan): ${gesamtBenoetigteSaettel.toLocaleString('de-DE')} Sättel
    Gesamt bestellt:                     ${gesamtBestellteSaettel.toLocaleString('de-DE')} Sättel
    Differenz:                           ${(gesamtBestellteSaettel - gesamtBenoetigteSaettel).toLocaleString('de-DE')} Sättel
    
    NEU: Schiffe fahren nur mittwochs!
    Durchschnittl. Wartezeit am Hafen:   ${durchschnittlicheWartezeit.toFixed(1)} Tage
    
    Status: ${Math.abs(gesamtBestellteSaettel - gesamtBenoetigteSaettel) <= LOSGROESSE ? '✅ OK' : '❌ FEHLER!'}
    
    Anzahl Bestellungen: ${bestellungen.length}
    Zeitraum:            ${bestellungen[0]?.bestelldatum instanceof Date ? bestellungen[0].bestelldatum.toLocaleDateString('de-DE') : 'N/A'} - ${bestellungen[bestellungen.length - 1]?.bestelldatum instanceof Date ? bestellungen[bestellungen.length - 1].bestelldatum.toLocaleDateString('de-DE') : 'N/A'}
    ═══════════════════════════════════════════════════════════════════════════════
  `)
  
  if (Math.abs(gesamtBestellteSaettel - gesamtBenoetigteSaettel) > LOSGROESSE) {
    console.warn(`⚠️ WARNUNG: Bestellmenge weicht um mehr als eine Losgröße (${LOSGROESSE}) ab!`)
  }
  
  return bestellungen
}

/**
 * Erstellt eine Zusatzbestellung für einen bestimmten Tag
 * Wird über das Zusatzbestellungs-Formular aufgerufen
 * * NEU: Berücksichtigt detaillierten Materialfluss:
 * - Schiff fährt nur mittwochs
 * - LKW nicht am Wochenende
 * - Material verfügbar am nächsten Tag nach Ankunft
 * * @param bestelldatum - Datum der Bestellung
 * @param komponenten - Komponenten mit Mengen (bereits exakt verteilt!)
 * @param vorlaufzeitTage - Vorlaufzeit in Tagen (aus KonfigurationContext)
 * @param skipLosgroessenRundung - Wenn true: KEINE Aufrundung, wenn false: Aufrundung pro Variante
 * @param customFeiertage - Optionale benutzerdefinierte Feiertage aus KonfigurationContext
 * @returns TaeglicheBestellung
 */
export function erstelleZusatzbestellung(
  bestelldatum: Date,
  komponenten: Record<string, number>,
  vorlaufzeitTage: number,
  skipLosgroessenRundung: boolean = false,
  customFeiertage?: FeiertagsKonfiguration[],
  losgroesse: number = lieferantChinaData.lieferant.losgroesse
): TaeglicheBestellung {
  const LOSGROESSE = losgroesse
  const finalKomponenten: Record<string, number> = skipLosgroessenRundung
    ? { ...komponenten }
    : Object.fromEntries(
        Object.entries(komponenten).map(([kompId, menge]) => [
          kompId,
          rundeAufLosgroesse(menge, LOSGROESSE)
        ])
      )
  
  let bedarfsdatum = addDays(bestelldatum, vorlaufzeitTage)
  
  // Bedarfsdatum muss ein deutscher Arbeitstag sein
  if (!istArbeitstag_Deutschland(bedarfsdatum, customFeiertage)) {
    bedarfsdatum = naechsterArbeitstag_Deutschland(bedarfsdatum, customFeiertage)
  }
  
  // NEU: Berechne detaillierten Materialfluss
  const materialfluss = berechneMaterialflussDetails(bestelldatum, customFeiertage)
  
  // Erstelle lesbare Bestellungs-ID mit Jahr aus Bedarfsdatum
  const jahr = bedarfsdatum.getFullYear()
  const bestellungId = generiereBestellungsId(jahr)
  
  return {
    id: bestellungId,
    bestelldatum,
    bedarfsdatum,
    komponenten: finalKomponenten,
    erwarteteAnkunft: materialfluss.ankunftProduktion,
    verfuegbarAb: materialfluss.verfuegbarAb,  // NEU: Material erst am nächsten Tag verfügbar!
    status: 'bestellt',
    istVorjahr: false,
    grund: 'zusatzbestellung',
    // NEU: Materialfluss-Details
    materialfluss,
    schiffAbfahrtMittwoch: materialfluss.schiffAbfahrt,
    wartetageAmHafen: materialfluss.wartetageHafen
  }
}