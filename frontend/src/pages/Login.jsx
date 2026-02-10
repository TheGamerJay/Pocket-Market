import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { api } from "../api.js";

export default function Login({ notify, refreshMe }){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const goTo = loc.state?.from || "/";

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try{
      await api.login({ email, password });
      await refreshMe();
      notify("Welcome back.");
      nav(goTo);
    }catch(err){
      notify(err.message);
    }finally{
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Login" />
      <div style={{height:12}}/>
      <Card>
        <form onSubmit={onSubmit} className="col">
          <Input label="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <Button disabled={busy}>{busy ? "Signing in..." : "Sign in"}</Button>
          <div className="row" style={{justifyContent:"space-between"}}>
            <Link className="muted" to="/forgot">Forgot password?</Link>
            <Link className="muted" to="/signup">Create account</Link>
          </div>
        </form>
      </Card>
    </>
  );
}
