import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { api } from "../api.js";

const FAQ = [
  { q: "How do I post a listing?", a: "Tap the + button in the bottom nav to create a new listing. Add a title, price, photos, and details about your item." },
  { q: "How do I message a seller?", a: "Open any listing and tap the \"Message Seller\" button. You'll be taken to a chat where you can discuss the item." },
  { q: "How does Safe Meetup work?", a: "When viewing a listing, tap \"Safe Meetup\" to suggest a public meeting spot like a police station or coffee shop. Both parties can see the location on a map." },
  { q: "What does Observing do?", a: "Tap the eye icon on a listing to observe it. You'll get notified when the seller changes the price or marks it as sold." },
  { q: "How do I edit or delete my listing?", a: "Open your listing and scroll down. You'll see options to edit details, mark as sold, or delete the listing." },
  { q: "What is Pocket Market Pro?", a: "Pro is a $8/month subscription that gives you a PRO badge, priority placement in search, up to 10 photos per listing, and an ad-free experience." },
  { q: "How do I cancel Pro?", a: "Go to Profile → Pro Member → Cancel Pro. Your subscription ends immediately with no contracts or cancellation fees." },
  { q: "Is my data safe?", a: "We take privacy seriously. We never sell your data and only collect what's needed to run the marketplace. See our Privacy Policy for details." },
];

export default function Support({ me, notify }){
  const nav = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [form, setForm] = useState({ type: "support", email: me?.user?.email || "", message: "" });
  const [sent, setSent] = useState(false);

  const supportEmail = "pocketmarket.help@gmail.com";

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) { notify("Please enter a message"); return; }
    try {
      await api.supportContact({ email: form.email, message: form.message, type: form.type });
      setSent(true);
      notify("Message sent! We'll get back to you soon.");
    } catch(err) { notify(err.message); }
  };

  return (
    <>
      <TopBar title="Help & Support" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      {/* Contact / Report form */}
      <Card>
        <div className="h2" style={{ marginBottom:4 }}>Get in Touch</div>
        <div className="muted" style={{ fontSize:12, marginBottom:12 }}>
          Email us at <a href={`mailto:${supportEmail}`} style={{ color:"var(--cyan)", fontWeight:700 }}>{supportEmail}</a>
        </div>
        {sent ? (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>&#10003;</div>
            <div style={{ fontWeight:700, fontSize:14 }}>Thanks for reaching out!</div>
            <div className="muted" style={{ fontSize:12, marginTop:4 }}>We'll respond to your email within 24 hours.</div>
            <div style={{ height:12 }} />
            <Button variant="ghost" onClick={() => { setSent(false); setForm(f => ({ ...f, message:"" })); }}>
              Send Another
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <button type="button" onClick={() => setForm(f => ({ ...f, type:"support" }))} style={{
                flex:1, padding:"8px 0", borderRadius:10, border:"1px solid var(--border)",
                background: form.type === "support" ? "var(--cyan)" : "var(--panel2)",
                color: form.type === "support" ? "#000" : "var(--text)",
                fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit",
              }}>
                Contact Support
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, type:"report" }))} style={{
                flex:1, padding:"8px 0", borderRadius:10, border:"1px solid var(--border)",
                background: form.type === "report" ? "var(--red, #e74c3c)" : "var(--panel2)",
                color: form.type === "report" ? "#fff" : "var(--text)",
                fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit",
              }}>
                Report Issue
              </button>
            </div>

            <input
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Your email"
              type="email"
              required
              style={{
                width:"100%", padding:"10px 12px", borderRadius:10, marginBottom:8,
                background:"var(--panel2)", border:"1px solid var(--border)",
                color:"var(--text)", fontSize:13, fontFamily:"inherit",
                boxSizing:"border-box",
              }}
            />

            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder={form.type === "report"
                ? "Describe the issue you're experiencing..."
                : "How can we help you?"
              }
              rows={4}
              style={{
                width:"100%", padding:"10px 12px", borderRadius:10, marginBottom:10,
                background:"var(--panel2)", border:"1px solid var(--border)",
                color:"var(--text)", fontSize:13, fontFamily:"inherit",
                resize:"vertical", boxSizing:"border-box",
              }}
            />

            <Button type="submit">
              {form.type === "report" ? "Submit Report" : "Send Message"}
            </Button>
          </form>
        )}
      </Card>

      <div style={{ height:12 }} />

      {/* FAQ */}
      <Card>
        <div className="h2" style={{ marginBottom:12 }}>Frequently Asked Questions</div>
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          {FAQ.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width:"100%", textAlign:"left", background:"none", border:"none",
                  color:"var(--text)", padding:"12px 0", cursor:"pointer",
                  fontFamily:"inherit", fontSize:13, fontWeight:600,
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                }}
              >
                <span>{item.q}</span>
                <span style={{ fontSize:18, color:"var(--muted)", transform: openFaq === i ? "rotate(45deg)" : "none", transition:"transform .2s" }}>+</span>
              </button>
              {openFaq === i && (
                <div className="muted" style={{ fontSize:12, lineHeight:1.6, paddingBottom:12 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div style={{ height:20 }} />
    </>
  );
}
