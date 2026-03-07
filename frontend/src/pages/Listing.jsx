import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { IconBack, IconCamera, IconPin, IconEye, IconEnvelope, IconChevronRight, IconPerson } from "../components/Icons.jsx";
import ListingMap from "../components/ListingMap.jsx";
import DistanceLabel from "../components/DistanceLabel.jsx";
import ImageGallery from "../components/ImageGallery.jsx";
import { api } from "../api.js";

const CONDITION_COLORS = {
  "new": "var(--cyan)",
  "like new": "var(--green, #2ecc71)",
  "used": "var(--muted)",
  "fair": "orange",
};

function money(cents){
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function timeAgo(iso){
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return `${Math.floor(diff/604800)}w ago`;
}

export default function Listing({ me, notify }){
  const { id } = useParams();
  const nav = useNavigate();
  const [listing, setListing] = useState(null);
  const [warning, setWarning] = useState([]);
  const [busy, setBusy] = useState(true);
  const [observing, setObserving] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  // UI state
  const [isWide, setIsWide] = useState(typeof window !== "undefined" && window.innerWidth >= 768);
  const [descExpanded, setDescExpanded] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  // Features
  const [similar, setSimilar] = useState([]);
  const [priceHist, setPriceHist] = useState([]);
  const [offers, setOffers] = useState([]);
  const [offerAmt, setOfferAmt] = useState("");
  const [showOffer, setShowOffer] = useState(false);
  const [boostDurations, setBoostDurations] = useState([]);
  const [showBoost, setShowBoost] = useState(false);
  const [boostInfo, setBoostInfo] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [boostRules, setBoostRules] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [meetupToken, setMeetupToken] = useState(null);
  const [meetupStatus, setMeetupStatus] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");

  // Desktop resize detection
  useEffect(() => {
    const fn = () => setIsWide(window.innerWidth >= 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    (async () => {
      setBusy(true);
      try{
        const [res, warn] = await Promise.all([api.listing(id), api.warningText()]);
        setListing(res.listing);
        setWarning(warn.warning || []);
      }catch(err){
        notify(err.message);
      }finally{
        setBusy(false);
      }
    })();
  }, [id]);

  // Load similar, price history, offers after listing loads
  useEffect(() => {
    if (!listing) return;
    api.similarListings(id).then(r => setSimilar(r.listings || [])).catch(() => {});
    api.priceHistory(id).then(r => setPriceHist(r.history || [])).catch(() => {});
    api.listingOffers(id).then(r => setOffers(r.offers || [])).catch(() => {});
    api.canReview(id).then(r => {
      setCanReview(r.can_review);
      if (r.existing_review) setExistingReview(r.existing_review);
    }).catch(() => {});

    api.trackView(id).catch(() => {});

    if (me?.authed && me.user?.id === listing.user_id && listing.is_boosted) {
      loadBoostInfo();
    }

    try {
      const key = "pm_recent";
      const recent = JSON.parse(localStorage.getItem(key) || "[]");
      const filtered = recent.filter(r => r.id !== id);
      filtered.unshift({
        id: listing.id,
        title: listing.title,
        price_cents: listing.price_cents,
        image: listing.images?.[0] || null,
      });
      localStorage.setItem(key, JSON.stringify(filtered.slice(0, 30)));
    } catch {}
  }, [listing]);

  // Countdown timer for free boost cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(t);
  }, [countdown > 0]);

  // Auto-expire boost
  useEffect(() => {
    if (!listing?.boost_ends_at || !listing.is_boosted) return;
    const endsAt = new Date(listing.boost_ends_at).getTime();

    const checkExpired = () => {
      if (Date.now() >= endsAt) {
        setListing(prev => prev.is_boosted ? { ...prev, is_boosted: false, boost_ends_at: null } : prev);
        return true;
      }
      return false;
    };

    if (checkExpired()) return;
    const t = setTimeout(checkExpired, endsAt - Date.now());
    const onVisible = () => { if (document.visibilityState === "visible") checkExpired(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [listing?.boost_ends_at, listing?.is_boosted]);

  const goBack = () => window.history.length > 1 ? nav(-1) : nav("/");

  const toggleObs = async () => {
    if (!me.authed) { notify("Login to save listings."); nav("/login"); return; }
    try{
      const r = await api.toggleObserving(id);
      setObserving(r.observing);
      notify(r.observing ? "Saved." : "Removed from Saved.");
    }catch(err){ notify(err.message); }
  };

  const messageSeller = async () => {
    if (!me.authed) { notify("Login to message sellers."); nav("/login"); return; }
    try{
      const res = await api.startConversation({ listing_id: id, seller_id: listing.user_id });
      nav(`/chat/${res.conversation_id}`);
    }catch(err){ notify(err.message); }
  };

  const shareListing = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: listing.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      notify("Link copied!");
    }
  };

  const submitOffer = async () => {
    const cents = Math.round(parseFloat((offerAmt || "0").replace(/[^0-9.]/g, "")) * 100);
    if (cents <= 0) { notify("Enter a valid amount"); return; }
    try {
      const res = await api.makeOffer({ listing_id: id, amount_cents: cents });
      setOffers(prev => [res.offer, ...prev]);
      setShowOffer(false);
      setOfferAmt("");
      notify("Offer sent!");
    } catch(err) { notify(err.message); }
  };

  const respondToOffer = async (offerId, action, counterCents) => {
    try {
      const payload = { action };
      if (action === "counter") payload.counter_cents = counterCents;
      const res = await api.respondOffer(offerId, payload);
      setOffers(prev => prev.map(o => o.id === offerId ? res.offer : o));
      notify(action === "accept" ? "Offer accepted!" : action === "decline" ? "Offer declined." : "Counter sent!");
    } catch(err) { notify(err.message); }
  };

  const submitReview = async (isPositive) => {
    try {
      const res = await api.createReview({ listing_id: id, is_positive: isPositive, comment: reviewComment || null });
      setExistingReview(res.review);
      setCanReview(false);
      setShowReview(false);
      setReviewComment("");
      notify(isPositive ? "Positive feedback left!" : "Negative feedback left.");
    } catch(err) { notify(err.message); }
  };

  const loadBoostInfo = async () => {
    try {
      const [dur, status, rules] = await Promise.all([
        api.boostDurations(), api.boostStatus(), api.boostRules(),
      ]);
      setBoostDurations(dur.durations || []);
      setBoostInfo(status);
      setBoostRules(rules.rules || []);
      setCountdown(status.free_boost_available ? 0 : (status.countdown_seconds || 0));
    } catch(err) { notify(err.message); }
  };

  const activateBoost = async (hours, isFree = false) => {
    try {
      if (isFree) {
        await api.activateBoost({ listing_id: id });
        setShowBoost(false);
        setListing(prev => ({ ...prev, is_boosted: true }));
        notify("Free boost activated!");
        api.boostStatus().then(s => {
          setBoostInfo(s);
          if (!s.free_boost_available) setCountdown(s.countdown_seconds || 0);
        }).catch(() => {});
      } else {
        const res = await api.boostCheckout({ listing_id: id, hours });
        if (res.url) window.location.href = res.url;
      }
    } catch(err) { notify(err.message); }
  };

  if (busy) return <Card style={{ marginTop:20 }}><div className="muted">Loading...</div></Card>;
  if (!listing) return <Card style={{ marginTop:20 }}><div className="muted">Not found.</div></Card>;

  const images = listing.images || [];
  const isOwner = me?.authed && me.user?.id === listing.user_id;
  const showStickyBar = !isOwner && !listing.is_sold && !me?.user?.is_test_account;
  const condColor = CONDITION_COLORS[listing.condition?.toLowerCase()] || "var(--muted)";

  // Key details badge helper
  const Badge = ({ children, color, bg }) => (
    <span style={{
      padding:"3px 8px", borderRadius:6, fontSize:11, fontWeight:700,
      color: color || "var(--muted)",
      background: bg || "var(--panel2)",
      border: `1px solid ${color ? color + "33" : "var(--border)"}`,
    }}>
      {children}
    </span>
  );

  // Seller card (reusable for mobile inline + desktop right col)
  const SellerCard = ({ compact }) => (
    <Link to={`/seller/${listing.user_id}`} style={{ textDecoration:"none", color:"inherit", display:"block" }}>
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        padding: compact ? "10px 12px" : "12px 14px",
        borderRadius:12, background:"var(--panel2)", border:"1px solid var(--border)",
      }}>
        <div style={{
          width: compact ? 38 : 44, height: compact ? 38 : 44,
          borderRadius:10, overflow:"hidden",
          background:"var(--panel)", display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0,
        }}>
          {listing.seller_avatar ? (
            <img src={listing.seller_avatar.startsWith("/") ? `${api.base}${listing.seller_avatar}` : listing.seller_avatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          ) : (
            <IconPerson size={compact ? 18 : 22} color="var(--muted)" />
          )}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:14, fontWeight:700 }}>{listing.seller_name}</span>
            {listing.is_verified_seller && <span title="Verified Seller" style={{ fontSize:13 }}>{"\u2705"}</span>}
            {listing.is_pro_seller && (
              <span style={{
                background:"linear-gradient(135deg, rgba(62,224,255,.25), rgba(164,122,255,.22))",
                border:"1px solid rgba(62,224,255,.40)",
                padding:"2px 6px", borderRadius:5, fontSize:9, fontWeight:800, color:"var(--cyan)",
              }}>PRO</span>
            )}
          </div>
          {listing.bundle_discount_pct > 0 && (
            <div style={{ fontSize:11, color:"var(--green, #2ecc71)", fontWeight:600, marginTop:1 }}>
              {listing.bundle_discount_pct}% bundle discount
            </div>
          )}
        </div>
        <IconChevronRight size={14} color="var(--muted)" />
      </div>
    </Link>
  );

  // Review section (reusable)
  const ReviewSection = () => {
    if (!listing.is_sold || isOwner || (!canReview && !existingReview)) return null;
    return (
      <Card style={{ marginBottom:12 }}>
        {existingReview ? (
          <div>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Your Feedback</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:22 }}>{existingReview.is_positive ? "\ud83d\udc4d" : "\ud83d\udc4e"}</span>
              <span style={{ fontSize:13, fontWeight:600, color: existingReview.is_positive ? "var(--green, #2ecc71)" : "var(--red, #e74c3c)" }}>
                {existingReview.is_positive ? "Positive" : "Negative"}
              </span>
            </div>
            {existingReview.comment && (
              <div className="muted" style={{ fontSize:12, marginTop:6 }}>"{existingReview.comment}"</div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Leave Feedback for Seller</div>
            {!showReview ? (
              <button onClick={() => setShowReview(true)} style={{
                width:"100%", padding:"10px 0", borderRadius:10, fontSize:13, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit",
                background:"linear-gradient(135deg, rgba(62,224,255,.12), rgba(164,122,255,.12))",
                border:"1px solid var(--border)", color:"var(--cyan)",
              }}>
                Rate this seller
              </button>
            ) : (
              <>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Optional comment..."
                  rows={2}
                  style={{
                    width:"100%", padding:"10px 12px", borderRadius:10, marginBottom:10,
                    background:"var(--panel2)", border:"1px solid var(--border)",
                    color:"var(--text)", fontSize:13, fontFamily:"inherit",
                    resize:"vertical", boxSizing:"border-box",
                  }}
                />
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => submitReview(true)} style={{
                    flex:1, padding:"12px 0", borderRadius:10, fontSize:14, fontWeight:800,
                    cursor:"pointer", fontFamily:"inherit",
                    background:"rgba(46,204,113,.15)", border:"1.5px solid var(--green, #2ecc71)",
                    color:"var(--green, #2ecc71)",
                  }}>👍 Positive</button>
                  <button onClick={() => submitReview(false)} style={{
                    flex:1, padding:"12px 0", borderRadius:10, fontSize:14, fontWeight:800,
                    cursor:"pointer", fontFamily:"inherit",
                    background:"rgba(231,76,60,.15)", border:"1.5px solid var(--red, #e74c3c)",
                    color:"var(--red, #e74c3c)",
                  }}>👎 Negative</button>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    );
  };

  // Expiry warning (reusable)
  const ExpiryBanner = () => {
    if (!isOwner) return null;
    const base = listing.renewed_at || listing.created_at;
    const daysOld = base ? Math.floor((Date.now() - new Date(base).getTime()) / 86400000) : 0;
    const daysLeft = 30 - daysOld;
    if (daysLeft > 7) return null;
    return (
      <div style={{
        marginBottom:12, padding:"10px 14px", borderRadius:12,
        background: daysLeft <= 0 ? "rgba(231,76,60,.15)" : "rgba(255,165,0,.12)",
        border: `1px solid ${daysLeft <= 0 ? "var(--red, #e74c3c)" : "orange"}`,
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color: daysLeft <= 0 ? "var(--red, #e74c3c)" : "orange" }}>
            {daysLeft <= 0 ? "Listing expired" : `Expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
          </div>
          <div className="muted" style={{ fontSize:11 }}>Renew to keep it visible</div>
        </div>
        <button onClick={async () => {
          try {
            const res = await api.renewListing(listing.id);
            setListing(prev => ({ ...prev, renewed_at: res.renewed_at }));
            notify("Listing renewed for 30 days!");
          } catch(err) { notify(err.message); }
        }} style={{
          padding:"8px 16px", borderRadius:10, fontSize:12, fontWeight:700,
          cursor:"pointer", fontFamily:"inherit",
          background:"var(--cyan)", border:"none", color:"#000",
        }}>Renew</button>
      </div>
    );
  };

  // Action buttons (reusable)
  const ActionButtons = () => (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {isOwner ? (
        <>
          <Link to={`/listing/${id}/edit`} style={{ textDecoration:"none" }}>
            <Button variant="ghost" style={{ width:"100%" }}>Edit Listing</Button>
          </Link>

          {/* Boost */}
          {!listing.is_boosted ? (
            <Button onClick={() => { loadBoostInfo(); setShowBoost(!showBoost); }}>
              Boost Listing
            </Button>
          ) : (
            <div style={{
              padding:"10px 14px", borderRadius:12, textAlign:"center",
              background:"linear-gradient(135deg, rgba(62,224,255,.15), rgba(164,122,255,.15))",
              border:"1px solid rgba(62,224,255,.30)",
            }}>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--cyan)" }}>Currently Boosted ⚡</div>
              {countdown > 0 && (
                <div style={{ fontSize:11, fontWeight:600, color:"var(--muted)", marginTop:4, fontVariantNumeric:"tabular-nums" }}>
                  Next free boost in {Math.floor(countdown/3600).toString().padStart(2,"0")}:{Math.floor((countdown%3600)/60).toString().padStart(2,"0")}:{(countdown%60).toString().padStart(2,"0")}
                </div>
              )}
            </div>
          )}

          {showBoost && boostInfo && (
            <Card>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Boost this listing</div>
              {boostInfo.is_pro && (
                <div style={{ marginBottom:12 }}>
                  {boostInfo.free_boost_available ? (
                    <button onClick={() => activateBoost(24, true)} style={{
                      width:"100%", padding:"14px 16px", borderRadius:12, cursor:"pointer",
                      fontFamily:"inherit", fontSize:14, fontWeight:800,
                      background:"linear-gradient(135deg, rgba(62,224,255,.18), rgba(164,122,255,.18))",
                      border:"1.5px solid rgba(62,224,255,.50)", color:"var(--cyan)",
                    }}>
                      Free Daily 24h Boost (PRO)
                    </button>
                  ) : (
                    <div style={{
                      width:"100%", padding:"14px 16px", borderRadius:12, textAlign:"center",
                      background:"var(--panel2)", border:"1px solid var(--border)", opacity:0.6,
                    }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--muted)" }}>Free boost used today</div>
                      <div style={{ fontSize:12, fontWeight:600, color:"var(--cyan)", marginTop:4, fontVariantNumeric:"tabular-nums" }}>
                        Resets in {Math.floor(countdown/3600).toString().padStart(2,"0")}:{Math.floor((countdown%3600)/60).toString().padStart(2,"0")}:{(countdown%60).toString().padStart(2,"0")}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {boostDurations.length > 0 && (
                <>
                  {boostInfo.is_pro && <div className="muted" style={{ fontSize:12, fontWeight:600, marginBottom:6 }}>Or purchase a longer boost</div>}
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {boostDurations.map(d => (
                      <button key={d.hours} onClick={() => activateBoost(d.hours, false)} style={{
                        display:"flex", justifyContent:"space-between", alignItems:"center",
                        padding:"10px 12px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
                        background:"var(--panel2)", border:"1px solid var(--border)", color:"var(--text)",
                      }}>
                        <span style={{ fontWeight:600, fontSize:13 }}>{d.label}</span>
                        <span style={{ fontWeight:800, fontSize:13, color:"var(--cyan)" }}>${d.price_usd}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button onClick={() => setShowRules(!showRules)} style={{
                width:"100%", marginTop:10, padding:"8px 0", borderRadius:8,
                background:"none", border:"none", cursor:"pointer",
                fontSize:12, fontWeight:600, color:"var(--muted)", fontFamily:"inherit", textAlign:"center",
              }}>
                {showRules ? "Hide boost rules" : "View boost rules"}
              </button>
              {showRules && boostRules.length > 0 && (
                <div style={{ marginTop:4, padding:"10px 12px", borderRadius:10, background:"var(--panel2)", border:"1px solid var(--border)" }}>
                  {boostRules.map((r, i) => (
                    <div key={i} style={{ fontSize:11, lineHeight:1.6, color:"var(--muted)" }}>{"\u2022"} {r}</div>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Button onClick={async () => {
            try {
              await api.updateListing(listing.id, { is_sold: !listing.is_sold });
              setListing(prev => ({ ...prev, is_sold: !prev.is_sold }));
              notify(listing.is_sold ? "Marked as available." : "Marked as sold.");
            } catch(err) { notify(err.message); }
          }}>
            {listing.is_sold ? "Mark as Available" : "Mark as Sold"}
          </Button>

          {offers.length > 0 && (
            <Card>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Offers ({offers.length})</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {offers.map(o => (
                  <OfferRow key={o.id} offer={o} isOwner={true} onRespond={respondToOffer} />
                ))}
              </div>
            </Card>
          )}

          {/* Relist button — only active after 7 days */}
          {(() => {
            const base = listing.renewed_at || listing.created_at;
            const daysOld = base ? Math.floor((Date.now() - new Date(base).getTime()) / 86400000) : 0;
            const canRelist = daysOld >= 7;
            const daysLeft = 7 - daysOld;
            return (
              <button
                disabled={!canRelist}
                onClick={async () => {
                  if (!canRelist) return;
                  try {
                    const res = await api.renewListing(listing.id);
                    setListing(prev => ({ ...prev, renewed_at: res.renewed_at }));
                    notify("Listing pushed back to the top!");
                  } catch(err) { notify(err.message); }
                }}
                style={{
                  padding:"10px 16px", borderRadius:14, fontSize:13, fontWeight:700,
                  cursor: canRelist ? "pointer" : "not-allowed", fontFamily:"inherit",
                  background: canRelist ? "rgba(62,224,255,.10)" : "var(--panel2)",
                  border: canRelist ? "1.5px solid var(--cyan)" : "1px solid var(--border)",
                  color: canRelist ? "var(--cyan)" : "var(--muted)",
                }}
                title={canRelist ? "Push listing back to the top" : "Available after 7 days"}
              >
                {canRelist ? "↑ Relist" : "↑ Relist (available in " + daysLeft + " day" + (daysLeft !== 1 ? "s" : "") + ")"}
              </button>
            );
          })()}

          <button
            onClick={async () => {
              if (!window.confirm("Delete this listing? This can't be undone.")) return;
              try {
                await api.deleteListing(listing.id);
                try {
                  const recent = JSON.parse(localStorage.getItem("pm_recent") || "[]");
                  localStorage.setItem("pm_recent", JSON.stringify(recent.filter(r => r.id !== listing.id)));
                } catch {}
                notify("Listing deleted.");
                nav("/");
              } catch(err) { notify(err.message); }
            }}
            style={{
              padding:"10px 16px", borderRadius:14, fontSize:13, fontWeight:700,
              background:"rgba(231,76,60,.10)", border:"1.5px solid var(--red,#e74c3c)",
              color:"var(--red,#e74c3c)", cursor:"pointer", fontFamily:"inherit",
            }}
          >
            Delete Listing
          </button>
        </>
      ) : me?.user?.is_test_account ? (
        <div style={{
          padding:"14px", borderRadius:12, textAlign:"center",
          background:"rgba(62,224,255,.06)", border:"1px solid rgba(62,224,255,.20)",
        }}>
          <div className="muted" style={{ fontSize:12, lineHeight:1.6 }}>
            Messaging, offers, and purchasing are disabled on this review account.
          </div>
        </div>
      ) : (
        <>
          {!listing.is_sold && (
            <>
              <Button icon={<IconEnvelope size={18} />} onClick={messageSeller}>
                Message Seller
              </Button>
              <Button variant="ghost" icon={<IconEye size={18} />} onClick={toggleObs}>
                {observing ? "Saved \u2713" : "Save Listing"}
              </Button>
              <Button variant="ghost" onClick={() => setShowOffer(!showOffer)}>
                Make an Offer
              </Button>
              {showOffer && (
                <Card>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:16, fontWeight:800 }}>$</span>
                    <input
                      value={offerAmt}
                      onChange={e => setOfferAmt(e.target.value)}
                      placeholder="Your offer"
                      type="number"
                      style={{
                        flex:1, padding:"10px 12px", borderRadius:10,
                        background:"var(--panel2)", border:"1px solid var(--border)",
                        color:"var(--text)", fontSize:14, fontFamily:"inherit",
                      }}
                    />
                    <Button onClick={submitOffer} style={{ whiteSpace:"nowrap" }}>Send</Button>
                  </div>
                </Card>
              )}
            </>
          )}
          {listing.is_sold && (
            <Button icon={<IconEye size={18} />} onClick={toggleObs}>
              {observing ? "Saved \u2713" : "Save Listing"}
            </Button>
          )}

          {/* Report */}
          <button onClick={() => setShowReport(!showReport)} style={{
            padding:"12px 14px", borderRadius:14, fontSize:13, fontWeight:700,
            background:"none", border:"1px solid var(--border)",
            color:"var(--muted)", cursor:"pointer", fontFamily:"inherit",
            width:"100%", textAlign:"center",
          }}>
            Report Listing
          </button>
          {showReport && (
            <Card>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Why are you reporting this?</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {["Prohibited item", "Scam / fraud", "Misleading description", "Offensive content", "Other"].map(r => (
                  <button key={r} onClick={() => setReportReason(r)} style={{
                    padding:"10px 12px", borderRadius:10, fontSize:13, fontWeight:600,
                    cursor:"pointer", fontFamily:"inherit", textAlign:"left",
                    background: reportReason === r ? "rgba(62,224,255,.12)" : "var(--panel2)",
                    border: reportReason === r ? "1px solid var(--cyan)" : "1px solid var(--border)",
                    color: reportReason === r ? "var(--cyan)" : "var(--text)",
                  }}>
                    {r}
                  </button>
                ))}
              </div>
              <button onClick={async () => {
                if (!reportReason) { notify("Select a reason"); return; }
                try {
                  await api.reportUser(listing.user_id, { listing_id: listing.id, reason: reportReason });
                  setShowReport(false);
                  setReportReason("");
                  notify("Report submitted. We'll review it shortly.");
                } catch(err) { notify(err.message); }
              }} style={{
                marginTop:10, width:"100%", padding:"12px 0", borderRadius:12,
                fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
                background:"rgba(231,76,60,.12)", border:"1px solid var(--red, #e74c3c)",
                color:"var(--red, #e74c3c)",
              }}>
                Submit Report
              </button>
            </Card>
          )}

          {/* My offers */}
          {offers.filter(o => o.buyer_id === me?.user?.id).length > 0 && (
            <Card>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:6 }}>Your Offers</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {offers.filter(o => o.buyer_id === me?.user?.id).map(o => (
                  <OfferRow key={o.id} offer={o} isOwner={false} />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      {/* ── 2-col desktop wrapper ── */}
      <div style={{
        display: isWide ? "flex" : "block",
        gap: isWide ? 28 : 0,
        alignItems: "flex-start",
        paddingBottom: showStickyBar && !isWide ? 80 : 24,
      }}>

        {/* ════════════════ LEFT COLUMN ════════════════ */}
        <div style={{ flex: isWide ? "1 1 55%" : undefined, minWidth: 0 }}>

          {/* Hero image gallery */}
          <div style={isWide
            ? { position:"relative", borderRadius:16, overflow:"hidden", marginBottom:12 }
            : { position:"relative", margin:"-18px -16px 0", overflow:"hidden" }
          }>
            <button onClick={goBack} style={{
              position:"absolute", top:16, left:16, zIndex:2,
              background:"rgba(0,0,0,.45)", border:"none", borderRadius:"50%",
              width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer",
            }}>
              <IconBack size={20} color="#fff" />
            </button>

            <button onClick={shareListing} style={{
              position:"absolute", top:16, right:16, zIndex:2,
              background:"rgba(0,0,0,.45)", border:"none", borderRadius:"50%",
              width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer",
            }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <path d="M8.59 13.51l6.83 3.98"/><path d="M15.41 6.51l-6.82 3.98"/>
              </svg>
            </button>

            {images.length > 0 ? (
              <>
                <img
                  src={`${api.base}${images[imgIdx]}`}
                  alt={listing.title}
                  onClick={() => setGalleryOpen(true)}
                  onError={e => { e.target.onerror=null; e.target.style.objectFit="contain"; e.target.style.background="var(--panel2)"; e.target.src=""; }}
                  style={{ width:"100%", height: isWide ? 380 : 260, objectFit:"cover", display:"block", cursor:"pointer" }}
                />

                {/* Image counter */}
                {images.length > 1 && (
                  <div style={{
                    position:"absolute", bottom:12, right:12, zIndex:2,
                    background:"rgba(0,0,0,.6)", borderRadius:8,
                    padding:"3px 9px", fontSize:11, fontWeight:700, color:"#fff",
                  }}>
                    {imgIdx + 1} / {images.length}
                  </div>
                )}

                {/* Nav arrows */}
                {images.length > 1 && (
                  <>
                    {imgIdx > 0 && (
                      <button onClick={() => setImgIdx(i => i-1)} style={{
                        position:"absolute", top:"50%", left:8, transform:"translateY(-50%)",
                        background:"rgba(0,0,0,.45)", border:"none", borderRadius:"50%",
                        width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center",
                        cursor:"pointer",
                      }}>
                        <IconBack size={16} color="#fff" />
                      </button>
                    )}
                    {imgIdx < images.length - 1 && (
                      <button onClick={() => setImgIdx(i => i+1)} style={{
                        position:"absolute", top:"50%", right:8, transform:"translateY(-50%)",
                        background:"rgba(0,0,0,.45)", border:"none", borderRadius:"50%",
                        width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center",
                        cursor:"pointer",
                      }}>
                        <IconChevronRight size={16} color="#fff" />
                      </button>
                    )}

                    {/* Dot indicators */}
                    <div style={{
                      position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)",
                      display:"flex", gap:6,
                    }}>
                      {images.map((_, i) => (
                        <div key={i} onClick={() => setImgIdx(i)} style={{
                          width:7, height:7, borderRadius:"50%", cursor:"pointer",
                          background: i === imgIdx ? "#fff" : "rgba(255,255,255,.45)",
                        }} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{
                width:"100%", height: isWide ? 380 : 280, background:"var(--panel2)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <IconCamera size={48} color="var(--muted)" />
              </div>
            )}
          </div>

          {/* Mobile-only: title + price + badges + seller card */}
          {!isWide && (
            <div style={{ marginTop:16 }}>
              {/* Title + Price */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ fontWeight:800, fontSize:20, lineHeight:1.3 }}>{listing.title}</div>
                <div style={{ fontWeight:800, fontSize:22, color:"var(--cyan)", flexShrink:0 }}>
                  {money(listing.price_cents)}
                </div>
              </div>

              {/* Key details badges */}
              <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                <Badge color={condColor}>{listing.condition}</Badge>
                {listing.category && (
                  <Badge style={{ textTransform:"capitalize" }}>{listing.category}</Badge>
                )}
                <Badge>{timeAgo(listing.created_at)}</Badge>
                {listing.is_boosted && (
                  <Badge color="var(--cyan)" bg="rgba(62,224,255,.08)">⚡ Boosted</Badge>
                )}
                {listing.bundle_discount_pct > 0 && (
                  <Badge color="var(--green, #2ecc71)" bg="rgba(46,204,113,.10)">
                    {listing.bundle_discount_pct}% off bundles
                  </Badge>
                )}
              </div>

              {/* Seller card */}
              <div style={{ marginTop:10 }}>
                <SellerCard compact />
              </div>
            </div>
          )}

          {/* Description with Read More */}
          {listing.description && (
            <div style={{ marginTop:14 }}>
              <div className="muted" style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>Description</div>
              <div style={{
                fontSize:14, lineHeight:1.6,
                overflow: descExpanded ? "visible" : "hidden",
                display: descExpanded ? "block" : "-webkit-box",
                WebkitLineClamp: descExpanded ? undefined : 4,
                WebkitBoxOrient: descExpanded ? undefined : "vertical",
              }}>
                {listing.description}
              </div>
              {listing.description.length > 180 && (
                <button onClick={() => setDescExpanded(p => !p)} style={{
                  marginTop:4, background:"none", border:"none", cursor:"pointer",
                  fontSize:12, fontWeight:700, color:"var(--cyan)", padding:0,
                  fontFamily:"inherit",
                }}>
                  {descExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {/* Price History */}
          {priceHist.length > 0 && (
            <div style={{ marginTop:12 }}>
              <div className="muted" style={{ fontSize:12, fontWeight:700, marginBottom:6 }}>Price History</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {priceHist.map((h, i) => {
                  const dropped = h.new_cents < h.old_cents;
                  return (
                    <div key={i} style={{ fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ color: dropped ? "var(--green, #2ecc71)" : "var(--red, #e74c3c)", fontWeight:700 }}>
                        {dropped ? "\u2193" : "\u2191"}
                      </span>
                      <span className="muted">{money(h.old_cents)}</span>
                      <span className="muted">{"\u2192"}</span>
                      <span style={{ fontWeight:700 }}>{money(h.new_cents)}</span>
                      <span className="muted" style={{ fontSize:10 }}>{timeAgo(h.changed_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Area + Distance + Social proof */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12 }}>
            <IconPin size={16} color="var(--cyan)" />
            <span className="muted" style={{ fontSize:14 }}>
              Area: {listing.zip || listing.city || "Unknown"} (<DistanceLabel listing={listing} />)
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginTop:8, flexWrap:"wrap" }}>
            {listing.view_count > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"var(--muted)" }}>
                <IconEye size={13} /> {listing.view_count} view{listing.view_count !== 1 ? "s" : ""}
              </div>
            )}
            {listing.observing_count > 0 && (
              <div style={{
                display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700,
                color:"var(--cyan)", padding:"3px 10px", borderRadius:8,
                background:"rgba(62,224,255,.08)", border:"1px solid rgba(62,224,255,.18)",
              }}>
                {"\ud83d\udc41\ufe0f"} {listing.observing_count} saved
              </div>
            )}
          </div>

          {/* Sold banner */}
          {listing.is_sold && (
            <div style={{
              marginTop:14, padding:"10px 14px", borderRadius:12,
              background:"var(--red, #e74c3c)", color:"#fff",
              fontWeight:800, fontSize:14, textAlign:"center",
            }}>
              This item has been sold
            </div>
          )}

          {/* Safe meetup */}
          <div style={{ marginTop:18 }}>
            <div className="h2" style={{ marginBottom:8 }}>Safe Meetup Spot</div>
            {listing.safe_meet ? (
              <Card noPadding style={{ overflow:"hidden" }}>
                <ListingMap
                  lat={listing.safe_meet.lat}
                  lng={listing.safe_meet.lng}
                  title={listing.safe_meet.place_name}
                  height={180}
                />
                <div style={{ padding:"10px 12px", display:"flex", alignItems:"center", gap:8 }}>
                  <IconPin size={15} color="var(--violet, #a47aff)" />
                  <div>
                    <div style={{ fontWeight:700, fontSize:13 }}>{listing.safe_meet.place_name}</div>
                    <div className="muted" style={{ fontSize:11 }}>{listing.safe_meet.address}</div>
                  </div>
                </div>
              </Card>
            ) : listing.lat && listing.lng ? (
              <>
                <ListingMap lat={listing.lat} lng={listing.lng} title={listing.title} height={180} />
                <div className="muted" style={{ fontSize:13, marginTop:8 }}>
                  Listing location shown. Seller hasn't set a safe meetup spot yet.
                </div>
              </>
            ) : (
              <div className="muted" style={{ fontSize:13 }}>
                Seller hasn't set a safe meetup spot yet.
              </div>
            )}
          </div>

          {/* Similar Listings */}
          {similar.length > 0 && (
            <div style={{ marginTop:20 }}>
              <div className="h2" style={{ marginBottom:10 }}>Similar Items</div>
              <div className="grid">
                {similar.map(s => (
                  <Link key={s.id} to={`/listing/${s.id}`}>
                    <Card noPadding>
                      <div style={{ position:"relative" }}>
                        {s.image ? (
                          <img src={`${api.base}${s.image}`} alt={s.title} className="card-image" onError={e => { e.target.onerror=null; e.target.src=""; e.target.className="card-image-placeholder"; }} />
                        ) : (
                          <div className="card-image-placeholder"><IconCamera size={28} /></div>
                        )}
                      </div>
                      <div style={{ padding:"8px 10px" }}>
                        <div style={{ fontWeight:700, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {s.title}
                        </div>
                        <div style={{ marginTop:2, fontWeight:800, fontSize:12, color:"var(--cyan)" }}>{money(s.price_cents)}</div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Meetup QR Confirmation */}
          {listing.is_sold && (isOwner || me?.user?.id === listing.buyer_id) && (
            <Card style={{ marginTop:16 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Meetup Confirmation</div>
              {!meetupToken ? (
                <button onClick={async () => {
                  try {
                    const res = await api.createMeetupToken(listing.id);
                    setMeetupToken(res.token);
                    setMeetupStatus({ buyer: res.buyer_confirmed, seller: res.seller_confirmed });
                  } catch(err) { notify(err.message); }
                }} style={{
                  width:"100%", padding:"10px 0", borderRadius:10, fontSize:13, fontWeight:700,
                  cursor:"pointer", fontFamily:"inherit",
                  background:"linear-gradient(135deg, rgba(62,224,255,.12), rgba(164,122,255,.12))",
                  border:"1px solid var(--border)", color:"var(--cyan)",
                }}>
                  Generate Meetup QR Code
                </button>
              ) : (
                <div style={{ textAlign:"center" }}>
                  <div style={{ display:"inline-block", padding:16, background:"#fff", borderRadius:12, marginBottom:10 }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + "/meetup/" + meetupToken)}`}
                      alt="Meetup QR"
                      style={{ width:160, height:160, display:"block" }}
                    />
                  </div>
                  <div className="muted" style={{ fontSize:11, marginBottom:8 }}>
                    Both parties scan to confirm the meetup
                  </div>
                  <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                    <div style={{
                      padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:700,
                      background: meetupStatus?.seller ? "rgba(46,204,113,.15)" : "var(--panel2)",
                      border: `1px solid ${meetupStatus?.seller ? "var(--green, #2ecc71)" : "var(--border)"}`,
                      color: meetupStatus?.seller ? "var(--green, #2ecc71)" : "var(--muted)",
                    }}>
                      Seller {meetupStatus?.seller ? "\u2713" : "..."}
                    </div>
                    <div style={{
                      padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:700,
                      background: meetupStatus?.buyer ? "rgba(46,204,113,.15)" : "var(--panel2)",
                      border: `1px solid ${meetupStatus?.buyer ? "var(--green, #2ecc71)" : "var(--border)"}`,
                      color: meetupStatus?.buyer ? "var(--green, #2ecc71)" : "var(--muted)",
                    }}>
                      Buyer {meetupStatus?.buyer ? "\u2713" : "..."}
                    </div>
                  </div>
                  {!meetupStatus?.buyer || !meetupStatus?.seller ? (
                    <button onClick={async () => {
                      try {
                        const res = await api.confirmMeetup(meetupToken);
                        setMeetupStatus({ buyer: res.buyer_confirmed, seller: res.seller_confirmed });
                        if (res.completed) notify("Meetup confirmed by both parties!");
                        else notify("Your confirmation recorded!");
                      } catch(err) { notify(err.message); }
                    }} style={{
                      marginTop:10, padding:"10px 24px", borderRadius:10, fontSize:13, fontWeight:700,
                      cursor:"pointer", fontFamily:"inherit",
                      background:"var(--cyan)", border:"none", color:"#000",
                    }}>
                      Confirm Meetup
                    </button>
                  ) : (
                    <div style={{ marginTop:10, padding:"10px 0", fontSize:14, fontWeight:800, color:"var(--green, #2ecc71)" }}>
                      {"\u2705"} Transaction Complete!
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Safety tips – collapsible */}
          {warning.length > 0 && (
            <Card style={{ marginTop:16 }}>
              <button onClick={() => setSafetyOpen(p => !p)} style={{
                width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
                background:"none", border:"none", cursor:"pointer", padding:0,
                fontFamily:"inherit", color:"var(--text)",
              }}>
                <div className="h2" style={{ margin:0 }}>Safety Tips</div>
                <span style={{ fontSize:12, color:"var(--muted)", fontWeight:600 }}>
                  {safetyOpen ? "Hide" : "Show"}
                </span>
              </button>
              {safetyOpen && (
                <div className="muted" style={{ fontSize:13, marginTop:8 }}>
                  {warning.map((w,i) => <div key={i} style={{ marginBottom:2 }}>{"\u2022"} {w}</div>)}
                </div>
              )}
            </Card>
          )}

        </div>{/* end LEFT COLUMN */}

        {/* ════════════════ RIGHT COLUMN ════════════════ */}
        <div style={{
          flex: isWide ? "0 0 320px" : undefined,
          position: isWide ? "sticky" : undefined,
          top: isWide ? 80 : undefined,
          alignSelf: isWide ? "flex-start" : undefined,
          marginTop: isWide ? 0 : 16,
        }}>

          {/* Desktop: title + price + badges */}
          {isWide && (
            <Card style={{ marginBottom:12 }}>
              <div style={{ fontWeight:800, fontSize:22, lineHeight:1.3 }}>{listing.title}</div>
              <div style={{ fontWeight:800, fontSize:28, color:"var(--cyan)", marginTop:4 }}>
                {money(listing.price_cents)}
              </div>
              <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                <Badge color={condColor}>{listing.condition}</Badge>
                {listing.category && <Badge style={{ textTransform:"capitalize" }}>{listing.category}</Badge>}
                <Badge>{timeAgo(listing.created_at)}</Badge>
                {listing.is_boosted && (
                  <Badge color="var(--cyan)" bg="rgba(62,224,255,.08)">⚡ Boosted</Badge>
                )}
                {listing.bundle_discount_pct > 0 && (
                  <Badge color="var(--green, #2ecc71)" bg="rgba(46,204,113,.10)">
                    {listing.bundle_discount_pct}% off bundles
                  </Badge>
                )}
              </div>
              {listing.is_sold && (
                <div style={{
                  marginTop:10, padding:"8px 12px", borderRadius:10,
                  background:"var(--red, #e74c3c)", color:"#fff",
                  fontWeight:800, fontSize:13, textAlign:"center",
                }}>
                  This item has been sold
                </div>
              )}
            </Card>
          )}

          {/* Desktop: Seller card */}
          {isWide && (
            <div style={{ marginBottom:12 }}>
              <SellerCard />
            </div>
          )}

          {/* Review */}
          <ReviewSection />

          {/* Expiry */}
          <ExpiryBanner />

          {/* Actions */}
          <ActionButtons />

        </div>{/* end RIGHT COLUMN */}

      </div>{/* end 2-col wrapper */}

      {/* Mobile sticky bottom CTA bar */}
      {showStickyBar && !isWide && (
        <div style={{
          position:"fixed", bottom:60, left:0, right:0, zIndex:100,
          background:"var(--panel)", borderTop:"1px solid var(--border)",
          padding:"10px 16px",
          display:"flex", alignItems:"center", gap:12,
          backdropFilter:"blur(12px)",
        }}>
          <div>
            <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600 }}>Price</div>
            <div style={{ fontSize:18, fontWeight:800, color:"var(--cyan)" }}>{money(listing.price_cents)}</div>
          </div>
          <Button onClick={messageSeller} style={{ flex:1 }} icon={<IconEnvelope size={16} />}>
            Message Seller
          </Button>
        </div>
      )}

      {/* Fullscreen image gallery */}
      {galleryOpen && images.length > 0 && (
        <ImageGallery
          images={images}
          baseUrl={api.base}
          initialIndex={imgIdx}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </>
  );
}


function OfferRow({ offer, isOwner, onRespond }){
  const [counterAmt, setCounterAmt] = useState("");
  const [showCounter, setShowCounter] = useState(false);

  const statusColors = {
    pending: "var(--cyan)",
    accepted: "var(--green, #2ecc71)",
    declined: "var(--red, #e74c3c)",
    countered: "var(--violet, #a47aff)",
  };

  return (
    <div style={{
      padding:"10px 12px", borderRadius:10,
      background:"var(--panel2)", border:"1px solid var(--border)",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          {isOwner && <div style={{ fontSize:12, fontWeight:600 }}>{offer.buyer_name}</div>}
          <div style={{ fontSize:14, fontWeight:800 }}>{money(offer.amount_cents)}</div>
        </div>
        <div style={{
          fontSize:10, fontWeight:800, padding:"3px 8px", borderRadius:6,
          color: statusColors[offer.status] || "var(--muted)",
          border: `1px solid ${statusColors[offer.status] || "var(--border)"}`,
        }}>
          {offer.status.toUpperCase()}
        </div>
      </div>

      {offer.status === "countered" && offer.counter_cents && (
        <div style={{ marginTop:4, fontSize:12, color:"var(--violet, #a47aff)" }}>
          Counter: {money(offer.counter_cents)}
        </div>
      )}

      <div className="muted" style={{ fontSize:10, marginTop:4 }}>{timeAgo(offer.created_at)}</div>

      {isOwner && offer.status === "pending" && onRespond && (
        <div style={{ display:"flex", gap:6, marginTop:8 }}>
          <button onClick={() => onRespond(offer.id, "accept")} style={{
            flex:1, padding:"6px 0", borderRadius:8, fontSize:11, fontWeight:700,
            background:"var(--green, #2ecc71)", color:"#fff", border:"none", cursor:"pointer",
          }}>Accept</button>
          <button onClick={() => onRespond(offer.id, "decline")} style={{
            flex:1, padding:"6px 0", borderRadius:8, fontSize:11, fontWeight:700,
            background:"none", border:"1px solid var(--red, #e74c3c)", color:"var(--red, #e74c3c)", cursor:"pointer",
          }}>Decline</button>
          <button onClick={() => setShowCounter(!showCounter)} style={{
            flex:1, padding:"6px 0", borderRadius:8, fontSize:11, fontWeight:700,
            background:"none", border:"1px solid var(--violet, #a47aff)", color:"var(--violet, #a47aff)", cursor:"pointer",
          }}>Counter</button>
        </div>
      )}

      {showCounter && (
        <div style={{ display:"flex", gap:6, marginTop:6, alignItems:"center" }}>
          <span style={{ fontSize:14, fontWeight:800 }}>$</span>
          <input value={counterAmt} onChange={e => setCounterAmt(e.target.value)} type="number"
            placeholder="Amount" style={{
              flex:1, padding:"6px 10px", borderRadius:8,
              background:"var(--panel)", border:"1px solid var(--border)",
              color:"var(--text)", fontSize:12, fontFamily:"inherit",
            }} />
          <button onClick={() => {
            const cents = Math.round(parseFloat(counterAmt || "0") * 100);
            if (cents > 0) onRespond(offer.id, "counter", cents);
          }} style={{
            padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:700,
            background:"var(--violet, #a47aff)", color:"#fff", border:"none", cursor:"pointer",
          }}>Send</button>
        </div>
      )}
    </div>
  );
}
