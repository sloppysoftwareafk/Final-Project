export default function Icon({ name, size = 16, color = "currentColor" }) {
  const icons = {
    home: <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" strokeWidth="1.5" stroke={color} fill="none" strokeLinejoin="round"/>,
    book: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={color} strokeWidth="1.5" fill="none"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={color} strokeWidth="1.5" fill="none"/></>,
    test: <><rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="1.5" fill="none"/><path d="M8 9h8M8 12h5M8 15h6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    chart: <><path d="M18 20V10M12 20V4M6 20v-6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    user: <><circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.5" fill="none"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/></>,
    plus: <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>,
    clock: <><circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 7v5l3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/><polyline points="16,17 21,12 16,7" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    trophy: <><path d="M6 9H3V4h3M18 9h3V4h-3M6 4h12v8a6 6 0 01-12 0V4z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round"/><path d="M12 22v-4M8 22h8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round"/></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      {icons[name]}
    </svg>
  );
}
