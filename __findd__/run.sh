#!/usr/bin/env bash
set -euo pipefail

OUT="__findd__/out"
mkdir -p "$OUT"

say() { echo -e "\n==== $* ====\n"; }

say "0) BASIC CONTEXT"
pwd | tee "$OUT/00_pwd.txt"
node -v | tee "$OUT/00_node.txt" || true
npx expo --version | tee "$OUT/00_expo.txt" || true

say "1) ROUTES: WHAT MAP TAB IS ACTUALLY RENDERING"
( ls -la app || true ) | tee "$OUT/10_ls_app.txt"
( find app -maxdepth 3 -type f -name "map*.tsx" -o -name "_layout*.tsx" -o -name "index*.tsx" | sort ) | tee "$OUT/11_find_maps_and_layouts.txt"

say "2) TABS + MAP ENTRYPOINTS (CRITICAL)"
( find app -maxdepth 4 -type f -name "_layout*.tsx" -print -exec sed -n '1,220p' {} \; ) > "$OUT/20_all_layouts.txt" || true
( find app -maxdepth 4 -type f -name "map*.tsx" -print -exec sed -n '1,240p' {} \; ) > "$OUT/21_all_map_files.txt" || true

say "3) LGU MAP EXPORT CHAIN"
for f in app/lgu/map.tsx app/lgu/map.android.tsx app/lgu/map.ios.tsx app/lgu/map.web.tsx; do
  if [ -f "$f" ]; then
    echo "----- $f -----" | tee -a "$OUT/30_lgu_exports.txt"
    sed -n '1,120p' "$f" | tee -a "$OUT/30_lgu_exports.txt"
    echo "" | tee -a "$OUT/30_lgu_exports.txt"
  fi
done

say "4) ACTIVE LGU BASE FILE CONTENT (MARKERS + DASHBOARD + PLACING)"
BASE="app/lgu/map.base.v3_1.locked.tsx"
if [ -f "$BASE" ]; then
  nl -ba "$BASE" | sed -n '1,260p' > "$OUT/40_base_head_260.txt"
  rg -n "LGU HAZARD OPS|TOP OPS BAR|visibleHazards|<Marker|onPress=\{\(\)\s*=>\s*setSelectedId|enterPlacingMode|confirmPlacement|setPlacing|placing|crosshair|recenter|animateToRegion|coordinateForPoint|onRegionChangeComplete" "$BASE" > "$OUT/41_base_key_grep.txt" || true
  nl -ba "$BASE" | sed -n '140,240p' > "$OUT/42_base_marker_block.txt"
  nl -ba "$BASE" | sed -n '240,520p' > "$OUT/43_base_dashboard_block.txt"
  nl -ba "$BASE" | sed -n '520,920p' > "$OUT/44_base_bottom_ui_block.txt"
else
  echo "MISSING: $BASE" | tee "$OUT/40_base_missing.txt"
fi

say "5) DATA LAYER (PINS DEPEND ON THIS)"
if [ -f "lib/hazards.ts" ]; then
  nl -ba lib/hazards.ts | sed -n '1,220p' > "$OUT/50_hazards_ts.txt"
  rg -n "from\\(\"hazards_lgu_view\"\\)|select\\(|latitude|longitude|severity|status|created_at" lib/hazards.ts > "$OUT/51_hazards_key_grep.txt" || true
else
  echo "MISSING: lib/hazards.ts" | tee "$OUT/50_hazards_missing.txt"
fi

say "6) WHAT SCREEN CONTAINS 'LGU HAZARD OPS' STRING?"
rg -n "LGU HAZARD OPS" app > "$OUT/60_where_lgu_ops_string_is.txt" || true

say "7) WHAT SCREEN CONTAINS '+ REPORT HAZARD' BUTTON?"
rg -n "\\+ REPORT HAZARD|REPORT HAZARD" app > "$OUT/61_where_report_button_is.txt" || true

say "8) BUILD-TIME ROUTER ROOT"
if [ -f "app.json" ]; then sed -n '1,240p' app.json > "$OUT/70_app_json.txt"; fi
if [ -f "app.config.ts" ]; then sed -n '1,260p' app.config.ts > "$OUT/71_app_config_ts.txt"; fi

say "DONE. Files dumped to __findd__/out"
ls -la "$OUT"
