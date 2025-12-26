// src/pages/patient/PatientDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom"; // (used in cards)
import { listPrescriptions } from "../../data/prescriptionsApi";

export default function PatientDashboard() {
  const [patientId, setPatientId] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    try {
      const data = await listPrescriptions();
      setItems((data || []).map(normalizePrescription));
      setLastSyncAt(new Date().toISOString());
    } catch (e) {
      setError(e?.message || "Failed to load prescriptions from Supabase.");
      setItems([]);
      setLastSyncAt(new Date().toISOString());
    }
  }

  const patientOptions = useMemo(() => {
    const map = new Map(); // patientId -> patientName
    for (const p of items) {
      if (!p?.patientId) continue;
      if (!map.has(p.patientId)) map.set(p.patientId, p.patientName || "Unknown patient");
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const activePatientName = useMemo(() => {
    const found = patientOptions.find((x) => String(x.id) === String(patientId));
    return found?.name || "";
  }, [patientOptions, patientId]);

  useEffect(() => {
    if (patientOptions.length === 0) return;

    const current = String(patientId || "");
    const exists = patientOptions.some((x) => String(x.id) === current);

    if (!exists) setPatientId(patientOptions[0].id);
  }, [patientOptions, patientId]);

  const patientPrescriptions = useMemo(() => {
    const pid = String(patientId || "").trim();
    if (!pid) return [];

    const q = query.trim().toLowerCase();

    return items
      .filter((p) => String(p.patientId) === pid)
      .filter((p) => {
        if (!q) return true;

        const lines = Array.isArray(p.items) ? p.items : [];
        const hay = [
          p.patientName || "",
          p.patientId || "",
          p.status || "",
          p.id || "",
          p.rejectionReason || "",
          ...lines.map((x) => `${x?.name || ""} ${x?.strength || ""} ${x?.form || ""}`),
        ]
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      })
      .sort((a, b) => {
        const aTime = new Date(a.pharmacyAt || a.sentAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.pharmacyAt || b.sentAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [items, patientId, query]);

  const groups = useMemo(() => {
    const g = { Draft: [], Sent: [], Fulfilled: [], Rejected: [] };
    for (const p of patientPrescriptions) {
      const s = p.status || "Draft";
      if (!g[s]) g[s] = [];
      g[s].push(p);
    }
    return g;
  }, [patientPrescriptions]);

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
          boxShadow: "0 22px 70px rgba(15,23,42,0.85), 0 0 0 1px rgba(15,23,42,1)",
          padding: "2.25rem 2.5rem 2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 80% 0, rgba(59,130,246,0.14), transparent 55%)",
            opacity: 0.9,
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <header style={{ marginBottom: "1.25rem" }}>
            <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "#e5e7eb", marginBottom: 6 }}>
              Patient Dashboard
            </h1>

            <p style={{ marginTop: 0, color: "rgba(148,163,184,0.95)", maxWidth: 720 }}>
              View prescriptions for the active patient. Click any card to open the details view.
            </p>

            <div style={{ marginTop: 8, fontSize: 12, color: "rgba(148,163,184,0.85)" }}>
              Live sync:{" "}
              <strong>{lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "—"}</strong>
            </div>
          </header>

          {error ? (
            <div style={{ marginBottom: 12, color: "rgba(248,113,113,0.95)" }}>
              Error: {error}
            </div>
          ) : null}

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1.5fr) auto",
              gap: 12,
              alignItems: "end",
              marginBottom: "1rem",
            }}
          >
            <div>
              <label style={label}>Active patient</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                style={{ ...input, padding: "0.72rem 0.75rem" }}
              >
                {patientOptions.length === 0 ? (
                  <option value="">No patients yet</option>
                ) : (
                  patientOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.id}
                    </option>
                  ))
                )}
              </select>

              {patientId && (
                <div style={{ marginTop: 6, fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
                  Active:{" "}
                  <strong style={{ color: "#e5e7eb" }}>{activePatientName || "—"}</strong>
                </div>
              )}
            </div>

            <div>
              <label style={label}>Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by medicine name, status, id, reason…"
                style={input}
              />
            </div>

            <button type="button" onClick={load} style={btn}>
              Refresh
            </button>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginBottom: "1.25rem",
            }}
          >
            <Kpi title="Draft" value={groups.Draft?.length || 0} />
            <Kpi title="Sent" value={groups.Sent?.length || 0} />
            <Kpi title="Fulfilled" value={groups.Fulfilled?.length || 0} />
            <Kpi title="Rejected" value={groups.Rejected?.length || 0} />
          </section>

          {patientOptions.length === 0 ? (
            <div style={empty}>
              No prescriptions exist yet. Create one in Doctor → Send → then check Patient again.
            </div>
          ) : patientPrescriptions.length === 0 ? (
            <div style={empty}>
              No prescriptions found for <strong>{patientId}</strong>.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Group title="Sent" items={groups.Sent} />
              <Group title="Fulfilled" items={groups.Fulfilled} />
              <Group title="Rejected" items={groups.Rejected} />
              <Group title="Draft" items={groups.Draft} />
            </div>
          )}

          <div style={{ marginTop: 14, fontSize: 12, color: "rgba(148,163,184,0.85)" }}>
            Data source: Supabase.
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(148,163,184,0.85)" }}>
            Tip: You can open a specific prescription via URL: <code>/patient/prescriptions/:id</code>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizePrescription(row) {
  // supports BOTH shapes:
  // 1) API returns: prescription_items (snake_case)
  // 2) maybe later you pass: items (already normalized)
  const rawLines =
    (Array.isArray(row?.prescription_items) && row.prescription_items) ||
    (Array.isArray(row?.items) && row.items) ||
    [];

  return {
    id: row.id,
    patientId: row.patient_id ?? row.patientId,
    patientName: row.patient_name ?? row.patientName,
    status: row.status,
    createdAt: row.created_at ?? row.createdAt,
    sentAt: row.sent_at ?? row.sentAt,
    pharmacyAt: row.pharmacy_at ?? row.pharmacyAt,
    rejectionReason: row.rejection_reason ?? row.rejectionReason,
    pickupInstructions: row.pickup_instructions ?? row.pickupInstructions,
    items: rawLines.map((x) => ({
      id: x.id,
      medicineId: x.medicine_id ?? x.medicineId,
      name: x.name,
      strength: x.strength,
      form: x.form,
      qty: x.qty,
      instructions: x.instructions,
    })),
  };
}

