import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import { IconCamera, IconChevronRight, IconSearch, IconX } from "../components/Icons.jsx";
import { api } from "../api.js";

function SkeletonRow(){
  return (
    <div className="panel" style={{ display:"flex", gap:12, padding:12, alignItems:"center", borderRadius:14, marginBottom:8 }}>
      <div className="skeleton" style={{ width:52, height:52, borderRadius:10, flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div className="skeleton" style={{ width:"60%", height:12, marginBottom:6 }} />
        <div className="skeleton" style={{ width:"35%", height:10 }} />
      </div>
    </div>
  );
}

function money(cents){
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export default function Saved({ notify }){
  const nav = useNavigate();
  const [tab, setTab] = useState("items");

  // Items (observing) state
  const [items, setItems] = useState([]);
  const [itemsBusy, setItemsBusy] = useState(true);

  // Searches state
  const [searches, setSearches] = useState([]);
  const [searchesBusy, setSearchesBusy] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.myObserving();
        const ids = (res.observing || []).map(x => x.listing_id);
        const details = await Promise.all(
          ids.map(id => api.listing(id).catch(() => null))
        );
        setItems(details.filter(Boolean).map(d => d.listing));
      } catch(err) { notify(err.message); }
      finally { setItemsBusy(false); }
    })();
    (async () => {
      try {
        const res = await api.savedSearches();
        setSearches(res.saved_searches || []);
      } catch(err) { notify(err.message); }
      finally { setSearchesBusy(false); }
    })();
  }, []);

  const removeItem = async (e, listingId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.toggleObserving(listingId);
      setItems(prev => prev.filter(l => l.id !== listingId));
      notify("Removed from Saved.");
    } catch(err) { notify(err.message); }
  };

  const removeSearch = async (id) => {
    try {
      await api.deleteSavedSearch(id);
      setSearches(r => r.filter(s => s.id !== id));
      notify("Saved search removed.");
    } catch(err) { notify(err.message); }
  };

  return (
    <>
      <TopBar title="Saved" onBack={() => nav(-1)} centerTitle />
      <div style={{ height:12 }} />

      {/* Tabs */}
      <div style={{
        display:"flex", gap:0, borderRadius:12, overflow:"hidden",
        border:"1px solid var(--border)", marginBottom:14,
      }}>
        {[["items", "Items"], ["searches", "Searches"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex:1, padding:"10px 0", fontSize:13, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", border:"none",
              background: tab === key ? "var(--cyan)" : "var(--panel)",
              color: tab === key ? "#000" : "var(--muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Items tab */}
      {tab === "items" && (
        itemsBusy ? (
          <>{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</>
        ) : items.length ? items.map(l => (
          <Link key={l.id} to={`/listing/${l.id}`} style={{ display:"block", marginBottom:8 }}>
            <div className="panel" style={{
              display:"flex", gap:12, padding:12, alignItems:"center", borderRadius:14,
            }}>
              <div style={{
                width:52, height:52, borderRadius:10, overflow:"hidden",
                flexShrink:0, background:"var(--panel2)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {l.images?.length > 0 ? (
                  <img src={`${api.base}${l.images[0]}`} alt={l.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                ) : (
                  <IconCamera size={20} color="var(--muted)" />
                )}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.title}</div>
                <div style={{ marginTop:3, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontWeight:800, fontSize:13 }}>{money(l.price_cents)}</span>
                  {l.is_sold && <span style={{ fontSize:10, color:"var(--red, #e74c3c)", fontWeight:700 }}>SOLD</span>}
                  {l.observing_count > 0 && !l.is_sold && (
                    <span className="muted" style={{ fontSize:10 }}>{l.observing_count} saved</span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => removeItem(e, l.id)}
                style={{
                  background:"none", border:"1px solid var(--red, #e74c3c)",
                  borderRadius:8, padding:"6px 10px", cursor:"pointer",
                  fontSize:11, fontWeight:700, color:"var(--red, #e74c3c)",
                  fontFamily:"inherit", flexShrink:0,
                }}
              >
                Remove
              </button>
            </div>
          </Link>
        )) : (
          <Card>
            <div className="muted" style={{ textAlign:"center" }}>
              No saved items yet. Tap the eye icon on any listing to save it.
            </div>
          </Card>
        )
      )}

      {/* Searches tab */}
      {tab === "searches" && (
        searchesBusy ? (
          <>{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</>
        ) : searches.length === 0 ? (
          <Card>
            <div className="muted" style={{ textAlign:"center" }}>
              No saved searches yet. Use the search page to save a search.
            </div>
          </Card>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {searches.map(s => (
              <div key={s.id} className="panel" style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 14px", borderRadius:14,
              }}>
                <div
                  onClick={() => nav(`/search?q=${encodeURIComponent(s.query)}`)}
                  style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", flex:1 }}
                >
                  <IconSearch size={16} color="var(--cyan)" />
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{s.query}</div>
                    {s.category && <div className="muted" style={{ fontSize:11 }}>{s.category}</div>}
                  </div>
                </div>
                <button onClick={() => removeSearch(s.id)} style={{
                  background:"none", border:"none", cursor:"pointer",
                  color:"var(--muted)", display:"flex", padding:4,
                }}>
                  <IconX size={16} />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      <div style={{ height:20 }} />
    </>
  );
}
