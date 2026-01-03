import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";

export type HazardStatus = "reported" | "resolved";

function severityToDB(sev: any): "LOW" | "MEDIUM" | "HIGH" {
  if (sev === 3 || sev === "HIGH") return "HIGH";
  if (sev === 2 || sev === "MEDIUM") return "MEDIUM";
  return "LOW";
}

export type Hazard = {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: number; // 1|2|3
  status: HazardStatus;
  created_at?: string | null;
};

function requireSupabase() {
  // In Expo Go / dev, missing env happens. Don't freeze splash—return null and let UI load.
  return supabase;
}

export async function fetchHazards(): Promise<Hazard[]> {
  const sb = requireSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("hazards")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Hazard[];
}

async function getUserId(sb) {
  const { data } = await sb.auth.getUser();
  return data?.user?.id || null;
}
export async function createHazard(input: {
  latitude: number;
  longitude: number;
  type: string;
  severity: number;
}): Promise<Hazard> {
  const sb = requireSupabase();
  const hazard: Hazard = {
    id: uuidv4(),
    latitude: input.latitude,
    longitude: input.longitude,
    type: input.type,
    severity: severityToDB(input.severity),
    status: "REPORTED",
  };

  if (!sb) return hazard;

  const { error } = await sb.from("hazards").insert({
    id: hazard.id,
    latitude: hazard.latitude,
    longitude: hazard.longitude,
    type: hazard.type,
    severity: hazard.severity,
    status: hazard.status,
  });

  if (error) throw error;
  return hazard;
}

export async function resolveHazard(id: string) {
  const sb = requireSupabase();
  if (!sb) return;

  const { error } = await sb.from("hazards").update({ status: "RESOLVED" }).eq("id", id);
  if (error) throw error;
}

export async function deleteHazard(id: string) {
  const sb = requireSupabase();
  if (!sb) return;

  const { error } = await sb.from("hazards").delete().eq("id", id);
  if (error) throw error;
}
