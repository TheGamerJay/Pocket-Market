import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import { IconSearch, IconX } from "../components/Icons.jsx";
import { api } from "../api.js";

export default function SavedSearches({ notify }){
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.savedSearches();
        setRows(res.saved_searches || []);
      } catch(err) { notify(err.message); }
      finally { setBusy(false); }
    })();
  }, []);

  const remove = async (id) => {
    try {
      await api.deleteSavedSearch(id);
      setRows(r => r.filter(s => s.id !== id));
      notify("Saved search removed.");
    } catch(err) { notify(err.message); }
  };

  return (
    <>
      <TopBar title="Saved Searches" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      {busy ? (
        <Card><div className="muted">Loading...</div></Card>
      ) : rows.length === 0 ? (
        <Card>
          <div className="muted" style={{ textAlign:"center" }}>
            No saved searches yet. Use the search page to find and save searches.
          </div>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {rows.map(s => (
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
              <button onClick={() => remove(s.id)} style={{
                background:"none", border:"none", cursor:"pointer",
                color:"var(--muted)", display:"flex", padding:4,
              }}>
                <IconX size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ height:20 }} />
    </>
  );
}
