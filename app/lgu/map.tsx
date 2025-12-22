import { View, Text, TouchableOpacity, Modal, Alert } from "react-native";
import MapView, { Marker, MapPressEvent, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { addHazard, loadHazards, Hazard } from "@/lib/hazards";

/* -------------------- CONFIG -------------------- */

const HAZARD_TYPES = [
  { key: "pothole", label: "Pothole", color: "#ef4444" },
  { key: "flood", label: "Flood", color: "#3b82f6" },
  { key: "crack", label: "Road Crack", color: "#f59e0b" },
  { key: "debris", label: "Debris", color: "#10b981" },
  { key: "construction", label: "Construction", color: "#8b5cf6" },
] as const;

type HazardType = typeof HAZARD_TYPES[number]["key"];
type LatLng = { latitude: number; longitude: number };

function generateHazardId(lat: number, lng: number) {
  return `hz_${Date.now()}_${lat.toFixed(5)}_${lng.toFixed(5)}`;
}

/* -------------------- COMPONENT -------------------- */

export default function LGUMap() {
  const [region, setRegion] = useState<Region | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [pending, setPending] = useState<LatLng | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [severity, setSeverity] = useState(3);
  const [type, setType] = useState<HazardType>("pothole");

  const [filters, setFilters] = useState<Record<HazardType, boolean>>({
    pothole: true,
    flood: true,
    crack: true,
    debris: true,
    construction: true,
  });

  /* ---------- LOAD LOCATION + DATA ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || !mounted) return;

      const loc = await Location.getCurrentPositionAsync({});
      if (!mounted) return;

      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      const existing = await loadHazards();
      setHazards(Array.isArray(existing) ? existing : []);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- MAP EVENTS ---------- */
  function onLongPress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPending({ latitude, longitude });
    setModalVisible(true);
  }

  async function submitHazard() {
    if (!pending) return;

    const h: Hazard = {
      id: generateHazardId(pending.latitude, pending.longitude),
      latitude: pending.latitude,
      longitude: pending.longitude,
      type,
      severity,
      createdAt: Date.now(),
    };

    await addHazard(h);
    setHazards((prev) => [...prev, h]);
    setPending(null);
    setModalVisible(false);
  }

  /* ---------- RENDER ---------- */
  if (!region) {
    return <Text style={{ padding: 20 }}>Getting location…</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        region={region}
        onRegionChangeComplete={setRegion}
        onLongPress={onLongPress}
      >
        {hazards
          .filter((h) => filters[h.type as HazardType])
          .map((h) => {
            const cfg = HAZARD_TYPES.find((t) => t.key === h.type);
            return (
              <Marker
                key={h.id}
                coordinate={{ latitude: h.latitude, longitude: h.longitude }}
                title={h.type}
                description={`Severity: ${h.severity}`}
                pinColor={cfg?.color}
              />
            );
          })}

        {pending && (
          <Marker coordinate={pending} title="New hazard" pinColor="#2563eb" />
        )}
      </MapView>

      {/* CTA */}
      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            "How to report",
            "Long-press the map, choose hazard type and severity, then confirm."
          )
        }
        style={{
          position: "absolute",
          bottom: 30,
          right: 20,
          backgroundColor: "#2563eb",
          padding: 16,
          borderRadius: 30,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>Report Hazard</Text>
      </TouchableOpacity>

      {/* MODAL (kept minimal for stability) */}
      <Modal transparent visible={modalVisible} animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={submitHazard}
            style={{
              backgroundColor: "#111",
              padding: 20,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "white" }}>Confirm Hazard</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
