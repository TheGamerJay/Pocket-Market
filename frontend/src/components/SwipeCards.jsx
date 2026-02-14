import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IconCamera, IconX } from "./Icons.jsx";
import { api } from "../api.js";

function money(cents) {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export default function SwipeCards({ listings, notify, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchRef = useRef(null);
  const nav = useNavigate();

  const current = listings[currentIdx];

  const handleTouchStart = (e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!touchRef.current) return;
    const dx = e.touches[0].clientX - touchRef.current.x;
    setSwipeX(dx);
  };

  const handleTouchEnd = () => {
    if (Math.abs(swipeX) > 100) {
      if (swipeX > 0) {
        // Swipe right = save/observe
        api.toggleObserving(current.id).then(() => {
          notify("Added to Observing!");
        }).catch(() => {});
      }
      // Both directions advance to next card
      if (currentIdx < listings.length - 1) {
        setCurrentIdx(i => i + 1);
      } else {
        onClose();
        notify("No more items to browse!");
      }
    }
    setSwipeX(0);
    setSwiping(false);
    touchRef.current = null;
  };

  if (!current) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 999, background: "var(--bg)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div className="muted" style={{ fontSize: 16 }}>No more items!</div>
        <button onClick={onClose} style={{
          marginTop: 16, padding: "10px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700,
          background: "var(--cyan)", border: "none", color: "#000", cursor: "pointer",
        }}>
          Back to Feed
        </button>
      </div>
    );
  }

  const rotation = swipeX * 0.05;
  const opacity = Math.min(Math.abs(swipeX) / 100, 1);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999, background: "var(--bg)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 16px", flexShrink: 0,
      }}>
        <span style={{ fontWeight: 800, fontSize: 16 }}>Quick Browse</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            {currentIdx + 1} / {listings.length}
          </span>
          <button onClick={onClose} style={{
            background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "50%",
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <IconX size={16} color="var(--text)" />
          </button>
        </div>
      </div>

      {/* Card area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => nav(`/listing/${current.id}`)}
          style={{
            width: "100%", maxWidth: 340, borderRadius: 20, overflow: "hidden",
            background: "var(--panel)", border: "1px solid var(--border)",
            transform: `translateX(${swipeX}px) rotate(${rotation}deg)`,
            transition: swiping ? "none" : "transform 0.3s ease",
            cursor: "pointer", position: "relative",
          }}
        >
          {/* Swipe indicators */}
          {swipeX > 30 && (
            <div style={{
              position: "absolute", top: 20, left: 20, zIndex: 2,
              padding: "8px 16px", borderRadius: 10, fontSize: 18, fontWeight: 800,
              border: "3px solid var(--green, #2ecc71)", color: "var(--green, #2ecc71)",
              background: "rgba(0,0,0,.7)", transform: "rotate(-15deg)", opacity,
            }}>
              SAVE
            </div>
          )}
          {swipeX < -30 && (
            <div style={{
              position: "absolute", top: 20, right: 20, zIndex: 2,
              padding: "8px 16px", borderRadius: 10, fontSize: 18, fontWeight: 800,
              border: "3px solid var(--red, #e74c3c)", color: "var(--red, #e74c3c)",
              background: "rgba(0,0,0,.7)", transform: "rotate(15deg)", opacity,
            }}>
              SKIP
            </div>
          )}

          {/* Image */}
          {current.images?.length > 0 ? (
            <img
              src={`${api.base}${current.images[0]}`}
              alt={current.title}
              style={{ width: "100%", height: 360, objectFit: "cover", display: "block" }}
              draggable={false}
            />
          ) : (
            <div style={{
              width: "100%", height: 360, background: "var(--panel2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IconCamera size={48} color="var(--muted)" />
            </div>
          )}

          {/* Info */}
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 18, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {current.title}
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "var(--cyan)", flexShrink: 0, marginLeft: 8 }}>
                {money(current.price_cents)}
              </div>
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {current.category} {current.city ? `\u00b7 ${current.city}` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 24,
        padding: "16px 0 32px", flexShrink: 0,
      }}>
        <button onClick={() => {
          if (currentIdx < listings.length - 1) setCurrentIdx(i => i + 1);
          else { onClose(); notify("No more items!"); }
        }} style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "none", border: "2px solid var(--red, #e74c3c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>
          <IconX size={28} color="var(--red, #e74c3c)" />
        </button>
        <button onClick={() => nav(`/listing/${current.id}`)} style={{
          width: 48, height: 48, borderRadius: "50%", alignSelf: "center",
          background: "none", border: "2px solid var(--cyan)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 18,
        }}>
          i
        </button>
        <button onClick={() => {
          api.toggleObserving(current.id).then(() => notify("Saved!")).catch(() => {});
          if (currentIdx < listings.length - 1) setCurrentIdx(i => i + 1);
          else { onClose(); notify("No more items!"); }
        }} style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "none", border: "2px solid var(--green, #2ecc71)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 24,
        }}>
          {"\u2764\uFE0F"}
        </button>
      </div>
    </div>
  );
}
