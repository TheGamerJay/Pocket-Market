import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import { IconBack, IconCamera, IconPin, IconEye, IconEnvelope, IconChevronRight } from "../components/Icons.jsx";
import ListingMap from "../components/ListingMap.jsx";
import DistanceLabel from "../components/DistanceLabel.jsx";
import { api } from "../api.js";

function money(cents){
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export default function Listing({ me, notify }){
  const { id } = useParams();
  const nav = useNavigate();
  const [listing, setListing] = useState(null);
  const [warning, setWarning] = useState([]);
  const [busy, setBusy] = useState(true);
  const [observing, setObserving] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    (async () => {
      setBusy(true);
      try{
        const [res, warn] = await Promise.all([api.listing(id), api.warningText()]);
        setListing(res.listing);
        setWarning(warn.warning || []);
      }catch(err){
        notify(err.message);
      }finally{
        setBusy(false);
      }
    })();
  }, [id]);

  const goBack = () => window.history.length > 1 ? nav(-1) : nav("/");

  const toggleObs = async () => {
    if (!me.authed) { notify("Login to use Observing."); nav("/login"); return; }
    try{
      const r = await api.toggleObserving(id);
      setObserving(r.observing);
      notify(r.observing ? "Added to Observing." : "Removed from Observing.");
    }catch(err){ notify(err.message); }
  };

  const messageSeller = async () => {
    if (!me.authed) { notify("Login to message sellers."); nav("/login"); return; }
    try{
      const res = await api.startConversation({ listing_id: id, seller_id: listing.user_id });
      nav(`/chat/${res.conversation_id}`);
    }catch(err){ notify(err.message); }
  };

  const shareListing = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: listing.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      notify("Link copied!");
    }
  };

  const startEditing = () => {
    setEditTitle(listing.title);
    setEditPrice(String((listing.price_cents / 100)));
    setEditDesc(listing.description || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    const price_cents = Math.round(parseFloat((editPrice || "0").replace(/[^0-9.]/g, "")) * 100);
    if (!editTitle.trim()) { notify("Title is required"); return; }
    if (!price_cents || price_cents <= 0) { notify("Enter a valid price"); return; }
    try {
      await api.updateListing(listing.id, { title: editTitle, price_cents, description: editDesc });
      setListing(prev => ({ ...prev, title: editTitle, price_cents, description: editDesc }));
      setEditing(false);
      notify("Listing updated.");
    } catch(err) { notify(err.message); }
  };

  if (busy) return <Card style={{ marginTop:20 }}><div className="muted">Loading...</div></Card>;
  if (!listing) return <Card style={{ marginTop:20 }}><div className="muted">Not found.</div></Card>;

  const images = listing.images || [];
  const isOwner = me?.authed && me.user?.id === listing.user_id;

  return (
    <>
      {/* ── Hero image gallery with back button ── */}
      <div style={{ position:"relative", margin:"-18px -16px 0", overflow:"hidden" }}>
        <button onClick={goBack} style={{
          position:"absolute", top:16, left:16, zIndex:2,
          background:"rgba(0,0,0,.45)", border:"none", borderRadius:"50%",
          width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer",
        }}>
          <IconBack size={20} color="#fff" />
        </button>

        {/* Share button */}
        <button onClick={shareListing} style={{
          position:"absolute", top:16, right:16, zIndex:2,
          background:"rgba(0,0,0,.45)", border:"none", borderRadius:"50%",
          width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer",
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <path d="M8.59 13.51l6.83 3.98"/><path d="M15.41 6.51l-6.82 3.98"/>
          </svg>
        </button>

        {images.length > 0 ? (
          <>
            <img src={`${api.base}${images[imgIdx]}`} alt={listing.title}
                 style={{ width:"100%", height:280, objectFit:"cover", display:"block" }} />

            {/* Nav arrows */}
            {images.length > 1 && (
              <>
                {imgIdx > 0 && (
                  <button onClick={() => setImgIdx(i => i-1)} style={{
                    position:"absolute", top:"50%", left:8, transform:"translateY(-50%)",
                    background:"rgba(0,0,0,.45)", border:"none", borderRadius:"50%",
                    width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer",
                  }}>
                    <IconBack size={16} color="#fff" />
                  </button>
                )}
                {imgIdx < images.length - 1 && (
                  <button onClick={() => setImgIdx(i => i+1)} style={{
                    position:"absolute", top:"50%", right:8, transform:"translateY(-50%)",
                    background:"rgba(0,0,0,.45)", border:"none", borderRadius:"50%",
                    width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer",
                  }}>
                    <IconChevronRight size={16} color="#fff" />
                  </button>
                )}

                {/* Dot indicators */}
                <div style={{
                  position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)",
                  display:"flex", gap:6,
                }}>
                  {images.map((_, i) => (
                    <div key={i} onClick={() => setImgIdx(i)} style={{
                      width:7, height:7, borderRadius:"50%", cursor:"pointer",
                      background: i === imgIdx ? "#fff" : "rgba(255,255,255,.45)",
                    }} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{
            width:"100%", height:280, background:"var(--panel2)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <IconCamera size={48} color="var(--muted)" />
          </div>
        )}
      </div>

      {/* ── Edit mode ── */}
      {editing ? (
        <div style={{ marginTop:16 }} className="col">
          <Input label="Title" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          <Input label="Price (USD)" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
          <div className="col" style={{ gap:8 }}>
            <div className="muted" style={{ fontSize:13 }}>Description</div>
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4} style={{
              width:"100%", padding:"12px", borderRadius:14,
              border:"1px solid var(--border)", background:"#1a1f2b",
              color:"var(--text)", outline:"none", resize:"vertical",
            }} />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <Button onClick={saveEdit} style={{ flex:1 }}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(false)} style={{ flex:1 }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Title + Price ── */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16 }}>
            <div style={{ fontWeight:800, fontSize:20 }}>{listing.title}</div>
            <div style={{ fontWeight:800, fontSize:20, color:"var(--cyan)" }}>{money(listing.price_cents)}</div>
          </div>

          {/* ── Condition + Pro badge ── */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
            <span className="muted" style={{ fontSize:14 }}>{listing.condition}</span>
            {listing.is_pro_seller && (
              <span style={{
                background:"linear-gradient(135deg, rgba(62,224,255,.25), rgba(164,122,255,.22))",
                border:"1px solid rgba(62,224,255,.40)",
                padding:"2px 8px", borderRadius:6,
                fontSize:10, fontWeight:800, color:"var(--cyan)",
              }}>PRO Seller</span>
            )}
          </div>

          {/* ── Description ── */}
          {listing.description && (
            <div style={{ marginTop:10, lineHeight:1.5, fontSize:14 }}>{listing.description}</div>
          )}
        </>
      )}

      {/* ── Area + Distance ── */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12 }}>
        <IconPin size={16} color="var(--cyan)" />
        <span className="muted" style={{ fontSize:14 }}>
          Area: {listing.city || "Unknown"} (<DistanceLabel listing={listing} />)
        </span>
      </div>

      {/* ── Observing count ── */}
      {listing.observing_count > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8, fontSize:13, color:"var(--cyan)" }}>
          <IconEye size={14} /> {listing.observing_count} people observing
        </div>
      )}

      {/* ── Sold banner ── */}
      {listing.is_sold && (
        <div style={{
          marginTop:14, padding:"10px 14px", borderRadius:12,
          background:"var(--red, #e74c3c)", color:"#fff",
          fontWeight:800, fontSize:14, textAlign:"center",
        }}>
          This item has been sold
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:10 }}>
        {isOwner ? (
          <>
            {!editing && (
              <Button variant="ghost" onClick={startEditing}>
                Edit Listing
              </Button>
            )}
            <Button
              onClick={async () => {
                try {
                  await api.updateListing(listing.id, { is_sold: !listing.is_sold });
                  setListing(prev => ({ ...prev, is_sold: !prev.is_sold }));
                  notify(listing.is_sold ? "Marked as available." : "Marked as sold.");
                } catch(err) { notify(err.message); }
              }}
            >
              {listing.is_sold ? "Mark as Available" : "Mark as Sold"}
            </Button>
            <button
              onClick={async () => {
                if (!window.confirm("Delete this listing? This can't be undone.")) return;
                try {
                  await api.deleteListing(listing.id);
                  notify("Listing deleted.");
                  nav("/");
                } catch(err) { notify(err.message); }
              }}
              style={{
                padding:"12px 16px", borderRadius:14, fontSize:14, fontWeight:700,
                background:"none", border:"1.5px solid var(--red, #e74c3c)",
                color:"var(--red, #e74c3c)", cursor:"pointer",
              }}
            >
              Delete Listing
            </button>
          </>
        ) : (
          <>
            <Button icon={<IconEye size={18} />} onClick={toggleObs}>
              {observing ? "Observing" : "Observe"}
            </Button>
            <Button icon={<IconEnvelope size={18} />} onClick={messageSeller}>
              Message Seller
            </Button>
          </>
        )}
      </div>

      {/* ── Safe meetup ── */}
      <div style={{ marginTop:20 }}>
        <div className="h2">View Safe Meetup Spot</div>
        <div style={{ marginTop:10 }}>
          {listing.safe_meet ? (
            <>
              <ListingMap
                lat={listing.safe_meet.lat}
                lng={listing.safe_meet.lng}
                title={listing.safe_meet.place_name}
                height={200}
              />
              <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8 }}>
                <IconPin size={16} color="var(--violet)" />
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{listing.safe_meet.place_name}</div>
                  <div className="muted" style={{ fontSize:12 }}>{listing.safe_meet.address}</div>
                </div>
              </div>
            </>
          ) : listing.lat && listing.lng ? (
            <>
              <ListingMap lat={listing.lat} lng={listing.lng} title={listing.title} height={200} />
              <div className="muted" style={{ fontSize:13, marginTop:8 }}>
                Listing location shown. Seller hasn't set a safe meetup spot yet.
              </div>
            </>
          ) : (
            <div className="muted" style={{ fontSize:13 }}>
              Seller hasn't set a safe meetup spot yet.
            </div>
          )}
        </div>
      </div>

      {/* ── Safety warnings ── */}
      {warning.length > 0 && (
        <Card style={{ marginTop:16 }}>
          <div className="h2">Safety</div>
          <div className="muted" style={{ fontSize:13, marginTop:8 }}>
            {warning.map((w,i) => <div key={i}>- {w}</div>)}
          </div>
        </Card>
      )}
    </>
  );
}
