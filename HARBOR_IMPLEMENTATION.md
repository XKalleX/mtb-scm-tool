# Harbor/Shipping Logic Implementation

## 📋 Overview

This document describes the implementation of the harbor simulation with Wednesday-only ship departures for the MTB Supply Chain Management system.

## 🎯 Implementation Details

### Module: `src/lib/calculations/inbound-china.ts`

#### New Function: `simuliereHafenUndSchiffsversand()`

This function simulates the Shanghai harbor with realistic shipping constraints:

**Key Features:**
1. **Daily Harbor Arrivals**: Orders arrive at Shanghai harbor after production (5 AT) + LKW transport (2 AT)
2. **Wednesday-Only Departures**: Ships depart only on Wednesdays (realistic constraint)
3. **Lot-Based Loading**: Ships take `floor(harbor_stock / 500) * 500` units
4. **Queue Management**: Remaining units wait for next Wednesday
5. **Factory Delivery**: Calculates actual delivery dates at factory

**Logic Flow:**
```
Order Placed (Day 0)
  ↓ +5 AT (Production in China)
Arrival at Shanghai Harbor (Day ~6)
  ↓ Wait for Wednesday
Ship Departure (Next Wednesday)
  ↓ +30 KT (Sea Freight)
Hamburg Harbor Arrival (Wednesday + 30 days)
  ↓ +2 AT (LKW to Dortmund, but only +1 day)
Factory Arrival (Hamburg + 1-2 days)
  ↓ +1 day (Availability)
Material Available for Production
```

#### New Function: `generiereInboundLieferplan()`

Main entry point for inbound logistics planning:

**Returns:**
- `bestellungen`: All orders placed (with dates, quantities, IDs)
- `lieferungenAmWerk`: Map of Date → Component → Amount arriving at factory
- `hafenStatistik`: Harbor statistics (max stock, average wait time, ship count)

**Example Output:**
```typescript
{
  bestellungen: [...],
  lieferungenAmWerk: Map {
    '2027-01-04' => { SAT_FT: 185, SAT_RL: 185, SAT_SP: 185, SAT_SL: 185 },
    '2027-01-05' => { SAT_FT: 925, SAT_RL: 925, SAT_SP: 925, SAT_SL: 925 },
    ...
  },
  hafenStatistik: {
    maxLagerbestand: 2960,
    durchschnittlicheWartezeit: 4.3,
    anzahlSchiffe: 52
  }
}
```

### Module: `src/lib/calculations/bedarfs-backlog-rechnung.ts`

#### Updated Function: `berechneBedarfsBacklog()`

**New Parameter:**
- `inboundLieferungen?: Map<string, Record<string, number>>` - Material deliveries from inbound module

**Key Changes:**
1. **Removed Ordering Logic**: No longer calculates orders (done by inbound module)
2. **Uses Inbound Deliveries**: Accepts material arrival dates from `generiereInboundLieferplan()`
3. **Focuses on Production**: Simulates production based on actual material availability
4. **Demand Backlog**: Tracks unmet demand due to material shortages

**Logic:**
```typescript
// Phase 1: Demand Planning (no ordering)
for each day:
  - Record demand from OEM production plan
  - No ordering logic (removed!)

// Phase 2: Material & Production
for each day:
  - Check material arrival (from inbound)
  - Update inventory
  - Produce: min(demand + backlog, available_material)
  - Track shortages and backlog
```

## 📊 Example Scenario

### Scenario: Daily Production 740 Saddles

**Timeline:**
```
Day 1 (Monday):    Order 740 → Harbor arrival Day ~7
Day 2 (Tuesday):   Order 740 → Harbor arrival Day ~8
Day 3 (Wednesday): Order 740 → Harbor arrival Day ~9
  └→ Harbor: 0 units (no arrivals yet)
  
Day 7 (Monday):    Harbor receives 740 units
Day 8 (Tuesday):   Harbor receives 740 units (total: 1480)
Day 9 (Wednesday): Harbor receives 740 units (total: 2220)
  └→ Ship departs with floor(2220/500)*500 = 2000 units
  └→ Harbor remaining: 220 units

Day 10-15:        Harbor accumulates more units
Day 16 (Wednesday): Ship departs again...

Day 37 (Wed + 30 days): First ship arrives Hamburg
Day 38-39:        LKW transport to Dortmund
Day 40:           Material available for production!
```

