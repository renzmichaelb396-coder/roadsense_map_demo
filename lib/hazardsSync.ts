// lib/hazardsSync.ts
import { FEATURES } from "./featureFlags";
import { loadHazards } from "./hazards";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zpphtvjuobmcxfeolrie.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_82u-EIF93YWAXQ1gEA1QgQ_RMLALohc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Background sync: push local hazards to Supabase
 * - AsyncStorage remains source of truth
 * - Safe to call repeatedly
 * - No UI coupling
 */
export async function syncHazardsToSupabase(): Promise<void> {
  if (!FEATURES.USE_SUPABASE_HAZARDS) return;

  try {
    const localHazards = await loadHazards();

    if (!localHazards.length) return;

    const payload = localHazards.map((h) => ({
      id: h.id,
      type: h.type,
      severity: h.severity,
      latitude: h.latitude,
      longitude: h.longitude,
      created_at: h.createdAt,
      updated_at: new Date().toISOString(),
      source: "mobile",
      is_deleted: false,
    }));

    const { error } = await supabase
      .from("hazards")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("[Supabase] syncHazards error:", error.message);
    }
  } catch (err) {
    console.error("[Supabase] syncHazards exception:", err);
  }
}
