import React from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

const SECTIONS = [
  {
    title: "Pocket Market is a Peer-to-Peer Marketplace",
    body: "Pocket Market does not sell items directly. We provide a platform where users can create listings and sell items to other users in their local area.",
  },
  {
    title: "How Buying & Selling Works",
    body: "Sellers create listings with photos, descriptions, and prices. Buyers browse, search, and contact sellers to arrange purchases. All item transactions happen directly between the buyer and seller.",
  },
  {
    title: "Payments for Platform Features",
    body: "Pocket Market offers optional paid features such as listing boosts and Pro subscriptions. Payments for these platform services are processed securely by Pocket Market via Stripe. These payments are for platform features only \u2014 not for item purchases.",
  },
  {
    title: "Item Transactions Are Between Users",
    body: "Pocket Market does not handle payments between buyers and sellers for item purchases. How you pay for an item (cash, Venmo, etc.) is entirely up to you and the other party. We recommend meeting in safe, public locations for all exchanges.",
  },
  {
    title: "Moderation & Safety",
    body: "Pocket Market actively moderates listings and enforces platform rules to maintain a safe and trustworthy marketplace. We remove prohibited items, investigate reports from users, and may suspend accounts that violate our policies.",
  },
];

export default function HowItWorks(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="How It Works" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {SECTIONS.map((s, i) => (
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
              <div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{s.title}</div>
                <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>{s.body}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ height:20 }} />
    </>
  );
}
