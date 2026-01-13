/**
 * ========================================
 * SZENARIEN TESTS
 * ========================================
 * 
 * Tests zur Validierung der Szenario-Funktionalität:
 * 1. Einzelne Szenarien testen
 * 2. Kombinierte Szenarien testen
 * 3. Globale Wirksamkeit testen
 * 4. Berechnungen mit/ohne Szenarien vergleichen
 * 
 * HAW Hamburg WI3 Projekt
 */

import { 
  berechneSzenarioAuswirkungen,
  BASELINE,
  JAHRESPRODUKTION_SSOT
} from '../lib/calculations/supply-chain-metrics'
import { SzenarioConfig } from '../contexts/SzenarienContext'

/**
 * Test 1: Marketingaktion - Einzelszenario
 */
export function testMarketingaktion() {
  console.log('\n=== TEST 1: Marketingaktion ===')
  
  const szenario: SzenarioConfig = {
    id: 'test-marketing-1',
    typ: 'marketingaktion',
    parameter: {
      startKW: 28,
      dauerWochen: 4,
      erhoehungProzent: 20
    },
    aktiv: true,
    erstelltAm: new Date()
  }
  
  const auswirkungen = berechneSzenarioAuswirkungen([szenario])
  
  console.log('Baseline Produktion:', BASELINE.jahresproduktion)
  console.log('Mit Marketing (+20% für 4 Wochen):', auswirkungen.produktionsmenge)
  console.log('Delta:', auswirkungen.produktionsDelta)
  console.log('Delta %:', auswirkungen.produktionsDeltaProzent.toFixed(2) + '%')
  
  console.log('\nAuswirkungen auf Metriken:')
  console.log('- Materialverfügbarkeit:', auswirkungen.materialverfuegbarkeit, '% (Baseline:', BASELINE.materialverfuegbarkeit, '%)')
  console.log('- Liefertreue:', auswirkungen.liefertreue, '% (Baseline:', BASELINE.liefertreue, '%)')
  console.log('- Auslastung:', auswirkungen.auslastung, '% (Baseline:', BASELINE.auslastung, '%)')
  
  // Validierung
  const erwarteteDelta = (4/52) * 0.20 // 4 Wochen von 52, 20% Erhöhung
  const erwarteteProdMenge = BASELINE.jahresproduktion * (1 + erwarteteDelta)
  const isValid = Math.abs(auswirkungen.produktionsmenge - erwarteteProdMenge) < 100
  
  console.log('\n✓ Validierung:', isValid ? 'BESTANDEN' : 'FEHLGESCHLAGEN')
  console.log('  Erwartet:', Math.round(erwarteteProdMenge), 'Tatsächlich:', auswirkungen.produktionsmenge)
  
  return isValid
}

/**
 * Test 2: Maschinenausfall - Einzelszenario
 */
export function testMaschinenausfall() {
  console.log('\n=== TEST 2: Maschinenausfall ===')
  
  const szenario: SzenarioConfig = {
    id: 'test-ausfall-1',
    typ: 'maschinenausfall',
    parameter: {
      startDatum: '2027-03-15',
      dauerTage: 7,
      reduktionProzent: 60
    },
    aktiv: true,
    erstelltAm: new Date()
  }
  
  const auswirkungen = berechneSzenarioAuswirkungen([szenario])
  
  console.log('Baseline Produktion:', BASELINE.jahresproduktion)
  console.log('Mit Ausfall (-60% für 7 Tage):', auswirkungen.produktionsmenge)
  console.log('Delta:', auswirkungen.produktionsDelta)
  console.log('Delta %:', auswirkungen.produktionsDeltaProzent.toFixed(2) + '%')
  
  console.log('\nAuswirkungen auf Metriken:')
  console.log('- Materialverfügbarkeit:', auswirkungen.materialverfuegbarkeit, '% (Baseline:', BASELINE.materialverfuegbarkeit, '%)')
  console.log('- Liefertreue:', auswirkungen.liefertreue, '% (Baseline:', BASELINE.liefertreue, '%)')
  console.log('- Planerfüllungsgrad:', auswirkungen.planerfuellungsgrad, '% (Baseline:', BASELINE.planerfuellungsgrad, '%)')
  
  // Validierung: Produktion sollte sinken
  const isValid = auswirkungen.produktionsmenge < BASELINE.jahresproduktion &&
                  auswirkungen.materialverfuegbarkeit < BASELINE.materialverfuegbarkeit
  
  console.log('\n✓ Validierung:', isValid ? 'BESTANDEN' : 'FEHLGESCHLAGEN')
  console.log('  Produktion gesunken:', auswirkungen.produktionsmenge < BASELINE.jahresproduktion)
  console.log('  Material gesunken:', auswirkungen.materialverfuegbarkeit < BASELINE.materialverfuegbarkeit)
  
  return isValid
}

