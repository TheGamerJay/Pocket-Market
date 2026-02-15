import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import AuthHeader from "../components/AuthHeader.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { IconLock } from "../components/Icons.jsx";
import { api } from "../api.js";

export default function Reset({ notify }){
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [new_password, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token) { notify("Invalid reset link. Please request a new one."); return; }
    setBusy(true);
    try{
      await api.reset({ token, new_password });
      notify("Password updated!");
      nav("/login");
    }catch(err){
      notify(err.message);
    }finally{
      setBusy(false);
    }
  };

  return (
    <>
      <AuthHeader title="Set New Password" />

      {!token ? (
        <div style={{ textAlign:"center", marginTop:10 }}>
          <div className="muted" style={{ fontSize:14, lineHeight:1.5 }}>
            This link is invalid or expired. Please request a new reset link.
          </div>
          <div style={{ marginTop:16 }}>
            <Link to="/forgot"><Button>Request Reset Link</Button></Link>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div className="muted" style={{ textAlign:"center", fontSize:14, marginBottom:4, lineHeight:1.5 }}>
            Enter your new password below.
          </div>
          <Input
            icon={<IconLock size={18} />}
            placeholder="New password"
            type={showPw ? "text" : "password"}
            value={new_password}
            onChange={e => setPw(e.target.value)}
            rightAction={
              <button type="button" onClick={() => setShowPw(p => !p)} style={{
                background:"none", border:"none", color:"var(--cyan)",
                cursor:"pointer", fontSize:13, fontWeight:700,
              }}>
                {showPw ? "\ud83d\ude48" : "\ud83d\udc41\ufe0f"}
              </button>
            }
          />
          <Button disabled={busy}>{busy ? "Updating..." : "Set New Password"}</Button>
        </form>
      )}

      <div className="muted" style={{ textAlign:"center", fontSize:13, marginTop:18 }}>
        Remember your password?{" "}
        <Link to="/login" style={{ color:"var(--cyan)", fontWeight:700 }}>Log In</Link>
      </div>
    </>
  );
}
