import { createClient } from "@supabase/supabase-js";
import { FEATURES } from "./featureFlags";
import { loadHazards, saveHazards } from "./hazards";

const SUPABASE_URL = "https://zpphtvjuobmcxfeolrie.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_82u-EIF93YWAXQ1gEA1QgQ_RMLALohc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let channel: ReturnType<typeof supabase.channel> | null = null;

/**
 * Start realtime sync for hazards (MAP-ONLY)
 */
export function startHazardsRealtime() {
  if (!FEATURES.USE_SUPABASE_HAZARDS) return;
  if (channel) return; // already running

  channel = supabase
    .channel("hazards-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "hazards" },
      async (payload) => {
        try {
          const local = await loadHazards();

          if (payload.eventType === "INSERT") {
            const exists = local.find((h) => h.id === payload.new.id);
            if (!exists) {
              local.push(normalizeHazard(payload.new));
            }
          }

          if (payload.eventType === "UPDATE") {
            const idx = local.findIndex((h) => h.id === payload.new.id);
            if (idx !== -1) {
              local[idx] = normalizeHazard(payload.new);
            }
          }

          if (payload.eventType === "DELETE") {
            const idx = local.findIndex((h) => h.id === payload.old.id);
            if (idx !== -1) {
              local.splice(idx, 1);
            }
          }

          await saveHazards(local);
        } catch (err) {
          console.error("[Realtime] hazard sync error", err);
        }
      }
    )
    .subscribe();
}

/**
 * Stop realtime sync
 */
export function stopHazardsRealtime() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}

function normalizeHazard(row: any) {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
  };
}
