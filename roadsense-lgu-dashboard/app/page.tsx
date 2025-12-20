"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { createClient } from "@supabase/supabase-js";
import "mapbox-gl/dist/mapbox-gl.css";

type Hazard = {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page() {
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!mapDiv.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    const map = new mapboxgl.Map({
      container: mapDiv.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [121, 14.6],
      zoom: 10,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl());

    map.on("load", async () => {
      const res = await supabase
        .from("hazards")
        .select("id,latitude,longitude,type,severity,is_deleted,deleted_at");

      const hazards: Hazard[] =
        res.data
          ?.filter((h: any) => !h.is_deleted && !h.deleted_at)
          .map((h: any) => ({
            id: h.id,
            latitude: Number(h.latitude),
            longitude: Number(h.longitude),
            type: String(h.type),
            severity: Number(h.severity),
          })) ?? [];

      setCount(hazards.length);

      map.addSource("hazards", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: hazards.map((h) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [h.longitude, h.latitude],
            },
            properties: {
              type: h.type,
              severity: h.severity,
            },
          })),
        },
      });

      map.addLayer({
        id: "hazards",
        type: "circle",
        source: "hazards",
        paint: {
          "circle-radius": 6,
          "circle-color": "#e11d48",
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <main style={{ padding: 16 }}>
      <h2>RoadSense LGU Dashboard</h2>
      <p>Hazards: {count}</p>
      <div
        ref={mapDiv}
        style={{ height: "70vh", borderRadius: 12, overflow: "hidden" }}
      />
    </main>
  );
}
