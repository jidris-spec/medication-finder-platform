// src/App.jsx
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";

import Login from "./pages/Login";
import RequireRole from "./guards/RequireRole";
import { supabase } from "./lib/supabaseClient";
import { getMyRole, getMyUser } from "./data/authApi";

/* Pharmacy */
import PharmacyDashboard from "./pages/pharmacy/PharmacyDashboard.jsx";
import PharmacyInbox from "./pages/pharmacy/PharmacyInbox.jsx";
import SmartOrderView from "./pages/pharmacy/SmartOrderView.jsx";
import PharmacyInventory from "./pages/pharmacy/PharmacyInventory.jsx";
import PharmacyBatches from "./pages/pharmacy/PharmacyBatches.jsx";

/* Doctor */
import DoctorDashboard from "./pages/doctor/DoctorDashboard.jsx";
import DoctorCaseView from "./pages/doctor/DoctorCaseView.jsx";
import NewPrescription from "./pages/doctor/NewPrescription.jsx";
import Prescriptions from "./pages/doctor/Prescriptions.jsx";
import PrescriptionDetails from "./pages/doctor/PrescriptionDetails.jsx";

/* Patient */
import PatientDashboard from "./pages/patient/PatientDashboard.jsx";
import PatientPrescriptionView from "./pages/patient/PatientPrescriptionView.jsx";

/**
 * Root router:
 * - If logged out => /login
 * - If logged in => redirect based on role
 */
function HomeRouter() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const s = data?.session ?? null;

      if (!alive) return;

      setSession(s);

      if (!s?.user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const r = await getMyRole();
      if (!alive) return;

      setRole(r);
      setLoading(false);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => load());

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) return null;

  if (!session?.user) return <Navigate to="/login" replace />;

  if (role === "pharmacy") return <Navigate to="/pharmacy" replace />;
  if (role === "doctor") return <Navigate to="/doctor" replace />;
  if (role === "patient") return <Navigate to="/patient" replace />;

  // Logged in but role missing/unknown => safest path
  return <Navigate to="/login" replace />;
}

/**
 * HARD auth gate:
 * If no session.user => block ALL protected routes immediately (no refresh).
 */
