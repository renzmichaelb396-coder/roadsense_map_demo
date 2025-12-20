'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getColor(severity: string) {
  if (severity === 'HIGH') return '#ff4d4f';
  if (severity === 'MEDIUM') return '#faad14';
  return '#40a9ff';
}

function getPulse(ageHours: number) {
  if (ageHours <= 24) return 'pulse-strong';
  if (ageHours <= 168) return 'pulse-soft';
  return 'pulse-none';
}

export default function Page() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapEl = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapEl.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const map = new mapboxgl.Map({
      container: mapEl.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [121, 14.6],
      zoom: 10,
    });

    mapRef.current = map;


    return () => map.remove();
  }, []);

  return (
    <>
      <div ref={mapEl} style={{ width: '100vw', height: '100vh' }} />

      <div className="legend">
        <h4>Hazard Severity</h4>
        <div><span className="dot high" /> High</div>
        <div><span className="dot med" /> Medium</div>
        <div><span className="dot low" /> Low</div>
        <p className="note">Pulsing = recent hazard</p>
      </div>

      <style jsx>{`
        .marker {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
        }
        .pulse-strong { animation: pulse 1.2s infinite; }
        .pulse-soft { animation: pulse 2.5s infinite; }
        .pulse-none { animation: none; }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.6); }
          70% { box-shadow: 0 0 0 12px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }

        .legend {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 12px;
          border-radius: 8px;
          font-size: 12px;
        }

        .legend h4 { margin: 0 0 6px 0; }
        .legend .dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 6px;
        }
        .dot.high { background: #ff4d4f; }
        .dot.med { background: #faad14; }
        .dot.low { background: #40a9ff; }
        .note { margin-top: 6px; opacity: 0.7; }
      `}</style>
    </>
  );
}
