import React, { useState } from "react";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { api } from "../api.js";

export default function Forgot({ notify }){
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try{
      const res = await api.forgot({ email });
      setToken(res.reset_token || "");
      notify("If that email exists, a reset was created.");
    }catch(err){
      notify(err.message);
    }finally{
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Forgot password" />
      <div style={{height:12}}/>
      <Card>
        <form onSubmit={onSubmit} className="col">
          <Input label="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <Button disabled={busy}>{busy ? "Sending..." : "Send reset"}</Button>
        </form>

        {token ? (
          <>
            <hr className="sep" />
            <div className="muted" style={{fontSize:13}}>
              Dev token (temporary): copy into Reset page.
            </div>
            <div style={{wordBreak:"break-all", marginTop:8}} className="panel">{token}</div>
          </>
        ) : null}
      </Card>
    </>
  );
}
