/**
 * Quick Test: Warehouse Tag 4 Material Check
 */

// Simuliere Tag 1-5 Material-Flow

console.log('\n═══════════════════════════════════════════════════════════');
console.log('WAREHOUSE SIMULATION: Tag 1-5 (Januar 2027)');
console.log('═══════════════════════════════════════════════════════════\n');

// Annahmen
const LOSGROESSE = 500; // Sättel pro Lieferung
const TAGESPRODUKTION = 740; // Bikes/Tag (Januar)

// Lagerbestand-Tracker
let lager = { SAT_FT: 0, SAT_RL: 0, SAT_SP: 0, SAT_SL: 0 };

// Tag 1: Mittwoch 01.01.2027 (Feiertag)
console.log('TAG 1 (01.01.2027 Mi) - FEIERTAG (Neujahr)');
console.log(`  Anfangsbestand: ${JSON.stringify(lager)}`);
console.log(`  Lieferung: KEINE`);
console.log(`  Produktion: KEINE (Feiertag)`);
console.log(`  Endbestand: ${JSON.stringify(lager)}`);
console.log(`  → Total: 0 Sättel\n`);

// Tag 2: Donnerstag 02.01.2027 (Arbeitstag)
console.log('TAG 2 (02.01.2027 Do) - ARBEITSTAG');
console.log(`  Anfangsbestand: ${JSON.stringify(lager)}`);
console.log(`  Lieferung: KEINE`);
console.log(`  Plan: ${TAGESPRODUKTION} Bikes`);
console.log(`  Material verfügbar: 0 Sättel`);
console.log(`  IST-Produktion: 0 Bikes (kein Material)`);
console.log(`  Endbestand: ${JSON.stringify(lager)}`);
console.log(`  → Total: 0 Sättel\n`);

// Tag 3: Freitag 03.01.2027 (Arbeitstag)
console.log('TAG 3 (03.01.2027 Fr) - ARBEITSTAG');
console.log(`  Anfangsbestand: ${JSON.stringify(lager)}`);
console.log(`  Lieferung: KEINE`);
console.log(`  Plan: ${TAGESPRODUKTION} Bikes`);
console.log(`  Material verfügbar: 0 Sättel`);
console.log(`  IST-Produktion: 0 Bikes (kein Material)`);
console.log(`  Endbestand: ${JSON.stringify(lager)}`);
console.log(`  → Total: 0 Sättel\n`);

// Tag 4: Montag 04.01.2027 (Arbeitstag) - ERSTE LIEFERUNG VERFÜGBAR!
console.log('TAG 4 (04.01.2027 Mo) - ARBEITSTAG - ERSTE LIEFERUNG!');
console.log(`  Anfangsbestand: ${JSON.stringify(lager)}`);

// WICHTIG: Schiff ist am 03.01. (So) angekommen, LKW am 03.01. (So) gestartet
// LKW kommt am 04.01. (Mo) an, Material VERFÜGBAR am 04.01. (Mo)!
lager = { SAT_FT: 125, SAT_RL: 125, SAT_SP: 125, SAT_SL: 125 };
const totalLager = Object.values(lager).reduce((a,b) => a+b, 0);

console.log(`  Lieferung: 500 Sättel (125 pro Typ)`);
console.log(`  Zwischenbestand: ${JSON.stringify(lager)}`);
console.log(`  → Total: ${totalLager} Sättel`);
console.log(`  Plan: ${TAGESPRODUKTION} Bikes`);
console.log(`  Material verfügbar: ${totalLager} Sättel`);

const istProduktion = Math.min(totalLager, TAGESPRODUKTION);
const faktor = istProduktion / TAGESPRODUKTION;

console.log(`  Produktionsfaktor: ${(faktor * 100).toFixed(1)}%`);
console.log(`  IST-Produktion: ${istProduktion} Bikes`);
console.log(`  Backlog: ${TAGESPRODUKTION - istProduktion} Bikes`);

// Verbrauch verteilen
const verbrauch = { SAT_FT: 125, SAT_RL: 125, SAT_SP: 125, SAT_SL: 125 };
lager = { SAT_FT: 0, SAT_RL: 0, SAT_SP: 0, SAT_SL: 0 };

console.log(`  Verbrauch: ${JSON.stringify(verbrauch)}`);
console.log(`  Endbestand: ${JSON.stringify(lager)}`);
console.log(`  → Total: 0 Sättel`);
console.log(`  ✅ ATP-Check: ${istProduktion === totalLager ? 'KORREKT' : 'FEHLER'}\n`);

// Tag 5: Dienstag 05.01.2027 (Arbeitstag)
console.log('TAG 5 (05.01.2027 Di) - ARBEITSTAG');
console.log(`  Anfangsbestand: ${JSON.stringify(lager)}`);
console.log(`  Lieferung: KEINE (nächstes Schiff erst Mittwoch)`);
console.log(`  Plan: ${TAGESPRODUKTION} Bikes`);
console.log(`  Material verfügbar: 0 Sättel`);
console.log(`  IST-Produktion: 0 Bikes (kein Material)`);
console.log(`  Endbestand: ${JSON.stringify(lager)}`);
console.log(`  → Total: 0 Sättel\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log('FAZIT:');
console.log('  Tag 4: SOLLTE 500 Bikes produzieren (67.6% von 740)');
console.log('  Tag 5: SOLLTE 0 Bikes produzieren (kein Material)');
console.log('═══════════════════════════════════════════════════════════\n');
