// src/pages/doctor/PrescriptionDetails.jsx
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function PrescriptionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Shape we render in UI (camelCase for React)
  const [p, setP] = useState(null);

  const status = p?.status || "Draft";
  const canSend = status === "Draft" && !sending && !deleting && !loading;

  async function fetchPrescription({ signal } = {}) {
    setError(null);

    const { data, error: err } = await supabase
      .from("prescriptions")
      .select(
        `
        id,
        patient_id,
        patient_name,
        status,
        created_at,
        sent_at,
        pharmacy_at,
        rejection_reason,
        pickup_instructions,
        prescription_items (
          id,
          medicine_id,
          name,
          strength,
          form,
          qty,
          instructions
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (signal?.aborted) return { ok: false, aborted: true };

    if (err) return { ok: false, message: err.message, data: null };
    if (!data) return { ok: true, data: null };

    const normalized = {
      id: data.id,
      patientId: data.patient_id,
      patientName: data.patient_name,
      status: data.status,
      createdAt: data.created_at,
      sentAt: data.sent_at,
      pharmacyAt: data.pharmacy_at,
      rejectionReason: data.rejection_reason,
      pickupInstructions: data.pickup_instructions,
      items: (data.prescription_items || []).map((x) => ({
        id: x.id,
        medicineId: x.medicine_id,
        name: x.name,
        strength: x.strength,
        form: x.form,
        qty: x.qty,
        instructions: x.instructions,
      })),
    };

    return { ok: true, data: normalized };
  }

  // Load on id change (no eslint-disable hacks)
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      const res = await fetchPrescription({ signal: controller.signal });

      if (!alive || controller.signal.aborted) return;

      if (!res.ok) {
        setError(res.message || "Failed to load prescription.");
        setP(null);
        setLoading(false);
        return;
      }

      setP(res.data);
      setLoading(false);
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [id]);

  async function refresh() {
    if (loading || sending || deleting) return;
    setRefreshing(true);

    const res = await fetchPrescription();

    if (!res.ok) {
      setError(res.message || "Failed to refresh.");
      setRefreshing(false);
      return;
    }

    setP(res.data);
    setRefreshing(false);
  }

  async function deletePrescription() {
    if (!p) return;
    const ok = window.confirm("Delete this prescription?");
    if (!ok) return;

    setDeleting(true);
    setError(null);

    // Robust delete even if FK cascade is not configured:
    // delete child rows first, then parent.
    const { error: delItemsErr } = await supabase
      .from("prescription_items")
      .delete()
      .eq("prescription_id", p.id);

    if (delItemsErr) {
      setDeleting(false);
      setError(delItemsErr.message);
      return;
    }

    const { error: delHeaderErr } = await supabase
      .from("prescriptions")
      .delete()
      .eq("id", p.id);

    setDeleting(false);

    if (delHeaderErr) {
      setError(delHeaderErr.message);
      return;
    }

    navigate("/doctor/prescriptions");
  }

  async function sendToPharmacy() {
    if (!p) return;
    if (p.status !== "Draft") return;

    setSending(true);
    setError(null);

    const now = new Date().toISOString();

    const { error: upErr } = await supabase
      .from("prescriptions")
      .update({
        status: "Sent",
        sent_at: now,
      })
      .eq("id", p.id);

    if (upErr) {
      setSending(false);
      setError(upErr.message);
      return;
    }

    // Reload from DB so UI is always truth
    const res = await fetchPrescription();
    if (!res.ok) {
      setSending(false);
      setError(res.message || "Sent, but failed to reload.");
      return;
    }

    setP(res.data);
    setSending(false);
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: "rgba(148,163,184,0.95)" }}>
        Loading prescription…
      </div>
    );
  }

  if (!p) {
    return (
      <div style={{ padding: "2rem", color: "#e5e7eb" }}>
        Prescription not found.
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        padding: "2.5rem 2rem",
        backgroundColor: "#020617",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "980px",
          backgroundColor: "rgba(15,23,42,0.96)",
          borderRadius: "1.2rem",
          border: "1px solid rgba(148,163,184,0.45)",
          padding: "2rem",
        }}
      >
        <Link
          to="/doctor/prescriptions"
          style={{
            color: "#93c5fd",
            fontSize: "0.85rem",
            textDecoration: "none",
          }}
        >
          ← Back to Prescriptions
        </Link>

        {error ? (
          <div
            style={{
              marginTop: "0.9rem",
              padding: "0.85rem 1rem",
              borderRadius: "1rem",
              border: "1px solid rgba(248,113,113,0.35)",
              background: "rgba(2,6,23,0.75)",
              color: "rgba(248,113,113,0.95)",
            }}
          >
            Error: {error}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "#e5e7eb",
                margin: 0,
              }}
            >
              Prescription
            </h1>

            <p style={{ color: "#9ca3af", marginTop: "0.35rem" }}>
              {p.patientName} · {p.patientId}
            </p>
          </div>

          <span
            style={{
              fontSize: "0.8rem",
              color: "rgba(148,163,184,0.95)",
              border: "1px solid rgba(148,163,184,0.25)",
              borderRadius: "999px",
              padding: "0.2rem 0.65rem",
              whiteSpace: "nowrap",
            }}
          >
            {p.status}
          </span>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
            marginTop: "0.75rem",
          }}
        >
          <button
            type="button"
            onClick={deletePrescription}
            disabled={deleting || sending}
            style={{
              padding: "0.55rem 0.9rem",
              borderRadius: "0.8rem",
              border: "1px solid rgba(248,113,113,0.45)",
              background: "rgba(2,6,23,0.8)",
              color: "rgba(248,113,113,0.95)",
              fontWeight: 800,
              cursor: deleting || sending ? "not-allowed" : "pointer",
              opacity: deleting || sending ? 0.6 : 1,
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>

          <button
            type="button"
            onClick={sendToPharmacy}
            disabled={!canSend}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: "0.8rem",
              border: "1px solid rgba(56,189,248,0.55)",
              background:
                "linear-gradient(135deg, rgba(56,189,248,0.9), rgba(59,130,246,0.85))",
              color: "white",
              fontWeight: 900,
              cursor: canSend ? "pointer" : "not-allowed",
              opacity: canSend ? 1 : 0.45,
            }}
            title={canSend ? "Send to Pharmacy" : "Only Draft can be sent"}
          >
            {sending ? "Sending…" : "Send to Pharmacy"}
          </button>
        </div>

        {/* Pharmacy outcome panel */}
        <section
          style={{
            marginTop: "1rem",
            backgroundColor: "rgba(2,6,23,0.9)",
            borderRadius: "1rem",
            border: "1px solid rgba(51,65,85,0.9)",
            padding: "1rem",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#e5e7eb", fontSize: "0.95rem" }}>
            Pharmacy status
          </h3>

          <p style={{ margin: 0, color: "rgba(148,163,184,0.95)" }}>
            Status: <strong style={{ color: "#e5e7eb" }}>{p.status}</strong>
          </p>

          {p.sentAt && (
            <p style={{ marginTop: "0.4rem", color: "rgba(148,163,184,0.95)" }}>
              Sent: {new Date(p.sentAt).toLocaleString()}
            </p>
          )}

          {p.pharmacyAt && (
            <p style={{ marginTop: "0.4rem", color: "rgba(148,163,184,0.95)" }}>
              Updated: {new Date(p.pharmacyAt).toLocaleString()}
            </p>
          )}

          {p.status === "Rejected" && p.rejectionReason ? (
            <div
              style={{
                marginTop: "0.6rem",
                padding: "0.75rem",
                borderRadius: "0.85rem",
                border: "1px solid rgba(248,113,113,0.35)",
                color: "rgba(248,113,113,0.95)",
                background: "rgba(2,6,23,0.75)",
              }}
            >
              <strong>Rejection reason:</strong> {p.rejectionReason}
            </div>
          ) : null}

          {p.status === "Fulfilled" && p.pickupInstructions ? (
            <div
              style={{
                marginTop: "0.6rem",
                padding: "0.75rem",
                borderRadius: "0.85rem",
                border: "1px solid rgba(34,197,94,0.35)",
                color: "rgba(34,197,94,0.95)",
                background: "rgba(2,6,23,0.75)",
              }}
            >
              <strong>Pickup instructions:</strong> {p.pickupInstructions}
            </div>
          ) : null}
        </section>

        {/* Medicines */}
        <section
          style={{
            marginTop: "1rem",
            backgroundColor: "rgba(2,6,23,0.9)",
            borderRadius: "1rem",
            border: "1px solid rgba(51,65,85,0.9)",
            padding: "1rem",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#e5e7eb", fontSize: "0.95rem" }}>
            Medicines
          </h3>

          {p.items?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {p.items.map((m) => (
                <div
                  key={m.id}
                  style={{
                    borderRadius: "0.9rem",
                    border: "1px solid rgba(51,65,85,0.9)",
                    background: "rgba(15,23,42,0.9)",
                    padding: "0.8rem 0.9rem",
                  }}
                >
                  <div style={{ fontWeight: 900, color: "#e5e7eb" }}>
                    {m.name}
                    {m.strength ? ` · ${m.strength}` : ""}
                    {m.form ? ` · ${m.form}` : ""}
                  </div>

                  <div style={{ fontSize: "0.85rem", color: "rgba(148,163,184,0.95)" }}>
                    Qty: {m.qty}
                    {m.instructions ? ` · ${m.instructions}` : ""}
                  </div>

                  {m.medicineId ? (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "rgba(148,163,184,0.75)",
                      }}
                    >
                      medicineId: {m.medicineId}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: "rgba(148,163,184,0.95)" }}>
              No medicines on this prescription.
            </p>
          )}
        </section>

        <p style={{ marginTop: "1rem", color: "#9ca3af", fontSize: "0.85rem" }}>
          Created: {p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}
        </p>

        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || sending || deleting}
            style={{
              padding: "0.55rem 0.9rem",
              borderRadius: "0.8rem",
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(2,6,23,0.8)",
              color: "rgba(229,231,235,0.95)",
              fontWeight: 900,
              cursor: refreshing || sending || deleting ? "not-allowed" : "pointer",
              opacity: refreshing || sending || deleting ? 0.6 : 1,
            }}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
    </div>
  );
}
