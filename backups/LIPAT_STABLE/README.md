# LIPAT – STABLE SNAPSHOT (v1)

## Locked Components
- Map v1 UX
  - Long-press → enterPlacingMode()
  - + FAB → enterPlacingMode()
  - Center-pin placement
  - Type → Severity flow
- Data Layer
  - AsyncStorage = source of truth
  - Supabase = shadow-write
  - Read-repair on cold start
- No runtime errors
- No experimental handlers

## Files
- map.v1.locked.tsx
- hazards.v1.locked.ts
- supabase.v1.locked.ts

## Rules
- These files are READ-ONLY.
- Any future changes must copy forward from this snapshot.
- This snapshot is the reference for regression recovery.

Date locked: $(date)
