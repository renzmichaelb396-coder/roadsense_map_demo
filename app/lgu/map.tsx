import { View, Text, TouchableOpacity, Modal, Alert, ScrollView } from "react-native";
import MapView, { Marker, MapPressEvent } from "react-native-maps";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
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
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
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

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      const existing = await loadHazards();
      setHazards(Array.isArray(existing) ? existing : []);
    })();
  }, []);

  const initialRegion = useMemo(() => {
    if (!location) return null;
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [location]);

  function onLongPress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPending({ latitude, longitude });
    setModalVisible(true);
  }

  async function submitHazard() {
    if (!pending) {
      Alert.alert("Pick a location", "Long-press the map to place a hazard.");
      return;
    }

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

  if (!location || !initialRegion) {
    return <Text style={{ padding: 20 }}>Getting location…</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={initialRegion}
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
          <Marker
            key="pending"
            coordinate={pending}
            title="New hazard"
            pinColor="#2563eb"
          />
        )}
      </MapView>

      {/* LEGEND */}
      <View
        style={{
          position: "absolute",
          top: 40,
          left: 10,
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: 10,
          borderRadius: 10,
        }}
      >
        {HAZARD_TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() =>
              setFilters((f) => ({ ...f, [t.key]: !f[t.key] }))
            }
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: t.color,
                marginRight: 8,
                opacity: filters[t.key] ? 1 : 0.3,
              }}
            />
            <Text style={{ color: "white", opacity: filters[t.key] ? 1 : 0.4 }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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

      {/* MODAL */}
      <Modal transparent visible={modalVisible} animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#111",
              padding: 20,
              borderRadius: 12,
              width: "85%",
            }}
          >
            <Text style={{ color: "white", marginBottom: 10 }}>Hazard Type</Text>

            <ScrollView horizontal>
              {HAZARD_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setType(t.key)}
                  style={{
                    padding: 10,
                    backgroundColor: type === t.key ? t.color : "#333",
                    borderRadius: 8,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: "white" }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={{ color: "white", marginVertical: 10 }}>
              Severity (1–5)
            </Text>

            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSeverity(s)}
                style={{
                  padding: 8,
                  backgroundColor: severity === s ? "#2563eb" : "#333",
                  marginBottom: 6,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: "white" }}>Level {s}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={submitHazard}
              style={{
                marginTop: 12,
                backgroundColor: "#2563eb",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Confirm Report
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setPending(null);
              }}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: "#aaa", textAlign: "center" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
