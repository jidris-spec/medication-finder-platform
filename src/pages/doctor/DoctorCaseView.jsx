import { useMemo, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { DOCTOR_CASES } from "../../data/doctorCases.js";
import { supabase } from "../../lib/supabaseClient";


export default function DoctorCaseView() {
  const { id } = useParams();

  const caseItem = useMemo(
    () => DOCTOR_CASES.find((c) => String(c.id) === String(id)),
    [id]
  );
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState([]);
  const [notesError, setNotesError] = useState(null);

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadNotes() {
    setNotesError(null);
    const { data, error } = await supabase
      .from("doctor_case_notes")
      .select("id, case_id, text, created_at")
      .eq("case_id", String(id))
      .order("created_at", { ascending: false });

    if (error) {
      setNotesError(error.message);
      setNotes([]);
      return;
    }

    setNotes((data || []).map((n) => ({
      id: n.id,
      text: n.text,
      createdAt: n.created_at,
    })));
  }

  async function addNote() {
    const text = noteText.trim();
    if (!text) return;

    setNotesError(null);
    const { error } = await supabase
      .from("doctor_case_notes")
      .insert({ case_id: String(id), text })
      .select("id, case_id, text, created_at")
      .single();

    if (error) {
      setNotesError(error.message);
      return;
    }

    setNoteText("");
    await loadNotes();
  }

  async function deleteNote(noteId) {
    setNotesError(null);
    const { error } = await supabase.from("doctor_case_notes").delete().eq("id", noteId);
    if (error) {
      setNotesError(error.message);
      return;
    }
    await loadNotes();
  }

  if (!caseItem) {
    return <div style={{ padding: "2rem", color: "white" }}>Case not found.</div>;
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        padding: "2.5rem 2rem",
        backgroundColor: "#020617",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "980px",
          backgroundColor: "rgba(15,23,42,0.96)",
          borderRadius: "1.2rem",
          border: "1px solid rgba(148,163,184,0.45)",
          padding: "2rem",
        }}
      >
        <Link
          to="/doctor"
          style={{
            color: "#93c5fd",
            fontSize: "0.85rem",
            textDecoration: "none",
          }}
        >
          ← Back to Doctor Dashboard
        </Link>

        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "#e5e7eb",
            marginTop: "1rem",
            marginBottom: "0.35rem",
          }}
        >
          {caseItem.title}
        </h1>

        <p style={{ color: "#9ca3af", marginTop: 0, marginBottom: "1.2rem" }}>
          {caseItem.patientName} · {caseItem.patientId}
        </p>

        <section
          style={{
            backgroundColor: "rgba(2,6,23,0.9)",
            borderRadius: "0.9rem",
            padding: "1rem",
            border: "1px solid rgba(51,65,85,0.8)",
            marginBottom: "1rem",
          }}
        >
          <h3 style={{ fontSize: "0.95rem", color: "#e5e7eb", marginTop: 0 }}>
            Case summary
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#cbd5f5", marginBottom: 0 }}>
            {caseItem.summary}
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "0.8rem",
            marginBottom: "1.25rem",
          }}
        >
          <Meta label="Status" value={caseItem.status} />
          <Meta label="Priority" value={caseItem.priority} />
          <Meta label="Last updated" value={caseItem.lastUpdated} />
        </section>

        <section
          style={{
            borderRadius: "1rem",
            border: "1px solid rgba(51,65,85,0.95)",
            backgroundColor: "rgba(15,23,42,0.9)",
            padding: "1.1rem 1.2rem",
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
            <h2 style={{ margin: 0, fontSize: "1rem", color: "#e5e7eb" }}>
              Doctor updates
            </h2>
            <span style={{ fontSize: "0.78rem", color: "rgba(148,163,184,0.9)" }}>
              {notes.length} update{notes.length !== 1 ? "s" : ""}
            </span>
          </div>

          {notesError ? (
            <div style={{ marginBottom: "0.6rem", fontSize: "0.85rem", color: "rgba(248,113,113,0.95)" }}>
              Error: {notesError}
            </div>
          ) : null}

          <label
            style={{
              display: "block",
              fontSize: "0.78rem",
              color: "rgba(209,213,219,0.95)",
              marginBottom: "0.25rem",
            }}
          >
            Add a new update
          </label>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. Reviewed labs, awaiting MRI results…"
              style={{
                flex: 1,
                padding: "0.55rem 0.75rem",
                borderRadius: "0.7rem",
                border: "1px solid rgba(51,65,85,0.9)",
                backgroundColor: "rgba(2,6,23,0.9)",
                color: "#e5e7eb",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />

            <button
              type="button"
              onClick={addNote}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(34,197,94,0.7)",
                background: "linear-gradient(135deg, #16a34a, #22c55e, #38bdf8)",
                color: "white",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Add update
            </button>
          </div>

          {notes.length === 0 ? (
            <p
              style={{
                marginTop: "0.9rem",
                fontSize: "0.85rem",
                color: "rgba(148,163,184,0.95)",
              }}
            >
              No updates yet. Add the first progress update for this patient.
            </p>
          ) : (
            <div style={{ marginTop: "0.9rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {notes.map((n) => (
                <div
                  key={n.id}
                  style={{
                    borderRadius: "0.85rem",
                    border: "1px solid rgba(30,64,175,0.35)",
                    background: "rgba(2,6,23,0.9)",
                    padding: "0.75rem 0.85rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.8rem",
                      alignItems: "baseline",
                      marginBottom: "0.3rem",
                    }}
                  >
                    <span style={{ fontSize: "0.74rem", color: "rgba(148,163,184,0.9)" }}>
                      {formatDate(n.createdAt)}
                    </span>

                    <button
                      type="button"
                      onClick={() => deleteNote(n.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "rgba(248,113,113,0.9)",
                        cursor: "pointer",
                        fontSize: "0.78rem",
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  <div style={{ fontSize: "0.9rem", color: "#e5e7eb", lineHeight: 1.45 }}>
                    {n.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div
      style={{
        backgroundColor: "rgba(2,6,23,0.9)",
        borderRadius: "0.75rem",
        padding: "0.75rem",
        border: "1px solid rgba(51,65,85,0.8)",
      }}
    >
      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{label}</div>
      <div style={{ fontSize: "0.85rem", color: "#e5e7eb" }}>{String(value)}</div>
    </div>
  );
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
