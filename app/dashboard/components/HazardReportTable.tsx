type Severity = "HIGH" | "MEDIUM" | "LOW";

export default function HazardReportTable<T extends {
  id: string;
  type: string;
  severity: Severity;
  status: "reported" | "resolved";
}>({
  hazards,
  onRowClick,
  getActionLabel,
}: {
  hazards: T[];
  onRowClick?: (h: T) => void;
  getActionLabel?: (h: T) => string;
}) {
  function displayStatus(status: "reported" | "resolved") {
    return status === "reported" ? "ACTIVE" : "RESOLVED";
  }

  function rowStyle(h: T) {
    if (h.status === "resolved") {
      return {
        background: "#020617",
        color: "#9ca3af",
        fontWeight: 500,
        opacity: 0.6,
      };
    }

    if (h.severity === "HIGH")
      return { background: "#7f1d1d", color: "#fff", fontWeight: 800 };
    if (h.severity === "MEDIUM")
      return { background: "#92400e", color: "#fff", fontWeight: 700 };
    return { background: "#064e3b", color: "#ecfdf5", fontWeight: 600 };
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr style={{ background: "#020617", color: "#e5e7eb" }}>
          <th style={{ padding: 10 }}>Type</th>
          <th style={{ padding: 10 }}>Severity</th>
          <th style={{ padding: 10 }}>Status</th>
          {getActionLabel && <th style={{ padding: 10 }}>Action Required</th>}
        </tr>
      </thead>
      <tbody>
        {hazards.map((h) => (
          <tr
            key={h.id}
            onClick={() => onRowClick?.(h)}
            style={{
              ...rowStyle(h),
              cursor: onRowClick ? "pointer" : "default",
              borderBottom: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <td style={{ padding: 10 }}>{h.type}</td>
            <td style={{ padding: 10 }}>{h.severity}</td>
            <td style={{ padding: 10 }}>{displayStatus(h.status)}</td>
            {getActionLabel && (
              <td style={{ padding: 10 }}>{getActionLabel(h)}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
