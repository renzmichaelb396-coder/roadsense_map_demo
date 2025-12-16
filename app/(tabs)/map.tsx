import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";

/* ===================== TYPES ===================== */
type HazardType =
  | "FLOOD"
  | "POTHOLE"
  | "ROAD_CLOSED"
  | "ACCIDENT"
  | "FIRE"
  | "LANDSLIDE"
  | "FALLEN_TREE"
  | "BROKEN_VEHICLE";

type Severity = "LOW" | "MEDIUM" | "HIGH";

type Hazard = {
  id: string;
  type: HazardType;
  severity: Severity;
  latitude: number;
  longitude: number;
  createdAt: number;
};

type Filters = { LOW: boolean; MEDIUM: boolean; HIGH: boolean };
type Sheet = "NONE" | "PLACE" | "TYPE" | "SEVERITY" | "LEGEND";

/* ===================== CONSTS ===================== */
const STORAGE_KEY = "ROADSENSE_HAZARDS";
const EXPIRY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_FILTERS: Filters = { LOW: true, MEDIUM: true, HIGH: true };

const HAZARD_CONFIG: Record<
  HazardType,
  { label: string; icon: any; color: string }
> = {
  FLOOD: { label: "Flood", icon: "water", color: "#3B82F6" },
  POTHOLE: { label: "Pothole", icon: "alert", color: "#F59E0B" },
  ROAD_CLOSED: { label: "Road Closed", icon: "close", color: "#EF4444" },
  ACCIDENT: { label: "Accident", icon: "car", color: "#F97316" },
  FIRE: { label: "Fire", icon: "flame", color: "#DC2626" },
  LANDSLIDE: { label: "Landslide", icon: "triangle", color: "#92400E" },
  FALLEN_TREE: { label: "Fallen Tree", icon: "leaf", color: "#16A34A" },
  BROKEN_VEHICLE: { label: "Broken Vehicle", icon: "construct", color: "#6B7280" },
};

const SEVERITY_HINT: Record<Severity, string> = {
  LOW: "Minor – passable",
  MEDIUM: "Caution advised",
  HIGH: "Avoid if possible",
};

