// src/pages/pharmacy/PharmacyInbox.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../supabaseClient";

// Matching rule between prescription item and inventory row (fallback)
function makeKey(name, strength, form) {
  return `${String(name || "").trim().toLowerCase()}|${String(strength || "")
    .trim()
    .toLowerCase()}|${String(form || "").trim().toLowerCase()}`;
}

export default function PharmacyInbox() {
  // inbox items (Supabase)
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

  // ------------------------
  // LOAD: inbox + inventory
  // ------------------------
  useEffect(() => {
    let alive = true;

    (async () => {
      setError(null);
      await Promise.all([loadInbox(alive), loadInventory(alive)]);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // effect only once; we handle strict mode by guarding with "alive"

  async function loadAll() {
    setError(null);
    await Promise.all([loadInbox(true), loadInventory(true)]);
  }

  async function loadInbox(aliveFlag = true) {
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
      .eq("status", "Sent")
      .order("sent_at", { ascending: false });

    if (!aliveFlag) return;

    if (err) {
      setError(err.message);
      setItems([]);
      setLoadingInbox(false);
      return;
    }

    // Normalize into UI-friendly shape
    const normalized =
      (data || []).map((p) => ({
        id: p.id,
        patientId: p.patient_id,
        patientName: p.patient_name,
        status: p.status,
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

  async function loadInventory(aliveFlag = true) {
    setLoadingInv(true);
    setError(null);

    const [
      { data: meds, error: medsError },
      { data: batchData, error: batchError },
    ] = await Promise.all([
      supabase.from("pharmacy").select("id,name,strength,form"),
      supabase.from("batches").select("id,medicine_id,quantity,expiry_date"),
    ]);

    if (!aliveFlag) return;

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
  const inventoryIndex = useMemo(() => {
    const map = new Map();
    for (const m of medicines) {
      const key = makeKey(m.name, m.strength, m.form);
      if (!key) continue;
      map.set(key, m);
    }
    return map;
  }, [medicines]);

  // total stock per medicine_id (fast lookup)
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

      // prefer medicineId
      if (line.medicineId) {
        med = medicines.find((m) => String(m.id) === String(line.medicineId)) || null;
      }

      // fallback: string matching
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
          reason: "Not found in inventory",
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

    const canFulfill = results.length > 0 && results.every((r) => r.ok);

    const missing = results.filter((r) => !r.ok).map((r) => {
      if (!r.match)
        return `${r.name} ${r.strength || ""} ${r.form || ""} (not found)`.trim();
      return `${r.name} ${r.strength || ""} ${r.form || ""} (need ${r.qty}, have ${r.availableQty})`.trim();
    });

    const suggestedReason =
      missing.length > 0 ? `Not available / insufficient stock: ${missing.join(", ")}` : "";

    return { results, canFulfill, suggestedReason };
  }

  // ------------------------
  // UPDATE STATUS IN SUPABASE
  // ------------------------
  async function updateStatus(prescriptionId, status, reason = "") {
    if (actingId) return; // lock global to prevent spam clicks
    setActingId(prescriptionId);
    setError(null);

    const patch = {
      status,
      pharmacy_at: new Date().toISOString(),
      rejection_reason: status === "Rejected" ? reason : null,
    };

    const { error: err } = await supabase
      .from("prescriptions")
      .update(patch)
      .eq("id", prescriptionId);

    if (err) {
      setError(err.message);
      setActingId(null);
      return;
    }

    await loadInbox(true);
    setActingId(null);
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
        Prescriptions sent by doctors and awaiting action. Fulfillment is locked unless all items are available in inventory.
      </p>

      {/* Status + actions */}
      <div
        style={{
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
        }}
      >
        <div>
          {loadingInv ? (
            <span>Loading inventory from Supabase…</span>
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
              Inbox: <strong>{items.length}</strong> prescription(s) sent.
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
            const { results, canFulfill, suggestedReason } = getAvailabilityForPrescription(p);
            const isActing = actingId === p.id;

            return (
              <div
                key={p.id}
                style={{
                  backgroundColor: "rgba(15,23,42,0.96)",
                  borderRadius: "1rem",
                  border: "1px solid rgba(51,65,85,0.95)",
                  padding: "1.1rem 1.2rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900, color: "#e5e7eb" }}>
                      {p.patientName} ·{" "}
                      <span style={{ color: "rgba(148,163,184,0.95)" }}>
                        {p.patientId}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "rgba(148,163,184,0.95)",
                        marginTop: 4,
                      }}
                    >
                      {p.items?.length ?? 0} medicine(s) · Sent{" "}
                      {p.sentAt ? new Date(p.sentAt).toLocaleString() : ""}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "0.75rem",
                      border: "1px solid rgba(148,163,184,0.35)",
                      borderRadius: "999px",
                      padding: "0.2rem 0.6rem",
                      color: "rgba(229,231,235,0.95)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Sent
                  </span>
                </div>

                {/* Availability lines */}
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
                        style={{
                          backgroundColor: "rgba(2,6,23,0.9)",
                          borderRadius: "0.9rem",
                          border: "1px solid rgba(51,65,85,0.95)",
                          padding: "0.75rem 0.85rem",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "1rem",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: "#e5e7eb" }}>
                            {badge} {line.name}
                            {line.strength ? ` · ${line.strength}` : ""}{" "}
                            {line.form ? ` · ${line.form}` : ""}
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: "0.82rem",
                              color: "rgba(148,163,184,0.95)",
                            }}
                          >
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

                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "rgba(148,163,184,0.95)",
                            whiteSpace: "nowrap",
                            alignSelf: "center",
                          }}
                        >
                          {line.instructions ? `“${line.instructions}”` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: "0.9rem",
                  }}
                >
                  <button
                    onClick={() => {
                      const defaultText = suggestedReason || "Rejected by pharmacy";
                      const reason = window.prompt("Reason for rejection? (required)", defaultText);
                      if (!reason || !reason.trim()) return;
                      updateStatus(p.id, "Rejected", reason.trim());
                    }}
                    style={dangerBtn}
                    disabled={loadingInv || !!error || !!actingId}
                  >
                    {isActing ? "Updating…" : "Reject"}
                  </button>

                  <button
                    onClick={() => updateStatus(p.id, "Fulfilled")}
                    disabled={loadingInv || !!error || !canFulfill || !!actingId}
                    style={{
                      ...successBtn,
                      opacity: loadingInv || !!error || !canFulfill || !!actingId ? 0.45 : 1,
                      cursor:
                        loadingInv || !!error || !canFulfill || !!actingId
                          ? "not-allowed"
                          : "pointer",
                    }}
                    title={
                      loadingInv
                        ? "Wait for inventory to load"
                        : error
                        ? "Fix error first"
                        : canFulfill
                        ? "All items available"
                        : "Cannot fulfill: missing/insufficient stock"
                    }
                  >
                    {isActing ? "Updating…" : "Fulfilled"}
                  </button>
                </div>

                {!canFulfill && !loadingInv && !error && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      fontSize: "0.82rem",
                      color: "rgba(248,113,113,0.9)",
                    }}
                  >
                    Fulfillment locked: not all items are available.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  cursor: "pointer",
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
