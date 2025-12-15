import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
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

type SheetMode = "NONE" | "PLACE" | "TYPE" | "SEVERITY" | "LEGEND";

/* ===================== CONSTS ===================== */
const STORAGE_KEY = "ROADSENSE_HAZARDS";
const EXPIRY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_FILTERS: Filters = { LOW: true, MEDIUM: true, HIGH: true };

const DEDUPE_RADIUS_METERS = 25;

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

/* ===================== HELPERS ===================== */
function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function ageOpacity(createdAt: number) {
  const ageMs = Date.now() - createdAt;
  const day = 24 * 60 * 60 * 1000;
  if (ageMs <= day) return 1;
  if (ageMs <= 3 * day) return 0.65;
  return 0.35;
}

/* ===================== SCREEN ===================== */
export default function MapScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const [sheet, setSheet] = useState<SheetMode>("NONE");
  const [pendingType, setPendingType] = useState<HazardType | null>(null);
  const [pendingSeverity, setPendingSeverity] = useState<Severity | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const placingActive = sheet === "PLACE" || sheet === "TYPE" || sheet === "SEVERITY";

  const enterPlacingMode = () => {
    setPendingType(null);
    setPendingSeverity(null);
    setSheet("PLACE");
  };

  const closeAllSheets = () => {
    setSheet("NONE");
  };

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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)).catch(() => {});
  }

  function fireToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  function submitHazard() {
    if (!region || !pendingType || !pendingSeverity) return;

    const duplicate = hazards.some(
      (h) =>
        h.type === pendingType &&
        distanceMeters(h.latitude, h.longitude, region.latitude, region.longitude) <=
          DEDUPE_RADIUS_METERS
    );

    if (duplicate) {
      fireToast("Hazard already reported nearby");
      setPendingType(null);
      setPendingSeverity(null);
      closeAllSheets();
      return;
    }

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

    fireToast("Hazard reported");
    setPendingType(null);
    setPendingSeverity(null);
    closeAllSheets();
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

  async function shareHazard(h: Hazard) {
    const cfg = HAZARD_CONFIG[h.type];
    const date = new Date(h.createdAt).toLocaleString();
    const message = `🚧 Road Hazard Report (RoadSense PH)

Type: ${cfg.label}
Severity: ${h.severity}
Reported: ${date}

Location:
https://maps.google.com/?q=${h.latitude},${h.longitude}`;

    try {
      await Share.share({ message });
    } catch {}
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
        onLongPress={enterPlacingMode}
      >
        {visibleHazards.map((h) => {
          const cfg = HAZARD_CONFIG[h.type];
          return (
            <Marker
              key={h.id}
              coordinate={{ latitude: h.latitude, longitude: h.longitude }}
              onPress={() =>
                Alert.alert(cfg.label, "Action", [
                  { text: "Share", onPress: () => shareHazard(h) },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteHazard(h.id),
                  },
                  { text: "Cancel", style: "cancel" },
                ])
              }
            >
              <View
                style={[
                  styles.marker,
                  { borderColor: cfg.color, opacity: ageOpacity(h.createdAt) },
                ]}
              >
                <Ionicons name={cfg.icon} size={18} color="white" />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* CENTER PIN */}
      {placingActive && (
        <View pointerEvents="none" style={styles.centerPin}>
          <Ionicons name="location" size={36} color="#EF4444" />
        </View>
      )}

      {/* TOAST */}
      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
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

      {/* SINGLE MODAL (ONLY ONE OVERLAY EVER) */}
      <Modal transparent visible={sheet !== "NONE"} onRequestClose={closeAllSheets}>
        <Pressable style={styles.overlay} onPress={closeAllSheets} />

        {/* PLACE */}
        {sheet === "PLACE" && (
          <View style={styles.sheet}>
            <Text style={styles.title}>Place hazard</Text>
            <Text style={styles.sub}>Drag map to position the pin</Text>
            <Pressable style={styles.confirm} onPress={() => setSheet("TYPE")}>
              <Text style={styles.confirmText}>Confirm location</Text>
            </Pressable>
          </View>
        )}

        {/* TYPE */}
        {sheet === "TYPE" && (
          <View style={styles.sheet}>
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
          </View>
        )}

        {/* SEVERITY */}
        {sheet === "SEVERITY" && (
          <View style={styles.sheet}>
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
            <Pressable
              style={[styles.confirm, !pendingSeverity && { opacity: 0.4 }]}
              disabled={!pendingSeverity}
              onPress={submitHazard}
            >
              <Text style={styles.confirmText}>Submit</Text>
            </Pressable>
          </View>
        )}

        {/* LEGEND */}
        {sheet === "LEGEND" && (
          <View style={styles.sheet}>
            {(["LOW", "MEDIUM", "HIGH"] as Severity[]).map((s) => (
              <View key={s} style={styles.filterRow}>
                <Text style={styles.text}>{s}</Text>
                <Switch
                  value={filters[s]}
                  onValueChange={(v) => setFilters({ ...filters, [s]: v })}
                />
              </View>
            ))}
            <Pressable style={styles.confirm} onPress={closeAllSheets}>
              <Text style={styles.confirmText}>Close</Text>
            </Pressable>
          </View>
        )}
      </Modal>
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
    marginLeft: -18,
    marginTop: -36,
  },

  toast: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    backgroundColor: "#111",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  toastText: { color: "white", fontWeight: "600" },

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

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: "#111",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  activeRow: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8 },
  text: { color: "white", marginLeft: 12 },

  title: { color: "white", fontWeight: "700", fontSize: 16 },
  sub: { color: "rgba(255,255,255,0.7)", marginTop: 6 },

  confirm: {
    marginTop: 12,
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmText: { color: "white", fontWeight: "700" },

  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
});
