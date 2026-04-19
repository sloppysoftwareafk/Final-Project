import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { COLORS } from "../lib/theme";
import Icon from "../components/Icon";
import { StatusPill } from "../components/Pills";

export default function Tests({ token, role, setPage, setSelectedTestId }) {
  const [tests, setTests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsAnalytics, setResultsAnalytics] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [questionModalTest, setQuestionModalTest] = useState(null);
  const [questionPool, setQuestionPool] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [form, setForm] = useState({ title: "", topic: "Algorithms", durationMinutes: 30, status: "Scheduled" });

  const resetForm = () => {
    setForm({ title: "", topic: "Algorithms", durationMinutes: 30, status: "Scheduled" });
    setEditingTestId(null);
  };

  const loadTests = async () => {
    const data = await api("/tests", { token });
    setTests(data);
  };

  useEffect(() => { loadTests(); }, [token]);

  const createTest = async () => {
    const created = await api("/tests", { method: "POST", token, body: form });
    setShowModal(false);
    resetForm();
    await loadTests();
    await openManageQuestionsModal(created);
  };

  const updateTest = async () => {
    await api(`/tests/${editingTestId}`, {
      method: "PATCH",
      token,
      body: {
        title: form.title,
        topic: form.topic,
        durationMinutes: Number(form.durationMinutes),
        status: form.status,
      },
    });
    setShowModal(false);
    resetForm();
    await loadTests();
  };

  const openEditModal = (test) => {
    setEditingTestId(test.id);
    setForm((prev) => ({
      ...prev,
      title: test.title,
      topic: test.topic || "Algorithms",
      durationMinutes: Number(test.duration || 30),
      status: test.status || "Scheduled",
    }));
    setShowModal(true);
  };

  const openManageQuestionsModal = async (test) => {
    const data = await api(`/tests/${test.id}/question-pool`, { token });
    setQuestionModalTest(test);
    setQuestionPool(data.questions || []);
    setSelectedQuestionIds((data.assignedQuestionIds || []).map((value) => Number(value)));
    setShowQuestionsModal(true);
  };

  const toggleQuestion = (id) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const saveManagedQuestions = async () => {
    if (!questionModalTest) return;
    await api(`/tests/${questionModalTest.id}/questions`, {
      method: "PUT",
      token,
      body: { questionIds: selectedQuestionIds },
    });
    setShowQuestionsModal(false);
    setQuestionModalTest(null);
    setQuestionPool([]);
    setSelectedQuestionIds([]);
    await loadTests();
  };

  const deleteTest = async (test) => {
    const confirmed = window.confirm(`Delete test "${test.title}"? This cannot be undone.`);
    if (!confirmed) return;
    await api(`/tests/${test.id}`, { method: "DELETE", token });
    await loadTests();
  };

  const openResultsModal = async (test) => {
    setLoadingResults(true);
    try {
      const data = await api(`/tests/${test.id}/analytics`, { token });
      setResultsAnalytics(data);
      setShowResultsModal(true);
    } finally {
      setLoadingResults(false);
    }
  };

  const closeTest = async (test) => {
    const confirmed = window.confirm(`Close test "${test.title}" for everyone? Students will no longer be able to start it.`);
    if (!confirmed) return;
    await api(`/tests/${test.id}/close`, { method: "POST", token });
    await loadTests();
  };

  return (
    <div className="fade-in" style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em" }}>{role === "Student" ? "Available Tests" : "Test Management"}</h1>
          <p style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>{role === "Student" ? "Choose a live/scheduled test and start" : "Create and manage timed assessments"}</p>
        </div>
        {role === "Instructor" && (
          <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 7 }} onClick={() => { resetForm(); setShowModal(true); }}>
            <Icon name="plus" size={14} color="#fff" /> New Test
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {tests.map(t => (
          <div key={t.id} className="card slide-up" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <StatusPill status={t.status} />
              <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{t.date}</span>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{t.title}</h3>
            <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 18 }}>{t.topic || "General"}</p>
            <div style={{ display: "flex", gap: 18, marginBottom: 18 }}>
              {[{ label: "Questions", val: t.questions }, { label: "Duration", val: `${t.duration}m` }, { label: "Attempts", val: t.attempts }].map(m => (
                <div key={m.label}><div style={{ fontSize: 18, fontWeight: 600 }}>{m.val}</div><div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{m.label}</div></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {role === "Student" ? (
                <button className="btn-primary" style={{ flex: 1, fontSize: 13, padding: "8px 0" }} onClick={() => { setSelectedTestId(t.id); setPage("take-test"); }}>Start Test</button>
              ) : (
                <button className="btn-primary" style={{ flex: 1, fontSize: 13, padding: "8px 0" }} onClick={() => (t.status === "Completed" ? openResultsModal(t) : openEditModal(t))} disabled={loadingResults && t.status === "Completed"}>
                  {t.status === "Live" ? "Monitor" : t.status === "Scheduled" ? "Edit" : loadingResults ? "Loading..." : "Results"}
                </button>
              )}
              <button className="btn-ghost" style={{ padding: "8px 12px" }} onClick={() => role === "Instructor" ? openManageQuestionsModal(t) : openEditModal(t)}>{role === "Instructor" ? "Questions" : <Icon name="edit" size={14} />}</button>
              {role === "Instructor" && t.status !== "Completed" && (
                <button className="btn-ghost" style={{ padding: "8px 12px" }} onClick={() => closeTest(t)}>Close</button>
              )}
              {role === "Instructor" && (
                <button className="btn-ghost" style={{ padding: "8px 12px" }} onClick={() => deleteTest(t)}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div className="card" style={{ width: 620, padding: 24 }}>
            <h3 className="serif" style={{ fontSize: 24, marginBottom: 14 }}>{editingTestId ? "Edit Test" : "New Test"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input className="input-field" placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              <select className="input-field" value={form.topic} onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}>{["Data Structures", "Algorithms", "Databases", "Networking", "OS"].map((t) => <option key={t}>{t}</option>)}</select>
              <input className="input-field" type="number" min="1" value={form.durationMinutes} onChange={(e) => setForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))} placeholder="Duration Minutes" />
              {editingTestId && (
                <select className="input-field" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  {["Scheduled", "Live", "Completed"].map((status) => <option key={status}>{status}</option>)}
                </select>
              )}
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 12 }}>
              Question count is auto-calculated from selected subject questions.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="btn-ghost" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
              <button className="btn-primary" onClick={editingTestId ? updateTest : createTest}>{editingTestId ? "Save" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {showQuestionsModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 55 }}>
          <div className="card" style={{ width: 760, maxHeight: "84vh", padding: 24, display: "flex", flexDirection: "column" }}>
            <h3 className="serif" style={{ fontSize: 24, marginBottom: 6 }}>Manage Test Questions</h3>
            <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 14 }}>
              {questionModalTest?.title} · Subject: {questionModalTest?.topic || "-"} · Selected: {selectedQuestionIds.length}
            </p>

            <div className="card" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, overflowY: "auto", flex: 1, padding: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {questionPool.map((q) => {
                  const checked = selectedQuestionIds.includes(Number(q.id));
                  return (
                    <label key={q.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: checked ? COLORS.accentDim : "transparent", border: `1px solid ${checked ? COLORS.accent + "66" : COLORS.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleQuestion(Number(q.id))} style={{ marginTop: 3 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{q.text}</div>
                        <div style={{ fontSize: 12, color: COLORS.textMuted }}>{q.topic} · {q.difficulty}</div>
                      </div>
                    </label>
                  );
                })}
                {questionPool.length === 0 && <div style={{ padding: 24, textAlign: "center", color: COLORS.textMuted }}>No approved questions found.</div>}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Only subject-matched approved questions are shown. Count is automatic.</span>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-ghost" onClick={() => { setShowQuestionsModal(false); setQuestionModalTest(null); setQuestionPool([]); setSelectedQuestionIds([]); }}>Cancel</button>
                <button className="btn-primary" onClick={saveManagedQuestions} disabled={selectedQuestionIds.length === 0} style={{ opacity: selectedQuestionIds.length === 0 ? 0.5 : 1 }}>Save Questions</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResultsModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 60 }}>
          <div className="card" style={{ width: 760, maxHeight: "84vh", overflowY: "auto", padding: 24 }}>
            <h3 className="serif" style={{ fontSize: 24, marginBottom: 6 }}>Completed Exam Analytics</h3>
            <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 14 }}>
              {resultsAnalytics?.summary?.title} · {resultsAnalytics?.summary?.topic}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 11, color: COLORS.textMuted }}>Attempts</div><div style={{ fontSize: 18, fontWeight: 700 }}>{resultsAnalytics?.summary?.attempts || 0}</div></div>
              <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 11, color: COLORS.textMuted }}>Average</div><div style={{ fontSize: 18, fontWeight: 700 }}>{resultsAnalytics?.summary?.avg_score || 0}%</div></div>
              <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 11, color: COLORS.textMuted }}>Best</div><div style={{ fontSize: 18, fontWeight: 700, color: COLORS.green }}>{resultsAnalytics?.summary?.best_score || 0}%</div></div>
              <div className="card" style={{ padding: 12 }}><div style={{ fontSize: 11, color: COLORS.textMuted }}>Lowest</div><div style={{ fontSize: 18, fontWeight: 700, color: COLORS.red }}>{resultsAnalytics?.summary?.lowest_score || 0}%</div></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="card" style={{ padding: 14 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Top Performers</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(resultsAnalytics?.topPerformers || []).map((row, idx) => (
                    <div key={`${row.name}-${idx}`} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 6 }}>
                      <span style={{ fontSize: 13 }}>{row.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{row.percentage}%</span>
                    </div>
                  ))}
                  {(resultsAnalytics?.topPerformers || []).length === 0 && <div style={{ color: COLORS.textMuted, fontSize: 13 }}>No submissions yet.</div>}
                </div>
              </div>

              <div className="card" style={{ padding: 14 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Score Distribution</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(resultsAnalytics?.scoreDistribution || []).map((bucket) => (
                    <div key={bucket.range} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 6 }}>
                      <span style={{ fontSize: 13 }}>{bucket.range}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{bucket.count}</span>
                    </div>
                  ))}
                  {(resultsAnalytics?.scoreDistribution || []).length === 0 && <div style={{ color: COLORS.textMuted, fontSize: 13 }}>No scores yet.</div>}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => { setShowResultsModal(false); setResultsAnalytics(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
