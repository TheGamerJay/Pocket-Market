import { Link } from "react-router-dom";

const s = { color:"var(--muted)", textDecoration:"none", fontWeight:600 };

export default function Footer(){
  return (
    <div style={{
      textAlign:"center", padding:"20px 16px 80px",
      fontSize:11, color:"var(--muted)",
      lineHeight:1.8,
    }}>
      <div style={{ display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap" }}>
        <Link to="/about" style={s}>About</Link>
        <span>&middot;</span>
        <Link to="/how-it-works" style={s}>How It Works</Link>
        <span>&middot;</span>
        <Link to="/prohibited-items" style={s}>Prohibited Items</Link>
        <span>&middot;</span>
        <Link to="/refunds" style={s}>Refund Policy</Link>
      </div>
      <div style={{ display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap", marginTop:2 }}>
        <Link to="/privacy" style={s}>Privacy</Link>
        <span>&middot;</span>
        <Link to="/terms" style={s}>Terms</Link>
        <span>&middot;</span>
        <Link to="/contact" style={s}>Contact</Link>
      </div>
      <div style={{ marginTop:4 }}>&copy; {new Date().getFullYear()} Pocket Market</div>
    </div>
  );
}
