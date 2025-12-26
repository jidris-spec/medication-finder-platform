import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPrescription } from "../../data/prescriptionsApi";

export default function PatientPrescriptionView() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setError(null);
    try {
      const row = await getPrescription(id);
      setP(normalizePrescription(row));
    } catch (e) {
      setError(e?.message || "Failed to load prescription from Supabase.");
      setP(null);
    }
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "rgba(248,113,113,0.95)" }}>
        {error}
      </div>
    );
  }

  if (!p) {
    return (
      <div style={{ padding: "2rem", color: "rgba(148,163,184,0.95)" }}>
        Prescription not found.
      </div>
    );
  }

  const status = p.status || "Draft";
  const createdAt = p.createdAt ? safeDate(p.createdAt) : null;
  const sentAt = p.sentAt ? safeDate(p.sentAt) : null;
  const pharmacyAt = p.pharmacyAt ? safeDate(p.pharmacyAt) : null;

  const rejectionText = p.rejectionReason ?? p.rejection_reason ?? p.reason ?? "";
  const pickupText = p.pickupInstructions ?? p.pickup_instructions ?? "";

  const timeline = [
    {
      key: "created",
      title: "Created",
      done: !!createdAt,
      date: createdAt,
      desc: "Doctor created the prescription draft.",
    },
    {
      key: "sent",
      title: "Sent to pharmacy",
      done: status !== "Draft" && !!sentAt,
      date: sentAt,
      desc: "Doctor sent the prescription to pharmacy inbox.",
    },
    {
      key: "pharmacy",
      title: "Pharmacy decision",
      done: status === "Fulfilled" || status === "Rejected",
      date: pharmacyAt,
      desc:
        status === "Fulfilled"
          ? "Pharmacy confirmed fulfillment."
          : status === "Rejected"
          ? "Pharmacy rejected the prescription."
          : "Pending pharmacy action.",
    },
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        padding: "2.5rem 2rem 3rem",
        backgroundColor: "#020617",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          backgroundColor: "rgba(15,23,42,0.96)",
          borderRadius: "1.2rem",
          border: "1px solid rgba(148,163,184,0.45)",
          padding: "2rem",
        }}
      >
        <Link
          to="/patient"
          style={{
            color: "#93c5fd",
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          ← Back to Patient Dashboard
        </Link>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#e5e7eb" }}>
              Prescription
            </h1>
            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                color: "rgba(148,163,184,0.95)",
              }}
            >
              {p.patientName} · {p.patientId}
            </p>
          </div>

          <span
            style={{
              alignSelf: "flex-start",
              fontSize: 12,
              border: "1px solid rgba(148,163,184,0.35)",
              borderRadius: 999,
              padding: "0.25rem 0.7rem",
              color: "rgba(229,231,235,0.95)",
              background:
                status === "Fulfilled"
                  ? "rgba(34,197,94,0.15)"
                  : status === "Rejected"
                  ? "rgba(248,113,113,0.12)"
                  : status === "Sent"
                  ? "rgba(59,130,246,0.15)"
                  : "rgba(148,163,184,0.10)",
            }}
          >
            {status}
          </span>
        </div>

        {/* Timeline */}
        <section style={panel}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <h2 style={panelTitle}>Status timeline</h2>
            <button type="button" onClick={load} style={ghostBtn}>
              Refresh
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 10,
            }}
          >
            {timeline.map((t) => (
              <div
                key={t.key}
                style={{
                  backgroundColor: "rgba(2,6,23,0.9)",
                  borderRadius: "0.9rem",
                  border: "1px solid rgba(51,65,85,0.95)",
                  padding: "0.85rem 0.9rem",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, color: "#e5e7eb" }}>
                    {t.done ? "✅" : "⏳"} {t.title}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color: "rgba(148,163,184,0.95)",
                    }}
                  >
                    {t.desc}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(148,163,184,0.95)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.date ? t.date : "—"}
                </div>
              </div>
            ))}
          </div>

          {status === "Rejected" ? (
            <div
              style={{
                marginTop: 12,
                padding: "0.9rem",
                borderRadius: "0.9rem",
                border: "1px solid rgba(248,113,113,0.35)",
                backgroundColor: "rgba(2,6,23,0.85)",
                color: "rgba(248,113,113,0.95)",
              }}
            >
              <strong>Pharmacy rejection reason:</strong>{" "}
              {String(rejectionText).trim()
                ? rejectionText
                : "No reason provided."}
            </div>
          ) : null}

          {status === "Fulfilled" ? (
            <div
              style={{
                marginTop: 12,
                padding: "0.9rem",
                borderRadius: "0.9rem",
                border: "1px solid rgba(34,197,94,0.35)",
                backgroundColor: "rgba(2,6,23,0.85)",
                color: "rgba(34,197,94,0.95)",
              }}
            >
              <strong>Pickup instructions:</strong>{" "}
              {String(pickupText).trim()
                ? pickupText
                : "No instructions provided."}
            </div>
          ) : null}
        </section>

        {/* Items */}
        <section style={panel}>
          <h2 style={panelTitle}>Medicines</h2>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {(p.items || []).map((line) => (
              <div key={line.id} style={lineCard}>
                <div>
                  <div style={{ fontWeight: 900, color: "#e5e7eb" }}>
                    {line.name} {line.strength ? `· ${line.strength}` : ""}{" "}
                    {line.form ? `· ${line.form}` : ""}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color: "rgba(148,163,184,0.95)",
                    }}
                  >
                    Qty: <strong>{line.qty}</strong>
                    {" · "}
                    {line.instructions
                      ? `Instructions: ${line.instructions}`
                      : "No instructions"}
                  </div>

                  {line.medicineId ? (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "rgba(148,163,184,0.75)",
                      }}
                    >
                      medicineId: {line.medicineId}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Meta */}
        <section style={panel}>
          <h2 style={panelTitle}>Meta</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginTop: 10,
            }}
          >
            <Meta label="Created" value={p.createdAt ? safeDate(p.createdAt) : "—"} />
            <Meta label="Sent" value={p.sentAt ? safeDate(p.sentAt) : "—"} />
            <Meta
              label="Pharmacy action"
              value={p.pharmacyAt ? safeDate(p.pharmacyAt) : "—"}
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(148,163,184,0.8)" }}>
            Prescription ID: <code>{p.id}</code>
          </div>
        </section>
      </div>
    </div>
  );
}

