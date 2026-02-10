import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import { api } from "../api.js";

export default function Messages({ notify }){
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      try{
        const res = await api.conversations();
        setRows(res.conversations || []);
      }catch(err){ notify(err.message); }
    })();
  }, []);

  return (
    <>
      <TopBar title="Messages" />
      <div style={{height:12}}/>
      <div className="col">
        {rows.length ? rows.map(c => (
          <Link key={c.id} to={`/chat/${c.id}`}>
            <Card>
              <div style={{fontWeight:900}}>Conversation</div>
              <div className="muted" style={{fontSize:13, marginTop:6}}>
                Listing: {c.listing_id}
              </div>
            </Card>
          </Link>
        )) : (
          <Card><div className="muted">No conversations yet.</div></Card>
        )}
      </div>
    </>
  );
}
