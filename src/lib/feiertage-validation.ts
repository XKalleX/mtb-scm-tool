/**
 * ========================================
 * TEST: Deutsche vs. Chinesische Arbeitstage
 * ========================================
 * 
 * Verifiziert, dass die länderspezifischen Feiertagsberechnungen korrekt funktionieren
 */

import { 
  istArbeitstag_Deutschland, 
  istArbeitstag_China,
  zaehleArbeitstageProMonat_Deutschland,
  istDeutschlandFeiertag,
  istChinaFeiertag
} from './kalender'

/**
 * Test 1: Deutsche Feiertage werden erkannt
 */
export function testDeutscheFeiertage() {
  const neujahr = new Date('2027-01-01') // Neujahr (Deutschland)
  const karfreitag = new Date('2027-04-02') // Karfreitag (Deutschland)
  const tagDerArbeit = new Date('2027-05-01') // Tag der Arbeit (Deutschland)
  
  console.log('📅 TEST 1: Deutsche Feiertage')
  console.log('─────────────────────────────')
  console.log(`01.01.2027 (Neujahr):`)
  console.log(`  ├─ Ist deutscher Feiertag: ${istDeutschlandFeiertag(neujahr).length > 0 ? '✅ JA' : '❌ NEIN'}`)
  console.log(`  ├─ Ist deutscher Arbeitstag: ${istArbeitstag_Deutschland(neujahr) ? '❌ JA' : '✅ NEIN'}`)
  console.log(`  └─ Ist chinesischer Arbeitstag: ${istArbeitstag_China(neujahr) ? '⚠️ JA (kein chin. Feiertag)' : '✅ NEIN'}`)
  
  console.log(`\n02.04.2027 (Karfreitag):`)
  console.log(`  ├─ Ist deutscher Feiertag: ${istDeutschlandFeiertag(karfreitag).length > 0 ? '✅ JA' : '❌ NEIN'}`)
  console.log(`  ├─ Ist deutscher Arbeitstag: ${istArbeitstag_Deutschland(karfreitag) ? '❌ JA' : '✅ NEIN'}`)
  console.log(`  └─ Ist chinesischer Arbeitstag: ${istArbeitstag_China(karfreitag) ? '⚠️ JA (kein chin. Feiertag)' : '✅ NEIN'}`)
  
  console.log(`\n01.05.2027 (Tag der Arbeit):`)
  console.log(`  ├─ Ist deutscher Feiertag: ${istDeutschlandFeiertag(tagDerArbeit).length > 0 ? '✅ JA' : '❌ NEIN'}`)
  console.log(`  ├─ Ist deutscher Arbeitstag: ${istArbeitstag_Deutschland(tagDerArbeit) ? '❌ JA' : '✅ NEIN'}`)
  console.log(`  └─ Ist chinesischer Arbeitstag: ${istArbeitstag_China(tagDerArbeit) ? '⚠️ JA (kein chin. Feiertag)' : '✅ NEIN'}`)
  console.log('')
}

/**
 * Test 2: Chinesische Feiertage werden erkannt
 */
export function testChinesischeFeiertage() {
  const springFestival = new Date('2027-02-08') // Spring Festival (China)
  const qingmingFestival = new Date('2027-04-05') // Qingming Festival (China)
  
  console.log('🏮 TEST 2: Chinesische Feiertage')
  console.log('─────────────────────────────')
  console.log(`08.02.2027 (Spring Festival):`)
  console.log(`  ├─ Ist chinesischer Feiertag: ${istChinaFeiertag(springFestival).length > 0 ? '✅ JA' : '❌ NEIN'}`)
  console.log(`  ├─ Ist chinesischer Arbeitstag: ${istArbeitstag_China(springFestival) ? '❌ JA' : '✅ NEIN'}`)
  console.log(`  └─ Ist deutscher Arbeitstag: ${istArbeitstag_Deutschland(springFestival) ? '⚠️ JA (kein dt. Feiertag)' : '✅ NEIN'}`)
  
  console.log(`\n05.04.2027 (Qingming Festival):`)
  console.log(`  ├─ Ist chinesischer Feiertag: ${istChinaFeiertag(qingmingFestival).length > 0 ? '✅ JA' : '❌ NEIN'}`)
  console.log(`  ├─ Ist chinesischer Arbeitstag: ${istArbeitstag_China(qingmingFestival) ? '❌ JA' : '✅ NEIN'}`)
  console.log(`  └─ Ist deutscher Arbeitstag: ${istArbeitstag_Deutschland(qingmingFestival) ? '⚠️ JA (kein dt. Feiertag)' : '✅ NEIN'}`)
  console.log('')
}

/**
 * Test 3: Arbeitstage pro Monat (Deutschland)
 */
export function testArbeitstageProMonat() {
  const arbeitstage = zaehleArbeitstageProMonat_Deutschland()
  
  console.log('📊 TEST 3: Deutsche Arbeitstage pro Monat 2027')
  console.log('───────────────────────────────────────────')
  console.log('Monat        | Arbeitstage (DE)')
  console.log('─────────────┼─────────────────')
  
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
  
  let gesamt = 0
  arbeitstage.forEach((tage, index) => {
    gesamt += tage
    console.log(`${monate[index].padEnd(13)}│ ${tage.toString().padStart(2)} Tage`)
  })
  
  console.log('─────────────┴─────────────────')
  console.log(`GESAMT       │ ${gesamt} Tage`)
  console.log('')
}

/**
 * Test 4: Normaler Arbeitstag (kein Feiertag, kein Wochenende)
 */
export function testNormalerArbeitstag() {
  const normaler_tag = new Date('2027-01-04') // Montag, 4. Januar 2027
  
  console.log('💼 TEST 4: Normaler Arbeitstag')
  console.log('─────────────────────────────')
  console.log(`04.01.2027 (Montag):`)
  console.log(`  ├─ Ist deutscher Feiertag: ${istDeutschlandFeiertag(normaler_tag).length > 0 ? '❌ JA' : '✅ NEIN'}`)
  console.log(`  ├─ Ist chinesischer Feiertag: ${istChinaFeiertag(normaler_tag).length > 0 ? '❌ JA' : '✅ NEIN'}`)
  console.log(`  ├─ Ist deutscher Arbeitstag: ${istArbeitstag_Deutschland(normaler_tag) ? '✅ JA' : '❌ NEIN'}`)
  console.log(`  └─ Ist chinesischer Arbeitstag: ${istArbeitstag_China(normaler_tag) ? '✅ JA' : '❌ NEIN'}`)
  console.log('')
}

/**
 * Führe alle Tests aus
 */
export function runAllTests() {
  console.log('\n')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🧪 VALIDIERUNG: Deutsche vs. Chinesische Feiertage')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')
  
  testDeutscheFeiertage()
  testChinesischeFeiertage()
  testArbeitstageProMonat()
  testNormalerArbeitstag()
  
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('✅ ALLE TESTS ABGESCHLOSSEN')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')
  console.log('📝 INTERPRETATION:')
  console.log('  ✅ = Korrekt (erwartet)')
  console.log('  ⚠️ = Unterschied erkannt (korrekt, aber beachtenswert)')
  console.log('  ❌ = Fehler (unerwartet)')
  console.log('')
}

// Exportiere für manuelle Tests
export default {
  testDeutscheFeiertage,
  testChinesischeFeiertage,
  testArbeitstageProMonat,
  testNormalerArbeitstag,
  runAllTests
}
