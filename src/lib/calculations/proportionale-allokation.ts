/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROPORTIONALE ALLOKATION (Gewichtungsprinzip)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Implementiert faire prozentuale Verteilung statt FCFS (First-Come-First-Serve)
 * 
 * KONZEPT:
 * Wenn nicht genug Material/Teile für alle Varianten vorhanden sind,
 * wird proportional nach Bedarfsanteil verteilt.
 * 
 * BEISPIEL:
 * - 4 Varianten brauchen jeweils 500 Teile = 2000 Teile Gesamtbedarf
 * - Nur 1000 Teile verfügbar
 * - Jede Variante bekommt 50% = 250 Teile
 * 
 * ANWENDUNG:
 * 1. Am Hafen: Wenn Schiffskapazität nicht für alle Bestellungen reicht
 * 2. Bei Produktion: Wenn nicht genug Material für alle Varianten da ist
 * 
 * ANFORDERUNGEN:
 * - Ersetzt FCFS-Prinzip aus Ermäßigung
 * - Fair = gleicher prozentualer Anteil für alle
 * - Keine Variante wird komplett bedient während andere leer ausgehen
 */

/**
 * Interface für Bedarfs-Eintrag (generisch für Hafen oder Produktion)
 */
export interface BedarfsEintrag {
  id: string           // Variante-ID oder Bestellungs-ID
  bedarf: number       // Benötigte Menge
  prioritaet?: number  // Optionale Priorität (wird bei proportionaler Allokation ignoriert)
}

/**
 * Interface für Allokations-Ergebnis
 */
export interface AllokationsErgebnis {
  id: string
  bedarf: number           // Ursprünglicher Bedarf
  zugewiesen: number       // Tatsächlich zugewiesene Menge
  anteil: number           // Prozentualer Anteil (0-1)
  restBedarf: number       // Nicht erfüllter Bedarf
  erfuellungsgrad: number  // zugewiesen / bedarf * 100
}

/**
 * Interface für Gesamt-Allokations-Ergebnis
 */
export interface GesamtAllokationsErgebnis {
  eintraege: AllokationsErgebnis[]
  
  // Statistiken
  gesamtBedarf: number
  gesamtVerfuegbar: number
  gesamtZugewiesen: number
  gesamtRest: number
  durchschnittlicherErfuellungsgrad: number
  
