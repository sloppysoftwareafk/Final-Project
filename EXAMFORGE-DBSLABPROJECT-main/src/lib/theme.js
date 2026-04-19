export const COLORS = {
  bg: "#0A0A0F",
  surface: "#111118",
  card: "#16161F",
  border: "#1E1E2E",
  accent: "#7C6AF7",
  accentSoft: "#A89CF7",
  accentDim: "rgba(124,106,247,0.12)",
  green: "#4ADE80",
  red: "#F87171",
  amber: "#FBBF24",
  text: "#F0EEF8",
  textMuted: "#6B6880",
  textSub: "#9D9AB0",
};

export const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${COLORS.bg}; color: ${COLORS.text}; font-family: 'DM Sans', sans-serif; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
  ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }

  .serif { font-family: 'DM Serif Display', serif; }

  .fade-in { animation: fadeIn 0.4s ease forwards; }
  .slide-up { animation: slideUp 0.35s cubic-bezier(.16,1,.3,1) forwards; }

  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }

  .dot-grid {
    background-image: radial-gradient(circle, rgba(124,106,247,0.15) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  .glow {
    box-shadow: 0 0 0 1px ${COLORS.accent}40, 0 0 32px ${COLORS.accent}18;
  }

  .btn-primary {
    background: ${COLORS.accent};
    color: #fff;
    border: none;
    padding: 10px 22px;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.01em;
  }
  .btn-primary:hover { background: ${COLORS.accentSoft}; transform: translateY(-1px); }
  .btn-primary:active { transform: translateY(0); }

  .btn-ghost {
    background: transparent;
    color: ${COLORS.textSub};
    border: 1px solid ${COLORS.border};
    padding: 9px 18px;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-ghost:hover { border-color: ${COLORS.accent}60; color: ${COLORS.text}; background: ${COLORS.accentDim}; }

  .card {
    background: ${COLORS.card};
    border: 1px solid ${COLORS.border};
    border-radius: 14px;
    transition: border-color 0.2s, transform 0.2s;
  }
  .card:hover { border-color: ${COLORS.accent}40; }

  .input-field {
    background: ${COLORS.surface};
    border: 1px solid ${COLORS.border};
    border-radius: 8px;
    padding: 10px 14px;
    color: ${COLORS.text};
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    width: 100%;
    outline: none;
    transition: border-color 0.2s;
  }
  .input-field:focus { border-color: ${COLORS.accent}80; box-shadow: 0 0 0 3px ${COLORS.accent}12; }

  .tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.03em;
  }

  .option-btn {
    background: ${COLORS.surface};
    border: 1px solid ${COLORS.border};
    border-radius: 10px;
    padding: 14px 18px;
    color: ${COLORS.textSub};
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: all 0.18s;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .option-btn:hover { border-color: ${COLORS.accent}70; color: ${COLORS.text}; background: ${COLORS.accentDim}; }
  .option-btn.selected { border-color: ${COLORS.accent}; color: ${COLORS.text}; background: ${COLORS.accentDim}; }
  .option-btn.correct { border-color: ${COLORS.green}; color: ${COLORS.green}; background: rgba(74,222,128,0.08); }
  .option-btn.wrong { border-color: ${COLORS.red}; color: ${COLORS.red}; background: rgba(248,113,113,0.08); }

  .stat-card {
    background: ${COLORS.card};
    border: 1px solid ${COLORS.border};
    border-radius: 12px;
    padding: 20px 24px;
  }

  .progress-bar-bg {
    background: ${COLORS.surface};
    border-radius: 100px;
    height: 4px;
    overflow: hidden;
  }
  .progress-bar-fill {
    height: 100%;
    background: ${COLORS.accent};
    border-radius: 100px;
    transition: width 0.5s cubic-bezier(.16,1,.3,1);
  }

  select.input-field { cursor: pointer; }
  option { background: ${COLORS.card}; }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    cursor: pointer;
    color: ${COLORS.textMuted};
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
  }
  .sidebar-item:hover { background: ${COLORS.accentDim}; color: ${COLORS.text}; }
  .sidebar-item.active { background: ${COLORS.accentDim}; color: ${COLORS.accentSoft}; }
`;
