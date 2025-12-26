import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Dimensions, StyleSheet } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { addHazard, loadHazards, deleteHazard, updateHazardStatus, Hazard } from "@/lib/hazards";

const DEFAULT_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const SEVERITY = {
  3: { label: "HIGH", color: "#dc2626" },
  2: { label: "MED", color: "#f59e0b" },
  1: { label: "LOW", color: "#16a34a" },
} as const;

const TYPE_LABEL: Record<string, string> = {
  pothole: "P",
  flood: "F",
  crack: "C",
  debris: "D",
  construction: "X",
};

function LGUMarker({ type, severity, status }: { type: string; severity: number; status: string }) {
  const active = status !== "resolved";
  const color = active ? SEVERITY[severity as 1 | 2 | 3]?.color ?? "#2563eb" : "#9ca3af";
  return (
    <View
      style={[
        styles.marker,
        {
          backgroundColor: color,
          opacity: active ? 1 : 0.55,
          transform: [{ scale: active ? 1 : 0.85 }],
          borderStyle: active ? "solid" : "dashed",
        },
      ]}
    >
      <Text style={styles.markerText}>{TYPE_LABEL[type] ?? "?"}</Text>
    </View>
  );
}

export default function LGUMap() {
  const mapRef = useRef<MapView | null>(null);

  const [region, setRegion] = useState(DEFAULT_REGION);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [selected, setSelected] = useState<Hazard | null>(null);

  const [placing, setPlacing] = useState(false);
  const [severity, setSeverity] = useState<1 | 2 | 3>(3);
  const [type, setType] = useState("pothole");
  const [showResolved, setShowResolved] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const loc = await Location.getLastKnownPositionAsync({});
        if (loc?.coords) {
          setRegion({
            ...DEFAULT_REGION,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch {}

      try {
        const next = await loadHazards();
        setHazards(Array.isArray(next) ? next : []);
      } catch {
        setHazards([]);
      }
    })();
  }, []);

  const visible = useMemo(
    () => hazards.filter((h) => (showResolved ? true : h.status !== "resolved")),
    [hazards, showResolved]
  );

  function recenter() {
    mapRef.current?.animateToRegion(region, 400);
  }

  async function refresh() {
    const next = await loadHazards();
    setHazards(Array.isArray(next) ? next : []);
  }

  async function confirmPlacement() {
    if (!mapRef.current) return;
    try {
      const { width, height } = Dimensions.get("window");
      const coord = await mapRef.current.coordinateForPoint({ x: width / 2, y: height / 2 });

      const id =
        (global as any)?.crypto?.randomUUID?.() ??
        `hz_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      await addHazard({
        id,
        latitude: coord.latitude,
        longitude: coord.longitude,
        type,
        severity,
        status: "active",
        createdAt: Date.now(),
      });

      await refresh();
    } finally {
      setPlacing(false);
    }
  }

  async function resolveSelected() {
    if (!selected) return;
    await updateHazardStatus(selected.id, "resolved");
    setSelected(null);
    await refresh();
  }

  async function deleteSelected() {
    if (!selected) return;
    await deleteHazard(selected.id);
    setSelected(null);
    await refresh();
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LGU HAZARD OPS</Text>
        <Pressable onPress={() => setShowResolved((v) => !v)}>
          <Text style={styles.toggle}>Resolved: {showResolved ? "ON" : "OFF"}</Text>
        </Pressable>
      </View>

      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={region}
        onLongPress={() => {
          setSelected(null);
          setPlacing(true);
        }}
      >
        {visible.map((h) => (
          <Marker
            key={`${h.id}-${h.status}`}
            coordinate={{ latitude: h.latitude, longitude: h.longitude }}
            onPress={() => setSelected(h)}
          >
            <LGUMarker type={(h as any).type} severity={(h as any).severity} status={(h as any).status ?? "active"} />
          </Marker>
        ))}
      </MapView>

      <Pressable style={styles.recenter} onPress={recenter}>
        <Text style={styles.recenterText}>◎ RECENTER</Text>
      </Pressable>

      {placing && (
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Report Hazard (LGU)</Text>

          <View style={styles.row}>
            {[3, 2, 1].map((s) => (
              <Pressable
                key={s}
                onPress={() => setSeverity(s as 1 | 2 | 3)}
                style={[styles.chip, severity === s && { backgroundColor: SEVERITY[s as 1 | 2 | 3].color }]}
              >
                <Text style={styles.chipText}>{SEVERITY[s as 1 | 2 | 3].label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            {Object.keys(TYPE_LABEL).map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[styles.chip, type === t && { backgroundColor: "#2563eb" }]}
              >
                <Text style={styles.chipText}>{t.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <Pressable style={styles.cancel} onPress={() => setPlacing(false)}>
              <Text style={{ color: "white", fontWeight: "800" }}>CANCEL</Text>
            </Pressable>
            <Pressable style={styles.confirm} onPress={confirmPlacement}>
              <Text style={{ color: "white", fontWeight: "900" }}>CONFIRM</Text>
            </Pressable>
          </View>
        </View>
      )}

      {selected && (
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>
            {(selected as any).type?.toUpperCase?.() ?? "HAZARD"} • {(selected as any).status?.toUpperCase?.() ?? "ACTIVE"}
          </Text>

          <View style={styles.row}>
            <Pressable style={styles.cancel} onPress={() => setSelected(null)}>
              <Text style={{ color: "white", fontWeight: "800" }}>CLOSE</Text>
            </Pressable>

            {(selected as any).status !== "resolved" && (
              <Pressable style={styles.confirm} onPress={resolveSelected}>
                <Text style={{ color: "white", fontWeight: "900" }}>RESOLVE</Text>
              </Pressable>
            )}

            <Pressable style={styles.delete} onPress={deleteSelected}>
              <Text style={{ color: "white", fontWeight: "900" }}>DELETE</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: 12,
    backgroundColor: "rgba(2,6,23,0.78)",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerTitle: { color: "white", fontWeight: "900", letterSpacing: 0.6 },
  toggle: { color: "white", fontWeight: "800" },

  marker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  markerText: { color: "white", fontWeight: "900", fontSize: 12 },

  recenter: {
    position: "absolute",
    right: 16,
    bottom: 124,
    backgroundColor: "#1e3a8a",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  recenterText: { color: "white", fontWeight: "900", letterSpacing: 0.4 },

  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "#020617",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sheetTitle: { color: "white", fontWeight: "900", marginBottom: 8 },

  row: { flexDirection: "row", gap: 8, marginTop: 8 },

  chip: {
    flex: 1,
    padding: 10,
    backgroundColor: "#334155",
    borderRadius: 10,
    alignItems: "center",
  },
  chipText: { color: "white", fontWeight: "800", fontSize: 12 },

  cancel: { flex: 1, padding: 12, backgroundColor: "#475569", borderRadius: 10, alignItems: "center" },
  confirm: { flex: 1, padding: 12, backgroundColor: "#16a34a", borderRadius: 10, alignItems: "center" },
  delete: { flex: 1, padding: 12, backgroundColor: "#991b1b", borderRadius: 10, alignItems: "center" },
});