/**
 * Test 3: Wasserschaden - Einzelszenario
 */
export function testWasserschaden() {
  console.log('\n=== TEST 3: Wasserschaden ===')
  
  const szenario: SzenarioConfig = {
    id: 'test-wasser-1',
    typ: 'wasserschaden',
    parameter: {
      datum: '2027-02-20',
      verlustMenge: 1000,
      betroffeneTeile: 'Gemischte Komponenten aus China'
    },
    aktiv: true,
    erstelltAm: new Date()
  }
  
  const auswirkungen = berechneSzenarioAuswirkungen([szenario])
  
  console.log('Baseline Materialverfügbarkeit:', BASELINE.materialverfuegbarkeit, '%')
  console.log('Nach Wasserschaden (1000 Teile):', auswirkungen.materialverfuegbarkeit, '%')
  console.log('Delta:', auswirkungen.materialverfuegbarkeitDelta, '%')
  
  console.log('\nWeitere Auswirkungen:')
  console.log('- Liefertreue:', auswirkungen.liefertreue, '% (Baseline:', BASELINE.liefertreue, '%)')
  console.log('- Lagerumschlag:', auswirkungen.lagerumschlag, '(Baseline:', BASELINE.lagerumschlag, ')')
  
  // Validierung: Material und Liefertreue sollten sinken
  const isValid = auswirkungen.materialverfuegbarkeit < BASELINE.materialverfuegbarkeit &&
                  auswirkungen.liefertreue < BASELINE.liefertreue
  
  console.log('\n✓ Validierung:', isValid ? 'BESTANDEN' : 'FEHLGESCHLAGEN')
  
  return isValid
}

/**
 * Test 4: Schiffsverspätung - Einzelszenario
 */
export function testSchiffsverspaetung() {
  console.log('\n=== TEST 4: Schiffsverspätung ===')
  
  const szenario: SzenarioConfig = {
    id: 'test-schiff-1',
    typ: 'schiffsverspaetung',
    parameter: {
      ursprungAnkunft: '2027-02-16',
      verspaetungTage: 4,
      neueAnkunft: '2027-02-20'
    },
    aktiv: true,
    erstelltAm: new Date()
  }
  
  const auswirkungen = berechneSzenarioAuswirkungen([szenario])
  
  console.log('Baseline Durchlaufzeit:', BASELINE.durchlaufzeit, 'Tage')
  console.log('Mit Verspätung (+4 Tage):', auswirkungen.durchlaufzeit, 'Tage')
  console.log('Delta:', auswirkungen.durchlaufzeitDelta, 'Tage')
  
  console.log('\nWeitere Auswirkungen:')
  console.log('- Liefertreue:', auswirkungen.liefertreue, '% (Baseline:', BASELINE.liefertreue, '%)')
  console.log('- Materialverfügbarkeit:', auswirkungen.materialverfuegbarkeit, '% (Baseline:', BASELINE.materialverfuegbarkeit, '%)')
  
  // Validierung: Durchlaufzeit sollte um 4 Tage steigen
  const isValid = auswirkungen.durchlaufzeitDelta === 4 &&
                  auswirkungen.liefertreue < BASELINE.liefertreue
  
  console.log('\n✓ Validierung:', isValid ? 'BESTANDEN' : 'FEHLGESCHLAGEN')
  console.log('  Durchlaufzeit +4:', auswirkungen.durchlaufzeitDelta === 4)
  console.log('  Liefertreue gesunken:', auswirkungen.liefertreue < BASELINE.liefertreue)
  
  return isValid
}

/**
 * Test 5: Mehrere Szenarien kombiniert
 */
export function testKombinierteSzenarien() {
  console.log('\n=== TEST 5: Kombinierte Szenarien ===')
  
  const szenarien: SzenarioConfig[] = [
    {
      id: 'kombi-marketing',
      typ: 'marketingaktion',
      parameter: { startKW: 28, dauerWochen: 4, erhoehungProzent: 20 },
      aktiv: true,
      erstelltAm: new Date()
    },
    {
      id: 'kombi-ausfall',
      typ: 'maschinenausfall',
      parameter: { startDatum: '2027-03-15', dauerTage: 5, reduktionProzent: 40 },
      aktiv: true,
      erstelltAm: new Date()
    }
  ]
  
  const auswirkungen = berechneSzenarioAuswirkungen(szenarien)
  
  console.log('Baseline Produktion:', BASELINE.jahresproduktion)
  console.log('Mit beiden Szenarien:', auswirkungen.produktionsmenge)
  console.log('Delta:', auswirkungen.produktionsDelta)
  
  console.log('\nKombinierte Auswirkungen:')
  console.log('- Materialverfügbarkeit:', auswirkungen.materialverfuegbarkeit, '%')
  console.log('- Liefertreue:', auswirkungen.liefertreue, '%')
  console.log('- Auslastung:', auswirkungen.auslastung, '%')
  console.log('- Planerfüllungsgrad:', auswirkungen.planerfuellungsgrad, '%')
  
  // Validierung: Beide Effekte sollten sichtbar sein
  // Marketing erhöht, Ausfall senkt - Nettoeffekt kann variieren
  const isValid = auswirkungen.materialverfuegbarkeit < BASELINE.materialverfuegbarkeit // Ausfall-Effekt
  
  console.log('\n✓ Validierung:', isValid ? 'BESTANDEN' : 'FEHLGESCHLAGEN')
  console.log('  Material durch Ausfall beeinträchtigt:', isValid)
  
  return isValid
}

