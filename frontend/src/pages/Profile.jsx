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
  const [drafts, setDrafts] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("pm_theme") || "dark");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [stats, setStats] = useState(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [sendingSuggestion, setSendingSuggestion] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const fileRef = useRef(null);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("pm_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

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
        const [res, draftRes, statsRes] = await Promise.all([api.myListings(), api.myDrafts(), api.myStats()]);
        setMyListings(res.listings || []);
        setDrafts(draftRes.listings || []);
        setStats(statsRes.stats || null);
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

          <div style={{ flex:1, minWidth:0 }}>
            {editingName ? (
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === "Enter") {
                      if (!newName.trim() || savingName) return;
                      setSavingName(true);
                      try {
                        await api.updateProfile({ display_name: newName.trim() });
                        await refreshMe();
                        notify("Name updated!");
                        setEditingName(false);
                      } catch(err) { notify(err.message); }
                      finally { setSavingName(false); }
                    } else if (e.key === "Escape") {
                      setEditingName(false);
                    }
                  }}
                  placeholder="Your name"
                  style={{
                    flex:1, padding:"6px 10px", borderRadius:8, fontSize:15, fontWeight:700,
                    background:"var(--input-bg,var(--panel2))", border:"1.5px solid var(--cyan)",
                    color:"var(--text)", fontFamily:"inherit", outline:"none", minWidth:0,
                  }}
                />
                <button
                  disabled={!newName.trim() || savingName}
                  onClick={async () => {
                    if (!newName.trim() || savingName) return;
                    setSavingName(true);
                    try {
                      await api.updateProfile({ display_name: newName.trim() });
                      await refreshMe();
                      notify("Name updated!");
                      setEditingName(false);
                    } catch(err) { notify(err.message); }
                    finally { setSavingName(false); }
                  }}
                  style={{
                    padding:"6px 10px", borderRadius:8, fontSize:12, fontWeight:700,
                    background:"var(--cyan)", border:"none", color:"#000", cursor:"pointer",
                    fontFamily:"inherit", flexShrink:0,
                    opacity: !newName.trim() || savingName ? 0.5 : 1,
                  }}
                >{savingName ? "..." : "Save"}</button>
                <button
                  onClick={() => setEditingName(false)}
                  style={{
                    padding:"6px 8px", borderRadius:8, fontSize:12, fontWeight:700,
                    background:"var(--panel2)", border:"1px solid var(--border)",
                    color:"var(--muted)", cursor:"pointer", fontFamily:"inherit", flexShrink:0,
                  }}
                >✕</button>
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ fontWeight:800, fontSize:18 }}>{me.user.display_name || "User"}</div>
                <button
                  onClick={() => { setNewName(me.user.display_name || ""); setEditingName(true); }}
                  style={{
                    background:"none", border:"none", cursor:"pointer", padding:"2px 4px",
                    color:"var(--muted)", fontSize:14, lineHeight:1,
                  }}
                  title="Edit name"
                >✏️</button>
              </div>
            )}
            <div className="muted" style={{ fontSize:13, marginTop:2 }}>{me.user.email}</div>
            <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              {me.user.is_pro
                ? <span className="badgePro">PRO</span>
                : <span className="pill" style={{ fontSize:11 }}>Free</span>
              }
              {me.user.is_verified_seller && (
                <span style={{ fontSize:12, color:"var(--cyan)", fontWeight:700 }}>{"\u2705"} Verified</span>
              )}
              {me.user.created_at && (
                <span className="muted" style={{ fontSize:11 }}>
                  Member since {new Date(me.user.created_at).getFullYear()}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Quick links */}
      <div style={{ display:"flex", gap:10, marginTop:12, flexWrap:"wrap" }}>
        <Link to="/purchases" style={{ flex:1, minWidth:"45%", textDecoration:"none" }}>
          <div className="panel" style={{ padding:"14px 16px", borderRadius:14, textAlign:"center" }}>
            <div style={{ fontWeight:700, fontSize:14 }}>My Purchases</div>
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
        <button onClick={toggleTheme} style={{
          flex:1, minWidth:"45%", textDecoration:"none", cursor:"pointer", fontFamily:"inherit",
          padding:"14px 16px", borderRadius:14, textAlign:"center",
          background:"var(--panel)", border:"1px solid var(--border)", color:"var(--text)",
        }}>
          <div style={{ fontWeight:700, fontSize:14 }}>
            {theme === "dark" ? "\u2600\uFE0F Light Mode" : "\u{1F319} Dark Mode"}
          </div>
        </button>
      </div>

      {/* Seller Stats (private) */}
      {stats && (stats.total_listed > 0 || stats.total_sold > 0) && (
        <Card style={{ marginTop:16 }}>
          <div className="h2" style={{ marginBottom:12 }}>My Stats</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, textAlign:"center" }}>
            <div>
              <div style={{ fontSize:22, fontWeight:800 }}>{stats.total_listed}</div>
              <div className="muted" style={{ fontSize:11 }}>Listed</div>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:"var(--green)" }}>{stats.total_sold}</div>
              <div className="muted" style={{ fontSize:11 }}>Sold</div>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800 }}>{stats.active}</div>
              <div className="muted" style={{ fontSize:11 }}>Active</div>
            </div>
          </div>
          <hr className="sep" />
          <div style={{ display:"flex", justifyContent:"space-around", textAlign:"center" }}>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:"var(--cyan)" }}>{money(stats.total_earned_cents)}</div>
              <div className="muted" style={{ fontSize:11 }}>Total Earned</div>
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:800 }}>{stats.total_views}</div>
              <div className="muted" style={{ fontSize:11 }}>Total Views</div>
            </div>
          </div>
        </Card>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div className="h2" style={{ marginBottom:10 }}>Drafts ({drafts.length})</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {drafts.map(l => (
              <div key={l.id} className="panel" style={{
                display:"flex", gap:12, padding:12, alignItems:"center", borderRadius:14,
              }}>
                <div style={{
                  width:44, height:44, borderRadius:10, overflow:"hidden",
                  flexShrink:0, background:"var(--panel2)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  {l.images?.length > 0 ? (
                    <img src={`${api.base}${l.images[0]}`} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  ) : (
                    <IconCamera size={18} color="var(--muted)" />
                  )}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {l.title || "Untitled Draft"}
                  </div>
                  <div className="muted" style={{ fontSize:11, marginTop:2 }}>{money(l.price_cents)}</div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <Link to={`/listing/${l.id}`} style={{
                    padding:"6px 10px", borderRadius:8, fontSize:11, fontWeight:700,
                    background:"var(--panel2)", border:"1px solid var(--border)", color:"var(--text)",
                    textDecoration:"none",
                  }}>Edit</Link>
                  <button onClick={async () => {
                    try {
                      await api.publishDraft(l.id);
                      setDrafts(prev => prev.filter(d => d.id !== l.id));
                      const res = await api.myListings();
                      setMyListings(res.listings || []);
                      notify("Draft published!");
                    } catch(err) { notify(err.message); }
                  }} style={{
                    padding:"6px 10px", borderRadius:8, fontSize:11, fontWeight:700,
                    background:"var(--cyan)", border:"none", color:"#000", cursor:"pointer",
                  }}>Publish</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Listings */}
      <div style={{ marginTop:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div className="h2">My Listings</div>
          {myListings.length > 0 && (
            <button onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }} style={{
              background:"none", border:"none", color:"var(--cyan)",
              fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>
              {selectMode ? "Cancel" : "Select"}
            </button>
          )}
        </div>

        {/* Bulk action bar */}
        {selectMode && selected.size > 0 && (
          <div style={{
            display:"flex", gap:8, marginBottom:10, flexWrap:"wrap",
          }}>
            <button onClick={async () => {
              try {
                await api.bulkAction({ action:"sold", listing_ids: [...selected] });
                setMyListings(prev => prev.map(l => selected.has(l.id) ? {...l, is_sold: true} : l));
                setSelected(new Set()); setSelectMode(false);
                notify(`${selected.size} listings marked as sold`);
              } catch(err) { notify(err.message); }
            }} style={{
              padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit",
              background:"rgba(46,204,113,.12)", border:"1px solid var(--green, #2ecc71)",
              color:"var(--green, #2ecc71)",
            }}>
              Mark Sold ({selected.size})
            </button>
            <button onClick={async () => {
              try {
                await api.bulkAction({ action:"renew", listing_ids: [...selected] });
                setSelected(new Set()); setSelectMode(false);
                notify(`${selected.size} listings renewed`);
              } catch(err) { notify(err.message); }
            }} style={{
              padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit",
              background:"rgba(62,224,255,.12)", border:"1px solid var(--cyan)",
              color:"var(--cyan)",
            }}>
              Renew ({selected.size})
            </button>
            <button onClick={async () => {
              if (!window.confirm(`Delete ${selected.size} listings? This can't be undone.`)) return;
              try {
                const deleteIds = [...selected];
                await api.bulkAction({ action:"delete", listing_ids: deleteIds });
                try {
                  const recent = JSON.parse(localStorage.getItem("pm_recent") || "[]");
                  localStorage.setItem("pm_recent", JSON.stringify(recent.filter(r => !deleteIds.includes(r.id))));
                } catch {}
                setMyListings(prev => prev.filter(l => !selected.has(l.id)));
                setSelected(new Set()); setSelectMode(false);
                notify(`${deleteIds.length} listings deleted`);
              } catch(err) { notify(err.message); }
            }} style={{
              padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit",
              background:"rgba(231,76,60,.12)", border:"1px solid var(--red, #e74c3c)",
              color:"var(--red, #e74c3c)",
            }}>
              Delete ({selected.size})
            </button>
          </div>
        )}

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
              <div key={l.id}
                onClick={() => {
                  if (selectMode) {
                    setSelected(prev => {
                      const next = new Set(prev);
                      next.has(l.id) ? next.delete(l.id) : next.add(l.id);
                      return next;
                    });
                  } else {
                    nav(`/listing/${l.id}`);
                  }
                }}
                style={{ textDecoration:"none", color:"inherit", cursor:"pointer" }}
              >
                <div className="panel" style={{
                  display:"flex", gap:12, padding:12, alignItems:"center",
                  borderRadius:14,
                  border: selected.has(l.id) ? "2px solid var(--cyan)" : "1px solid var(--border)",
                }}>
                  {selectMode && (
                    <div style={{
                      width:22, height:22, borderRadius:6, flexShrink:0,
                      border: selected.has(l.id) ? "none" : "2px solid var(--border)",
                      background: selected.has(l.id) ? "var(--cyan)" : "transparent",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      {selected.has(l.id) && <span style={{ color:"#000", fontSize:14, fontWeight:800 }}>{"\u2713"}</span>}
                    </div>
                  )}
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
                  {!selectMode && (
                    <Link
                      to={`/listing/${l.id}/edit`}
                      onClick={e => e.stopPropagation()}
                      style={{
                        padding:"6px 10px", borderRadius:8, fontSize:11, fontWeight:700,
                        background:"var(--panel2)", border:"1px solid var(--border)", color:"var(--text)",
                        textDecoration:"none", flexShrink:0,
                      }}
                    >Edit</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Support & Legal */}
      <div style={{ marginTop:16 }}>
        <div className="h2" style={{ marginBottom:10 }}>Support & Info</div>
        <Card>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {[
              { to:"/support", emoji:"🛟", label:"Help & Support" },
              { to:"/about", emoji:"ℹ️", label:"About Pocket Market" },
              { to:"/how-it-works", emoji:"🔍", label:"How It Works" },
            ].map(({ to, emoji, label }, i, arr) => (
              <Link key={to} to={to} style={{ textDecoration:"none", color:"inherit" }}>
                <div style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"12px 0",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:16 }}>{emoji}</span>
                    <span style={{ fontWeight:600, fontSize:14 }}>{label}</span>
                  </div>
                  <span className="muted" style={{ fontSize:16 }}>&rsaquo;</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Legal */}
        <div className="muted" style={{ fontSize:11, fontWeight:700, marginTop:14, marginBottom:6, paddingLeft:2 }}>LEGAL</div>
        <Card>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {[
              { to:"/terms", emoji:"📋", label:"Terms of Service" },
              { to:"/privacy", emoji:"🔒", label:"Privacy Policy" },
              { to:"/refunds", emoji:"↩️", label:"Refund Policy" },
              { to:"/prohibited-items", emoji:"🚫", label:"Prohibited Items" },
              { to:"/contact", emoji:"✉️", label:"Contact Us" },
            ].map(({ to, emoji, label }, i, arr) => (
              <Link key={to} to={to} style={{ textDecoration:"none", color:"inherit" }}>
                <div style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"12px 0",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:14 }}>{emoji}</span>
                    <span style={{ fontWeight:600, fontSize:14 }}>{label}</span>
                  </div>
                  <span className="muted" style={{ fontSize:16 }}>&rsaquo;</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Safety tips */}
        <div className="muted" style={{ fontSize:11, fontWeight:700, marginTop:14, marginBottom:6, paddingLeft:2 }}>SAFETY</div>
        <Card>
          <div
            onClick={() => setSafetyOpen(p => !p)}
            style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              cursor:"pointer",
            }}
          >
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:16 }}>🛡️</span>
              <span style={{ fontWeight:600, fontSize:14 }}>Safety Tips</span>
            </div>
            <span className="muted" style={{ fontSize:16 }}>{safetyOpen ? "\u2038" : "\u203A"}</span>
          </div>
          {safetyOpen && (
            <div className="muted" style={{ fontSize:13, marginTop:10, lineHeight:1.8 }}>
              <div>• Meet in a public, well-lit place</div>
              <div>• Bring a friend when possible</div>
              <div>• Inspect items before paying</div>
              <div>• Never share your home address</div>
            </div>
          )}
        </Card>

        {/* Suggestion */}
        <div className="muted" style={{ fontSize:11, fontWeight:700, marginTop:14, marginBottom:6, paddingLeft:2 }}>FEEDBACK</div>
        <Card>
          <div
            onClick={() => setShowSuggestion(p => !p)}
            style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              cursor:"pointer",
            }}
          >
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:16 }}>💡</span>
              <span style={{ fontWeight:600, fontSize:14 }}>Send a Suggestion</span>
            </div>
            <span className="muted" style={{ fontSize:16 }}>{showSuggestion ? "\u2038" : "\u203A"}</span>
          </div>
          {showSuggestion && (
            <div style={{ marginTop:10 }}>
              <textarea
                value={suggestion}
                onChange={e => setSuggestion(e.target.value)}
                placeholder="Have an idea or feature request? Let us know!"
                rows={3}
                style={{
                  width:"100%", padding:"10px 12px", borderRadius:10, fontSize:13,
                  background:"var(--input-bg)", border:"1px solid var(--border)",
                  color:"var(--text)", fontFamily:"inherit", outline:"none", resize:"vertical",
                }}
              />
              <button
                disabled={!suggestion.trim() || sendingSuggestion}
                onClick={async () => {
                  setSendingSuggestion(true);
                  try {
                    await api.supportContact({
                      email: me.user.email,
                      message: suggestion.trim(),
                      type: "suggestion",
                    });
                    notify("Suggestion sent! Thanks for the feedback.");
                    setSuggestion("");
                    setShowSuggestion(false);
                  } catch(err) { notify(err.message); }
                  finally { setSendingSuggestion(false); }
                }}
                style={{
                  marginTop:8, padding:"10px 20px", borderRadius:10, fontSize:13, fontWeight:700,
                  cursor: !suggestion.trim() || sendingSuggestion ? "not-allowed" : "pointer",
                  fontFamily:"inherit", border:"none",
                  background: !suggestion.trim() || sendingSuggestion ? "var(--panel2)" : "var(--cyan)",
                  color: !suggestion.trim() || sendingSuggestion ? "var(--muted)" : "#000",
                  width:"100%",
                }}
              >
                {sendingSuggestion ? "Sending..." : "Send Suggestion"}
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Logout */}
      <div style={{ marginTop:16, marginBottom:20 }}>
        <Button variant="ghost" onClick={logout}>Logout</Button>
      </div>
    </>
  );
}
