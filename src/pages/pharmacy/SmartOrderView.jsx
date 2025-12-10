// src/pages/pharmacy/SmartOrder.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import MedicineList from "./MedicineList.jsx";
import AddBatchModal from "./AddBatchModal.jsx";

function PharmacySmartOrder() {
  const [query, setQuery] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const LOW_STOCK_LIMIT = 5;
  const NEAR_EXPIRY_DAYS = 30;

  // ---------- FETCH ----------
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);

      const [
        { data: meds, error: medsError },
        { data: batchData, error: batchError },
      ] = await Promise.all([
        supabase.from("pharmacy").select("*"),
        supabase.from("batches").select("*"),
      ]);

      if (medsError) {
        console.error("Error loading medicines:", medsError);
        setError(medsError.message);
        setLoading(false);
        return;
      }

      if (batchError) {
        console.error("Error loading batches:", batchError);
        setError(batchError.message);
        setLoading(false);
        return;
      }

      setMedicines(meds || []);
      setBatches(batchData || []);
      setLoading(false);
    }

    fetchAll();
  }, []);

  // ---------- HELPERS ----------
  function getTotalStock(medicineId) {
    const totalFromBatches = batches
      .filter((b) => b.medicine_id === medicineId)
      .reduce((sum, b) => sum + (b.quantity || 0), 0);

    if (totalFromBatches > 0) return totalFromBatches;

    const med = medicines.find((m) => m.id === medicineId);
    return med?.stock ?? 0;
  }

  function getSoonestExpiry(medicineId) {
    const medBatches = batches.filter((b) => b.medicine_id === medicineId);
    if (medBatches.length === 0) return null;

    const sorted = [...medBatches].sort((a, b) => {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date) - new Date(b.expiry_date);
    });

    return sorted[0].expiry_date || null;
  }

  function isNearExpiry(expiryDate) {
    if (!expiryDate) return false;
    const today = new Date();
    const exp = new Date(expiryDate);
    const diffMs = exp - today;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= NEAR_EXPIRY_DAYS;
  }

  // ---------- CLASSIFY + FILTER ----------
  const riskyMeds = medicines.filter((med) => {
    const totalStock = getTotalStock(med.id);
    const soonest = getSoonestExpiry(med.id);

    const outOfStock = totalStock === 0;
    const lowStock = totalStock > 0 && totalStock <= LOW_STOCK_LIMIT;
    const nearExp = soonest && isNearExpiry(soonest);

    return outOfStock || lowStock || nearExp;
  });

  const filtered = riskyMeds.filter((med) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;

    return (
      med.name.toLowerCase().includes(q) ||
      med.substance.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const aStock = getTotalStock(a.id);
    const bStock = getTotalStock(b.id);

    const aOut = aStock === 0;
    const bOut = bStock === 0;
    if (aOut && !bOut) return -1;
    if (bOut && !aOut) return 1;

    const aLow = aStock > 0 && aStock <= LOW_STOCK_LIMIT;
    const bLow = bStock > 0 && bStock <= LOW_STOCK_LIMIT;
    if (aLow && !bLow) return -1;
    if (bLow && !aLow) return 1;

    const aExp = getSoonestExpiry(a.id);
    const bExp = getSoonestExpiry(b.id);

    if (!aExp && !bExp) return 0;
    if (!aExp) return 1;
    if (!bExp) return -1;

    return new Date(aExp) - new Date(bExp);
  });

  // ---------- BATCH HANDLERS ----------
  function handleAddBatchClick(med) {
    setSelectedMedicine(med);
    setShowBatchModal(true);
  }

  function handleBatchAdded(newBatch) {
    setBatches((prev) => [...prev, newBatch]);
  }

  // ---------- LOADING / ERROR ----------
  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#020617",
          color: "white",
        }}
      >
        Loading priority medicines…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#020617",
          color: "red",
        }}
      >
        Error loading data: {error}
      </div>
    );
  }

  // ---------- UI ----------
  return (
    <>
      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          padding: "2.5rem 2rem 3rem",
          background:
            "radial-gradient(circle at 0 0, rgba(59,130,246,0.25), transparent 55%), #020617",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1120px",
            background:
              "radial-gradient(circle at top left, rgba(56,189,248,0.15), transparent 55%), #020617",
            borderRadius: "1.25rem",
            border: "1px solid rgba(148,163,184,0.45)",
            boxShadow:
              "0 22px 70px rgba(15,23,42,0.85), 0 0 0 1px rgba(15,23,42,1)",
            padding: "2.25rem 2.5rem 2rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 80% 0, rgba(59,130,246,0.18), transparent 55%)",
              opacity: 0.9,
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Header */}
            <header style={{ marginBottom: "1.75rem" }}>
              <h1
                style={{
                  fontSize: "1.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                  color: "#e5e7eb",
                  marginBottom: "0.35rem",
                }}
              >
                Smart Order – Priority medicines
              </h1>
              <p
                style={{
                  fontSize: "0.98rem",
                  color: "rgba(209,213,219,0.8)",
                  maxWidth: "40rem",
                }}
              >
                This view only shows medicines that are{" "}
                <strong>out of stock</strong>, <strong>low stock</strong>, or
                have <strong>batches expiring in the next 30 days</strong>.
                It’s designed for refill decisions, not daily browsing.
              </p>
            </header>

            {/* Filter + legend */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1.4fr)",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              {/* filter box */}
              <div
                style={{
                  backgroundColor: "rgba(15,23,42,0.95)",
                  borderRadius: "0.9rem",
                  border: "1px solid rgba(148,163,184,0.4)",
                  padding: "1rem 1.1rem 1.1rem",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "0.9rem",
                    color: "rgba(209,213,219,0.95)",
                    marginBottom: "0.35rem",
                  }}
                >
                  Filter this list
                </label>
                <input
                  type="text"
                  placeholder="Search by name or substance…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.85rem",
                    borderRadius: "0.7rem",
                    border: "1px solid rgba(51,65,85,0.9)",
                    backgroundColor: "rgba(15,23,42,0.95)",
                    color: "#e5e7eb",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
                <p
                  style={{
                    marginTop: "0.4rem",
                    fontSize: "0.78rem",
                    color: "rgba(148,163,184,0.9)",
                  }}
                >
                  You’re only seeing items that are risky – this page is built
                  for refill decisions.
                </p>
              </div>

              {/* how it works */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,0.95))",
                  borderRadius: "0.9rem",
                  border: "1px solid rgba(148,163,184,0.55)",
                  padding: "1rem 1.1rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#e5e7eb",
                    marginBottom: "0.35rem",
                  }}
                >
                  How this list works:
                </h3>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "1.1rem",
                    fontSize: "0.8rem",
                    color: "rgba(148,163,184,0.95)",
                    lineHeight: 1.5,
                  }}
                >
                  <li>Out-of-stock medicines always appear at the top.</li>
                  <li>Then low stock items (≤ 5 units).</li>
                  <li>
                    Then medicines with batches expiring in the next 30 days.
                  </li>
                </ul>
              </div>
            </section>

            {/* Priority list */}
            <section
              style={{
                backgroundColor: "rgba(15,23,42,0.96)",
                borderRadius: "1rem",
                border: "1px solid rgba(51,65,85,0.95)",
                padding: "1.15rem 1.2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "0.6rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#e5e7eb",
                  }}
                >
                  Priority medicines
                </h2>
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "rgba(148,163,184,0.9)",
                  }}
                >
                  {sorted.length} medicine
                  {sorted.length !== 1 ? "s" : ""} need attention
                </span>
              </div>

              {sorted.length === 0 ? (
                <p
                  style={{
                    fontSize: "0.86rem",
                    color: "rgba(148,163,184,0.95)",
                    padding: "0.35rem 0.1rem 0.1rem",
                  }}
                >
                  No risky medicines right now. Stock levels and expiries look
                  healthy.
                </p>
              ) : (
                <MedicineList
                  medicines={sorted}
                  query={query}
                  batches={batches}
                  onAddBatch={handleAddBatchClick}
                  // Smart Order page doesn’t care about editing/deleting,
                  // but you can expose them if you want:
                  onEdit={undefined}
                  onDelete={undefined}
                />
              )}
            </section>
          </div>
        </div>
      </div>

      {showBatchModal && (
        <AddBatchModal
          med={selectedMedicine}
          onClose={() => {
            setShowBatchModal(false);
            setSelectedMedicine(null);
          }}
          onBatchAdded={handleBatchAdded}
        />
      )}
    </>
  );
}

export default PharmacySmartOrder;
