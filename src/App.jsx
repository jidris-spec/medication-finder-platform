// src/App.jsx
import { Routes, Route, Navigate, Link } from "react-router-dom";
import PharmacyDashboard from "./pages/pharmacy/PharmacyDashboard.jsx";
import SmartOrderView from "./pages/pharmacy/SmartOrderView.jsx";


function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          padding: "1rem 2rem",
          borderBottom: "1px solid rgba(148, 163, 184, 0.4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
          Medication Finder + Prescription Tracker
        </div>

        <nav style={{ display: "flex", gap: "1.5rem", fontSize: "0.9rem" }}>
          <Link
            to="/pharmacy"
            style={{
              color: "#93c5fd",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Pharmacy
          </Link>
          <span style={{ opacity: 0.5 }}>Doctor (coming soon)</span>
          <span style={{ opacity: 0.5 }}>Patient (coming soon)</span>
        </nav>
      </header>

      {/* Full-page content area */}
      <main
        style={{
          flex: 1,
          padding: "2rem",
        }}
      >
        {/* no maxWidth – full width of app */}
        <Routes>
          <Route path="/pharmacy" element={<PharmacyDashboard />} />
          <Route path="/" element={<Navigate to="/pharmacy" />} />
          <Route path="/pharmacy/smart-order" element={<SmartOrderView />} />

        </Routes>
      </main>
    </div>
  );
}

export default App;
