"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "@/lib/supabase";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type Severity = "HIGH" | "MEDIUM" | "LOW";
type Status = "reported" | "resolved";

const SEVERITY_COLOR: Record<Severity, string> = {
  HIGH: "#dc2626",
  MEDIUM: "#f59e0b",
  LOW: "#16a34a",
};

function hazardLetter(type: string | null) {
  const t = (type || "").toLowerCase();
  if (t === "pothole") return "P";
  if (t === "crack") return "C";
  if (t === "flood") return "F";
  if (t === "debris") return "D";
  if (t === "construction") return "R";
  return "?";
}

function createLGUMarker(h: {
  type: string | null;
  severity: Severity;
  status: Status;
}) {
  const el = document.createElement("div");

  el.style.cssText = `
    width:28px;
    height:28px;
    border-radius:999px;
    background:${SEVERITY_COLOR[h.severity]};
    color:white;
    font-weight:900;
    font-size:14px;
    display:flex;
    align-items:center;
    justify-content:center;
    border:${h.status === "resolved"
      ? "2px dashed rgba(0,0,0,0.6)"
      : "2px solid rgba(0,0,0,0.6)"};
    opacity:${h.status === "resolved" ? 0.45 : 1};
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
    cursor:pointer;
  `;

  el.textContent = hazardLetter(h.type);
  return el;
}

export default function DashboardMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapRef.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [120.9842, 14.5995],
      zoom: 11,
    });

    supabase
      .from("hazards")
      .select("type,severity,status,latitude,longitude")
      .then(({ data }) => {
        if (!data) return;

        data.forEach(h => {
          if (!h.latitude || !h.longitude) return;

          const marker = new mapboxgl.Marker({
            element: createLGUMarker(h),
          }).setLngLat([h.longitude, h.latitude]);

          const popup = new mapboxgl.Popup({ offset: 16 }).setHTML(`
            <div style="font-size:13px">
              <div style="font-weight:800">${(h.type || "UNKNOWN").toUpperCase()}</div>
              <div style="margin-top:4px">
                <span style="
                  background:${SEVERITY_COLOR[h.severity]};
                  color:white;
                  padding:2px 8px;
                  border-radius:999px;
                  font-size:11px;
                  font-weight:700
                ">
                  ${h.severity}
                </span>
              </div>
              <div style="margin-top:6px">
                Status: <b>${h.status.toUpperCase()}</b>
              </div>
            </div>
          `);

          marker.getElement().addEventListener("click", () => {
            popup.setLngLat([h.longitude, h.latitude]).addTo(map);
          });

          marker.addTo(map);
        });
      });

    return () => map.remove();
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <a
        href="/dashboard"
        style={{
          position: "absolute",
          zIndex: 10,
          top: 16,
          left: 16,
          background: "#111",
          color: "white",
          padding: "8px 12px",
          borderRadius: 6,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        ← Back to Dashboard
      </a>

      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
