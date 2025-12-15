import { TrustedHeatCell } from "./analytics";

export function toCSV(rows: TrustedHeatCell[]): string {
  const header = "lat,lng,count,severityScore,trustScore";
  const lines = rows.map(
    (r) =>
      `${r.lat},${r.lng},${r.count},${r.severityScore},${r.trustScore}`
  );
  return [header, ...lines].join("\n");
}
