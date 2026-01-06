/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TEST: Produktionsberechnung - Validierung 370.000 Bikes
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Dieser Test validiert, dass die Produktionsberechnung exakt 370.000 Bikes ergibt
 * und keine systematischen Rundungsfehler aufweist.
 * 
 * ANFORDERUNG: Jahresproduktion muss EXAKT 370.000 Bikes sein (±0 Toleranz pro Variante)
 */

import { 
  generiereVariantenProduktionsplan,
  generiereAlleVariantenProduktionsplaene,
  aggregiereProduktionsplaene
} from '../lib/calculations/tagesproduktion'
import { MTB_VARIANTEN, PRODUKTIONSVOLUMEN } from '../../kontext/Spezifikation_SSOT_MR'

describe('Produktionsberechnung', () => {
  describe('Einzelvarianten-Produktion', () => {
    MTB_VARIANTEN.forEach(variante => {
      test(`${variante.name} (${variante.id}) produziert exakt ${variante.jahresProduktion.toLocaleString()} Bikes`, () => {
        const plan = generiereVariantenProduktionsplan(variante)
        
        // Berechne tatsächliche Jahresproduktion
        const istProduktion = plan.tage.reduce((sum, tag) => sum + tag.istProduktion, 0)
        
        // Validierung: Ist-Produktion MUSS exakt Soll-Produktion entsprechen
        expect(istProduktion).toBe(variante.jahresProduktion)
        
        // Zusätzliche Validierung: Abweichung im Plan sollte 0 sein
        expect(plan.abweichung).toBe(0)
        
        // Konsolen-Output für Debugging
        console.log(`✓ ${variante.name}: ${istProduktion.toLocaleString()} / ${variante.jahresProduktion.toLocaleString()} Bikes`)
      })
    })
  })

  describe('Gesamtproduktion', () => {
    test('Summe aller Varianten ergibt exakt 370.000 Bikes', () => {
      const allePlaene = generiereAlleVariantenProduktionsplaene()
      
      // Berechne Gesamtproduktion aller Varianten
      const gesamtProduktion = allePlaene.reduce((sum, plan) => {
        const variantenProduktion = plan.tage.reduce((tagSum, tag) => tagSum + tag.istProduktion, 0)
        return sum + variantenProduktion
      }, 0)
      
      // KRITISCHE VALIDIERUNG: Muss exakt 370.000 sein!
      expect(gesamtProduktion).toBe(PRODUKTIONSVOLUMEN.jahresProduktion)
      expect(gesamtProduktion).toBe(370_000)
      
      console.log(`\n=== GESAMTVALIDIERUNG ===`)
      console.log(`✓ Gesamtproduktion: ${gesamtProduktion.toLocaleString()} Bikes`)
      console.log(`✓ Soll:             ${PRODUKTIONSVOLUMEN.jahresProduktion.toLocaleString()} Bikes`)
      console.log(`✓ Abweichung:       ${gesamtProduktion - PRODUKTIONSVOLUMEN.jahresProduktion} Bikes`)
    })
    
    test('Aggregierte Tagesproduktion über 365 Tage ergibt 370.000 Bikes', () => {
      const allePlaene = generiereAlleVariantenProduktionsplaene()
      const aggregiert = aggregiereProduktionsplaene(allePlaene)
      
      // Letzter kumulativer Wert sollte 370.000 sein
      const letzterTag = aggregiert[364] // Tag 365 (Index 364)
      expect(letzterTag.kumulativIst).toBe(370_000)
      
      console.log(`✓ Kumulativ Tag 365: ${letzterTag.kumulativIst.toLocaleString()} Bikes`)
    })
  })

  describe('Error Management Validierung', () => {
    test('Kumulativer Fehler bleibt für jede Variante unter Kontrolle', () => {
      MTB_VARIANTEN.forEach(variante => {
        const plan = generiereVariantenProduktionsplan(variante)
        
        // Prüfe ob Error Management funktioniert
        const maxFehler = Math.max(...plan.tage.map(t => Math.abs(t.fehler)))
        
        // Fehler sollte NIEMALS größer als 1.0 sein (würde bedeuten Error Mgmt funktioniert nicht)
        expect(maxFehler).toBeLessThan(1.0)
        
        console.log(`✓ ${variante.name}: Max Fehler = ${maxFehler.toFixed(4)}`)
      })
    })
    
    test('Keine Produktion an Wochenenden und Feiertagen', () => {
      const plan = generiereVariantenProduktionsplan(MTB_VARIANTEN[0])
      
      plan.tage.forEach(tag => {
        if (!tag.istArbeitstag) {
          expect(tag.istProduktion).toBe(0)
          expect(tag.sollProduktion).toBe(0)
        } else {
          expect(tag.istProduktion).toBeGreaterThan(0)
        }
      })
      
      const arbeitstage = plan.tage.filter(t => t.istArbeitstag).length
      const nichtArbeitstage = plan.tage.filter(t => !t.istArbeitstag).length
      
      console.log(`✓ Arbeitstage: ${arbeitstage}`)
      console.log(`✓ Nicht-Arbeitstage: ${nichtArbeitstage}`)
      expect(arbeitstage + nichtArbeitstage).toBe(365)
    })
  })

  describe('Saisonalität', () => {
    test('April (Peak Monat) hat höhere Produktion als Dezember', () => {
      const plan = generiereVariantenProduktionsplan(MTB_VARIANTEN[0])
      
      // April-Tage (Monat 4)
      const aprilTage = plan.tage.filter(t => t.monat === 4 && t.istArbeitstag)
      const aprilProduktion = aprilTage.reduce((sum, t) => sum + t.istProduktion, 0)
      
      // Dezember-Tage (Monat 12)
      const dezemberTage = plan.tage.filter(t => t.monat === 12 && t.istArbeitstag)
      const dezemberProduktion = dezemberTage.reduce((sum, t) => sum + t.istProduktion, 0)
      
      // April sollte deutlich mehr produzieren (16% vs 3%)
      expect(aprilProduktion).toBeGreaterThan(dezemberProduktion * 2)
      
      console.log(`✓ April Produktion:    ${aprilProduktion.toLocaleString()} Bikes`)
      console.log(`✓ Dezember Produktion: ${dezemberProduktion.toLocaleString()} Bikes`)
    })
  })
})
