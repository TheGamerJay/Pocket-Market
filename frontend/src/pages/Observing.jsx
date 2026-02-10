import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import { api } from "../api.js";

export default function Observing({ notify }){
  const [ids, setIds] = useState([]);

  useEffect(() => {
    (async()=>{
      try{
        const res = await api.myObserving();
        setIds((res.observing || []).map(x => x.listing_id));
      }catch(err){ notify(err.message); }
    })();
  }, []);

  return (
    <>
      <TopBar title="Observing" right={<Link className="pill" to="/">Back</Link>} />
      <div style={{height:12}}/>
      {ids.length ? ids.map(id => (
        <Link key={id} to={`/listing/${id}`}>
          <Card>
            <div style={{fontWeight:900}}>Listing</div>
            <div className="muted" style={{fontSize:13, marginTop:6}}>{id}</div>
          </Card>
        </Link>
      )) : (
        <Card><div className="muted">Nothing in Observing yet.</div></Card>
      )}
    </>
  );
}
