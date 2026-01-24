import { useState } from "react";

export default function RejectModal({ prescription, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const canSubmit = reason !== "";

  return (
    <div className="modal">
      <h2>Reject Prescription</h2>
      <p>{prescription.patientName} — {prescription.id}</p>

      <select value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="">Select reason</option>
        <option value="OUT_OF_STOCK">Out of stock</option>
        <option value="INSUFFICIENT_QTY">Insufficient quantity</option>
        <option value="INVALID_DOSAGE">Invalid dosage</option>
        <option value="OTHER">Other</option>
      </select>

      <textarea
        placeholder="Optional explanation (visible to doctor & patient)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="actions">
        <button disabled={!canSubmit} onClick={() => onConfirm(reason, note)}>
          Confirm Rejection
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
