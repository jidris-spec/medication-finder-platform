export function canFulfillPrescription(prescription) {
  return prescription.medicines.every(
    (med) => med.stockQty >= med.requiredQty
  );
}

export function hoursWaiting(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now - created) / (1000 * 60 * 60));
}
