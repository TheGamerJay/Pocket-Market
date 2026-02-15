import React from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

const ITEMS = [
  "Illegal goods or services of any kind",
  "Drugs, controlled substances, or drug paraphernalia",
  "Weapons, firearms, ammunition, explosives, or weapon parts",
  "Stolen property or items obtained illegally",
  "Adult services, escorting, or explicit sexual content",
  "Fraudulent, misleading, or deceptive listings",
  "Counterfeit or pirated goods",
  "Financial services, loans, or investment products",
  "Hateful, violent, or discriminatory content",
  "Any item that violates local, state, or federal law",
];

export default function ProhibitedItems(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="Prohibited Items" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      <Card>
        <div style={{ fontWeight:800, fontSize:16, marginBottom:8 }}>Prohibited Items & Activities</div>
        <div className="muted" style={{ fontSize:12, lineHeight:1.7, marginBottom:16 }}>
          Pocket Market is a peer-to-peer marketplace. The following items and activities are strictly prohibited on this platform:
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {ITEMS.map((item, i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
              <div style={{
                width:6, height:6, borderRadius:"50%", background:"var(--red, #e74c3c)",
                flexShrink:0, marginTop:6,
              }} />
              <div style={{ fontSize:13, lineHeight:1.6 }}>{item}</div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop:20, padding:"12px 14px", borderRadius:10,
          background:"rgba(231,76,60,.08)", border:"1px solid rgba(231,76,60,.20)",
        }}>
          <div style={{ fontSize:12, lineHeight:1.7, color:"var(--text)" }}>
            Listings that violate these rules may be removed without notice, and user accounts may be suspended or terminated.
          </div>
        </div>
      </Card>

      <div style={{ height:20 }} />
    </>
  );
}
