import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { IconCamera, IconPerson } from "../components/Icons.jsx";
import { api } from "../api.js";

function money(cents){
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function memberSince(iso){
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month:"short", year:"numeric" });
}

export default function SellerProfile({ me, notify }){
  const { id } = useParams();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [busy, setBusy] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.userProfile(id);
        setProfile(res.profile);
        setListings(res.listings || []);
        setBlocked(res.profile.is_blocked);
      } catch(err) { notify(err.message); }
      finally { setBusy(false); }
    })();
  }, [id]);

  const handleBlock = async () => {
    try {
      const res = await api.toggleBlock(id);
      setBlocked(res.blocked);
      notify(res.blocked ? "User blocked." : "User unblocked.");
    } catch(err) { notify(err.message); }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) { notify("Please enter a reason"); return; }
    try {
      await api.reportUser(id, { reason: reportReason });
      setReportOpen(false);
      setReportReason("");
      notify("Report submitted. Thank you.");
    } catch(err) { notify(err.message); }
  };

  if (busy) return <Card style={{ marginTop:20 }}><div className="muted">Loading...</div></Card>;
  if (!profile) return <Card style={{ marginTop:20 }}><div className="muted">User not found.</div></Card>;

  const isMe = me?.user?.id === id;

  return (
    <>
      <TopBar title="Seller Profile" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      {/* Profile card */}
      <Card>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{
            width:60, height:60, borderRadius:14, overflow:"hidden",
            background:"var(--panel2)", display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0,
          }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url.startsWith("/") ? `${api.base}${profile.avatar_url}` : profile.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            ) : (
              <IconPerson size={28} color="var(--muted)" />
            )}
          </div>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontWeight:800, fontSize:18 }}>{profile.display_name}</div>
              {profile.is_pro && <span className="badgePro">PRO</span>}
            </div>
            <div className="muted" style={{ fontSize:12, marginTop:2 }}>
              Member since {memberSince(profile.member_since)}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"flex", gap:20, marginTop:14, paddingTop:14, borderTop:"1px solid var(--border)" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontWeight:800, fontSize:18 }}>{profile.listings_count}</div>
            <div className="muted" style={{ fontSize:11 }}>Listings</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontWeight:800, fontSize:18 }}>{profile.sold_count}</div>
            <div className="muted" style={{ fontSize:11 }}>Sold</div>
          </div>
        </div>
      </Card>

      {/* Block / Report (not for own profile) */}
      {!isMe && (
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button onClick={handleBlock} style={{
            flex:1, padding:"10px 0", borderRadius:10, fontSize:12, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit",
            background: blocked ? "var(--panel2)" : "none",
            border:"1px solid var(--border)", color:"var(--text)",
          }}>
            {blocked ? "Unblock User" : "Block User"}
          </button>
          <button onClick={() => setReportOpen(!reportOpen)} style={{
            flex:1, padding:"10px 0", borderRadius:10, fontSize:12, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit",
            background:"none", border:"1px solid var(--red, #e74c3c)", color:"var(--red, #e74c3c)",
          }}>
            Report User
          </button>
        </div>
      )}

      {/* Report form */}
      {reportOpen && (
        <Card style={{ marginTop:8 }}>
          <textarea
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
            placeholder="Why are you reporting this user?"
            rows={3}
            style={{
              width:"100%", padding:"10px 12px", borderRadius:10, marginBottom:8,
              background:"var(--panel2)", border:"1px solid var(--border)",
              color:"var(--text)", fontSize:13, fontFamily:"inherit",
              resize:"vertical", boxSizing:"border-box",
            }}
          />
          <Button onClick={handleReport}>Submit Report</Button>
        </Card>
      )}

      {/* Listings */}
      <div style={{ marginTop:16 }}>
        <div className="h2" style={{ marginBottom:10 }}>
          {isMe ? "My Listings" : "Their Listings"} ({listings.length})
        </div>
        {listings.length === 0 ? (
          <Card><div className="muted" style={{ textAlign:"center" }}>No listings yet.</div></Card>
        ) : (
          <div className="grid">
            {listings.map(l => (
              <Link key={l.id} to={`/listing/${l.id}`}>
                <Card noPadding>
                  <div style={{ position:"relative" }}>
                    {l.image ? (
                      <img src={`${api.base}${l.image}`} alt={l.title} className="card-image" />
                    ) : (
                      <div className="card-image-placeholder"><IconCamera size={28} /></div>
                    )}
                    {l.is_sold && (
                      <div style={{
                        position:"absolute", top:6, left:6,
                        background:"var(--red, #e74c3c)", color:"#fff",
                        fontSize:9, fontWeight:800, padding:"2px 6px",
                        borderRadius:5, letterSpacing:0.5,
                      }}>SOLD</div>
                    )}
                  </div>
                  <div style={{ padding:"8px 10px" }}>
                    <div style={{ fontWeight:700, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {l.title}
                    </div>
                    <div style={{ marginTop:2, fontWeight:800, fontSize:12 }}>{money(l.price_cents)}</div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div style={{ height:20 }} />
    </>
  );
}
