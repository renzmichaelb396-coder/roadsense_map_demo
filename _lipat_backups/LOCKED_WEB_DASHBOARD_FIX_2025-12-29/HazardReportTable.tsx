"use client";

type Hazard = {
  id: string;
  type: string | null;
  severity: "HIGH" | "MEDIUM" | "LOW";
  status: "reported" | "resolved";
  created_at: string;
  barangay?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function daysOpen(createdAt: string) {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export default function HazardReportTable({ hazards }: { hazards: Hazard[] }) {
  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>
        Hazard Reports
      </h2>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#111", color: "white" }}>
              <th style={th}>Severity</th>
              <th style={th}>Type</th>
              <th style={th}>Status</th>
              <th style={th}>Reported</th>
              <th style={th}>Days Open</th>
              <th style={th}>Barangay</th>
              <th style={th}>City</th>
              <th style={th}>Latitude</th>
              <th style={th}>Longitude</th>
            </tr>
          </thead>
          <tbody>
            {hazards.map(h => (
              <tr key={h.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={td}>{h.severity}</td>
                <td style={td}>{h.type ?? "-"}</td>
                <td style={td}>{h.status.toUpperCase()}</td>
                <td style={td}>{new Date(h.created_at).toLocaleString()}</td>
                <td style={td}>
                  {h.status === "resolved" ? "-" : daysOpen(h.created_at)}
                </td>
                <td style={td}>{h.barangay ?? "-"}</td>
                <td style={td}>{h.city ?? "-"}</td>
                <td style={td}>{h.latitude ?? "-"}</td>
                <td style={td}>{h.longitude ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 10,
  fontWeight: 700,
};

const td: React.CSSProperties = {
  padding: 10,
  whiteSpace: "nowrap",
};
