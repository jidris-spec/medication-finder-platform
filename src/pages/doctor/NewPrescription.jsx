// src/pages/doctor/NewPrescription.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { listMedicines } from "../../data/medicinesApi";
import { STATUS } from "../../data/prescriptionsApi"; // ✅ use canonical statuses

export default function NewPrescription() {
  const navigate = useNavigate();

  // Patient fields
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");

  // Medicines catalog
  const [medicines, setMedicines] = useState([]);
  const [medError, setMedError] = useState(null);
  const [loadingMeds, setLoadingMeds] = useState(false);

  // Line inputs
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [qty, setQty] = useState(1);
  const [instructions, setInstructions] = useState("Take as directed");

  // Lines
  const [lines, setLines] = useState([]);

  // Save state
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load medicines on mount
  useEffect(() => {
    loadMedicines();
  }, []);

  async function loadMedicines() {
    setMedError(null);
    setLoadingMeds(true);
    try {
      const data = await listMedicines(); // ✅ pharmacy-owned catalog
      setMedicines(data || []);
    } catch (e) {
      setMedicines([]);
      setMedError(e?.message || "Failed to load medicines catalog.");
    } finally {
      setLoadingMeds(false);
    }
  }

  const medicineById = useMemo(() => {
    const map = new Map();
    for (const m of medicines) map.set(m.id, m);
    return map;
  }, [medicines]);

  function addLine() {
    setError(null);

    if (!selectedMedicineId) {
      setError("Select a medicine.");
      return;
    }

    const med = medicineById.get(selectedMedicineId);
    if (!med) {
      setError("Selected medicine not found. Refresh medicines.");
      return;
    }

    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) {
      setError("Quantity must be a positive number.");
      return;
    }

    const instr = String(instructions || "").trim();

    // Prevent duplicate same medicine (recommended)
    const exists = lines.some((l) => String(l.medicine_id) === String(med.id));
    if (exists) {
      setError("This medicine is already added. Remove it first if you want to change quantity.");
      return;
    }

    setLines((prev) => [
      ...prev,
      {
        medicine_id: med.id,
        name: med.name,
        strength: med.strength || null,
        form: med.form || null,
        qty: q,
        instructions: instr || "Take as directed",
      },
    ]);

    // Reset line fields
    setSelectedMedicineId("");
    setQty(1);
    setInstructions("Take as directed");
  }

  function removeLine(index) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveDraft() {
    setError(null);

    const pName = String(patientName || "").trim();
    const pId = String(patientId || "").trim();

    if (!pName || !pId) {
      setError("Patient name and patient ID are required.");
      return;
    }

    if (lines.length === 0) {
      setError("Add at least one medicine line.");
      return;
    }

    setSaving(true);

    try {
      // 1) Ensure logged in doctor exists
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;

      console.log("AUTH USER:", user);
      if (authError) console.log("AUTH ERROR:", authError);

      if (authError || !user) {
        throw new Error("You must be logged in as a doctor to create a prescription.");
      }

      // 2) Create prescription (Draft)
      // ✅ FIX: status must be lowercase "draft" (use STATUS.DRAFT)
      const payload = {
        patient_name: pName,
        patient_id: pId,

        // Required by your schema:
        doctor_user_id: user.id,

        // If your schema ALSO requires patient_user_id, you must supply it
        // patient_user_id: somePatientUserId,

        status: STATUS.DRAFT, // ✅ "draft"
      };

      console.log("PRESCRIPTION INSERT PAYLOAD:", payload);

      const { data: prescription, error: insertError } = await supabase
        .from("prescriptions")
        .insert([payload]) // ✅ array form is safest
        .select("id,status,created_at,doctor_user_id,patient_id,patient_name")
        .single();

      console.log("PRESCRIPTION INSERT DATA:", prescription);
      console.log("PRESCRIPTION INSERT ERROR:", insertError);

      if (insertError) throw insertError;
      if (!prescription?.id) throw new Error("Prescription insert succeeded but no id returned.");

      // 3) Create prescription items
      const itemsPayload = lines.map((l) => ({
        prescription_id: prescription.id,
        medicine_id: l.medicine_id,
        name: l.name,
        strength: l.strength,
        form: l.form,
        qty: l.qty,
        instructions: l.instructions,
      }));

      console.log("ITEMS INSERT PAYLOAD:", itemsPayload);

      const { error: itemsError } = await supabase
        .from("prescription_items")
        .insert(itemsPayload);

      console.log("ITEMS INSERT ERROR:", itemsError);
      if (itemsError) throw itemsError;

      // Success
      navigate("/doctor");
    } catch (e) {
      console.error("SAVE DRAFT ERROR:", e);

      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("row-level security")) {
        setError(
          "Blocked by Supabase RLS policy. You must allow doctors to insert into prescriptions/prescription_items (or temporarily allow authenticated users during dev)."
        );
      } else {
        setError(e?.message || "Failed to save prescription.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={page}>
      <Link to="/doctor" style={backLink}>
        ← Back to Doctor Dashboard
      </Link>

      <h1 style={h1}>New Prescription</h1>

      {error ? <div style={err}>{error}</div> : null}

      {/* Patient */}
      <section style={card}>
        <h2 style={title}>Patient</h2>
        <input
          style={input}
          placeholder="Patient name"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
        />
        <input
          style={input}
          placeholder="Patient ID"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        />
      </section>

      {/* Add medicine */}
      <section style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <h2 style={title}>Add medicine</h2>
          <button type="button" onClick={loadMedicines} style={ghostBtn}>
            Refresh catalog
          </button>
        </div>

        {medError ? <div style={{ ...err, marginTop: 8 }}>{medError}</div> : null}

        <select
          style={input}
          value={selectedMedicineId}
          onChange={(e) => setSelectedMedicineId(e.target.value)}
          disabled={loadingMeds || medicines.length === 0}
        >
          <option value="">
            {loadingMeds
              ? "Loading medicines..."
              : medicines.length === 0
              ? "No medicines in catalog (Pharmacy must add)"
              : "— Choose —"}
          </option>
          {medicines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.strength ? ` · ${m.strength}` : ""}
              {m.form ? ` · ${m.form}` : ""}
            </option>
          ))}
        </select>

        <input
          style={input}
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Qty"
        />

        <input
          style={input}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Instructions"
        />

        <button onClick={addLine} style={btn} disabled={loadingMeds || medicines.length === 0}>
          Add line
        </button>

        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
          Rule: Doctors can only prescribe from the Pharmacy catalog. No free-text medicines.
        </div>
      </section>

      {/* Lines */}
      <section style={card}>
        <h2 style={title}>Lines</h2>

        {lines.length === 0 ? (
          <div style={{ color: "rgba(148,163,184,0.9)" }}>No medicines added yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lines.map((l, i) => (
              <div key={`${l.medicine_id}-${i}`} style={line}>
                <div>
                  <strong style={{ color: "#e5e7eb" }}>
                    {l.name}
                    <span style={{ color: "rgba(148,163,184,0.95)", fontWeight: 600 }}>
                      {l.strength ? ` · ${l.strength}` : ""}
                      {l.form ? ` · ${l.form}` : ""}
                    </span>
                  </strong>
                  <div style={{ marginTop: 4, color: "rgba(148,163,184,0.95)", fontSize: 13 }}>
                    Qty: <strong>{l.qty}</strong>
                    {" · "}
                    {l.instructions ? `Instructions: ${l.instructions}` : "No instructions"}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "rgba(148,163,184,0.75)" }}>
                    medicine_id: <code>{l.medicine_id}</code>
                  </div>
                </div>

                <button onClick={() => removeLine(i)} style={removeBtn}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        onClick={saveDraft}
        disabled={saving}
        style={{ ...btn, marginTop: 18, opacity: saving ? 0.6 : 1 }}
      >
        {saving ? "Saving…" : "Save Draft"}
      </button>
    </div>
  );
}

