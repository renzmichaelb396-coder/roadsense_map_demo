import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, TouchableOpacity, Platform, Dimensions } from "react-native";
import MapView, { Marker, MapPressEvent, Region } from "react-native-maps";
import * as Location from "expo-location";
import { addHazard, deleteHazard, loadHazards, updateHazardStatus, Hazard } from "@/lib/hazards";

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

function shortTypeLabel(t: string) {
  const found = HAZARD_TYPES.find((x) => x.key === t);
  return found ? found.label : String(t || "Hazard");
}

function makeId() {
  // stable enough for local ops; if your lib has UUID helper, we keep this simple and safe
  return `hz_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/* -------------------- COMPONENT -------------------- */

export default function LGUMap() {
  const mapRef = useRef<MapView | null>(null);

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // Placing mode (center pin)
  const [placementMode, setPlacementMode] = useState(false);
  const [severity, setSeverity] = useState<1 | 2 | 3>(2);
  const [type, setType] = useState<HazardType>("pothole");

  // Filters (LGU: prioritize severity/type scanning)
  const [severityFilter, setSeverityFilter] = useState<Record<number, boolean>>({ 3: true, 2: true, 1: true });
  const [typeFilter, setTypeFilter] = useState<Record<HazardType, boolean>>({
    pothole: true,
    flood: true,
    crack: true,
    debris: true,
    construction: true,
  });
  const [showResolved, setShowResolved] = useState(true);

  async function safeReloadHazards() {
    const next = await loadHazards();
    setHazards(Array.isArray(next) ? next : []);
  }

  // Location bootstrap
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
      } catch {
        // keep default region
      }
      await safeReloadHazards();
    })();
  }, []);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return hazards.find((h) => (h as any).id === selectedId) ?? null;
  }, [selectedId, hazards]);

  // If selection disappears due to delete/filtering, clear
  useEffect(() => {
    if (selectedId && !hazards.some((h: any) => h.id === selectedId)) setSelectedId(null);
  }, [hazards, selectedId]);

  function enterPlacingMode() {
    setSelectedId(null);
    setPlacementMode(true);
  }

  function cancelPlacement() {
    setPlacementMode(false);
  }

  async function confirmPlacement() {
    if (!mapRef.current || isMutating) return;

    try {
      setIsMutating(true);

      const { width, height } = Dimensions.get("window");
      const coord = await mapRef.current.coordinateForPoint({
        x: width / 2,
        y: height / 2,
      });

      await addHazard({
        id: makeId(),
        latitude: coord.latitude,
        longitude: coord.longitude,
        type,
        severity,
        status: "reported",
        createdAt: Date.now(),
      } as any);

      await safeReloadHazards();
    } catch (e) {
      console.warn("[LGUMap] confirmPlacement failed", e);
    } finally {
      setIsMutating(false);
      setPlacementMode(false);
    }
  }

  function onMarkerPress(id: string) {
    if (isMutating || placementMode) return;
    setSelectedId(id);
  }

  async function resolveSelected() {
    if (!selected || isMutating) return;
    const id = (selected as any).id;
    try {
      setIsMutating(true);
      await updateHazardStatus(id, "resolved" as any);
      await safeReloadHazards();
      setSelectedId(id);
    } catch (e) {
      console.warn("[LGUMap] resolveSelected failed", e);
    } finally {
      setIsMutating(false);
    }
  }

  async function deleteSelected() {
    if (!selected || isMutating) return;
    const id = (selected as any).id;

    // Critical: clear selection first so UI never “sticks” to a recycled marker
    setSelectedId(null);

    try {
      setIsMutating(true);
      await deleteHazard(id);
      await safeReloadHazards();
    } catch (e) {
      console.warn("[LGUMap] deleteSelected failed", e);
      await safeReloadHazards();
    } finally {
      setIsMutating(false);
    }
  }

  function recenter() {
    if (!mapRef.current || !userCoord) return;

    const r: Region = {
      latitude: userCoord.latitude,
      longitude: userCoord.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    };

    setRegion(r);
    mapRef.current.animateToRegion(r, 350);
  }

  const hazardsStable = useMemo(() => {
    // Stable ordering reduces churn; also helps prevent RN maps weirdness.
    const arr = [...hazards] as any[];
    arr.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return arr;
  }, [hazards]);

  const visibleHazards = useMemo(() => {
    return hazardsStable.filter((h: any) => {
      const st = safeStatus(h);
      if (!showResolved && st === "resolved") return false;
      if (!severityFilter[h.severity]) return false;
      if (!typeFilter[h.type as HazardType]) return false;
      return true;
    });
  }, [hazardsStable, severityFilter, typeFilter, showResolved]);

  const topBar = (
    <View
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
        padding: 10,
        borderRadius: 14,
        backgroundColor: "rgba(2,6,23,0.70)",
      }}
    >
      <Text style={{ color: "white", fontWeight: "900", letterSpacing: 0.5 }}>
        LGU HAZARD OPS
      </Text>

      <Pressable
        onPress={() => setShowResolved((v) => !v)}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 999,
          backgroundColor: showResolved ? "rgba(148,163,184,0.25)" : "rgba(239,68,68,0.25)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.15)",
        }}
      >
        <Text style={{ color: "white", fontWeight: "800", fontSize: 12 }}>
          {showResolved ? "Resolved: ON" : "Resolved: OFF"}
        </Text>
      </Pressable>
    </View>
  );

  const bottomReport = (
    <View
      style={{
        position: "absolute",
        left: 14,
        right: 14,
        bottom: 88, // above tab bar
      }}
    >
      <Pressable
        onPress={enterPlacingMode}
        style={{
          backgroundColor: "#2563eb",
          paddingVertical: 16,
          borderRadius: 18,
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
          opacity: isMutating ? 0.7 : 1,
        }}
      >
        <Text style={{ color: "white", fontWeight: "900", fontSize: 16, letterSpacing: 0.3 }}>
          + REPORT HAZARD
        </Text>
      </Pressable>
    </View>
  );

  const recenterBtn = (
    <Pressable
      onPress={recenter}
      style={{
        position: "absolute",
        right: 14,
        bottom: 166, // above report button
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 18,
        backgroundColor: "rgba(0,0,0,0.85)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.22)",
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.30,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 9,
        opacity: userCoord ? 1 : 0.45,
      }}
      disabled={!userCoord}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: "rgba(37,99,235,0.95)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>⌖</Text>
      </View>

      <View style={{ alignItems: "flex-start" }}>
        <Text style={{ color: "white", fontWeight: "900", fontSize: 12, letterSpacing: 0.2 }}>
          RECENTER
        </Text>
        <Text style={{ color: "rgba(226,232,240,0.85)", fontWeight: "800", fontSize: 11 }}>
          My location
        </Text>
      </View>
    </Pressable>
  );

  const placingOverlay = placementMode ? (
    <>
      {/* Center pin overlay */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: "#dc2626",
            borderWidth: 3,
            borderColor: "white",
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        />
        <View
          style={{
            marginTop: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: "rgba(2,6,23,0.75)",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
            Move map • Confirm at center pin
          </Text>
        </View>
      </View>

      {/* Control panel */}
      <View
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 88,
          backgroundColor: "rgba(2,6,23,0.92)",
          borderRadius: 20,
          padding: 14,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <Text style={{ color: "white", fontWeight: "900", fontSize: 14, marginBottom: 10 }}>
          Report a hazard (LGU)
        </Text>

        {/* Severity row */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          {SEVERITIES.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => setSeverity(s.key)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
                backgroundColor: severity === s.key ? s.bg : "rgba(148,163,184,0.20)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Type row */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {HAZARD_TYPES.map((t) => {
            const active = type === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setType(t.key)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: active ? "rgba(37,99,235,0.85)" : "rgba(148,163,184,0.18)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                }}
              >
                <Text style={{ color: "white", fontWeight: "800", fontSize: 12 }}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={cancelPlacement}
            style={{
              flex: 1,
              backgroundColor: "rgba(148,163,184,0.22)",
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>CANCEL</Text>
          </Pressable>

          <Pressable
            onPress={confirmPlacement}
            style={{
              flex: 1,
              backgroundColor: "#16a34a",
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              opacity: isMutating ? 0.7 : 1,
            }}
            disabled={isMutating}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>
              {isMutating ? "SAVING…" : "CONFIRM"}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  ) : null;

  const selectedCard = selected ? (
    <View
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 88,
        backgroundColor: "rgba(2,6,23,0.92)",
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>
          {shortTypeLabel((selected as any).type)} • {safeStatus(selected) === "resolved" ? "RESOLVED" : "ACTIVE"}
        </Text>

        {safeStatus(selected) === "resolved" && (
          <View
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: "rgba(148,163,184,0.20)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>HISTORICAL</Text>
          </View>
        )}
      </View>

      <Text style={{ color: "rgba(226,232,240,0.85)", marginTop: 8, fontStyle: "italic" }}>
        {safeStatus(selected) === "resolved"
          ? "Resolved hazards are kept for historical reference and accountability."
          : "Resolve after validation; delete only if duplicate or invalid report."}
      </Text>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <Pressable
          onPress={() => setSelectedId(null)}
          style={{
            flex: 1,
            backgroundColor: "rgba(148,163,184,0.20)",
            paddingVertical: 12,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>CLOSE</Text>
        </Pressable>

        {safeStatus(selected) !== "resolved" ? (
          <Pressable
            onPress={resolveSelected}
            style={{
              flex: 1,
              backgroundColor: "#16a34a",
              paddingVertical: 12,
              borderRadius: 14,
              alignItems: "center",
              opacity: isMutating ? 0.7 : 1,
            }}
            disabled={isMutating}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>{isMutating ? "…" : "RESOLVE"}</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <Pressable
          onPress={deleteSelected}
          style={{
            flex: 1,
            backgroundColor: "#991b1b",
            paddingVertical: 12,
            borderRadius: 14,
            alignItems: "center",
            opacity: isMutating ? 0.7 : 1,
          }}
          disabled={isMutating}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>{isMutating ? "…" : "DELETE"}</Text>
        </Pressable>
      </View>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={(r) => (mapRef.current = r)}
        style={{ flex: 1 }}
        initialRegion={region}
        onLongPress={(e: MapPressEvent) => {
          // LGU: long-press is primary hazard placement trigger (locked pattern)
          if (!isMutating) enterPlacingMode();
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {visibleHazards.map((h: any) => {
          const st = safeStatus(h);

          // LGU VISUAL RULES:
          // - ACTIVE uses severity color, full opacity
          // - RESOLVED is gray, low opacity, slightly smaller
          const pinColor = st === "resolved" ? "#64748b" : severityColor(h.severity);
          const opacity = st === "resolved" ? 0.25 : 1.0;

          // CRITICAL FIX: force remount when status changes to prevent RN Maps marker view reuse bleed
          const markerKey = `${h.id}-${st}`;

          return (
            <Marker
              key={markerKey}
              coordinate={{ latitude: h.latitude, longitude: h.longitude }}
              pinColor={pinColor}
              opacity={opacity}
              tracksViewChanges={false}
              onPress={() => onMarkerPress(String(h.id))}
            />
          );
        })}
      </MapView>

      {topBar}

      {/* Recenter (restored + upgraded) */}
      {recenterBtn}

      {/* Bottom UI (selection OR placing OR report) */}
      {placementMode ? placingOverlay : selected ? selectedCard : bottomReport}
    </View>
  );
}
