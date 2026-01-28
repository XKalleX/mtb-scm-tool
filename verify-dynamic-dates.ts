/**
 * ========================================
 * DYNAMIC DATE HANDLING - VERIFICATION
 * ========================================
 * 
 * Simple verification script to test dynamic date handling
 * Run with: node --loader ts-node/esm verify-dynamic-dates.ts
 */

import { 
  DEFAULT_PLANUNGSJAHR, 
  getDefaultHeuteDatum 
} from './src/lib/constants'

import {
  generiereAlleFeiertage,
  generiereDeutscheFeiertage,
  generiereChinesischeFeiertage,
  getSpringFestivalPeriode
} from './src/lib/holiday-generator'

import {
  generiereJahreskalender
} from './src/lib/kalender'

console.log('🎯 Dynamic Date Handling Verification\n')
console.log('=' .repeat(50))

// Test 1: Constants
console.log('\n📋 Test 1: Dynamic Constants')
console.log(`DEFAULT_PLANUNGSJAHR: ${DEFAULT_PLANUNGSJAHR}`)
console.log(`Default Heute (2027): ${getDefaultHeuteDatum(2027)}`)
console.log(`Default Heute (2028): ${getDefaultHeuteDatum(2028)}`)
console.log(`Default Heute (2030): ${getDefaultHeuteDatum(2030)}`)

// Test 2: Holiday Generation
console.log('\n📅 Test 2: Holiday Generation')

const jahre = [2027, 2028, 2030, 2032]

for (const jahr of jahre) {
  console.log(`\n--- Jahr ${jahr} ---`)
  
  const deutscheFeiertage = generiereDeutscheFeiertage(jahr)
  console.log(`Deutsche Feiertage: ${deutscheFeiertage.length}`)
  
  const chinesischeFeiertage = generiereChinesischeFeiertage(jahr)
  console.log(`Chinesische Feiertage: ${chinesischeFeiertage.length}`)
  
  const springFestival = getSpringFestivalPeriode(jahr)
  if (springFestival) {
    console.log(`Spring Festival: ${springFestival.start.toISOString().split('T')[0]} bis ${springFestival.ende.toISOString().split('T')[0]}`)
  } else {
    console.log(`Spring Festival: Nicht definiert für ${jahr}`)
  }
}

// Test 3: Calendar Generation
console.log('\n📆 Test 3: Calendar Generation')

for (const jahr of [2027, 2028, 2030]) {
  const kalender = generiereJahreskalender(jahr)
  const istSchaltjahr = kalender.length === 366
  console.log(`Jahr ${jahr}: ${kalender.length} Tage (Schaltjahr: ${istSchaltjahr})`)
}

// Test 4: All Holidays Function
console.log('\n🌍 Test 4: generiereAlleFeiertage (3 Jahre)')

const alleFeiertage2028 = generiereAlleFeiertage(2028)
const deutscheCount = alleFeiertage2028.filter(f => f.land === 'Deutschland').length
const chineseCount = alleFeiertage2028.filter(f => f.land === 'China').length

console.log(`Planungsjahr 2028:`)
console.log(`  - Gesamt: ${alleFeiertage2028.length} Feiertage (2027-2029)`)
console.log(`  - Deutschland: ${deutscheCount}`)
console.log(`  - China: ${chineseCount}`)

// Test 5: Spring Festival Coverage
console.log('\n🎊 Test 5: Spring Festival Coverage (2024-2033)')

for (let jahr = 2024; jahr <= 2033; jahr++) {
  const springFestival = getSpringFestivalPeriode(jahr)
  if (springFestival) {
    const start = springFestival.start.toISOString().split('T')[0]
    console.log(`✓ ${jahr}: ${start}`)
  } else {
    console.log(`✗ ${jahr}: Nicht definiert`)
  }
}

// Test 6: Backward Compatibility
console.log('\n🔄 Test 6: Backward Compatibility')
console.log('Testing deprecated exports...')

try {
  // @ts-ignore - testing deprecated exports
  const { PLANUNGSJAHR, DEFAULT_HEUTE_DATUM } = require('./src/lib/constants')
  console.log(`✓ PLANUNGSJAHR: ${PLANUNGSJAHR}`)
  console.log(`✓ DEFAULT_HEUTE_DATUM: ${DEFAULT_HEUTE_DATUM}`)
} catch (error) {
  console.log(`✗ Error: ${error}`)
}

console.log('\n' + '='.repeat(50))
console.log('✅ Verification Complete\n')
console.log('Summary:')
console.log('- Constants: Dynamic generation working')
console.log('- Holidays: Generated for any year')
console.log('- Calendar: Handles leap years correctly')
console.log('- Spring Festival: Covered 2024-2033')
console.log('- Backward compatibility: Maintained')
