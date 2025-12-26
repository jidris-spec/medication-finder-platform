// src/pages/doctor/NewPrescription.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function NewPrescription() {
  const navigate = useNavigate();

  // auth (simple: read once)
  const [userId, setUserId] = useState(null);
  const [authError, setAuthError] = useState(null);

  // patient
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");

  // inventory
  const [meds, setMeds] = useState([]);
  const [loadingMeds, setLoadingMeds] = useState(true);
  const [medError, setMedError] = useState(null);

  // line editor
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [qty, setQty] = useState(1);
  const [instructions, setInstructions] = useState("Take as directed");

  // draft lines
  const [items, setItems] = useState([]);

  // saving state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // 1) get session once
  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setAuthError(null);
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error) {
        setAuthError(error.message || "Failed to read auth session.");
        setUserId(null);
        return;
      }

      const id = data?.session?.user?.id ?? null;
      setUserId(id);

      if (!id) {
        setAuthError("You are not logged in. Please login as a doctor.");
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) load inventory
  useEffect(() => {
    let cancelled = false;

    async function loadMeds() {
      setLoadingMeds(true);
      setMedError(null);

      const { data, error } = await supabase
        .from("pharmacy")
        .select("id, name")
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error) {
        setMedError(error.message || "Failed to load inventory");
        setMeds([]);
      } else {
        setMeds(Array.isArray(data) ? data : []);
      }

      setLoadingMeds(false);
    }

    loadMeds();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMed = useMemo(() => {
    if (!selectedMedicineId) return null;
    return meds.find((m) => String(m.id) === String(selectedMedicineId)) || null;
  }, [meds, selectedMedicineId]);

  function addLine() {
    setSaveError(null);
    if (!selectedMedicineId || !selectedMed) return;

    const safeQty = Number.isFinite(Number(qty)) ? Math.max(1, Number(qty)) : 1;
    const safeInstructions = (instructions || "").trim() || "Take as directed";

    setItems((prev) => [
      ...prev,
      {
        medicine_id: selectedMed.id,
        medicine_name: selectedMed.name,
        qty: safeQty,
        instructions: safeInstructions,
      },
    ]);

    setSelectedMedicineId("");
    setQty(1);
    setInstructions("Take as directed");
  }

  function removeLine(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveDraft() {
    setSaveError(null);

    if (!userId) {
      setSaveError("No auth session. Please login again.");
      return;
    }
    if (!patientName.trim()) {
      setSaveError("Patient name is required.");
      return;
    }
    if (items.length === 0) {
      setSaveError("Add at least one medicine line before saving.");
      return;
    }

    setSaving(true);

    try {
      // 1) insert prescription
      const { data: rx, error: rxErr } = await supabase
        .from("prescriptions")
        .insert({
          patient_name: patientName.trim(),
          patient_id: (patientId || "").trim() || null,
          status: "draft",
          doctor_id: userId, // must exist in table + RLS policy must allow it
        })
        .select("id")
        .single();

      if (rxErr) throw new Error(rxErr.message || "Failed to create prescription draft");

      const prescriptionId = rx?.id;
      if (!prescriptionId) throw new Error("No prescription id returned from Supabase.");

      // 2) insert items
      const payload = items.map((it) => ({
        prescription_id: prescriptionId,
        medicine_id: it.medicine_id,
        qty: it.qty,
        instructions: it.instructions,
      }));

      const { error: itemsErr } = await supabase.from("prescription_items").insert(payload);
      if (itemsErr) throw new Error(itemsErr.message || "Failed to save prescription items");

      // reset + navigate
      setItems([]);
      setPatientName("");
      setPatientId("");
      navigate("/doctor");
    } catch (e) {
      setSaveError(e?.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/doctor" style={{ textDecoration: "none" }}>
          ← Back to Doctor Dashboard
        </Link>
      </div>

      <h1 style={{ marginBottom: 8 }}>New Prescription</h1>

      {authError && (
        <div style={{ marginTop: 12, marginBottom: 12, color: "#ff8a8a" }}>
          <b>Auth:</b> {authError}{" "}
          <button type="button" onClick={() => navigate("/login")} style={{ marginLeft: 8 }}>
            Go to login
          </button>
        </div>
      )}

      {/* Patient */}
      <section
        style={{
          padding: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          marginTop: 16,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Patient</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient name" />
          <input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Patient ID" />
        </div>
      </section>

      {/* Add medicine */}
      <section
        style={{
          padding: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          marginTop: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ marginTop: 0 }}>Add medicine</h3>
          <div style={{ opacity: 0.8 }}>{loadingMeds ? "Loading…" : `${meds.length} loaded`}</div>
        </div>

        {medError && (
          <div style={{ marginBottom: 12, color: "#ff8a8a" }}>
            <b>Inventory load error:</b> {medError}
          </div>
        )}

        <label>
          Select medicine
          <select
            value={selectedMedicineId}
            onChange={(e) => setSelectedMedicineId(e.target.value)}
            disabled={loadingMeds || meds.length === 0}
            style={{ display: "block", width: "100%", marginTop: 6 }}
          >
            <option value="">— Choose —</option>
            {meds.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 180px", gap: 12, alignItems: "end", marginTop: 12 }}>
          <label>
            Qty
            <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }} />
          </label>

          <label>
            Instructions
            <input value={instructions} onChange={(e) => setInstructions(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }} />
          </label>

          <button type="button" onClick={addLine} disabled={!selectedMedicineId || !selectedMed} style={{ height: 40 }}>
            Add line
          </button>
        </div>
      </section>

      {/* Lines */}
      <section
        style={{
          padding: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          marginTop: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ marginTop: 0 }}>Lines</h3>
          <div style={{ opacity: 0.8 }}>{items.length} items</div>
        </div>

        {items.length === 0 ? (
          <p style={{ opacity: 0.8 }}>No lines yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((it, idx) => (
              <div
                key={`${it.medicine_id}-${idx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 1fr 100px",
                  gap: 10,
                  padding: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <div>
                  <b>{it.medicine_name}</b>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>ID: {String(it.medicine_id)}</div>
                </div>
                <div>Qty: {it.qty}</div>
                <div style={{ opacity: 0.9 }}>{it.instructions}</div>
                <button type="button" onClick={() => removeLine(idx)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {saveError && (
          <div style={{ marginTop: 12, color: "#ff8a8a" }}>
            <b>Save error:</b> {saveError}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button type="button" onClick={saveDraft} disabled={saving || items.length === 0 || !userId}>
            {saving ? "Saving…" : "Save Draft"}
          </button>
        </div>
      </section>
    </div>
  );
}
