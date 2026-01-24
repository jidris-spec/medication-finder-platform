// src/components/RequireRole.jsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getMyRole } from "../data/authApi";

export default function RequireRole({ role, children }) {
  const location = useLocation();
  const [status, setStatus] = useState("loading"); // loading | ok | forbidden

  useEffect(() => {
    let alive = true;

    (async () => {
      const r = await getMyRole();

      if (!alive) return;

      if (!r) {
        setStatus("forbidden"); // not logged in or no profile role
        return;
      }

      if (r !== String(role).toLowerCase()) {
        setStatus("forbidden"); // logged in but wrong role
        return;
      }

      setStatus("ok");
    })();

    return () => {
      alive = false;
    };
  }, [role]);

  if (status === "loading") {
    return (
      <div style={{ padding: "2rem", color: "rgba(148,163,184,0.9)" }}>
        Checking access…
      </div>
    );
  }

  if (status === "forbidden") {
    // Send user to login, and remember where they tried to go
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
