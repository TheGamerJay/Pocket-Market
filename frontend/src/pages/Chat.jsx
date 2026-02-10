import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { api } from "../api.js";

export default function Chat({ notify }){
  const { id } = useParams();
  const [msgs, setMsgs] = useState([]);
  const [body, setBody] = useState("");

  const load = async () => {
    const res = await api.messages(id);
    setMsgs(res.messages || []);
  };

  useEffect(() => {
    (async()=>{ try{ await load(); }catch(err){ notify(err.message); } })();
  }, [id]);

  const send = async () => {
    if (!body.trim()) return;
    try{
      await api.sendMessage(id, { body });
      setBody("");
      await load();
    }catch(err){ notify(err.message); }
  };

  return (
    <>
      <TopBar title="Chat" />
      <div style={{height:12}}/>
      <Card>
        <div className="col" style={{gap:10}}>
          {msgs.length ? msgs.map(m => (
            <div key={m.id} className="panel" style={{padding:10}}>
              <div className="muted" style={{fontSize:12}}>From: {m.sender_id}</div>
              <div style={{marginTop:6}}>{m.body}</div>
            </div>
          )) : <div className="muted">No messages yet.</div>}
        </div>

        <hr className="sep" />

        <div className="row" style={{alignItems:"flex-end"}}>
          <div style={{flex:1}}>
            <Input label="Message" value={body} onChange={(e)=>setBody(e.target.value)} />
          </div>
          <div style={{width:160}}>
            <Button onClick={send}>Send</Button>
          </div>
        </div>
      </Card>
    </>
  );
}
