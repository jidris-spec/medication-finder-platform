// src/data/batchesApi.js
import { supabase } from "../lib/supabaseClient";

export async function listBatches() {
  const { data, error } = await supabase
    .from("batches")
    .select("id, created_at, medicine_id, batch_number, expiry_date, quantity, date_received")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createBatch({
  medicineId,
  quantity,
  batchNumber = null,
  expiryDate = null,
  dateReceived = null,
}) {
  const qty = Number(quantity);

  if (!medicineId) throw new Error("Medicine is required.");
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("Quantity must be a positive number.");

  const payload = {
    medicine_id: medicineId,
    quantity: qty,
    batch_number: batchNumber ? String(batchNumber).trim() : null,
    expiry_date: expiryDate || null,
    date_received: dateReceived || null,
  };

  const { data, error } = await supabase
    .from("batches")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}
