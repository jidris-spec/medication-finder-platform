// src/data/medicinesApi.js
import { supabase } from "../lib/supabaseClient";

export async function listMedicines() {
  const { data, error } = await supabase
    .from("medicines")
    .select("id, name, strength, form, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createMedicine({ name, strength = null, form = null }) {
  const payload = {
    name: String(name || "").trim(),
    strength: strength ? String(strength).trim() : null,
    form: form ? String(form).trim() : null,
  };

  if (!payload.name) throw new Error("Medicine name is required.");

  const { data, error } = await supabase
    .from("medicines")
    .insert(payload)
    .select("id, name, strength, form, created_at")
    .single();

  if (error) throw error;
  return data;
}
