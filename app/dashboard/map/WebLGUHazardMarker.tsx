type Severity = "HIGH" | "MEDIUM" | "LOW";
type Status = "reported" | "resolved";

const SEVERITY_COLOR: Record<Severity, string> = {
  HIGH: "#dc2626",
  MEDIUM: "#f59e0b",
  LOW: "#16a34a",
};

function hazardLetter(type: string | null) {
  const t = (type || "").toLowerCase();
  if (t === "pothole") return "P";
  if (t === "crack") return "C";
  if (t === "flood") return "F";
  if (t === "debris") return "D";
  if (t === "construction") return "R"; // CONFIRMED
  return "?";
}

export function createLGUMarker(h: {
  type: string | null;
  severity: Severity;
  status: Status;
}) {
  const el = document.createElement("div");

  el.style.cssText = `
    width:28px;
    height:28px;
    border-radius:999px;
    background:${SEVERITY_COLOR[h.severity]};
    color:white;
    font-weight:900;
    font-size:14px;
    display:flex;
    align-items:center;
    justify-content:center;
    border:${h.status === "resolved"
      ? "2px dashed rgba(0,0,0,0.6)"
      : "2px solid rgba(0,0,0,0.6)"};
    opacity:${h.status === "resolved" ? 0.45 : 1};
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
    cursor:pointer;
  `;

  el.textContent = hazardLetter(h.type);
  return el;
}
