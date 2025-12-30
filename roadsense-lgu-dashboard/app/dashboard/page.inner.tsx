"use client";

import { useMemo, useState, useEffect } from "react";
import HazardReportTable from "./components/HazardReportTable";

type Severity = "HIGH" | "MEDIUM" | "LOW";
type RawStatus = "reported" | "resolved";
type StatusNorm = "ACTIVE" | "RESOLVED";

type Hazard = {
  id: string;
  type: string;
  severity: Severity;
  status: RawStatus;
  latitude: number;
  longitude: number;
  created_at: string | null;
};

/* -------------------------------------------------- */
/* SAFE DATE PARSER — LGU HARDENED                    */
/* -------------------------------------------------- */
function safeParseDate(value?: string | null): number | null {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

/* -------------------------------------------------- */
/* EXECUTIVE DEMO DATA — UI ONLY                      */
/* -------------------------------------------------- */
function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const DEMO_HAZARDS: Hazard[] = [
  {
    id: "demo-1",
    type: "Pothole Cluster",
    severity: "HIGH",
    status: "reported",
    latitude: 14.5995,
    longitude: 120.9842,
    created_at: daysAgo(12),
  },
  {
    id: "demo-2",
    type: "Flooded Section",
    severity: "HIGH",
    status: "reported",
    latitude: 14.6091,
    longitude: 120.9946,
    created_at: daysAgo(7),
  },
  {
    id: "demo-3",
    type: "Road Subsidence",
    severity: "MEDIUM",
    status: "reported",
    latitude: 14.5764,
    longitude: 121.0851,
    created_at: daysAgo(5),
  },
  {
    id: "demo-4",
    type: "Cracked Pavement",
    severity: "LOW",
    status: "reported",
    latitude: 14.5547,
    longitude: 121.0244,
    created_at: daysAgo(2),
  },
  {
    id: "demo-5",
    type: "Sinkhole (Resolved)",
    severity: "HIGH",
    status: "resolved",
    latitude: 14.676,
    longitude: 121.0437,
    created_at: daysAgo(20),
  },
];

export default function DashboardInner({ hazards }: { hazards: Hazard[] }) {
  const [priorityView, setPriorityView] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [lastReportTs, setLastReportTs] = useState<number | null>(null);

  /* ---------------- SESSION ---------------- */
  useEffect(() => {
    const demo = sessionStorage.getItem("EXEC_DEMO_MODE");
    const last = sessionStorage.getItem("LAST_REPORT_TS");

    if (demo === "true") setDemoMode(true);

    if (last) {
      const ts = Number(last);
      if (Number.isFinite(ts)) setLastReportTs(ts);
    } else {
      const now = Date.now();
      sessionStorage.setItem("LAST_REPORT_TS", String(now));
      setLastReportTs(now);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("EXEC_DEMO_MODE", demoMode ? "true" : "false");
  }, [demoMode]);

  const activeHazards = demoMode ? DEMO_HAZARDS : hazards;

  /* ---------------- NORMALIZATION ---------------- */
  const normalized = useMemo(() => {
    return activeHazards.map((h) => {
      const createdTs = safeParseDate(h.created_at);
      const ageDays =
        createdTs !== null
          ? Math.floor((Date.now() - createdTs) / (1000 * 60 * 60 * 24))
          : null;

      return {
        ...h,
        statusNorm: h.status === "reported" ? "ACTIVE" : "RESOLVED",
        createdTs,
        ageDays,
      };
    });
  }, [activeHazards]);

  function getActionLabel(h: Hazard) {
    if (h.status === "resolved") return "Resolved";
    if (h.severity === "HIGH") return "Needs Immediate Action";
    if (h.severity === "MEDIUM") return "Schedule Repair";
    return "Monitor";
  }

  /* ---------------- PRIORITY QUEUE ---------------- */
  const processed = useMemo(() => {
    let list = [...normalized];

    if (priorityView) {
      list.sort((a, b) => {
        if (a.statusNorm !== b.statusNorm) {
          return a.statusNorm === "ACTIVE" ? -1 : 1;
        }
        const sevRank = { HIGH: 1, MEDIUM: 2, LOW: 3 };
        if (sevRank[a.severity] !== sevRank[b.severity]) {
          return sevRank[a.severity] - sevRank[b.severity];
        }
        return (b.ageDays ?? -1) - (a.ageDays ?? -1);
      });
    }

    return list;
  }, [normalized, priorityView]);

  /* ---------------- SINCE LAST REPORT ---------------- */
  const sinceLast = useMemo(() => {
    if (!lastReportTs) return null;

    const valid = normalized.filter((h) => h.createdTs !== null);

    return {
      newCount: valid.filter((h) => h.createdTs! > lastReportTs).length,
      newHighCount: valid.filter(
        (h) => h.createdTs! > lastReportTs && h.severity === "HIGH"
      ).length,
      resolvedCount: valid.filter(
        (h) => h.status === "resolved" && h.createdTs! > lastReportTs
      ).length,
      overdueHighCount: valid.filter(
        (h) =>
          h.statusNorm === "ACTIVE" &&
          h.severity === "HIGH" &&
          (h.ageDays ?? 0) >= 7
      ).length,
    };
  }, [normalized, lastReportTs]);

  const counts = {
    immediate: processed.filter(
      (h) => getActionLabel(h) === "Needs Immediate Action"
    ).length,
    scheduled: processed.filter(
      (h) => getActionLabel(h) === "Schedule Repair"
    ).length,
    monitoring: processed.filter(
      (h) => getActionLabel(h) === "Monitor"
    ).length,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
        <button
          onClick={() => setPriorityView(true)}
          style={{ fontWeight: priorityView ? 700 : 400 }}
        >
          Priority View
        </button>
        <button
          onClick={() => setPriorityView(false)}
          style={{ fontWeight: !priorityView ? 700 : 400 }}
        >
          All Reports
        </button>
        <div style={{ marginLeft: "auto", fontWeight: 700 }}>
          🔴 {counts.immediate} &nbsp; 🟠 {counts.scheduled} &nbsp; 🟢{" "}
          {counts.monitoring}
        </div>
      </div>

      <HazardReportTable
        hazards={processed}
        getActionLabel={getActionLabel}
      />
    </div>
  );
}
