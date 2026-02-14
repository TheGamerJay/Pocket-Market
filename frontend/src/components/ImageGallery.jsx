import React, { useState, useRef } from "react";
import { IconBack, IconChevronRight, IconX } from "./Icons.jsx";

export default function ImageGallery({ images, baseUrl, initialIndex = 0, onClose }) {
  const [idx, setIdx] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const touchStartRef = useRef(null);
  const lastTapRef = useRef(0);

  const prev = () => { setIdx(i => Math.max(0, i - 1)); setScale(1); setTranslate({ x: 0, y: 0 }); };
  const next = () => { setIdx(i => Math.min(images.length - 1, i + 1)); setScale(1); setTranslate({ x: 0, y: 0 }); };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    // Double tap to zoom
    const now = Date.now();
    if (now - lastTapRef.current < 300 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      setScale(s => s > 1 ? 1 : 2.5);
      setTranslate({ x: 0, y: 0 });
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    // Swipe to navigate (only when not zoomed)
    if (scale <= 1 && dt < 300 && Math.abs(dx) > 50 && Math.abs(dy) < 80) {
      if (dx < 0 && idx < images.length - 1) next();
      else if (dx > 0 && idx > 0) prev();
    }

    // Swipe down to close
    if (scale <= 1 && dt < 300 && dy > 100 && Math.abs(dx) < 50) {
      onClose();
    }

    touchStartRef.current = null;
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,.95)", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 16px", flexShrink: 0,
      }}>
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
          {idx + 1} / {images.length}
        </span>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%",
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>
          <IconX size={20} color="#fff" />
        </button>
      </div>

      {/* Image */}
      <div
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={`${baseUrl}${images[idx]}`}
          alt=""
          style={{
            maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
            transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
            transition: "transform 0.2s ease",
            userSelect: "none", WebkitUserSelect: "none",
          }}
          draggable={false}
        />
      </div>

      {/* Nav arrows */}
      {images.length > 1 && (
        <>
          {idx > 0 && (
            <button onClick={prev} style={{
              position: "absolute", top: "50%", left: 12, transform: "translateY(-50%)",
              background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%",
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}>
              <IconBack size={20} color="#fff" />
            </button>
          )}
          {idx < images.length - 1 && (
            <button onClick={next} style={{
              position: "absolute", top: "50%", right: 12, transform: "translateY(-50%)",
              background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%",
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}>
              <IconChevronRight size={20} color="#fff" />
            </button>
          )}
        </>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div style={{
          display: "flex", gap: 8, justifyContent: "center",
          padding: "12px 16px", flexShrink: 0, overflowX: "auto",
        }}>
          {images.map((img, i) => (
            <img
              key={i}
              src={`${baseUrl}${img}`}
              alt=""
              onClick={() => { setIdx(i); setScale(1); setTranslate({ x: 0, y: 0 }); }}
              style={{
                width: 48, height: 48, objectFit: "cover", borderRadius: 6,
                border: i === idx ? "2px solid var(--cyan)" : "2px solid transparent",
                opacity: i === idx ? 1 : 0.5, cursor: "pointer", flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
