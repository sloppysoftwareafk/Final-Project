import { COLORS } from "../lib/theme";
import Icon from "../components/Icon";

export default function Dashboard({ setPage, setSelectedTestId, summary, leaderboard, tests = [], role, user }) {
  const myLeaderboardEntry = role === "Customer"
    ? leaderboard.find((entry) => Number(entry.userId) === Number(user?.id))
    : null;

  const stats = role === "Customer"
    ? [
        { label: "Available Policies", value: String(tests.length || summary.active_tests || 0), icon: "test", delta: "Take a test now" },
        { label: "My Claims", value: String(myLeaderboardEntry?.tests || 0), icon: "book", delta: "Tests you have taken" },
        { label: "Class Avg.", value: `${summary.avg_score || 0}%`, icon: "chart", delta: "Across all submissions" },
        { label: "Ranking", value: myLeaderboardEntry?.rank ? `#${myLeaderboardEntry.rank}` : "-", icon: "trophy", delta: "Keep improving" },
      ]
    : [
        { label: "Total Policy Plans", value: String(summary.total_questions || 0), icon: "book", delta: "Question bank" },
        { label: "Active Policies", value: String(summary.active_tests || 0), icon: "test", delta: "Live + scheduled" },
        { label: "Customers Enrolled", value: String(summary.students_enrolled || 0), icon: "user", delta: "Registered students" },
        { label: "Avg. Claim Approval", value: `${summary.avg_score || 0}%`, icon: "chart", delta: "Overall average" },
      ];

  return (
    <div className="fade-in" style={{ padding: "32px 36px" }}>
      <div style={{ marginBottom: 36 }}>
        <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 6 }}>Tuesday, March 31, 2026</p>
        <h1 className="serif" style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.02em" }}>Good morning, <span style={{ color: COLORS.accentSoft }}>{role}</span> 👋</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 36 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card slide-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
              <span style={{ color: COLORS.accent, opacity: 0.7 }}><Icon name={s.icon} size={15} /></span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: COLORS.green }}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>{role === "Customer" ? "Available Policies" : "Recent Policies"}</h2>
            <button className="btn-ghost" onClick={() => setPage("tests")} style={{ fontSize: 12, padding: "6px 14px" }}>View all</button>
          </div>
          {role === "Customer" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tests.slice(0, 3).map((test) => (
                <div key={test.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px", background: COLORS.surface }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{test.title}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 3 }}>{test.topic} · {test.questions} Q · {test.duration}m</div>
                  </div>
                  <button className="btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => { setSelectedTestId(test.id); setPage("take-test"); }}>Start</button>
                </div>
              ))}
              {tests.length === 0 && <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No available policies right now.</p>}
            </div>
          ) : (
            <p style={{ color: COLORS.textMuted, fontSize: 13 }}>Navigate to Policies for full policy and claim actions.</p>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Icon name="trophy" size={15} color={COLORS.amber} />
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Customer Leaderboard</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {leaderboard.map((s) => (
              <div key={s.rank} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 22, textAlign: "center", fontSize: 13, fontWeight: 600, color: s.rank === 1 ? COLORS.amber : COLORS.textMuted }}>
                  {s.rank === 1 ? "🥇" : s.rank === 2 ? "🥈" : s.rank === 3 ? "🥉" : s.rank}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                  <div style={{ marginTop: 4 }}><div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${s.score}%` }} /></div></div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.accentSoft }}>{s.score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
