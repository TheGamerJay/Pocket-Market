import { IconBack, IconBag } from "./Icons.jsx";

export default function TopBar({ title, right, onBack, showLogo, centerTitle }){
  return (
    <div className="panel" style={{
      padding: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: centerTitle ? "center" : "space-between",
      position: "sticky",
      top: 10,
      zIndex: 5,
      backdropFilter: "blur(8px)",
      gap: 12,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          background: "none", border: "none", color: "var(--text)",
          cursor: "pointer", padding: 4, display: "flex", alignItems: "center",
          position: centerTitle ? "absolute" : "static",
          left: centerTitle ? 14 : undefined,
        }}>
          <IconBack size={22} />
        </button>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {showLogo && <IconBag size={24} color="var(--cyan)" />}
        <div className={showLogo ? "gradient-text h1" : "h1"}>{title}</div>
      </div>
      {right && <div style={{ position: centerTitle ? "absolute" : "static", right: centerTitle ? 14 : undefined }}>{right}</div>}
    </div>
  );
}
