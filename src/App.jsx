// src/App.jsx
import { Routes, Route, Navigate, Link } from "react-router-dom";
import Login from "./pages/Login";

/* Pharmacy */
import PharmacyDashboard from "./pages/pharmacy/PharmacyDashboard.jsx";
import PharmacyInbox from "./pages/pharmacy/PharmacyInbox.jsx";
import SmartOrderView from "./pages/pharmacy/SmartOrderView.jsx";

/* Doctor */
import DoctorDashboard from "./pages/doctor/DoctorDashboard.jsx";
import DoctorCaseView from "./pages/doctor/DoctorCaseView.jsx";
import NewPrescription from "./pages/doctor/NewPrescription.jsx";
import Prescriptions from "./pages/doctor/Prescriptions.jsx";
import PrescriptionDetails from "./pages/doctor/PrescriptionDetails.jsx";

/* Patient */
import PatientDashboard from "./pages/patient/PatientDashboard.jsx";
import PatientPrescriptionView from "./pages/patient/PatientPrescriptionView.jsx";

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
          borderBottom: "1px solid rgba(148,163,184,0.4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
          Medication Finder + Prescription Tracker
        </div>

        <nav style={{ display: "flex", gap: "1.5rem", fontSize: "0.9rem" }}>
          <Link to="/pharmacy" style={navLink}>Pharmacy</Link>
          <Link to="/pharmacy/inbox" style={navLinkMuted}>Inbox</Link>
          <Link to="/doctor" style={navLinkMuted}>Doctor</Link>
          <Link to="/patient" style={navLinkMuted}>Patient</Link>
        </nav>
      </header>

      {/* Content */}
      <main style={{ flex: 1, padding: "2rem" }}>
        <Routes>
          {/* Root */}
          <Route path="/" element={<Navigate to="/pharmacy" replace />} />

          {/* Pharmacy */}
          <Route path="/pharmacy" element={<PharmacyDashboard />} />
          <Route path="/pharmacy/inbox" element={<PharmacyInbox />} />
          <Route path="/pharmacy/smart-order" element={<SmartOrderView />} />

          {/* Doctor */}
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/doctor/case/:id" element={<DoctorCaseView />} />
          <Route path="/doctor/new-prescription" element={<NewPrescription />} />
          <Route path="/doctor/prescriptions" element={<Prescriptions />} />
          <Route
            path="/doctor/prescriptions/:id"
            element={<PrescriptionDetails />}
          />

          {/* Patient */}
          <Route path="/patient" element={<PatientDashboard />} />
          <Route
            path="/patient/prescriptions/:id"
            element={<PatientPrescriptionView />}
          />
          <Route path="/login" element={<Login />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/pharmacy" replace />} />
        </Routes>
      </main>
    </div>
  );
}

const navLink = {
  color: "#93c5fd",
  textDecoration: "none",
  fontWeight: 600,
};

const navLinkMuted = {
  color: "rgba(148,163,184,0.8)",
  textDecoration: "none",
  fontWeight: 500,
};

export default App;