function Group({ title, items }) {
  if (!items || items.length === 0) return null;

  return (
    <section
      style={{
        backgroundColor: "rgba(15,23,42,0.96)",
        borderRadius: "1rem",
        border: "1px solid rgba(51,65,85,0.95)",
        padding: "1.15rem 1.2rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", color: "#e5e7eb" }}>{title}</h2>
        <span style={{ fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((p) => (
          <PrescriptionCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

function PrescriptionCard({ p }) {
  const meta = getMetaTime(p);
  const rejectionText = p.rejectionReason ?? p.rejection_reason ?? p.reason ?? "";

  return (
    <Link
      to={`/patient/prescriptions/${p.id}`}
      style={{
        display: "block",
        textDecoration: "none",
        borderRadius: "0.95rem",
        border: "1px solid rgba(148,163,184,0.35)",
        backgroundColor: "rgba(2,6,23,0.75)",
        padding: "0.95rem 1rem",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div style={{ fontWeight: 900, color: "#e5e7eb" }}>
          {p.patientName || "Patient"} ·{" "}
          <span style={{ color: "rgba(148,163,184,0.95)" }}>{p.patientId}</span>
        </div>

        <span style={chip}>{p.status || "Draft"}</span>
      </div>

      <div style={{ marginTop: 6, fontSize: 13, color: "rgba(148,163,184,0.95)" }}>
        {p.items?.length ?? 0} medicine(s) · {meta.label} {meta.value}
      </div>

      {p.status === "Rejected" ? (
        <div style={{ marginTop: 8, fontSize: 13, color: "rgba(248,113,113,0.95)" }}>
          Rejected: {String(rejectionText).trim() ? rejectionText : "No reason provided."}
        </div>
      ) : null}
    </Link>
  );
}

function Kpi({ title, value }) {
  return (
    <div
      style={{
        backgroundColor: "rgba(2,6,23,0.9)",
        borderRadius: "0.9rem",
        padding: "0.9rem 1rem",
        border: "1px solid rgba(51,65,85,0.8)",
      }}
    >
      <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)" }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: "#e5e7eb" }}>{value}</div>
    </div>
  );
}

function getMetaTime(p) {
  const t = p.pharmacyAt || p.sentAt || p.createdAt;
  if (!t) return { label: "Updated:", value: "—" };

  let label = "Updated:";
  if (p.pharmacyAt) label = "Pharmacy:";
  else if (p.sentAt) label = "Sent:";
  else label = "Created:";

  try {
    return { label, value: new Date(t).toLocaleString() };
  } catch {
    return { label, value: String(t) };
  }
}

// styles
const input = {
  width: "100%",
  padding: "0.65rem 0.75rem",
  borderRadius: "0.8rem",
  border: "1px solid rgba(51,65,85,0.95)",
  backgroundColor: "rgba(2,6,23,0.9)",
  color: "#e5e7eb",
  outline: "none",
};

const label = {
  display: "block",
  fontSize: 12,
  color: "rgba(209,213,219,0.95)",
  marginBottom: 6,
};

const btn = {
  padding: "0.65rem 1rem",
  borderRadius: "0.85rem",
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(2,6,23,0.85)",
  color: "rgba(229,231,235,0.95)",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const chip = {
  fontSize: 12,
  border: "1px solid rgba(148,163,184,0.35)",
  borderRadius: 999,
  padding: "0.2rem 0.6rem",
  color: "rgba(229,231,235,0.95)",
  whiteSpace: "nowrap",
};

const empty = {
  marginTop: 12,
  padding: "1rem",
  borderRadius: "1rem",
  border: "1px dashed rgba(51,65,85,0.95)",
  color: "rgba(148,163,184,0.95)",
  backgroundColor: "rgba(2,6,23,0.55)",
};
