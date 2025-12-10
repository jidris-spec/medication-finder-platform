// src/pages/pharmacy/PharmacyDashboard.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import PharmacySearchBar from "./PharmacySearchBar.jsx";
import MedicineList from "./MedicineList.jsx";
import AddMedicineForm from "./AddMedicineForm.jsx";
import EditMedicineModal from "./EditMedicineModal.jsx";
import AddBatchModal from "./AddBatchModal.jsx";

function PharmacyDashboard() {
  const [query, setQuery] = useState("");

  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingMed, setEditingMed] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  // thresholds
  const LOW_STOCK_LIMIT = 5;
  const NEAR_EXPIRY_DAYS = 30;

  // --------------------
  // DATA FETCH
  // --------------------
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);

      const [{ data: meds, error: medsError }, { data: batchData, error: batchError }] =
        await Promise.all([
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

  // --------------------
  // HELPERS FOR STOCK / EXPIRY
  // --------------------
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

  // --------------------
  // CRUD HANDLERS
  // --------------------
  function handleMedicineAdded(newMed) {
    setMedicines((prev) => [...prev, newMed]);
  }

  function handleEditClick(med) {
    setEditingMed(med);
    setIsEditOpen(true);
  }

  function handleMedicineUpdated(updatedMed) {
    setMedicines((prev) =>
      prev.map((m) => (m.id === updatedMed.id ? updatedMed : m))
    );
  }

  function handleDeleteMedicine(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this medicine from inventory?"
    );
    if (!confirmDelete) return;

    // optimistic UI
    setMedicines((prev) => prev.filter((m) => m.id !== id));

    supabase
      .from("pharmacy")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Error deleting medicine:", error);
          // optional: re-fetch or show toast
        }
      });
  }

  function handleAddBatchClick(med) {
    setSelectedMedicine(med);
    setShowBatchModal(true);
  }

  function handleBatchAdded(newBatch) {
    // update batches in state so totals + FIFO reflect immediately
    setBatches((prev) => [...prev, newBatch]);
  }

  // --------------------
  // SEARCH + PRIORITY SPLIT
  // --------------------
  const filteredMedicines = medicines.filter((med) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;

    return (
      med.name.toLowerCase().includes(q) ||
      med.substance.toLowerCase().includes(q)
    );
  });

  // classify into priority vs normal
  const priorityMeds = [];
  const normalMeds = [];

  filteredMedicines.forEach((med) => {
    const totalStock = getTotalStock(med.id);
    const soonestExpiry = getSoonestExpiry(med.id);

    const outOfStock = totalStock === 0;
    const lowStock = totalStock > 0 && totalStock <= LOW_STOCK_LIMIT;
    const nearExp = soonestExpiry && isNearExpiry(soonestExpiry);

    if (outOfStock || lowStock || nearExp) {
      priorityMeds.push(med);
    } else {
      normalMeds.push(med);
    }
  });

  const prioritySorted = [...priorityMeds].sort((a, b) => {
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

  const normalSorted = [...normalMeds].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // --------------------
  // LOADING / ERROR
  // --------------------
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
        Loading medicines…
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
        Error loading medicines: {error}
      </div>
    );
  }

  // --------------------
  // UI
  // --------------------
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
                Pharmacy Dashboard
              </h1>
              <p
                style={{
                  fontSize: "0.98rem",
                  color: "rgba(209,213,219,0.8)",
                  maxWidth: "36rem",
                }}
              >
                Search your inventory by medicine name or active substance and
                quickly see where stock is low or at risk of expiring.
              </p>
            </header>

            {/* Search + info */}
            <section
              style={{
                marginBottom: "1.75rem",
                display: "grid",
                gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1.4fr)",
                gap: "1.5rem",
              }}
            >
              <PharmacySearchBar query={query} onQueryChange={setQuery} />

              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.98))",
                  borderRadius: "0.9rem",
                  border: "1px solid rgba(148,163,184,0.55)",
                  padding: "1rem 1.1rem",
                }}
              >
                <p
                  style={{
                    fontSize: "0.86rem",
                    color: "#e5e7eb",
                    marginBottom: "0.25rem",
                  }}
                >
                  <strong>Step 3:</strong> Inventory search connected to live
                  Supabase data with batch-level tracking.
                </p>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "rgba(148,163,184,0.95)",
                    lineHeight: 1.5,
                  }}
                >
                  Patients can see availability, and pharmacies can manage
                  batches for expiry and smart ordering.
                </p>
              </div>
            </section>

            {/* Add medicine form */}
            <AddMedicineForm onAdded={handleMedicineAdded} />

            {/* Results */}
            <section
              style={{
                backgroundColor: "rgba(15,23,42,0.96)",
                borderRadius: "1rem",
                border: "1px solid rgba(51,65,85,0.95)",
                padding: "1.15rem 1.2rem",
                marginTop: "1.4rem",
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
                  Search results
                </h2>
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "rgba(148,163,184,0.9)",
                  }}
                >
                  {filteredMedicines.length} medicine
                  {filteredMedicines.length !== 1 ? "s" : ""} found
                </span>
              </div>

              {/* Priority section */}
              {prioritySorted.length > 0 && (
                <div style={{ marginBottom: "1.3rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: "#facc15",
                      }}
                    >
                      Priority medicines
                    </h3>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "rgba(250,204,21,0.9)",
                      }}
                    >
                      {prioritySorted.length} need attention (low stock, out of
                      stock, or expiring soon)
                    </span>
                  </div>

                  <MedicineList
                    medicines={prioritySorted}
                    query={query}
                    batches={batches}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteMedicine}
                    onAddBatch={handleAddBatchClick}
                  />
                </div>
              )}

              {/* Divider between priority and others */}
              {prioritySorted.length > 0 && normalSorted.length > 0 && (
                <hr
                  style={{
                    border: "none",
                    borderTop: "1px dashed rgba(51,65,85,0.9)",
                    margin: "0.4rem 0 0.9rem",
                  }}
                />
              )}

              {/* Normal section */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "0.4rem",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "#e5e7eb",
                    }}
                  >
                    All other medicines
                  </h3>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: "rgba(148,163,184,0.9)",
                    }}
                  >
                    {normalSorted.length} normal item
                    {normalSorted.length !== 1 ? "s" : ""} in this search
                  </span>
                </div>

                <MedicineList
                  medicines={normalSorted}
                  query={query}
                  batches={batches}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteMedicine}
                  onAddBatch={handleAddBatchClick}
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Modals */}
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

      <EditMedicineModal
        isOpen={isEditOpen}
        medicine={editingMed}
        onClose={() => setIsEditOpen(false)}
        onUpdated={handleMedicineUpdated}
      />
    </>
  );
}

export default PharmacyDashboard;
