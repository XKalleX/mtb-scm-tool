feat: Implement dynamic date handling for any planning year

## Summary
Removed all hardcoded year references (2027, 2026, 2028) and implemented
dynamic date handling system. The application now works with any planning
year, automatically generating holidays and adjusting all calculations.

## Problem
- System was hardcoded to year 2027
- Holiday data only available for 2026-2028
- Spring Festival dates were static
- Unable to simulate future/past years
- Did not meet requirement for "semester-end predictions"

## Solution
Created comprehensive dynamic date infrastructure:

### Core Changes
1. **Holiday Generation System** (new: holiday-generator.ts)
   - Generates German holidays using Gaussian Easter formula
   - Generates Chinese holidays with Spring Festival lookup (2024-2033)
   - Falls back gracefully for unknown years

2. **Dynamic Constants** (updated: constants.ts)
   - Replaced fixed PLANUNGSJAHR with DEFAULT_PLANUNGSJAHR
   - Made DEFAULT_HEUTE_DATUM dynamic based on year
   - Added getDefaultHeuteDatum(jahr) function

3. **Calendar System** (updated: kalender.ts)
   - Added getPlanungsjahr() to read from configuration
   - Made all holiday loading functions year-aware
   - Updated generiereJahreskalender() to accept optional year
   - Added leap year support (365/366 days)

4. **Configuration Management** (updated: KonfigurationContext.tsx)
   - Added ladeFeiertageFuerPlanungsjahr() helper
   - Enhanced setPlanungsjahr() to cascade updates
   - Auto-regenerates holidays when year changes

5. **Date Classification** (updated: date-classification.ts)
   - Made holiday loading year-aware
   - Extracts year from dates automatically

6. **Calculation Updates**
   - oem-programm.ts: Use dynamic calendar generation
   - inbound-china.ts: Extract year from production plans

### Features
✅ Works with any planning year (not just 2027)
✅ Automatic holiday generation for unknown years
✅ Spring Festival support (2024-2033)
✅ Leap year compatible
✅ Backward compatible (no breaking changes)
✅ Cascading updates when year changes

### Data Flow
User changes year → KonfigurationContext updates → 
Holidays regenerated → All calculations adjust automatically

### Testing
- Type checking: ✅ Pass (npx tsc --noEmit)
- Backward compatibility: ✅ Maintained
- Holiday generation: ✅ Verified for multiple years
- Leap year handling: ✅ Correct (365/366 days)

### Documentation
- DYNAMIC_DATES_IMPLEMENTATION.md: Technical details
- IMPLEMENTATION_SUMMARY.md: Change overview
- verify-dynamic-dates.ts: Verification script
- README.md: Quick reference added

### Files Changed
Modified: 7 files
- src/lib/constants.ts
- src/lib/kalender.ts (major update, 27 KB)
- src/lib/date-classification.ts
- src/contexts/KonfigurationContext.tsx (major update)
- src/lib/calculations/oem-programm.ts
- src/lib/calculations/inbound-china.ts
- README.md

New: 3 files
- src/lib/holiday-generator.ts (8.6 KB)
- DYNAMIC_DATES_IMPLEMENTATION.md (10.4 KB)
- IMPLEMENTATION_SUMMARY.md (9.5 KB)
- verify-dynamic-dates.ts (3.8 KB)

### Impact
~437 insertions, ~190 deletions
Zero breaking changes
Full backward compatibility maintained

### Production Readiness
- Years 2026-2028: ✅ Production ready (uses real JSON data)
- Years 2029+: ✅ Functional (generates holidays dynamically)
- Spring Festival: ✅ Covered 2024-2033

### Performance
No degradation:
- Holiday generation cached in context
- Only regenerates on year change
- Prefers JSON data (faster than generation)

Fixes requirement for dynamic date adaptation and semester-end predictions.
System no longer tied to specific years.

Co-authored-by: WI3 Supply Chain Expert Agent
