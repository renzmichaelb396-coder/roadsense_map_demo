import { supabase as _supabase } from "./supabase";
const supabase = _supabase!;

export type Hazard = {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: number; // UI: 1 | 2 | 3
  resolved: boolean;
  deleted_at?: string | null;
  created_at?: string | null;
};

/**
 * DB → UI normalization
 * DB: "LOW" | "MEDIUM" | "HIGH"
 * UI: 1 | 2 | 3
 */
function dbSeverityToUi(sev: unknown): number {
  if (sev === "HIGH") return 3;
  if (sev === "MEDIUM") return 2;
  return 1;
}

/**
 * UI → DB normalization
 */
function uiSeverityToDb(sev: unknown): "LOW" | "MEDIUM" | "HIGH" {
  if (sev === 3 || sev === "HIGH") return "HIGH";
  if (sev === 2 || sev === "MEDIUM") return "MEDIUM";
  return "LOW";
}

export async function fetchHazards(): Promise<Hazard[]> {
  const { data, error } = await supabase
    .from("hazards")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!Array.isArray(data)) return [];

  return data.map((h: any) => ({
    ...h,
    severity: dbSeverityToUi(h.severity),
  })) as Hazard[];
}

export async function createHazard(input: {
  latitude: number;
  longitude: number;
  type: string;
  severity: number;
}): Promise<Hazard> {
  const dbSeverity = uiSeverityToDb(input.severity);

  const { data, error } = await supabase
    .from("hazards")
    .insert({
      latitude: input.latitude,
      longitude: input.longitude,
      type: input.type,
      severity: dbSeverity,
      resolved: false,
      status: "REPORTED",
    })
    .select()
    .single();

  if (error) {
    console.error("SUPABASE createHazard error:", error);
    throw error;
  }

  return {
    ...(data as any),
    severity: dbSeverityToUi(data.severity),
  } as Hazard;
}

export async function resolveHazard(id: string): Promise<void> {
  const { error } = await supabase
    .from("hazards")
    .update({
      resolved: true,
      status: "RESOLVED",
    })
    .eq("id", id);

  if (error) {
    console.error("SUPABASE resolveHazard error:", error);
    throw error;
  }
}

export async function deleteHazard(id: string): Promise<void> {
  const { error } = await supabase
    .from("hazards")
    .update({
      deleted_at: new Date().toISOString(),
      status: "RESOLVED",
    })
    .eq("id", id);

  if (error) {
    console.error("SUPABASE deleteHazard error:", error);
    throw error;
  }
}
