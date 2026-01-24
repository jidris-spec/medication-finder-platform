// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("pharmacy@test.com");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (v) => /^\S+@\S+\.\S+$/.test(String(v || "").trim());

  // ✅ OPTIONAL: run auth health check once on page load (for debugging)
  useEffect(() => {
    (async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !anonKey) {
          console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
          return;
        }

        const healthRes = await fetch(`${supabaseUrl}/auth/v1/health`, {
          method: "GET",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
        });

        console.log("AUTH HEALTH STATUS:", healthRes.status);
      } catch (e) {
        console.log("AUTH HEALTH CHECK ERROR:", e);
      }
    })();
  }, []);

  async function checkAuthHealth() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    }

    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    console.log("AUTH HEALTH STATUS:", res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Supabase auth health failed (${res.status})${text ? `: ${text}` : ""}`
      );
    }
  }

  async function fetchRoleByUserId(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    const role = String(data?.role || "").trim().toLowerCase();
    return role || null;
  }

  function routeByRole(role) {
    const from = location.state?.from?.pathname;

    // if user was redirected to login by a guard, send them back
    if (from) return navigate(from, { replace: true });

    if (role === "pharmacy") return navigate("/pharmacy", { replace: true });
    if (role === "doctor") return navigate("/doctor", { replace: true });
    if (role === "patient") return navigate("/patient", { replace: true });

    return navigate("/", { replace: true });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();

    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);

    try {
      // (optional) health check per submit
      setChecking(true);
      await checkAuthHealth();
      setChecking(false);

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      console.log("LOGIN ERROR:", signInError);
      console.log("LOGIN SESSION:", data?.session);
      console.log("LOGIN USER:", data?.user);

      if (signInError) {
        const msg =
          signInError.status === 400
            ? "Invalid email or password."
            : signInError.message || "Login failed.";
        throw new Error(msg);
      }

      if (!data?.session) {
        throw new Error(
          "No session returned. Check email/password and Supabase Auth settings."
        );
      }

      const userId = data?.user?.id;
      if (!userId) throw new Error("No user returned from Supabase.");

      const role = await fetchRoleByUserId(userId);
      if (!role) throw new Error("No role found for this user in profiles.");

      routeByRole(role);
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError(err?.message || "Login failed");
    } finally {
      setChecking(false);
      setLoading(false);
    }
  }

  const disabled = loading || checking;

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h1>Login</h1>

      {error && (
        <div style={{ color: "tomato", marginBottom: 12 }}>{error}</div>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
        />

        <button type="submit" disabled={disabled}>
          {checking ? "Checking auth…" : loading ? "Signing in…" : "Login"}
        </button>
      </form>

      <div style={{ opacity: 0.7, marginTop: 12, fontSize: 12 }}>
        If login succeeds but you don’t route, your <code>profiles</code> row is
        missing/wrong for that user id.
      </div>
    </div>
  );
}
