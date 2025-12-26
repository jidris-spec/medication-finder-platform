// src/data/prescriptionsApi.js
import { supabase } from "../supabaseClient";

const PRESCRIPTION_SELECT = `
  id,
  patient_id,
  patient_name,
  status,
  created_at,
  sent_at,
  pharmacy_at,
  rejection_reason,
  pickup_instructions,
  prescription_items (
    id,
    prescription_id,
    medicine_id,
    name,
    strength,
    form,
    qty,
    instructions
  )
`;

export async function listPrescriptions() {
  const { data, error } = await supabase
    .from("prescriptions")
    .select(PRESCRIPTION_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPrescription(id) {
  if (!id) throw new Error("getPrescription: id is required");

  const { data, error } = await supabase
    .from("prescriptions")
    .select(PRESCRIPTION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function createPrescription({ patientId, patientName, items }) {
  const pId = String(patientId || "").trim();
  const pName = String(patientName || "").trim();
  const lines = Array.isArray(items) ? items : [];

  if (!pId || !pName) throw new Error("Patient ID and Patient name are required");
  if (lines.length === 0) throw new Error("Add at least 1 medicine line");

  const { data: header, error: headerErr } = await supabase
    .from("prescriptions")
    .insert([
      {
        patient_id: pId,
        patient_name: pName,
        status: "Draft",
      },
    ])
    .select("id")
    .single();

  if (headerErr) throw headerErr;

  const rows = lines.map((it) => ({
    prescription_id: header.id,
    medicine_id: it?.medicineId ?? null,
    name: String(it?.name || "").trim(),
    strength: it?.strength ? String(it.strength) : null,
    form: it?.form ? String(it.form) : null,
    qty: Number(it?.qty || 1),
    instructions: it?.instructions ? String(it.instructions) : null,
  }));

  // basic sanity: don’t insert empty names
  if (rows.some((r) => !r.name)) {
    throw new Error("Each prescription line must have a medicine name");
  }

  const { error: itemsErr } = await supabase.from("prescription_items").insert(rows);
  if (itemsErr) throw itemsErr;

  return await getPrescription(header.id);
}

export async function updatePrescriptionStatus(id, patch) {
  if (!id) throw new Error("updatePrescriptionStatus: id is required");
  if (!patch || typeof patch !== "object") throw new Error("updatePrescriptionStatus: patch is required");

  // optional: if pharmacy changes status, stamp pharmacy_at
  const nextPatch = { ...patch };
  if ("status" in nextPatch && (nextPatch.status === "Fulfilled" || nextPatch.status === "Rejected")) {
    if (!nextPatch.pharmacy_at) nextPatch.pharmacy_at = new Date().toISOString();
  }

  const { error } = await supabase.from("prescriptions").update(nextPatch).eq("id", id);
  if (error) throw error;

  return await getPrescription(id);
}

export async function deletePrescription(id) {
  if (!id) throw new Error("deletePrescription: id is required");
  const { error } = await supabase.from("prescriptions").delete().eq("id", id);
  if (error) throw error;
}
