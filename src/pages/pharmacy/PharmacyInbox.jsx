// src/pages/pharmacy/PharmacyInbox.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  STATUS,
  fulfillPrescriptionAtomic,
  pharmacyDecision,
} from "../../data/prescriptionsApi";

// Matching rule between prescription item and inventory row (fallback)
function makeKey(name, strength, form) {
  return `${String(name || "").trim().toLowerCase()}|${String(strength || "")
    .trim()
    .toLowerCase()}|${String(form || "").trim().toLowerCase()}`;
}

const REJECTION_CODES = [
  { value: "out_of_stock", label: "Out of stock" },
  { value: "insufficient_stock", label: "Insufficient stock" },
  { value: "not_found", label: "Medicine not found" },
  { value: "expired_batches_only", label: "Only expired batches" },
  { value: "invalid_prescription", label: "Invalid prescription" },
  { value: "other", label: "Other" },
];

function normalizeStatus(s) {
  return String(s || "").trim().toLowerCase();
}

export default function PharmacyInbox() {
  const [items, setItems] = useState([]);

  // inventory (Supabase)
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);

  // loading/error
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingInv, setLoadingInv] = useState(true);
  const [error, setError] = useState(null);

  // prevent double actions per prescription
  const [actingId, setActingId] = useState(null);

  // Reject modal state (structured)
  const [rejecting, setRejecting] = useState(null); // prescription object
  const [rejectCode, setRejectCode] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;

    (async () => {
      setError(null);
      await Promise.all([loadInbox(), loadInventory()]);
    })();

    return () => {
      aliveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setError(null);
    await Promise.all([loadInbox(), loadInventory()]);
  }

  async function loadInbox() {
    setLoadingInbox(true);
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
      // ✅ only canonical status
      .eq("status", STATUS.SENT)
      .order("sent_at", { ascending: false, nullsFirst: false });

    if (!aliveRef.current) return;

    if (err) {
      setError(err.message);
      setItems([]);
      setLoadingInbox(false);
      return;
    }

    const normalized =
      (data || []).map((p) => ({
        id: p.id,
        patientId: p.patient_id,
        patientName: p.patient_name,
        status: normalizeStatus(p.status), // normalize for UI safety
        createdAt: p.created_at,
        sentAt: p.sent_at,
        pharmacyAt: p.pharmacy_at,
        rejectionReason: p.rejection_reason,
        items: (p.prescription_items || []).map((x) => ({
          id: x.id,
          medicineId: x.medicine_id,
          name: x.name,
          strength: x.strength,
          form: x.form,
          qty: x.qty,
          instructions: x.instructions,
        })),
      })) || [];

    setItems(normalized);
    setLoadingInbox(false);
  }

  async function loadInventory() {
    setLoadingInv(true);
    setError(null);

    const [
      { data: meds, error: medsError },
      { data: batchData, error: batchError },
    ] = await Promise.all([
      supabase.from("medicines").select("id,name,strength,form"),
      supabase
        .from("batches")
        .select("id,medicine_id,quantity,expiry_date,created_at"),
    ]);

    if (!aliveRef.current) return;

    if (medsError) {
      setError(medsError.message);
      setMedicines([]);
      setLoadingInv(false);
      return;
    }

    if (batchError) {
      setError(batchError.message);
      setBatches([]);
      setLoadingInv(false);
      return;
    }

    setMedicines(meds || []);
    setBatches(batchData || []);
    setLoadingInv(false);
  }

  // ------------------------
  // INVENTORY INDEXES
  // ------------------------
  const medicineById = useMemo(() => {
    const map = new Map();
    for (const m of medicines) map.set(String(m.id), m);
    return map;
  }, [medicines]);

  const inventoryIndex = useMemo(() => {
    const map = new Map();
    for (const m of medicines) {
      const key = makeKey(m.name, m.strength, m.form);
      map.set(key, m);
    }
    return map;
  }, [medicines]);

  const stockByMedicineId = useMemo(() => {
    const map = new Map();
    for (const b of batches) {
      const mid = String(b.medicine_id);
      const qty = Number(b.quantity || 0);
      map.set(mid, (map.get(mid) || 0) + qty);
    }
    return map;
  }, [batches]);

  function getTotalStockByMedicineId(medicineId) {
    return stockByMedicineId.get(String(medicineId)) || 0;
  }

  // ------------------------
  // AVAILABILITY PER PRESCRIPTION
  // ------------------------
  function getAvailabilityForPrescription(p) {
    const lines = Array.isArray(p.items) ? p.items : [];

    const results = lines.map((line) => {
      let med = null;

      if (line.medicineId) {
        med = medicineById.get(String(line.medicineId)) || null;
      }

      if (!med) {
        const key = makeKey(line.name, line.strength, line.form);
        med = inventoryIndex.get(key) || null;
      }

      if (!med) {
        return {
          ...line,
          match: null,
          availableQty: 0,
          ok: false,
          reason: "Not found in medicines table",
        };
      }

      const available = getTotalStockByMedicineId(med.id);
      const needed = Number(line.qty || 0);
      const ok = available >= needed;

      return {
        ...line,
        match: med,
        availableQty: available,
        ok,
        reason: ok ? "In stock" : "Insufficient stock",
      };
    });

    const canFulfill =
      results.length > 0 &&
      results.every((x) => Number(x.availableQty || 0) >= Number(x.qty || 0));

    const missing = results
      .filter((r) => !r.ok)
      .map((r) => {
        if (!r.match)
          return `${r.name} ${r.strength || ""} ${r.form || ""} (not found)`.trim();
        return `${r.name} ${r.strength || ""} ${r.form || ""} (need ${r.qty}, have ${r.availableQty})`.trim();
      });

    return { results, canFulfill, missing };
  }

  function computeSuggestedReject(missing) {
    if (!missing || missing.length === 0) {
      return { code: "other", note: "" };
    }

    const anyNotFound = missing.some((m) => m.toLowerCase().includes("not found"));
    const code = anyNotFound ? "not_found" : "insufficient_stock";

    // keep note short (DB also trims)
    const note = missing.join(", ").slice(0, 140);
    return { code, note };
  }

  // ------------------------
  // REJECT (structured + DB enforced)
  // ------------------------
  function openRejectModal(p, missing) {
    const sug = computeSuggestedReject(missing);
    setRejecting(p);
    setRejectCode(sug.code);
    setRejectNote(sug.note);
    setError(null);
  }

  function closeRejectModal() {
    setRejecting(null);
    setRejectCode("");
    setRejectNote("");
  }

  async function submitReject() {
    if (!rejecting) return;
    if (actingId) return;

    if (!rejectCode) {
      setError("Please select a rejection reason.");
      return;
    }

    const reason = rejectNote?.trim()
      ? `${rejectCode} | ${rejectNote.trim()}`
      : rejectCode;

    setActingId(rejecting.id);
    setError(null);

    try {
      await pharmacyDecision({
        id: rejecting.id,
        action: "REJECT",
        reason,
      });

      closeRejectModal();
      await Promise.all([loadInbox(), loadInventory()]);
    } catch (e) {
      setError(e?.message || "Failed to reject prescription.");
    } finally {
      setActingId(null);
    }
  }

  // ------------------------
  // ATOMIC FULFILL (RPC)
  // ------------------------
  async function handleFulfill(prescriptionId) {
    if (actingId) return;

    setActingId(prescriptionId);
    setError(null);

    try {
      await fulfillPrescriptionAtomic(prescriptionId, "Show ID at counter");
      await Promise.all([loadInbox(), loadInventory()]);
    } catch (e) {
      setError(e?.message || "Failed to fulfill prescription.");
    } finally {
      setActingId(null);
    }
  }

  // ------------------------
  // UI
  // ------------------------
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "1.25rem 0" }}>
      <Link
        to="/pharmacy"
        style={{ color: "#93c5fd", textDecoration: "none", fontSize: "0.9rem" }}
      >
        ← Back to Pharmacy Dashboard
      </Link>

      <h1 style={{ marginTop: "1rem" }}>Pharmacy Inbox</h1>
      <p style={{ marginTop: 0, color: "rgba(148,163,184,0.95)" }}>
        Prescriptions sent by doctors and awaiting action. Fulfillment is locked
        unless all items are available in inventory.
      </p>

      <div style={summaryCard}>
        <div>
          {loadingInv ? (
            <span>Loading inventory…</span>
          ) : (
            <span>
              Inventory loaded: <strong>{medicines.length}</strong> medicine(s),{" "}
              <strong>{batches.length}</strong> batch(es).
            </span>
          )}
          {" · "}
          {loadingInbox ? (
            <span>Loading inbox…</span>
          ) : (
            <span>
              Inbox: <strong>{items.length}</strong> prescription(s) {STATUS.SENT}.
            </span>
          )}

          {actingId ? (
            <div style={{ marginTop: 6, color: "rgba(148,163,184,0.95)" }}>
              Updating prescription…
            </div>
          ) : null}

          {error ? (
            <div style={{ marginTop: 6, color: "rgba(248,113,113,0.95)" }}>
              Error: {error}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={loadAll}
          style={ghostBtn}
          disabled={loadingInv || loadingInbox || !!actingId}
        >
          Refresh
        </button>
      </div>

      {loadingInbox ? (
        <div style={{ marginTop: "1rem", color: "rgba(148,163,184,0.95)" }}>
          Loading inbox…
        </div>
      ) : items.length === 0 ? (
        <div style={{ marginTop: "1rem", color: "rgba(148,163,184,0.95)" }}>
          Inbox empty. No prescriptions sent yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((p) => {
            const { results, canFulfill, missing } = getAvailabilityForPrescription(p);
            const isActing = actingId === p.id;

            return (
              <div key={p.id} style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={{ fontWeight: 900, color: "#e5e7eb" }}>
                      {p.patientName} ·{" "}
                      <span style={{ color: "rgba(148,163,184,0.95)" }}>
                        {p.patientId}
                      </span>
                    </div>
                    <div style={subText}>
                      {p.items?.length ?? 0} medicine(s) · Sent{" "}
                      {p.sentAt ? new Date(p.sentAt).toLocaleString() : ""}
                    </div>
                  </div>

                  <span style={chip}>{STATUS.SENT}</span>
                </div>

                <div
                  style={{
                    marginTop: "0.9rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {results.map((line) => {
                    const ok = line.ok;
                    const badge = ok ? "✅" : line.match ? "⚠️" : "❌";

                    return (
                      <div
                        key={`${line.id}-${line.name}-${line.strength}-${line.form}`}
                        style={lineCard}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: "#e5e7eb" }}>
                            {badge} {line.name}
                            {line.strength ? ` · ${line.strength}` : ""}{" "}
                            {line.form ? ` · ${line.form}` : ""}
                          </div>

                          <div style={lineMeta}>
                            Needed: <strong>{line.qty}</strong>
                            {" · "}
                            Available:{" "}
                            <strong>{line.match ? line.availableQty : "—"}</strong>
                            {" · "}
                            <span
                              style={{
                                color: ok
                                  ? "rgba(34,197,94,0.95)"
                                  : "rgba(248,113,113,0.95)",
                              }}
                            >
                              {line.reason}
                            </span>
                          </div>

                          {line.medicineId ? (
                            <div style={idText}>medicineId: {line.medicineId}</div>
                          ) : null}
                        </div>

                        <div style={lineRight}>
                          {line.instructions ? `“${line.instructions}”` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={actions}>
                  <button
                    onClick={() => openRejectModal(p, missing)}
                    style={dangerBtn}
                    disabled={loadingInv || !!actingId}
                  >
                    {isActing ? "Updating…" : "Reject"}
                  </button>

                  <button
                    onClick={() => handleFulfill(p.id)}
                    disabled={loadingInv || !canFulfill || !!actingId}
                    style={{
                      ...successBtn,
                      opacity: loadingInv || !canFulfill || !!actingId ? 0.45 : 1,
                      cursor:
                        loadingInv || !canFulfill || !!actingId
                          ? "not-allowed"
                          : "pointer",
                    }}
                    title={
                      loadingInv
                        ? "Wait for inventory to load"
                        : canFulfill
                        ? "All items available"
                        : "Cannot fulfill: missing/insufficient stock"
                    }
                  >
                    {isActing ? "Updating…" : "Fulfill"}
                  </button>
                </div>

                {!canFulfill && !loadingInv && (
                  <div style={lockedText}>
                    Fulfillment locked: not all items are available.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* -------- Reject Modal (structured) -------- */}
      {rejecting ? (
        <div style={modalOverlay} onClick={closeRejectModal}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: "#e5e7eb" }}>Reject prescription</h3>
                <div style={{ marginTop: 6, color: "rgba(148,163,184,0.95)", fontSize: 13 }}>
                  Patient: <strong style={{ color: "#e5e7eb" }}>{rejecting.patientName}</strong>
                </div>
              </div>
              <button type="button" onClick={closeRejectModal} style={modalCloseBtn}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={label}>Reason code (required)</label>
              <select
                value={rejectCode}
                onChange={(e) => setRejectCode(e.target.value)}
                style={select}
              >
                <option value="">Select reason</option>
                {REJECTION_CODES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={label}>Details (optional, max 140 chars)</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                style={textarea}
                placeholder="e.g. Ibuprofen 400mg tablet (need 3, have 0)"
                maxLength={140}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: "rgba(148,163,184,0.85)" }}>
                {rejectNote.length}/140
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button type="button" onClick={closeRejectModal} style={ghostBtn}>
                Cancel
              </button>

              <button
                type="button"
                onClick={submitReject}
                style={{
                  ...dangerBtn,
                  opacity: actingId ? 0.6 : 1,
                  cursor: actingId ? "not-allowed" : "pointer",
                }}
                disabled={!!actingId}
              >
                {actingId ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------- styles ----------------
const summaryCard = {
  marginTop: "0.75rem",
  marginBottom: "1rem",
  padding: "0.85rem 1rem",
  borderRadius: "1rem",
  border: "1px solid rgba(51,65,85,0.95)",
  backgroundColor: "rgba(15,23,42,0.96)",
  color: "rgba(148,163,184,0.95)",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "baseline",
};

const card = {
  backgroundColor: "rgba(15,23,42,0.96)",
  borderRadius: "1rem",
  border: "1px solid rgba(51,65,85,0.95)",
  padding: "1.1rem 1.2rem",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "1rem",
};

const subText = {
  fontSize: "0.82rem",
  color: "rgba(148,163,184,0.95)",
  marginTop: 4,
};

const chip = {
  fontSize: "0.75rem",
  border: "1px solid rgba(148,163,184,0.35)",
  borderRadius: "999px",
  padding: "0.2rem 0.6rem",
  color: "rgba(229,231,235,0.95)",
  whiteSpace: "nowrap",
};

const lineCard = {
  backgroundColor: "rgba(2,6,23,0.9)",
  borderRadius: "0.9rem",
  border: "1px solid rgba(51,65,85,0.95)",
  padding: "0.75rem 0.85rem",
  display: "flex",
  justifyContent: "space-between",
  gap: "1rem",
};

const lineMeta = {
  marginTop: 4,
  fontSize: "0.82rem",
  color: "rgba(148,163,184,0.95)",
};

const idText = {
  marginTop: 4,
  fontSize: 12,
  color: "rgba(148,163,184,0.75)",
};

const lineRight = {
  fontSize: "0.78rem",
  color: "rgba(148,163,184,0.95)",
  whiteSpace: "nowrap",
  alignSelf: "center",
};

const actions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: "0.9rem",
};

const lockedText = {
  marginTop: "0.75rem",
  fontSize: "0.82rem",
  color: "rgba(248,113,113,0.9)",
};

const successBtn = {
  padding: "0.6rem 0.9rem",
  borderRadius: "0.8rem",
  border: "1px solid rgba(34,197,94,0.7)",
  background: "linear-gradient(135deg, #16a34a, #22c55e)",
  color: "white",
  fontWeight: 900,
};

const dangerBtn = {
  padding: "0.6rem 0.9rem",
  borderRadius: "0.8rem",
  border: "1px solid rgba(248,113,113,0.45)",
  background: "rgba(2,6,23,0.8)",
  color: "rgba(248,113,113,0.95)",
  fontWeight: 900,
};

const ghostBtn = {
  padding: "0.55rem 0.85rem",
  borderRadius: "0.8rem",
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(2,6,23,0.75)",
  color: "rgba(229,231,235,0.95)",
  fontWeight: 900,
  cursor: "pointer",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 999,
};

const modalCard = {
  width: "min(560px, 100%)",
  borderRadius: 16,
  border: "1px solid rgba(51,65,85,0.95)",
  background: "rgba(2,6,23,0.98)",
  padding: "1rem 1rem 1.1rem",
  boxShadow: "0 30px 90px rgba(0,0,0,0.6)",
};

const modalCloseBtn = {
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(15,23,42,0.8)",
  color: "rgba(229,231,235,0.95)",
  cursor: "pointer",
  padding: "0.35rem 0.6rem",
  fontWeight: 900,
};

const label = {
  display: "block",
  marginBottom: 6,
  fontSize: 12,
  color: "rgba(148,163,184,0.95)",
  fontWeight: 900,
};

const select = {
  width: "100%",
  padding: "0.6rem 0.7rem",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(15,23,42,0.8)",
  color: "rgba(229,231,235,0.95)",
  outline: "none",
};

const textarea = {
  width: "100%",
  minHeight: 90,
  padding: "0.6rem 0.7rem",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(15,23,42,0.8)",
  color: "rgba(229,231,235,0.95)",
  outline: "none",
  resize: "vertical",
};
