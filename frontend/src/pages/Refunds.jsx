import React from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

export default function Refunds(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="Refund Policy" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      <Card>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>Marketplace Transactions</div>
        <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
          Pocket Market does not process payments for items sold on the platform.
          All item transactions occur directly between buyers and sellers.
          Because Pocket Market does not handle item payments, we cannot issue refunds for marketplace purchases.
        </div>
        <div className="muted" style={{ fontSize:12, lineHeight:1.7, marginTop:8 }}>
          Item disputes are handled directly between buyers and sellers.
          Pocket Market may provide moderation support but is not responsible for item quality, delivery, or payment disputes.
        </div>
      </Card>

      <div style={{ height:12 }} />

      <Card>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>Pro Subscription</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--cyan)", flexShrink:0, marginTop:6 }} />
            <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>You may cancel your Pro subscription at any time.</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--cyan)", flexShrink:0, marginTop:6 }} />
            <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>No partial refunds are issued for unused time within a billing period.</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--cyan)", flexShrink:0, marginTop:6 }} />
            <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>After cancellation, Pro features remain active until the end of your current billing period.</div>
          </div>
        </div>
      </Card>

      <div style={{ height:20 }} />
    </>
  );
}
