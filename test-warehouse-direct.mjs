#!/usr/bin/env node
/**
 * DIREKTER TEST: Warehouse-Berechnung ausführen und Delta prüfen
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Lade Konfiguration
const stammdaten = JSON.parse(readFileSync(join(__dirname, 'src/data/stammdaten.json'), 'utf-8'))
const saisonalitaet = JSON.parse(readFileSync(join(__dirname, 'src/data/saisonalitaet.json'), 'utf-8'))
const stueckliste = JSON.parse(readFileSync(join(__dirname, 'src/data/stueckliste.json'), 'utf-8'))
const lieferantChina = JSON.parse(readFileSync(join(__dirname, 'src/data/lieferant-china.json'), 'utf-8'))
const feiertageDeutschland = JSON.parse(readFileSync(join(__dirname, 'src/data/feiertage-deutschland.json'), 'utf-8'))
const feiertageChina = JSON.parse(readFileSync(join(__dirname, 'src/data/feiertage-china.json'), 'utf-8'))

console.log('═══════════════════════════════════════════════════════════════════')
console.log('WAREHOUSE DELTA TEST')
console.log('═══════════════════════════════════════════════════════════════════\n')

// Erstelle Konfigurationsobjekt
const konfiguration = {
  stammdaten: {
    jahresproduktion: stammdaten.jahresproduktion.gesamt,
    varianten: stammdaten.varianten,
    heuteDatum: new Date(stammdaten.projekt.heuteDatum),
    planungsjahr: stammdaten.projekt.planungsjahr
  },
  saisonalitaet: saisonalitaet.saisonalitaetMonatlich.map(m => ({
    monat: m.monat,
    anteil: m.anteil / 100
  })),
  stueckliste: [],
  bauteile: [],
  lieferant: lieferantChina.lieferant,
  feiertage: [
    ...feiertageDeutschland.feiertage.map(f => ({ ...f, land: 'Deutschland' })),
    ...feiertageChina.feiertage.map(f => ({ ...f, land: 'China' }))
  ],
  produktion: {
    kapazitaetProStunde: 50,
    stundenProSchicht: 8,
    schichtenProTag: 2
  }
}

// Konvertiere Stückliste
Object.entries(stueckliste.stuecklisten).forEach(([varianteId, data]) => {
  Object.entries(data.komponenten).forEach(([bauteilId, info]) => {
    konfiguration.stueckliste.push({
      mtbVariante: varianteId,
      bauteilId: bauteilId,
      bauteilName: info.name,
      menge: info.menge,
      einheit: info.einheit
    })
    
    // Füge Bauteil zur Bauteilliste hinzu (wenn noch nicht vorhanden)
    if (!konfiguration.bauteile.find(b => b.id === bauteilId)) {
      konfiguration.bauteile.push({
        id: bauteilId,
        name: info.name,
        kategorie: 'Sattel',
        lieferant: 'China'
      })
    }
  })
})

console.log('📊 KONFIGURATION:')
console.log('   Jahresproduktion:', konfiguration.stammdaten.jahresproduktion.toLocaleString('de-DE'), 'Bikes')
console.log('   Varianten:', konfiguration.stammdaten.varianten.length)
console.log('   Bauteile:', konfiguration.bauteile.length)
console.log('   Feiertage:', konfiguration.feiertage.length)
console.log('   Vorlaufzeit:', konfiguration.lieferant.gesamtVorlaufzeitTage, 'Tage')
console.log('   Losgröße:', konfiguration.lieferant.losgroesse, 'Sättel')

console.log('\n📋 ERWARTUNG:')
console.log('   Lieferungen: 370.000 Sättel')
console.log('   Verbrauch:   370.000 Sättel (mit POST-JAHRESENDE)')
console.log('   Differenz:   0 Sättel')
console.log('   Rohstofflager Ende: 0 Sättel')

console.log('\n⚠️  ACHTUNG: Dieser Test erfordert TypeScript-Compilation!')
console.log('    Führe stattdessen den Development-Server aus und prüfe die Browser-Konsole.')
console.log('    Oder nutze: npm run build (zeigt Warehouse-Statistiken)')

console.log('\n═══════════════════════════════════════════════════════════════════\n')
