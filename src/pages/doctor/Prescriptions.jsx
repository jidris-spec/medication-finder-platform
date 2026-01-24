// src/pages/doctor/Prescriptions.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function Prescriptions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // ✅ Step 2: show who is logged in (and compare with doctor_user_id in DB)
  const [authUid, setAuthUid] = useState("");
  const [authEmail, setAuthEmail] = useState("");

  useEffect(() => {
    // Step 2 auth check
    (async () => {
      const { data, error } = await supabase.auth.getUser();

      console.log("✅ AUTH USER:", data?.user);
      console.log("✅ AUTH UID:", data?.user?.id);
      console.log("✅ AUTH EMAIL:", data?.user?.email);
      console.log("❌ AUTH ERROR:", error);

      setAuthUid(data?.user?.id || "");
      setAuthEmail(data?.user?.email || "");
    })();

    // Load list
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
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
      .order("created_at", { ascending: false });

    // ✅ Debug: don’t let errors hide behind “0”
    console.log("LIST ERROR:", error);
    console.log("LIST COUNT:", data?.length);
    if (error) {
      setErr(error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(data || []);
    setLoading(false);
  }

  // ✅ Normalize DB statuses (lowercase) into UI buckets (Title Case)
  const grouped = useMemo(() => {
    const g = { Draft: [], Sent: [], Fulfilled: [], Rejected: [] };

    const normalize = (st) => String(st || "draft").trim().toLowerCase();
    const labelFor = (st) => {
      const s = normalize(st);
      if (s === "sent") return "Sent";
      if (s === "fulfilled") return "Fulfilled";
      if (s === "rejected") return "Rejected";
      return "Draft";
    };

    for (const p of items) {
      const label = labelFor(p.status);
      g[label].push(p);
    }

    // newest first by last activity
    const sortFn = (a, b) => {
      const aT = new Date(a.pharmacy_at || a.sent_at || a.created_at || 0).getTime();
      const bT = new Date(b.pharmacy_at || b.sent_at || b.created_at || 0).getTime();
      return bT - aT;
    };

    Object.keys(g).forEach((k) => g[k].sort(sortFn));
    return g;
  }, [items]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "1.25rem 0" }}>
      <Link
        to="/doctor"
        style={{ color: "#93c5fd", textDecoration: "none", fontSize: "0.9rem" }}
      >
        ← Back to Doctor Dashboard
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ marginTop: "1rem" }}>Prescriptions</h1>
        <button onClick={load} style={ghostBtn} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* ✅ Step 2 visible proof */}
      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10, color: "rgba(148,163,184,0.95)" }}>
        Logged in: <code>{authEmail || "—"}</code> · UID: <code>{authUid || "—"}</code>
      </div>

      <p style={{ marginTop: 0, color: "rgba(148,163,184,0.95)" }}>
        This page reads from <strong>Supabase</strong>. Drafts/Sent/Fulfilled/Rejected are the same data the Pharmacy and Patient flows see.
      </p>

      {err ? (
        <div
          style={{
            marginTop: 10,
            padding: "0.9rem",
            borderRadius: "0.9rem",
            border: "1px solid rgba(248,113,113,0.35)",
            background: "rgba(2,6,23,0.85)",
            color: "rgba(248,113,113,0.95)",
          }}
        >
          <strong>Error:</strong> {err}
          <div style={{ marginTop: 6, fontSize: 12, color: "rgba(248,113,113,0.85)" }}>
            If you see “schema cache”, reload schema in Supabase → Project Settings → API → Reload schema.
          </div>
        </div>
      ) : null}

      <KpiRow grouped={grouped} />

      <Section title="Sent" items={grouped.Sent} empty={loading ? "Loading…" : "No sent prescriptions yet."} />
      <Section title="Fulfilled" items={grouped.Fulfilled} empty={loading ? "Loading…" : "No fulfilled prescriptions yet."} />
      <Section title="Rejected" items={grouped.Rejected} empty={loading ? "Loading…" : "No rejected prescriptions yet."} />
      <Section title="Draft" items={grouped.Draft} empty={loading ? "Loading…" : "No drafts yet."} />
    </div>
  );
}

function KpiRow({ grouped }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, margin: "1rem 0" }}>
      <Kpi title="Draft" value={grouped.Draft.length} />
      <Kpi title="Sent" value={grouped.Sent.length} />
      <Kpi title="Fulfilled" value={grouped.Fulfilled.length} />
      <Kpi title="Rejected" value={grouped.Rejected.length} />
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div style={kpiCard}>
      <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)" }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: "#e5e7eb", marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Section({ title, items, empty }) {
  return (
    <section style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", color: "#e5e7eb" }}>{title}</h2>
        <span style={{ fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ marginTop: 10, color: "rgba(148,163,184,0.95)" }}>{empty}</div>
      ) : (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((p) => (
            <PrescriptionCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function PrescriptionCard({ p }) {
  const status = (() => {
    const s = String(p.status || "draft").trim().toLowerCase();
    if (s === "sent") return "Sent";
    if (s === "fulfilled") return "Fulfilled";
    if (s === "rejected") return "Rejected";
    return "Draft";
  })();

  const rejectionText = p.rejection_reason ?? "";
  const lastLabel = p.pharmacy_at ? "Pharmacy:" : p.sent_at ? "Sent:" : "Created:";
  const lastTime = p.pharmacy_at || p.sent_at || p.created_at;

  const lineCount = Array.isArray(p.prescription_items) ? p.prescription_items.length : 0;

  return (
    <Link
      to={`/doctor/prescriptions/${p.id}`}
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
          {p.patient_name} · <span style={{ color: "rgba(148,163,184,0.95)" }}>{p.patient_id}</span>
        </div>
        <span style={chipFor(status)}>{status}</span>
      </div>

      <div style={{ marginTop: 6, fontSize: 13, color: "rgba(148,163,184,0.95)" }}>
        {lineCount} medicine(s) · {lastLabel} {formatDate(lastTime)}
      </div>

      {status === "Rejected" ? (
        <div style={{ marginTop: 8, fontSize: 13, color: "rgba(248,113,113,0.95)" }}>
          Rejected: {String(rejectionText).trim() ? rejectionText : "No reason provided."}
        </div>
      ) : null}
    </Link>
  );
}

function chipFor(status) {
  const base = {
    fontSize: 12,
    border: "1px solid rgba(148,163,184,0.35)",
    borderRadius: 999,
    padding: "0.2rem 0.6rem",
    color: "rgba(229,231,235,0.95)",
    whiteSpace: "nowrap",
  };

  if (status === "Fulfilled") return { ...base, background: "rgba(34,197,94,0.15)" };
  if (status === "Rejected") return { ...base, background: "rgba(248,113,113,0.12)" };
  if (status === "Sent") return { ...base, background: "rgba(59,130,246,0.15)" };
  return { ...base, background: "rgba(148,163,184,0.10)" };
}

function formatDate(iso) {
  if (!iso) return "—";
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

const kpiCard = {
  backgroundColor: "rgba(2,6,23,0.9)",
  borderRadius: "0.9rem",
  padding: "0.9rem 1rem",
  border: "1px solid rgba(51,65,85,0.8)",
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
