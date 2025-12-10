// src/pages/pharmacy/AddBatchModal.jsx
import { useState } from "react";
import { supabase } from "../../supabaseClient";

function AddBatchModal({ med, onClose, onBatchAdded }) {
  const [form, setForm] = useState({
    batchNumber: "",
    expiryDate: "",
    quantity: "",
    dateReceived: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!med) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { batchNumber, expiryDate, quantity, dateReceived } = form;

    if (!batchNumber || !expiryDate || !quantity) {
      setError("Batch number, expiry date and quantity are required.");
      setLoading(false);
      return;
    }

    const qtyNum = Number(quantity);
    if (Number.isNaN(qtyNum) || qtyNum <= 0) {
      setError("Quantity must be a positive number.");
      setLoading(false);
      return;
    }

    const payload = {
      medicine_id: med.id,
      batch_number: batchNumber,
      expiry_date: expiryDate,
      quantity: qtyNum,
      date_received: dateReceived || null,
    };

    const { data, error } = await supabase
      .from("batches")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Error adding batch:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    if (onBatchAdded) onBatchAdded(data);

    setLoading(false);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15,23,42,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "#020617",
          borderRadius: "1rem",
          border: "1px solid rgba(148,163,184,0.5)",
          padding: "1.5rem 1.7rem 1.4rem",
          boxShadow: "0 22px 70px rgba(15,23,42,0.9)",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.05rem",
                fontWeight: 600,
                color: "#e5e7eb",
              }}
            >
              Add batch
            </h2>
            <p
              style={{
                fontSize: "0.8rem",
                color: "rgba(148,163,184,0.9)",
              }}
            >
              {med.name} ({med.strength} · {med.form}) — {med.pharmacy_name},{" "}
              {med.city}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: "1.1rem",
            }}
          >
            ×
          </button>
        </div>

        {/* form */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "0.75rem 1rem",
          }}
        >
          {/* Batch number */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Batch number *</label>
            <input
              name="batchNumber"
              type="text"
              value={form.batchNumber}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="BN-001, LOT-123..."
            />
          </div>

          {/* Expiry date */}
          <div>
            <label style={labelStyle}>Expiry date *</label>
            <input
              name="expiryDate"
              type="date"
              value={form.expiryDate}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          {/* Quantity */}
          <div>
            <label style={labelStyle}>Quantity *</label>
            <input
              name="quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="e.g. 30"
            />
          </div>

          {/* Date received */}
          <div>
            <label style={labelStyle}>Date received</label>
            <input
              name="dateReceived"
              type="date"
              value={form.dateReceived}
              onChange={handleChange}
              style={inputStyle}
            />
            <p
              style={{
                fontSize: "0.7rem",
                color: "rgba(148,163,184,0.9)",
                marginTop: "0.15rem",
              }}
            >
              Leave empty to use the default date from the database.
            </p>
          </div>

          {/* error + buttons */}
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "0.6rem",
              marginTop: "0.5rem",
            }}
          >
            {error && (
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "#fca5a5",
                  marginRight: "auto",
                }}
              >
                {error}
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "999px",
                border: "1px solid rgba(55,65,81,0.9)",
                backgroundColor: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                fontSize: "0.84rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.42rem 1.1rem",
                borderRadius: "999px",
                border: "1px solid rgba(22,163,74,0.9)",
                background:
                  "linear-gradient(135deg, #16a34a, #22c55e, #38bdf8)",
                color: "white",
                fontSize: "0.86rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Saving…" : "Add batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "0.78rem",
  color: "rgba(209,213,219,0.95)",
  marginBottom: "0.25rem",
};

const inputStyle = {
  width: "100%",
  padding: "0.45rem 0.7rem",
  borderRadius: "0.55rem",
  border: "1px solid rgba(51,65,85,0.9)",
  backgroundColor: "rgba(15,23,42,0.95)",
  color: "#e5e7eb",
  fontSize: "0.85rem",
  outline: "none",
};

export default AddBatchModal;
