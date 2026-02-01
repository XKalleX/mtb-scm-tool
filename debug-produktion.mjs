// Debug script to trace production on weekends/holidays

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

// Load the JSON data directly
const stammdaten = require('./src/data/stammdaten.json')
const saisonalitaet = require('./src/data/saisonalitaet.json')
const feiertageDeutschland = require('./src/data/feiertage-deutschland.json')
const stueckliste = require('./src/data/stueckliste.json')
const lieferantChina = require('./src/data/lieferant-china.json')

// Function to check if date is a weekend
function isWeekend(date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function toLocalISODateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Check if a date is a German holiday
function isDeutschlandFeiertag(date, feiertage) {
  const dateStr = toLocalISODateString(date)
  const feiertage2027 = feiertage.feiertage2027.map(f => f.datum)
  return feiertage2027.includes(dateStr)
}

// Check if date is a work day in Germany
function isArbeitstag_Deutschland(date, feiertage) {
  if (isWeekend(date)) {
    return false
  }
  if (isDeutschlandFeiertag(date, feiertage)) {
    return false
  }
  return true
}

console.log('========================================')
console.log('TESTING WEEKEND/HOLIDAY DETECTION')
console.log('========================================\n')

// Test specific days from screenshots
const testDates = [
  { tag: 94, expected: 'So', shouldBeArbeitstag: false },    // 04.04. Sunday
  { tag: 95, expected: 'Mo', shouldBeArbeitstag: false, holiday: 'Ostermontag' },  // 05.04. Easter Monday (Holiday)
  { tag: 96, expected: 'Di', shouldBeArbeitstag: true },     // 06.04. Tuesday
  { tag: 101, expected: 'So', shouldBeArbeitstag: false },   // 11.04. Sunday
  { tag: 102, expected: 'Mo', shouldBeArbeitstag: true },    // 12.04. Monday
  { tag: 108, expected: 'So', shouldBeArbeitstag: false },   // 18.04. Sunday
  { tag: 109, expected: 'Mo', shouldBeArbeitstag: true },    // 19.04. Monday
]

testDates.forEach(test => {
  const date = new Date(2027, 0, test.tag)  // tag = day of year
  const wochentag = date.toLocaleDateString('de-DE', { weekday: 'short' })
  const isWknd = isWeekend(date)
  const isHoliday = isDeutschlandFeiertag(date, feiertageDeutschland)
  const isAT = isArbeitstag_Deutschland(date, feiertageDeutschland)
  
  const dateFormatted = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  
  console.log(`Tag ${test.tag} (${dateFormatted} ${wochentag}):`)
  console.log(`  isWeekend: ${isWknd}`)
  console.log(`  isHoliday: ${isHoliday}${test.holiday ? ` (${test.holiday})` : ''}`)
  console.log(`  isArbeitstag: ${isAT} (expected: ${test.shouldBeArbeitstag})`)
  console.log(`  MATCH: ${isAT === test.shouldBeArbeitstag ? '✅' : '❌ MISMATCH!'}`)
  console.log()
})

console.log('========================================')
console.log('GERMAN HOLIDAYS 2027 (from JSON)')
console.log('========================================\n')

feiertageDeutschland.feiertage2027.forEach(f => {
  const date = new Date(f.datum)
  const wochentag = date.toLocaleDateString('de-DE', { weekday: 'long' })
  console.log(`  ${f.datum} (${wochentag}): ${f.name}`)
})

