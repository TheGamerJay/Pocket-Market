import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { IconPerson, IconCamera } from "../components/Icons.jsx";
import { api } from "../api.js";

function money(cents){
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export default function Profile({ me, notify, refreshMe }){
  const nav = useNavigate();
  const [myListings, setMyListings] = useState([]);
  const fileRef = useRef(null);

  const onAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.uploadAvatar(file);
      await refreshMe();
      notify("Profile photo updated!");
    } catch(err) { notify(err.message); }
  };

  useEffect(() => {
    if (!me.authed) return;
    (async () => {
      try{
        const res = await api.myListings();
        setMyListings(res.listings || []);
      }catch(err){ notify(err.message); }
    })();
  }, [me.authed]);

  if (!me.authed){
    return (
      <>
        <TopBar title="Profile" />
        <div style={{height:12}}/>
        <Card>
          <div className="muted">Login to manage your profile.</div>
          <div style={{height:12}}/>
          <Link to="/login"><Button>Login</Button></Link>
        </Card>
      </>
    );
  }

  const logout = async () => {
    try{
      await api.logout();
      await refreshMe();
      notify("Logged out.");
      nav("/");
    }catch(err){ notify(err.message); }
  };

  return (
    <>
      <TopBar title="Profile" />
      <div style={{height:12}}/>

      {/* User info card */}
      <Card>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <input type="file" accept="image/*" ref={fileRef} onChange={onAvatarPick} style={{ display:"none" }} />
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width:68, height:68, borderRadius:14, overflow:"hidden",
              background:"var(--panel2)", display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0, cursor:"pointer", position:"relative",
            }}
          >
            {me.user.avatar_url ? (
              <img src={me.user.avatar_url.startsWith("/") ? `${api.base}${me.user.avatar_url}` : me.user.avatar_url} alt="" style={{ width:"100%", height:"100%" }} />
            ) : (
              <IconPerson size={30} color="var(--muted)" />
            )}
            <div style={{
              position:"absolute", bottom:0, right:0,
              width:22, height:22, borderRadius:"50%",
              background:"var(--cyan)", display:"flex", alignItems:"center", justifyContent:"center",
              border:"2px solid var(--bg)",
            }}>
              <IconCamera size={12} color="#000" />
            </div>
          </div>

          <div>
            <div style={{ fontWeight:800, fontSize:18 }}>{me.user.display_name || "User"}</div>
            <div className="muted" style={{ fontSize:13, marginTop:2 }}>{me.user.email}</div>
            <div style={{ marginTop:6 }}>
              {me.user.is_pro
                ? <span className="badgePro">PRO</span>
                : <span className="pill" style={{ fontSize:11 }}>Free</span>
              }
            </div>
          </div>
        </div>
      </Card>

      {/* Quick links */}
      <div style={{ display:"flex", gap:10, marginTop:12, flexWrap:"wrap" }}>
        <Link to="/observing" style={{ flex:1, minWidth:"45%", textDecoration:"none" }}>
          <div className="panel" style={{ padding:"14px 16px", borderRadius:14, textAlign:"center" }}>
            <div style={{ fontWeight:700, fontSize:14 }}>Observing</div>
          </div>
        </Link>
        <Link to="/saved-searches" style={{ flex:1, minWidth:"45%", textDecoration:"none" }}>
          <div className="panel" style={{ padding:"14px 16px", borderRadius:14, textAlign:"center" }}>
            <div style={{ fontWeight:700, fontSize:14 }}>Saved Searches</div>
          </div>
        </Link>
        <Link to="/pro" style={{ flex:1, minWidth:"45%", textDecoration:"none" }}>
          <div className="panel" style={{
            padding:"14px 16px", borderRadius:14, textAlign:"center",
            background: me.user.is_pro
              ? "linear-gradient(135deg, rgba(62,224,255,.15), rgba(164,122,255,.15))"
              : "var(--panel)",
            border: me.user.is_pro ? "1px solid rgba(62,224,255,.30)" : "1px solid var(--border)",
          }}>
            <div style={{ fontWeight:700, fontSize:14, color: me.user.is_pro ? "var(--cyan)" : "var(--text)" }}>
              {me.user.is_pro ? "Pro Member" : "Go Pro"}
            </div>
          </div>
        </Link>
      </div>

      {/* My Listings */}
      <div style={{ marginTop:16 }}>
        <div className="h2" style={{ marginBottom:10 }}>My Listings</div>
        {myListings.length === 0 ? (
          <Card>
            <div className="muted" style={{ textAlign:"center" }}>
              You haven't posted anything yet.
            </div>
            <div style={{ height:10 }} />
            <Link to="/post"><Button>Post Your First Item</Button></Link>
          </Card>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {myListings.map(l => (
              <Link key={l.id} to={`/listing/${l.id}`} style={{ textDecoration:"none", color:"inherit" }}>
                <div className="panel" style={{
                  display:"flex", gap:12, padding:12, alignItems:"center",
                  borderRadius:14,
                }}>
                  <div style={{
                    width:52, height:52, borderRadius:10, overflow:"hidden",
                    flexShrink:0, background:"var(--panel2)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {l.images?.length > 0 ? (
                      <img src={`${api.base}${l.images[0]}`} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    ) : (
                      <IconCamera size={22} color="var(--muted)" />
                    )}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {l.title}
                    </div>
                    <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontWeight:800, fontSize:13 }}>{money(l.price_cents)}</span>
                      {l.is_sold && <span style={{ fontSize:11, color:"var(--cyan)", fontWeight:700 }}>SOLD</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Support & Legal */}
      <div style={{ marginTop:16 }}>
        <div className="h2" style={{ marginBottom:10 }}>Support & Info</div>
        <Card>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            <Link to="/support" style={{ textDecoration:"none", color:"inherit" }}>
              <div style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"12px 0", borderBottom:"1px solid var(--border)",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:16 }}>&#x1F6DF;</span>
                  <span style={{ fontWeight:600, fontSize:14 }}>Help & Support</span>
                </div>
                <span className="muted" style={{ fontSize:16 }}>&rsaquo;</span>
              </div>
            </Link>
            <Link to="/terms" style={{ textDecoration:"none", color:"inherit" }}>
              <div style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"12px 0", borderBottom:"1px solid var(--border)",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:16 }}>&#x1F4CB;</span>
                  <span style={{ fontWeight:600, fontSize:14 }}>Terms of Service</span>
                </div>
                <span className="muted" style={{ fontSize:16 }}>&rsaquo;</span>
              </div>
            </Link>
            <Link to="/privacy" style={{ textDecoration:"none", color:"inherit" }}>
              <div style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"12px 0",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:16 }}>&#x1F512;</span>
                  <span style={{ fontWeight:600, fontSize:14 }}>Privacy Policy</span>
                </div>
                <span className="muted" style={{ fontSize:16 }}>&rsaquo;</span>
              </div>
            </Link>
          </div>
        </Card>
      </div>

      {/* Safety tips */}
      <Card style={{ marginTop:16 }}>
        <div className="h2">Safety Tips</div>
        <div className="muted" style={{ fontSize:13, marginTop:8, lineHeight:1.6 }}>
          <div>- Meet in a public, well-lit place</div>
          <div>- Bring a friend when possible</div>
          <div>- Inspect items before paying</div>
          <div>- Never share your home address</div>
        </div>
      </Card>

      {/* Logout */}
      <div style={{ marginTop:16, marginBottom:20 }}>
        <Button variant="ghost" onClick={logout}>Logout</Button>
      </div>
    </>
  );
}
