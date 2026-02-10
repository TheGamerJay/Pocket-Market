export default function Input({ label, ...props }){
  const style = {
    width:"100%",
    padding:"12px 12px",
    borderRadius: 14,
    border:"1px solid var(--border)",
    background:"rgba(255,255,255,.04)",
    color:"var(--text)",
    outline:"none"
  };
  return (
    <div className="col" style={{gap:8}}>
      {label ? <div className="muted" style={{fontSize:13}}>{label}</div> : null}
      <input style={style} {...props} />
    </div>
  );
}
