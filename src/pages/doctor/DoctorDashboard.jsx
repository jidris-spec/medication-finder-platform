// src/pages/doctor/DoctorDashboard.jsx
import { Link, useNavigate } from "react-router-dom";
import { DOCTOR_CASES } from "../../data/doctorCases.js";
import DoctorCaseCard from "./DoctorCaseCard.jsx";
import { useAuth } from "../../providers/AuthProvider.jsx";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  async function handleLogout() {
    try {
      await signOut();
      // auth state updates immediately via AuthProvider
      navigate("/login", { replace: true });
    } catch (e) {
      console.error("Logout failed:", e?.message || e);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        padding: "2.5rem 2rem 3rem",
        background:
          "radial-gradient(circle at 0 0, rgba(59,130,246,0.18), transparent 55%), #020617",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1120px",
          background:
            "radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 55%), #020617",
          borderRadius: "1.25rem",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow:
            "0 22px 70px rgba(15,23,42,0.85), 0 0 0 1px rgba(15,23,42,1)",
          padding: "2.25rem 2.5rem 2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 80% 0, rgba(59,130,246,0.14), transparent 55%)",
            opacity: 0.9,
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <header style={{ marginBottom: "1.75rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <h1
                style={{
                  fontSize: "1.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                  color: "#e5e7eb",
                  marginBottom: "0.35rem",
                }}
              >
                Doctor Dashboard
              </h1>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  borderRadius: "999px",
                  padding: "0.5rem 0.9rem",
                  border: "1px solid rgba(148,163,184,0.4)",
                  background: "rgba(15,23,42,0.75)",
                  color: "#e5e7eb",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>

            <p
              style={{
                fontSize: "0.98rem",
                color: "rgba(209,213,219,0.8)",
                maxWidth: "44rem",
              }}
            >
              Manage patient cases, review uploaded documents, and create
              prescriptions. This module will connect to patient progress next.
            </p>
          </header>

          {/* Quick actions */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <Link
              to="/doctor/new-prescription"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <ActionCard
                title="New prescription"
                desc="Create a prescription for a patient (next step)."
                tag="Ready"
              />
            </Link>

            <Link
              to="/doctor/prescriptions"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <ActionCard
                title="Prescriptions"
                desc="View saved drafts and sent prescriptions."
                tag="Now"
              />
            </Link>

            <ActionCard
              title="Search medicines"
              desc="Quickly search pharmacy inventory (hook later)."
              tag="Soon"
            />
          </section>

          {/* Today panel */}
          <section
            style={{
              backgroundColor: "rgba(15,23,42,0.96)",
              borderRadius: "1rem",
              border: "1px solid rgba(51,65,85,0.95)",
              padding: "1.15rem 1.2rem",
              marginBottom: "1.25rem",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "#e5e7eb",
                marginBottom: "0.35rem",
              }}
            >
              Today
            </h2>
            <p style={{ fontSize: "0.85rem", color: "rgba(148,163,184,0.95)" }}>
              No doctor data connected yet. Next we’ll add:{" "}
              <span style={{ color: "#38bdf8" }}>“Create Prescription”</span> and
              a basic patient lookup.
            </p>
          </section>

          {/* Assigned cases list */}
          <section
            style={{
              backgroundColor: "rgba(15,23,42,0.96)",
              borderRadius: "1rem",
              border: "1px solid rgba(51,65,85,0.95)",
              padding: "1.15rem 1.2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "0.6rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#e5e7eb",
                }}
              >
                Assigned cases
              </h2>
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "rgba(148,163,184,0.9)",
                }}
              >
                {DOCTOR_CASES.length} case{DOCTOR_CASES.length !== 1 ? "s" : ""}{" "}
                assigned
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {DOCTOR_CASES.map((item) => (
                <DoctorCaseCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, desc, tag }) {
  return (
    <div
      style={{
        backgroundColor: "rgba(15,23,42,0.95)",
        borderRadius: "0.9rem",
        border: "1px solid rgba(148,163,184,0.4)",
        padding: "1rem 1.05rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "0.75rem",
          marginBottom: "0.4rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#e5e7eb" }}>
          {title}
        </h3>
        <span
          style={{
            fontSize: "0.72rem",
            color: "rgba(148,163,184,0.95)",
            border: "1px solid rgba(148,163,184,0.35)",
            borderRadius: "999px",
            padding: "0.15rem 0.5rem",
          }}
        >
          {tag}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(148,163,184,0.95)" }}>
        {desc}
      </p>
    </div>
  );
}
