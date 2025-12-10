// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// DEBUG: remove after it works
console.log("SUPABASE URL =>", supabaseUrl);
console.log("SUPABASE KEY =>", supabaseAnonKey?.slice(0, 15) + "...");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
