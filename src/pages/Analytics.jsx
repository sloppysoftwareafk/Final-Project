import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { COLORS } from "../lib/theme";

export default function Analytics({ token }) {
  const [analytics, setAnalytics] = useState({ summary: {}, topicData: [], scoreDistribution: [], examData: [], subjectLeaderboards: [] });
  useEffect(() => { (async () => setAnalytics(await api("/analytics/overview", { token })))(); }, [token]);

  const topicData = analytics.topicData || [];
  const distribution = analytics.scoreDistribution || [];
  const examData = analytics.examData || [];
  const subjectLeaderboards = analytics.subjectLeaderboards || [];

  return (
    <div className="fade-in" style={{ padding: "32px 36px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em" }}>Analytics</h1>
        <p style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>Performance insights across all tests</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Topic-wise Average Score</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {topicData.map(d => (
              <div key={d.topic}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{d.topic}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: d.avg >= 75 ? COLORS.green : d.avg >= 60 ? COLORS.amber : COLORS.red }}>{d.avg}%</span>
                </div>
                <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${d.avg}%`, background: d.avg >= 75 ? COLORS.green : d.avg >= 60 ? COLORS.amber : COLORS.red }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Attempt Volume by Topic</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[...topicData].sort((a, b) => b.attempts - a.attempts).map(d => (
              <div key={d.topic} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 130, fontSize: 13, color: COLORS.textSub }}>{d.topic}</div>
                <div style={{ flex: 1, height: 28, background: COLORS.surface, borderRadius: 6, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
                  <div style={{ height: "100%", width: `${(d.attempts / 70) * 100}%`, background: `linear-gradient(90deg, ${COLORS.accent}60, ${COLORS.accent}30)`, display: "flex", alignItems: "center", paddingLeft: 10, fontSize: 12, fontWeight: 600, color: COLORS.accentSoft, transition: "width 0.6s cubic-bezier(.16,1,.3,1)" }}>{d.attempts}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Score Distribution</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}>
            {distribution.map((b) => (
              <div key={b.range} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.accentSoft }}>{b.count}</span>
                <div style={{ width: "100%", height: `${(Number(b.count) / 50) * 100}px`, background: `${COLORS.accent}30`, border: `1px solid ${COLORS.accent}50`, borderRadius: "4px 4px 0 0", transition: "height 0.5s" }} />
                <span style={{ fontSize: 10, color: COLORS.textMuted, whiteSpace: "nowrap" }}>{b.range}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, justifyContent: "center" }}>
          {[
            { label: "Total Questions", value: analytics.summary.total_questions || 0, color: COLORS.accentSoft },
            { label: "Active Tests", value: analytics.summary.active_tests || 0, color: COLORS.green },
            { label: "Students", value: analytics.summary.students_enrolled || 0, color: COLORS.amber },
            { label: "Average Score", value: `${analytics.summary.avg_score || 0}%`, color: COLORS.textSub },
          ].map(k => (
            <div key={k.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: 13, color: COLORS.textMuted }}>{k.label}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Per Exam Analytics (Completed Tests)</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {examData.map((exam) => (
            <div key={exam.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, background: COLORS.surface }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{exam.title}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>{exam.topic}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <div><div style={{ fontSize: 11, color: COLORS.textMuted }}>Attempts</div><div style={{ fontSize: 16, fontWeight: 700 }}>{exam.attempts}</div></div>
                <div><div style={{ fontSize: 11, color: COLORS.textMuted }}>Avg Score</div><div style={{ fontSize: 16, fontWeight: 700 }}>{exam.avg_score}%</div></div>
                <div><div style={{ fontSize: 11, color: COLORS.textMuted }}>Best</div><div style={{ fontSize: 16, fontWeight: 700, color: COLORS.green }}>{exam.best_score}%</div></div>
                <div><div style={{ fontSize: 11, color: COLORS.textMuted }}>Lowest</div><div style={{ fontSize: 16, fontWeight: 700, color: COLORS.red }}>{exam.lowest_score}%</div></div>
              </div>
            </div>
          ))}
          {examData.length === 0 && (
            <div style={{ color: COLORS.textMuted, fontSize: 13 }}>No completed tests found yet.</div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Student Leaderboard by Subject</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {subjectLeaderboards.map((subject) => (
            <div key={subject.topic} className="card" style={{ padding: 14, background: COLORS.surface }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{subject.topic}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(subject.rows || []).map((row) => (
                  <div key={`${subject.topic}-${row.userId}`} style={{ display: "grid", gridTemplateColumns: "26px 1fr auto", gap: 10, alignItems: "center", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 6 }}>
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>{row.rank}</span>
                    <span style={{ fontSize: 13 }}>{row.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.accentSoft }}>{row.score}%</span>
                  </div>
                ))}
              </div>
              {(subject.rows || []).length === 0 && <div style={{ color: COLORS.textMuted, fontSize: 12 }}>No results yet.</div>}
            </div>
          ))}
        </div>
        {subjectLeaderboards.length === 0 && <div style={{ color: COLORS.textMuted, fontSize: 13 }}>No subject leaderboard data yet.</div>}
      </div>
    </div>
  );
}
