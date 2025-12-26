import { Link } from "react-router-dom";

export default function DoctorCaseCard({ item }) {
  if (!item) return null;

  return (
    <Link
      to={`/doctor/case/${item.id}`}
      style={{
        display: "block",
        textDecoration: "none",
        borderRadius: "0.95rem",
        border: "1px solid rgba(148,163,184,0.35)",
        backgroundColor: "rgba(2,6,23,0.75)",
        padding: "0.95rem 1rem",
        color: "inherit",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "1rem",
          marginBottom: "0.25rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "0.98rem", color: "#e5e7eb" }}>
          {item.title}
        </h3>
        <span
          style={{
            fontSize: "0.75rem",
            color: "rgba(148,163,184,0.95)",
            border: "1px solid rgba(148,163,184,0.25)",
            borderRadius: "999px",
            padding: "0.15rem 0.55rem",
            whiteSpace: "nowrap",
          }}
        >
          {item.status}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(209,213,219,0.85)" }}>
        {item.patientName} · {item.patientId}
      </p>

      <p
        style={{
          marginTop: "0.55rem",
          marginBottom: 0,
          fontSize: "0.82rem",
          color: "rgba(148,163,184,0.95)",
        }}
      >
        {item.summary}
      </p>
    </Link>
  );
}
