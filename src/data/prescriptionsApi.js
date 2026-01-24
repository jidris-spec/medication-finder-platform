// src/data/prescriptionsApi.js
import { supabase } from "../lib/supabaseClient";

/**
 * Canonical statuses (DB + UI must match)
 */
console.log("✅ LOADED prescriptionsApi.js (duplicate export exists)");

export const STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  FULFILLED: "fulfilled",
  REJECTED: "rejected",
};

/**
 * Shared select (prescription + items)
 */
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
    instructions,
    stock_qty
  )
`;

/**
 * Guard: pharmacy can only decide when status = sent
 */
async function assertDecidable(prescriptionId) {
  const { data, error } = await supabase
    .from("prescriptions")
    .select("id,status")
    .eq("id", prescriptionId)
    .single();

  if (error) throw error;

  const current = String(data.status || "").toLowerCase();
  if (current !== STATUS.SENT) {
    throw new Error(
      `Prescription already decided (status="${data.status}")`
    );
  }
}

/* ---------------- READ ---------------- */

export async function listPrescriptions() {
  const { data, error } = await supabase
    .from("prescriptions")
    .select(PRESCRIPTION_SELECT)
    .order("sent_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPrescriptionById(id) {
  if (!id) throw new Error("Missing prescription id");

  const { data, error } = await supabase
    .from("prescriptions")
    .select(PRESCRIPTION_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/* ---------------- DOCTOR ---------------- */

export async function sendPrescription(id) {
  if (!id) throw new Error("Missing prescription id");

  const { data: items } = await supabase
    .from("prescription_items")
    .select("id")
    .eq("prescription_id", id);

  if (!items || items.length === 0) {
    throw new Error("Cannot send empty prescription");
  }

  const { error } = await supabase
    .from("prescriptions")
    .update({
      status: STATUS.SENT,
      sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Update the header fields of a DRAFT prescription.
 * Only allowed when status = draft.
 */
export async function updatePrescriptionHeaderDraft(id, patch) {
  if (!id) throw new Error("Missing prescription id.");

  // Enforce draft
  const { data: rx, error: stErr } = await supabase
    .from("prescriptions")
    .select("id,status")
    .eq("id", id)
    .single();
  if (stErr) throw stErr;

  if (String(rx.status || "").toLowerCase() !== STATUS.DRAFT) {
    throw new Error(`Only draft prescriptions can be edited. status="${rx.status}"`);
  }

  const allowed = ["patient_id", "patient_name", "pickup_instructions"];
  const safe = {};

  for (const k of allowed) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, k)) safe[k] = patch[k];
  }

  const { error } = await supabase
    .from("prescriptions")
    .update(safe)
    .eq("id", id);

  if (error) throw error;
  return true;
}

/**
 * Replace all items on a DRAFT prescription.
 * Strategy: delete existing items then insert new ones.
 * Only allowed when status = draft.
 */
export async function replacePrescriptionItemsDraft(prescriptionId, items) {
  if (!prescriptionId) throw new Error("Missing prescription id.");

  // Enforce draft
  const { data: rx, error: stErr } = await supabase
    .from("prescriptions")
    .select("id,status")
    .eq("id", prescriptionId)
    .single();
  if (stErr) throw stErr;

  if (String(rx.status || "").toLowerCase() !== STATUS.DRAFT) {
    throw new Error(`Only draft prescriptions can be edited. status="${rx.status}"`);
  }

  // 1) Delete old items
  const { error: delErr } = await supabase
    .from("prescription_items")
    .delete()
    .eq("prescription_id", prescriptionId);

  if (delErr) throw delErr;

  // 2) Insert new items (if any)
  const clean = Array.isArray(items) ? items : [];

  if (clean.length === 0) return true;

  const rows = clean.map((i) => ({
    prescription_id: prescriptionId,
    medicine_id: i.medicine_id ?? null,
    name: i.name ?? null,
    strength: i.strength ?? null,
    form: i.form ?? null,
    qty: Number(i.qty ?? 0),
    instructions: i.instructions ?? null,
    stock_qty: i.stock_qty ?? null, // optional field if you store it
  }));

  const { error: insErr } = await supabase
    .from("prescription_items")
    .insert(rows);

  if (insErr) throw insErr;
  return true;
}


/**
 * Doctor action after rejection:
 * clone prescription back to DRAFT
 */
export async function duplicatePrescriptionAsDraft(id) {
  if (!id) throw new Error("Missing prescription id");

  // Load original
  const original = await getPrescriptionById(id);

  if (original.status !== STATUS.REJECTED) {
    throw new Error("Only rejected prescriptions can be duplicated");
  }

  // Create new prescription
  const { data: newRx, error: rxErr } = await supabase
    .from("prescriptions")
    .insert({
      patient_id: original.patient_id,
      patient_name: original.patient_name,
      status: STATUS.DRAFT,
    })
    .select()
    .single();

  if (rxErr) throw rxErr;

  // Clone items
  const items = original.prescription_items || [];
  if (items.length) {
    const cloned = items.map((i) => ({
      prescription_id: newRx.id,
      medicine_id: i.medicine_id,
      name: i.name,
      strength: i.strength,
      form: i.form,
      qty: i.qty,
      instructions: i.instructions,
    }));

    const { error: itemsErr } = await supabase
      .from("prescription_items")
      .insert(cloned);

    if (itemsErr) throw itemsErr;
  }

  return newRx.id;
}

/* ---------------- PHARMACY ---------------- */

export async function fulfillPrescriptionAtomic(id, pickupInstructions) {
  if (!id) throw new Error("Missing prescription id");

  await assertDecidable(id);

  const { error } = await supabase.rpc("pharmacy_fulfill_prescription", {
    p_prescription_id: id,
    p_pickup: pickupInstructions || null,
  });

  if (error) throw error;
}

export async function rejectPrescriptionAtomic(id, reason) {
  if (!id) throw new Error("Missing prescription id");

  await assertDecidable(id);

  const { error } = await supabase.rpc("pharmacy_reject_prescription", {
    p_prescription_id: id,
    p_reason: String(reason || "other").trim(),
  });

  if (error) throw error;
}

export async function pharmacyDecision({ id, action, pickupInstructions, reason }) {
  if (action === "FULFILL") {
    return fulfillPrescriptionAtomic(id, pickupInstructions);
  }
  if (action === "REJECT") {
    return rejectPrescriptionAtomic(id, reason);
  }
  throw new Error(`Unknown action: ${action}`);
}
