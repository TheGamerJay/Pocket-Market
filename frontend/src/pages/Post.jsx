import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { api } from "../api.js";

export default function Post({ notify }){
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("10");
  const [category, setCategory] = useState("electronics");
  const [condition, setCondition] = useState("used");
  const [city, setCity] = useState("");
  const [desc, setDesc] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

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
        <div className="muted" style={{fontSize:13}}>
          Keep it simple: title, price, photo. 3 taps to post.
        </div>
      </Card>

      <div style={{height:12}}/>
      <Card>
        <form onSubmit={onSubmit} className="col">
          <Input label="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <Input label="Price (USD)" value={price} onChange={e=>setPrice(e.target.value)} />
          <Input label="Category" value={category} onChange={e=>setCategory(e.target.value)} />
          <Input label="Condition (new/used)" value={condition} onChange={e=>setCondition(e.target.value)} />
          <Input label="City (optional)" value={city} onChange={e=>setCity(e.target.value)} />

          <div className="col" style={{gap:8}}>
            <div className="muted" style={{fontSize:13}}>Photos (jpg/png/webp)</div>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e)=>setFiles(Array.from(e.target.files || []))}
            />
          </div>

          <div className="col" style={{gap:8}}>
            <div className="muted" style={{fontSize:13}}>Description (optional)</div>
            <textarea
              value={desc}
              onChange={(e)=>setDesc(e.target.value)}
              rows={5}
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
