import { loadHazards } from "../lib/hazards";
import { rankDangerAreas } from "../lib/analytics";
import { toCSV } from "../lib/export";
import fs from "fs";

(async () => {
  const hazards = await loadHazards();
  const ranked = rankDangerAreas(hazards, 20);
  const csv = toCSV(ranked);

  fs.writeFileSync("danger_areas.csv", csv);
  console.log("✅ CSV exported: danger_areas.csv");
})();
