export const prescriptions = [
  {
    id: "RX-001",
    patientName: "John Doe",
    createdAt: "2026-01-13T08:30:00Z",
    medicines: [
      { name: "Amoxicillin", requiredQty: 10, stockQty: 20 },
      { name: "Paracetamol", requiredQty: 5, stockQty: 0 },
    ],
    status: "SENT",
  },
  {
    id: "RX-002",
    patientName: "Fatima Ali",
    createdAt: "2026-01-13T06:10:00Z",
    medicines: [
      { name: "Ibuprofen", requiredQty: 10, stockQty: 50 },
    ],
    status: "SENT",
  },
];
