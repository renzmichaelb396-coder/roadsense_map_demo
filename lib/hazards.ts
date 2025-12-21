import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabase } from "./supabase";

export const SCHEMA_VERSION = 2;

export type HazardStatus =
  | "reported"
  | "verified"
  | "in_progress"
  | "resolved";

export type Hazard = {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: number;
  status: HazardStatus;
  createdAt: number;
};

type Store = {
  schemaVersion: number;
  hazards: Hazard[];
};

const STORAGE_KEY = "ROADSENSE_HAZARDS";

/* ---------- utils ---------- */
function toEpoch(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
  }
  return Date.now();
}

/* ---------- storage ---------- */
async function readStore(): Promise<Store> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { schemaVersion: SCHEMA_VERSION, hazards: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      schemaVersion: SCHEMA_VERSION,
      hazards: Array.isArray(parsed.hazards) ? parsed.hazards : [],
    };
  } catch {
    return { schemaVersion: SCHEMA_VERSION, hazards: [] };
  }
}

async function writeStore(hazards: Hazard[]) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ schemaVersion: SCHEMA_VERSION, hazards })
  );
}

/* ---------- cloud ---------- */
async function loadFromCloud(): Promise<Hazard[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("hazards")
    .select(
      "id,latitude,longitude,type,severity,status,created_at,is_deleted,deleted_at"
    );

  if (!Array.isArray(data)) return [];

  return data
    .filter((r: any) => !r.is_deleted && !r.deleted_at)
    .map((r: any): Hazard => ({
      id: String(r.id),
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      type: String(r.type),
      severity: Number(r.severity),
      status: (r.status ?? "reported") as HazardStatus,
      createdAt: toEpoch(r.created_at),
    }));
}

/* ---------- public API ---------- */
export async function loadHazards(): Promise<Hazard[]> {
  try {
    const store = await readStore();
    if (store.hazards.length > 0) return store.hazards;

    const cloud = await loadFromCloud();
    await writeStore(cloud);
    return cloud;
  } catch (e) {
    console.warn("[Hazards] load failed:", e);
    return [];
  }
}

export async function addHazard(h: Hazard): Promise<boolean> {
  const store = await readStore();
  const next = [...store.hazards, h];
  await writeStore(next);

  const supabase = getSupabase();
  if (!supabase) return true;

  supabase
    .from("hazards")
    .upsert({
      id: h.id,
      latitude: h.latitude,
      longitude: h.longitude,
      type: h.type,
      severity: h.severity,
      status: h.status,
      created_at: new Date(h.createdAt).toISOString(),
      is_deleted: false,
      deleted_at: null,
    })
    .catch((err) =>
      console.warn("[Hazards] Cloud upsert failed:", err?.message)
    );

  return true;
}

export async function updateHazardStatus(id: string, status: HazardStatus) {
  const store = await readStore();
  const next = store.hazards.map((h) =>
    h.id === id ? { ...h, status } : h
  );
  await writeStore(next);

  const supabase = getSupabase();
  if (!supabase) return;

  supabase
    .from("hazards")
    .update({ status })
    .eq("id", id)
    .catch(() => {});
}
