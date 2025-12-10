// src/components/pharmacy/PharmacySearchBar.jsx

function PharmacySearchBar({ query, onQueryChange }) {
  return (
    <div
      style={{
        backgroundColor: "rgba(15,23,42,0.95)",
        borderRadius: "0.9rem",
        border: "1px solid rgba(148,163,184,0.4)",
        padding: "1.1rem 1.2rem 1.2rem",
      }}
    >
      <label
        htmlFor="pharmacy-search"
        style={{
          display: "block",
          fontSize: "0.9rem",
          color: "rgba(209,213,219,0.95)",
          marginBottom: "0.35rem",
        }}
      >
        Inventory search
      </label>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
        }}
      >
        <input
          id="pharmacy-search"
          type="text"
          placeholder="Search by name (Nebilet) or substance (Nebivolol)…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          style={{
            flex: 1,
            padding: "0.6rem 0.9rem",
            borderRadius: "0.7rem",
            border: "1px solid rgba(51,65,85,0.9)",
            backgroundColor: "rgba(15,23,42,0.9)",
            color: "#e5e7eb",
            fontSize: "0.9rem",
            outline: "none",
            boxShadow: "0 0 0 1px transparent",
          }}
        />
        <button
          type="button"
          style={{
            padding: "0.55rem 1.1rem",
            borderRadius: "0.7rem",
            border: "1px solid rgba(59,130,246,0.8)",
            background:
              "linear-gradient(135deg, #2563eb, #38bdf8, #22c55e)",
            color: "white",
            fontSize: "0.88rem",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow:
              "0 10px 30px rgba(37,99,235,0.45), 0 0 0 1px rgba(15,23,42,0.9)",
            whiteSpace: "nowrap",
          }}
        >
          Search
        </button>
      </div>

      <p
        style={{
          marginTop: "0.5rem",
          fontSize: "0.78rem",
          color: "rgba(148,163,184,0.9)",
        }}
      >
        Tip: start with chronic medicines like{" "}
        <span style={{ color: "#38bdf8" }}>Nebilet</span> or{" "}
        <span style={{ color: "#38bdf8" }}>Enalapril</span>.
      </p>
    </div>
  );
}

export default PharmacySearchBar;
