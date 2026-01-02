"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 32, maxWidth: 900 }}>
      <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 16 }}>
        RoadSense PH
      </h1>

      <p style={{ fontSize: 18, opacity: 0.85, marginBottom: 24 }}>
        Real-time road hazard reporting for faster, smarter LGU response.
      </p>

      <ul style={{ marginBottom: 32 }}>
        <li>📍 Live hazard reporting from the field</li>
        <li>🚨 Severity-based prioritization</li>
        <li>🏛️ Read-only LGU dashboard for decision makers</li>
      </ul>

      <Link
        href="/dashboard"
        style={{
          display: "inline-block",
          backgroundColor: "#2563eb",
          color: "white",
          padding: "14px 24px",
          borderRadius: 10,
          fontWeight: 900,
          textDecoration: "none",
        }}
      >
        View LGU Dashboard →
      </Link>

      <p style={{ marginTop: 40, opacity: 0.6 }}>
        © RoadSense PH — Built for safer roads
      </p>
    </main>
  );
}
