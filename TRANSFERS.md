
## LOCKED — LGU Map OPS Baseline (Stable)
Date: 2025-12-26 15:56
Scope: `app/lgu/map.base.tsx`

### GOALS Alignment
- LGU-first operations board (not consumer navigation).
- Severity-based prioritization (LOW/MED/HIGH).
- Resolved hazards preserved as historical reference.

### Locked UX Rules
1) **Placing Mode Single Source of Truth**
   - Long-press on map is primary entry to placing mode.
   - Report button is a secondary shortcut.
   - Placement confirms hazard at the **center pin** using `coordinateForPoint`.

2) **Resolved Must Be Obvious at a Glance**
   - Resolved markers are **gray** + **low opacity** + visually de-emphasized.
   - Active markers use severity colors.

3) **CRITICAL BUG FIX — Marker State Bleed Prevention**
   - `react-native-maps` can reuse marker views.
   - We force remount by using marker key: `key = \`\${id}-\${status}\``
   - This prevents "wrong hazard changes color" after resolve/delete.

4) **Recenter is Non-Negotiable (LGU Field Ops)**
   - Dedicated floating recenter button restored and kept visible.
   - One-tap returns to user location.

### Stability Rule (Permanent)
- Once a feature is proven stable and correct, treat it as **LOCKED**.
- Do not refactor/replace that area without explicit approval and a rollback plan.


## LOCKED — LGU Map Baseline v2 (DO NOT TOUCH)
Date: '"$ts"'
Files:
- app/lgu/map.base.tsx
- app/lgu/map.base.v2.locked.tsx

Locked Features:
- Placing mode uses center pin + coordinateForPoint (stable UX).
- Recenter restored + high-visibility button (LGU field ops).
- Resolved hazards are visually de-emphasized (gray + low opacity).
- Marker state-bleed fix: key uses id-status (${id}-${status}) to prevent wrong color changes after resolve/delete.

Rule:
- If any change is needed, fork from v2.locked and keep rollback path.

