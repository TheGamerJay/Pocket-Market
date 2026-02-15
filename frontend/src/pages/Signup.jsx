import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthHeader from "../components/AuthHeader.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { IconPerson, IconEnvelope, IconLock, IconGoogle } from "../components/Icons.jsx";
import { api } from "../api.js";

export default function Signup({ notify }){
  const [display_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try{
      await api.signup({ display_name, email, password });
      notify("Account created. Please log in.");
      nav("/login");
    }catch(err){
      notify(err.message);
    }finally{
      setBusy(false);
    }
  };

  return (
    <>
      <AuthHeader title="Sign Up" />

      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:6 }}>
        <button className="btn-social" type="button" onClick={() => { window.location.href = `${api.base}/api/auth/google/start`; }}>
          <IconGoogle size={20} /> Sign up with Google
        </button>
      </div>

      <div className="divider-text" style={{ margin:"14px 0" }}>or sign up with <strong>email</strong></div>

      <form onSubmit={onSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Input icon={<IconPerson size={18} />} placeholder="Name" value={display_name} onChange={e => setName(e.target.value)} />
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

        <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer", padding:"4px 0" }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ marginTop:3, accentColor:"var(--cyan)", width:18, height:18, flexShrink:0 }}
          />
          <span className="muted" style={{ fontSize:12, lineHeight:1.5 }}>
            I am at least 18 years old and agree to the{" "}
            <Link to="/terms" onClick={e => e.stopPropagation()} style={{ color:"var(--cyan)", textDecoration:"underline" }}>Terms of Service</Link> and{" "}
            <Link to="/privacy" onClick={e => e.stopPropagation()} style={{ color:"var(--cyan)", textDecoration:"underline" }}>Privacy Policy</Link>.
          </span>
        </label>

        <Button disabled={busy || !agreed}>{busy ? "Creating..." : "Create Account"}</Button>
      </form>

      <div className="muted" style={{ textAlign:"center", fontSize:13, marginTop:18 }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color:"var(--cyan)", fontWeight:700 }}>Log In</Link>
      </div>
    </>
  );
}
