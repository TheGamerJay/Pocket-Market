export default function Button({ children, variant="primary", icon, ...props }){
  const base = {
    borderRadius: 14,
    border: "1px solid var(--border)",
    padding: "12px 14px",
    fontWeight: 800,
    cursor: "pointer",
    background: "var(--panel2)",
    color: "var(--text)",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 14,
  };

  const variants = {
    primary: {
      background: "linear-gradient(135deg, rgba(62,224,255,.25), rgba(164,122,255,.22))",
      border: "1px solid rgba(62,224,255,.40)",
      color: "#fff",
    },
    ghost: { background: "transparent", border: "1px solid var(--border)" },
    danger: { background: "rgba(255,92,92,.14)", border: "1px solid rgba(255,92,92,.40)" }
  };

  const { style: propStyle, ...rest } = props;
  return (
    <button style={{...base, ...(variants[variant]||{}), ...(propStyle||{})}} {...rest}>
      {icon && <span style={{ display:"flex", alignItems:"center" }}>{icon}</span>}
      {children}
    </button>
  );
}
