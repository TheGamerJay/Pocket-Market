import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthHeader from "../components/AuthHeader.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { IconLock } from "../components/Icons.jsx";
import { api } from "../api.js";

export default function Reset({ notify }){
  const [token, setToken] = useState("");
  const [new_password, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try{
      await api.reset({ token, new_password });
      notify("Password updated. Go login.");
    }catch(err){
      notify(err.message);
    }finally{
      setBusy(false);
    }
  };

  return (
    <>
      <AuthHeader title="Reset Password" />

      <form onSubmit={onSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Input icon={<IconLock size={18} />} placeholder="Reset token" value={token} onChange={e => setToken(e.target.value)} />
        <Input icon={<IconLock size={18} />} placeholder="New password" type="password" value={new_password} onChange={e => setPw(e.target.value)} />
        <Button disabled={busy}>{busy ? "Updating..." : "Update Password"}</Button>
      </form>

      <div className="muted" style={{ textAlign:"center", fontSize:13, marginTop:18 }}>
        Remember your password?{" "}
        <Link to="/login" style={{ color:"var(--cyan)", fontWeight:700 }}>Log In</Link>
      </div>
    </>
  );
}
