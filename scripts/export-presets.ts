import { loadHazards } from "../lib/hazards";
import {
  filterHazardsByDays,
  rankDangerAreasWithDecay,
  addTrustScores,
} from "../lib/analytics";
import { toCSV } from "../lib/export";
import fs from "fs";

async function exportPreset(days: number) {
  const hazards = await loadHazards();
  const filtered = filterHazardsByDays(hazards, days);
  const ranked = rankDangerAreasWithDecay(filtered, days, 20);
  const trusted = addTrustScores(ranked);
  const csv = toCSV(trusted);

  const filename = `danger_areas_${days}d.csv`;
  fs.writeFileSync(filename, csv);
  console.log(`✅ Exported ${filename}`);
}

(async () => {
  await exportPreset(7);
  await exportPreset(30);
  await exportPreset(90);
})();
