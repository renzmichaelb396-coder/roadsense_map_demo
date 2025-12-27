import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import MapView, { Marker, Region, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import {
  fetchHazards,
  createHazard,
  resolveHazard,
  deleteHazard,
  Hazard,
} from "@/lib/hazards";

/**
 * GOALSS – ANDROID-ONLY LGU MAP (LOCKED)
 *
 * RULES:
 * - Long-press map = ONLY way to report hazard
 * - NO + FAB
 * - NO pinpoint / navigation arrows
 * - LGU impact markers (severity disks)
 * - Dashboard always visible
 * - Recenter always visible
 * - Tap marker => LGU action sheet (details / resolve / delete)
 */

const DEFAULT_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

type Sev = 1 | 2 | 3;

const SEVERITY: Record<Sev, { label: string; color: string }> = {
  3: { label: "HIGH", color: "#dc2626" },
  2: { label: "MED", color: "#f59e0b" },
  1: { label: "LOW", color: "#16a34a" },
};

const TYPES = ["Pothole", "Flood", "Crack", "Debris", "Construction"] as const;
type HazardType = (typeof TYPES)[number];

function normSeverity(v: any): Sev {
  if (v === 3 || String(v).toUpperCase() === "HIGH") return 3;
  if (v === 2 || String(v).toUpperCase().startsWith("MED")) return 2;
  return 1;
}

function LGUImpactMarker({
  severity,
  selected,
}: {
  severity: Sev;
  selected: boolean;
}) {
  const color = SEVERITY[severity].color;
  return (
    <View
      style={{
        width: selected ? 28 : 22,
        height: selected ? 28 : 22,
        borderRadius: 14,
        backgroundColor: color,
        borderWidth: 3,
        borderColor: "#0b1220",
        opacity: selected ? 1 : 0.9,
      }}
    />
  );
}

export default function LGUMap() {
  const mapRef = useRef<MapView | null>(null);

  const [region, setRegion] = useState(DEFAULT_REGION);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [placing, setPlacing] = useState(false);
  const [severity, setSeverity] = useState<Sev>(2);
  const [type, setType] = useState<HazardType>("Pothole");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [showResolved, setShowResolved] = useState(true);

  const selected = hazards.find((h) => h.id === selectedId) ?? null;

  useEffect(() => {
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status === "granted") {
          const loc = await Location.getLastKnownPositionAsync({});
          if (loc?.coords) {
            setRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.10,
              longitudeDelta: 0.10,
            });
          }
        }
      } catch {}
      reload();
    })();
  }, []);

  async function reload() {
    const data = await fetchHazards();
    setHazards(Array.isArray(data) ? data : []);
  }

  function isResolved(h: Hazard) {
    return h.status === "resolved";
  }

  const visibleHazards = useMemo(
    () => hazards.filter((h) => (showResolved ? true : !isResolved(h))),
    [hazards, showResolved]
  );

  const counts = useMemo(() => {
    let active = 0,
      resolved = 0,
      high = 0,
      med = 0,
      low = 0;

    for (const h of hazards) {
      const sev = normSeverity(h.severity);
      if (isResolved(h)) resolved++;
      else active++;
      if (sev === 3) high++;
      else if (sev === 2) med++;
      else low++;
    }

    return { active, resolved, high, med, low };
  }, [hazards]);

  function recenter() {
    mapRef.current?.animateToRegion(region, 400);
  }

  function enterPlacingMode() {
    setSelectedId(null);
    setPlacing(true);
  }

  async function confirmPlacement() {
    if (!mapRef.current || isMutating) return;
    setIsMutating(true);
    try {
      const { width, height } = Dimensions.get("window");
      const coord = await mapRef.current.coordinateForPoint({
        x: width / 2,
        y: height / 2,
      });

      await createHazard({
        type,
        severity,
        latitude: coord.latitude,
        longitude: coord.longitude,
      });

      await reload();
    } finally {
      setPlacing(false);
      setIsMutating(false);
    }
  }

  async function doResolve() {
    if (!selected || isMutating) return;
    setIsMutating(true);
    await resolveHazard(selected.id);
    setSelectedId(null);
    await reload();
    setIsMutating(false);
  }

  async function doDelete() {
    if (!selected || isMutating) return;
    setIsMutating(true);
    await deleteHazard(selected.id);
    setSelectedId(null);
    await reload();
    setIsMutating(false);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* DASHBOARD */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: 12,
          backgroundColor: "rgba(11,18,32,0.92)",
          zIndex: 20,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
          LGU HAZARD OPS
        </Text>
        <Text style={{ color: "#cbd5f5", marginTop: 4 }}>
          Active: {counts.active} • Resolved: {counts.resolved}
        </Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Text style={{ color: "#dc2626" }}>HIGH {counts.high}</Text>
          <Text style={{ color: "#f59e0b" }}>MED {counts.med}</Text>
          <Text style={{ color: "#16a34a" }}>LOW {counts.low}</Text>
        </View>

        <Pressable
          onPress={() => setShowResolved((v) => !v)}
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>
            Resolved: {showResolved ? "ON" : "OFF"}
          </Text>
        </Pressable>
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={region}
        onLongPress={enterPlacingMode}
      >
        {visibleHazards.map((h) => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.latitude, longitude: h.longitude }}
            onPress={() => setSelectedId(h.id)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <LGUImpactMarker
              severity={normSeverity(h.severity)}
              selected={h.id === selectedId}
            />
          </Marker>
        ))}
      </MapView>

      {/* RECENTER */}
      <Pressable
        onPress={recenter}
        style={{
          position: "absolute",
          right: 16,
          bottom: 120,
          backgroundColor: "#0b1220",
          padding: 14,
          borderRadius: 30,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.2)",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900" }}>◎</Text>
      </Pressable>

      {/* REPORT SHEET */}
      {placing && (
        <View
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 16,
            backgroundColor: "rgba(11,18,32,0.95)",
            borderRadius: 18,
            padding: 14,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
            REPORT HAZARD
          </Text>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            {[3, 2, 1].map((s) => (
              <Pressable
                key={s}
                onPress={() => setSeverity(s as Sev)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor:
                    severity === s ? SEVERITY[s as Sev].color : "rgba(255,255,255,0.1)",
                }}
              >
                <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>
                  {SEVERITY[s as Sev].label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor:
                    type === t ? "#2563eb" : "rgba(255,255,255,0.1)",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Pressable
              onPress={() => setPlacing(false)}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>CANCEL</Text>
            </Pressable>

            <Pressable
              onPress={confirmPlacement}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                backgroundColor: "#16a34a",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>
                {isMutating ? "SAVING..." : "CONFIRM"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* SELECTED HAZARD SHEET */}
      {selected && (
        <View
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 16,
            backgroundColor: "rgba(11,18,32,0.95)",
            borderRadius: 18,
            padding: 14,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
            {selected.type} • {isResolved(selected) ? "RESOLVED" : "ACTIVE"} •{" "}
            {SEVERITY[normSeverity(selected.severity)].label}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable
              onPress={() => setSelectedId(null)}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>CLOSE</Text>
            </Pressable>

            {!isResolved(selected) && (
              <Pressable
                onPress={doResolve}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: "#16a34a",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>RESOLVE</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={doDelete}
            style={{
              marginTop: 10,
              padding: 14,
              borderRadius: 14,
              backgroundColor: "#dc2626",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              DELETE (INVALID / DUPLICATE ONLY)
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
