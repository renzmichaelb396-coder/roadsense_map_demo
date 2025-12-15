import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export const SCHEMA_VERSION = 1;
const DEDUPE_RADIUS_METERS = 35;

export type Hazard = {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: number;
  createdAt: number;
};

type HazardStorageV1 = {
  schemaVersion: number;
  hazards: Hazard[];
};

const STORAGE_KEY = "ROADSENSE_HAZARDS";

function emptyStore(): HazardStorageV1 {
  return { schemaVersion: SCHEMA_VERSION, hazards: [] };
}

async function saveStore(store: HazardStorageV1) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function toRad(v: number) {
  return (v * Math.PI) / 180;
}

function distanceMeters(a: Hazard, b: Hazard) {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(x));
}

async function fetchFromCloud(): Promise<Hazard[]> {
  const { data, error } = await supabase.from("hazards").select("*");
  if (error || !Array.isArray(data)) return [];

  return data.map((h) => ({
    id: h.id,
    latitude: h.latitude,
    longitude: h.longitude,
    type: h.type,
    severity: h.severity,
    createdAt: h.created_at,
  }));
}

export async function loadHazards(): Promise<Hazard[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: HazardStorageV1 = JSON.parse(raw);
      if (parsed?.hazards?.length) return parsed.hazards;
    }

    const cloudHazards = await fetchFromCloud();
    await saveStore({ schemaVersion: SCHEMA_VERSION, hazards: cloudHazards });
    return cloudHazards;
  } catch {
    return [];
  }
}

async function shadowUpsert(hazard: Hazard) {
  await supabase.from("hazards").upsert({
    id: hazard.id,
    latitude: hazard.latitude,
    longitude: hazard.longitude,
    type: hazard.type,
    severity: hazard.severity,
    created_at: hazard.createdAt,
  });
}

async function shadowDelete(id: string) {
  await supabase.from("hazards").delete().eq("id", id);
}

export async function addHazard(hazard: Hazard) {
  const hazards = await loadHazards();

  const duplicate = hazards.find(
    (h) =>
      h.type === hazard.type &&
      distanceMeters(h, hazard) < DEDUPE_RADIUS_METERS
  );

  if (duplicate) {
    return; // silently ignore spam
  }

  const updated = [...hazards, hazard];

  await saveStore({
    schemaVersion: SCHEMA_VERSION,
    hazards: updated,
  });

  shadowUpsert(hazard);
}

export async function deleteHazardById(id: string) {
  const hazards = await loadHazards();

  await saveStore({
    schemaVersion: SCHEMA_VERSION,
    hazards: hazards.filter((h) => h.id !== id),
  });

  shadowDelete(id);
}
