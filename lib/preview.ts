import { Hazard } from "./hazards";
import {
  filterHazardsByDays,
  rankDangerAreasWithDecay,
  addTrustScores,
} from "./analytics";

export type PreviewRow = {
  lat: number;
  lng: number;
  count: number;
  severityScore: number;
  trustScore: number;
};

export function buildPreview(
  hazards: Hazard[],
  days: 7,
  limit = 5
): PreviewRow[] {
  const filtered = filterHazardsByDays(hazards, days);
  const ranked = rankDangerAreasWithDecay(filtered, days, limit);
  const trusted = addTrustScores(ranked);
  return trusted.map(({ lat, lng, count, severityScore, trustScore }) => ({
    lat,
    lng,
    count,
    severityScore,
    trustScore,
  }));
}
