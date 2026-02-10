import { NavLink } from "react-router-dom";

const itemStyle = ({ isActive }) => ({
  flex:1,
  textAlign:"center",
  padding:"10px 6px",
  borderRadius: 14,
  border: `1px solid ${isActive ? "rgba(52,216,255,.35)" : "transparent"}`,
  background: isActive ? "rgba(52,216,255,.10)" : "transparent",
  color: isActive ? "var(--text)" : "var(--muted)",
  fontWeight: 800,
  fontSize: 12
});

export default function BottomNav(){
  return (
    <div style={{
      position:"fixed",
      left:0, right:0, bottom:0,
      padding:"10px 10px 12px",
      background:"rgba(8,12,18,.72)",
      borderTop:"1px solid var(--border)",
      backdropFilter:"blur(10px)"
    }}>
      <div style={{
        maxWidth:"var(--max)",
        margin:"0 auto",
        display:"flex",
        gap:10
      }}>
        <NavLink to="/" style={itemStyle}>Home</NavLink>
        <NavLink to="/search" style={itemStyle}>Search</NavLink>
        <NavLink to="/post" style={itemStyle}>Post</NavLink>
        <NavLink to="/messages" style={itemStyle}>Messages</NavLink>
        <NavLink to="/profile" style={itemStyle}>Profile</NavLink>
      </div>
    </div>
  );
}
