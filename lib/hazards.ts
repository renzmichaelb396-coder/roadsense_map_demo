import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

/* ================= TYPES ================= */

export type HazardStatus = "reported" | "resolved";

export type Hazard = {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: number; // 1=LOW 2=MED 3=HIGH
  status: HazardStatus;
  createdAt: number;
  updatedAt: number;
};

/* ================= CONST ================= */

const STORAGE_KEY = "ROADSENSE_HAZARDS";

/* ================= UTILS ================= */

function now(): number {
  return Date.now();
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function sevNumToText(sev: number): "LOW" | "MEDIUM" | "HIGH" {
  if (sev >= 3) return "HIGH";
  if (sev === 2) return "MEDIUM";
  return "LOW";
}

/* ================= LOCAL API ================= */

async function readLocal(): Promise<Hazard[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocal(hazards: Hazard[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(hazards));
}

/* ================= PUBLIC API ================= */

export async function fetchHazards(): Promise<Hazard[]> {
  // GOALSS v1:
  // Prefer cloud read when available; fallback to local if offline/error.
  if (supabase) {
    try {
      // If you already have hazards_lgu_view, it should expose lat/lng + status fields.
      // If it doesn't, this will fail and we will fallback to local.
      const { data, error } = await supabase
        .from("hazards_lgu_view")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (!error && Array.isArray(data)) {
        const mapped: Hazard[] = data.map((r: any) => {
          const sevText = String(r.severity || "LOW").toUpperCase();
          const sevNum = sevText === "HIGH" ? 3 : sevText === "MEDIUM" ? 2 : 1;

          return {
            id: String(r.id),
            latitude: Number(r.latitude ?? r.lat ?? 0),
            longitude: Number(r.longitude ?? r.lng ?? 0),
            type: String(r.type ?? "pothole"),
            severity: sevNum,
            status: r.status === "resolved" ? "resolved" : "reported",
            createdAt: r.created_at ? new Date(r.created_at).getTime() : now(),
            updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : now(),
          };
        });

        // cache it locally so the app still works offline
        await writeLocal(mapped);
        return mapped;
      }
    } catch {
      // ignore and fall back
    }
  }

  return readLocal();
}

export async function createHazard(input: {
  latitude: number;
  longitude: number;
  severity: number;
  type?: string;
}): Promise<void> {
  // 1) Local write first = instant UX
  const hazards = await readLocal();

  const hazard: Hazard = {
    id: uuid(),
    latitude: input.latitude,
    longitude: input.longitude,
    severity: input.severity,
    type: input.type ?? "pothole",
    status: "reported",
    createdAt: now(),
    updatedAt: now(),
  };

  const nextHazards = [hazard, ...hazards];
  await writeLocal(nextHazards);

  // 2) Fire-and-forget cloud push (GOALSS v1)
  if (supabase) {
    try {
      const severity_text = sevNumToText(input.severity);
      const hazard_type = input.type ?? "pothole";

      const { error } = await supabase.rpc("insert_hazard_report", {
        lat: input.latitude,
        lng: input.longitude,
        hazard_type,
        severity_text,
      });

      if (error) {
        console.warn("[hazards] cloud insert failed:", error.message);
      }
    } catch (e: any) {
      console.warn("[hazards] cloud insert exception:", e?.message ?? e);
    }
  }
}

export async function resolveHazard(id: string): Promise<void> {
  // GOALSS v1 SECURITY:
  // We keep resolve LOCAL-ONLY for now.
  // Do NOT allow anonymous updates on production hazards.
  const hazards = await readLocal();

  const nextHazards = hazards.map((h) =>
    h.id === id ? { ...h, status: "resolved", updatedAt: now() } : h
  );

  await writeLocal(nextHazards);
}

export async function deleteHazard(id: string): Promise<void> {
  // GOALSS v1 SECURITY:
  // Local-only delete for now (same reason).
  const hazards = await readLocal();
  const nextHazards = hazards.filter((h) => h.id !== id);
  await writeLocal(nextHazards);
}

/* ================= CLOUD ================= */

export async function refreshHazardsFromCloud(): Promise<void> {
  // warm the cache; ignore errors
  await fetchHazards();
}
