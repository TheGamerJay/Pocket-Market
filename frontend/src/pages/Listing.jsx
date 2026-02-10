import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { IconBack, IconCamera, IconPin, IconEye, IconEnvelope } from "../components/Icons.jsx";
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

  if (busy) return <Card style={{ marginTop:20 }}><div className="muted">Loading...</div></Card>;
  if (!listing) return <Card style={{ marginTop:20 }}><div className="muted">Not found.</div></Card>;

  return (
    <>
      {/* ── Hero image with back button ── */}
      <div style={{ position:"relative", margin:"-18px -16px 0", overflow:"hidden" }}>
        <button onClick={goBack} style={{
          position:"absolute", top:16, left:16, zIndex:2,
          background:"rgba(0,0,0,.45)", border:"none", borderRadius:"50%",
          width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer",
        }}>
          <IconBack size={20} color="#fff" />
        </button>

        {listing.images?.length > 0 ? (
          <img src={`${api.base}${listing.images[0]}`} alt={listing.title}
               style={{ width:"100%", height:280, objectFit:"cover", display:"block" }} />
        ) : (
          <div style={{
            width:"100%", height:280, background:"var(--panel2)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <IconCamera size={48} color="var(--muted)" />
          </div>
        )}
      </div>

      {/* ── Title + Price ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16 }}>
        <div style={{ fontWeight:800, fontSize:20 }}>{listing.title}</div>
        <div style={{ fontWeight:800, fontSize:20, color:"var(--cyan)" }}>{money(listing.price_cents)}</div>
      </div>

      {/* ── Condition ── */}
      <div className="muted" style={{ fontSize:14, marginTop:4 }}>{listing.condition}</div>

      {/* ── Description ── */}
      {listing.description && (
        <div style={{ marginTop:10, lineHeight:1.5, fontSize:14 }}>{listing.description}</div>
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

      {/* ── Action buttons ── */}
      <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:10 }}>
        <Button icon={<IconEye size={18} />} onClick={toggleObs}>
          {observing ? "Observing" : "Observe"}
        </Button>
        <Button icon={<IconEnvelope size={18} />} onClick={messageSeller}>
          Message Seller
        </Button>
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
