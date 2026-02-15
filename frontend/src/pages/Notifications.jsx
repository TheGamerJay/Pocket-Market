import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import { api } from "../api.js";

function timeAgo(iso){
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return `${Math.floor(diff/604800)}w ago`;
}

export default function Notifications({ notify }){
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.notifications();
        setRows(res.notifications || []);
        await api.markNotifsRead();
      } catch(err) { notify(err.message); }
      finally { setBusy(false); }
    })();
  }, []);

  return (
    <>
      <TopBar title="Notifications" />
      <div style={{ height:12 }} />

      {busy ? (
        <Card><div className="muted">Loading...</div></Card>
      ) : rows.length === 0 ? (
        <Card><div className="muted" style={{ textAlign:"center" }}>No notifications yet. Save items to get updates when prices drop.</div></Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {rows.map(n => (
            <Link key={n.id} to={n.listing_id ? `/listing/${n.listing_id}` : "#"} style={{ textDecoration:"none", color:"inherit" }}>
              <div className="panel" style={{
                padding:"12px 14px", borderRadius:14,
                borderLeft: n.is_read ? "none" : "3px solid var(--cyan)",
              }}>
                <div style={{ fontSize:14 }}>{n.message}</div>
                <div className="muted" style={{ fontSize:11, marginTop:4 }}>{timeAgo(n.created_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
