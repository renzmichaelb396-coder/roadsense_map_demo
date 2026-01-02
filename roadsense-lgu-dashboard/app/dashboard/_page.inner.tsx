"use client";

import { useState, useMemo } from "react";
import HazardReportTable from "./components/HazardReportTable";

type Hazard = {
  id: string;
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  status: "reported" | "resolved";
  barangay?: string | null;
  latitude?: number;
  longitude?: number;
  created_at?: string | null;
};

type MetricFilter = "ALL" | "ACTIVE" | "ACTIVE_HIGH" | "RESOLVED";

function parseTs(d?: string | null): number | null {
  if (!d) return null;
  const ts = Date.parse(d);
  return Number.isFinite(ts) ? ts : null;
}

export default function DashboardPageInner({ hazards }: { hazards: Hazard[] }) {
  const [priorityView, setPriorityView] = useState(true);
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [barangayFilter, setBarangayFilter] = useState<string>("");

  const now = new Date().toLocaleString();

  // -----------------------------
  // DATE FILTER
  // -----------------------------
  const dateFiltered = useMemo(() => {
    const fromTs = fromDate ? Date.parse(fromDate) : null;
    const toTs = toDate ? Date.parse(toDate + "T23:59:59") : null;

    return hazards.filter((h) => {
      const ts = parseTs(h.created_at);
      if (ts === null) return false;
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      return true;
    });
  }, [hazards, fromDate, toDate]);

  // -----------------------------
  // BARANGAY AGGREGATION
  // -----------------------------
  const barangayStats = useMemo(() => {
    const map = new Map<string, { active: number; activeHigh: number; resolved: number }>();

    for (const h of dateFiltered) {
      const key = h.barangay?.trim() || "Unspecified";
      if (!map.has(key)) {
        map.set(key, { active: 0, activeHigh: 0, resolved: 0 });
      }
      const row = map.get(key)!;
      if (h.status === "reported") {
        row.active++;
        if (h.severity === "HIGH") row.activeHigh++;
      } else {
        row.resolved++;
      }
    }

    return Array.from(map.entries()).sort(
      (a, b) => b[1].activeHigh - a[1].activeHigh
    );
  }, [dateFiltered]);

  // -----------------------------
  // METRICS
  // -----------------------------
  const metrics = useMemo(() => {
    const active = dateFiltered.filter((h) => h.status === "reported");
    const resolved = dateFiltered.filter((h) => h.status === "resolved");
    const activeHigh = active.filter((h) => h.severity === "HIGH");

    return {
      activeCount: active.length,
      resolvedCount: resolved.length,
      activeHighCount: activeHigh.length,
    };
  }, [dateFiltered]);

  // -----------------------------
  // TABLE VIEW
  // -----------------------------
  const processed = useMemo(() => {
    let list = [...dateFiltered];

    if (barangayFilter)
      list = list.filter(
        (h) => (h.barangay?.trim() || "Unspecified") === barangayFilter
      );

    if (metricFilter === "ACTIVE")
      list = list.filter((h) => h.status === "reported");

    if (metricFilter === "ACTIVE_HIGH")
      list = list.filter(
        (h) => h.status === "reported" && h.severity === "HIGH"
      );

    if (metricFilter === "RESOLVED")
      list = list.filter((h) => h.status === "resolved");

    if (priorityView) {
      const rank = { HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
      list = list
        .filter((h) => h.status === "reported")
        .sort((a, b) => rank[a.severity] - rank[b.severity]);
    }

    return list;
  }, [dateFiltered, priorityView, metricFilter, barangayFilter]);

  function getActionLabel(h: Hazard) {
    if (h.status === "resolved") return "Resolved (Closed)";
    if (h.severity === "HIGH") return "Needs Immediate Action";
    if (h.severity === "MEDIUM") return "Schedule Repair";
    return "Monitor";
  }

  function printPdf() {
    window.print();
  }

  return (
    <div style={{ padding: 20 }}>
      <style>{`
        @media print {
          button, input { display: none !important; }
          .print-footer { display: block !important; }
        }
        .print-footer {
          display: none;
          margin-top: 40px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          font-size: 11px;
          color: #374151;
        }
      `}</style>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>
          RoadSense PH — LGU Hazard Report
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          As of: {now}
        </div>
      </div>

      {/* DATE FILTER */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      {/* BARANGAY SUMMARY */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Barangay Summary</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {barangayStats.map(([name, s]) => (
            <button
              key={name}
              onClick={() => setBarangayFilter(name)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #1f2937",
                background: barangayFilter === name ? "#111827" : "#020617",
                color: "#e5e7eb",
                fontWeight: 600,
              }}
            >
              {name} — HIGH:{s.activeHigh} | ACTIVE:{s.active} | RES:{s.resolved}
            </button>
          ))}
          {barangayFilter && (
            <button onClick={() => setBarangayFilter("")}>
              Clear Barangay Filter
            </button>
          )}
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
        <button onClick={() => setPriorityView(true)}>Priority View</button>
        <button onClick={() => setPriorityView(false)}>All Reports</button>
        <div style={{ flex: 1 }} />
        <button onClick={printPdf} style={{ fontWeight: 800 }}>
          Export PDF (Snapshot)
        </button>
      </div>

      <HazardReportTable hazards={processed} getActionLabel={getActionLabel} />

      {/* PRINT FOOTER */}
      <div className="print-footer">
        <div><strong>Prepared by:</strong> RoadSense PH</div>
        <div>
          This report is generated from verified field submissions and is intended
          for LGU planning, prioritization, and infrastructure decision-making.
        </div>
        <div>
          This document is read-only. Hazard creation, resolution, and deletion
          are performed via authorized mobile field operations only.
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.6 }}>
        Read-only LGU snapshot. Field reporting and resolution are mobile-only.
      </div>
    </div>
  );
}
