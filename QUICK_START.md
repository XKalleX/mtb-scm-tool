# Quick Start: Dynamic Date Handling

## For Developers

### To Change the Planning Year
```typescript
import { useKonfiguration } from '@/contexts/KonfigurationContext'

function MyComponent() {
  const { setPlanungsjahr, konfiguration } = useKonfiguration()
  
  // Change year
  setPlanungsjahr(2028)
  
  // Current year
  console.log(konfiguration.planungsjahr) // 2028
  
  // Holidays automatically updated
  console.log(konfiguration.feiertage.length) // ~60-70 holidays for 3 years
}
```

### To Access Dynamic Dates in Calculations
```typescript
import { getPlanungsjahr, getHeuteDatum } from '@/lib/kalender'

function myCalculation() {
  const planungsjahr = getPlanungsjahr() // e.g., 2028
  const heute = getHeuteDatum()          // e.g., Date('2028-04-15')
  
  // Use these values in calculations
  const startOfYear = new Date(planungsjahr, 0, 1)
}
```

### To Generate Holidays
```typescript
import { 
  generiereAlleFeiertage,
  generiereDeutscheFeiertage,
  generiereChinesischeFeiertage 
} from '@/lib/holiday-generator'

// All holidays for 3 years (jahr-1, jahr, jahr+1)
const alleFeiertage = generiereAlleFeiertage(2028)

// Only German holidays for one year
const deutscheFeiertage = generiereDeutscheFeiertage(2028)

// Only Chinese holidays for one year
const chinesischeFeiertage = generiereChinesischeFeiertage(2028)
```

### To Check Spring Festival
```typescript
import { istSpringFestival } from '@/lib/kalender'
import { getSpringFestivalPeriode } from '@/lib/holiday-generator'

const datum = new Date('2028-01-27')
const isSpringFestival = istSpringFestival(datum) // true

// Get the full period
const periode = getSpringFestivalPeriode(2028)
// { start: Date('2028-01-26'), ende: Date('2028-02-01') }
```

## For Users

### Changing the Planning Year in the UI
1. Go to **Settings** (⚙️ icon)
2. Find **Planungsjahr** setting
3. Change to desired year (e.g., 2028)
4. Click **Save**

**What happens:**
- All dates update automatically
- Holidays regenerate for the new year range
- 'Heute' date adjusts (e.g., 2028-04-15)
- All tables and charts reflect new year
- Production plans recalculate
- Order dates adjust

### Understanding Holiday Indicators
Tables show colored backgrounds for special days:
- 🔵 **Blue**: German holidays (NRW)
- 🟠 **Orange**: Chinese holidays (including Spring Festival)
- ⬜ **Gray**: Weekends (Saturday/Sunday)

## For Testers

### Verify the Implementation
```bash
# Type check
npx tsc --noEmit

# Run verification script
npx ts-node verify-dynamic-dates.ts
```

### Test Cases
1. **Change year to 2028**
   - ✅ Holidays update
   - ✅ 'Heute' date changes to 2028-04-15
   - ✅ Tables show 2028 dates
   
2. **Change year to 2030** (no JSON data)
   - ✅ Holidays generated dynamically
   - ✅ German holidays accurate (Easter calculation)
   - ✅ Chinese holidays approximated
   
3. **Spring Festival check**
   - ✅ 2027: February 6-11
   - ✅ 2028: January 27-February 1
   - ✅ 2030: February 3-8

4. **Leap year test**
   - ✅ 2027: 365 days
   - ✅ 2028: 366 days (leap year)
   - ✅ 2030: 365 days

## Common Scenarios

### Scenario 1: Planning Next Year
```typescript
// Switch to next year for planning
setPlanungsjahr(2028)

// All calculations now use 2028
// Production plans generated for 2028
// Orders placed with 2028 dates
```

### Scenario 2: Historical Analysis
```typescript
// Look at past year
setPlanungsjahr(2026)

// View historical holidays
// Compare with actual results
```

### Scenario 3: Multi-Year Simulation
```typescript
// Year 1
setPlanungsjahr(2027)
const results2027 = runSimulation()

// Year 2
setPlanungsjahr(2028)
const results2028 = runSimulation()

// Compare
compareResults(results2027, results2028)
```

## Troubleshooting

### Issue: Holidays not showing
**Solution:** Check if year is within JSON range (2026-2028) or dynamic generation is working
```typescript
import { ladeChinaFeiertage } from '@/lib/kalender'
const feiertage = ladeChinaFeiertage(2028)
console.log(feiertage) // Should show ~20+ holidays
```

### Issue: Wrong 'Heute' date
**Solution:** Check localStorage and configuration
```typescript
import { getHeuteDatum } from '@/lib/kalender'
console.log(getHeuteDatum()) // Should match expected date
```

### Issue: Calendar shows wrong number of days
**Solution:** Verify leap year calculation
```typescript
import { generiereJahreskalender } from '@/lib/kalender'
const kalender = generiereJahreskalender(2028)
console.log(kalender.length) // Should be 366 for leap year
```

## Best Practices

### DO ✅
- Use `getPlanungsjahr()` instead of hardcoding years
- Use `getHeuteDatum()` for current date reference
- Let system generate holidays automatically
- Trust JSON data for years 2026-2028

### DON'T ❌
- Don't hardcode `2027` in new code
- Don't create Date objects with fixed years
- Don't bypass the configuration system
- Don't assume 365 days (could be leap year)

## Examples in the Codebase

### Good Example ✅
```typescript
// From oem-programm.ts
const kalender = generiereJahreskalender() // Uses config year
const arbeitstage = zaehleArbeitstageProMonat_Deutschland(undefined, customFeiertage)
```

### Bad Example (Fixed) ❌→✅
```typescript
// Before (bad)
const kalender = generiereJahreskalender(2027)

// After (good)
const kalender = generiereJahreskalender() // Dynamic
```

## Documentation References

- **Technical Details:** [DYNAMIC_DATES_IMPLEMENTATION.md](./DYNAMIC_DATES_IMPLEMENTATION.md)
- **Architecture:** [ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)
- **Changes:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Full README:** [README.md](./README.md)

## Need Help?

1. Check the inline code comments (German)
2. Review the documentation files
3. Run the verification script
4. Check type errors with `npx tsc --noEmit`

## Quick Reference

| Task | Function/Hook |
|------|---------------|
| Get current year | `getPlanungsjahr()` |
| Get 'heute' date | `getHeuteDatum()` |
| Change year | `setPlanungsjahr(year)` |
| Generate holidays | `generiereAlleFeiertage(year)` |
| Check Spring Festival | `istSpringFestival(date)` |
| Generate calendar | `generiereJahreskalender(year?)` |

---

**Last Updated:** January 28, 2025  
**Status:** ✅ Production Ready  
**Version:** 1.0.0
