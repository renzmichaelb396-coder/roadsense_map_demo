"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Severity = "HIGH" | "MEDIUM" | "LOW";
type Status = "reported" | "resolved";
type TimeRange = "7d" | "30d" | "all";

type Hazard = {
  id: string;
  type: string | null;
  severity: string | null;
  status: string | null;
  created_at: string;

  // optional location fields (your backfill script writes these)
  barangay?: string | null;
  city?: string | null;
  location_label?: string | null;

  latitude?: number | null;
  longitude?: number | null;
};

const severityRank: Record<Severity, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const color: Record<Severity, string> = {
  HIGH: "#dc2626",
  MEDIUM: "#f59e0b",
  LOW: "#16a34a",
};

function normalizeSeverity(v: any): Severity {
  const s = String(v || "").toUpperCase();
  if (s === "HIGH" || s === "MEDIUM" || s === "LOW") return s;
  return "LOW";
}

function normalizeStatus(v: any): Status {
  const s = String(v || "").toLowerCase();
  if (s === "reported" || s === "resolved") return s;
  return "reported";
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildCsv(rows: any[]) {
  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = [
    "Barangay",
    "City",
    "Location",
    "Type",
    "Severity",
    "Priority",
    "Status",
    "AgeDays",
    "Risk",
    "ReportedAt",
    "Latitude",
    "Longitude",
  ];

  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push(
      [
        r.barangay ?? "",
        r.city ?? "",
        r.location_label ?? "",
        r.type ?? "",
        r.severity ?? "",
        r.priority ?? "",
        r.status ?? "",
        r.ageDays ?? "",
        r.risk ?? "",
        r.reportedAt ?? "",
        r.latitude ?? "",
        r.longitude ?? "",
      ].map(escape).join(",")
    );
  }

  return lines.join("\n");
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Chip({
  active,
  label,
  onClick,
  tone = "default",
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger" | "warn" | "ok";
}) {
  const bg = active ? "#fff" : "#111";
  const fg = active ? "#000" : "#fff";
  const border = active ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.08)";

  let glow = "none";
  if (active && tone === "danger") glow = "0 0 0 3px rgba(220,38,38,0.25)";
  if (active && tone === "warn") glow = "0 0 0 3px rgba(245,158,11,0.25)";
  if (active && tone === "ok") glow = "0 0 0 3px rgba(22,163,74,0.25)";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border,
        background: bg,
        color: fg,
        padding: "10px 14px",
        borderRadius: 999,
        fontWeight: 900,
        letterSpacing: 0.2,
        cursor: "pointer",
        boxShadow: glow,
      }}
    >
      {label}
    </button>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const sp = useSearchParams();

  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(true);

  // --- URL state (single source of truth) ---
  const urlSeverity = useMemo<Severity[]>(() => {
    const raw = sp.get("severity");
    if (!raw) return ["HIGH", "MEDIUM"]; // LGU default: focus
    const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
    const set = new Set<Severity>();
    for (const p of parts) {
      const s = normalizeSeverity(p);
      set.add(s);
    }
    const arr = Array.from(set);
    return arr.length ? arr : ["HIGH", "MEDIUM"];
  }, [sp]);

  const urlStatus = useMemo<Status[]>(() => {
    const raw = sp.get("status");
    if (!raw) return ["reported"]; // LGU default: open issues
    const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
    const set = new Set<Status>();
    for (const p of parts) set.add(normalizeStatus(p));
    const arr = Array.from(set);
    return arr.length ? arr : ["reported"];
  }, [sp]);

  const urlRange = useMemo<TimeRange>(() => {
    const raw = (sp.get("range") || "7d") as TimeRange;
    if (raw === "7d" || raw === "30d" || raw === "all") return raw;
    return "7d";
  }, [sp]);

  const urlOverdueOnly = useMemo(() => {
    return sp.get("overdue") === "1";
  }, [sp]);

  // helper to update URL cleanly
  const setParams = (next: { severity?: Severity[]; status?: Status[]; range?: TimeRange; overdue?: boolean }) => {
    const params = new URLSearchParams(sp.toString());

    const sev = next.severity ?? urlSeverity;
    const st = next.status ?? urlStatus;
    const range = next.range ?? urlRange;
    const overdue = typeof next.overdue === "boolean" ? next.overdue : urlOverdueOnly;

    params.set("severity", sev.join(","));
    params.set("status", st.join(","));
    params.set("range", range);
    if (overdue) params.set("overdue", "1");
    else params.delete("overdue");

    router.replace(`/dashboard?${params.toString()}`);
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);

    supabase
      .from("hazards")
      .select("*")
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error(error);
          setHazards([]);
        } else {
          setHazards((data || []) as Hazard[]);
        }
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const normalized = useMemo(() => {
    return hazards.map(h => {
      const sev = normalizeSeverity(h.severity);
      const st = normalizeStatus(h.status);
      const created = new Date(h.created_at);
      const ageDays = Math.max(0, daysBetween(new Date(), created));

      // LGU operational rule: overdue if still reported and age > 7 days
      const overdue = st === "reported" && ageDays > 7;

      const priority =
        sev === "HIGH" ? "URGENT" :
        sev === "MEDIUM" ? "ELEVATED" :
        "NORMAL";

      const risk = overdue ? "AT RISK" : "OK";

      const location_label =
        h.location_label ||
        [h.barangay ? `Brgy. ${h.barangay}` : "", h.city || ""].filter(Boolean).join(", ") ||
        (h.latitude && h.longitude ? `${h.latitude.toFixed(5)}, ${h.longitude.toFixed(5)}` : "—");

      return {
        ...h,
        type: (h.type || "UNKNOWN").toString().toUpperCase(),
        severity: sev,
        status: st,
        ageDays,
        overdue,
        priority,
        risk,
        location_label,
      };
    });
  }, [hazards]);

  const filtered = useMemo(() => {
    const now = new Date();
    const maxAge =
      urlRange === "7d" ? 7 :
      urlRange === "30d" ? 30 :
      Infinity;

    return normalized
      .filter(h => urlSeverity.includes(h.severity as Severity))
      .filter(h => urlStatus.includes(h.status as Status))
      .filter(h => (maxAge === Infinity ? true : h.ageDays <= maxAge))
      .filter(h => (urlOverdueOnly ? h.overdue : true))
      .sort((a, b) => {
        // decision-grade sorting
        if (severityRank[b.severity as Severity] !== severityRank[a.severity as Severity]) {
          return severityRank[b.severity as Severity] - severityRank[a.severity as Severity];
        }
        // overdue first
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        // reported first
        if (a.status !== b.status) return a.status === "reported" ? -1 : 1;
        // older first (prioritize)
        return b.ageDays - a.ageDays;
      });
  }, [normalized, urlSeverity, urlStatus, urlRange, urlOverdueOnly]);

  const counts = useMemo(() => {
    const open = normalized.filter(h => h.status === "reported");
    return {
      HIGH: open.filter(h => h.severity === "HIGH").length,
      MEDIUM: open.filter(h => h.severity === "MEDIUM").length,
      LOW: open.filter(h => h.severity === "LOW").length,
      OVERDUE: open.filter(h => h.overdue).length,
    };
  }, [normalized]);

  const exportCsv = () => {
    const rows = filtered.map(h => ({
      barangay: h.barangay ?? "",
      city: h.city ?? "",
      location_label: h.location_label ?? "",
      type: h.type ?? "",
      severity: h.severity ?? "",
      priority: (h as any).priority ?? "",
      status: (h.status ?? "").toUpperCase(),
      ageDays: (h as any).ageDays ?? "",
      risk: (h as any).risk ?? "",
      reportedAt: new Date(h.created_at).toLocaleString(),
      latitude: h.latitude ?? "",
      longitude: h.longitude ?? "",
    }));

    const csv = buildCsv(rows);
    const filename = `roadsense-lgu-hazards_${toISODate(new Date())}.csv`;
    downloadTextFile(filename, csv);
  };

  const toggleSeverity = (s: Severity) => {
    const set = new Set(urlSeverity);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    const next = Array.from(set);
    // prevent empty selection
    setParams({ severity: next.length ? next : ["HIGH", "MEDIUM"] });
  };

  const toggleStatus = (s: Status) => {
    const set = new Set(urlStatus);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    const next = Array.from(set);
    setParams({ status: next.length ? next : ["reported"] });
  };

  const gotoMap = () => {
    const params = new URLSearchParams();
    params.set("severity", urlSeverity.join(","));
    params.set("status", urlStatus.join(","));
    params.set("range", urlRange);
    if (urlOverdueOnly) params.set("overdue", "1");
    router.push(`/dashboard/map?${params.toString()}`);
  };

  return (
    <main style={{ padding: 32, background: "#000", minHeight: "100vh", color: "#fff" }}>
      <h1 style={{ fontSize: 30, fontWeight: 950, margin: 0 }}>Road Hazards — LGU Dashboard</h1>
      <p style={{ opacity: 0.65, marginTop: 8, marginBottom: 10 }}>
        Decision-grade, read-only operational view
      </p>

      <button
        type="button"
        onClick={gotoMap}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          color: "#60a5fa",
          fontWeight: 900,
          cursor: "pointer",
          marginBottom: 18,
        }}
      >
        View Map →
      </button>

      {/* FILTERS (DO NOT REMOVE) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          padding: 14,
          borderRadius: 16,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Chip active={urlSeverity.includes("HIGH")} label="HIGH" tone="danger" onClick={() => toggleSeverity("HIGH")} />
          <Chip active={urlSeverity.includes("MEDIUM")} label="MEDIUM" tone="warn" onClick={() => toggleSeverity("MEDIUM")} />
          <Chip active={urlSeverity.includes("LOW")} label="LOW" tone="ok" onClick={() => toggleSeverity("LOW")} />
        </div>

        <div style={{ width: 10 }} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Chip active={urlStatus.includes("reported")} label="REPORTED" onClick={() => toggleStatus("reported")} />
          <Chip active={urlStatus.includes("resolved")} label="RESOLVED" onClick={() => toggleStatus("resolved")} />
          <Chip
            active={urlOverdueOnly}
            label="OVERDUE"
            onClick={() => setParams({ overdue: !urlOverdueOnly })}
          />
        </div>

        <div style={{ width: 10 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={urlRange}
            onChange={e => setParams({ range: e.target.value as TimeRange })}
            style={{
              background: "#111",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "#fff",
              borderRadius: 12,
              padding: "10px 12px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>

          <button
            type="button"
            onClick={exportCsv}
            style={{
              background: "#22c55e",
              color: "#06250f",
              border: "none",
              padding: "10px 16px",
              borderRadius: 12,
              fontWeight: 950,
              cursor: "pointer",
              boxShadow: "0 10px 30px rgba(34,197,94,0.18)",
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* SUMMARY (open items) */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
        <Stat label="HIGH (Open)" value={counts.HIGH} accent={color.HIGH} />
        <Stat label="MEDIUM (Open)" value={counts.MEDIUM} accent={color.MEDIUM} />
        <Stat label="LOW (Open)" value={counts.LOW} accent={color.LOW} />
        <Stat label="OVERDUE" value={counts.OVERDUE} accent="#ef4444" />
      </div>

      {loading ? (
        <div style={{ opacity: 0.7, marginTop: 16 }}>Loading hazards…</div>
      ) : (
        <>
          {/* TABLE */}
          <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ opacity: 0.85 }}>
                <th align="left" style={{ padding: "10px 8px" }}>Priority</th>
                <th align="left" style={{ padding: "10px 8px" }}>Location</th>
                <th align="left" style={{ padding: "10px 8px" }}>Type</th>
                <th align="left" style={{ padding: "10px 8px" }}>Severity</th>
                <th align="left" style={{ padding: "10px 8px" }}>Status</th>
                <th align="left" style={{ padding: "10px 8px" }}>Age</th>
                <th align="left" style={{ padding: "10px 8px" }}>Risk</th>
                <th align="left" style={{ padding: "10px 8px" }}>Reported</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => {
                const sev = h.severity as Severity;
                const st = h.status as Status;
                const dim = st === "resolved" ? 0.55 : 1;

                return (
                  <tr key={h.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)", opacity: dim }}>
                    <td style={{ padding: "10px 8px", fontWeight: 900 }}>
                      {sev === "HIGH" ? "⚠️ URGENT" : sev === "MEDIUM" ? "▲ ELEVATED" : "• NORMAL"}
                    </td>
                    <td style={{ padding: "10px 8px", maxWidth: 320 }}>
                      <div style={{ fontWeight: 800 }}>{(h as any).location_label || "—"}</div>
                      <div style={{ opacity: 0.6, fontSize: 12 }}>
                        {h.latitude && h.longitude ? `${Number(h.latitude).toFixed(5)}, ${Number(h.longitude).toFixed(5)}` : ""}
                      </div>
                    </td>
                    <td style={{ padding: "10px 8px", fontWeight: 900 }}>{String(h.type || "UNKNOWN").toUpperCase()}</td>
                    <td style={{ padding: "10px 8px", fontWeight: 950, color: color[sev] }}>{sev}</td>
                    <td style={{ padding: "10px 8px", fontWeight: 900 }}>{st.toUpperCase()}</td>
                    <td style={{ padding: "10px 8px" }}>{(h as any).ageDays}d</td>
                    <td style={{ padding: "10px 8px", fontWeight: 950, color: (h as any).risk === "AT RISK" ? "#f59e0b" : "#16a34a" }}>
                      {(h as any).risk}
                    </td>
                    <td style={{ padding: "10px 8px" }}>{new Date(h.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: 12, opacity: 0.55, fontSize: 12 }}>
            Showing <b>{filtered.length}</b> records (filters are shareable via URL).
          </div>
        </>
      )}
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      style={{
        background: "#0b0b0b",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: 16,
        borderRadius: 16,
        minWidth: 170,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 900 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 950, color: accent, marginTop: 6 }}>{value}</div>
    </div>
  );
}
