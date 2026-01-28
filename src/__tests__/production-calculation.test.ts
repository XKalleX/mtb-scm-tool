/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TEST: Produktionsberechnung - Validierung 370.000 Bikes
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Dieser Test validiert, dass die Produktionsberechnung exakt 370.000 Bikes ergibt
 * und keine systematischen Rundungsfehler aufweist.
 * 
 * ANFORDERUNG: Jahresproduktion muss EXAKT 370.000 Bikes sein (±0 Toleranz pro Variante)
 * 
 * ✅ AKTUALISIERT: Nutzt nun zentrale-produktionsplanung.ts und KonfigurationContext
 */

import { 
  generiereVariantenProduktionsplan,
  generiereAlleVariantenProduktionsplaene
} from '../lib/calculations/zentrale-produktionsplanung'
import { STANDARD_KONFIGURATION } from '../contexts/KonfigurationContext'

describe('Produktionsberechnung', () => {
  const konfiguration = STANDARD_KONFIGURATION
  
  describe('Einzelvarianten-Produktion', () => {
    konfiguration.varianten.forEach(variante => {
      const jahresProduktion = Math.round(konfiguration.jahresproduktion * variante.anteilPrognose)
      
      test(`${variante.name} (${variante.id}) produziert exakt ${jahresProduktion.toLocaleString()} Bikes`, () => {
        const plan = generiereVariantenProduktionsplan(konfiguration, variante.id)
        
        if (!plan) {
          throw new Error(`Plan konnte nicht generiert werden für ${variante.id}`)
        }
        
        // Berechne tatsächliche Jahresproduktion
        const istProduktion = plan.tage.reduce((sum, tag) => sum + tag.istMenge, 0)
        
        // Validierung: Ist-Produktion MUSS exakt Soll-Produktion entsprechen
        expect(istProduktion).toBe(jahresProduktion)
        
        // Zusätzliche Validierung: Abweichung im Plan sollte 0 sein
        expect(plan.abweichung).toBe(0)
        
        // Konsolen-Output für Debugging
        console.log(`✓ ${variante.name}: ${istProduktion.toLocaleString()} / ${jahresProduktion.toLocaleString()} Bikes`)
      })
    })
  })

  describe('Gesamtproduktion', () => {
    test('Summe aller Varianten ergibt exakt 370.000 Bikes', () => {
      const allePlaene = generiereAlleVariantenProduktionsplaene(konfiguration)
      
      // Berechne Gesamtproduktion aller Varianten
      const gesamtProduktion = Object.values(allePlaene).reduce((sum, plan) => {
        const variantenProduktion = plan.tage.reduce((tagSum, tag) => tagSum + tag.istMenge, 0)
        return sum + variantenProduktion
      }, 0)
      
      // KRITISCHE VALIDIERUNG: Muss exakt 370.000 sein!
      expect(gesamtProduktion).toBe(konfiguration.jahresproduktion)
      expect(gesamtProduktion).toBe(370_000)
      
      console.log(`\n=== GESAMTVALIDIERUNG ===`)
      console.log(`✓ Gesamtproduktion: ${gesamtProduktion.toLocaleString()} Bikes`)
      console.log(`✓ Soll:             ${konfiguration.jahresproduktion.toLocaleString()} Bikes`)
      console.log(`✓ Abweichung:       ${gesamtProduktion - konfiguration.jahresproduktion} Bikes`)
    })
    
    test('Kumulativer Endwert über 365 Tage ergibt 370.000 Bikes', () => {
      const allePlaene = generiereAlleVariantenProduktionsplaene(konfiguration)
      
      // Summiere kumulative Endwerte aller Varianten
      const gesamtKumulativ = Object.values(allePlaene).reduce((sum, plan) => {
        const letzterTag = plan.tage[364] // Tag 365 (Index 364)
        return sum + letzterTag.kumulativIst
      }, 0)
      
      expect(gesamtKumulativ).toBe(370_000)
      
      console.log(`✓ Kumulativ gesamt Tag 365: ${gesamtKumulativ.toLocaleString()} Bikes`)
    })
  })

  describe('Error Management Validierung', () => {
    test('Kumulativer Fehler bleibt für jede Variante unter Kontrolle', () => {
      konfiguration.varianten.forEach(variante => {
        const plan = generiereVariantenProduktionsplan(konfiguration, variante.id)
        
        if (!plan) {
          throw new Error(`Plan konnte nicht generiert werden für ${variante.id}`)
        }
        
        // Prüfe ob Error Management funktioniert
        const maxFehler = Math.max(...plan.tage.map(t => Math.abs(t.monatsFehlerNachher)))
        
        // Fehler sollte NIEMALS größer als 1.0 sein (würde bedeuten Error Mgmt funktioniert nicht)
        expect(maxFehler).toBeLessThan(1.0)
        
        console.log(`✓ ${variante.name}: Max Fehler = ${maxFehler.toFixed(4)}`)
      })
    })
    
    test('Keine Produktion an Wochenenden und Feiertagen', () => {
      const variante = konfiguration.varianten[0]
      const plan = generiereVariantenProduktionsplan(konfiguration, variante.id)
      
      if (!plan) {
        throw new Error(`Plan konnte nicht generiert werden für ${variante.id}`)
      }
      
      plan.tage.forEach(tag => {
        if (!tag.istArbeitstag) {
          expect(tag.istMenge).toBe(0)
          expect(tag.planMenge).toBe(0)
        } else {
          expect(tag.planMenge).toBeGreaterThan(0)
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
      const variante = konfiguration.varianten[0]
      const plan = generiereVariantenProduktionsplan(konfiguration, variante.id)
      
      if (!plan) {
        throw new Error(`Plan konnte nicht generiert werden für ${variante.id}`)
      }
      
      // April-Tage (Monat 4)
      const aprilTage = plan.tage.filter(t => t.monat === 4 && t.istArbeitstag)
      const aprilProduktion = aprilTage.reduce((sum, t) => sum + t.istMenge, 0)
      
      // Dezember-Tage (Monat 12)
      const dezemberTage = plan.tage.filter(t => t.monat === 12 && t.istArbeitstag)
      const dezemberProduktion = dezemberTage.reduce((sum, t) => sum + t.istMenge, 0)
      
      // April sollte deutlich mehr produzieren (16% vs 3%)
      expect(aprilProduktion).toBeGreaterThan(dezemberProduktion * 2)
      
      console.log(`✓ April Produktion:    ${aprilProduktion.toLocaleString()} Bikes`)
      console.log(`✓ Dezember Produktion: ${dezemberProduktion.toLocaleString()} Bikes`)
    })
  })
})
