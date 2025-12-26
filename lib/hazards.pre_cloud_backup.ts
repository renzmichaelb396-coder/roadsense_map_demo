import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/* ================= SUPABASE ================= */

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/* ================= TYPES ================= */

export type HazardStatus = "reported" | "resolved";

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

/* ================= CLOUD SYNC ================= */
/* GOALSS: fire-and-forget, no blocking */

async function pushHazardToCloud(hazard: Hazard) {
  if (!supabase) return;

  try {
    await supabase.from("hazards").upsert({
      id: hazard.id,
      latitude: hazard.latitude,
      longitude: hazard.longitude,
      severity: hazard.severity,
      type: hazard.type,
      status: hazard.status,
      created_at: new Date(hazard.createdAt).toISOString(),
      updated_at: new Date(hazard.updatedAt).toISOString(),
    });
  } catch (e) {
    // Silent failure — local-first is authoritative
  }
}

async function deleteHazardFromCloud(id: string) {
  if (!supabase) return;

  try {
    await supabase.from("hazards").delete().eq("id", id);
  } catch {
    // Silent
  }
}

/* ================= API ================= */

export async function fetchHazards(): Promise<Hazard[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createHazard(input: {
  latitude: number;
  longitude: number;
  severity: number;
  type?: string;
}): Promise<void> {
  const hazards = await fetchHazards();

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

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextHazards));

  // GOALSS: fire-and-forget cloud sync
  pushHazardToCloud(hazard);
}

export async function resolveHazard(id: string): Promise<void> {
  const hazards = await fetchHazards();

  const nextHazards = hazards.map((h) =>
    h.id === id
      ? { ...h, status: "resolved", updatedAt: now() }
      : h
  );

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextHazards));

  const resolved = nextHazards.find((h) => h.id === id);
  if (resolved) pushHazardToCloud(resolved);
}

export async function deleteHazard(id: string): Promise<void> {
  const hazards = await fetchHazards();

  const nextHazards = hazards.filter((h) => h.id !== id);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextHazards));

  // GOALSS: reflect deletion
  deleteHazardFromCloud(id);
}

/* ================= CLOUD STUB ================= */
/* Kept for compatibility */

export async function refreshHazardsFromCloud(): Promise<void> {
  return;
}
