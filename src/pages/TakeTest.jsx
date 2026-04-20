import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { COLORS } from "../lib/theme";
import Icon from "../components/Icon";
import { DifficultyPill, Pill } from "../components/Pills";

export default function TakeTest({ token, selectedTestId, onSelectTest }) {
  const [attemptMeta, setAttemptMeta] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [availablePolicies, setAvailablePolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");

  const storageKey = selectedTestId ? `take-test:${selectedTestId}` : null;

  useEffect(() => {
    if (selectedTestId) return;
    (async () => {
      try {
        setLoadingPolicies(true);
        setError("");
        const list = await api("/tests", { token });
        setAvailablePolicies(Array.isArray(list) ? list : []);
      } catch (err) {
        setError(err.message || "Unable to load policies");
      } finally {
        setLoadingPolicies(false);
      }
    })();
  }, [selectedTestId, token]);

  useEffect(() => {
    if (!selectedTestId) return;
    (async () => {
      setError("");
      setAttemptMeta(null);
      setQuestions([]);
      setCurrent(0);
      setAnswers({});
      setSubmitted(false);
      setResult(null);

      try {
        const meta = await api(`/tests/${selectedTestId}/start`, { method: "POST", token });
        setAttemptMeta(meta);
        const list = await api(`/tests/${selectedTestId}/questions`, { token });
        setQuestions(list);

        const sec = Math.max(0, Math.floor((new Date(meta.endsAt).getTime() - Date.now()) / 1000));

        let restored = false;
        if (storageKey) {
          const raw = sessionStorage.getItem(storageKey);
          if (raw) {
            try {
              const cached = JSON.parse(raw);
              if (Number(cached?.attemptId) === Number(meta.attemptId)) {
                setAnswers(cached.answers || {});
                setCurrent(Math.max(0, Math.min(Number(cached.current || 0), Math.max(0, list.length - 1))));
                restored = true;
              }
            } catch {
              sessionStorage.removeItem(storageKey);
            }
          }
        }

        if (!restored) {
          setCurrent(0);
          setAnswers({});
        }
        setTimeLeft(sec);
      } catch (err) {
        setError(err.message || "Unable to load test");
      }
    })();
  }, [selectedTestId, token, storageKey]);

  useEffect(() => {
    if (!storageKey || !attemptMeta || submitted) return;
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        attemptId: attemptMeta.attemptId,
        answers,
        current,
      })
    );
  }, [answers, current, attemptMeta, submitted, storageKey]);

  useEffect(() => {
    if (submitted || !attemptMeta) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [submitted, attemptMeta]);

  useEffect(() => {
    if (!attemptMeta || submitted || timeLeft !== 0 || questions.length === 0) return;
    const autoSubmit = async () => {
      try {
        const payload = {
          attemptId: attemptMeta.attemptId,
          timeSpentSeconds: attemptMeta.durationMinutes * 60,
          answers: Object.entries(answers).map(([questionId, optionId]) => ({ questionId: Number(questionId), optionId })),
        };
        const out = await api(`/tests/${selectedTestId}/submit`, { method: "POST", token, body: payload });
        if (storageKey) sessionStorage.removeItem(storageKey);
        setResult(out);
        setSubmitted(true);
      } catch {
        setError("Time expired and auto-submit failed. Please reopen the test.");
      }
    };
    autoSubmit();
  }, [timeLeft, attemptMeta, submitted, questions.length, answers, selectedTestId, token, storageKey]);

  if (!selectedTestId) {
    return (
      <div className="fade-in" style={{ padding: "32px 36px" }}>
        <div style={{ marginBottom: 18 }}>
          <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em" }}>File Claim</h1>
          <p style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>Choose a policy to start your claim flow.</p>
        </div>
        <div className="card" style={{ padding: 20 }}>
          {loadingPolicies ? (
            <p style={{ color: COLORS.textMuted, fontSize: 13 }}>Loading available policies...</p>
          ) : availablePolicies.length === 0 ? (
            <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No active policies are available right now.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
              {availablePolicies.map((policy) => (
                <div key={policy.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, background: COLORS.surface }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{policy.title}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                    {policy.topic} · {policy.questions} plans · {policy.duration}m
                  </div>
                  <button
                    className="btn-primary"
                    style={{ marginTop: 10, width: "100%", fontSize: 12, padding: "7px 0" }}
                    onClick={() => onSelectTest?.(policy.id)}
                  >
                    Start Claim
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  if (error) return <div className="fade-in" style={{ padding: "32px 36px" }}><div className="card" style={{ padding: 24, color: COLORS.red }}>{error}</div></div>;
  if (!attemptMeta || questions.length === 0) return <div className="fade-in" style={{ padding: "32px 36px" }}><div className="card" style={{ padding: 24 }}>Loading policy details...</div></div>;

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const safeCurrent = Math.max(0, Math.min(current, questions.length - 1));
  const q = questions[safeCurrent];
  const score = result?.correct || 0;
  const pct = Math.round(result?.percentage || 0);

  const submitTest = async () => {
    const payload = {
      attemptId: attemptMeta.attemptId,
      timeSpentSeconds: attemptMeta.durationMinutes * 60 - timeLeft,
      answers: Object.entries(answers).map(([questionId, optionId]) => ({ questionId: Number(questionId), optionId })),
    };
    const out = await api(`/tests/${selectedTestId}/submit`, { method: "POST", token, body: payload });
    if (storageKey) {
      sessionStorage.removeItem(storageKey);
    }
    setResult(out);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="fade-in" style={{ padding: "48px 36px", maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{pct >= 70 ? "🎉" : pct >= 40 ? "👍" : "📚"}</div>
        <h1 className="serif" style={{ fontSize: 32, marginBottom: 8 }}>Claim Submitted</h1>
        <p style={{ color: COLORS.textMuted, marginBottom: 32 }}>Claim review summary</p>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 32, marginBottom: 28 }}>
          <div style={{ fontSize: 64, fontWeight: 700, color: pct >= 70 ? COLORS.green : pct >= 40 ? COLORS.amber : COLORS.red, marginBottom: 4 }}>{pct}%</div>
          <div style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 24 }}>{score} / {questions.length} correct</div>
          <div className="progress-bar-bg" style={{ height: 8 }}><div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 70 ? COLORS.green : pct >= 40 ? COLORS.amber : COLORS.red }} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: "32px 36px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 18, fontWeight: 600 }}>{attemptMeta.title}</h1><p style={{ color: COLORS.textMuted, fontSize: 13 }}>Plan {safeCurrent + 1} of {questions.length}</p></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: timeLeft < 60 ? COLORS.red : COLORS.textSub, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 15, fontWeight: 600 }}><Icon name="clock" size={15} color={timeLeft < 60 ? COLORS.red : COLORS.textSub} />{fmt(timeLeft)}</div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
        {questions.map((item, i) => <div key={item.id} onClick={() => setCurrent(i)} style={{ flex: 1, height: 4, borderRadius: 100, cursor: "pointer", background: answers[item.id] !== undefined ? COLORS.accent : i === safeCurrent ? COLORS.accentSoft : COLORS.border, transition: "background 0.2s", opacity: i === safeCurrent ? 1 : 0.7 }} />)}
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}><DifficultyPill level={q.difficulty} /><Pill>{q.topic}</Pill></div>
        <p style={{ fontSize: 17, lineHeight: 1.6, fontWeight: 500 }}>{q.text}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {q.options.map((opt, i) => (
          <button key={opt.id} className={`option-btn${answers[q.id] === opt.id ? " selected" : ""}`} onClick={() => setAnswers(p => ({ ...p, [q.id]: opt.id }))}>
            <span style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${answers[q.id] === opt.id ? COLORS.accent : COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0, color: answers[q.id] === opt.id ? COLORS.accent : COLORS.textMuted }}>{["A", "B", "C", "D"][i]}</span>
            {opt.text}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn-ghost" onClick={() => setCurrent(p => Math.max(0, p - 1))} disabled={current === 0} style={{ opacity: current === 0 ? 0.4 : 1 }}>← Previous</button>
        {safeCurrent < questions.length - 1 ? <button className="btn-primary" onClick={() => setCurrent(p => p + 1)}>Next →</button> : <button className="btn-primary" onClick={submitTest} style={{ background: COLORS.green }}>Submit Claim</button>}
      </div>
    </div>
  );
}
