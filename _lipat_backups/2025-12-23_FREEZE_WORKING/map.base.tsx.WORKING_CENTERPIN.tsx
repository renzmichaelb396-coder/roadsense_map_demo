import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, TouchableOpacity, Platform } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";

import { addHazard, deleteHazard, loadHazards, updateHazardStatus, Hazard } from "@/lib/hazards";

/* ---------------- CONFIG ---------------- */

const DEFAULT_REGION = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

const SEVERITIES = [
  { key: 3, label: "HIGH", color: "#dc2626" },
  { key: 2, label: "MED", color: "#f59e0b" },
  { key: 1, label: "LOW", color: "#16a34a" },
];

const HAZARD_TYPES = [
  { key: "pothole", label: "Pothole" },
  { key: "flood", label: "Flood" },
  { key: "crack", label: "Crack" },
  { key: "debris", label: "Debris" },
  { key: "construction", label: "Constr." },
];

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* ---------------- UI ---------------- */

function HazardDot({ h }: { h: Hazard }) {
  const color =
    h.status === "resolved"
      ? "#666"
      : h.severity === 3
      ? "#dc2626"
      : h.severity === 2
      ? "#f59e0b"
      : "#16a34a";

  return (
    <View
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: "white",
        elevation: 6,
      }}
    />
  );
}

function Crosshair({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: [{ translateX: -18 }, { translateY: -18 }],
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 3,
          borderColor: "white",
          backgroundColor: "rgba(0,0,0,0.15)",
          elevation: 12,
        }}
      />
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: "white",
          borderWidth: 2,
          borderColor: "black",
        }}
      />
    </View>
  );
}

/* ---------------- MAP ---------------- */

export default function LGUMap() {
  const mapRef = useRef<MapView>(null);

  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [selected, setSelected] = useState<Hazard | null>(null);
  const [placementMode, setPlacementMode] = useState(false);

  const [severity, setSeverity] = useState(2);
  const [type, setType] = useState("pothole");

  const [cameraCenter, setCameraCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    (async () => {
      setHazards(await loadHazards());

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setUserCoord({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      Location.watchHeadingAsync(h => {
        if (h.trueHeading >= 0) setHeading(h.trueHeading);
      });
    })();
  }, []);

  async function confirmPlacement() {
    const cam = await mapRef.current?.getCamera();
    const center = cam?.center || cameraCenter;
    if (!center) return;

    const h: Hazard = {
      id: generateUUID(),
      latitude: center.latitude,
      longitude: center.longitude,
      type,
      severity,
      status: "reported",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await addHazard(h);
    setHazards(p => [h, ...p]);
    setPlacementMode(false);
  }

  async function removeHazard() {
    if (!selected) return;
    const id = selected.id;
    setSelected(null);

    setTimeout(async () => {
      await deleteHazard(id);
      setHazards(p => p.filter(h => h.id !== id));
    }, 120);
  }

  async function resolveHazard() {
    if (!selected) return;
    await updateHazardStatus(selected.id, "resolved");
    setHazards(await loadHazards());
    setSelected(null);
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsCompass
        showsMyLocationButton={Platform.OS === "android"}
        onRegionChangeComplete={r =>
          setCameraCenter({ latitude: r.latitude, longitude: r.longitude })
        }
      >
        {hazards.map(h => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.latitude, longitude: h.longitude }}
            onPress={() => setSelected(h)}
          >
            <HazardDot h={h} />
          </Marker>
        ))}
      </MapView>

      <Crosshair visible={placementMode} />

      {/* Top-right */}
      <View style={{ position: "absolute", top: 14, right: 14 }}>
        <Text style={{ color: "white", backgroundColor: "#000a", padding: 8, borderRadius: 10 }}>
          HDG {heading ? Math.round(heading) + "°" : "—"}
        </Text>
      </View>

      {/* Bottom panel */}
      <View style={{ position: "absolute", bottom: 60, left: 0, right: 0, padding: 14, backgroundColor: "#000c" }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {SEVERITIES.map(s => (
            <Pressable
              key={s.key}
              onPress={() => setSeverity(s.key)}
              style={{ flex: 1, padding: 12, backgroundColor: severity === s.key ? s.color : "#222", borderRadius: 10 }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {HAZARD_TYPES.map(t => (
            <Pressable
              key={t.key}
              onPress={() => setType(t.key)}
              style={{ padding: 10, backgroundColor: type === t.key ? "#2563eb" : "#222", borderRadius: 999 }}
            >
              <Text style={{ color: "white" }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {!placementMode ? (
          <TouchableOpacity
            onPress={() => setPlacementMode(true)}
            style={{ marginTop: 12, backgroundColor: "#2563eb", padding: 14, borderRadius: 30 }}
          >
            <Text style={{ color: "white", fontWeight: "900", textAlign: "center" }}>
              PLACE HAZARD (CENTER PIN)
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={confirmPlacement}
            style={{ marginTop: 12, backgroundColor: "#16a34a", padding: 14, borderRadius: 30 }}
          >
            <Text style={{ color: "white", fontWeight: "900", textAlign: "center" }}>
              CONFIRM LOCATION
            </Text>
          </TouchableOpacity>
        )}

        {selected && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Pressable onPress={resolveHazard} style={{ flex: 1, backgroundColor: "#0f766e", padding: 12, borderRadius: 12 }}>
              <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>RESOLVED</Text>
            </Pressable>
            <Pressable onPress={removeHazard} style={{ backgroundColor: "#991b1b", padding: 12, borderRadius: 12 }}>
              <Text style={{ color: "white", fontWeight: "900" }}>DELETE</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
