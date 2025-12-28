import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Dimensions, Platform } from "react-native";
import MapView, { Marker, Region, MapPressEvent } from "react-native-maps";
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

function shortTypeLabel(t: string) {
  const found = HAZARD_TYPES.find((x) => x.key === t);
  return found ? found.label : String(t || "Hazard");
}

/* -------------------- COMPONENT -------------------- */

export default function LGUMap() {
  const mapRef = useRef<MapView | null>(null);

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

  // LGU filters
  const [severityFilter, setSeverityFilter] = useState<Record<number, boolean>>({
    3: true,
    2: true,
    1: true,
  });
  const [typeFilter, setTypeFilter] = useState<Record<HazardType, boolean>>({
    pothole: true,
    flood: true,
    crack: true,
    debris: true,
    construction: true,
  });
  const [showResolved, setShowResolved] = useState(true);

  async function safeReloadHazards() {
    try {
      const next = await fetchHazards();
      setHazards(Array.isArray(next) ? next : []);
    } catch (e) {
      console.warn("[LGUMap] fetchHazards failed", e);
      setHazards([]);
    }
  }

  // Location bootstrap + initial load
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
    return hazards.find((h: any) => String(h.id) === String(selectedId)) ?? null;
  }, [selectedId, hazards]);

  // Clear selection if it disappears
  useEffect(() => {
    if (selectedId && !hazards.some((h: any) => String(h.id) === String(selectedId))) {
      setSelectedId(null);
    }
  }, [hazards, selectedId]);

  // LOCKED: single source of truth
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
      // Best-effort: center of the screen. Good enough for ops.
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
    try {
      setIsMutating(true);
      await resolveHazard(String((selected as any).id));
      await safeReloadHazards();
    } catch (e) {
      console.warn("[LGUMap] resolveSelected failed", e);
    } finally {
      setIsMutating(false);
    }
  }

  async function deleteSelected() {
    if (!selected || isMutating) return;

    const id = String((selected as any).id);
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

    mapRef.current.animateToRegion(r, 350);
  }

  const hazardsStable = useMemo(() => {
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

  const counts = useMemo(() => {
    let high = 0, med = 0, low = 0;
    let active = 0, resolved = 0;

    for (const h of hazardsStable as any[]) {
      const st = safeStatus(h);
      if (st === "resolved") resolved++;
      else active++;

      if (h.severity === 3) high++;
      else if (h.severity === 2) med++;
      else low++;
    }
    return { high, med, low, active, resolved };
  }, [hazardsStable]);

  const topBar = (
    <View
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        padding: 10,
        borderRadius: 14,
        backgroundColor: "rgba(2,6,23,0.74)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: "white", fontWeight: "900", letterSpacing: 0.4 }}>
          LGU HAZARD OPS
        </Text>

        <Pressable
          onPress={() => setShowResolved((v) => !v)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: showResolved ? "rgba(148,163,184,0.22)" : "rgba(239,68,68,0.18)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
            {showResolved ? "Resolved: ON" : "Resolved: OFF"}
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <View style={{ flex: 1, borderRadius: 12, padding: 10, backgroundColor: "rgba(239,68,68,0.16)", borderWidth: 1, borderColor: "rgba(239,68,68,0.22)" }}>
          <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>HIGH</Text>
          <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>{counts.high}</Text>
        </View>
        <View style={{ flex: 1, borderRadius: 12, padding: 10, backgroundColor: "rgba(245,158,11,0.14)", borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}>
          <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>MED</Text>
          <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>{counts.med}</Text>
        </View>
        <View style={{ flex: 1, borderRadius: 12, padding: 10, backgroundColor: "rgba(16,185,129,0.14)", borderWidth: 1, borderColor: "rgba(16,185,129,0.20)" }}>
          <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>LOW</Text>
          <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>{counts.low}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <Text style={{ color: "rgba(226,232,240,0.85)", fontWeight: "800", fontSize: 12 }}>
          Active: {counts.active} • Resolved: {counts.resolved}
        </Text>

        <Pressable
          onPress={safeReloadHazards}
          style={{
            marginLeft: "auto",
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: "rgba(37,99,235,0.18)",
            borderWidth: 1,
            borderColor: "rgba(37,99,235,0.22)",
          }}
          disabled={isMutating}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
            REFRESH
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const bottomReport = (
    <View style={{ position: "absolute", left: 14, right: 14, bottom: 88 }}>
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
        disabled={isMutating}
      >
        <Text style={{ color: "white", fontWeight: "900", fontSize: 16, letterSpacing: 0.3 }}>
          + REPORT HAZARD
        </Text>
        <Text style={{ color: "rgba(226,232,240,0.85)", fontWeight: "800", fontSize: 12, marginTop: 6 }}>
          Long-press also works (primary)
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
        bottom: 166,
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
      {/* Center pin */}
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

      {/* Panel */}
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

        {/* Severity */}
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

        {/* Type */}
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
            disabled={isMutating}
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

        <View
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: safeStatus(selected) === "resolved" ? "rgba(148,163,184,0.18)" : "rgba(16,185,129,0.14)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
            {safeStatus(selected) === "resolved" ? "HISTORICAL" : "ACTION"}
          </Text>
        </View>
      </View>

      <Text style={{ color: "rgba(226,232,240,0.85)", marginTop: 8, fontStyle: "italic" }}>
        {safeStatus(selected) === "resolved"
          ? "Resolved hazards are kept for historical accountability."
          : "Resolve after validation; delete only if duplicate/invalid."}
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
          disabled={isMutating}
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
            <Text style={{ color: "white", fontWeight: "900" }}>
              {isMutating ? "…" : "RESOLVE"}
            </Text>
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
          <Text style={{ color: "white", fontWeight: "900" }}>
            {isMutating ? "…" : "DELETE"}
          </Text>
        </Pressable>
      </View>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={(r) => (mapRef.current = r)}
        style={{ flex: 1 }}
        initialRegion={DEFAULT_REGION}
        onLongPress={(e: MapPressEvent) => {
          // LOCKED: long-press primary trigger
          if (!isMutating) enterPlacingMode();
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {useMemo(() => {
          return visibleHazards.filter(
            (h: any) =>
              Number.isFinite(Number(h?.latitude)) &&
              Number.isFinite(Number(h?.longitude))
          );
        }, [visibleHazards]).map((h: any) => {
          const st = safeStatus(h);
          const pinColor = st === "resolved" ? "#64748b" : severityColor(h.severity);
          const opacity = st === "resolved" ? 0.25 : 1.0;

          const markerKey = `${h.id}-${st}`;

          return (
            <Marker
              key={markerKey}
              coordinate={{
                latitude: Number(h.latitude),
                longitude: Number(h.longitude),
              }}
              pinColor={h.severity === 3 ? "red" : h.severity === 2 ? "orange" : "green"}
              opacity={opacity}
              tracksViewChanges={false}
              onPress={() => onMarkerPress(String(h.id))}
            />
          );
        })}
      </MapView>

      {topBar}
      {recenterBtn}
      {placementMode ? placingOverlay : selected ? selectedCard : bottomReport}
    </View>
  );
}
