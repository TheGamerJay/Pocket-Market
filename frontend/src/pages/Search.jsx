import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Card from "../components/Card.jsx";
import SkeletonCard from "../components/SkeletonCard.jsx";
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

const CATEGORIES = ["electronics","clothing","furniture","art","books","sports","toys","home","auto","other"];
const CONDITIONS = ["new","like new","used","fair"];
const SORT_OPTIONS = [
  { value:"newest", label:"Newest" },
  { value:"oldest", label:"Oldest" },
  { value:"price_low", label:"Price: Low" },
  { value:"price_high", label:"Price: High" },
];

export default function Search({ notify }){
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [zip, setZip] = useState("");
  const [sort, setSort] = useState("newest");

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
      const params = { q: term };
      if (category) params.category = category;
      if (condition) params.condition = condition;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      if (zip) params.zip = zip;
      if (sort !== "newest") params.sort = sort;
      const data = await api.search(params);
      setResults(data.listings || []);
    } catch(err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Re-search when filters/sort change (only if already searched)
  useEffect(() => {
    if (searched && query.trim()) doSearch();
  }, [category, condition, minPrice, maxPrice, zip, sort]);

  const onSubmit = (e) => { e.preventDefault(); doSearch(); };

  const activeFilterCount = [category, condition, minPrice, maxPrice, zip].filter(Boolean).length;

  const chipStyle = (active) => ({
    padding:"6px 12px", borderRadius:20, fontSize:11, fontWeight:700,
    cursor:"pointer", fontFamily:"inherit", border:"1px solid",
    borderColor: active ? "var(--cyan)" : "var(--border)",
    background: active ? "rgba(62,224,255,.12)" : "var(--panel)",
    color: active ? "var(--cyan)" : "var(--muted)",
  });

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

        <button onClick={() => setShowFilters(f => !f)} style={{
          background: showFilters ? "rgba(62,224,255,.12)" : "var(--panel)",
          border:"1px solid", borderColor: showFilters || activeFilterCount ? "var(--cyan)" : "var(--border)",
          borderRadius:12, padding:"10px 12px", cursor:"pointer",
          color: showFilters || activeFilterCount ? "var(--cyan)" : "var(--muted)",
          display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:700,
          fontFamily:"inherit", position:"relative",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/>
          </svg>
          {activeFilterCount > 0 && (
            <span style={{
              position:"absolute", top:-4, right:-4,
              background:"var(--cyan)", color:"#000",
              width:16, height:16, borderRadius:"50%",
              fontSize:9, fontWeight:800,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="panel" style={{ padding:14, borderRadius:14, marginBottom:12 }}>
          {/* Sort */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, marginBottom:6, color:"var(--muted)" }}>Sort</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {SORT_OPTIONS.map(s => (
                <button key={s.value} onClick={() => setSort(s.value)} style={chipStyle(sort === s.value)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, marginBottom:6, color:"var(--muted)" }}>Category</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <button onClick={() => setCategory("")} style={chipStyle(!category)}>All</button>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(category === c ? "" : c)} style={chipStyle(category === c)}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, marginBottom:6, color:"var(--muted)" }}>Condition</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <button onClick={() => setCondition("")} style={chipStyle(!condition)}>All</button>
              {CONDITIONS.map(c => (
                <button key={c} onClick={() => setCondition(condition === c ? "" : c)} style={chipStyle(condition === c)}>
                  {c.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, marginBottom:6, color:"var(--muted)" }}>Price Range</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input
                type="number" placeholder="Min" value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                style={{
                  flex:1, padding:"8px 10px", borderRadius:10, fontSize:13,
                  background:"var(--input-bg)", border:"1px solid var(--border)",
                  color:"var(--text)", fontFamily:"inherit", outline:"none",
                }}
              />
              <span className="muted" style={{ fontSize:12 }}>to</span>
              <input
                type="number" placeholder="Max" value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                style={{
                  flex:1, padding:"8px 10px", borderRadius:10, fontSize:13,
                  background:"var(--input-bg)", border:"1px solid var(--border)",
                  color:"var(--text)", fontFamily:"inherit", outline:"none",
                }}
              />
            </div>
          </div>

          {/* ZIP Code */}
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:11, fontWeight:700, marginBottom:6, color:"var(--muted)" }}>Near My ZIP</div>
            <input
              type="text" inputMode="numeric" placeholder="e.g. 01826" value={zip}
              onChange={e => setZip(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
              style={{
                width:120, padding:"8px 10px", borderRadius:10, fontSize:13,
                background:"var(--input-bg)", border:"1px solid var(--border)",
                color:"var(--text)", fontFamily:"inherit", outline:"none",
              }}
            />
          </div>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button onClick={() => { setCategory(""); setCondition(""); setMinPrice(""); setMaxPrice(""); setZip(""); setSort("newest"); }}
              style={{
                marginTop:10, background:"none", border:"none", cursor:"pointer",
                color:"var(--cyan)", fontSize:11, fontWeight:700, fontFamily:"inherit", padding:0,
              }}>
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {busy ? (
        <div className="grid">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
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
                    {l.seller_rating_count > 0 && (
                      <div className="muted" style={{ fontSize:9, marginTop:2 }}>
                        {l.seller_rating_avg}% positive ({l.seller_rating_count})
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
