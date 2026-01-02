"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

type Severity = "HIGH" | "MEDIUM" | "LOW";
type Status = "reported" | "resolved";

type Hazard = {
  id: string;
  type: string;
  severity: Severity;
  status: Status;
  latitude: number;
  longitude: number;
};

const SEVERITY_COLOR: Record<Severity, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#22c55e",
};

function markerLetter(type: string) {
  const t = (type || "").toLowerCase();
  if (t === "crack") return "C";
  if (t === "pothole") return "P";
  if (t === "flood") return "F";
  if (t === "construction") return "R";
  if (t === "debris") return "D";
  return "?";
}

export default function MapPageInner({ hazards }: { hazards: Hazard[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const focusId = params.get("focus");

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [120.9842, 14.5995],
      zoom: 12,
    });

    mapRef.current = map;

    map.on("load", () => {
      hazards.forEach((h) => {
        const isFocused = focusId === h.id;
        const el = document.createElement("div");

        el.style.width = isFocused ? "44px" : "28px";
        el.style.height = isFocused ? "44px" : "28px";
        el.style.borderRadius = "50%";
        el.style.background = SEVERITY_COLOR[h.severity];
        el.style.border = "3px solid #ffffff";
        el.style.color = "#000";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.fontWeight = "900";
        el.style.fontSize = isFocused ? "16px" : "12px";
        el.style.zIndex = isFocused ? "999" : "1";
        el.style.boxShadow = isFocused
          ? "0 0 0 10px rgba(255,255,255,0.9), 0 18px 36px rgba(0,0,0,0.8)"
          : "0 8px 20px rgba(0,0,0,0.6)";
        el.innerText = markerLetter(h.type);

        new mapboxgl.Marker(el)
          .setLngLat([h.longitude, h.latitude])
          .addTo(map);
      });

      if (focusId) {
        const target = hazards.find((h) => h.id === focusId);
        if (target) {
          map.flyTo({
            center: [target.longitude, target.latitude],
            zoom: 18.5,
            speed: 0.9,
            curve: 1.5,
            essential: true,
          });
        }
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [hazards]);

  const focused =
    typeof window !== "undefined"
      ? hazards.find(
          (h) => h.id === new URLSearchParams(window.location.search).get("focus")
        )
      : null;

  return (
    <div style={{ position: "relative", height: "100vh", width: "100vw" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: 16,
          zIndex: 20,
          background: "rgba(2,6,23,0.95)",
          padding: 12,
          borderRadius: 10,
          color: "#fff",
          fontSize: 12,
          boxShadow: "0 10px 24px rgba(0,0,0,0.6)",
          minWidth: 160,
        }}
      >
        <div
          onClick={() => setLegendOpen(!legendOpen)}
          style={{
            cursor: "pointer",
            fontWeight: 800,
            marginBottom: legendOpen ? 8 : 0,
            userSelect: "none",
          }}
        >
          Legend {legendOpen ? "▾" : "▸"}
        </div>

        {legendOpen && (
          <>
            <div style={{ fontWeight: 800 }}>Severity</div>
            <div>🔴 HIGH</div>
            <div>🟠 MEDIUM</div>
            <div>🟢 LOW</div>

            <div style={{ fontWeight: 800, marginTop: 10 }}>Marker</div>
            <div>C = Crack</div>
            <div>P = Pothole</div>
            <div>F = Flood</div>
            <div>R = Construction</div>
            <div>D = Debris</div>
          </>
        )}
      </div>

      {focused && (
        <div
          style={{
            position: "absolute",
            left: 14,
            bottom: 230,
            zIndex: 11,
            background: "#020617",
            padding: 14,
            borderRadius: 12,
            color: "#fff",
            width: 220,
            boxShadow: "0 14px 32px rgba(0,0,0,0.7)",
            borderLeft: `6px solid ${SEVERITY_COLOR[focused.severity]}`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            FOCUSED HAZARD
          </div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>
            {focused.type.toUpperCase()}
          </div>
          <div>Severity: <b>{focused.severity}</b></div>
          <div>Status: <b>{focused.status.toUpperCase()}</b></div>
        </div>
      )}
    </div>
  );
}