/* ===================== SCREEN ===================== */
export default function MapScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const [sheet, setSheet] = useState<Sheet>("NONE");
  const [pendingType, setPendingType] = useState<HazardType | null>(null);
  const [pendingSeverity, setPendingSeverity] = useState<Severity | null>(null);

  const placingActive = sheet === "PLACE" || sheet === "TYPE" || sheet === "SEVERITY";

  /* ---------- LOCATION ---------- */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  /* ---------- LOAD ---------- */
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const now = Date.now();
      setHazards(
        JSON.parse(raw).filter((h: Hazard) => now - h.createdAt < EXPIRY_MS)
      );
    })();
  }, []);

  function persist(list: Hazard[]) {
    setHazards(list);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  /* ---------- FLOW HELPERS ---------- */
  const exitPlacingMode = useCallback(() => {
    setSheet("NONE");
    setPendingType(null);
    setPendingSeverity(null);
  }, []);

  const enterPlacingMode = useCallback(() => {
    setPendingType(null);
    setPendingSeverity(null);
    setSheet("PLACE");
  }, []);

  /* Tap anywhere on map outside sheet = close current sheet */
  const onMapPress = useCallback(() => {
    if (sheet !== "NONE") {
      exitPlacingMode();
    }
  }, [sheet, exitPlacingMode]);

  /* ---------- ACTIONS ---------- */
  function submitHazard() {
    if (!region || !pendingType || !pendingSeverity) return;

    persist([
      ...hazards,
      {
        id: Date.now().toString(),
        type: pendingType,
        severity: pendingSeverity,
        latitude: region.latitude,
        longitude: region.longitude,
        createdAt: Date.now(),
      },
    ]);

    exitPlacingMode();
  }

  function deleteHazard(id: string) {
    Alert.alert("Delete hazard?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => persist(hazards.filter((h) => h.id !== id)),
      },
    ]);
  }

  const visibleHazards = useMemo(
    () => hazards.filter((h) => filters[h.severity]),
    [hazards, filters]
  );

  if (!region) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        delayLongPress={300}
        onLongPress={enterPlacingMode}
        onPress={onMapPress}
      >
        {visibleHazards.map((h) => {
          const cfg = HAZARD_CONFIG[h.type];
          return (
            <Marker
              key={h.id}
              coordinate={{ latitude: h.latitude, longitude: h.longitude }}
              onPress={() => deleteHazard(h.id)}
            >
              <View style={[styles.marker, { borderColor: cfg.color }]}>
                <Ionicons name={cfg.icon} size={18} color="white" />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* CENTER PIN (follows map center because we use region) */}
      {placingActive && (
        <View pointerEvents="none" style={styles.centerPin}>
          <Ionicons name="location-sharp" size={40} color="#EF4444" />
        </View>
      )}

      {/* FAB */}
      <Pressable style={styles.fab} onPress={enterPlacingMode}>
        <Ionicons name="add" size={28} color="white" />
      </Pressable>

      {/* LEGEND BUTTON */}
      <Pressable style={styles.info} onPress={() => setSheet("LEGEND")}>
        <Ionicons name="information" size={18} color="white" />
      </Pressable>

      {/* DIM BACKDROP (does NOT block map touches) */}
      {sheet !== "NONE" && <View pointerEvents="none" style={styles.dim} />}

      {/* SHEETS */}
      {sheet === "PLACE" && (
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Place hazard</Text>
              <Text style={styles.sub}>Drag the map to position the pin</Text>
            </View>
          </View>

          <View style={styles.sheetActions}>
            <Pressable style={styles.cancelBtn} onPress={exitPlacingMode}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={styles.confirmBtn}
              onPress={() => setSheet("TYPE")}
            >
              <Text style={styles.confirmText}>Confirm location</Text>
            </Pressable>
          </View>
        </View>
      )}

      {sheet === "TYPE" && (
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>Select hazard type</Text>
            <Text style={styles.sub}>Tap anywhere on map to cancel</Text>
          </View>

          {Object.entries(HAZARD_CONFIG).map(([k, cfg]) => (
            <Pressable
              key={k}
              style={styles.row}
              onPress={() => {
                setPendingType(k as HazardType);
                setPendingSeverity(null);
                setSheet("SEVERITY");
              }}
            >
              <Ionicons name={cfg.icon} size={20} color={cfg.color} />
              <Text style={styles.text}>{cfg.label}</Text>
            </Pressable>
          ))}

          <View style={{ height: 8 }} />

          <Pressable style={styles.cancelBtnFull} onPress={exitPlacingMode}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {sheet === "SEVERITY" && (
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>Select severity</Text>
            <Text style={styles.sub}>Tap anywhere on map to cancel</Text>
          </View>

          {(["LOW", "MEDIUM", "HIGH"] as Severity[]).map((s) => (
            <Pressable
              key={s}
              style={[styles.row, pendingSeverity === s && styles.activeRow]}
              onPress={() => setPendingSeverity(s)}
            >
              <Text style={styles.text}>
                {s} — {SEVERITY_HINT[s]}
              </Text>
            </Pressable>
          ))}

          <View style={styles.sheetActions}>
            <Pressable style={styles.cancelBtn} onPress={exitPlacingMode}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.confirmBtn, !pendingSeverity && { opacity: 0.4 }]}
              disabled={!pendingSeverity}
              onPress={submitHazard}
            >
              <Text style={styles.confirmText}>Submit</Text>
            </Pressable>
          </View>
        </View>
      )}

      {sheet === "LEGEND" && (
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>Legend</Text>
            <Text style={styles.sub}>Tap anywhere outside to close</Text>
          </View>

          {(["LOW", "MEDIUM", "HIGH"] as Severity[]).map((s) => (
            <View key={s} style={styles.filterRow}>
              <Text style={[styles.text, { marginLeft: 0 }]}>{s}</Text>
              <Switch
                value={filters[s]}
                onValueChange={(v) => setFilters({ ...filters, [s]: v })}
              />
            </View>
          ))}

          <View style={{ height: 8 }} />

          <Pressable style={styles.confirmBtnFull} onPress={() => setSheet("NONE")}>
            <Text style={styles.confirmText}>Close</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
  },

  centerPin: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -40,
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    position: "absolute",
    right: 20,
    top: 50,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#111",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },

  sheetHeader: { marginBottom: 10 },

  title: { color: "#FFFFFF", fontWeight: "800", fontSize: 18 },
  sub: { color: "#FFFFFF", marginTop: 6, opacity: 0.92 },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  activeRow: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8 },
  text: { color: "#FFFFFF", marginLeft: 12, fontWeight: "700" },

  sheetActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#1F2937",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#333",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },

  cancelBtnFull: {
    backgroundColor: "#1F2937",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmBtnFull: {
    backgroundColor: "#333",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },

  cancelText: { color: "#FFFFFF", fontWeight: "800" },
  confirmText: { color: "#FFFFFF", fontWeight: "800" },

  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
});
