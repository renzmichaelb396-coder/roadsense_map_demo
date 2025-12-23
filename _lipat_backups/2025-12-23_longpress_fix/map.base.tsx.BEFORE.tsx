import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Pressable } from "react-native";
import MapView, { Marker, MapPressEvent } from "react-native-maps";
import { addHazard, deleteHazard, loadHazards, updateHazardStatus, Hazard } from "../../lib/hazards";

const DEFAULT_REGION = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function HazardDot({ h }: { h: Hazard }) {
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
    loadHazards().then(setHazards);
  }, []);

  function onMapPress(e: MapPressEvent) {
    if (!placementMode) return;
    setPendingCoord(e.nativeEvent.coordinate);
  }

  async function confirmPlacement() {
    if (!pendingCoord) return;

    const h: Hazard = {
      id: uuid(),
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

    setSelected(null); // CRITICAL: prevent Android native crash

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
        onPress={onMapPress}
        showsUserLocation
        showsCompass
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

        {pendingCoord && (
          <Marker coordinate={pendingCoord} pinColor="#00ff00" />
        )}
      </MapView>

      <View
        style={{
          position: "absolute",
          bottom: 40,
          left: 16,
          right: 16,
          backgroundColor: "#111",
          padding: 12,
          borderRadius: 12,
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
            <Text style={{ color: "white", fontWeight: "900" }}>
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
            <Text style={{ color: "white", fontWeight: "900" }}>
              CONFIRM LOCATION
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
