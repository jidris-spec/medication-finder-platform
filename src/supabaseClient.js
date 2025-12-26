// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  );
}

// Optional dev-only logs (safe: don't print full key)
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log("[Supabase] URL:", supabaseUrl);
  // eslint-disable-next-line no-console
  console.log("[Supabase] Anon key prefix:", String(supabaseAnonKey).slice(0, 10));
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
