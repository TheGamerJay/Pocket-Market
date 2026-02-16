import React from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

const STEPS = [
  { title: "Create an Account", desc: "Sign up with email or Google to get started." },
  { title: "Post or Browse Listings", desc: "Sellers create listings with photos, descriptions, and prices. Buyers browse, search, and filter to find items." },
  { title: "Message Sellers", desc: "Contact sellers directly through in-app messaging to ask questions or arrange a deal." },
  { title: "Meet Safely", desc: "Arrange a safe, public meetup location to exchange items in person. Use the Safe Meetup feature for suggested spots." },
];

export default function HowItWorks(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="How It Works" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {STEPS.map((step, i) => (
          <Card key={i}>
            <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
              <div style={{
                width:28, height:28, borderRadius:8, flexShrink:0,
                background:"linear-gradient(135deg, rgba(62,224,255,.15), rgba(164,122,255,.15))",
                border:"1px solid rgba(62,224,255,.25)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:800, color:"var(--cyan)",
              }}>
                {i + 1}
              </div>
              <div style={{ paddingTop:2 }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{step.title}</div>
                <div className="muted" style={{ fontSize:12, lineHeight:1.7, marginTop:2 }}>{step.desc}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Important</div>
        <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
          Pocket Market does <strong style={{ color:"var(--text)" }}>not</strong> process payments for items or handle shipping.
          All item transactions occur directly between buyers and sellers.
          Pocket Market only processes payments for optional platform services such as listing boosts and Pro subscriptions.
        </div>
      </Card>

      <div style={{ height:20 }} />
    </>
  );
}
