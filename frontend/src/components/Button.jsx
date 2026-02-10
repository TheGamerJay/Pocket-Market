export default function Button({ children, variant="primary", ...props }){
  const base = {
    borderRadius: 14,
    border: "1px solid var(--border)",
    padding: "12px 14px",
    fontWeight: 800,
    cursor: "pointer",
    background: "var(--panel2)",
    color: "var(--text)",
    width: "100%",
  };

  const variants = {
    primary: {
      background: "linear-gradient(90deg, rgba(52,216,255,.22), rgba(139,92,255,.18))",
      border: "1px solid rgba(52,216,255,.35)"
    },
    ghost: { background: "transparent" },
    danger: { background: "rgba(255,77,77,.12)", border: "1px solid rgba(255,77,77,.35)" }
  };

  return (
    <button style={{...base, ...(variants[variant]||{})}} {...props}>
      {children}
    </button>
  );
}
