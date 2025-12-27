import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import {
  fetchHazards,
  createHazard,
  resolveHazard,
  deleteHazard,
  Hazard,
} from "@/lib/hazards";

/* -------------------- LGU OPS CONFIG -------------------- */

const DEFAULT_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const SEVERITIES = [
  { key: 3, label: "HIGH", bg: "#ef4444" },
  { key: 2, label: "MED", bg: "#f59e0b" },
  { key: 1, label: "LOW", bg: "#10b981" },
] as const;

const HAZARD_TYPES = [
  { key: "pothole", label: "Pothole" },
  { key: "flood", label: "Flood" },
  { key: "crack", label: "Crack" },
  { key: "debris", label: "Debris" },
  { key: "construction", label: "Construction" },
] as const;

type HazardType = (typeof HAZARD_TYPES)[number]["key"];

function severityColor(sev: number) {
  if (sev === 3) return "#ef4444";
  if (sev === 2) return "#f59e0b";
  return "#10b981";
}

function safeStatus(h: any): "reported" | "resolved" {
  return h?.status === "resolved" ? "resolved" : "reported";
}

/* -------------------- COMPONENT -------------------- */

export default function LGUMap() {
  const mapRef = useRef<MapView>(null!);

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [userCoord, setUserCoord] =
    useState<{ latitude: number; longitude: number } | null>(null);

  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // Center-pin placement mode (LOCKED)
  const [placementMode, setPlacementMode] = useState(false);
  const [severity, setSeverity] = useState<1 | 2 | 3>(2);
  const [type, setType] = useState<HazardType>("pothole");

  const [showResolved, setShowResolved] = useState(true);

  async function safeReloadHazards() {
    try {
      const next = await fetchHazards();
      setHazards(Array.isArray(next) ? next : []);
    } catch {
      setHazards([]);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getLastKnownPositionAsync({});
          if (loc?.coords) {
            const r: Region = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.06,
              longitudeDelta: 0.06,
            };
            setUserCoord({ latitude: r.latitude, longitude: r.longitude });
            setRegion(r);
          }
        }
      } catch {}
      await safeReloadHazards();
    })();
  }, []);

  function enterPlacingMode() {
    setSelectedId(null);
    setPlacementMode(true);
  }

  async function confirmPlacement() {
    if (isMutating) return;
    try {
      setIsMutating(true);
      const { width, height } = Dimensions.get("window");
      const coord = await mapRef.current.coordinateForPoint({
        x: width / 2,
        y: height / 2,
      });
      await createHazard({
        latitude: coord.latitude,
        longitude: coord.longitude,
        severity,
        type,
      });
      await safeReloadHazards();
    } finally {
      setIsMutating(false);
      setPlacementMode(false);
    }
  }

  async function resolveSelected() {
    const h = hazards.find(x => String(x.id) === String(selectedId));
    if (!h || isMutating) return;
    setIsMutating(true);
    await resolveHazard(String(h.id));
    await safeReloadHazards();
    setIsMutating(false);
  }

  async function deleteSelected() {
    const h = hazards.find(x => String(x.id) === String(selectedId));
    if (!h || isMutating) return;
    setIsMutating(true);
    await deleteHazard(String(h.id));
    await safeReloadHazards();
    setIsMutating(false);
    setSelectedId(null);
  }

  function recenter() {
    if (!userCoord) return;
    const r: Region = {
      latitude: userCoord.latitude,
      longitude: userCoord.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    };
    setRegion(r);
    mapRef.current.animateToRegion(r, 350);
  }

  return (
    <>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        region={region}
        onLongPress={() => enterPlacingMode()}
      >
        {hazards.map((h) => {
          const resolved = safeStatus(h) === "resolved";
          return (
            <Marker
              key={String(h.id)}
              coordinate={{ latitude: h.latitude, longitude: h.longitude }}
              pinColor={resolved ? "#64748b" : severityColor(h.severity)}
              opacity={resolved ? 0.3 : 1}
              onPress={() => setSelectedId(String(h.id))}
            />
          );
        })}
      </MapView>

      <Pressable onPress={recenter} style={{ position: "absolute", right: 16, bottom: 160 }}>
        <Text style={{ color: "white", fontWeight: "900" }}>RECENTER</Text>
      </Pressable>

      {!placementMode && (
        <Pressable
          onPress={enterPlacingMode}
          style={{ position: "absolute", left: 16, right: 16, bottom: 40 }}
        >
          <Text style={{ color: "white", fontWeight: "900", textAlign: "center" }}>
            REPORT HAZARD
          </Text>
        </Pressable>
      )}

      {placementMode && (
        <Pressable
          onPress={confirmPlacement}
          style={{ position: "absolute", left: 16, right: 16, bottom: 40 }}
        >
          <Text style={{ color: "white", fontWeight: "900", textAlign: "center" }}>
            CONFIRM AT CENTER PIN
          </Text>
        </Pressable>
      )}
    </>
  );
}
