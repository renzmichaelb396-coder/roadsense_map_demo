import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabase } from "./supabase";

export const SCHEMA_VERSION = 3;

export type HazardStatus = "reported" | "verified" | "in_progress" | "resolved";

export type Hazard = {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: number; // 1..3
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

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

/**
 * Deterministic UUIDv4 generator (no deps).
 * - Uses crypto.getRandomValues when available (Expo / modern JS)
 * - Falls back to Math.random (still unique enough for local-only emergency)
 */
function generateUUID(): string {
  const bytes = new Uint8Array(16);

  // crypto-backed if available
  const cryptoObj: any = (globalThis as any).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  // Per RFC4122 v4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");

  return (
    hex.slice(0, 8) +
    "-" +
    hex.slice(8, 12) +
    "-" +
    hex.slice(12, 16) +
    "-" +
    hex.slice(16, 20) +
    "-" +
    hex.slice(20)
  );
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

/**
 * IMPORTANT LIPAT INVARIANT:
 * - Never silently drop hazards.
 * - If legacy IDs exist, migrate them (regenerate UUID) instead of filtering out.
 * - Ensure no duplicate IDs in the final store.
 */
async function sanitizeAndMigrate(store: Store): Promise<Store> {
  const seen = new Set<string>();
  const migrated: Hazard[] = [];

  for (const raw of Array.isArray(store.hazards) ? store.hazards : []) {
    const base: Hazard = {
      id: typeof raw?.id === "string" ? raw.id : "",
      latitude: Number(raw?.latitude),
      longitude: Number(raw?.longitude),
      type: String(raw?.type ?? "unknown"),
      severity: Number(raw?.severity ?? 1),
      status: (raw?.status ?? "reported") as HazardStatus,
      createdAt: toEpoch(raw?.createdAt ?? raw?.created_at ?? now()),
      updatedAt: toEpoch(raw?.updatedAt ?? raw?.updated_at ?? raw?.createdAt ?? now()),
    };

    // migrate invalid IDs (do NOT drop)
    if (!isUUID(base.id)) base.id = generateUUID();

    // guarantee uniqueness (no collisions)
    while (seen.has(base.id)) base.id = generateUUID();
    seen.add(base.id);

    migrated.push(base);
  }

  return { schemaVersion: SCHEMA_VERSION, hazards: migrated };
}

async function readStore(): Promise<Store> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { schemaVersion: SCHEMA_VERSION, hazards: [] };

  try {
    const parsed = JSON.parse(raw);
    const store: Store = {
      schemaVersion: SCHEMA_VERSION,
      hazards: Array.isArray(parsed?.hazards) ? parsed.hazards : [],
    };
    return await sanitizeAndMigrate(store);
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

  const mapped = data
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

  // Keep only UUID-like IDs, but do NOT crash if remote has bad rows.
  // Remote bad IDs are ignored; local migration already preserves local data.
  return mapped.filter(h => isUUID(h.id));
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

    // Persist merged + migrated store so future reads are stable
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

/**
 * ADD (append-only, deterministic)
 * - Guarantees UUID
 * - Guarantees no ID collisions
 * - Writes local first
 * - Cloud insert best-effort
 */
export async function addHazard(h: Omit<Hazard, "updatedAt">): Promise<boolean> {
  const store = await readStore();

  // enforce ID validity + uniqueness
  let id = typeof (h as any)?.id === "string" ? (h as any).id : "";
  if (!isUUID(id)) id = generateUUID();
  while (store.hazards.some(x => x.id === id)) id = generateUUID();

  const hazard: Hazard = { ...h, id, updatedAt: now() };

  // STRICT APPEND-ONLY: never filter out existing hazards
  const next = [hazard, ...store.hazards];
  await writeStore(next);

  // CLOUD INSERT (best-effort)
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
    .update({ status, updated_at: new Date(updatedAt).toISOString() })
    .eq("id", id);

  if (error) {
    console.warn("[Hazards] Status update failed:", error.message);
  }
}

/**
 * DELETE (local-first, deterministic)
 * - Removes from local store immediately
 * - Soft-deletes in cloud best-effort (is_deleted/deleted_at)
 */
export async function deleteHazard(id: string): Promise<void> {
  const store = await readStore();
  const next = store.hazards.filter(h => h.id !== id);
  await writeStore(next);

  const supabase = getSupabase();
  if (!supabase || !isUUID(id)) return;

  const deletedAt = new Date(now()).toISOString();
  const { error } = await supabase
    .from("hazards")
    .update({ is_deleted: true, deleted_at: deletedAt })
    .eq("id", id);

  if (error) {
    console.warn("[Hazards] Cloud delete failed:", error.message);
  }
}
