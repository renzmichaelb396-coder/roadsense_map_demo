import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export const SCHEMA_VERSION = 1;
const DEDUPE_RADIUS_METERS = 25;
const GRID_SIZE_METERS = 100;

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

/* ------------------ geo utils ------------------ */
function toRad(v: number) {
  return (v * Math.PI) / 180;
}

function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isDuplicate(newHazard: Hazard, hazards: Hazard[]) {
  return hazards.some((h) => {
    if (h.type !== newHazard.type) return false;
    return (
      distanceMeters(
        h.latitude,
        h.longitude,
        newHazard.latitude,
        newHazard.longitude
      ) <= DEDUPE_RADIUS_METERS
    );
  });
}

/* ------------------ storage ------------------ */
function emptyStore(): HazardStorageV1 {
  return { schemaVersion: SCHEMA_VERSION, hazards: [] };
}

async function saveStore(store: HazardStorageV1) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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

/* ------------------ public API ------------------ */
export async function loadHazards(): Promise<Hazard[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: HazardStorageV1 = JSON.parse(raw);
      if (parsed?.hazards?.length) return parsed.hazards;
    }

    const cloudHazards = await fetchFromCloud();
    await saveStore({
      schemaVersion: SCHEMA_VERSION,
      hazards: cloudHazards,
    });
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

export async function addHazard(hazard: Hazard): Promise<boolean> {
  const hazards = await loadHazards();

  if (isDuplicate(hazard, hazards)) return false;

  const next = [...hazards, hazard];
  await saveStore({ schemaVersion: SCHEMA_VERSION, hazards: next });
  shadowUpsert(hazard).catch(() => {});
  return true;
}

export async function deleteHazardById(id: string) {
  const hazards = await loadHazards();
  const next = hazards.filter((h) => h.id !== id);
  await saveStore({ schemaVersion: SCHEMA_VERSION, hazards: next });
  shadowDelete(id).catch(() => {});
}

/* ------------------ HEATMAP AGGREGATION ------------------ */
export type HeatCell = {
  key: string;
  latitude: number;
  longitude: number;
  count: number;
  byType: Record<string, number>;
  bySeverity: Record<number, number>;
};

function gridKey(lat: number, lng: number) {
  const latSize = GRID_SIZE_METERS / 111000;
  const lngSize = GRID_SIZE_METERS / 111000;
  const latBucket = Math.floor(lat / latSize);
  const lngBucket = Math.floor(lng / lngSize);
  return `${latBucket}:${lngBucket}`;
}

export async function getHeatmapCells(): Promise<HeatCell[]> {
  const hazards = await loadHazards();
  const map = new Map<string, HeatCell>();

  for (const h of hazards) {
    const key = gridKey(h.latitude, h.longitude);

    if (!map.has(key)) {
      map.set(key, {
        key,
        latitude: h.latitude,
        longitude: h.longitude,
        count: 0,
        byType: {},
        bySeverity: {},
      });
    }

    const cell = map.get(key)!;
    cell.count += 1;
    cell.byType[h.type] = (cell.byType[h.type] || 0) + 1;
    cell.bySeverity[h.severity] = (cell.bySeverity[h.severity] || 0) + 1;
  }

  return Array.from(map.values());
}
