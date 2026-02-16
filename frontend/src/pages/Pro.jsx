import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { api } from "../api.js";

const PERKS = [
  { title: "PRO Badge", desc: "Stand out with a PRO seller badge on all your listings" },
  { title: "Priority Placement", desc: "Your listings appear first in search and the home feed" },
  { title: "10 Photos", desc: "Upload up to 10 photos per listing (free users get 5)" },
  { title: "No Ads", desc: "Browse the marketplace without any sponsored content" },
];

export default function Pro({ me, notify, refreshMe }){
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [subInfo, setSubInfo] = useState(null);
  const isPro = me?.user?.is_pro;

  useEffect(() => {
    if (searchParams.get("session_id")) {
      refreshMe();
      notify("Welcome to Pro!");
      setSearchParams({}, { replace: true });
    } else if (searchParams.get("canceled")) {
      notify("Checkout canceled.");
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    api.billingStatus()
      .then((data) => setSubInfo(data.subscription))
      .catch(() => {});
  }, [isPro]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { url } = await api.createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      notify(err.message);
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const { url } = await api.createPortalSession();
      window.location.href = url;
    } catch (err) {
      notify(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <TopBar title="Pocket Market Pro" />
      <div style={{ height:12 }} />

      {/* Pricing card */}
      <Card>
        <div style={{ textAlign:"center", padding:"8px 0" }}>
          <div style={{ fontSize:40, fontWeight:900 }}>
            <span style={{ fontSize:20, verticalAlign:"top", fontWeight:700 }}>$</span>9.99
            <span className="muted" style={{ fontSize:14, fontWeight:500 }}>/month</span>
          </div>
          {isPro && (
            <div style={{
              marginTop:8, display:"inline-block",
              padding:"4px 14px", borderRadius:20,
              background:"linear-gradient(135deg, rgba(62,224,255,.25), rgba(164,122,255,.22))",
              border:"1px solid rgba(62,224,255,.40)",
              fontSize:12, fontWeight:800, color:"var(--cyan)",
            }}>
              Active
            </div>
          )}
          {subInfo?.status === "past_due" && (
            <div style={{
              marginTop:8, display:"inline-block",
              padding:"4px 14px", borderRadius:20,
              background:"rgba(255,92,92,.14)",
              border:"1px solid rgba(255,92,92,.40)",
              fontSize:12, fontWeight:800, color:"#ff5c5c",
            }}>
              Payment Failed
            </div>
          )}
        </div>
      </Card>

      <div style={{ height:12 }} />

      {/* Perks list */}
      <Card>
        <div className="h2" style={{ marginBottom:12 }}>What you get</div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {PERKS.map((p, i) => (
            <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
              <div style={{
                width:28, height:28, borderRadius:8, flexShrink:0,
                background:"linear-gradient(135deg, rgba(62,224,255,.2), rgba(164,122,255,.2))",
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"var(--cyan)", fontSize:14, fontWeight:800,
              }}>
                {"\u2713"}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{p.title}</div>
                <div className="muted" style={{ fontSize:12, marginTop:2 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ height:16 }} />

      {me?.user?.is_test_account ? (
        <div className="muted" style={{ textAlign:"center", fontSize:12 }}>
          Billing is disabled for this review account.
        </div>
      ) : isPro ? (
        <Button variant="ghost" onClick={handleManage} disabled={loading}>
          {loading ? "Loading..." : "Manage Subscription"}
        </Button>
      ) : (
        <Button onClick={handleSubscribe} disabled={loading}>
          {loading ? "Loading..." : "Subscribe for $9.99/month"}
        </Button>
      )}

      {subInfo?.current_period_end && isPro && (
        <div className="muted" style={{ textAlign:"center", fontSize:11, marginTop:8 }}>
          Renews {new Date(subInfo.current_period_end).toLocaleDateString()}
        </div>
      )}

      <div style={{ height:12 }} />
      <div className="muted" style={{ textAlign:"center", fontSize:11 }}>
        Cancel anytime. No contracts.
      </div>
    </>
  );
}
