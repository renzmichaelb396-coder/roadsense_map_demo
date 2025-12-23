import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  Platform,
  Dimensions,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";

import {
  addHazard,
  deleteHazard,
  loadHazards,
  updateHazardStatus,
  Hazard,
} from "@/lib/hazards";

import HazardDetailCard from "@/components/HazardDetailCard";

/* ---------------- CONFIG ---------------- */

const DEFAULT_REGION = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

const SEVERITIES = [
  { key: 3, label: "HIGH", color: "#dc2626" },
  { key: 2, label: "MEDIUM", color: "#f59e0b" },
  { key: 1, label: "LOW", color: "#16a34a" },
] as const;

const HAZARD_TYPES = [
  { key: "pothole", label: "Pothole" },
  { key: "flood", label: "Flood" },
  { key: "crack", label: "Crack" },
  { key: "debris", label: "Debris" },
  { key: "construction", label: "Construction" },
] as const;

function typeLabel(type: string) {
  return HAZARD_TYPES.find(t => t.key === type)?.label ?? "Unknown";
}

function severityLabel(n: number): "LOW" | "MEDIUM" | "HIGH" {
  if (n === 3) return "HIGH";
  if (n === 2) return "MEDIUM";
  return "LOW";
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

/* ---------------- UI ---------------- */

function HazardDot({ h }: { h: Hazard }) {
  const isResolved = h.status === "resolved";

  const baseColor =
    h.severity === 3 ? "#dc2626" :
    h.severity === 2 ? "#f59e0b" :
    "#16a34a";

  const color = isResolved ? "#6b7280" : baseColor;

  const label =
    isResolved ? "✓" :
    h.type === "pothole" ? "P" :
    h.type === "flood" ? "F" :
    h.type === "crack" ? "C" :
    h.type === "construction" ? "X" :
    "D";

  const size = isResolved ? 24 : 28;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#000",
        opacity: isResolved ? 0.65 : 1,
      }}
    >
      <Text style={{ color: "white", fontWeight: "900", fontSize: isResolved ? 12 : 14 }}>
        {label}
      </Text>
    </View>
  );
}

function Crosshair({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <>
      {/* Label */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: [{ translateX: -40 }, { translateY: -54 }],
          backgroundColor: "#000c",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>
          Pin location
        </Text>
      </View>

      {/* Crosshair */}
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
    </>
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

  const [heading, setHeading] = useState<number | null>(null);
  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  function enterPlacingMode() {
    setSelected(null);
    setPlacementMode(true);
  }

  function cancelPlacement() {
    setPlacementMode(false);
  }

  async function confirmPlacement() {
    if (!mapRef.current) return;

    const { width, height } = Dimensions.get("window");
    const coord = await mapRef.current.coordinateForPoint({
      x: width / 2,
      y: height / 2,
    });

    await addHazard({
      id: generateUUID(),
      latitude: coord.latitude,
      longitude: coord.longitude,
      type,
      severity,
      status: "reported",
      createdAt: Date.now(),
    });

    setHazards(await loadHazards());
    setPlacementMode(false);
  }

  async function removeHazard() {
    if (!selected) return;
    const id = selected.id;
    setSelected(null);
    await deleteHazard(id);
    setHazards(p => p.filter(h => h.id !== id));
  }

  async function resolveHazard() {
    if (!selected) return;
    await updateHazardStatus(selected.id, "resolved");
    setHazards(await loadHazards());
    setSelected(null);
  }

  function recenterMap() {
    if (!mapRef.current || !userCoord) return;
    mapRef.current.animateCamera(
      { center: userCoord, zoom: 17, heading: heading ?? 0 },
      { duration: 400 }
    );
  }

  useEffect(() => {
    let headingSub: Location.LocationSubscription | null = null;

    (async () => {
      setHazards(await loadHazards());

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      if (loc?.coords) {
        setUserCoord({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }

      headingSub = await Location.watchHeadingAsync(h => {
        if (h.trueHeading >= 0) setHeading(h.trueHeading);
      });
    })();

    return () => {
      try { headingSub?.remove?.(); } catch {}
    };
  }, []);

  const dimWhenIdle = !placementMode ? { opacity: 0.6 } : null;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsCompass
        showsMyLocationButton={Platform.OS === "android"}
        onLongPress={enterPlacingMode}
      >
        {hazards.map(h => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.latitude, longitude: h.longitude }}
            onPress={() => {
              if (placementMode) return;
              setSelected(h);
            }}
          >
            <HazardDot h={h} />
          </Marker>
        ))}
      </MapView>

      {/* Heading */}
      <View style={{ position: "absolute", top: 14, right: 14 }}>
        <Text style={{ color: "white", backgroundColor: "#000a", padding: 8, borderRadius: 10 }}>
          HDG {heading ? Math.round(heading) + "°" : "—"}
        </Text>
      </View>

      {/* Recenter */}
      <TouchableOpacity
        onPress={recenterMap}
        style={{
          position: "absolute",
          right: 16,
          bottom: 320,
          backgroundColor: "#2563eb",
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: 30,
        }}
      >
        <Text style={{ color: "white", fontWeight: "900" }}>RECENTER</Text>
      </TouchableOpacity>

      {selected && (
        <HazardDetailCard
          hazard={selected}
          typeLabel={typeLabel(selected.type)}
          severityLabel={severityLabel(selected.severity)}
          onClose={() => setSelected(null)}
        />
      )}

      <Crosshair visible={placementMode} />

      {/* Bottom panel */}
      <View style={{ position: "absolute", bottom: 60, left: 0, right: 0, padding: 14, backgroundColor: "#000c", gap: 8 }}>
        <View style={[{ flexDirection: "row", gap: 8 }, dimWhenIdle]}>
          {SEVERITIES.map(s => (
            <Pressable
              key={s.key}
              onPress={() => setSeverity(s.key)}
              style={{ flex: 1, padding: 12, backgroundColor: severity === 'HIGH' ? '#e53935' : severity === 'MEDIUM' ? '#fb8c00' : severity === 'LOW' ? '#43a047' : '#222', borderRadius: 10 }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: 8 }, dimWhenIdle]}>
          {HAZARD_TYPES.map(t => (
            <Pressable
              key={t.key}
              onPress={() => setType(t.key)}
              style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: type === t.key ? "#2563eb" : "#222", borderRadius: 999 }}
            >
              <Text style={{ color: "white" }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {!placementMode ? (
          <TouchableOpacity onPress={enterPlacingMode} style={{ marginTop: 6, backgroundColor: "#2563eb", padding: 14, borderRadius: 30 }}>
            <Text style={{ color: "white", fontWeight: "900", textAlign: "center" }}>PLACE HAZARD</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
            <TouchableOpacity onPress={confirmPlacement} style={{ flex: 1, backgroundColor: "#16a34a", padding: 14, borderRadius: 30 }}>
              <Text style={{ color: "white", fontWeight: "900", textAlign: "center" }}>CONFIRM LOCATION</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelPlacement} style={{ backgroundColor: "#222", padding: 14, borderRadius: 30 }}>
              <Text style={{ color: "white", fontWeight: "900" }}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        )}

        {selected && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
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
