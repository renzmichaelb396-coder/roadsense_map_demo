import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import MapView, { Marker, MapPressEvent, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { addHazard, loadHazards, Hazard } from "@/lib/hazards";

/* -------------------- CONFIG -------------------- */

const DEFAULT_REGION: Region = {
  latitude: 14.676,
  longitude: 121.0437,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const SEVERITIES = [
  { key: 3, label: "HIGH", color: "#ef4444" },
  { key: 2, label: "MED", color: "#f59e0b" },
  { key: 1, label: "LOW", color: "#10b981" },
] as const;

const HAZARD_TYPES = [
  { key: "pothole", label: "Pothole" },
  { key: "flood", label: "Flood" },
  { key: "crack", label: "Crack" },
  { key: "debris", label: "Debris" },
  { key: "construction", label: "Construction" },
] as const;

type HazardType = typeof HAZARD_TYPES[number]["key"];

function hazardColor(severity: number) {
  if (severity === 3) return "#ef4444";
  if (severity === 2) return "#f59e0b";
  return "#10b981";
}

/* -------------------- COMPONENT -------------------- */

export default function LGUMap() {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [pending, setPending] = useState<{ latitude: number; longitude: number } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [severityFilter, setSeverityFilter] = useState<Record<number, boolean>>({
    3: true,
    2: true,
    1: true,
  });

  const [typeFilter, setTypeFilter] = useState<Record<HazardType, boolean>>({
    pothole: true,
    flood: true,
    crack: true,
    debris: true,
    construction: true,
  });

  /* ---------- LOCATION ---------- */
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getLastKnownPositionAsync({});
          if (loc?.coords) {
            setRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            });
          }
        }
      } catch {}
      const existing = await loadHazards();
      setHazards(Array.isArray(existing) ? existing : []);
    })();
  }, []);

  /* ---------- EVENTS ---------- */
  function onLongPress(e: MapPressEvent) {
    setPending(e.nativeEvent.coordinate);
    setModalVisible(true);
  }

  async function submitHazard() {
    if (!pending) return;
    const h: Hazard = {
      id: `hz_${Date.now()}`,
      latitude: pending.latitude,
      longitude: pending.longitude,
      type: "pothole",
      severity: 3,
      createdAt: Date.now(),
    };
    await addHazard(h);
    setHazards((p) => [...p, h]);
    setModalVisible(false);
    setPending(null);
  }

  /* ---------- FILTERED ---------- */
  const visibleHazards = hazards.filter(
    (h) => severityFilter[h.severity] && typeFilter[h.type as HazardType]
  );

  /* ---------- RENDER ---------- */
  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={region}
        onLongPress={onLongPress}
      >
        {visibleHazards.map((h) => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.latitude, longitude: h.longitude }}
            pinColor={hazardColor(h.severity)}
          />
        ))}
      </MapView>

      {/* ---------- BOTTOM ACTION STRIP ---------- */}
      <View
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          backgroundColor: "rgba(15,15,15,0.95)",
          padding: 14,
          gap: 10,
        }}
      >
        {/* Severity */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {SEVERITIES.map((s) => (
            <Pressable
              key={s.key}
              onPress={() =>
                setSeverityFilter((p) => ({ ...p, [s.key]: !p[s.key] }))
              }
              style={{
                flex: 1,
                marginHorizontal: 4,
                padding: 10,
                borderRadius: 8,
                backgroundColor: severityFilter[s.key] ? s.color : "#222",
              }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Hazard Types */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {HAZARD_TYPES.map((t) => (
            <Pressable
              key={t.key}
              onPress={() =>
                setTypeFilter((p) => ({ ...p, [t.key]: !p[t.key] }))
              }
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 20,
                backgroundColor: typeFilter[t.key] ? "#2563eb" : "#222",
              }}
            >
              <Text style={{ color: "white", fontSize: 12 }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Report */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{
            marginTop: 6,
            backgroundColor: "#2563eb",
            padding: 14,
            borderRadius: 30,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
            + REPORT HAZARD
          </Text>
        </TouchableOpacity>
      </View>

      {/* Confirm Modal */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <Pressable
          onPress={() => setModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Pressable
            onPress={submitHazard}
            style={{
              backgroundColor: "#111",
              padding: 20,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "white" }}>Confirm Hazard</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