function normalizePrescription(row) {
  const lines = Array.isArray(row?.prescription_items) ? row.prescription_items : [];

  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    status: row.status,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    pharmacyAt: row.pharmacy_at,
    rejectionReason: row.rejection_reason,
    pickupInstructions: row.pickup_instructions,
    items: lines.map((x) => ({
      id: x.id,
      medicineId: x.medicine_id,
      name: x.name,
      strength: x.strength,
      form: x.form,
      qty: x.qty,
      instructions: x.instructions,
    })),
  };
}

function Meta({ label, value }) {
  return (
    <div
      style={{
        backgroundColor: "rgba(2,6,23,0.9)",
        borderRadius: "0.85rem",
        padding: "0.85rem 0.9rem",
        border: "1px solid rgba(51,65,85,0.8)",
      }}
    >
      <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)" }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 900, color: "#e5e7eb" }}>
        {value}
      </div>
    </div>
  );
}

function safeDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

// styles
const panel = {
  marginTop: "1rem",
  backgroundColor: "rgba(15,23,42,0.96)",
  borderRadius: "1rem",
  border: "1px solid rgba(51,65,85,0.95)",
  padding: "1.15rem 1.2rem",
};

const panelTitle = {
  margin: 0,
  fontSize: "1rem",
  color: "#e5e7eb",
};

const ghostBtn = {
  padding: "0.45rem 0.75rem",
  borderRadius: "0.75rem",
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(2,6,23,0.75)",
  color: "rgba(229,231,235,0.95)",
  fontWeight: 900,
  cursor: "pointer",
};

const lineCard = {
  backgroundColor: "rgba(2,6,23,0.9)",
  borderRadius: "0.9rem",
  border: "1px solid rgba(51,65,85,0.95)",
  padding: "0.85rem 0.9rem",
};
