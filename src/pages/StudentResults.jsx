import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { COLORS } from "../lib/theme";

export default function StudentResults({ token }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => setRows(await api("/results/me", { token })))();
  }, [token]);

  return (
    <div className="fade-in" style={{ padding: "32px 36px" }}>
      <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 20 }}>My Results</h1>
      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              {["Test", "Score", "Correct", "Wrong", "Percentage", "Rank", "Date"].map(h => (
                <th key={h} style={{ padding: "13px 18px", textAlign: "left", fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}20` }}>
                <td style={{ padding: "14px 18px", fontSize: 14 }}>{item.title}</td>
                <td style={{ padding: "14px 18px", fontSize: 14 }}>{item.score}</td>
                <td style={{ padding: "14px 18px", fontSize: 14, color: COLORS.green }}>{item.correct_answers}</td>
                <td style={{ padding: "14px 18px", fontSize: 14, color: COLORS.red }}>{item.wrong_answers}</td>
                <td style={{ padding: "14px 18px", fontSize: 14 }}>{item.percentage}%</td>
                <td style={{ padding: "14px 18px", fontSize: 14 }}>{item.rank || "-"}</td>
                <td style={{ padding: "14px 18px", fontSize: 14 }}>{new Date(item.generated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
