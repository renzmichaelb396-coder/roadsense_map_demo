import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Pressable, Platform } from "react-native";
import MapView, { Marker, MapPressEvent } from "react-native-maps";
import * as Location from "expo-location";

import {
  addHazard,
  deleteHazard,
  loadHazards,
  updateHazardStatus,
  Hazard,
} from "@/lib/hazards";

const DEFAULT_REGION = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SEVERITIES = [
  { key: 3, label: "HIGH", color: "#dc2626" },
  { key: 2, label: "MED", color: "#f59e0b" },
  { key: 1, label: "LOW", color: "#16a34a" },
] as const;

const HAZARD_TYPES = [
  { key: "pothole", label: "Pothole" },
  { key: "flood", label: "Flood" },
  { key: "crack", label: "Crack" },
  { key: "debris", label: "Debris" },
  { key: "construction", label: "Constr." },
] as const;

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
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
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
        transform: [{ translateX: -16 }, { translateY: -16 }],
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* outer ring */}
      <View
        style={{
          position: "absolute",
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 3,
          borderColor: "white",
          shadowColor: "#000",
          shadowOpacity: 0.55,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 10,
        }}
      />
      {/* inner ring (contrast) */}
      <View
        style={{
          position: "absolute",
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: "rgba(0,0,0,0.45)",
        }}
      />
      {/* center dot */}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: "white",
          borderWidth: 2,
          borderColor: "rgba(0,0,0,0.45)",
        }}
      />
    </View>
  );
}

