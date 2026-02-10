import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { api } from "../api.js";

export default function Signup({ notify, refreshMe }){
  const [display_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try{
      await api.signup({ display_name, email, password });
      await refreshMe();
      notify("Account created.");
      nav("/");
    }catch(err){
      notify(err.message);
    }finally{
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Create account" />
      <div style={{height:12}}/>
      <Card>
        <form onSubmit={onSubmit} className="col">
          <Input label="Display name" value={display_name} onChange={e=>setName(e.target.value)} />
          <Input label="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <Button disabled={busy}>{busy ? "Creating..." : "Create account"}</Button>
          <div className="row" style={{justifyContent:"space-between"}}>
            <Link className="muted" to="/login">Already have an account?</Link>
          </div>
        </form>
      </Card>
    </>
  );
}
