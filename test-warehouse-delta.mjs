#!/usr/bin/env node
/**
 * TEST: Warehouse Delta -62.709 Problem
 * 
 * Analysiert die Differenz zwischen Lieferungen und Verbrauch
 */

import stammdaten from './src/data/stammdaten.json' with { type: 'json' }
import stueckliste from './src/data/stueckliste.json' with { type: 'json' }
import saisonalitaet from './src/data/saisonalitaet.json' with { type: 'json' }
import lieferantChina from './src/data/lieferant-china.json' with { type: 'json' }
import feiertageDeutschland from './src/data/feiertage-deutschland.json' with { type: 'json' }
import feiertageChina from './src/data/feiertage-china.json' with { type: 'json' }

console.log('═══════════════════════════════════════════════════════════════════')
console.log('WAREHOUSE DELTA ANALYSE: -62.709 Problem')
console.log('═══════════════════════════════════════════════════════════════════\n')

// 1. JAHRESPRODUKTION
const jahresProd = stammdaten.jahresproduktion.gesamt
console.log('1️⃣ JAHRESPRODUKTION:', jahresProd.toLocaleString('de-DE'), 'Bikes')

// 2. SÄTTEL-BEDARF (1:1 Verhältnis)
const saettelBedarf = jahresProd // Jedes Bike braucht 1 Sattel
console.log('2️⃣ SÄTTEL-BEDARF:', saettelBedarf.toLocaleString('de-DE'), 'Sättel')

// 3. BESTELLUNGEN (Losgrößen-basiert)
const losgröße = lieferantChina.lieferant.losgroesse
const vorlaufzeit = lieferantChina.lieferant.gesamtVorlaufzeitTage
console.log('\n3️⃣ BESTELLPARAMETER:')
console.log('   Losgröße:', losgröße, 'Sättel pro Bestellung')
console.log('   Vorlaufzeit:', vorlaufzeit, 'Tage')

// 4. TAGESBEDARF
const tagesBedarf = saettelBedarf / 365
console.log('\n4️⃣ TAGESBEDARF:')
console.log('   Durchschnitt:', tagesBedarf.toFixed(2), 'Sättel/Tag')
console.log('   Gerundet:', Math.round(tagesBedarf), 'Sättel/Tag')

// 5. GESCHÄTZTE BESTELLUNGEN
const anzahlBestellungen = Math.ceil(saettelBedarf / losgröße)
const tatsaechlichBestellt = anzahlBestellungen * losgröße
console.log('\n5️⃣ BESTELLUNGEN:')
console.log('   Benötigt:', saettelBedarf.toLocaleString('de-DE'), 'Sättel')
console.log('   Anzahl Bestellungen:', anzahlBestellungen)
console.log('   Tatsächlich bestellt:', tatsaechlichBestellt.toLocaleString('de-DE'), 'Sättel')
console.log('   Überschuss:', (tatsaechlichBestellt - saettelBedarf).toLocaleString('de-DE'), 'Sättel')

// 6. DELTA PROBLEM IDENTIFIZIERUNG
console.log('\n6️⃣ DELTA PROBLEM:')
const berichteteDelta = -62709
console.log('   Berichtete Delta:', berichteteDelta.toLocaleString('de-DE'), 'Sättel')
console.log('   Prozent:', ((berichteteDelta / saettelBedarf) * 100).toFixed(2), '%')

// 7. MÖGLICHE URSACHEN
console.log('\n7️⃣ MÖGLICHE URSACHEN:')

// Ursache 1: Timing (letzte Lieferungen nach Jahresende)
const zeitraumTage = 365
const letzterProduktionsTag = 365
const letzteMoeglicheBestellungTag = letzterProduktionsTag - vorlaufzeit
console.log('\n   a) TIMING-PROBLEM:')
console.log('      Letzter Produktionstag: Tag', letzterProduktionsTag)
console.log('      Letzte mögliche Bestellung: Tag', letzteMoeglicheBestellungTag)
console.log('      → Bestellungen nach Tag', letzteMoeglicheBestellungTag, 'kommen zu spät!')

// Ursache 2: Saisonalität führt zu späten Bestellungen
const dezemberAnteil = (saisonalitaet.saisonalitaetMonatlich.find(m => m.monat === 12)?.anteil || 0) / 100
const dezemberBedarf = Math.round(saettelBedarf * dezemberAnteil)
console.log('\n   b) SAISONALITÄT DEZEMBER:')
console.log('      Dezember Anteil:', (dezemberAnteil * 100).toFixed(1), '%')
console.log('      Dezember Bedarf:', dezemberBedarf.toLocaleString('de-DE'), 'Sättel')
console.log('      → Diese Sättel werden im Dezember bestellt')
console.log('      → Ankunft:', vorlaufzeit, 'Tage später = Februar 2028!')

// Ursache 3: ATP-Check verhindert Produktion ohne Material
console.log('\n   c) ATP-CHECK:')
console.log('      ATP verhindert Produktion ohne Material ✓')
console.log('      → Wenn Lieferung nach 31.12. ankommt:')
console.log('      → Material wird NICHT verbraucht')
console.log('      → Bleibt im Lager liegen')

// 8. ERWARTETE LÖSUNG
console.log('\n8️⃣ ERWARTETE LÖSUNG:')
console.log('   POST-JAHRESENDE VERARBEITUNG:')
console.log('   - Werk läuft nach 31.12. weiter')
console.log('   - Verbraucht ALLE verbleibenden Rohstoffe')
console.log('   - Bis Rohstofflager = 0')
console.log('   - Fertigerzeugnisse akkumulieren')

// 9. VALIDIERUNG
console.log('\n9️⃣ VALIDIERUNG (SOLL):')
console.log('   Gesamt Lieferungen: 370.000 Sättel')
console.log('   Gesamt Verbrauch:   370.000 Sättel')
console.log('   Differenz:          0 Sättel ✓')
console.log('   Rohstofflager Ende: 0 Sättel ✓')

console.log('\n═══════════════════════════════════════════════════════════════════')
console.log('FAZIT: POST-JAHRESENDE Verarbeitung muss implementiert sein!')
console.log('═══════════════════════════════════════════════════════════════════\n')
