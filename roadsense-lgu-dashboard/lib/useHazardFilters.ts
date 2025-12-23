"use client";

import { useState } from "react";

export type Severity = "HIGH" | "MEDIUM" | "LOW";
export type Status = "reported" | "resolved";
export type TimeRange = "24h" | "7d" | "30d" | "ALL";

export function useHazardFilters() {
  const [severity, setSeverity] = useState<Severity[]>(["HIGH", "MEDIUM"]);
  const [status, setStatus] = useState<Status[]>(["reported"]);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

  return {
    severity,
    setSeverity,
    status,
    setStatus,
    timeRange,
    setTimeRange,
  };
}
