// src/pages/doctor/PrescriptionDetails.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { listMedicines } from "../../data/medicinesApi";
import {
  updatePrescriptionHeaderDraft,
  replacePrescriptionItemsDraft,
  sendPrescription,
  duplicatePrescriptionAsDraft,
} from "../../data/prescriptionsApi";

function st(s) {
  return String(s || "").trim().toLowerCase();
}

export default function PrescriptionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Loaded prescription (normalized for UI)
  const [p, setP] = useState(null);

  // EDIT MODE
  const [editing, setEditing] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [lines, setLines] = useState([]);

  // Medicines catalog (to add new lines consistently)
  const [medicines, setMedicines] = useState([]);
  const [loadingMeds, setLoadingMeds] = useState(false);

  const status = st(p?.status);
  const canEdit = status === "draft" && !loading && !sending && !deleting;
  const canSend = status === "draft" && !loading && !sending && !deleting;

  const fetchPrescription = useCallback(async () => {
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

    if (err) throw err;
    if (!data) return null;

    return {
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
        medicine_id: x.medicine_id,
        name: x.name,
        strength: x.strength,
        form: x.form,
        qty: x.qty,
        instructions: x.instructions,
      })),
    };
  }, [id]);

  const load = useCallback(async () => {
    setError(null);
    const data = await fetchPrescription();
    setP(data);

    if (data) {
      setPatientName(data.patientName || "");
      setPatientId(data.patientId || "");
      setLines(data.items || []);
      if (st(data.status) !== "draft") setEditing(false);
    }
  }, [fetchPrescription]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load prescription.");
        setP(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  async function refresh() {
    if (loading || sending || deleting) return;
    setRefreshing(true);
    setError(null);
    try {
      await load();
    } catch (e) {
      setError(e?.message || "Failed to refresh.");
    } finally {
      setRefreshing(false);
    }
  }

  async function loadMedicines() {
    setLoadingMeds(true);
    setError(null);
    try {
      const data = await listMedicines();
      setMedicines(data || []);
    } catch (e) {
      setMedicines([]);
      setError(e?.message || "Failed to load medicines.");
    } finally {
      setLoadingMeds(false);
    }
  }

  const medicineById = useMemo(() => {
    const map = new Map();
    for (const m of medicines) map.set(String(m.id), m);
    return map;
  }, [medicines]);

  function startEdit() {
    if (!canEdit) return;
    setEditing(true);
    setError(null);
    if (medicines.length === 0) loadMedicines();
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
    setPatientName(p?.patientName || "");
    setPatientId(p?.patientId || "");
    setLines(p?.items || []);
  }

  function removeLine(index) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function addLineFromMedicineId(medicineId) {
    setError(null);
    if (!medicineId) return;

    const med = medicineById.get(String(medicineId));
    if (!med) {
      setError("Medicine not found in catalog. Refresh catalog.");
      return;
    }

    const exists = lines.some((l) => String(l.medicine_id) === String(med.id));
    if (exists) {
      setError("This medicine is already added.");
      return;
    }

    const tmpId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? `tmp-${crypto.randomUUID()}`
        : `tmp-${Math.random().toString(16).slice(2)}`;

    setLines((prev) => [
      ...prev,
      {
        id: tmpId,
        medicine_id: med.id,
        name: med.name,
        strength: med.strength || null,
        form: med.form || null,
        qty: 1,
        instructions: "Take as directed",
      },
    ]);
  }

  function updateLine(index, patch) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function saveDraftEdits() {
    if (!p) return;

    if (st(p.status) !== "draft") {
      setError("Only draft prescriptions can be edited.");
      return;
    }

    const pn = String(patientName || "").trim();
    const pid = String(patientId || "").trim();

    if (!pn || !pid) {
      setError("Patient name and patient ID are required.");
      return;
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      setError("Add at least one medicine line.");
      return;
    }

    for (const l of lines) {
      const q = Number(l.qty || 0);
      if (!Number.isFinite(q) || q <= 0) {
        setError("Every line must have qty > 0.");
        return;
      }
      if (!l.medicine_id) {
        setError("Every line must have a valid medicine_id (pick from catalog).");
        return;
      }
    }

    setError(null);
    setRefreshing(true);

    try {
      await updatePrescriptionHeaderDraft(p.id, {
        patient_name: pn,
        patient_id: pid,
      });

      await replacePrescriptionItemsDraft(
        p.id,
        lines.map((l) => ({
          medicine_id: l.medicine_id,
          name: l.name,
          strength: l.strength,
          form: l.form,
          qty: l.qty,
          instructions: l.instructions,
        }))
      );

      await load();
      setEditing(false);
    } catch (e) {
      setError(e?.message || "Failed to save draft edits.");
    } finally {
      setRefreshing(false);
    }
  }

  async function deletePrescription() {
    if (!p) return;
    const ok = window.confirm("Delete this prescription?");
    if (!ok) return;

    setDeleting(true);
    setError(null);

    const { error: delItemsErr } = await supabase
      .from("prescription_items")
      .delete()
      .eq("prescription_id", p.id);

    if (delItemsErr) {
      setDeleting(false);
      setError(delItemsErr.message);
      return;
    }

    const { error: delHeaderErr } = await supabase.from("prescriptions").delete().eq("id", p.id);

    setDeleting(false);

    if (delHeaderErr) {
      setError(delHeaderErr.message);
      return;
    }

    navigate("/doctor/prescriptions");
  }

  async function sendToPharmacy() {
    if (!p) return;
    if (st(p.status) !== "draft") return;

    setSending(true);
    setError(null);

    try {
      await sendPrescription(p.id);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to send prescription.");
    } finally {
      setSending(false);
    }
  }

  // ✅ for rejected: create NEW draft, do not edit old
  async function createNewDraftFromRejected() {
    if (!p) return;
    if (st(p.status) !== "rejected") return;

    setRefreshing(true);
    setError(null);
    try {
      const newId = await duplicatePrescriptionAsDraft(p.id);
      navigate(`/doctor/prescriptions/${newId}`);
    } catch (e) {
      setError(e?.message || "Failed to create new draft.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem", color: "rgba(148,163,184,0.95)" }}>Loading…</div>;
  }

  if (!p) {
    return <div style={{ padding: "2rem", color: "#e5e7eb" }}>Prescription not found.</div>;
  }

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", padding: "2.5rem 2rem", backgroundColor: "#020617" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <Link to="/doctor/prescriptions" style={{ color: "#93c5fd", textDecoration: "none" }}>
          ← Back to Prescriptions
        </Link>

        {error ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(248,113,113,0.35)",
              color: "rgba(248,113,113,0.95)",
            }}
          >
            Error: {error}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginTop: 14 }}>
          <h1 style={{ margin: 0, color: "#e5e7eb" }}>Prescription</h1>
          <span style={{ color: "rgba(148,163,184,0.95)" }}>
            Status: <strong style={{ color: "#e5e7eb" }}>{p.status}</strong>
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={refresh} disabled={refreshing || sending || deleting} style={btn}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>

          {/* Draft editing */}
          {editing ? (
            <>
              <button onClick={cancelEdit} disabled={refreshing || sending || deleting} style={btn}>
                Cancel edit
              </button>
              <button onClick={saveDraftEdits} disabled={refreshing || sending || deleting} style={btnPrimary}>
                Save draft changes
              </button>
            </>
          ) : (
            <button onClick={startEdit} disabled={!canEdit} style={{ ...btn, opacity: canEdit ? 1 : 0.45 }}>
              Edit Draft
            </button>
          )}

          {/* Rejected -> create new draft */}
          {st(p.status) === "rejected" ? (
            <button
              onClick={createNewDraftFromRejected}
              disabled={refreshing || sending || deleting}
              style={btnPrimary}
              title="Create a new editable draft from this rejected prescription"
            >
              Create new draft
            </button>
          ) : null}

          <button onClick={deletePrescription} disabled={deleting || sending} style={btnDanger}>
            {deleting ? "Deleting…" : "Delete"}
          </button>

          <button onClick={sendToPharmacy} disabled={!canSend} style={{ ...btnPrimary, opacity: canSend ? 1 : 0.45 }}>
            {sending ? "Sending…" : "Send to Pharmacy"}
          </button>
        </div>

        {/* Patient header fields */}
        <section style={card}>
          <h3 style={h3}>Patient</h3>

          {editing ? (
            <>
              <input style={input} value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient name" />
              <input style={input} value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Patient ID" />
            </>
          ) : (
            <div style={{ color: "rgba(148,163,184,0.95)" }}>
              <strong style={{ color: "#e5e7eb" }}>{p.patientName}</strong> · {p.patientId}
            </div>
          )}
        </section>

        {/* Edit: Add medicines */}
        {editing ? (
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <h3 style={h3}>Add medicine</h3>
              <button onClick={loadMedicines} disabled={loadingMeds} style={btn}>
                {loadingMeds ? "Loading…" : "Refresh catalog"}
              </button>
            </div>

            <select
              style={input}
              defaultValue=""
              onChange={(e) => {
                const mid = e.target.value;
                if (mid) addLineFromMedicineId(mid);
                e.target.value = "";
              }}
              disabled={loadingMeds || medicines.length === 0}
            >
              <option value="">
                {loadingMeds ? "Loading medicines…" : medicines.length === 0 ? "No medicines in catalog" : "— Choose —"}
              </option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.strength ? `· ${m.strength}` : ""} {m.form ? `· ${m.form}` : ""}
                </option>
              ))}
            </select>
          </section>
        ) : null}

        {/* Lines */}
        <section style={card}>
          <h3 style={h3}>Medicines</h3>

          {lines.length === 0 ? (
            <div style={{ color: "rgba(148,163,184,0.95)" }}>No medicines.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {lines.map((l, idx) => (
                <div key={l.id || idx} style={line}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, color: "#e5e7eb" }}>
                      {l.name}{" "}
                      <span style={{ color: "rgba(148,163,184,0.95)", fontWeight: 700 }}>
                        {l.strength ? `· ${l.strength}` : ""} {l.form ? `· ${l.form}` : ""}
                      </span>
                    </div>

                    {editing ? (
                      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
                        <input
                          style={input}
                          type="number"
                          min={1}
                          value={l.qty}
                          onChange={(e) => updateLine(idx, { qty: Number(e.target.value || 1) })}
                        />
                        <input
                          style={input}
                          value={l.instructions || ""}
                          onChange={(e) => updateLine(idx, { instructions: e.target.value })}
                          placeholder="Instructions"
                        />
                      </div>
                    ) : (
                      <div style={{ marginTop: 6, fontSize: 13, color: "rgba(148,163,184,0.95)" }}>
                        Qty: <strong style={{ color: "#e5e7eb" }}>{l.qty}</strong>
                        {l.instructions ? ` · ${l.instructions}` : ""}
                      </div>
                    )}
                  </div>

                  {editing ? (
                    <button onClick={() => removeLine(idx)} style={btnDanger}>
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pharmacy outcome */}
        <section style={card}>
          <h3 style={h3}>Pharmacy status</h3>
          <div style={{ color: "rgba(148,163,184,0.95)" }}>
            Status: <strong style={{ color: "#e5e7eb" }}>{p.status}</strong>
          </div>
          {p.sentAt ? <div style={small}>Sent: {new Date(p.sentAt).toLocaleString()}</div> : null}
          {p.pharmacyAt ? <div style={small}>Updated: {new Date(p.pharmacyAt).toLocaleString()}</div> : null}

          {st(p.status) === "rejected" ? (
            <div style={{ marginTop: 10, color: "rgba(248,113,113,0.95)" }}>
              Rejected: {p.rejectionReason || "No reason provided."}
            </div>
          ) : null}

          {st(p.status) === "fulfilled" ? (
            <div style={{ marginTop: 10, color: "rgba(34,197,94,0.95)" }}>
              Pickup: {p.pickupInstructions || "—"}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

/* styles */
const card = {
  marginTop: 14,
  padding: "1rem",
  borderRadius: 14,
  border: "1px solid rgba(51,65,85,0.95)",
  backgroundColor: "rgba(15,23,42,0.96)",
};
const h3 = { margin: 0, color: "#e5e7eb", fontSize: "0.95rem" };
const small = { marginTop: 6, fontSize: 12, color: "rgba(148,163,184,0.95)" };
const input = {
  width: "100%",
  padding: "0.6rem 0.7rem",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(2,6,23,0.75)",
  color: "rgba(229,231,235,0.95)",
  outline: "none",
  marginTop: 10,
};
const line = {
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  padding: "0.85rem",
  borderRadius: 14,
  border: "1px solid rgba(51,65,85,0.85)",
  background: "rgba(2,6,23,0.75)",
};
const btn = {
  padding: "0.55rem 0.85rem",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(2,6,23,0.85)",
  color: "rgba(229,231,235,0.95)",
  fontWeight: 900,
  cursor: "pointer",
};
const btnPrimary = {
  ...btn,
  border: "1px solid rgba(56,189,248,0.55)",
  background: "linear-gradient(135deg, rgba(56,189,248,0.9), rgba(59,130,246,0.85))",
  color: "white",
};
const btnDanger = {
  ...btn,
  border: "1px solid rgba(248,113,113,0.45)",
  color: "rgba(248,113,113,0.95)",
};
