import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthHeader from "../components/AuthHeader.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { IconPerson, IconEnvelope, IconLock, IconGoogle, IconFacebook } from "../components/Icons.jsx";
import { api } from "../api.js";

export default function Signup({ notify, refreshMe }){
  const [display_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
      <AuthHeader title="Sign Up" />

      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:6 }}>
        <button className="btn-social" type="button" onClick={() => { window.location.href = `${api.base}/api/auth/google/start`; }}>
          <IconGoogle size={20} /> Sign up with Google
        </button>
        <button className="btn-social" type="button" onClick={() => notify("Facebook login coming soon")}>
          <IconFacebook size={20} /> Sign up with Facebook
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
              {showPw ? "Hide" : "Show"} &gt;
            </button>
          }
        />

        <div className="muted" style={{ fontSize:12, textAlign:"center", lineHeight:1.5 }}>
          By signing up, you agree to our{" "}
          <span style={{ textDecoration:"underline", cursor:"pointer" }}>Terms of Service</span> and{" "}
          <span style={{ textDecoration:"underline", cursor:"pointer" }}>Privacy Policy</span>.
        </div>

        <Button disabled={busy}>{busy ? "Creating..." : "Create Account"}</Button>
      </form>

      <div className="muted" style={{ textAlign:"center", fontSize:13, marginTop:18 }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color:"var(--cyan)", fontWeight:700 }}>Log In</Link>
      </div>
    </>
  );
}
