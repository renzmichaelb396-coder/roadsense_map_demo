"use client";

export default function MapError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        color: "#fff",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>
          Map temporarily unavailable
        </div>
        <div style={{ opacity: 0.8, fontSize: 14, marginBottom: 12 }}>
          An unexpected error occurred while loading the map.
        </div>
        <button
          onClick={reset}
          style={{
            background: "#2563eb",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 8,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
