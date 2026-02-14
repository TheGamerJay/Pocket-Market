import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IconBack, IconSend, IconCamera } from "../components/Icons.jsx";
import { api } from "../api.js";

function formatTime(iso){
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}

export default function Chat({ me, notify }){
  const { id } = useParams();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState([]);
  const [body, setBody] = useState("");
  const [meta, setMeta] = useState({});
  const [busy, setBusy] = useState(true);
  const bottomRef = useRef(null);

  const load = async () => {
    const res = await api.messages(id);
    setMsgs(res.messages || []);
    setMeta({ listing_title: res.listing_title, other_user_name: res.other_user_name });
  };

  useEffect(() => {
    (async()=>{
      try{ await load(); }
      catch(err){ notify(err.message); }
      finally{ setBusy(false); }
    })();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs]);

  const send = async () => {
    if (!body.trim()) return;
    try{
      await api.sendMessage(id, { body });
      setBody("");
      await load();
    }catch(err){ notify(err.message); }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const imgRef = useRef(null);
  const sendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.sendChatImage(id, file);
      await load();
    } catch(err) { notify(err.message); }
    e.target.value = "";
  };

  const myId = me?.user?.id;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 80px)" }}>
      {/* Header */}
      <div style={{
        display:"flex", alignItems:"center", gap:10, padding:"12px 0",
        borderBottom:"1px solid var(--border)", flexShrink:0,
      }}>
        <button onClick={() => nav(-1)} style={{
          background:"none", border:"none", color:"var(--text)",
          cursor:"pointer", padding:4, display:"flex",
        }}>
          <IconBack size={22} />
        </button>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>{meta.other_user_name || "Chat"}</div>
          {meta.listing_title && (
            <div className="muted" style={{ fontSize:12 }}>{meta.listing_title}</div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 0" }}>
        {busy ? (
          <div className="muted" style={{ textAlign:"center", marginTop:20 }}>Loading...</div>
        ) : msgs.length === 0 ? (
          <div className="muted" style={{ textAlign:"center", marginTop:40 }}>No messages yet. Say hello!</div>
        ) : msgs.map(m => {
          const isMe = m.sender_id === myId;
          return (
            <div key={m.id} style={{
              display:"flex", justifyContent: isMe ? "flex-end" : "flex-start",
              marginBottom:8, padding:"0 4px",
            }}>
              <div style={{
                maxWidth:"75%", padding:"10px 14px", borderRadius:16,
                background: isMe ? "var(--cyan)" : "var(--panel)",
                color: isMe ? "#000" : "var(--text)",
                borderBottomRightRadius: isMe ? 4 : 16,
                borderBottomLeftRadius: isMe ? 16 : 4,
              }}>
                {m.image_url && (
                  <img src={`${api.base}${m.image_url}`} alt="" style={{
                    maxWidth:"100%", borderRadius:8, marginBottom:4, display:"block",
                  }} />
                )}
                {m.body !== "[Image]" && (
                  <div style={{ fontSize:14, lineHeight:1.4, wordBreak:"break-word" }}>{m.body}</div>
                )}
                <div style={{
                  fontSize:10, marginTop:4, textAlign:"right",
                  opacity:0.6,
                }}>
                  {formatTime(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {msgs.length === 0 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", padding:"0 0 8px" }}>
          {["Is this still available?", "What's the lowest you'll go?", "When can you meet?", "Can you ship this?"].map(q => (
            <button key={q} onClick={() => setBody(q)} style={{
              padding:"6px 12px", borderRadius:16, fontSize:11, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit",
              background:"rgba(62,224,255,.10)", border:"1px solid rgba(62,224,255,.25)",
              color:"var(--cyan)",
            }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <input type="file" accept="image/*" ref={imgRef} onChange={sendImage} style={{ display:"none" }} />
      <div style={{
        display:"flex", gap:8, padding:"10px 0", alignItems:"flex-end",
        borderTop:"1px solid var(--border)", flexShrink:0,
      }}>
        <button onClick={() => imgRef.current?.click()} style={{
          width:40, height:40, borderRadius:"50%", flexShrink:0,
          background:"var(--panel)", border:"1px solid var(--border)",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer",
        }}>
          <IconCamera size={18} color="var(--muted)" />
        </button>
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
          style={{
            flex:1, padding:"10px 14px", borderRadius:20,
            background:"var(--panel)", border:"1px solid var(--border)",
            color:"var(--text)", fontSize:14, fontFamily:"inherit",
            outline:"none",
          }}
        />
        <button onClick={send} disabled={!body.trim()} style={{
          width:40, height:40, borderRadius:"50%",
          background: body.trim() ? "var(--cyan)" : "var(--panel)",
          border:"none", display:"flex", alignItems:"center", justifyContent:"center",
          cursor: body.trim() ? "pointer" : "default",
        }}>
          <IconSend size={18} color={body.trim() ? "#000" : "var(--muted)"} />
        </button>
      </div>
    </div>
  );
}
