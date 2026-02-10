import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card.jsx";
import { IconPerson, IconSearch, IconChevronRight, IconCamera, IconEye } from "../components/Icons.jsx";
import DistanceLabel from "../components/DistanceLabel.jsx";
import { api } from "../api.js";

function money(cents){
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export default function Home({ me, notify }){
  const [listings, setListings] = useState([]);
  const [featuredIds, setFeaturedIds] = useState([]);
  const [ads, setAds] = useState([]);
  const [busy, setBusy] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const featured = listings.filter(l => featuredIds.includes(l.id));

  return (
    <>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0 6px" }}>
        <span className="gradient-text" style={{ fontSize:24, fontWeight:800 }}>Mini Market</span>
        <Link to="/profile" style={{
          display:"flex", alignItems:"center", justifyContent:"center",
          width:38, height:38, borderRadius:"50%",
          border:"1px solid var(--border)", background:"var(--panel)",
        }}>
          <IconPerson size={20} color="var(--muted)" />
        </Link>
      </div>

      {/* ── Search bar ── */}
      <div
        onClick={() => nav("/search")}
        style={{
          display:"flex", alignItems:"center", gap:10,
          padding:"12px 14px", borderRadius:14, marginTop:8,
          background:"var(--panel)", border:"1px solid var(--border)", cursor:"pointer",
        }}
      >
        <IconSearch size={18} color="var(--muted)" />
        <span className="muted" style={{ fontSize:14 }}>Search for items...</span>
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
              <Link key={l.id} to={`/listing/${l.id}`} style={{ minWidth:160, flexShrink:0 }}>
                <Card noPadding>
                  {l.images?.length > 0 ? (
                    <img src={`${api.base}${l.images[0]}`} alt={l.title} className="card-image" />
                  ) : (
                    <div className="card-image-placeholder"><IconCamera size={32} /></div>
                  )}
                  <div style={{ padding:"10px 12px" }}>
                    <div style={{ fontWeight:700, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.title}</div>
                    <div style={{ marginTop:4, fontSize:12 }}>
                      <span style={{ fontWeight:800 }}>{money(l.price_cents)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── Nearby Items ── */}
      <div className="section-header">
        <span className="h2">Nearby Items</span>
        <IconChevronRight size={18} color="var(--muted)" />
      </div>

      <div className="grid">
        {busy ? (
          <Card><div className="muted">Loading...</div></Card>
        ) : listings.length === 0 ? (
          <Card><div className="muted">No items yet. Be the first to post!</div></Card>
        ) : listings.map((l, idx) => (
          <React.Fragment key={l.id}>
            <Link to={`/listing/${l.id}`}>
              <Card noPadding>
                {l.images?.length > 0 ? (
                  <img src={`${api.base}${l.images[0]}`} alt={l.title} className="card-image" />
                ) : (
                  <div className="card-image-placeholder"><IconCamera size={32} /></div>
                )}
                <div style={{ padding:"10px 12px" }}>
                  <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {l.title}
                  </div>
                  <div style={{ marginTop:4, fontSize:13 }}>
                    <span style={{ fontWeight:800 }}>{money(l.price_cents)}</span>
                    <span className="muted" style={{ marginLeft:6 }}><DistanceLabel listing={l} /></span>
                  </div>
                  {l.observing_count > 0 && (
                    <div style={{ marginTop:4, fontSize:11, color:"var(--cyan)", display:"flex", alignItems:"center", gap:4 }}>
                      <IconEye size={12} /> {l.observing_count} observing
                    </div>
                  )}
                </div>
              </Card>
            </Link>

            {ads.length > 0 && idx % 6 === 3 && (
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
