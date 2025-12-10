// src/pages/pharmacy/MedicineCard.jsx
import { useState } from "react";

function MedicineCard({ med, onEdit, onDelete, onAddBatch, batches = [] }) {
  const [showBatches, setShowBatches] = useState(false);

  // 1) Derive stock & batch info from batches
  const totalStock = batches.reduce(
    (sum, b) => sum + (b.quantity || 0),
    0
  );
  const batchCount = batches.length;

  // sort batches by expiry date (FIFO / soonest expiring first)
  const sortedBatches = [...batches].sort((a, b) => {
    if (!a.expiry_date) return 1;
    if (!b.expiry_date) return -1;
    return new Date(a.expiry_date) - new Date(b.expiry_date);
  });

  const nextExpiry = sortedBatches[0]?.expiry_date || null;

  // 2) Stock label + styles based on totalStock
  let stockLabel = "";
  let stockStyle = {};

  if (totalStock === 0) {
    stockLabel = "Out of stock";
    stockStyle = {
      backgroundColor: "rgba(239,68,68,0.14)",
      color: "#f97373",
      border: "1px solid rgba(248,113,113,0.6)",
    };
  } else if (totalStock <= 5) {
    stockLabel = `Low stock · ${totalStock} left`;
    stockStyle = {
      backgroundColor: "rgba(250,204,21,0.12)",
      color: "#facc15",
      border: "1px solid rgba(250,204,21,0.55)",
    };
  } else {
    stockLabel = `${totalStock} in stock`;
    stockStyle = {
      backgroundColor: "rgba(34,197,94,0.14)",
      color: "#4ade80",
      border: "1px solid rgba(74,222,128,0.55)",
    };
  }

  // 3) Smart reorder suggestion (very simple rule for now)
  let smartHint = null;
  if (totalStock === 0) {
    smartHint =
      "No stock left. Consider ordering at least 30 units for the next delivery.";
  } else if (totalStock <= 5) {
    smartHint =
      "Stock is low. Consider ordering 20–30 units to avoid running out.";
  }

  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.45rem",
        padding: "0.65rem 0.75rem",
        borderRadius: "0.7rem",
        background:
          "linear-gradient(90deg, rgba(15,23,42,0.9), rgba(15,23,42,0.97))",
        border: "1px solid rgba(30,64,175,0.5)",
      }}
    >
      {/* Top row: main info + actions */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        {/* Left: medicine info */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.4rem",
              marginBottom: "0.1rem",
            }}
          >
            <h3
              style={{
                fontSize: "0.96rem",
                fontWeight: 600,
                color: "#e5e7eb",
              }}
            >
              {med.name}
            </h3>
            <span
              style={{
                fontSize: "0.78rem",
                color: "rgba(148,163,184,0.95)",
              }}
            >
              ({med.strength} · {med.form})
            </span>
          </div>

          <p
            style={{
              fontSize: "0.8rem",
              color: "rgba(148,163,184,0.95)",
              marginBottom: "0.1rem",
            }}
          >
            Active substance:{" "}
            <span style={{ color: "#bae6fd" }}>{med.substance}</span>
          </p>

          <p
            style={{
              fontSize: "0.78rem",
              color: "rgba(148,163,184,0.9)",
            }}
          >
            {med.pack_size} · {med.pharmacy_name}, {med.city}
          </p>

          {nextExpiry && (
            <p
              style={{
                marginTop: "0.2rem",
                fontSize: "0.74rem",
                color: "rgba(148,163,184,0.95)",
              }}
            >
              Soonest expiry:{" "}
              <span style={{ color: "#facc15" }}>{nextExpiry}</span>
            </p>
          )}
        </div>

        {/* Right: stock + actions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "0.35rem",
            minWidth: "170px",
          }}
        >
          {/* Stock pill */}
          <span
            style={{
              ...stockStyle,
              borderRadius: "999px",
              padding: "0.2rem 0.7rem",
              fontSize: "0.78rem",
              fontWeight: 500,
            }}
          >
            {stockLabel}
            {batchCount > 0 && ` · ${batchCount} batch${batchCount > 1 ? "es" : ""}`}
          </span>

          {/* Smart hint (only when relevant) */}
          {smartHint && (
            <p
              style={{
                fontSize: "0.72rem",
                color: "rgba(156,163,175,0.95)",
                maxWidth: "13rem",
                textAlign: "right",
              }}
            >
              {smartHint}
            </p>
          )}

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              gap: "0.4rem",
              marginTop: "0.2rem",
            }}
          >
            <button
              type="button"
              onClick={() => onAddBatch?.(med)}
              style={{
                fontSize: "0.78rem",
                padding: "0.25rem 0.6rem",
                borderRadius: "0.6rem",
                border: "1px solid rgba(34,197,94,0.8)",
                backgroundColor: "rgba(15,23,42,0.95)",
                color: "#bbf7d0",
                cursor: "pointer",
              }}
            >
              + Add batch
            </button>

            <button
              type="button"
              onClick={() => setShowBatches((v) => !v)}
              disabled={batchCount === 0}
              style={{
                fontSize: "0.78rem",
                padding: "0.25rem 0.6rem",
                borderRadius: "0.6rem",
                border: "1px solid rgba(59,130,246,0.7)",
                backgroundColor: "rgba(15,23,42,0.95)",
                color:
                  batchCount === 0 ? "rgba(148,163,184,0.6)" : "#bfdbfe",
                cursor:
                  batchCount === 0 ? "not-allowed" : "pointer",
              }}
            >
              {batchCount === 0
                ? "No batches yet"
                : showBatches
                ? "Hide batch details"
                : "Show batch details"}
            </button>

            <button
              type="button"
              onClick={() => onEdit?.(med)}
              style={{
                fontSize: "0.78rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.6rem",
                border: "1px solid rgba(148,163,184,0.8)",
                backgroundColor: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => onDelete?.(med.id)}
              style={{
                fontSize: "0.78rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.6rem",
                border: "1px solid rgba(239,68,68,0.8)",
                backgroundColor: "rgba(15,23,42,0.95)",
                color: "#fecaca",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible batch details */}
      {showBatches && batchCount > 0 && (
        <div
          style={{
            marginTop: "0.35rem",
            padding: "0.4rem 0.55rem 0.45rem",
            borderRadius: "0.6rem",
            backgroundColor: "rgba(15,23,42,0.9)",
            border: "1px dashed rgba(55,65,81,0.9)",
          }}
        >
          <p
            style={{
              fontSize: "0.74rem",
              color: "rgba(148,163,184,0.95)",
              marginBottom: "0.25rem",
            }}
          >
            Batches (soonest expiry first):
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 0.8fr 0.9fr 1fr",
              columnGap: "0.5rem",
              rowGap: "0.25rem",
              fontSize: "0.72rem",
              color: "rgba(209,213,219,0.95)",
            }}
          >
            <div style={{ fontWeight: 500 }}>Batch #</div>
            <div style={{ fontWeight: 500 }}>Qty</div>
            <div style={{ fontWeight: 500 }}>Expiry</div>
            <div style={{ fontWeight: 500 }}>Received</div>

            {sortedBatches.map((b) => (
              <Fragment key={b.id || `${b.medicine_id}-${b.batch_number}-${b.expiry_date}`}>
                <div>{b.batch_number}</div>
                <div>{b.quantity}</div>
                <div>{b.expiry_date || "—"}</div>
                <div>{b.date_received || "—"}</div>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

// Need Fragment for keying rows
import { Fragment } from "react";

export default MedicineCard;
