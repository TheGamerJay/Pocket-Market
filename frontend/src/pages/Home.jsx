import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card.jsx";
import { IconSearch, IconChevronRight, IconCamera, IconEye, IconBell } from "../components/Icons.jsx";
import { api } from "../api.js";

const CATEGORIES = [
  "All", "Electronics", "Clothing", "Furniture", "Art",
  "Books", "Sports", "Toys", "Home", "Auto", "Other"
];

function money(cents){
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function timeAgo(iso){
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return `${Math.floor(diff/604800)}w ago`;
}

export default function Home({ me, notify, unreadNotifs = 0 }){
  const [listings, setListings] = useState([]);
  const [featuredIds, setFeaturedIds] = useState([]);
  const [ads, setAds] = useState([]);
  const [busy, setBusy] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const nav = useNavigate();

  const loadFeed = async () => {
    setBusy(true);
    try{
      const [feed, feat, adRes] = await Promise.all([
        api.feed(),
        api.featured(),
        api.ads()
      ]);
      setListings(feed.listings || []);
      setFeaturedIds(feat.featured_listing_ids || []);
      setAds(adRes.ads || []);
    }catch(err){
      notify(err.message);
    }finally{
      setBusy(false);
    }
  };

  useEffect(() => { loadFeed(); }, []);

  const featured = listings.filter(l => featuredIds.includes(l.id));
  const filtered = activeCategory === "All"
    ? listings
    : listings.filter(l => (l.category || "").toLowerCase() === activeCategory.toLowerCase());

  return (
    <>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"center", padding:"14px 0 6px" }}>
        <img src="/pocketmarket_favicon_transparent_512x512.png" alt="Pocket Market" style={{ width:320, height:320 }} />
      </div>

      {/* ── Search bar + bell ── */}
      <div style={{ display:"flex", gap:10, alignItems:"center", marginTop:8 }}>
        <div
          onClick={() => nav("/search")}
          style={{
            flex:1, display:"flex", alignItems:"center", gap:10,
            padding:"12px 14px", borderRadius:14,
            background:"var(--panel)", border:"1px solid var(--border)", cursor:"pointer",
          }}
        >
          <IconSearch size={18} color="var(--muted)" />
          <span className="muted" style={{ fontSize:14 }}>Search for items...</span>
        </div>
        <Link to="/notifications" style={{ position:"relative", display:"flex" }}>
          <IconBell size={24} color="var(--muted)" />
          {unreadNotifs > 0 && (
            <div style={{
              position:"absolute", top:-4, right:-4,
              minWidth:16, height:16, borderRadius:8,
              background:"var(--danger)", color:"#fff",
              fontSize:9, fontWeight:800,
              display:"flex", alignItems:"center", justifyContent:"center",
              padding:"0 4px",
            }}>
              {unreadNotifs > 9 ? "9+" : unreadNotifs}
            </div>
          )}
        </Link>
      </div>

      {/* ── Category chips ── */}
      <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"12px 0 4px", scrollbarWidth:"none" }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding:"6px 14px", borderRadius:20, flexShrink:0,
              fontSize:13, fontWeight:600, cursor:"pointer",
              border: activeCategory === cat ? "1.5px solid var(--accent)" : "1px solid var(--border)",
              background: activeCategory === cat ? "var(--accent)" : "transparent",
              color: activeCategory === cat ? "#fff" : "var(--text)",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Featured section ── */}
      {featured.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop:6 }}>
            <span className="h2">Featured</span>
            <IconChevronRight size={18} color="var(--muted)" />
          </div>
          <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:4 }}>
            {featured.map(l => (
              <Link key={l.id} to={`/listing/${l.id}`} style={{ minWidth:140, flexShrink:0 }}>
                <Card noPadding>
                  <div style={{ position:"relative" }}>
                    {l.images?.length > 0 ? (
                      <img src={`${api.base}${l.images[0]}`} alt={l.title} className="card-image" />
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
                    <div style={{ fontWeight:700, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.title}</div>
                    <div style={{ marginTop:2, fontSize:12, fontWeight:800 }}>{money(l.price_cents)}</div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── Pull to refresh ── */}
      <div style={{ display:"flex", justifyContent:"center", padding:"4px 0" }}>
        <button onClick={loadFeed} disabled={busy} style={{
          background:"none", border:"none", color:"var(--muted)",
          fontSize:12, cursor:"pointer", padding:"4px 12px",
        }}>
          {busy ? "Loading..." : "Tap to refresh"}
        </button>
      </div>

      {/* ── Recently Viewed ── */}
      <RecentlyViewed />

      {/* ── Nearby Items ── */}
      <div className="section-header">
        <span className="h2">{activeCategory === "All" ? "Nearby Items" : activeCategory}</span>
        <IconChevronRight size={18} color="var(--muted)" />
      </div>

      <div className="grid">
        {busy ? (
          <Card><div className="muted">Loading...</div></Card>
        ) : filtered.length === 0 ? (
          <Card><div className="muted">{activeCategory === "All" ? "No items yet. Be the first to post!" : `No ${activeCategory.toLowerCase()} items found.`}</div></Card>
        ) : filtered.map((l, idx) => (
          <React.Fragment key={l.id}>
            <Link to={`/listing/${l.id}`}>
              <Card noPadding>
                <div style={{ position:"relative" }}>
                  {l.images?.length > 0 ? (
                    <img src={`${api.base}${l.images[0]}`} alt={l.title} className="card-image" />
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
                  {l.is_pro_seller && !l.is_sold && (
                    <div style={{
                      position:"absolute", top:6, right:6,
                      background:"linear-gradient(135deg, var(--cyan), var(--violet))", color:"#fff",
                      fontSize:8, fontWeight:800, padding:"2px 5px",
                      borderRadius:4, letterSpacing:0.5,
                    }}>PRO</div>
                  )}
                </div>
                <div style={{ padding:"8px 10px" }}>
                  <div style={{ fontWeight:700, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {l.title}
                  </div>
                  <div style={{ marginTop:2, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontWeight:800, fontSize:12 }}>{money(l.price_cents)}</span>
                    <span className="muted" style={{ fontSize:10 }}>{timeAgo(l.created_at)}</span>
                  </div>
                </div>
              </Card>
            </Link>

            {!me?.user?.is_pro && ads.length > 0 && idx % 6 === 3 && (
              <Card>
                <div className="muted" style={{ fontSize:11 }}>Sponsored</div>
                <div style={{ fontWeight:800, marginTop:6, fontSize:14 }}>{ads[0].title}</div>
              </Card>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

function RecentlyViewed(){
  const [items, setItems] = useState([]);
  useEffect(() => {
    try {
      const recent = JSON.parse(localStorage.getItem("pm_recent") || "[]");
      setItems(recent.slice(0, 6));
    } catch {}
  }, []);

  if (items.length === 0) return null;

  return (
    <>
      <div className="section-header" style={{ marginTop:6 }}>
        <span className="h2">Recently Viewed</span>
        <IconChevronRight size={18} color="var(--muted)" />
      </div>
      <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:4 }}>
        {items.map(l => (
          <Link key={l.id} to={`/listing/${l.id}`} style={{ minWidth:120, flexShrink:0 }}>
            <Card noPadding>
              {l.image ? (
                <img src={`${api.base}${l.image}`} alt={l.title} className="card-image" />
              ) : (
                <div className="card-image-placeholder"><IconCamera size={24} /></div>
              )}
              <div style={{ padding:"6px 8px" }}>
                <div style={{ fontWeight:700, fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {l.title}
                </div>
                <div style={{ fontWeight:800, fontSize:11, marginTop:2 }}>{money(l.price_cents)}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
