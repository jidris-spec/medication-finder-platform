// src/pages/pharmacy/PharmacyBatches.jsx
import { useEffect, useMemo, useState } from "react";
import { listMedicines } from "../../data/medicinesApi";
import { createBatch, listBatches } from "../../data/batchesApi";

export default function PharmacyBatches() {
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [medicineId, setMedicineId] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [dateReceived, setDateReceived] = useState("");
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setError(null); setOk(null);
    try {
      const [m, b] = await Promise.all([listMedicines(), listBatches()]);
      setMedicines(m || []);
      setBatches(b || []);
      if (!medicineId && (m || []).length) setMedicineId(m[0].id);
    } catch (e) {
      setError(e?.message || "Failed to load inventory.");
    }
  }

  async function onAdd(e) {
    e.preventDefault();
    setError(null); setOk(null);
    try {
      await createBatch({
        medicineId,
        quantity,
        batchNumber: batchNumber || null,
        expiryDate: expiryDate || null,
        dateReceived: dateReceived || null,
      });
      setOk("Batch added.");
      setBatchNumber(""); setExpiryDate(""); setDateReceived(""); setQuantity(10);
      await load();
    } catch (e2) {
      setError(e2?.message || "Failed to add batch.");
    }
  }

  const medicineById = useMemo(() => {
    const map = new Map();
    for (const m of medicines) map.set(m.id, m);
    return map;
  }, [medicines]);

  return (
    <div style={page}>
      <div style={wrap}>
        <h1 style={h1}>Inventory — Batches</h1>

        {error ? <div style={err}>Error: {error}</div> : null}
        {ok ? <div style={okStyle}>{ok}</div> : null}

        <section style={card}>
          <h2 style={h2}>Add stock</h2>

          <form onSubmit={onAdd} style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <select value={medicineId} onChange={(e) => setMedicineId(e.target.value)} style={input}>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.strength ? ` · ${m.strength}` : ""}{m.form ? ` · ${m.form}` : ""}
                </option>
              ))}
            </select>

            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={input} />
            <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} style={input} placeholder="Batch # (optional)" />
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={input} />
            <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} style={input} />

            <button type="submit" style={btn}>Add batch</button>
            <button type="button" onClick={load} style={ghost}>Refresh</button>
          </form>
        </section>

        <section style={card}>
          <h2 style={h2}>Batches</h2>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            {batches.map((b) => {
              const m = medicineById.get(b.medicine_id);
              return (
                <div key={b.id} style={row}>
                  <div style={{ fontWeight: 900, color: "#e5e7eb" }}>
                    {m ? `${m.name}${m.strength ? ` · ${m.strength}` : ""}${m.form ? ` · ${m.form}` : ""}` : "Unknown medicine"}
                    <span style={{ color: "rgba(148,163,184,0.95)", fontWeight: 600 }}> · Qty: {b.quantity}</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "rgba(148,163,184,0.85)" }}>
                    batch: {b.batch_number || "—"} · expiry: {b.expiry_date || "—"} · received: {b.date_received || "—"}
                  </div>
                </div>
              );
            })}
            {batches.length === 0 ? <div style={empty}>No stock yet.</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

const page = { minHeight: "calc(100vh - 60px)", padding: "2.5rem 2rem", background: "#020617", display: "flex", justifyContent: "center" };
const wrap = { width: "100%", maxWidth: 1120 };
const h1 = { margin: 0, color: "#e5e7eb" };
const h2 = { margin: 0, color: "#e5e7eb", fontSize: "1rem" };
const card = { marginTop: 14, borderRadius: "1rem", border: "1px solid rgba(51,65,85,0.95)", padding: "1.1rem", background: "rgba(15,23,42,0.96)" };
const input = { width: "100%", padding: "0.65rem 0.75rem", borderRadius: "0.8rem", border: "1px solid rgba(51,65,85,0.95)", backgroundColor: "rgba(2,6,23,0.9)", color: "#e5e7eb", outline: "none" };
const btn = { padding: "0.65rem 1rem", borderRadius: "0.85rem", border: "1px solid rgba(148,163,184,0.35)", background: "rgba(2,6,23,0.85)", color: "rgba(229,231,235,0.95)", fontWeight: 900, cursor: "pointer" };
const ghost = { ...btn, background: "rgba(2,6,23,0.65)" };
const row = { borderRadius: "0.95rem", border: "1px solid rgba(148,163,184,0.25)", background: "rgba(2,6,23,0.7)", padding: "0.85rem 0.9rem" };
const empty = { padding: "0.9rem", borderRadius: "0.9rem", border: "1px dashed rgba(51,65,85,0.95)", color: "rgba(148,163,184,0.95)" };
const err = { marginTop: 10, color: "rgba(248,113,113,0.95)" };
const okStyle = { marginTop: 10, color: "rgba(34,197,94,0.95)" };
