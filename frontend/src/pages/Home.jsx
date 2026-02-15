import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card.jsx";
import { IconSearch, IconChevronRight, IconCamera, IconEye, IconBell } from "../components/Icons.jsx";
import SwipeCards from "../components/SwipeCards.jsx";
import { api } from "../api.js";

const CATEGORIES = [
  "All", "Electronics", "Clothing", "Furniture", "Art",
  "Books", "Sports", "Toys", "Home", "Auto", "Other"
];

const CATEGORY_ICONS = {
  Electronics: "\u{1F4F1}",
  Clothing: "\u{1F455}",
  Furniture: "\u{1FA91}",
  Art: "\u{1F3A8}",
  Books: "\u{1F4DA}",
  Sports: "\u26BD",
  Toys: "\u{1F3AE}",
  Home: "\u{1F3E0}",
  Auto: "\u{1F697}",
  Other: "\u{1F4E6}",
};

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
  const [busy, setBusy] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [swipeMode, setSwipeMode] = useState(false);
  const nav = useNavigate();
  const sentinelRef = useRef(null);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const loadFeed = async (reset = true) => {
    if (reset) setBusy(true);
    else { setLoadingMore(true); loadingMoreRef.current = true; }
    const p = reset ? 1 : page + 1;
    try{
      const [feed, feat] = await Promise.all([
        api.feed(p),
        ...(reset ? [api.featured()] : []),
      ]);
      if (reset) {
        setListings(feed.listings || []);
        setFeaturedIds(feat.featured_listing_ids || []);
      } else {
        setListings(prev => [...prev, ...(feed.listings || [])]);
      }
      setPage(p);
      setHasMore(feed.has_more || false);
      hasMoreRef.current = feed.has_more || false;
    }catch(err){
      notify(err.message);
    }finally{
      setBusy(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  const loadMoreRef = useRef(loadFeed);
  loadMoreRef.current = loadFeed;

  useEffect(() => { loadFeed(); }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
          loadMoreRef.current(false);
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const featured = listings.filter(l => featuredIds.includes(l.id));
  const filtered = activeCategory === "All"
    ? listings
    : listings.filter(l => (l.category || "").toLowerCase() === activeCategory.toLowerCase());

  return (
    <>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"center", padding:"14px 0 6px" }}>
        <img src={document.documentElement.getAttribute("data-theme") === "light" ? "/pocketmarket_favicon_dark_512x512.png" : "/pocketmarket_favicon_transparent_512x512.png"} alt="Pocket Market" style={{ width:320, height:320 }} />
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

      {/* ── Category grid ── */}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:8,
        padding:"12px 0 4px",
      }}>
        {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? "All" : cat)}
            style={{
              display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              padding:"10px 4px", borderRadius:12, cursor:"pointer",
              border: activeCategory === cat ? "1.5px solid var(--cyan)" : "1px solid var(--border)",
              background: activeCategory === cat ? "rgba(62,224,255,.12)" : "var(--panel)",
              color: activeCategory === cat ? "var(--cyan)" : "var(--text)",
              fontFamily:"inherit",
            }}
          >
            <span style={{ fontSize:22 }}>{icon}</span>
            <span style={{ fontSize:9, fontWeight:700 }}>{cat}</span>
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
                      <img src={`${api.base}${l.images[0]}`} alt={l.title} className="card-image" onError={e => { e.target.onerror=null; e.target.src=""; e.target.className="card-image-placeholder"; }} />
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

      {/* ── Refresh + Swipe mode ── */}
      <div style={{ display:"flex", justifyContent:"center", gap:12, padding:"4px 0" }}>
        <button onClick={() => loadFeed(true)} disabled={busy} style={{
          background:"none", border:"none", color:"var(--cyan)",
          fontSize:12, fontWeight:700, cursor:"pointer", padding:"4px 12px",
          fontFamily:"inherit",
        }}>
          {busy ? "Loading..." : "\u21BB Refresh"}
        </button>
        {filtered.length > 0 && (
          <button onClick={() => setSwipeMode(true)} style={{
            background:"linear-gradient(135deg, rgba(62,224,255,.12), rgba(164,122,255,.12))",
            border:"1px solid rgba(62,224,255,.25)", borderRadius:16,
            color:"var(--cyan)", fontSize:12, fontWeight:700,
            cursor:"pointer", padding:"4px 14px", fontFamily:"inherit",
          }}>
            {"\ud83d\udc46"} Swipe Mode
          </button>
        )}
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
                    <img src={`${api.base}${l.images[0]}`} alt={l.title} className="card-image" onError={e => { e.target.onerror=null; e.target.src=""; e.target.className="card-image-placeholder"; }} />
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

          </React.Fragment>
        ))}
      </div>

      {/* ── Infinite scroll sentinel ── */}
      <div ref={sentinelRef} style={{ height:1 }} />
      {loadingMore && (
        <div style={{ display:"flex", justifyContent:"center", padding:"14px 0" }}>
          <span className="muted" style={{ fontSize:13 }}>Loading...</span>
        </div>
      )}

      {/* ── Swipe mode overlay ── */}
      {swipeMode && filtered.length > 0 && (
        <SwipeCards
          listings={filtered.filter(l => !l.is_sold)}
          notify={notify}
          onClose={() => setSwipeMode(false)}
        />
      )}
    </>
  );
}

function RecentlyViewed(){
  const [items, setItems] = useState([]);
  useEffect(() => {
    try {
      const recent = JSON.parse(localStorage.getItem("pm_recent") || "[]");
      // Filter out entries with old broken /uploads/ image URLs
      const valid = recent.filter(r => !r.image || !r.image.includes("/uploads/"));
      if (valid.length !== recent.length) localStorage.setItem("pm_recent", JSON.stringify(valid));
      setItems(valid.slice(0, 6));
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
          <Link key={l.id} to={`/listing/${l.id}`} style={{ minWidth:100, maxWidth:100, flexShrink:0 }}>
            <Card noPadding>
              {l.image ? (
                <img src={`${api.base}${l.image}`} alt={l.title} style={{ width:"100%", height:80, objectFit:"cover", borderRadius:"var(--radius) var(--radius) 0 0", display:"block" }} onError={e => { e.target.onerror=null; e.target.src=""; e.target.style.background="var(--panel2)"; }} />
              ) : (
                <div style={{ width:"100%", height:80, background:"var(--panel2)", borderRadius:"var(--radius) var(--radius) 0 0", display:"flex", alignItems:"center", justifyContent:"center" }}><IconCamera size={20} /></div>
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
