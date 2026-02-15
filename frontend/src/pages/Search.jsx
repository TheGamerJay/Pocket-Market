import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Card from "../components/Card.jsx";
import { IconSearch, IconBack, IconCamera, IconEye } from "../components/Icons.jsx";
import { api } from "../api.js";

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

export default function Search({ notify }){
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      doSearch(q);
    } else {
      inputRef.current?.focus();
    }
  }, []);

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
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div className="muted" style={{ fontSize:12 }}>{results.length} result{results.length !== 1 ? "s" : ""}</div>
            <button onClick={async () => {
              try {
                await api.saveSearch({ query });
                notify("Search saved!");
              } catch(err) { notify(err.message); }
            }} style={{
              background:"none", border:"1px solid var(--border)", borderRadius:8,
              color:"var(--cyan)", fontSize:11, fontWeight:700, padding:"4px 10px",
              cursor:"pointer", fontFamily:"inherit",
            }}>
              Save Search
            </button>
          </div>
          <div className="grid">
            {results.map(l => (
              <Link key={l.id} to={`/listing/${l.id}`}>
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
            ))}
          </div>
        </>
      )}
    </>
  );
}
