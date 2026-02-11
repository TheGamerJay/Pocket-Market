import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { IconCamera, IconPlus, IconX } from "../components/Icons.jsx";
import { api } from "../api.js";

export default function Post({ notify }){
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("electronics");
  const [condition, setCondition] = useState("used");
  const [city, setCity] = useState("");
  const [desc, setDesc] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const addFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setFiles(prev => [...prev, ...picked]);
    setPreviews(prev => [...prev, ...picked.map(f => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removeFile = (idx) => {
    URL.revokeObjectURL(previews[idx]);
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { notify("Title is required"); return; }
    const price_cents = Math.round(parseFloat((price || "0").replace(/[^0-9.]/g, "")) * 100);
    if (!price_cents || price_cents <= 0) { notify("Enter a valid price"); return; }
    setBusy(true);
    try{
      const res = await api.createListing({
        title,
        description: desc,
        price_cents,
        category,
        condition,
        city,
        pickup_or_shipping: "pickup"
      });

      const id = res.listing.id;

      if (files.length){
        await api.uploadListingImages(id, files);
      }

      notify("Posted.");
      nav(`/listing/${id}`);
    }catch(err){
      notify(err.message);
    }finally{
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Post item" />
      <div style={{height:12}}/>

      <Card>
        <form onSubmit={onSubmit} className="col">
          <Input label="Title" placeholder="What are you selling?" value={title} onChange={e=>setTitle(e.target.value)} />
          <Input label="Price (USD)" placeholder="$0.00" value={price} onChange={e=>setPrice(e.target.value)} />
          <div className="col" style={{gap:4}}>
            <div className="muted" style={{fontSize:13}}>Category</div>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={{
              width:"100%", padding:"12px 12px", borderRadius:14,
              border:"1px solid var(--border)", background:"#1a1f2b",
              color:"var(--text)", outline:"none", fontSize:14,
            }}>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="furniture">Furniture</option>
              <option value="art">Art</option>
              <option value="books">Books</option>
              <option value="sports">Sports</option>
              <option value="toys">Toys</option>
              <option value="home">Home</option>
              <option value="auto">Auto</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="col" style={{gap:4}}>
            <div className="muted" style={{fontSize:13}}>Condition</div>
            <select value={condition} onChange={e=>setCondition(e.target.value)} style={{
              width:"100%", padding:"12px 12px", borderRadius:14,
              border:"1px solid var(--border)", background:"#1a1f2b",
              color:"var(--text)", outline:"none", fontSize:14,
            }}>
              <option value="new">New</option>
              <option value="like new">Like New</option>
              <option value="used">Used</option>
              <option value="fair">Fair</option>
            </select>
          </div>
          <Input label="City (optional)" placeholder="e.g. Miami" value={city} onChange={e=>setCity(e.target.value)} />

          {/* ── Photos ── */}
          <div className="col" style={{gap:8}}>
            <div className="muted" style={{fontSize:13}}>Photos</div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={addFiles}
              style={{ display:"none" }}
            />
            <div style={{ display:"flex", gap:8, overflowX:"auto", paddingTop:4 }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position:"relative", flexShrink:0 }}>
                  <img src={src} alt="" style={{
                    width:72, height:72, objectFit:"cover", borderRadius:10,
                    border:"1px solid var(--border)",
                  }} />
                  <button type="button" onClick={() => removeFile(i)} style={{
                    position:"absolute", top:-6, right:-6,
                    width:20, height:20, borderRadius:"50%",
                    background:"var(--red, #e74c3c)", border:"none",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", padding:0,
                  }}>
                    <IconX size={12} color="#fff" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileRef.current?.click()} style={{
                width:72, height:72, borderRadius:10, flexShrink:0,
                border:"2px dashed var(--border)", background:"none",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                gap:4, cursor:"pointer", color:"var(--muted)",
              }}>
                <IconCamera size={20} />
                <span style={{ fontSize:10 }}>Add</span>
              </button>
            </div>
          </div>

          <div className="col" style={{gap:8}}>
            <div className="muted" style={{fontSize:13}}>Description (optional)</div>
            <textarea
              value={desc}
              onChange={(e)=>setDesc(e.target.value)}
              placeholder="Add details about your item..."
              rows={4}
              style={{
                width:"100%",
                padding:"12px 12px",
                borderRadius:14,
                border:"1px solid var(--border)",
                background:"rgba(255,255,255,.04)",
                color:"var(--text)",
                outline:"none",
                resize:"vertical"
              }}
            />
          </div>

          <Button disabled={busy}>{busy ? "Posting..." : "Post item"}</Button>
        </form>
      </Card>
    </>
  );
}