function RequireAuth({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSession(data?.session ?? null);
      setLoading(false);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setLoading(false);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) return null;

  if (!session?.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default function App() {
  return (
    <div style={shell}>
      <TopNav />

      <main style={main}>
        <div style={content}>
          <Routes>
            {/* Root */}
            <Route path="/" element={<HomeRouter />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />

            {/* Pharmacy (protected) */}
            <Route
              path="/pharmacy"
              element={
                <RequireAuth>
                  <RequireRole role="pharmacy">
                    <PharmacyDashboard />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/pharmacy/inventory"
              element={
                <RequireAuth>
                  <RequireRole role="pharmacy">
                    <PharmacyInventory />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/pharmacy/batches"
              element={
                <RequireAuth>
                  <RequireRole role="pharmacy">
                    <PharmacyBatches />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/pharmacy/inbox"
              element={
                <RequireAuth>
                  <RequireRole role="pharmacy">
                    <PharmacyInbox />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/pharmacy/smart-order"
              element={
                <RequireAuth>
                  <RequireRole role="pharmacy">
                    <SmartOrderView />
                  </RequireRole>
                </RequireAuth>
              }
            />

            {/* Doctor (protected) */}
            <Route
              path="/doctor"
              element={
                <RequireAuth>
                  <RequireRole role="doctor">
                    <DoctorDashboard />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/case/:id"
              element={
                <RequireAuth>
                  <RequireRole role="doctor">
                    <DoctorCaseView />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/new-prescription"
              element={
                <RequireAuth>
                  <RequireRole role="doctor">
                    <NewPrescription />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/prescriptions"
              element={
                <RequireAuth>
                  <RequireRole role="doctor">
                    <Prescriptions />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/prescriptions/:id"
              element={
                <RequireAuth>
                  <RequireRole role="doctor">
                    <PrescriptionDetails />
                  </RequireRole>
                </RequireAuth>
              }
            />

            {/* Patient (protected) */}
            <Route
              path="/patient"
              element={
                <RequireAuth>
                  <RequireRole role="patient">
                    <PatientDashboard />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/patient/prescriptions/:id"
              element={
                <RequireAuth>
                  <RequireRole role="patient">
                    <PatientPrescriptionView />
                  </RequireRole>
                </RequireAuth>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function TopNav() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState("");
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;

      if (!alive) return;

      setSessionUser(user);

      if (!user) {
        setRole(null);
        setEmail("");
        return;
      }

      const r = await getMyRole();
      const u = await getMyUser();

      if (!alive) return;

      setRole(r);
      setEmail(u?.email || "");
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSessionUser(newSession?.user ?? null);
      load();
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error.message);
      return;
    }

    // Immediately clean nav state (avoid UI lag)
    setRole(null);
    setEmail("");
    setSessionUser(null);

    navigate("/login", { replace: true });
  }

  const links =
    role === "pharmacy"
      ? [
          { to: "/pharmacy", label: "Dashboard" },
          { to: "/pharmacy/inventory", label: "Medicines" },
          { to: "/pharmacy/batches", label: "Batches" },
          { to: "/pharmacy/inbox", label: "Decision Queue" },
        ]
      : role === "doctor"
      ? [
          { to: "/doctor", label: "Dashboard" },
          { to: "/doctor/new-prescription", label: "New Prescription" },
          { to: "/doctor/prescriptions", label: "Prescriptions" },
        ]
      : role === "patient"
      ? [{ to: "/patient", label: "Dashboard" }]
      : [{ to: "/login", label: "Login" }];

  return (
    <header style={topbar}>
      <div style={topbarInner}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={brand}>Medication Finder + Prescription Tracker</div>

          {role ? <span style={badge}>{role.toUpperCase()}</span> : null}

          {email ? (
            <span style={emailStyle} title={email}>
              {email}
            </span>
          ) : null}
        </div>

        <nav style={nav}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              style={({ isActive }) => ({
                ...navItem,
                ...(isActive ? navItemActive : {}),
              })}
            >
              {l.label}
            </NavLink>
          ))}

          {sessionUser ? (
            <button onClick={logout} style={logoutBtn}>
              Logout
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

/* ---------------- styles ---------------- */

const shell = {
  minHeight: "100vh",
  backgroundColor: "#020617",
  color: "#e5e7eb",
  display: "flex",
  flexDirection: "column",
};

const topbar = {
  position: "sticky",
  top: 0,
  zIndex: 50,
  background: "rgba(2, 6, 23, 0.9)",
  borderBottom: "1px solid rgba(148,163,184,0.25)",
  backdropFilter: "blur(10px)",
};

const topbarInner = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "0.9rem 1.25rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
};

const brand = {
  fontWeight: 900,
  letterSpacing: 0.2,
  color: "#e5e7eb",
};

const badge = {
  fontSize: 12,
  fontWeight: 900,
  color: "rgba(229,231,235,0.95)",
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(15,23,42,0.7)",
  padding: "0.18rem 0.55rem",
  borderRadius: 999,
};

const emailStyle = {
  fontSize: 12,
  color: "rgba(148,163,184,0.9)",
  maxWidth: 220,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const nav = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const navItem = {
  textDecoration: "none",
  color: "rgba(148,163,184,0.95)",
  fontWeight: 700,
  fontSize: 13,
  padding: "0.45rem 0.7rem",
  borderRadius: 10,
  border: "1px solid transparent",
};

const navItemActive = {
  color: "#e5e7eb",
  background: "rgba(59,130,246,0.15)",
  border: "1px solid rgba(59,130,246,0.35)",
};

const logoutBtn = {
  marginLeft: 6,
  padding: "0.45rem 0.75rem",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(2,6,23,0.85)",
  color: "rgba(229,231,235,0.95)",
  fontWeight: 900,
  cursor: "pointer",
};

const main = { flex: 1, padding: "2rem 1.25rem" };
const content = { maxWidth: 1120, margin: "0 auto" };
