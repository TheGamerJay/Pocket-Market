import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { api } from "../api.js";

export default function Profile({ me, notify, refreshMe }){
  const nav = useNavigate();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    (async () => {
      if (!me.authed) return;
      try{
        const s = await api.billingStatus();
        setStatus(s);
      }catch(err){ notify(err.message); }
    })();
  }, [me.authed]);

  if (!me.authed){
    return (
      <>
        <TopBar title="Profile" />
        <div style={{height:12}}/>
        <Card>
          <div className="muted">Login to manage your profile.</div>
          <div style={{height:12}}/>
          <Link to="/login"><Button>Login</Button></Link>
        </Card>
      </>
    );
  }

  const togglePro = async () => {
    try{
      const next = !me.user.is_pro;
      await api.setPro(next);
      await refreshMe();
      notify(next ? "Pro enabled (mock)" : "Pro disabled (mock)");
    }catch(err){ notify(err.message); }
  };

  const logout = async () => {
    try{
      await api.logout();
      await refreshMe();
      notify("Logged out.");
      nav("/");
    }catch(err){ notify(err.message); }
  };

  return (
    <>
      <TopBar title="Profile" />
      <div style={{height:12}}/>

      <Card>
        <div style={{fontWeight:950, fontSize:18}}>
          {me.user.display_name || "User"}
        </div>
        <div className="muted" style={{marginTop:6}}>{me.user.email}</div>

        <div style={{height:12}}/>
        {me.user.is_pro ? <div className="badgePro">PRO - No ads</div> : <div className="pill">Free - Ads may appear</div>}

        <div style={{height:12}}/>
        <div className="row">
          <Link to="/observing" className="pill">Observing</Link>
        </div>

        <div style={{height:12}}/>
        <Button onClick={togglePro}>
          {me.user.is_pro ? "Disable Pro (mock)" : "Enable Pro (mock)"}
        </Button>
        <div style={{height:10}}/>
        <Button variant="ghost" onClick={logout}>Logout</Button>
      </Card>

      <div style={{height:12}}/>
      <Card>
        <div className="h2">Safety</div>
        <div className="muted" style={{fontSize:13, marginTop:8}}>
          Never share your residence location. Meet in public. Inspect before paying.
        </div>
      </Card>
    </>
  );
}
