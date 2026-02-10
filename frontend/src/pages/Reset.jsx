import React, { useState } from "react";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
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
      <TopBar title="Reset password" />
      <div style={{height:12}}/>
      <Card>
        <form onSubmit={onSubmit} className="col">
          <Input label="Reset token" value={token} onChange={e=>setToken(e.target.value)} />
          <Input label="New password" type="password" value={new_password} onChange={e=>setPw(e.target.value)} />
          <Button disabled={busy}>{busy ? "Updating..." : "Update password"}</Button>
        </form>
      </Card>
    </>
  );
}
