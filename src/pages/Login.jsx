import { useState } from "react";
import { COLORS } from "../lib/theme";

export default function Login({ onLogin, error }) {
  const [email, setEmail] = useState("admin@insureflow.com");
  const [password, setPassword] = useState("password");

  return (
    <div className="dot-grid" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card glow fade-in" style={{ width: 420, padding: 28 }}>
        <h1 className="serif" style={{ fontSize: 32, marginBottom: 8 }}><span style={{ color: COLORS.accentSoft }}>insure</span>forge</h1>
        <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 18 }}>Insurance Policy Management System</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          <button className="btn-primary" onClick={() => onLogin({ email, password })}>Sign in</button>
          {error && <p style={{ color: COLORS.red, fontSize: 12 }}>{error}</p>}
          <p style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.6 }}>
            Demo users: admin@insureflow.com, agent@insureflow.com, customer@insureflow.com (password: password)
          </p>
        </div>
      </div>
    </div>
  );
}
