// src/pages/pharmacy/PharmacyDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listPrescriptions, STATUS } from "../../data/prescriptionsApi";

function st(s) {
  return String(s || "").trim().toLowerCase();
}

export default function PharmacyDashboard() {
  const [items, setItems] = useState([]);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setError(null);
    setIsRefreshing(true);
    try {
      const data = await listPrescriptions();
      setItems(data || []);
      setLastSyncAt(new Date().toISOString());
    } catch (e) {
      setError(e?.message || "Failed to load prescriptions.");
      setItems([]);
      setLastSyncAt(new Date().toISOString());
    } finally {
      setIsRefreshing(false);
    }
  }

  const stats = useMemo(() => {
    const res = { sent: 0, fulfilled: 0, rejected: 0, draft: 0 };
    for (const p of items) {
      const s = st(p.status);
      if (s === STATUS.SENT) res.sent++;
      else if (s === STATUS.FULFILLED) res.fulfilled++;
      else if (s === STATUS.REJECTED) res.rejected++;
      else res.draft++;
    }
    return res;
  }, [items]);

  const recentDecisions = useMemo(() => {
    const decided = items.filter((p) => {
      const s = st(p.status);
      return s === STATUS.FULFILLED || s === STATUS.REJECTED;
    });

    decided.sort((a, b) => {
      const aT = new Date(a.pharmacy_at || a.sent_at || a.created_at || 0).getTime();
      const bT = new Date(b.pharmacy_at || b.sent_at || b.created_at || 0).getTime();
      return bT - aT;
    });

    return decided.slice(0, 8);
  }, [items]);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        padding: "2.5rem 2rem 3rem",
        background:
          "radial-gradient(circle at 0 0, rgba(16,185,129,0.14), transparent 55%), #020617",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1120px",
          borderRadius: "1.25rem",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: "0 22px 70px rgba(15,23,42,0.85), 0 0 0 1px rgba(15,23,42,1)",
          padding: "2.25rem 2.5rem 2rem",
          background:
            "radial-gradient(circle at top left, rgba(34,197,94,0.10), transparent 55%), #020617",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 80% 0, rgba(16,185,129,0.12), transparent 55%)",
            opacity: 0.9,
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <header style={{ marginBottom: "1.25rem" }}>
            <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "#e5e7eb", marginBottom: 6 }}>
              Pharmacy Dashboard
            </h1>

            <p style={{ marginTop: 0, color: "rgba(148,163,184,0.95)", maxWidth: 820 }}>
              Use <strong>Inbox</strong> to fulfill/reject prescriptions (inventory-aware).
              This page is for overview + quick navigation.
            </p>

            <div style={{ marginTop: 8, fontSize: 12, color: "rgba(148,163,184,0.85)" }}>
              Live sync:{" "}
              <strong>{lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "—"}</strong>
              {isRefreshing ? (
                <span style={{ marginLeft: 8, color: "rgba(34,197,94,0.95)" }}>syncing…</span>
              ) : null}
            </div>
          </header>

          {error ? (
            <div style={{ marginBottom: 12, color: "rgba(248,113,113,0.95)" }}>Error: {error}</div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: "1rem" }}>
            <button type="button" onClick={load} style={btn} disabled={isRefreshing}>
              Refresh
            </button>

            <Link to="/pharmacy/inbox" style={{ ...btn, textDecoration: "none", textAlign: "center" }}>
              Open Inbox ({stats.sent})
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            <Kpi title="Sent (to decide)" value={stats.sent} />
            <Kpi title="Fulfilled" value={stats.fulfilled} />
            <Kpi title="Rejected" value={stats.rejected} />
            <Kpi title="Draft (not sent)" value={stats.draft} />
          </div>

          <section style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: "1rem", color: "#e5e7eb" }}>Recent decisions</h2>
              <span style={{ fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
                {recentDecisions.length} item{recentDecisions.length !== 1 ? "s" : ""}
              </span>
            </div>

            {recentDecisions.length === 0 ? (
              <div style={{ marginTop: 10, color: "rgba(148,163,184,0.95)" }}>
                No fulfilled/rejected prescriptions yet.
              </div>
            ) : (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                {recentDecisions.map((p) => {
                  const s = st(p.status);
                  const label = s === STATUS.FULFILLED ? "Fulfilled" : "Rejected";
                  const time = p.pharmacy_at || p.sent_at || p.created_at;
                  return (
                    <div key={p.id} style={row}>
                      <div>
                        <div style={{ fontWeight: 900, color: "#e5e7eb" }}>
                          {p.patient_name || "Patient"} ·{" "}
                          <span style={{ color: "rgba(148,163,184,0.95)" }}>{p.patient_id}</span>
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "rgba(148,163,184,0.95)" }}>
                          {new Date(time).toLocaleString()}
                        </div>
                      </div>
                      <span style={{ ...chip, ...(label === "Fulfilled" ? chipOk : chipBad) }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div style={{ marginTop: 14, fontSize: 12, color: "rgba(148,163,184,0.85)" }}>
            Data source: Supabase.
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div style={kpiCard}>
      <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)" }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: "#e5e7eb", marginTop: 6 }}>{value}</div>
    </div>
  );
}

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

const kpiCard = {
  backgroundColor: "rgba(2,6,23,0.9)",
  borderRadius: "0.9rem",
  padding: "0.9rem 1rem",
  border: "1px solid rgba(51,65,85,0.8)",
};

const panel = {
  marginTop: "1rem",
  backgroundColor: "rgba(15,23,42,0.96)",
  borderRadius: "1rem",
  border: "1px solid rgba(51,65,85,0.95)",
  padding: "1.15rem 1.2rem",
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  padding: "0.85rem 1rem",
  borderRadius: "0.95rem",
  border: "1px solid rgba(148,163,184,0.25)",
  backgroundColor: "rgba(2,6,23,0.75)",
};

const chip = {
  fontSize: 12,
  border: "1px solid rgba(148,163,184,0.35)",
  borderRadius: 999,
  padding: "0.2rem 0.6rem",
  color: "rgba(229,231,235,0.95)",
  whiteSpace: "nowrap",
};

const chipOk = {
  background: "rgba(34,197,94,0.15)",
  borderColor: "rgba(34,197,94,0.35)",
};

const chipBad = {
  background: "rgba(248,113,113,0.12)",
  borderColor: "rgba(248,113,113,0.35)",
};