/* ---------------- styles ---------------- */

const page = {
  minHeight: "100vh",
  padding: "2.5rem",
  backgroundColor: "#020617",
};

const backLink = { color: "#93c5fd", textDecoration: "none" };

const h1 = { marginTop: 16, color: "#e5e7eb" };

const card = {
  marginTop: 16,
  padding: "1.2rem",
  borderRadius: "1rem",
  border: "1px solid rgba(51,65,85,0.95)",
  backgroundColor: "rgba(15,23,42,0.96)",
};

const title = {
  margin: 0,
  marginBottom: 10,
  color: "#e5e7eb",
  fontSize: "1rem",
};

const input = {
  display: "block",
  width: "100%",
  padding: "0.6rem",
  marginTop: 8,
  borderRadius: "0.6rem",
  border: "1px solid rgba(51,65,85,0.95)",
  backgroundColor: "rgba(2,6,23,0.9)",
  color: "#e5e7eb",
  outline: "none",
};

const btn = {
  marginTop: 10,
  padding: "0.6rem 1rem",
  borderRadius: "0.7rem",
  border: "1px solid rgba(148,163,184,0.35)",
  backgroundColor: "rgba(2,6,23,0.85)",
  color: "#e5e7eb",
  fontWeight: 900,
  cursor: "pointer",
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

const line = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  padding: "0.8rem",
  borderRadius: "0.8rem",
  backgroundColor: "rgba(2,6,23,0.85)",
  border: "1px solid rgba(148,163,184,0.2)",
};

const removeBtn = {
  background: "transparent",
  color: "rgba(248,113,113,0.95)",
  border: "none",
  cursor: "pointer",
  fontWeight: 900,
};

const err = { color: "rgba(248,113,113,0.95)", marginTop: 12 };