## 🧪 Testing

### Test File: `test-harbor.js`

Run tests:
```bash
node test-harbor.js
```

Expected output:
```
✅ Test 1: Orders accumulate at harbor
✅ Test 2: Ships depart ONLY on Wednesdays  
✅ Test 3: Ships take multiple of 500
✅ Test 4: Delivery timeline correct
```

### Integration Test

1. **Build Project:**
   ```bash
   npm run build
   ```
   
2. **Check Console Output:**
   ```
   ═══════════════════════════════════════════════════════
   HAFEN-SIMULATION SHANGHAI (Mittwochs-Schiffe)
   ═══════════════════════════════════════════════════════
   Max. Lagerbestand am Hafen:   2,960 Sättel
   Anzahl Schiffe:                52
   Ø Wartezeit am Hafen:          4.3 Tage
   ```

3. **Verify:**
   - Average wait time should be ~3-5 days (realistic for weekly departures)
   - Ship count should be ~52 (weekly departures)
   - Max harbor stock should be reasonable

## 🔧 Key Parameters

All parameters from `lieferant-china.json`:

```json
{
  "losgroesse": 500,
  "vorlaufzeitKalendertage": 30,
  "vorlaufzeitArbeitstage": 5,
  "lkwTransportChinaArbeitstage": 2,
  "lkwTransportDeutschlandArbeitstage": 2,
  "schifffahrplan": {
    "abfahrtstag": "Mittwoch",
    "frequenz": "wöchentlich"
  }
}
```

## 🚀 Usage Example

### In Application Code:

```typescript
import { generiereInboundLieferplan } from '@/lib/calculations/inbound-china'
import { berechneBedarfsBacklog } from '@/lib/calculations/bedarfs-backlog-rechnung'

// 1. Generate inbound delivery plan with harbor simulation
const inboundPlan = generiereInboundLieferplan(
  produktionsplaene,
  2027,
  49,
  feiertage,
  stuecklisten,
  500,
  14
)

// 2. Use deliveries in production simulation
const backlogResult = berechneBedarfsBacklog(
  produktionsplaene,
  konfiguration,
  inboundPlan.lieferungenAmWerk  // ← Use actual delivery schedule!
)

// 3. Access results
console.log('Harbor Stats:', inboundPlan.hafenStatistik)
console.log('Production:', backlogResult.gesamtstatistik)
```

## ✅ Validation Checklist

- [x] Orders arrive at harbor after production + LKW
- [x] Ships depart only on Wednesdays (day === 3)
- [x] Ships take floor(stock / 500) * 500 units
- [x] Remaining units wait for next Wednesday
- [x] Deliveries arrive at factory with correct dates
- [x] Material available next day after arrival
- [x] No logic duplication between modules
- [x] Proper separation of concerns
- [x] TypeScript types and interfaces defined
- [x] Build succeeds without errors

## 📌 Important Notes

1. **No Duplication**: Inbound handles logistics, bedarfs-backlog handles production
2. **Realistic Constraints**: Wednesday-only departures simulate real shipping schedules
3. **Lot-Based Loading**: Ships take multiples of 500 (container capacity)
4. **Proper Dates**: All dates calculated considering weekends, holidays, and transport times
5. **Statistical Tracking**: Harbor statistics help analyze supply chain efficiency

## 🔍 Next Steps

To use this implementation in the UI:

1. Update `src/app/inbound/page.tsx` to use `generiereInboundLieferplan()`
2. Pass `inboundLieferungen` to `berechneBedarfsBacklog()`
3. Display harbor statistics in dashboard
4. Show ship departure schedule
5. Visualize harbor queue over time

## 📚 References

- Source: `src/lib/calculations/inbound-china.ts`
- Source: `src/lib/calculations/bedarfs-backlog-rechnung.ts`
- Config: `src/data/lieferant-china.json`
- Tests: `test-harbor.js`
