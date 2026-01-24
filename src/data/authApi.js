// src/data/authApi.js
import { supabase } from "../lib/supabaseClient";

/**
 * Returns: "pharmacy" | "doctor" | "patient" | null
 * Reads from public.profiles(role)
 */
export async function getMyRole() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) return null;

  const role = String(data?.role || "").trim().toLowerCase();
  if (!role) return null;

  if (role === "pharmacy" || role === "doctor" || role === "patient") return role;

  return null;
}

export async function getMyUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user || null;
}
