import { canFulfillPrescription, hoursWaiting } from "../../utils/prescriptionUtils";

export default function PrescriptionCard({ prescription, onReject, onFulfill }) {
  const canFulfill = canFulfillPrescription(prescription);
  const waitingHours = hoursWaiting(prescription.createdAt);

  return (
    <div className="card">
      <h3>{prescription.patientName}</h3>
      <p className="meta">ID: {prescription.id}</p>
      <p className={`waiting ${waitingHours > 12 ? "danger" : ""}`}>
        Waiting: {waitingHours}h
      </p>

      <ul className="med-list">
        {prescription.medicines.map((med) => {
          const ok = med.stockQty >= med.requiredQty;
          return (
            <li key={med.name} className={ok ? "ok" : "bad"}>
              {med.name} — {med.requiredQty} needed / {med.stockQty} in stock
            </li>
          );
        })}
      </ul>

      <div className="actions">
        <button
          disabled={!canFulfill}
          onClick={() => onFulfill(prescription.id)}
        >
          Fulfill
        </button>

        <button className="danger" onClick={() => onReject(prescription)}>
          Reject
        </button>
      </div>

      {!canFulfill && (
        <p className="warning">
          Fulfillment locked — insufficient inventory
        </p>
      )}
    </div>
  );
}
