import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card.jsx";
import { IconSearch, IconBack, IconCamera, IconEye } from "../components/Icons.jsx";
import DistanceLabel from "../components/DistanceLabel.jsx";
import { api } from "../api.js";

function money(cents){
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export default function Search({ notify }){
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = async (q) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setBusy(true);
    setSearched(true);
    try {
      const data = await api.search({ q: term });
      setResults(data.listings || []);
    } catch(err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e) => { e.preventDefault(); doSearch(); };

  return (
    <>
      {/* Search header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 0" }}>
        <button onClick={() => nav(-1)} style={{
          background:"none", border:"none", color:"var(--text)",
          cursor:"pointer", padding:4, display:"flex",
        }}>
          <IconBack size={22} />
        </button>

        <form onSubmit={onSubmit} style={{ flex:1, display:"flex", alignItems:"center", gap:10,
          padding:"10px 14px", borderRadius:14,
          background:"var(--panel)", border:"1px solid var(--border)",
        }}>
          <IconSearch size={18} color="var(--muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for items..."
            style={{
              flex:1, background:"none", border:"none", outline:"none",
              color:"var(--text)", fontSize:14, fontFamily:"inherit",
            }}
          />
        </form>
      </div>

      {/* Results */}
      {busy ? (
        <Card><div className="muted">Searching...</div></Card>
      ) : !searched ? (
        <div className="muted" style={{ textAlign:"center", marginTop:40, fontSize:14 }}>
          Type something and press enter to search
        </div>
      ) : results.length === 0 ? (
        <div className="muted" style={{ textAlign:"center", marginTop:40, fontSize:14 }}>
          No results found for "{query}"
        </div>
      ) : (
        <>
          <div className="muted" style={{ fontSize:12, marginBottom:8 }}>{results.length} result{results.length !== 1 ? "s" : ""}</div>
          <div className="grid">
            {results.map(l => (
              <Link key={l.id} to={`/listing/${l.id}`}>
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
            ))}
          </div>
        </>
      )}
    </>
  );
}
