/**
 * DEBUG SKRIPT: Produktionsproblem analysieren
 * 
 * Problem: 370.000 Teile geliefert, aber nur 307.291 produziert
 * Erwartet: Alle gelieferten Teile müssen produziert werden
 */

import stammdaten from './src/data/stammdaten.json' assert { type: 'json' }
import saisonalitaet from './src/data/saisonalitaet.json' assert { type: 'json' }
import stueckliste from './src/data/stueckliste.json' assert { type: 'json' }

console.log('═══════════════════════════════════════════════════════════════════')
console.log('PRODUKTIONS-DEBUG: Analysiere 370k vs 307k Problem')
console.log('═══════════════════════════════════════════════════════════════════\n')

// 1. JAHRESPRODUKTION PRÜFEN
console.log('1️⃣ JAHRESPRODUKTION:')
console.log('   Gesamt:', stammdaten.jahresproduktion.gesamt.toLocaleString('de-DE'))

// 2. VARIANTEN-ANTEILE PRÜFEN
console.log('\n2️⃣ VARIANTEN-ANTEILE:')
let summeVarianten = 0
stammdaten.varianten.forEach(v => {
  const jahresMenge = Math.round(stammdaten.jahresproduktion.gesamt * v.anteilPrognose)
  summeVarianten += jahresMenge
  console.log(`   ${v.name}: ${v.anteilPrognose * 100}% = ${jahresMenge.toLocaleString('de-DE')} Bikes`)
})
console.log(`   SUMME: ${summeVarianten.toLocaleString('de-DE')} Bikes`)
console.log(`   Differenz zur Jahresproduktion: ${(summeVarianten - stammdaten.jahresproduktion.gesamt).toLocaleString('de-DE')}`)

// 3. SÄTTEL PRO BIKE PRÜFEN
console.log('\n3️⃣ SÄTTEL PRO BIKE (Stückliste):')
const sattelProBike = {}
stueckliste.stueckliste.forEach(pos => {
  if (pos.bauteilId.startsWith('SAT_')) {
    if (!sattelProBike[pos.mtbVariante]) {
      sattelProBike[pos.mtbVariante] = 0
    }
    sattelProBike[pos.mtbVariante] += pos.menge
  }
})

console.log('   Sättel pro Bike:')
Object.entries(sattelProBike).forEach(([variante, anzahl]) => {
  console.log(`   - ${variante}: ${anzahl} Sattel`)
})

// 4. BERECHNE ERWARTETEN SATTEL-BEDARF
console.log('\n4️⃣ ERWARTETER SATTEL-BEDARF:')
let gesamtSattelBedarf = 0
stammdaten.varianten.forEach(v => {
  const jahresMenge = Math.round(stammdaten.jahresproduktion.gesamt * v.anteilPrognose)
  const sattel = sattelProBike[v.id] || 1 // 1 Sattel pro Bike als Standard
  const sattelBedarf = jahresMenge * sattel
  gesamtSattelBedarf += sattelBedarf
  console.log(`   ${v.name}: ${jahresMenge.toLocaleString('de-DE')} Bikes × ${sattel} Sattel = ${sattelBedarf.toLocaleString('de-DE')} Sättel`)
})
console.log(`   GESAMT-BEDARF: ${gesamtSattelBedarf.toLocaleString('de-DE')} Sättel`)

// 5. SAISONALITÄT PRÜFEN
console.log('\n5️⃣ SAISONALITÄT:')
const gesamtArbeitstage = saisonalitaet.monate.reduce((sum, m) => sum + m.arbeitstage, 0)
const gesamtBikesPrognose = saisonalitaet.monate.reduce((sum, m) => sum + m.bikes, 0)
console.log(`   Arbeitstage gesamt: ${gesamtArbeitstage}`)
console.log(`   Bikes gesamt (aus Saisonalität): ${gesamtBikesPrognose.toLocaleString('de-DE')}`)
console.log(`   Durchschnitt pro Tag: ${Math.round(stammdaten.jahresproduktion.gesamt / gesamtArbeitstage).toLocaleString('de-DE')} Bikes`)

// 6. PROBLEM-HYPOTHESE
console.log('\n6️⃣ PROBLEM-HYPOTHESE:')
console.log('   ❌ Aktuell: 370.000 Teile geliefert, aber nur 307.291 produziert')
console.log('   ❌ Differenz: 62.709 Teile verbleiben im Lager')
console.log('')
console.log('   💡 Mögliche Ursachen:')
console.log('   1. Warehouse-Management bucht Verbrauch nur auf Basis von istMenge')
console.log('   2. istMenge könnte durch Material-Checks reduziert sein')
console.log('   3. Bestellungen basieren auf planMenge (370k), aber Verbrauch auf istMenge (<370k)')
console.log('')
console.log('   ✅ Lösung: Sicherstellen dass ALLE bestellten Teile auch produziert werden!')
console.log('      - Entweder: Bestellungen basieren auf istMenge (tatsächlich produziert)')
console.log('      - Oder: istMenge = planMenge (keine Reduktion durch Material-Checks)')

console.log('\n═══════════════════════════════════════════════════════════════════')
console.log('ANALYSE ABGESCHLOSSEN')
console.log('═══════════════════════════════════════════════════════════════════')
