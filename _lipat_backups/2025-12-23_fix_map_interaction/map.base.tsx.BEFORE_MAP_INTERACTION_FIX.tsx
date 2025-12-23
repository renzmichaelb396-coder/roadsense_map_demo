
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import MapView, { Marker, Region, Camera } from "react-native-maps";
import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import {
  addHazard,
  deleteHazard,
  loadHazards,
  updateHazardStatus,
  Hazard,
} from "@/lib/hazards";

function generateUUID() {
  return uuidv4();
}

/* ================= CONFIG ================= */



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
  { key: "pothole", label: "Pothole", glyph: "P" },
  { key: "flood", label: "Flood", glyph: "F" },
  { key: "crack", label: "Crack", glyph: "C" },
  { key: "debris", label: "Debris", glyph: "D" },
  { key: "construction", label: "Constr.", glyph: "⚠" },
] as const;

type HazardType = typeof HAZARD_TYPES[number]["key"];

function sevColor(sev: number) {
  return sev === 3 ? "#ef4444" : sev === 2 ? "#f59e0b" : "#10b981";
}

/* ================= UI ================= */

function FixedCrosshair({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        marginLeft: -18,
        marginTop: -18,
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ position: "absolute", width: 2, height: 36, backgroundColor: "#2563eb" }} />
      <View style={{ position: "absolute", height: 2, width: 36, backgroundColor: "#2563eb" }} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563eb" }} />
    </View>
  );
}

function HazardMarker({ h }: { h: Hazard }) {
  const type = HAZARD_TYPES.find(t => t.key === h.type);
  const resolved = h.status === "resolved";

  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: resolved ? "#222" : "#111",
        borderWidth: 3,
        borderColor: resolved ? "#777" : sevColor(h.severity),
        opacity: resolved ? 0.6 : 1,
      }}
    >
      <Text style={{ color: "white", fontWeight: "900" }}>
        {resolved ? "✓" : type?.glyph ?? "•"}
      </Text>
    </View>
  );
}

/* ================= COMPONENT ================= */

export default function LGUMap() {
  const mapRef = useRef<MapView>(null);
  const [cameraCenter, setCameraCenter] = useState({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });

  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [placementMode, setPlacementMode] = useState(false);
  const [severity, setSeverity] = useState(3);
  const [type, setType] = useState<HazardType>("pothole");
  const [selected, setSelected] = useState<Hazard | null>(null);

  /* ---------- INIT ---------- */
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getLastKnownPositionAsync({});
          if (loc?.coords) {
            mapRef.current?.animateToRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            });
            setCameraCenter({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      } catch {}
      setHazards(await loadHazards());
    })();
  }, []);

  /* ---------- CAMERA ---------- */
  function onCameraIdle(cam: Camera) {
    setCameraCenter({
      latitude: cam.center.latitude,
      longitude: cam.center.longitude,
    });
  }

  /* ---------- ACTIONS ---------- */
  async function confirmPlacement() {
  if (!placementMode) return;

    const h: Hazard = {
      id: generateUUID(),
      latitude: cameraCenter.latitude,
      longitude: cameraCenter.longitude,
      type,
      severity,
      status: "reported",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await addHazard(h);
    setHazards(await loadHazards());
    setPlacementMode(false);
  }

  async function resolveHazard() {
    if (!selected) return;
    await updateHazardStatus(selected.id, "resolved");
    setHazards(await loadHazards());
    setSelected(null);
  }

  async function removeHazard() {
    if (!selected) return;
    await deleteHazard(selected.id);
    setHazards(await loadHazards());
    setSelected(null);
  }

  /* ================= RENDER ================= */

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={DEFAULT_REGION}
        onCameraIdle={onCameraIdle}
      >
        {hazards.map(h => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.latitude, longitude: h.longitude }}
            onPress={() => setSelected(h)}
            >
            <HazardMarker h={h} />
          </Marker>
        ))}
      </MapView>

      <FixedCrosshair visible={placementMode} />

      {/* BOTTOM BAR */}
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
        <View style={{ flexDirection: "row", gap: 8 }}>
          {SEVERITIES.map(s => (
            <Pressable
              key={s.key}
              onPress={() => setSeverity(s.key)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                backgroundColor: severity === s.key ? s.color : "#222",
              }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {HAZARD_TYPES.map(t => (
            <Pressable
              key={t.key}
              onPress={() => setType(t.key)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 20,
                backgroundColor: type === t.key ? "#2563eb" : "#222",
              }}
            >
              <Text style={{ color: "white", fontSize: 12 }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {!placementMode ? (
          <TouchableOpacity
            onPress={() => setPlacementMode(true)}
            style={{
              backgroundColor: "#2563eb",
              padding: 14,
              borderRadius: 30,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
              PLACE HAZARD
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={confirmPlacement}
            style={{
              backgroundColor: "#16a34a",
              padding: 14,
              borderRadius: 30,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
              CONFIRM LOCATION
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ACTION SHEET */}
      <Modal transparent visible={!!selected} animationType="fade">
        <Pressable
          onPress={() => setSelected(null)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Pressable
            style={{
              backgroundColor: "#111",
              padding: 20,
              borderRadius: 12,
              width: 280,
              gap: 14,
            }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
              Hazard Actions
            </Text>

            <TouchableOpacity onPress={resolveHazard}>
              <Text style={{ color: "#22c55e", fontWeight: "900", fontSize: 15 }}>
                Mark as Resolved
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={removeHazard}>
              <Text style={{ color: "#ef4444", fontWeight: "900", fontSize: 15 }}>
                Delete Hazard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={{ color: "#aaa", fontWeight: "700" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
