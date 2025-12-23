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

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function now(): number {
  return Date.now();
}

function toEpoch(v: any): number {
  if (typeof v === "number") return v;
  const t = Date.parse(v);
  return Number.isNaN(t) ? now() : t;
}

/* ---------- severity helpers ---------- */
function severityNumToStr(n: number): "LOW" | "MEDIUM" | "HIGH" {
  if (n === 3) return "HIGH";
  if (n === 2) return "MEDIUM";
  return "LOW";
}

function severityStrToNum(s: any): number {
  if (s === "HIGH") return 3;
  if (s === "MEDIUM") return 2;
  return 1;
}

/* ---------- PostGIS ---------- */
function toGeogPointWkt(lat: number, lng: number) {
  return `POINT(${lng} ${lat})`;
}

/* ---------- storage ---------- */
async function sanitizeStore(store: Store): Promise<Store> {
  store.hazards = store.hazards.filter(h => isUUID(h.id));
  return store;
}

async function readStore(): Promise<Store> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { schemaVersion: SCHEMA_VERSION, hazards: [] };
  try {
    const parsed = JSON.parse(raw);
    const cleaned = await sanitizeStore({
  schemaVersion: SCHEMA_VERSION,
  hazards: Array.isArray(parsed.hazards) ? parsed.hazards : [],
});
return cleaned;
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

  const { data, error } = await supabase
    .from("hazards")
    .select(
      "id,latitude,longitude,type,severity,status,created_at,updated_at,is_deleted,deleted_at"
    );

  if (error || !Array.isArray(data)) return [];

  return data
    .filter(r => !r.is_deleted && !r.deleted_at)
    .map(r => ({
      id: String(r.id),
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      type: String(r.type),
      severity: severityStrToNum(r.severity),
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
    const e = map.get(h.id);
    if (!e || h.updatedAt > e.updatedAt) map.set(h.id, h);
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/* ---------- public API ---------- */
export async function loadHazards(): Promise<Hazard[]> {
  try {
    const store = await readStore();
    const cloud = await loadFromCloud();
    const merged = mergeLWW(store.hazards, cloud);
    await writeStore(merged);
    return merged;
  } catch {
    return [];
  }
}

/**
 * Pull-only refresh used by app/_layout.tsx on app resume.
 * Keep this stable to avoid runtime crashes.
 */
export async function refreshHazardsFromCloud(): Promise<Hazard[]> {
  return loadHazards();
}



export async function addHazard(
  h: Omit<Hazard, "updatedAt">
): Promise<boolean> {
  const hazard: Hazard = { ...h, updatedAt: now() };

  // LOCAL FIRST
  const store = await readStore();
  await writeStore([hazard, ...store.hazards.filter(x => x.id !== hazard.id)]);

  // CLOUD INSERT (requires location)
  const supabase = getSupabase();
if (!supabase || !isUUID(hazard.id)) {
  console.warn("[Hazards] Skipping cloud insert (local-only)");
  return true;
}

  const { error } = await supabase.from("hazards").insert({
    id: hazard.id,
    latitude: hazard.latitude,
    longitude: hazard.longitude,
    location: toGeogPointWkt(hazard.latitude, hazard.longitude),
    type: hazard.type,
    severity: severityNumToStr(hazard.severity),
    status: hazard.status,
    created_at: new Date(hazard.createdAt).toISOString(),
    updated_at: new Date(hazard.updatedAt).toISOString(),
    is_deleted: false,
  });

  if (error) {
    console.warn("[Hazards] Cloud insert failed:", error.message);
  }

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
  if (!supabase || !isUUID(id)) return;

  const { error } = await supabase
    .from("hazards")
    .update({
      status,
      updated_at: new Date(updatedAt).toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.warn("[Hazards] Status update failed:", error.message);
  }
}

export async function deleteHazard(id: string): Promise<void> {
  const store = await readStore();
  const updatedAt = now();

  // LOCAL FIRST
  const next = store.hazards.filter(h => h.id !== id);
  await writeStore(next);

  // CLOUD BEST-EFFORT
  const supabase = getSupabase();
  if (!supabase || !isUUID(id)) {
    console.warn("[Hazards] Skipping cloud delete (local-only)");
    return;
  }

  const { error } = await supabase
    .from("hazards")
    .update({
      is_deleted: true,
      deleted_at: new Date(updatedAt).toISOString(),
      updated_at: new Date(updatedAt).toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.warn("[Hazards] Delete failed:", error.message);
  }
}

export async function wipeAllHazards(): Promise<void> {
  await AsyncStorage.setItem("ROADSENSE_HAZARDS", JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    hazards: [],
  }));
}
