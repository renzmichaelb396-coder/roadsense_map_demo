import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import MapView, { MapLongPressEvent, Marker, Region } from "react-native-maps";

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

type Filters = Record<Severity, boolean>;

/* ===================== CONSTS ===================== */
const STORAGE_KEY = "ROADSENSE_HAZARDS";
const FILTER_KEY = "ROADSENSE_FILTERS";

const DEFAULT_FILTERS: Filters = { LOW: true, MEDIUM: true, HIGH: true };

const HAZARDS: Record<HazardType, { label: string; icon: any; color: string }> = {
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

  const [legendOpen, setLegendOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [type, setType] = useState<HazardType | null>(null);
  const [severity, setSeverity] = useState<Severity>("MEDIUM");

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setHazards(JSON.parse(stored));

      const f = await AsyncStorage.getItem(FILTER_KEY);
      if (f) setFilters(JSON.parse(f));
    })();
  }, []);

  function persist(list: Hazard[]) {
    setHazards(list);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function onLongPress(e: MapLongPressEvent) {
    setCoord({
      lat: e.nativeEvent.coordinate.latitude,
      lng: e.nativeEvent.coordinate.longitude,
    });
    setType(null);
    setSeverity("MEDIUM");
    setPickerOpen(true);
  }

  function submit() {
    if (!coord || !type) return;

    const h: Hazard = {
      id: Date.now().toString(),
      type,
      severity,
      latitude: coord.lat,
      longitude: coord.lng,
      createdAt: Date.now(),
    };

    persist([...hazards, h]);
    setPickerOpen(false);
  }

  function remove(id: string) {
    Alert.alert("Delete hazard?", "", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => persist(hazards.filter(h => h.id !== id)),
      },
    ]);
  }

  const visible = useMemo(
    () => hazards.filter(h => filters[h.severity]),
    [hazards, filters]
  );

  if (!region) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={region}
        showsUserLocation
        onLongPress={onLongPress}
      >
        {visible.map(h => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.latitude, longitude: h.longitude }}
            onPress={() => remove(h.id)}
          >
            <View style={[styles.marker, { borderColor: HAZARDS[h.type].color }]}>
              <Ionicons name={HAZARDS[h.type].icon} size={18} color="white" />
            </View>
          </Marker>
        ))}
      </MapView>

      <Pressable style={styles.info} onPress={() => setLegendOpen(true)}>
        <Ionicons name="information" size={18} color="white" />
      </Pressable>

      <Modal transparent visible={legendOpen}>
        <Pressable style={styles.overlay} onPress={() => setLegendOpen(false)} />
        <View style={styles.sheet}>
          {(Object.keys(filters) as Severity[]).map(s => (
            <View key={s} style={styles.row}>
              <Text style={{ color: "white" }}>{SEVERITY_HINT[s]}</Text>
              <Switch
                value={filters[s]}
                onValueChange={v => setFilters({ ...filters, [s]: v })}
              />
            </View>
          ))}
        </View>
      </Modal>

      <Modal transparent visible={pickerOpen}>
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)} />
        <View style={styles.sheet}>
          {!type &&
            Object.entries(HAZARDS).map(([k, v]) => (
              <Pressable key={k} onPress={() => setType(k as HazardType)}>
                <Text style={styles.item}>{v.label}</Text>
              </Pressable>
            ))}

          {type &&
            (["LOW", "MEDIUM", "HIGH"] as Severity[]).map(s => (
              <Pressable key={s} onPress={() => setSeverity(s)}>
                <Text style={styles.item}>{SEVERITY_HINT[s]}</Text>
              </Pressable>
            ))}

          {type && (
            <Pressable onPress={submit}>
              <Text style={styles.submit}>Submit</Text>
            </Pressable>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "#000",
    padding: 10,
    borderRadius: 20,
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#111",
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 6 },
  item: { color: "white", paddingVertical: 12, fontSize: 16 },
  submit: { color: "white", fontWeight: "700", paddingTop: 14 },
});
EOF
