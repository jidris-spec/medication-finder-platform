// src/pages/pharmacy/MedicineList.jsx
import MedicineCard from "./MedicineCard.jsx";

function MedicineList({
  medicines,
  query,
  onEdit,
  onDelete,
  onAddBatch,
  batches = [],
}) {
  if (!medicines || medicines.length === 0) {
    return (
      <p
        style={{
          fontSize: "0.86rem",
          color: "rgba(148,163,184,0.95)",
          padding: "0.35rem 0.1rem 0.1rem",
        }}
      >
        No medicines match{" "}
        <span style={{ color: "#38bdf8" }}>&quot;{query}&quot;</span>. Try
        another name or substance.
      </p>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.55rem",
        marginTop: "0.1rem",
      }}
    >
      {medicines.map((med) => {
        const medicineBatches = batches.filter(
          (b) => b.medicine_id === med.id
        );

        return (
          <MedicineCard
            key={med.id}
            med={med}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddBatch={onAddBatch}
            batches={medicineBatches}
          />
        );
      })}
    </div>
  );
}

export default MedicineList;