export default function LGUMap() {
  const mapRef = useRef<MapView
    onCameraIdle={(e) => {
      setCameraCenter(e.nativeEvent.center);
    }}
  >(null);

  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [selected, setSelected] = useState<Hazard | null>(null);

  const [placementMode, setPlacementMode] = useState(false);
  const [cameraCenter, setCameraCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  const [severity, setSeverity] = useState<number>(2);
  const [type, setType] = useState<string>("pothole");

  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);

  const selectedInfo = useMemo(() => {
    if (!selected) return null;
    return {
      title: `${selected.type.toUpperCase()} • ${selected.severity === 3 ? "HIGH" : selected.severity === 2 ? "MED" : "LOW"}`,
      status: selected.status,
      coord: { latitude: selected.latitude, longitude: selected.longitude },
    };
  }, [selected]);

  useEffect(() => {
    let subPos: Location.LocationSubscription | null = null;
    let subHead: Location.LocationSubscription | null = null;

    (async () => {
      // load hazards
      setHazards(await loadHazards());

      // request location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      // seed one location to enable recenter immediately
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserCoord({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch {}

      // watch position
      try {
        subPos = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 1000, distanceInterval: 1 },
          (loc) => {
            setUserCoord({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            const h = (loc.coords as any)?.heading;
            if (typeof h === "number" && !Number.isNaN(h)) setHeading(h);
          }
        );
      } catch {}

      // watch heading (some devices support this better than coords.heading)
      try {
        subHead = await Location.watchHeadingAsync((h) => {
          if (typeof h?.trueHeading === "number" && h.trueHeading >= 0) setHeading(h.trueHeading);
        });
      } catch {}
    })();

    return () => {
      subPos?.remove?.();
      subHead?.remove?.();
    };
  }, []);

  async function refreshHazards() {
    setHazards(await loadHazards());
  }

  async function confirmPlacement() {
  if (!placementMode) return;

  const cam = await mapRef.current?.getCamera();
  const center = cameraCenter;

  if (!center) {
    console.warn("[LIPAT] No center available");
    return;
  }

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

  // optimistic update (no reload jitter)
  setHazards((prev) => [h, ...prev]);

  setPlacementMode(false);
  setSelected(null);
}

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

    // Optimistic UI update (no reload jitter)
    setHazards((p) => [h, ...p]);

    setPlacementMode(false);
    setSelected(null);
  };

    await addHazard(h);

    // optimistic UI (fast + avoids extra jitter)
    setHazards((p) => [h, ...p]);
    setPlacementMode(false);
    setSelected(null);
  }

  async function resolveHazard() {
    if (!selected) return;
    const id = selected.id;

    setSelected(null);
    await updateHazardStatus(id, "resolved");
    await refreshHazards();
  }

  async function removeHazard() {
    if (!selected) return;
    const id = selected.id;

    // CRASH MITIGATION (Android real devices):
    // 1) clear selected (releases native marker ref)
    // 2) delay removal slightly
    setSelected(null);

    setTimeout(async () => {
      await deleteHazard(id);
      setHazards((p) => p.filter((h) => h.id !== id));
    }, 140);
  }

  function recenter() {
    if (!userCoord) return;
    mapRef.current?.animateToRegion(
      {
        latitude: userCoord.latitude,
        longitude: userCoord.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      450
    );
  }

  // Optional: if user taps while placing, snap camera to that point (fast placement)
  function onMapPress(e: MapPressEvent) {
    if (!placementMode) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 },
      220
    );
  }

  const headingText =
    heading == null ? "HDG —" : `HDG ${Math.round(((heading % 360) + 360) % 360)}°`;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={DEFAULT_REGION}
        onPress={onMapPress}
        onRegionChangeComplete={(r) => setCameraCenter({ latitude: r.latitude, longitude: r.longitude })}
        showsUserLocation={true}
        showsMyLocationButton={Platform.OS === "android"}
        showsCompass={true}
        toolbarEnabled={false}
        rotateEnabled={true}
        pitchEnabled={true}
      >
        {placementMode && cameraCenter ? (
          <Marker
            key="__center_preview__"
            coordinate={cameraCenter}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: "rgba(59,130,246,0.95)",
                borderWidth: 2,
                borderColor: "white",
              }}
            />
          </Marker>
        ) : null}

        {hazards.map((h) => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.latitude, longitude: h.longitude }}
            onPress={() => setSelected(h)}
            tracksViewChanges={false}
          >
            <HazardDot h={h} />
          </Marker>
        ))}
      </MapView>

      {/* High-contrast center pin */}
      <Crosshair visible={placementMode} />

      {/* Top-right controls */}
      <View style={{ position: "absolute", top: 14, right: 12, gap: 10 }}>
        <View
          style={{
            backgroundColor: "rgba(15,15,15,0.80)",
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 12,
            alignSelf: "flex-end",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>{headingText}</Text>
        </View>

        <Pressable
          onPress={recenter}
          style={{
            backgroundColor: "rgba(15,15,15,0.86)",
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 14,
            alignSelf: "flex-end",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>
            ⦿
          </Text>
        </Pressable>
      </View>

      {/* Selected hazard actions (LGU ops) */}
      {selectedInfo ? (
        <View
          style={{
            position: "absolute",
            top: 14,
            left: 12,
            right: 92,
            backgroundColor: "rgba(15,15,15,0.86)",
            padding: 12,
            borderRadius: 14,
            gap: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>{selectedInfo.title}</Text>
          <Text style={{ color: "#ddd", fontSize: 12 }}>
            {selectedInfo.status === "resolved" ? "Resolved (dimmed)" : "Active"} • Tap marker to select
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={resolveHazard}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: "#0f766e",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>MARK RESOLVED</Text>
            </Pressable>

            <Pressable
              onPress={removeHazard}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: "#991b1b",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>DELETE</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Bottom LGU capture panel */}
      <View
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          backgroundColor: "rgba(15,15,15,0.92)",
          padding: 14,
          gap: 10,
        }}
      >
        {/* severity row */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {SEVERITIES.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => setSeverity(s.key)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: severity === s.key ? s.color : "#222",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* type row */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {HAZARD_TYPES.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setType(t.key)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: type === t.key ? "#2563eb" : "#222",
              }}
            >
              <Text style={{ color: "white", fontWeight: "800", fontSize: 12 }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {!placementMode ? (
          <TouchableOpacity
            onPress={() => {
              setSelected(null);
              setPlacementMode(true);
            }}
            style={{
              backgroundColor: "#2563eb",
              padding: 14,
              borderRadius: 30,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
              PLACE HAZARD (CENTER PIN)
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
    </View>
  );
}
