import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { api } from "../api.js";

function money(cents){ return `$${(cents/100).toFixed(2)}`; }

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

  if (busy) return (<><TopBar title="Listing" /><div style={{height:12}}/><Card><div className="muted">Loading...</div></Card></>);
  if (!listing) return (<><TopBar title="Listing" /><div style={{height:12}}/><Card><div className="muted">Not found.</div></Card></>);

  return (
    <>
      <TopBar title="Listing" right={<Link className="pill" to="/">Back</Link>} />
      <div style={{height:12}}/>

      <Card>
        <div className="row" style={{justifyContent:"space-between"}}>
          <div style={{fontWeight:950, fontSize:18}}>{listing.title}</div>
          <div className="pill">{money(listing.price_cents)}</div>
        </div>

        <div className="muted" style={{marginTop:8, fontSize:13}}>
          {listing.category} - {listing.condition} - {listing.city || "Nearby"}
        </div>

        {listing.description ? (
          <div style={{marginTop:10, lineHeight:1.4}}>{listing.description}</div>
        ) : null}

        <div style={{height:12}}/>
        <div className="row" style={{gap:10}}>
          <button onClick={toggleObs} className="pill" style={{cursor:"pointer"}}>
            {observing ? "Observing" : "Observe"}
          </button>
          {listing.is_boosted ? <div className="badgePro">Boosted</div> : null}
        </div>

        <div style={{height:12}}/>
        <Button onClick={messageSeller}>Message seller</Button>
      </Card>

      <div style={{height:12}}/>

      <Card>
        <div className="h2">Safe meetup</div>
        <div className="muted" style={{fontSize:13, marginTop:8}}>
          {warning.map((w,i)=><div key={i}>- {w}</div>)}
        </div>
        <div style={{marginTop:10}} className="muted">
          {listing.safe_meet ? (
            <>
              <div className="pill">{listing.safe_meet.place_type}</div>
              <div style={{marginTop:8, fontWeight:800}}>{listing.safe_meet.place_name}</div>
              <div className="muted" style={{fontSize:13}}>{listing.safe_meet.address}</div>
            </>
          ) : (
            <>Seller hasn't set a safe meetup spot yet.</>
          )}
        </div>
      </Card>
    </>
  );
}
