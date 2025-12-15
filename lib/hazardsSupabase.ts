// lib/hazardsSupabase.ts
import { createClient } from "@supabase/supabase-js";

export type Hazard = {
  id: string;
  type: string;
  severity: number;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
  source: string;
  is_deleted: boolean;
};

const SUPABASE_URL = "https://zpphtvjuobmcxfeolrie.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_82u-EIF93YWAXQ1gEA1QgQ_RMLALohc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Read-only loader for hazards from Supabase (V1)
 * Mirrors loadHazards() contract
 */
export async function loadHazardsFromSupabase(): Promise<Hazard[]> {
  const { data, error } = await supabase
    .from("hazards")
    .select(
      `
      id,
      type,
      severity,
      latitude,
      longitude,
      created_at,
      updated_at,
      source,
      is_deleted
    `
    )
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Supabase] loadHazards error:", error.message);
    return [];
  }

  return data ?? [];
}