/**
 * Test 6: Keine Szenarien (Baseline-Vergleich)
 */
export function testBaseline() {
  console.log('\n=== TEST 6: Baseline (keine Szenarien) ===')
  
  const auswirkungen = berechneSzenarioAuswirkungen([])
  
  console.log('Baseline Produktion:', BASELINE.jahresproduktion)
  console.log('Ohne Szenarien:', auswirkungen.produktionsmenge)
  console.log('Delta:', auswirkungen.produktionsDelta)
  
  console.log('\nAlle Metriken:')
  console.log('- Materialverfügbarkeit:', auswirkungen.materialverfuegbarkeit, '% (sollte sein:', BASELINE.materialverfuegbarkeit, '%)')
  console.log('- Liefertreue:', auswirkungen.liefertreue, '% (sollte sein:', BASELINE.liefertreue, '%)')
  console.log('- Durchlaufzeit:', auswirkungen.durchlaufzeit, 'Tage (sollte sein:', BASELINE.durchlaufzeit, 'Tage)')
  
  // Validierung: Sollte exakt Baseline sein
  const isValid = auswirkungen.produktionsmenge === BASELINE.jahresproduktion &&
                  auswirkungen.produktionsDelta === 0 &&
                  auswirkungen.materialverfuegbarkeit === BASELINE.materialverfuegbarkeit
  
  console.log('\n✓ Validierung:', isValid ? 'BESTANDEN' : 'FEHLGESCHLAGEN')
  console.log('  Produktion unverändert:', auswirkungen.produktionsmenge === BASELINE.jahresproduktion)
  console.log('  Material unverändert:', auswirkungen.materialverfuegbarkeit === BASELINE.materialverfuegbarkeit)
  
  return isValid
}

/**
 * Führt alle Tests aus
 */
export function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════╗')
  console.log('║   SZENARIEN TEST SUITE                            ║')
  console.log('║   MTB Supply Chain Management 2027                ║')
  console.log('║   HAW Hamburg WI3 Projekt                         ║')
  console.log('╚═══════════════════════════════════════════════════╝')
  
  const results = {
    test1: testMarketingaktion(),
    test2: testMaschinenausfall(),
    test3: testWasserschaden(),
    test4: testSchiffsverspaetung(),
    test5: testKombinierteSzenarien(),
    test6: testBaseline()
  }
  
  console.log('\n╔═══════════════════════════════════════════════════╗')
  console.log('║   ZUSAMMENFASSUNG                                 ║')
  console.log('╚═══════════════════════════════════════════════════╝')
  
  const passed = Object.values(results).filter(r => r).length
  const total = Object.keys(results).length
  
  console.log('\nErgebnisse:')
  console.log('- Test 1 (Marketingaktion):', results.test1 ? '✓ BESTANDEN' : '✗ FEHLGESCHLAGEN')
  console.log('- Test 2 (Maschinenausfall):', results.test2 ? '✓ BESTANDEN' : '✗ FEHLGESCHLAGEN')
  console.log('- Test 3 (Wasserschaden):', results.test3 ? '✓ BESTANDEN' : '✗ FEHLGESCHLAGEN')
  console.log('- Test 4 (Schiffsverspätung):', results.test4 ? '✓ BESTANDEN' : '✗ FEHLGESCHLAGEN')
  console.log('- Test 5 (Kombiniert):', results.test5 ? '✓ BESTANDEN' : '✗ FEHLGESCHLAGEN')
  console.log('- Test 6 (Baseline):', results.test6 ? '✓ BESTANDEN' : '✗ FEHLGESCHLAGEN')
  
  console.log('\n' + '='.repeat(55))
  console.log(`GESAMT: ${passed}/${total} Tests bestanden (${Math.round(passed/total*100)}%)`)
  console.log('='.repeat(55))
  
  return passed === total
}

// Export für manuelle Tests
export default {
  runAll: runAllTests,
  einzelTests: {
    marketingaktion: testMarketingaktion,
    maschinenausfall: testMaschinenausfall,
    wasserschaden: testWasserschaden,
    schiffsverspaetung: testSchiffsverspaetung,
    kombiniert: testKombinierteSzenarien,
    baseline: testBaseline
  }
}
