// src/pages/pharmacy/EditMedicineModal.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

function EditMedicineModal({ isOpen, medicine, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: "",
    substance: "",
    strength: "",
    form: "",
    packSize: "",
    pharmacyName: "",
    city: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // when medicine changes / modal opens, fill the form
  useEffect(() => {
    if (!medicine) return;
    setForm({
      name: medicine.name || "",
      substance: medicine.substance || "",
      strength: medicine.strength || "",
      form: medicine.form || "",
      packSize: medicine.pack_size || "",
      pharmacyName: medicine.pharmacy_name || "",
      city: medicine.city || "",
    });
    setError("");
  }, [medicine]);

  if (!isOpen || !medicine) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { name, substance, strength, form: dosageForm, packSize, pharmacyName, city } =
      form;

    if (!name || !substance || !pharmacyName || !city) {
      setError("Name, substance, pharmacy and city are required.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("pharmacy")
      .update({
        name,
        substance,
        strength,
        form: dosageForm,
        pack_size: packSize,
        pharmacy_name: pharmacyName,
        city,
        // ❌ NO stock here – stock is computed from batches only
      })
      .eq("id", medicine.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating medicine:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    // push updated record up
    if (onUpdated) onUpdated(data);

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
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "540px",
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
          <h2
            style={{
              fontSize: "1.05rem",
              fontWeight: 600,
              color: "#e5e7eb",
            }}
          >
            Edit medicine
          </h2>
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
          {/* Name */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Name *</label>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          {/* Substance */}
          <div>
            <label style={labelStyle}>Substance *</label>
            <input
              name="substance"
              type="text"
              value={form.substance}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          {/* Strength */}
          <div>
            <label style={labelStyle}>Strength</label>
            <input
              name="strength"
              type="text"
              value={form.strength}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Form */}
          <div>
            <label style={labelStyle}>Form</label>
            <input
              name="form"
              type="text"
              value={form.form}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Pack size */}
          <div>
            <label style={labelStyle}>Pack size</label>
            <input
              name="packSize"
              type="text"
              value={form.packSize}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Pharmacy name */}
          <div>
            <label style={labelStyle}>Pharmacy name *</label>
            <input
              name="pharmacyName"
              type="text"
              value={form.pharmacyName}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          {/* City */}
          <div>
            <label style={labelStyle}>City *</label>
            <input
              name="city"
              type="text"
              value={form.city}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          {/* buttons + error */}
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
                border: "1px solid rgba(59,130,246,0.9)",
                background:
                  "linear-gradient(135deg, #2563eb, #38bdf8, #22c55e)",
                color: "white",
                fontSize: "0.86rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Saving…" : "Save changes"}
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

export default EditMedicineModal;
