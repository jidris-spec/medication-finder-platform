// src/data/doctorCases.js
export const DOCTOR_CASES = [
  {
    id: "case-001",
    patientName: "Maria Popescu",
    patientId: "RO-INS-00123",
    title: "Hypertension follow-up",
    summary: "BP not stable on current dose. Review last 7 days readings.",
    status: "open", // open | in_progress | resolved
    priority: "high", // low | normal | high
    lastUpdated: "2025-12-10",
  },
  {
    id: "case-002",
    patientName: "Andrei Ionescu",
    patientId: "RO-INS-00811",
    title: "Type 2 diabetes review",
    summary: "HbA1c elevated. Discuss adherence and adjust plan.",
    status: "in_progress",
    priority: "normal",
    lastUpdated: "2025-12-09",
  },
  {
    id: "case-003",
    patientName: "Elena Stan",
    patientId: "RO-INS-00201",
    title: "Asthma flare-ups",
    summary: "Frequent night symptoms. Check inhaler technique + triggers.",
    status: "open",
    priority: "normal",
    lastUpdated: "2025-12-08",
  },
  {
    id: "case-004",
    patientName: "Mihai Dumitru",
    patientId: "RO-INS-00456",
    title: "Medication side effects",
    summary: "Dizziness after new treatment. Assess dose / interactions.",
    status: "resolved",
    priority: "low",
    lastUpdated: "2025-12-06",
  },
];
