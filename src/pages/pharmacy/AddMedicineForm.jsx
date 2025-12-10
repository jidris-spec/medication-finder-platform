// src/pages/pharmacy/AddMedicineForm.jsx
import { useState } from "react";
import { supabase } from "../../supabaseClient";

function AddMedicineForm({ onAdded }) {
  const [fields, setFields] = useState({
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

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const {
      name,
      substance,
      strength,
      form: dosageForm,
      packSize,
      pharmacyName,
      city,
    } = fields;

    // basic validation
    if (!name || !substance || !pharmacyName || !city) {
      setError("Name, substance, pharmacy and city are required.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("pharmacy")
      .insert([
        {
          name,
          substance,
          strength,
          form: dosageForm,
          pack_size: packSize,
          pharmacy_name: pharmacyName,
          city,
          // ❌ NO stock here – stock is computed from batches only
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error adding medicine:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    // push new medicine to parent
    if (onAdded) onAdded(data);

    // reset form
    setFields({
      name: "",
      substance: "",
      strength: "",
      form: "",
      packSize: "",
      pharmacyName: "",
      city: "",
    });
    setLoading(false);
  }

  return (
    <section
      style={{
        marginBottom: "1.5rem",
        padding: "1.2rem 1.2rem 1.3rem",
        borderRadius: "1rem",
        border: "1px solid rgba(51,65,85,0.95)",
        backgroundColor: "rgba(15,23,42,0.96)",
      }}
    >
      <h2
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "#e5e7eb",
          marginBottom: "0.4rem",
        }}
      >
        Add new medicine
      </h2>
      <p
        style={{
          fontSize: "0.8rem",
          color: "rgba(148,163,184,0.9)",
          marginBottom: "0.9rem",
        }}
      >
        This will instantly appear in the public inventory list. Stock starts at
        0 – add batches from the medicine card.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "0.75rem 1rem",
        }}
      >
        {/* Name */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.78rem",
              color: "rgba(209,213,219,0.95)",
              marginBottom: "0.25rem",
            }}
          >
            Name *
          </label>
          <input
            name="name"
            value={fields.name}
            onChange={handleChange}
            type="text"
            required
            style={inputStyle}
          />
        </div>

        {/* Substance */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.78rem",
              color: "rgba(209,213,219,0.95)",
              marginBottom: "0.25rem",
            }}
          >
            Substance *
          </label>
          <input
            name="substance"
            value={fields.substance}
            onChange={handleChange}
            type="text"
            required
            style={inputStyle}
          />
        </div>

        {/* Strength */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.78rem",
              color: "rgba(209,213,219,0.95)",
              marginBottom: "0.25rem",
            }}
          >
            Strength
          </label>
          <input
            name="strength"
            value={fields.strength}
            onChange={handleChange}
            type="text"
            placeholder="500 mg"
            style={inputStyle}
          />
        </div>

        {/* Form */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.78rem",
              color: "rgba(209,213,219,0.95)",
              marginBottom: "0.25rem",
            }}
          >
            Form
          </label>
          <input
            name="form"
            value={fields.form}
            onChange={handleChange}
            type="text"
            placeholder="tablet, syrup…"
            style={inputStyle}
          />
        </div>

        {/* Pack size */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.78rem",
              color: "rgba(209,213,219,0.95)",
              marginBottom: "0.25rem",
            }}
          >
            Pack size
          </label>
          <input
            name="packSize"
            value={fields.packSize}
            onChange={handleChange}
            type="text"
            placeholder="30 tablets"
            style={inputStyle}
          />
        </div>

        {/* Pharmacy name */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.78rem",
              color: "rgba(209,213,219,0.95)",
              marginBottom: "0.25rem",
            }}
          >
            Pharmacy name *
          </label>
          <input
            name="pharmacyName"
            value={fields.pharmacyName}
            onChange={handleChange}
            type="text"
            required
            style={inputStyle}
          />
        </div>

        {/* City */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.78rem",
              color: "rgba(209,213,219,0.95)",
              marginBottom: "0.25rem",
            }}
          >
            City *
          </label>
          <input
            name="city"
            value={fields.city}
            onChange={handleChange}
            type="text"
            required
            style={inputStyle}
          />
        </div>

        {/* Submit + error */}
        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            marginTop: "0.4rem",
          }}
        >
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.45rem 1.05rem",
              borderRadius: "999px",
              border: "1px solid rgba(59,130,246,0.85)",
              background:
                "linear-gradient(135deg, #2563eb, #38bdf8, #22c55e)",
              color: "white",
              fontSize: "0.86rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Saving…" : "Add medicine"}
          </button>

          {error && (
            <span
              style={{
                fontSize: "0.78rem",
                color: "#fca5a5",
              }}
            >
              {error}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

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

export default AddMedicineForm;
