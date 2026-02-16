import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card.jsx";

const LINKS = [
  { to: "/about", label: "About", desc: "What Pocket Market is and how the platform works" },
  { to: "/how-it-works", label: "How It Works", desc: "Step-by-step guide for buyers and sellers" },
  { to: "/prohibited-items", label: "Prohibited Items", desc: "Items and activities not allowed on the platform" },
  { to: "/refunds", label: "Refund Policy", desc: "Refunds for subscriptions and marketplace transactions" },
  { to: "/privacy", label: "Privacy Policy", desc: "How we collect, use, and protect your data" },
  { to: "/terms", label: "Terms of Service", desc: "Rules and agreements for using Pocket Market" },
  { to: "/contact", label: "Contact", desc: "Get in touch with the Pocket Market team" },
];

export default function Info(){
  return (
    <>
      <div style={{ textAlign:"center", padding:"24px 0 8px" }}>
        <img src="/pocketmarket_favicon_transparent_512x512.png" alt="Pocket Market" style={{ width:80, height:80, borderRadius:20 }} />
        <div style={{ fontSize:22, fontWeight:900, marginTop:10 }}>Pocket Market</div>
        <div className="muted" style={{ fontSize:13, lineHeight:1.6, marginTop:8, maxWidth:340, margin:"8px auto 0" }}>
          A peer-to-peer marketplace where individuals list and discover items locally.
          Pocket Market does not own, store, or ship goods &mdash; all transactions happen directly between buyers and sellers.
        </div>
      </div>

      <div style={{ height:16 }} />

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {LINKS.map(({ to, label, desc }) => (
          <Link key={to} to={to} style={{ textDecoration:"none", color:"inherit" }}>
            <Card>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{label}</div>
                  <div className="muted" style={{ fontSize:11, marginTop:2 }}>{desc}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div style={{ height:20 }} />

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <Link to="/login" style={{
          display:"block", textAlign:"center", padding:"14px 0", borderRadius:14,
          fontSize:15, fontWeight:800, textDecoration:"none",
          background:"linear-gradient(135deg, var(--cyan), var(--violet))",
          color:"#fff",
        }}>
          Log In
        </Link>
        <Link to="/signup" style={{
          display:"block", textAlign:"center", padding:"14px 0", borderRadius:14,
          fontSize:15, fontWeight:800, textDecoration:"none",
          background:"none", border:"1.5px solid var(--cyan)",
          color:"var(--cyan)",
        }}>
          Sign Up
        </Link>
      </div>

      <div style={{
        textAlign:"center", padding:"24px 0 16px",
        fontSize:11, color:"var(--muted)",
      }}>
        &copy; {new Date().getFullYear()} Pocket Market
      </div>
    </>
  );
}
