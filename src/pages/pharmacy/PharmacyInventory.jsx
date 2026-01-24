// src/pages/pharmacy/PharmacyInventory.jsx
import { useEffect, useMemo, useState } from "react";
import { createMedicine, listMedicines } from "../../data/medicinesApi";

export default function PharmacyInventory() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [form, setForm] = useState("");

  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    setOk(null);
    setLoading(true);
    try {
      const data = await listMedicines();
      setItems(data || []);
    } catch (e) {
      setError(e?.message || "Failed to load medicines.");
    } finally {
      setLoading(false);
    }
  }

  async function onAdd(e) {
    e.preventDefault();
    setError(null);
    setOk(null);

    try {
      await createMedicine({ name, strength, form });
      setName("");
      setStrength("");
      setForm("");
      setOk("Medicine added.");
      await load();
    } catch (e2) {
      setError(e2?.message || "Failed to add medicine.");
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((m) => {
      const hay = `${m.name || ""} ${m.strength || ""} ${m.form || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  return (
    <div style={page}>
      <div style={card}>
        <h1 style={h1}>Pharmacy Inventory — Medicines</h1>
        <p style={p}>
          Pharmacy owns the medicine catalog. Doctors can only prescribe from this list.
        </p>

        {error ? <div style={err}>Error: {error}</div> : null}
        {ok ? <div style={okStyle}>{ok}</div> : null}

        <section style={panel}>
          <h2 style={h2}>Add medicine</h2>

          <form onSubmit={onAdd} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr auto", gap: 10 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (required) e.g. Ibuprofen"
              style={input}
            />
            <input
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              placeholder="Strength e.g. 400mg"
              style={input}
            />
            <input
              value={form}
              onChange={(e) => setForm(e.target.value)}
              placeholder="Form e.g. tablet"
              style={input}
            />
            <button style={btn} type="submit">
              Add
            </button>
          </form>
        </section>

        <section style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <h2 style={h2}>Medicine catalog</h2>
            <button style={ghostBtn} type="button" onClick={load}>
              Refresh
            </button>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search medicines..."
              style={input}
            />
          </div>

          <div style={{ marginTop: 12, color: "rgba(148,163,184,0.9)", fontSize: 12 }}>
            {loading ? "Loading..." : `${filtered.length} medicine(s)`}
          </div>

          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((m) => (
              <div key={m.id} style={row}>
                <div style={{ fontWeight: 900, color: "#e5e7eb" }}>
                  {m.name}
                  <span style={{ color: "rgba(148,163,184,0.95)", fontWeight: 600 }}>
                    {m.strength ? ` · ${m.strength}` : ""}{m.form ? ` · ${m.form}` : ""}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(148,163,184,0.8)" }}>
                  id: <code>{m.id}</code>
                </div>
              </div>
            ))}
            {filtered.length === 0 ? (
              <div style={empty}>No medicines yet. Add your first medicine above.</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

// styles
const page = {
  minHeight: "calc(100vh - 60px)",
  padding: "2.5rem 2rem 3rem",
  background: "#020617",
  display: "flex",
  justifyContent: "center",
};
const card = {
  width: "100%",
  maxWidth: 1120,
  borderRadius: "1.25rem",
  border: "1px solid rgba(148,163,184,0.45)",
  background: "rgba(15,23,42,0.96)",
  padding: "2rem",
};
const h1 = { margin: 0, color: "#e5e7eb", fontSize: "1.7rem", fontWeight: 900 };
const p = { marginTop: 8, color: "rgba(148,163,184,0.95)" };
const h2 = { margin: 0, color: "#e5e7eb", fontSize: "1rem" };
const panel = {
  marginTop: 14,
  borderRadius: "1rem",
  border: "1px solid rgba(51,65,85,0.95)",
  padding: "1.1rem",
  background: "rgba(2,6,23,0.75)",
};
const input = {
  width: "100%",
  padding: "0.65rem 0.75rem",
  borderRadius: "0.8rem",
  border: "1px solid rgba(51,65,85,0.95)",
  backgroundColor: "rgba(2,6,23,0.9)",
  color: "#e5e7eb",
  outline: "none",
};
const btn = {
  padding: "0.65rem 1rem",
  borderRadius: "0.85rem",
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(2,6,23,0.85)",
  color: "rgba(229,231,235,0.95)",
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
const row = {
  borderRadius: "0.95rem",
  border: "1px solid rgba(148,163,184,0.25)",
  background: "rgba(2,6,23,0.7)",
  padding: "0.85rem 0.9rem",
};
const empty = {
  padding: "0.9rem",
  borderRadius: "0.9rem",
  border: "1px dashed rgba(51,65,85,0.95)",
  color: "rgba(148,163,184,0.95)",
};
const err = { marginTop: 10, color: "rgba(248,113,113,0.95)" };
const okStyle = { marginTop: 10, color: "rgba(34,197,94,0.95)" };
