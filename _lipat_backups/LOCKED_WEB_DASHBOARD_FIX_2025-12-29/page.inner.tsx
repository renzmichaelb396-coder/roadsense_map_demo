"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const color = {
  HIGH: "#dc2626",
  MEDIUM: "#f59e0b",
  LOW: "#16a34a",
};

export default function HazardMap() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapRef.current!,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [120.9842, 14.5995],
      zoom: 11,
    });

    supabase.from("hazards").select("*").then(({ data }) => {
      if (!data) return;

      data.forEach(h => {
        const popup = new mapboxgl.Popup({ offset: 14 }).setHTML(`
          <div style="background:#0b0b0b;color:#fff;padding:14px;border-radius:12px;min-width:220px">
            <div style="font-weight:900;font-size:14px">${h.type.toUpperCase()}</div>
            <div style="margin:6px 0">
              <span style="background:${color[h.severity]};padding:4px 10px;border-radius:999px;font-size:12px">
                ${h.severity}
              </span>
            </div>
            <div>Status: <b>${h.status.toUpperCase()}</b></div>
            <div style="opacity:.6;font-size:12px;margin-top:6px">
              ${new Date(h.created_at).toLocaleString()}
            </div>
          </div>
        `);

        new mapboxgl.Marker({ color: color[h.severity] })
          .setLngLat([h.longitude, h.latitude])
          .setPopup(popup)
          .addTo(map);
      });
    });

    return () => map.remove();
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <a
        href="/dashboard"
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 3,
          background: "#111",
          color: "#fff",
          padding: "8px 14px",
          borderRadius: 10,
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        ← Back to Dashboard
      </a>

      {/* LEGEND */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          background: "#111",
          color: "#fff",
          padding: 12,
          borderRadius: 12,
          fontSize: 12,
          zIndex: 3,
        }}
      >
        <div><span style={{ color: color.HIGH }}>●</span> HIGH</div>
        <div><span style={{ color: color.MEDIUM }}>●</span> MEDIUM</div>
        <div><span style={{ color: color.LOW }}>●</span> LOW</div>
      </div>

      <div ref={mapRef} style={{ height: "100%" }} />
    </div>
  );
}
