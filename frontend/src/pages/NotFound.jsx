import React from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";

export default function NotFound(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="Not Found" onBack={() => nav("/")} centerTitle />
      <div style={{
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", textAlign:"center",
        padding:"60px 20px", minHeight:"50vh",
      }}>
        <div style={{ fontSize:64, fontWeight:900, lineHeight:1 }} className="gradient-text">404</div>
        <div style={{ fontSize:18, fontWeight:700, marginTop:12 }}>Page not found</div>
        <div className="muted" style={{ fontSize:14, marginTop:8, maxWidth:300 }}>
          The page you're looking for doesn't exist or has been moved.
        </div>
        <button
          onClick={() => nav("/")}
          style={{
            marginTop:24, padding:"12px 32px", borderRadius:12,
            background:"linear-gradient(135deg, var(--cyan), var(--violet))",
            color:"#fff", fontWeight:700, fontSize:14,
            border:"none", cursor:"pointer", fontFamily:"inherit",
          }}
        >
          Go Home
        </button>
      </div>
    </>
  );
}
