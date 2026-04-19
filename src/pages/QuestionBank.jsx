import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { COLORS } from "../lib/theme";
import Icon from "../components/Icon";
import { DifficultyPill, Pill } from "../components/Pills";

export default function QuestionBank({ token, role }) {
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("All");
  const [diff, setDiff] = useState("All");
  const [status, setStatus] = useState(role === "Student" ? "Approved" : "All");
  const [questions, setQuestions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ topic: "Data Structures", difficulty: "Easy", text: "", options: ["", "", "", ""], correctIndex: 0 });

  const topics = ["All", "Data Structures", "Algorithms", "Databases", "Networking", "OS"];
  const diffs = ["All", "Easy", "Medium", "Hard"];

  const loadQuestions = async () => {
    const params = new URLSearchParams({ search, topic, difficulty: diff, status });
    const data = await api(`/questions?${params.toString()}`, { token });
    setQuestions(data);
  };

  useEffect(() => { loadQuestions(); }, [search, topic, diff, status]);

  const addQuestion = async () => {
    await api("/questions", { method: "POST", token, body: form });
    setShowModal(false);
    setForm({ topic: "Data Structures", difficulty: "Easy", text: "", options: ["", "", "", ""], correctIndex: 0 });
    await loadQuestions();
  };

  const updateStatus = async (id, nextStatus) => {
    await api(`/questions/${id}/status`, { method: "PATCH", token, body: { status: nextStatus } });
    await loadQuestions();
  };

  return (
    <div className="fade-in" style={{ padding: "32px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em" }}>Question Bank</h1>
          <p style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>{questions.length} loaded questions</p>
        </div>
        {(role === "Contributor" || role === "Instructor") && (
          <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 7 }} onClick={() => setShowModal(true)}>
            <Icon name="plus" size={14} color="#fff" /> Add Question
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input className="input-field" style={{ width: 240 }} placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field" style={{ width: 160 }} value={topic} onChange={e => setTopic(e.target.value)}>{topics.map(t => <option key={t}>{t}</option>)}</select>
        <select className="input-field" style={{ width: 130 }} value={diff} onChange={e => setDiff(e.target.value)}>{diffs.map(d => <option key={d}>{d}</option>)}</select>
        {role !== "Student" && <select className="input-field" style={{ width: 140 }} value={status} onChange={e => setStatus(e.target.value)}>{["All", "Pending", "Approved", "Rejected"].map(s => <option key={s}>{s}</option>)}</select>}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              {["#", "Question", "Topic", "Difficulty", "Status", "Options", ""].map(h => <th key={h} style={{ padding: "13px 18px", textAlign: "left", fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => (
              <tr key={q.id} style={{ borderBottom: `1px solid ${COLORS.border}20` }}>
                <td style={{ padding: "14px 18px", color: COLORS.textMuted, fontSize: 13 }}>{i + 1}</td>
                <td style={{ padding: "14px 18px", fontSize: 14, maxWidth: 340 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.text}</div></td>
                <td style={{ padding: "14px 18px" }}><Pill>{q.topic}</Pill></td>
                <td style={{ padding: "14px 18px" }}><DifficultyPill level={q.difficulty} /></td>
                <td style={{ padding: "14px 18px" }}><Pill color={q.status === "Approved" ? COLORS.green : q.status === "Pending" ? COLORS.amber : COLORS.red}>{q.status}</Pill></td>
                <td style={{ padding: "14px 18px", color: COLORS.textMuted, fontSize: 13 }}>{q.option_count}</td>
                <td style={{ padding: "14px 18px" }}>
                  {role === "Instructor" && q.status === "Pending" ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-primary" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => updateStatus(q.id, "Approved")}>Approve</button>
                      <button className="btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => updateStatus(q.id, "Rejected")}>Reject</button>
                    </div>
                  ) : <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 12, display: "flex", gap: 5, alignItems: "center" }}><Icon name="edit" size={12} /> View</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {questions.length === 0 && <div style={{ padding: 40, textAlign: "center", color: COLORS.textMuted, fontSize: 14 }}>No questions found</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div className="card" style={{ width: 640, padding: 24 }}>
            <h3 className="serif" style={{ fontSize: 24, marginBottom: 14 }}>Add Question</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <select className="input-field" value={form.topic} onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}>{topics.slice(1).map(t => <option key={t}>{t}</option>)}</select>
              <select className="input-field" value={form.difficulty} onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}>{diffs.slice(1).map(d => <option key={d}>{d}</option>)}</select>
            </div>
            <textarea className="input-field" rows={3} placeholder="Question text" value={form.text} onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              {form.options.map((opt, idx) => (
                <input key={idx} className="input-field" placeholder={`Option ${idx + 1}`} value={opt} onChange={(e) => { const next = [...form.options]; next[idx] = e.target.value; setForm((p) => ({ ...p, options: next })); }} />
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <select className="input-field" value={form.correctIndex} onChange={(e) => setForm((p) => ({ ...p, correctIndex: Number(e.target.value) }))}>{[0, 1, 2, 3].map((i) => <option key={i} value={i}>{`Correct Option: ${i + 1}`}</option>)}</select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={addQuestion}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
