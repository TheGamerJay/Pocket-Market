import React from "react";
import { useNavigate, Link } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

const SECTIONS = [
  {
    title: "Platform Services (Boosts & Pro Subscription)",
    body: "Payments for Pocket Market platform features \u2014 including listing boosts and Pro subscriptions \u2014 are processed by Stripe. These digital services are non-refundable once activated or used. Pro subscriptions can be canceled at any time through the Manage Subscription option on the Pro page; cancellation takes effect at the end of the current billing period.",
  },
  {
    title: "Item Transactions Between Users",
    body: "Pocket Market is a peer-to-peer marketplace. We do not process payments for item purchases between buyers and sellers, and we are not a party to those transactions. Disputes about item quality, condition, or delivery are between the buyer and seller. We encourage both parties to communicate clearly and inspect items before completing a transaction.",
  },
  {
    title: "Moderation Assistance",
    body: "Pocket Market may assist with moderation by investigating reports of fraud, prohibited items, or policy violations. However, we do not guarantee any specific outcome for item transactions and are under no obligation to intervene in disputes between users.",
  },
  {
    title: "How to Report an Issue",
    body: "If you believe a listing is fraudulent or violates our policies, you can report it directly from the listing page. For billing questions about Pro subscriptions or boosts, please contact us and we'll do our best to help.",
  },
];

export default function Refunds(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="Refund Policy" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      <Card>
        <div className="muted" style={{ fontSize:11, marginBottom:12 }}>
          Last updated: February 2026
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {SECTIONS.map((s, i) => (
            <div key={i}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{s.title}</div>
              <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>{s.body}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:20, textAlign:"center" }}>
          <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
            Questions? Reach out at{" "}
            <Link to="/contact" style={{ color:"var(--cyan)", fontWeight:700 }}>Contact Us</Link>
            {" "}or email{" "}
            <a href="mailto:pocketmarket.help@gmail.com" style={{ color:"var(--cyan)", fontWeight:700 }}>
              pocketmarket.help@gmail.com
            </a>
          </div>
        </div>
      </Card>

      <div style={{ height:20 }} />
    </>
  );
}