  // Flags
  vollstaendigErfuellt: boolean  // true wenn alle Bedarfe erfüllt
  hatEngpass: boolean            // true wenn Allokation nötig war
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KERNFUNKTION: Proportionale Allokation
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Verteilt verfügbare Menge proportional nach Bedarfsanteil.
 * 
 * ALGORITHMUS:
 * 1. Berechne Gesamtbedarf
 * 2. Wenn verfügbar >= Gesamtbedarf: Alle erhalten 100%
 * 3. Sonst: Jeder erhält (Bedarf / Gesamtbedarf) * verfügbar
 * 4. Rundung erfolgt so, dass Summe exakt der verfügbaren Menge entspricht
 * 
 * @param bedarfe - Array von Bedarfs-Einträgen
 * @param verfuegbar - Verfügbare Gesamtmenge
 * @returns Allokations-Ergebnis mit Details pro Eintrag
 */
export function berechneProportionaleAllokation(
  bedarfe: BedarfsEintrag[],
  verfuegbar: number
): GesamtAllokationsErgebnis {
  // Guard: Keine Bedarfe
  if (bedarfe.length === 0) {
    return {
      eintraege: [],
      gesamtBedarf: 0,
      gesamtVerfuegbar: verfuegbar,
      gesamtZugewiesen: 0,
      gesamtRest: verfuegbar,
      durchschnittlicherErfuellungsgrad: 100,
      vollstaendigErfuellt: true,
      hatEngpass: false
    }
  }
  
  // Berechne Gesamtbedarf
  const gesamtBedarf = bedarfe.reduce((sum, b) => sum + b.bedarf, 0)
  
  // Guard: Kein Bedarf
  if (gesamtBedarf === 0) {
    return {
      eintraege: bedarfe.map(b => ({
        id: b.id,
        bedarf: 0,
        zugewiesen: 0,
        anteil: 0,
        restBedarf: 0,
        erfuellungsgrad: 100
      })),
      gesamtBedarf: 0,
      gesamtVerfuegbar: verfuegbar,
      gesamtZugewiesen: 0,
      gesamtRest: verfuegbar,
      durchschnittlicherErfuellungsgrad: 100,
      vollstaendigErfuellt: true,
      hatEngpass: false
    }
  }
  
  // Fall 1: Genug Material für alle → jeder bekommt 100%
  if (verfuegbar >= gesamtBedarf) {
    return {
      eintraege: bedarfe.map(b => ({
        id: b.id,
        bedarf: b.bedarf,
        zugewiesen: b.bedarf,
        anteil: gesamtBedarf > 0 ? b.bedarf / gesamtBedarf : 0,
        restBedarf: 0,
        erfuellungsgrad: 100
      })),
      gesamtBedarf,
      gesamtVerfuegbar: verfuegbar,
      gesamtZugewiesen: gesamtBedarf,
      gesamtRest: verfuegbar - gesamtBedarf,
      durchschnittlicherErfuellungsgrad: 100,
      vollstaendigErfuellt: true,
      hatEngpass: false
    }
  }
  
  // Fall 2: Engpass → proportionale Verteilung
  // Erfüllungsgrad = verfuegbar / gesamtBedarf (für alle gleich!)
  const erfuellungsGradGlobal = verfuegbar / gesamtBedarf
  
  // Schritt 1: Berechne dezimale Zuweisung
  const allokationen: (AllokationsErgebnis & { dezimalZuweisung: number })[] = bedarfe.map(b => {
    const anteil = b.bedarf / gesamtBedarf
    const dezimalZuweisung = b.bedarf * erfuellungsGradGlobal
    
    return {
      id: b.id,
      bedarf: b.bedarf,
      dezimalZuweisung,
      zugewiesen: Math.floor(dezimalZuweisung), // Vorläufig abrunden
      anteil,
      restBedarf: 0, // Wird später berechnet
      erfuellungsgrad: 0 // Wird später berechnet
    }
  })
  
  // Schritt 2: Verteile Rest (Rundungsdifferenz) proportional
  // Verhindert, dass Summe der Zuweisungen von verfuegbar abweicht
  let summeZugewiesen = allokationen.reduce((sum, a) => sum + a.zugewiesen, 0)
  let restZuVerteilen = Math.round(verfuegbar) - summeZugewiesen
  
  // Sortiere nach größtem Dezimal-Rest (wer am meisten durch Abrunden verloren hat)
  const sortiert = [...allokationen].sort((a, b) => {
    const restA = a.dezimalZuweisung - a.zugewiesen
    const restB = b.dezimalZuweisung - b.zugewiesen
    return restB - restA
  })
  
  // Verteile Rest (je +1) an die mit den größten Dezimal-Resten
  for (let i = 0; i < restZuVerteilen && i < sortiert.length; i++) {
    const entry = allokationen.find(a => a.id === sortiert[i].id)
    if (entry) {
      entry.zugewiesen++
    }
  }
  
  // Schritt 3: Berechne finale Werte
  const ergebnisse: AllokationsErgebnis[] = allokationen.map(a => ({
    id: a.id,
    bedarf: a.bedarf,
    zugewiesen: a.zugewiesen,
    anteil: a.anteil,
    restBedarf: a.bedarf - a.zugewiesen,
    erfuellungsgrad: a.bedarf > 0 ? (a.zugewiesen / a.bedarf) * 100 : 100
  }))
  
  const gesamtZugewiesen = ergebnisse.reduce((sum, e) => sum + e.zugewiesen, 0)
  const gesamtRest = ergebnisse.reduce((sum, e) => sum + e.restBedarf, 0)
  const durchschnittlicherErfuellungsgrad = 
    ergebnisse.length > 0 
      ? ergebnisse.reduce((sum, e) => sum + e.erfuellungsgrad, 0) / ergebnisse.length 
      : 100
  
  return {
    eintraege: ergebnisse,
    gesamtBedarf,
    gesamtVerfuegbar: verfuegbar,
    gesamtZugewiesen,
    gesamtRest,
    durchschnittlicherErfuellungsgrad,
    vollstaendigErfuellt: false,
    hatEngpass: true
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HILFSFUNKTIONEN FÜR SPEZIFISCHE ANWENDUNGSFÄLLE
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Proportionale Allokation für MTB-Varianten bei Materialengpass
 * 
 * Anwendung: Wenn nicht genug Sättel für alle Varianten da sind
 * 
 * @param variantenBedarf - Map: VarianteId → benötigte Menge
 * @param verfuegbaresSattelMaterial - Verfügbare Sattel-Menge
 * @returns Map: VarianteId → zugewiesene Menge
 */
export function allokiereMaterialProportional(
  variantenBedarf: Record<string, number>,
  verfuegbaresSattelMaterial: number
): Record<string, number> {
  // Konvertiere in Bedarfs-Einträge
  const bedarfe: BedarfsEintrag[] = Object.entries(variantenBedarf).map(([id, bedarf]) => ({
    id,
    bedarf
  }))
  
  // Berechne Allokation
  const ergebnis = berechneProportionaleAllokation(bedarfe, verfuegbaresSattelMaterial)
  
  // Konvertiere zurück in Map
  const zuweisungen: Record<string, number> = {}
  ergebnis.eintraege.forEach(e => {
    zuweisungen[e.id] = e.zugewiesen
  })
  
  return zuweisungen
}

/**
 * Proportionale Allokation für Hafen-Losgrößen-Zuteilung
 * 
 * Anwendung: Wenn am Hafen Shanghai nicht alle Bestellungen auf ein Schiff passen
 * 
 * @param bestellungen - Array von Bestellungen mit Mengen
 * @param schiffsKapazitaet - Maximale Kapazität des Schiffs
 * @returns Array mit zugeteilten Mengen pro Bestellung
 */
export function allokiereHafenKapazitaetProportional(
  bestellungen: { bestellungId: string; menge: number }[],
  schiffsKapazitaet: number
): { bestellungId: string; zugewiesen: number; restAmHafen: number }[] {
  // Konvertiere in Bedarfs-Einträge
  const bedarfe: BedarfsEintrag[] = bestellungen.map(b => ({
    id: b.bestellungId,
    bedarf: b.menge
  }))
  
  // Berechne Allokation
  const ergebnis = berechneProportionaleAllokation(bedarfe, schiffsKapazitaet)
  
  // Konvertiere zurück mit Rest-Information
  return ergebnis.eintraege.map(e => ({
    bestellungId: e.id,
    zugewiesen: e.zugewiesen,
    restAmHafen: e.restBedarf
  }))
}

/**
 * Berechnet faire Produktionszuteilung bei Materialengpass
 * 
 * WICHTIG: Alle Varianten bekommen den GLEICHEN prozentualen Anteil!
 * 
 * Beispiel:
 * - Variante A braucht 1000, Variante B braucht 500, Variante C braucht 500 (gesamt: 2000)
 * - Nur 1000 Sättel verfügbar
 * - Alle bekommen 50%: A=500, B=250, C=250
 * 
 * @param tagesBedarf - Map: VarianteId → geplante Produktion
 * @param verfuegbaresMaterial - Gesamt verfügbares Material
 * @returns Map: VarianteId → tatsächlich produzierbare Menge
 */
export function berechneFaireProduktionszuteilung(
  tagesBedarf: Record<string, number>,
  verfuegbaresMaterial: number
): {
  zuteilung: Record<string, number>
  erfuellungsgrad: number
  hatEngpass: boolean
  details: GesamtAllokationsErgebnis
} {
  // Konvertiere in Bedarfs-Einträge
  const bedarfe: BedarfsEintrag[] = Object.entries(tagesBedarf).map(([id, bedarf]) => ({
    id,
    bedarf
  }))
  
  // Berechne proportionale Allokation
  const details = berechneProportionaleAllokation(bedarfe, verfuegbaresMaterial)
  
  // Konvertiere zurück in Map
  const zuteilung: Record<string, number> = {}
  details.eintraege.forEach(e => {
    zuteilung[e.id] = e.zugewiesen
  })
  
  return {
    zuteilung,
    erfuellungsgrad: details.durchschnittlicherErfuellungsgrad,
    hatEngpass: details.hatEngpass,
    details
  }
}

/**
 * Validiert Losgrößen-Teilbarkeit
 * 
 * Prüft ob Jahresproduktion / Losgröße ein ganzzahliges Ergebnis liefert.
 * Bei nicht-ganzzahligem Ergebnis bleiben Teile am Hafen liegen.
 * 
 * @param jahresproduktion - Gesamte Jahresproduktion (z.B. 370.000)
 * @param losgroesse - Losgröße für Bestellungen (z.B. 500)
 * @returns Validierungs-Ergebnis
 */
export function validiereLosgroessenTeilbarkeit(
  jahresproduktion: number,
  losgroesse: number
): {
  istTeilbar: boolean
  anzahlLose: number
  restmenge: number
  erreichbareProduktion: number
  verlustQuote: number
} {
  const anzahlLose = Math.floor(jahresproduktion / losgroesse)
  const restmenge = jahresproduktion % losgroesse
  const erreichbareProduktion = anzahlLose * losgroesse
  const verlustQuote = (restmenge / jahresproduktion) * 100
  
  return {
    istTeilbar: restmenge === 0,
    anzahlLose,
    restmenge,
    erreichbareProduktion,
    verlustQuote
  }
}

/**
 * Berechnet ob Produktion ins nächste Jahr gezogen werden muss
 * 
 * Bei Szenarien wie Schiffsverspätung kann die 370.000er Produktion
 * nicht mehr im Jahr 2027 erreicht werden und zieht sich in 2028.
 * 
 * @param geplanteJahresproduktion - z.B. 370.000
 * @param bisherProduziert - Bereits produzierte Menge
 * @param verbleibendeTage - Verbleibende Arbeitstage im Jahr
 * @param tageskapazitaet - Maximale Tagesproduktion
 * @returns Analyse ob Überlauf ins nächste Jahr
 */
export function berechneJahresUeberlauf(
  geplanteJahresproduktion: number,
  bisherProduziert: number,
  verbleibendeTage: number,
  tageskapazitaet: number
): {
  benoetigtUeberlauf: boolean
  verbleibendeProduktion: number
  maximaleProduktionBisJahresende: number
  ueberlaufMenge: number
  ueberlaufTage: number
} {
  const verbleibendeProduktion = geplanteJahresproduktion - bisherProduziert
  const maximaleProduktionBisJahresende = verbleibendeTage * tageskapazitaet
  
  const ueberlaufMenge = Math.max(0, verbleibendeProduktion - maximaleProduktionBisJahresende)
  const ueberlaufTage = ueberlaufMenge > 0 ? Math.ceil(ueberlaufMenge / tageskapazitaet) : 0
  
  return {
    benoetigtUeberlauf: ueberlaufMenge > 0,
    verbleibendeProduktion,
    maximaleProduktionBisJahresende,
    ueberlaufMenge,
    ueberlaufTage
  }
}
