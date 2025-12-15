import { Hazard } from "./hazards";

const GRID_SIZE_METERS = 50;
const EARTH_RADIUS = 6371000;

function toRad(v: number) {
  return (v * Math.PI) / 180;
}

function metersToLat(m: number) {
  return (m / EARTH_RADIUS) * (180 / Math.PI);
}

function metersToLng(m: number, lat: number) {
  return (m / (EARTH_RADIUS * Math.cos(toRad(lat)))) * (180 / Math.PI);
}

export type HeatCell = {
  lat: number;
  lng: number;
  count: number;
  severityScore: number;
};

export function buildHeatmap(hazards: Hazard[]): HeatCell[] {
  const cells = new Map<string, HeatCell>();

  for (const h of hazards) {
    const latStep = metersToLat(GRID_SIZE_METERS);
    const lngStep = metersToLng(GRID_SIZE_METERS, h.latitude);

    const latKey = Math.round(h.latitude / latStep) * latStep;
    const lngKey = Math.round(h.longitude / lngStep) * lngStep;

    const key = `${latKey}:${lngKey}`;

    if (!cells.has(key)) {
      cells.set(key, {
        lat: latKey,
        lng: lngKey,
        count: 0,
        severityScore: 0,
      });
    }

    const cell = cells.get(key)!;
    cell.count += 1;
    cell.severityScore += h.severity;
  }

  return Array.from(cells.values());
}

export function rankDangerAreas(
  hazards: Hazard[],
  limit = 10
): HeatCell[] {
  return buildHeatmap(hazards)
    .sort((a, b) => {
      const scoreA = a.count * a.severityScore;
      const scoreB = b.count * b.severityScore;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

export function rankDangerAreasWithDecay(
  hazards: Hazard[],
  days = 30,
  limit = 10
): HeatCell[] {
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;

  const filtered = hazards.filter(
    (h) => now - h.createdAt <= windowMs
  );

  return buildHeatmap(filtered)
    .map((cell) => ({
      ...cell,
      severityScore: cell.severityScore / filtered.length,
    }))
    .sort((a, b) => {
      const scoreA = a.count * a.severityScore;
      const scoreB = b.count * b.severityScore;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

export function filterHazardsByDays(
  hazards: Hazard[],
  days: number
): Hazard[] {
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  return hazards.filter((h) => now - h.createdAt <= windowMs);
}

export type TrustedHeatCell = HeatCell & {
  trustScore: number; // 0 → low confidence, 1 → high confidence
};

export function addTrustScores(
  cells: HeatCell[],
  maxCount = 10
): TrustedHeatCell[] {
  return cells.map((cell) => {
    const normalizedCount = Math.min(cell.count / maxCount, 1);

    // severityScore already aggregates severity
    const severityFactor = Math.min(cell.severityScore / maxCount, 1);

    const trustScore = Math.min(
      1,
      0.6 * normalizedCount + 0.4 * severityFactor
    );

    return {
      ...cell,
      trustScore: Number(trustScore.toFixed(2)),
    };
  });
}
