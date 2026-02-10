export default function Input({ label, icon, rightAction, ...props }){
  const inputStyle = {
    width: "100%",
    padding: "13px 14px",
    paddingLeft: icon ? 44 : 14,
    paddingRight: rightAction ? 80 : 14,
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "rgba(255,255,255,.04)",
    color: "var(--text)",
    outline: "none",
    fontSize: 14,
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {label && <div className="muted" style={{ fontSize:13 }}>{label}</div>}
      <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
        {icon && (
          <span style={{ position:"absolute", left:14, pointerEvents:"none", color:"var(--muted)", display:"flex", alignItems:"center" }}>
            {icon}
          </span>
        )}
        <input style={inputStyle} {...props} />
        {rightAction && (
          <span style={{ position:"absolute", right:14, display:"flex", alignItems:"center" }}>
            {rightAction}
          </span>
        )}
      </div>
    </div>
  );
}
