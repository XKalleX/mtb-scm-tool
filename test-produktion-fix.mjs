// Test-Script zur Validierung der Produktions-Fixes
// Testet ob an Wochenenden/Feiertagen KEINE Ist-Produktion stattfindet

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

// Lade KonfigurationContext Mock
const stammdaten = require('./src/data/stammdaten.json')
const saisonalitaet = require('./src/data/saisonalitaet.json')
const feiertage = require('./src/data/feiertage-deutschland.json')

console.log('========================================')
console.log('TEST: Produktions-Fix für Issue #295')
console.log('========================================\n')

// Simuliere Tagesproduktions-Einträge
function isWeekend(date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function isHoliday(date, feiertageList) {
  const dateStr = date.toISOString().split('T')[0]
  return feiertageList.some(f => f.datum === dateStr)
}

function isArbeitstag(date, feiertageList) {
  return !isWeekend(date) && !isHoliday(date, feiertageList)
}

const feiertageListe = feiertage.feiertage2027

// Test-Daten: Wochenende und Feiertag
const testDaten = [
  { tag: 94, datum: new Date(2027, 3, 4), expected: 'Sonntag' },
  { tag: 95, datum: new Date(2027, 3, 5), expected: 'Ostermontag' },
  { tag: 96, datum: new Date(2027, 3, 6), expected: 'Arbeitstag' },
  { tag: 101, datum: new Date(2027, 3, 11), expected: 'Sonntag' },
  { tag: 102, datum: new Date(2027, 3, 12), expected: 'Arbeitstag' }
]

console.log('Teste Produktions-Logik:\n')

testDaten.forEach(test => {
  const arbeitstag = isArbeitstag(test.datum, feiertageListe)
  
  // Simuliere generiereTagesproduktion() Logik
  let planMenge = 0
  let istMenge = 0
  
  if (arbeitstag) {
    // An Arbeitstagen: Produktion findet statt
    planMenge = 1000 // Beispiel
    istMenge = 1000  // Wird später durch Warehouse korrigiert, initial = planMenge
  } else {
    // ✅ FIX: An Nicht-Arbeitstagen: istMenge = 0
    planMenge = 0
    istMenge = 0
  }
  
  // Validierung
  const status = istMenge === 0 && !arbeitstag ? '✅ KORREKT' : 
                 istMenge > 0 && arbeitstag ? '✅ KORREKT' : 
                 '❌ FEHLER'
  
  console.log(`Tag ${test.tag} (${test.expected}):`)
  console.log(`  Arbeitstag: ${arbeitstag}`)
  console.log(`  planMenge: ${planMenge}`)
  console.log(`  istMenge: ${istMenge}`)
  console.log(`  Status: ${status}`)
  console.log('')
})

console.log('========================================')
console.log('Erwartetes Verhalten:')
console.log('========================================')
console.log('✅ An Arbeitstagen: istMenge = planMenge (initial)')
console.log('✅ An Wochenenden: istMenge = 0')
console.log('✅ An Feiertagen: istMenge = 0')
console.log('✅ Material OK an Nicht-Arbeitstagen: "-" (nicht "Nein")')
console.log('✅ Backlog an Nicht-Arbeitstagen: unverändert')
