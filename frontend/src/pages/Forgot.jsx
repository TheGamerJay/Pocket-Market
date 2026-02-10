import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthHeader from "../components/AuthHeader.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { IconEnvelope } from "../components/Icons.jsx";
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
      <AuthHeader title="Forgot Password" />

      <div className="muted" style={{ textAlign:"center", fontSize:14, marginBottom:20, lineHeight:1.5 }}>
        Enter your email and we'll send you a link to reset your password.
      </div>

      <form onSubmit={onSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Input icon={<IconEnvelope size={18} />} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <Button disabled={busy}>{busy ? "Sending..." : "Send Reset Link"}</Button>
      </form>

      {token && (
        <div style={{ marginTop:16 }}>
          <hr className="sep" />
          <div className="muted" style={{ fontSize:13 }}>
            Dev token (temporary): copy into Reset page.
          </div>
          <div className="panel" style={{ padding:10, wordBreak:"break-all", marginTop:8, fontSize:13 }}>{token}</div>
        </div>
      )}

      <div className="muted" style={{ textAlign:"center", fontSize:13, marginTop:18 }}>
        Remember your password?{" "}
        <Link to="/login" style={{ color:"var(--cyan)", fontWeight:700 }}>Log In</Link>
      </div>
    </>
  );
}
