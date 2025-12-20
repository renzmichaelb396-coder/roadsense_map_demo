import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export const SCHEMA_VERSION = 1;

export type Hazard = {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: number;
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
    return JSON.parse(raw);
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
export async function loadHazardsFromSupabase(): Promise<Hazard[]> {
  const res = await supabase
    .from("hazards")
    .select("id,latitude,longitude,type,severity,created_at,deleted_at,is_deleted");

  if (!Array.isArray(res.data)) return [];

  return res.data
    .filter((r: any) => !r.deleted_at && !r.is_deleted)
    .map(
      (r: any): Hazard => ({
        id: String(r.id),
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        type: String(r.type),
        severity: Number(r.severity),
        createdAt: toEpoch(r.created_at),
      })
    );
}

async function cloudUpsert(h: Hazard) {
  await supabase.from("hazards").upsert({
    id: h.id,
    latitude: h.latitude,
    longitude: h.longitude,
    type: h.type,
    severity: h.severity,
    created_at: new Date(h.createdAt).toISOString(),
    is_deleted: false,
    deleted_at: null,
  });
}

async function cloudSoftDelete(id: string) {
  await supabase.from("hazards").upsert({
    id,
    is_deleted: true,
  });
}

/* ---------- public API ---------- */
export async function loadHazards(): Promise<Hazard[]> {
  const store = await readStore();
  if (store.hazards.length) return store.hazards;

  const cloud = await loadHazardsFromSupabase();
  await writeStore(cloud);
  return cloud;
}

export async function addHazard(h: Hazard): Promise<boolean> {
  const hazards = await loadHazards();
  const next = [...hazards, h];
  await writeStore(next);
  cloudUpsert(h).catch(() => {});
  return true;
}

export async function deleteHazardById(id: string) {
  const hazards = await loadHazards();
  const next = hazards.filter((h) => h.id !== id);
  await writeStore(next);
  cloudSoftDelete(id).catch(() => {});
}

export async function syncHazardsToSupabase() {
  const hazards = await loadHazards();
  for (const h of hazards) cloudUpsert(h).catch(() => {});
}

/* ---------- legacy compat ---------- */
export async function saveHazards(_: any) {
  /* no-op */
}
