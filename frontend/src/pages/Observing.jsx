import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import { IconCamera, IconChevronRight } from "../components/Icons.jsx";
import { api } from "../api.js";

export default function Observing({ notify }){
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      try{
        const res = await api.myObserving();
        const ids = (res.observing || []).map(x => x.listing_id);
        const details = await Promise.all(
          ids.map(id => api.listing(id).catch(() => null))
        );
        setItems(details.filter(Boolean).map(d => d.listing));
      }catch(err){ notify(err.message); }
      finally{ setBusy(false); }
    })();
  }, []);

  return (
    <>
      <TopBar title="Saved Items" onBack={() => nav(-1)} centerTitle />
      <div style={{ height:12 }} />

      {busy ? (
        <Card><div className="muted">Loading...</div></Card>
      ) : items.length ? items.map(l => (
        <Link key={l.id} to={`/listing/${l.id}`} style={{ display:"block", marginBottom:8 }}>
          <div className="panel obs-item">
            {l.images?.length > 0 ? (
              <img src={`${api.base}${l.images[0]}`} className="obs-item-thumb" alt={l.title} />
            ) : (
              <div className="obs-item-thumb" style={{
                background:"var(--panel2)", display:"flex",
                alignItems:"center", justifyContent:"center",
              }}>
                <IconCamera size={20} color="var(--muted)" />
              </div>
            )}
            <div className="obs-item-info">
              <div style={{ fontWeight:700, fontSize:15 }}>{l.title}</div>
              <div className="muted" style={{ fontSize:13, marginTop:2 }}>
                {l.observing_count > 0
                  ? <span style={{ color:"var(--cyan)" }}>{l.observing_count} people saved this</span>
                  : (l.city || l.category || "Nearby")
                }
              </div>
            </div>
            <IconChevronRight size={18} color="var(--muted)" />
          </div>
        </Link>
      )) : (
        <Card><div className="muted">No saved items yet.</div></Card>
      )}
    </>
  );
}
