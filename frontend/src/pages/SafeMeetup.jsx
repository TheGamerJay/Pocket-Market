import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Button from "../components/Button.jsx";
import { IconPin } from "../components/Icons.jsx";
import { api } from "../api.js";

const LOCATIONS = [
  { name: "Police Station", address: "123 Main St", type: "police" },
  { name: "City Park",      address: "456 Park Ave", type: "park" },
  { name: "Brightside Cafe", address: "789 Oak Blvd", type: "cafe" },
];

export default function SafeMeetup({ notify }){
  const nav = useNavigate();
  const { id } = useParams();
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSelect = async () => {
    if (selected === null) { notify("Pick a location first."); return; }
    setBusy(true);
    try{
      const loc = LOCATIONS[selected];
      await api.setSafeMeet(id, {
        place_name: loc.name,
        address: loc.address,
        lat: 0, lng: 0,
        place_type: loc.type,
      });
      notify("Safe meetup location set.");
      nav(-1);
    }catch(err){ notify(err.message); }
    finally{ setBusy(false); }
  };

  return (
    <>
      <TopBar title="Safe Meetup Locations" onBack={() => nav(-1)} centerTitle />
      <div style={{ height:12 }} />

      {/* ── Map placeholder with pins ── */}
      <div className="map-placeholder" style={{ height:240, flexDirection:"column", gap:0, position:"relative" }}>
        <div style={{ position:"absolute", inset:0, display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"center", gap:24, padding:20 }}>
          {LOCATIONS.map((loc, i) => (
            <div
              key={i}
              onClick={() => setSelected(i)}
              style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                cursor:"pointer", opacity: selected === i ? 1 : 0.6,
                transform: selected === i ? "scale(1.1)" : "scale(1)",
                transition: "all .15s",
              }}
            >
              <IconPin size={28} color={selected === i ? "var(--violet)" : "var(--cyan)"} />
              <span style={{
                fontSize:11, fontWeight:700, background:"var(--panel)",
                padding:"3px 8px", borderRadius:8, border:"1px solid var(--border)",
              }}>
                {loc.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:10 }}>
        <Button disabled={busy} onClick={onSelect}>
          {busy ? "Setting..." : "Select Location"}
        </Button>
        <Button variant="ghost" onClick={() => nav(-1)}>Cancel</Button>
      </div>
    </>
  );
}
