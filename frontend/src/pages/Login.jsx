import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AuthHeader from "../components/AuthHeader.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { IconEnvelope, IconLock, IconGoogle, IconFacebook } from "../components/Icons.jsx";
import { api } from "../api.js";

export default function Login({ notify, refreshMe }){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
      <AuthHeader title="Log In" />

      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:6 }}>
        <button className="btn-social" type="button" onClick={() => { window.location.href = `${api.base}/api/auth/google/start`; }}>
          <IconGoogle size={20} /> Log in with Google
        </button>
        <button className="btn-social" type="button" onClick={() => notify("Facebook login coming soon")}>
          <IconFacebook size={20} /> Log in with Facebook
        </button>
      </div>

      <div className="divider-text" style={{ margin:"14px 0" }}>or log in with <strong>email</strong></div>

      <form onSubmit={onSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Input icon={<IconEnvelope size={18} />} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input
          icon={<IconLock size={18} />}
          placeholder="Password"
          type={showPw ? "text" : "password"}
          value={password}
          onChange={e => setPassword(e.target.value)}
          rightAction={
            <button type="button" onClick={() => setShowPw(p => !p)} style={{
              background:"none", border:"none", color:"var(--cyan)",
              cursor:"pointer", fontSize:13, fontWeight:700,
            }}>
              {showPw ? "🙈" : "👁️"}
            </button>
          }
        />

        <Link to="/forgot" style={{ color:"var(--cyan)", fontSize:13, fontWeight:700, textDecoration:"none", textAlign:"right" }}>
          Forgot Password?
        </Link>

        <Button disabled={busy}>{busy ? "Signing in..." : "Log In"}</Button>
      </form>

      <div className="muted" style={{ textAlign:"center", fontSize:13, marginTop:18 }}>
        Don't have an account?{" "}
        <Link to="/signup" style={{ color:"var(--cyan)", fontWeight:700 }}>Sign Up</Link>
      </div>
    </>
  );
}
