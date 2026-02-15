import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthHeader from "../components/AuthHeader.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { IconEnvelope } from "../components/Icons.jsx";
import { api } from "../api.js";

export default function Forgot({ notify }){
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try{
      await api.forgot({ email });
      setSent(true);
      notify("If that email exists, a reset link was sent.");
    }catch(err){
      notify(err.message);
    }finally{
      setBusy(false);
    }
  };

  return (
    <>
      <AuthHeader title="Forgot Password" />

      {sent ? (
        <>
          <div style={{ textAlign:"center", marginTop:10 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>&#9993;</div>
            <div style={{ fontWeight:700, fontSize:16 }}>Check your email</div>
            <div className="muted" style={{ fontSize:14, marginTop:8, lineHeight:1.5 }}>
              We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="muted" style={{ textAlign:"center", fontSize:14, marginBottom:20, lineHeight:1.5 }}>
            Enter your email and we'll send you a link to reset your password.
          </div>

          <form onSubmit={onSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Input icon={<IconEnvelope size={18} />} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <Button disabled={busy}>{busy ? "Sending..." : "Send Reset Link"}</Button>
          </form>
        </>
      )}

      <div className="muted" style={{ textAlign:"center", fontSize:13, marginTop:18 }}>
        Remember your password?{" "}
        <Link to="/login" style={{ color:"var(--cyan)", fontWeight:700 }}>Log In</Link>
      </div>
    </>
  );
}
