import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";

export type HazardStatus = "REPORTED" | "RESOLVED";
export type SeverityText = "LOW" | "MEDIUM" | "HIGH";

export type Hazard = {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: SeverityText;
  status: HazardStatus;
  created_at?: string | null;
};

function normalizeSeverity(sev: number): SeverityText {
  if (sev === 3) return "HIGH";
  if (sev === 2) return "MEDIUM";
  return "LOW";
}

function severityTextToNumber(sev: any): number {
  if (sev === "HIGH") return 3;
  if (sev === "MEDIUM") return 2;
  if (sev === "LOW") return 1;
  return Number(sev) || 1;
}

function assertFinite(n: number, label: string) {
  if (!Number.isFinite(n)) {
    throw new Error(`[hazards] invalid ${label}: ${n}`);
  }
}

export async function fetchHazards(): Promise<Hazard[]> {
  const { data, error } = await supabase
    .from("hazards")
    .select("*")
    .eq("source", "mobile")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((h: any) => ({
  ...h,
  latitude: Number(h.latitude),
  longitude: Number(h.longitude),
  severity: severityTextToNumber(h.severity),
}));
}

export async function createHazard(input: {
  latitude: number;
  longitude: number;
  type: string;
  severity: number;
}): Promise<Hazard> {
  assertFinite(input.latitude, "latitude");
  assertFinite(input.longitude, "longitude");

  const hazard: Hazard = {
    id: uuidv4(),
    latitude: input.latitude,
    longitude: input.longitude,
    type: input.type,
    severity: normalizeSeverity(input.severity),
    status: "REPORTED",
  };

  const { error } = await supabase.from("hazards").insert({
    id: hazard.id,
    latitude: hazard.latitude,
    longitude: hazard.longitude,
    type: hazard.type,
    severity: hazard.severity,
    status: hazard.status,
    source: "mobile",
    is_deleted: false,
  });

  if (error) throw error;
  return hazard;
}

export async function resolveHazard(id: string) {
  const { error } = await supabase
    .from("hazards")
    .update({ status: "RESOLVED" })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteHazard(id: string) {
  const { error } = await supabase
    .from("hazards")
    .update({ is_deleted: true })
    .eq("id", id);

  if (error) throw error;
}
