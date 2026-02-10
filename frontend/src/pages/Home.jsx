import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { api } from "../api.js";

function money(cents){
  return `$${(cents/100).toFixed(2)}`;
}

export default function Home({ me, notify }){
  const [listings, setListings] = useState([]);
  const [featuredIds, setFeaturedIds] = useState([]);
  const [ads, setAds] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      setBusy(true);
      try{
        const [feed, feat, adRes] = await Promise.all([
          api.feed(),
          api.featured(),
          api.ads()
        ]);
        setListings(feed.listings || []);
        setFeaturedIds(feat.featured_listing_ids || []);
        setAds(adRes.ads || []);
      }catch(err){
        notify(err.message);
      }finally{
        setBusy(false);
      }
    })();
  }, []);

  const featured = listings.filter(l => featuredIds.includes(l.id));
  const normal = listings;

  return (
    <>
      <TopBar title="Mini Market" right={
        <Link className="pill" to="/observing">Observing</Link>
      }/>
      <div style={{height:12}}/>

      <Card>
        <div className="row" style={{justifyContent:"space-between"}}>
          <div className="h2">Safe local shopping</div>
          <div className="pill">Cyan + Violet</div>
        </div>
        <div className="muted" style={{marginTop:8, fontSize:13}}>
          Meet in public. Inspect before paying. Never share your residence location.
        </div>
      </Card>

      <div style={{height:12}}/>

      {featured.length ? (
        <Card>
          <div className="h2">Featured</div>
          <div style={{display:"flex", gap:10, overflowX:"auto", paddingTop:10}}>
            {featured.map(l => (
              <Link key={l.id} to={`/listing/${l.id}`} style={{minWidth:260}}>
                <div className="panel" style={{padding:12}}>
                  <div className="pill">Boosted</div>
                  <div style={{height:8}}/>
                  <div style={{fontWeight:900}}>{l.title}</div>
                  <div className="muted" style={{fontSize:13}}>{money(l.price_cents)} - {l.category}</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <div style={{height:12}}/>

      <div className="grid">
        {busy ? (
          <Card><div className="muted">Loading...</div></Card>
        ) : normal.map((l, idx) => (
          <React.Fragment key={l.id}>
            <Link to={`/listing/${l.id}`}>
              <Card>
                <div className="row" style={{justifyContent:"space-between"}}>
                  <div style={{fontWeight:900}}>{l.title}</div>
                  <div className="pill">{money(l.price_cents)}</div>
                </div>
                <div className="muted" style={{marginTop:8, fontSize:13}}>
                  {l.category} - {l.condition} - {l.city || "Nearby"}
                </div>
                {l.is_boosted ? <div style={{marginTop:10}} className="badgePro">Boosted</div> : null}
              </Card>
            </Link>

            {ads.length && (idx % 6 === 3) ? (
              <Card>
                <div className="muted" style={{fontSize:12}}>Ad</div>
                <div style={{fontWeight:900, marginTop:6}}>{ads[0].title}</div>
                <div className="muted" style={{fontSize:13, marginTop:6}}>
                  Sponsored
                </div>
              </Card>
            ) : null}
          </React.Fragment>
        ))}
      </div>

      <div style={{height:12}}/>
      <Link to="/post"><Button>Post an item</Button></Link>
    </>
  );
}
