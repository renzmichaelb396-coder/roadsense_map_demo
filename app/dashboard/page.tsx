"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

const SEV_ORDER: Record<Severity, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

function normalizeStatus(s: any): "ACTIVE" | "RESOLVED" {
  return (String(s || "").toLowerCase() === "resolved") ? "RESOLVED" : "ACTIVE";
}

function exportToCSV(rows: Hazard[]) {
  const headers = ["type", "severity", "status", "latitude", "longitude", "created_at"];

  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csvContent = [
    headers.join(","),
    ...rows.map(r =>
      [
        escape(r.type ?? ""),
        escape(r.severity),
        escape(r.status),
        escape(r.latitude),
        escape(r.longitude),
        escape(r.created_at),
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `roadsense_hazards_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

function actionRequired(sev: Severity) {
  if (sev === "HIGH") return "Needs Immediate Action";
  if (sev === "MEDIUM") return "Schedule Repair";
  return "Monitor";
}

function rowStyle(sev: Severity) {
  // High-contrast dark bands (readable on black body)
  if (sev === "HIGH") return { background: "#3b0a0a" };   // deep red
  if (sev === "MEDIUM") return { background: "#2a1d06" }; // deep amber/brown
  return { background: "#06251b" };                       // deep green
}

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [priorityView, setPriorityView] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "RESOLVED">("ALL");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("hazards")
        .select("id,type,severity,status,latitude,longitude,created_at")
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (error || !data) setHazards([]);
        else setHazards(data as Hazard[]);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const filtered = hazards.filter(h => {
      const st = normalizeStatus(h.status);
      if (statusFilter === "ALL") return true;
      return st === statusFilter;
    });

    if (!priorityView) return filtered;

    // Priority: unresolved first, then severity desc, then newest
    return [...filtered].sort((a, b) => {
      const aRes = normalizeStatus(a.status) === "RESOLVED" ? 1 : 0;
      const bRes = normalizeStatus(b.status) === "RESOLVED" ? 1 : 0;
      if (aRes !== bRes) return aRes - bRes;

      const sa = SEV_ORDER[a.severity] || 0;
      const sb = SEV_ORDER[b.severity] || 0;
      if (sa !== sb) return sb - sa;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [hazards, priorityView, statusFilter]);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display:none !important; }
          body { background:#fff !important; color:#000 !important; }
          table { color:#000 !important; }
          th, td { color:#000 !important; }
        }
      `}</style>

      {/* HEADER */}
      <div className="no-print" style={{ padding: 16 }}>
        <div
          style={{
            background: "linear-gradient(90deg,#0b1220,#0b0b0b)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: "12px 14px",
            fontWeight: 900,
            letterSpacing: 0.2,
          }}
        >
          🏛️ LGU READ-ONLY DASHBOARD — Field reporting & resolution are mobile-only
        </div>

        {/* ACTION BAR */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
          <button
            onClick={() => setPriorityView(true)}
            style={{
              background: priorityView ? "#e5e7eb" : "#111",
              color: priorityView ? "#111" : "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "7px 10px",
              borderRadius: 8,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Priority View
          </button>

          <button
            onClick={() => setPriorityView(false)}
            style={{
              background: !priorityView ? "#e5e7eb" : "#111",
              color: !priorityView ? "#111" : "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "7px 10px",
              borderRadius: 8,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            All Reports
          </button>

          <div style={{ width: 10 }} />

          <button
            onClick={() => setStatusFilter("ALL")}
            style={{
              background: statusFilter === "ALL" ? "#e5e7eb" : "#111",
              color: statusFilter === "ALL" ? "#111" : "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "7px 10px",
              borderRadius: 8,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Status: ALL
          </button>

          <button
            onClick={() => setStatusFilter("ACTIVE")}
            style={{
              background: statusFilter === "ACTIVE" ? "#e5e7eb" : "#111",
              color: statusFilter === "ACTIVE" ? "#111" : "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "7px 10px",
              borderRadius: 8,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Status: ACTIVE
          </button>

          <button
            onClick={() => setStatusFilter("RESOLVED")}
            style={{
              background: statusFilter === "RESOLVED" ? "#e5e7eb" : "#111",
              color: statusFilter === "RESOLVED" ? "#111" : "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "7px 10px",
              borderRadius: 8,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Status: RESOLVED
          </button>

          <div style={{ flex: 1 }} />

          <button
            onClick={() => router.push("/dashboard/map")}
            style={{
              background: "#0f172a",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "7px 12px",
              borderRadius: 8,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            🗺️ View Map
          </button>

          <button
            onClick={() => exportToCSV(visible)}
            style={{
              background: "#1f2937",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "7px 12px",
              borderRadius: 8,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ⬇ Export CSV
          </button>

          <button
            onClick={() => window.print()}
            style={{
              background: "#111827",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "7px 12px",
              borderRadius: 8,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ��️ Print PDF
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ padding: 16, paddingTop: 0 }}>
        <div style={{ opacity: 0.85, fontSize: 12, margin: "8px 0 10px" }}>
          {loading ? "Loading live data..." : `Showing ${visible.length} reports (live, read-only).`}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#050505" }}>
                <th style={{ textAlign: "left", padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Type</th>
                <th style={{ textAlign: "left", padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Severity</th>
                <th style={{ textAlign: "left", padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Status</th>
                <th style={{ textAlign: "left", padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Action Required</th>
                <th style={{ textAlign: "left", padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Reported</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(h => {
                const st = normalizeStatus(h.status);
                return (
                  <tr key={h.id || `${h.created_at}-${h.latitude}-${h.longitude}`} style={rowStyle(h.severity)}>
                    <td style={{ padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 900 }}>
                      {(h.type || "unknown").toUpperCase()}
                    </td>
                    <td style={{ padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 900 }}>
                      {h.severity}
                    </td>
                    <td style={{ padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 900 }}>
                      {st}
                    </td>
                    <td style={{ padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {actionRequired(h.severity)}
                    </td>
                    <td style={{ padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: 0.9 }}>
                      {new Date(h.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}

              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 14, opacity: 0.8 }}>
                    No reports match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 12 }}>
          Data is live, read-only, and sourced from verified field reports.
        </div>
      </div>
    </>
  );
}
