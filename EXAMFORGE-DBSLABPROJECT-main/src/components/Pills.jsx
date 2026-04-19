import { COLORS } from "../lib/theme";

export function Pill({ children, color = COLORS.accent }) {
  return (
    <span className="tag" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

export function DifficultyPill({ level }) {
  const map = { Easy: COLORS.green, Medium: COLORS.amber, Hard: COLORS.red };
  return <Pill color={map[level] || COLORS.textMuted}>{level}</Pill>;
}

export function StatusPill({ status }) {
  const map = { Live: COLORS.green, Scheduled: COLORS.amber, Completed: COLORS.textMuted };
  return <Pill color={map[status] || COLORS.textMuted}>{status}</Pill>;
}
