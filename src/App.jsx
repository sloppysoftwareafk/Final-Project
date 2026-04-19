import { useEffect, useMemo, useState } from "react";
import { styles, COLORS } from "./lib/theme";
import { api } from "./lib/api";
import Icon from "./components/Icon";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import QuestionBank from "./pages/QuestionBank";
import Tests from "./pages/Tests";
import TakeTest from "./pages/TakeTest";
import Analytics from "./pages/Analytics";
import StudentResults from "./pages/StudentResults";

const NAV_BY_ROLE = {
  Instructor: [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "questions", label: "Question Bank", icon: "book" },
    { id: "tests", label: "Tests", icon: "test" },
    { id: "analytics", label: "Analytics", icon: "chart" },
  ],
  Contributor: [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "questions", label: "Question Bank", icon: "book" },
    { id: "tests", label: "Tests", icon: "test" },
  ],
  Student: [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "tests", label: "Available Tests", icon: "test" },
    { id: "take-test", label: "Take Test", icon: "clock" },
    { id: "results", label: "Results", icon: "chart" },
  ],
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [page, setPage] = useState("dashboard");
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [summary, setSummary] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [dashboardTests, setDashboardTests] = useState([]);

  const loadHomeData = async (activeToken) => {
    const [board, summaryRes, testsRes] = await Promise.all([
      api("/analytics/leaderboard", { token: activeToken }),
      api("/analytics/summary", { token: activeToken }),
      api("/tests", { token: activeToken }),
    ]);
    setLeaderboard(board);
    setSummary(summaryRes.summary || {});
    setDashboardTests(Array.isArray(testsRes) ? testsRes : []);
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const me = await api("/auth/me", { token });
        setUser(me);
        await loadHomeData(token);
      } catch {
        localStorage.removeItem("token");
        setToken("");
      }
    })();
  }, [token]);

  const handleLogin = async ({ email, password }) => {
    try {
      setAuthError("");
      const data = await api("/auth/login", { method: "POST", body: { email, password } });
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user);
      await loadHomeData(data.token);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const signOut = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setPage("dashboard");
    setSelectedTestId(null);
  };

  const nav = useMemo(() => NAV_BY_ROLE[user?.role || "Student"], [user?.role]);

  if (!token || !user) {
    return (
      <>
        <style>{styles}</style>
        <Login onLogin={handleLogin} error={authError} />
      </>
    );
  }

  const renderPage = () => {
    if (page === "dashboard") return <Dashboard setPage={setPage} setSelectedTestId={setSelectedTestId} summary={summary} leaderboard={leaderboard} tests={dashboardTests} role={user.role} user={user} />;
    if (page === "questions") return <QuestionBank token={token} role={user.role} />;
    if (page === "tests") return <Tests token={token} role={user.role} setPage={setPage} setSelectedTestId={setSelectedTestId} />;
    if (page === "take-test") return <TakeTest token={token} selectedTestId={selectedTestId} />;
    if (page === "analytics" && user.role === "Instructor") return <Analytics token={token} />;
    if (page === "results" && user.role === "Student") return <StudentResults token={token} />;
    return null;
  };

  return (
    <>
      <style>{styles}</style>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: COLORS.bg }}>
        <div style={{ width: 220, flexShrink: 0, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", padding: "20px 14px" }}>
          <div style={{ padding: "10px 10px 28px" }}>
            <div className="serif" style={{ fontSize: 19, letterSpacing: "-0.02em", color: COLORS.text }}>
              <span style={{ color: COLORS.accentSoft }}>exam</span>forge
            </div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>MCQ Management System</div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
            {nav.map(n => (
              <div key={n.id} className={`sidebar-item${page === n.id ? " active" : ""}`} onClick={() => setPage(n.id)}>
                <Icon name={n.icon} size={15} color={page === n.id ? COLORS.accentSoft : COLORS.textMuted} />
                {n.label}
              </div>
            ))}
          </div>

          <div>
            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 14, marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 6 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: COLORS.accentDim, border: `1px solid ${COLORS.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: COLORS.accentSoft }}>{user.fullName?.slice(0, 1) || "U"}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{user.fullName}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{user.role}</div>
                </div>
              </div>
              <div className="sidebar-item" style={{ color: COLORS.red + "AA" }} onClick={signOut}>
                <Icon name="logout" size={15} color={COLORS.red + "AA"} /> Sign out
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }} className="dot-grid">
          {renderPage()}
        </div>
      </div>
    </>
  );
}
