/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TEST: Production Backlog Logic - Catch-up Behavior
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This test validates that production correctly catches up when material becomes
 * available after a shortage (engpass).
 * 
 * ISSUE: Previously, production only considered daily demand, ignoring accumulated
 * backlog from previous days. This caused production to lag even when material
 * was available.
 * 
 * EXPECTED BEHAVIOR:
 * - When material is insufficient, production backlog accumulates
 * - When material becomes available, system should produce daily demand + backlog
 * - Production should catch up to fulfill all accumulated unproduced demand
 */

import { berechneBedarfsBacklog } from '../lib/calculations/bedarfs-backlog-rechnung'
import type { KonfigurationData } from '@/contexts/KonfigurationContext'
import type { TagesProduktionEntry } from '@/lib/calculations/zentrale-produktionsplanung'

describe('Production Backlog Logic', () => {
  // Create minimal test configuration
  const createTestConfig = (): KonfigurationData => ({
    planungsjahr: 2027,
    jahresproduktion: 1000,
    varianten: [
      {
        id: 'TEST_VAR',
        name: 'Test Variant',
        anteilPrognose: 1.0,
        stueckkosten: 100,
        verkaufspreis: 200
      }
    ],
    bauteile: [
      {
        id: 'TEST_SATTEL',
        name: 'Test Saddle',
        kategorie: 'Sattel',
        stueckkosten: 10,
        lieferantId: 'TEST_LF'
      }
    ],
    stueckliste: [
      {
        mtbVariante: 'TEST_VAR',
        bauteilId: 'TEST_SATTEL',
        menge: 1
      }
    ],
    lieferant: {
      id: 'TEST_LF',
      name: 'Test Supplier',
      land: 'China',
      losgroesse: 500,
      vorlaufzeit: 49,
      liefertag: 'Mittwoch'
    },
    feiertage: [],
    saisonalitaet: Array(12).fill(1/12)
  })

  test('Production catches up when material becomes available after shortage', () => {
    const config = createTestConfig()
    
    // Create production plan: 100 bikes on Day 1, 100 bikes on Day 60
    const produktionsplaene: Record<string, TagesProduktionEntry[]> = {
      'TEST_VAR': []
    }
    
    // Initialize all days with 0 production
    for (let i = 0; i < 365; i++) {
      const datum = new Date(2027, 0, 1)
      datum.setDate(datum.getDate() + i)
      produktionsplaene['TEST_VAR'].push({
        datum,
        tag: i + 1,
        monat: datum.getMonth() + 1,
        istArbeitstag: true,
        planMenge: 0,
        istMenge: 0,
        kumulativPlan: 0,
        kumulativIst: 0,
        monatsFehlerVorher: 0,
        monatsFehlerNachher: 0,
        monatsKorrektur: 0
      })
    }
    
    // Day 1: Need 100 saddles (no material available yet, order placed, arrives Day 50)
    produktionsplaene['TEST_VAR'][0].planMenge = 100
    produktionsplaene['TEST_VAR'][0].istMenge = 100
    
    // Day 60: Need another 100 saddles (material from Day 1 order available)
    produktionsplaene['TEST_VAR'][59].planMenge = 100
    produktionsplaene['TEST_VAR'][59].istMenge = 100
    
    const ergebnis = berechneBedarfsBacklog(produktionsplaene, config)
    
    const komponente = ergebnis.komponenten['TEST_SATTEL']
    expect(komponente).toBeDefined()
    
    // Day 1: Need 100, but no material → should produce 0
    const day1 = komponente.tagesDetails[0]
    expect(day1.bedarf).toBe(100)
    expect(day1.verfuegbaresMaterial).toBe(0)
    expect(day1.tatsaechlicheProduktion).toBe(0)
    expect(day1.materialEngpass).toBe(true)
    
    // Day 50: Material arrives (500 units from order)
    const day50 = komponente.tagesDetails[49]
    expect(day50.materialAnkunft).toBe(500)
    expect(day50.lagerbestand).toBe(500) // No production on this day
    
    // Day 60: Need 100 more, but ALSO should catch up the 100 from Day 1
    // Total demand = 100 (today) + 100 (backlog from Day 1) = 200
    // Available = 500, so should produce 200
    const day60 = komponente.tagesDetails[59]
    expect(day60.bedarf).toBe(100)
    expect(day60.verfuegbaresMaterial).toBe(500)
    
    // KEY TEST: Should produce MORE than daily demand to catch up
    // Expected: 200 (100 daily + 100 backlog)
    expect(day60.tatsaechlicheProduktion).toBe(200)
    expect(day60.lagerbestand).toBe(300) // 500 - 200 = 300
    
    // Verify total production equals total demand
    expect(komponente.gesamtProduziert).toBe(komponente.gesamtBedarf)
    expect(komponente.gesamtFehlmenge).toBe(0)
  })

  test('Production backlog accumulates over multiple days', () => {
    const config = createTestConfig()
    
    // Create production plan: 50 bikes each on Days 1, 2, 3
    const produktionsplaene: Record<string, TagesProduktionEntry[]> = {
      'TEST_VAR': []
    }
    
    for (let i = 0; i < 365; i++) {
      const datum = new Date(2027, 0, 1)
      datum.setDate(datum.getDate() + i)
      produktionsplaene['TEST_VAR'].push({
        datum,
        tag: i + 1,
        monat: datum.getMonth() + 1,
        istArbeitstag: true,
        planMenge: 0,
        istMenge: 0,
        kumulativPlan: 0,
        kumulativIst: 0,
        monatsFehlerVorher: 0,
        monatsFehlerNachher: 0,
        monatsKorrektur: 0
      })
    }
    
    // Days 1-3: Need 50 saddles each day
    produktionsplaene['TEST_VAR'][0].planMenge = 50
    produktionsplaene['TEST_VAR'][0].istMenge = 50
    produktionsplaene['TEST_VAR'][1].planMenge = 50
    produktionsplaene['TEST_VAR'][1].istMenge = 50
    produktionsplaene['TEST_VAR'][2].planMenge = 50
    produktionsplaene['TEST_VAR'][2].istMenge = 50
    
    const ergebnis = berechneBedarfsBacklog(produktionsplaene, config)
    const komponente = ergebnis.komponenten['TEST_SATTEL']
    
    // Days 1-3: No material, can't produce
    expect(komponente.tagesDetails[0].tatsaechlicheProduktion).toBe(0)
    expect(komponente.tagesDetails[1].tatsaechlicheProduktion).toBe(0)
    expect(komponente.tagesDetails[2].tatsaechlicheProduktion).toBe(0)
    
    // Day 50: Material arrives (500 units)
    const day50 = komponente.tagesDetails[49]
    expect(day50.materialAnkunft).toBe(500)
    
    // After Day 50, when there's no immediate demand but backlog exists,
    // the system should have caught up the 150 units (50+50+50) from Days 1-3
    // Let's verify this by checking production immediately after Day 50
    
    // Day 51: No new demand, but should have cleared backlog if needed
    // The catch-up could happen on Day 50 if there's demand, or spread over subsequent days
    
    // Total production should eventually equal total demand
    expect(komponente.gesamtProduziert).toBe(komponente.gesamtBedarf)
    expect(komponente.gesamtFehlmenge).toBe(0)
  })

  test('Production limited by available material even with backlog', () => {
    const config = createTestConfig()
    
    // Create production plan
    const produktionsplaene: Record<string, TagesProduktionEntry[]> = {
      'TEST_VAR': []
    }
    
    for (let i = 0; i < 365; i++) {
      const datum = new Date(2027, 0, 1)
      datum.setDate(datum.getDate() + i)
      produktionsplaene['TEST_VAR'].push({
        datum,
        tag: i + 1,
        monat: datum.getMonth() + 1,
        istArbeitstag: true,
        planMenge: 0,
        istMenge: 0,
        kumulativPlan: 0,
        kumulativIst: 0,
        monatsFehlerVorher: 0,
        monatsFehlerNachher: 0,
        monatsKorrektur: 0
      })
    }
    
    // Day 1: Need 300 saddles
    produktionsplaene['TEST_VAR'][0].planMenge = 300
    produktionsplaene['TEST_VAR'][0].istMenge = 300
    
    // Day 60: Need another 300 saddles
    produktionsplaene['TEST_VAR'][59].planMenge = 300
    produktionsplaene['TEST_VAR'][59].istMenge = 300
    
    const ergebnis = berechneBedarfsBacklog(produktionsplaene, config)
    const komponente = ergebnis.komponenten['TEST_SATTEL']
    
    // Day 1: Can't produce, backlog = 300
    expect(komponente.tagesDetails[0].tatsaechlicheProduktion).toBe(0)
    
    // Day 50: 500 units arrive
    const day50 = komponente.tagesDetails[49]
    expect(day50.materialAnkunft).toBe(500)
    
    // Day 60: Need 300 + 300 backlog = 600 total, but only 500 available
    const day60 = komponente.tagesDetails[59]
    expect(day60.bedarf).toBe(300)
    expect(day60.verfuegbaresMaterial).toBe(500)
    
    // Should produce all available: 500 (limited by material)
    expect(day60.tatsaechlicheProduktion).toBe(500)
    
    // Remaining backlog: 600 - 500 = 100
    // This will be caught up when next material arrives
  })
})
