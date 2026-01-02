"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "@/lib/supabase";
import HazardReportTable from "@/app/dashboard/components/HazardReportTable";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type Severity = "HIGH" | "MEDIUM" | "LOW";
type Status = "reported" | "resolved" | "ACTIVE";

type Hazard = {
  id?: string;
  type: string | null;
  severity: Severity;
  status: Status;
  latitude: number;
  longitude: number;
  created_at: string;
};

const SEVERITY_COLOR: Record<Severity, string> = {
  HIGH: "#dc2626",
  MEDIUM: "#f59e0b",
  LOW: "#16a34a",
};

function hazardLetter(type: string | null) {
  const t = (type || "").toLowerCase();
  if (t === "pothole") return "P";
  if (t === "crack") return "C";
  if (t === "construction") return "R";
  if (t === "flood") return "F";
  if (t === "debris") return "D";
  return "?";
}

function createLGUMarker(h: Hazard) {
  const el = document.createElement("div");

  el.style.cssText = `
    width:40px;
    height:40px;
    border-radius:999px;
    background:${SEVERITY_COLOR[h.severity]};
    color:#ffffff;
    font-weight:900;
    font-size:18px;
    display:flex;
    align-items:center;
    justify-content:center;
    border:3px solid #ffffff;
    box-shadow:
      0 0 0 2px rgba(0,0,0,0.55),
      0 6px 14px rgba(0,0,0,0.45);
    opacity:${h.status === "resolved" ? 0.45 : 1};
    cursor:pointer;
    user-select:none;
  `;

  el.textContent = hazardLetter(h.type);
  return el;
}

function exportToCSV(rows: Hazard[]) {
  const headers = [
    "type",
    "severity",
    "status",
    "latitude",
    "longitude",
    "created_at",
  ];

  const csvContent = [
    headers.join(","),
    ...rows.map(r =>
      [
        r.type ?? "",
        r.severity,
        r.status,
        r.latitude,
        r.longitude,
        r.created_at,
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `roadsense_hazards_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

export default function DashboardMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const focusedHazardId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("hazard") : null;

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [120.9842, 14.5995],
      zoom: 11,
    });

    mapInstanceRef.current = map;

    supabase
      .from("hazards")
      .select("id,type,severity,status,latitude,longitude,created_at")
      .then(({ data }) => {
        if (!data) return;
        setHazards(data as Hazard[]);

        data.forEach((h: Hazard) => {
          if (!h.latitude || !h.longitude) return;

          const marker = new mapboxgl.Marker({
            element: createLGUMarker(h),
          }).setLngLat([h.longitude, h.latitude]);

          const popup = new mapboxgl.Popup({ offset: 16 }).setHTML(`
            <div style="background:#0b0b0b;color:#fff;padding:14px 16px;border-radius:12px;min-width:240px">
              <div style="font-weight:900;font-size:14px">
                ${(h.type || "UNKNOWN").toUpperCase()}
              </div>
              <div style="margin-top:6px;display:inline-block;background:${SEVERITY_COLOR[h.severity]};padding:4px 10px;border-radius:999px;font-size:12px;font-weight:800">
                ${h.severity}
              </div>
              <div style="margin-top:8px;font-size:13px">
                Status: <b>${String(h.status).toUpperCase()}</b>
              </div>
              <div style="margin-top:8px;font-size:12px">
                <div><b>Lat:</b> ${h.latitude.toFixed(6)}</div>
                <div><b>Lng:</b> ${h.longitude.toFixed(6)}</div>
              </div>
              <div style="opacity:.55;font-size:12px;margin-top:8px">
                ${new Date(h.created_at).toLocaleString()}
              </div>
            </div>
          `);

          marker.setPopup(popup);
          marker.addTo(map);

          if (focusedHazardId && h.id === focusedHazardId) {
            map.flyTo({ center: [h.longitude, h.latitude], zoom: 15 });
            marker.togglePopup();
            marker.getElement().style.transform = "scale(1.3)";
            marker.getElement().style.zIndex = "999";
          }
        });
      });

    return () => map.remove();
  }, []);

  return (
    <>
      {/* PRINT STYLES */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
        }
        .print-header {
          display: none;
          margin-bottom: 16px;
        }
      `}</style>

      {/* PRINT HEADER */}
      <div className="print-header">
        <h1>RoadSense PH – LGU Hazard Report</h1>
        <div>Generated: {new Date().toLocaleString()}</div>
        <hr />
      </div>

      {/* ACTION BAR */}
      <div className="no-print" style={{ position: "absolute", zIndex: 10, top: 16, left: 16, display: "flex", gap: 8 }}>
        <a
          href="/dashboard"
          style={{
            background: "#111",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          ← Back to Dashboard
        </a>

        <button
          onClick={() => exportToCSV(hazards)}
          style={{
            background: "#1f2937",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
          }}
        >
          ⬇ Export CSV
        </button>

        <button
          onClick={() => window.print()}
          style={{
            background: "#2563eb",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
          }}
        >
          🖨 Print / Save PDF
        </button>
      </div>

      {/* LGU LEGEND (RESTORED, LOCKED) */}
      <div
        className="no-print"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 10,
          background: "#0b0b0b",
          color: "#fff",
          padding: 14,
          borderRadius: 12,
          fontSize: 13,
          minWidth: 180,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Hazard Legend</div>

        <div>P – Pothole</div>
        <div>C – Crack</div>
        <div>R – Construction</div>
        <div>F – Flood</div>
        <div>D – Debris</div>

        <div style={{ marginTop: 10 }}>
          <div style={{ color: "#dc2626" }}>● HIGH</div>
          <div style={{ color: "#f59e0b" }}>● MEDIUM</div>
          <div style={{ color: "#16a34a" }}>● LOW</div>
        </div>
      </div>

      {/* MAP */}
      <div
        ref={mapContainerRef}
        className="no-print"
        style={{ width: "100%", height: "100vh" }}
      />

      {/* TABLE */}
      <div style={{ padding: 24 }}>
        <HazardReportTable hazards={hazards as any} />
      </div>
    </>
  );
}
