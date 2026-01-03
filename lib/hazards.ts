import { supabase } from "./supabase";

export type Hazard = {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | number;
  status: "reported" | "resolved" | string;
  latitude: number;
  longitude: number;
  created_at?: string | null;
  updated_at?: string | null;
};

function toNumber(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toSeverityText(sev: any): "LOW" | "MEDIUM" | "HIGH" {
  // accept number or string
  if (sev === 3 || sev === "3" || String(sev).toUpperCase() === "HIGH") return "HIGH";
  if (sev === 2 || sev === "2" || String(sev).toUpperCase() === "MEDIUM") return "MEDIUM";
  return "LOW";
}

export async function fetchHazards(): Promise<Hazard[]> {
  const { data, error } = await supabase
    .from("hazards_lgu_view")
    .select("id,type,severity,status,latitude,longitude,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  const cleaned: Hazard[] = [];

  for (const r of rows as any[]) {
    const lat = toNumber(r.latitude);
    const lng = toNumber(r.longitude);
    if (lat == null || lng == null) continue;

    cleaned.push({
      id: String(r.id),
      type: String(r.type ?? "hazard"),
      severity: (typeof r.severity === "string" ? r.severity.toUpperCase() : r.severity) as any,
      status: String(r.status ?? "reported"),
      latitude: lat,
      longitude: lng,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at ?? null,
    });
  }

  return cleaned;
}

export async function createHazard(input: {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | number;
  status?: "reported" | "resolved";
  latitude: number;
  longitude: number;
}): Promise<{ id: string } | null> {
  const severityText = toSeverityText(input.severity);
  const status = input.status ?? "reported";

  // IMPORTANT: PostGIS geography/geometry accepts this format for SRID point
  const locationWkt = `SRID=4326;POINT(${input.longitude} ${input.latitude})`;

  const { data, error } = await supabase
    .from("hazards")
    .insert({
      type: input.type,
      severity: severityText,
      status,
      location: locationWkt,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) return null;

  return { id: String(data.id) };
}

export async function resolveHazard(id: string): Promise<void> {
  const { error } = await supabase
    .from("hazards")
    .update({ status: "resolved" })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteHazard(id: string): Promise<void> {
  const { error } = await supabase.from("hazards").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Back-compat shims (older maps expected these names).
 * Keep them so nothing randomly breaks.
 */
export async function loadHazards() {
  return fetchHazards();
}
export async function addHazard(h: any) {
  return createHazard({
    type: h?.type ?? "pothole",
    severity: h?.severity ?? "MEDIUM",
    status: h?.status ?? "reported",
    latitude: h?.latitude,
    longitude: h?.longitude,
  });
}
export async function updateHazardStatus(id: string, status: "reported" | "resolved") {
  if (status === "resolved") return resolveHazard(String(id));
  const { error } = await supabase.from("hazards").update({ status }).eq("id", id);
  if (error) throw error;
}
