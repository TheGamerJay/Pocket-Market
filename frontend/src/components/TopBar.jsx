export default function TopBar({ title, right }){
  return (
    <div className="panel" style={{
      padding: 14,
      display:"flex",
      alignItems:"center",
      justifyContent:"space-between",
      position:"sticky",
      top: 10,
      zIndex: 5,
      backdropFilter:"blur(8px)"
    }}>
      <div className="h1">{title}</div>
      <div>{right}</div>
    </div>
  );
}
