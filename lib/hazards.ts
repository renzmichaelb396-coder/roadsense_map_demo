import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabase } from "./supabase";

export const SCHEMA_VERSION = 3;

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
  updatedAt: number;
};

type Store = {
  schemaVersion: number;
  hazards: Hazard[];
};

const STORAGE_KEY = "ROADSENSE_HAZARDS";

/* ---------- utils ---------- */
function now(): number {
  return Date.now();
}

function toEpoch(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
  }
  return now();
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
      "id,latitude,longitude,type,severity,status,created_at,updated_at,is_deleted,deleted_at"
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
      updatedAt: toEpoch(r.updated_at ?? r.created_at),
    }));
}

/* ---------- merge ---------- */
function mergeLWW(local: Hazard[], remote: Hazard[]): Hazard[] {
  const map = new Map<string, Hazard>();
  for (const h of local) map.set(h.id, h);
  for (const h of remote) {
    const existing = map.get(h.id);
    if (!existing || h.updatedAt > existing.updatedAt) {
      map.set(h.id, h);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

/* ---------- public API ---------- */
export async function loadHazards(): Promise<Hazard[]> {
  try {
    const store = await readStore();
    const cloud = await loadFromCloud();
    const merged = mergeLWW(store.hazards, cloud);
    await writeStore(merged);
    return merged;
  } catch (e) {
    console.warn("[Hazards] load failed:", e);
    return [];
  }
}

/**
 * Pull-only refresh for LGU feedback.
 * Safe to call on app focus / pull-to-refresh.
 */
export async function refreshHazardsFromCloud(): Promise<Hazard[]> {
  try {
    const store = await readStore();
    const cloud = await loadFromCloud();
    const merged = mergeLWW(store.hazards, cloud);
    await writeStore(merged);
    return merged;
  } catch (e) {
    console.warn("[Hazards] refresh failed:", e);
    return [];
  }
}

export async function addHazard(
  h: Omit<Hazard, "updatedAt">
): Promise<boolean> {
  const hazard: Hazard = {
    ...h,
    updatedAt: now(),
  };

  const store = await readStore();
  await writeStore([hazard, ...store.hazards.filter(x => x.id !== hazard.id)]);

  const supabase = getSupabase();
  if (!supabase) return true;

  supabase
    .from("hazards")
    .upsert({
      id: hazard.id,
      latitude: hazard.latitude,
      longitude: hazard.longitude,
      type: hazard.type,
      severity: hazard.severity,
      status: hazard.status,
      created_at: new Date(hazard.createdAt).toISOString(),
      updated_at: new Date(hazard.updatedAt).toISOString(),
      is_deleted: false,
      deleted_at: null,
    })
    .catch(err =>
      console.warn("[Hazards] Cloud upsert failed:", err?.message)
    );

  return true;
}

export async function updateHazardStatus(
  id: string,
  status: HazardStatus
): Promise<void> {
  const store = await readStore();
  const updatedAt = now();

  const next = store.hazards.map(h =>
    h.id === id ? { ...h, status, updatedAt } : h
  );
  await writeStore(next);

  const supabase = getSupabase();
  if (!supabase) return;

  supabase
    .from("hazards")
    .upsert({
      id,
      status,
      updated_at: new Date(updatedAt).toISOString(),
    })
    .catch(() => {});
}
