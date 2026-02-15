import { useState } from "react";

const KEY = "pm_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(KEY));

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem(KEY, "accepted");
    setVisible(false);
  };

  return (
    <div style={{
      position: "fixed", bottom: 60, left: 8, right: 8,
      background: "var(--panel)", border: "1px solid var(--border)",
      borderRadius: 14, padding: "14px 16px", zIndex: 1000,
      boxShadow: "0 -2px 20px rgba(0,0,0,.25)",
      display: "flex", alignItems: "center", gap: 12,
      flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 200, fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>
        We use cookies and similar technologies to improve your experience and show relevant ads.
        See our <a href="/privacy" style={{ color: "var(--cyan)", textDecoration: "underline" }}>Privacy Policy</a>.
      </div>
      <button onClick={accept} style={{
        background: "var(--cyan)", color: "#000", border: "none",
        borderRadius: 10, padding: "8px 20px", fontWeight: 700,
        fontSize: 13, cursor: "pointer", fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}>
        Got it
      </button>
    </div>
  );
}
