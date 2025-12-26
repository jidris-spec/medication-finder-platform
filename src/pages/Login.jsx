// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // If already logged in, redirect immediately based on role
  useEffect(() => {
    let cancelled = false;

    async function redirectIfLoggedIn() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data?.session?.user?.id) {
        await redirectByRole(data.session.user.id);
      }
    }

    async function redirectByRole(uid) {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();

      if (pErr || !profile?.role) {
        setError(pErr?.message || "No role found for this user.");
        return;
      }

      const role = profile.role; // doctor | pharmacy | patient
      if (role === "doctor") navigate("/doctor");
      else if (role === "pharmacy") navigate("/pharmacy");
      else if (role === "patient") navigate("/patient");
      else setError(`Unknown role: ${role}`);
    }

    redirectIfLoggedIn();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInErr) {
      setError(signInErr.message);
      return;
    }

    const uid = data?.user?.id || data?.session?.user?.id;
    if (!uid) {
      setError("Login succeeded but no user id returned.");
      return;
    }

    // fetch role and redirect
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .single();

    if (pErr || !profile?.role) {
      setError(pErr?.message || "No role found for this user.");
      return;
    }

    const role = profile.role;
    if (role === "doctor") navigate("/doctor");
    else if (role === "pharmacy") navigate("/pharmacy");
    else if (role === "patient") navigate("/patient");
    else setError(`Unknown role: ${role}`);
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 24 }}>
      <h1>Login</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 6 }}
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 6 }}
            autoComplete="current-password"
          />
        </label>

        {error && <div style={{ color: "#ff8a8a" }}>{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>
    </div>
  );
}
