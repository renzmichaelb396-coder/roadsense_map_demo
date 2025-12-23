import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Pressable } from "react-native";
import MapView, { Marker, MapPressEvent } from "react-native-maps";

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
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function HazardMarker({ h }: { h: Hazard }) {
  const color =
    h.status === "resolved"
      ? "#555"
      : h.severity === 3
      ? "#dc2626"
      : h.severity === 2
      ? "#f59e0b"
      : "#16a34a";

  return (
    <View
      style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: "white",
      }}
    />
  );
}

export default function LGUMap() {
  const mapRef = useRef<MapView>(null);

  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [selected, setSelected] = useState<Hazard | null>(null);

  const [placementMode, setPlacementMode] = useState(false);
  const [pendingCoord, setPendingCoord] =
    useState<{ latitude: number; longitude: number } | null>(null);

  const [severity, setSeverity] = useState(2);
  const [type, setType] = useState("pothole");

  useEffect(() => {
    loadHazards().then(setHazards).catch(() => {});
  }, []);

  async function confirmPlacement() {
    if (!placementMode || !pendingCoord) return;

    const h: Hazard = {
      id: generateUUID(),
      latitude: pendingCoord.latitude,
      longitude: pendingCoord.longitude,
      type,
      severity,
      status: "reported",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await addHazard(h);
    setHazards(await loadHazards());
    setPendingCoord(null);
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
    const id = selected.id;

    setSelected(null);

    setTimeout(async () => {
      await deleteHazard(id);
      setHazards(await loadHazards());
    }, 120);
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={DEFAULT_REGION}
        onLongPress={(e: MapPressEvent) => {
          if (!placementMode) return;
          setPendingCoord(e.nativeEvent.coordinate);
        }}
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

        {pendingCoord && (
          <Marker coordinate={pendingCoord} pinColor="#22c55e" />
        )}
      </MapView>

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
        {!placementMode ? (
          <TouchableOpacity
            onPress={() => {
              setPendingCoord(null);
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
    </View>
  );
}
