import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

const TABS = ["Dashboard", "Users", "Listings", "Reports", "Reviews", "Ads"];

/* ── tiny helpers ── */
const Pill = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
    border: "none", cursor: "pointer", whiteSpace: "nowrap",
    background: active ? "linear-gradient(135deg, var(--cyan), var(--violet))" : "var(--bg2)",
    color: active ? "#fff" : "var(--muted)",
  }}>{label}</button>
);

const Pager = ({ page, pages, onPage }) => {
  if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}
        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>Prev</button>
      <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>{page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}
        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", cursor: page >= pages ? "default" : "pointer", opacity: page >= pages ? 0.4 : 1 }}>Next</button>
    </div>
  );
};

const SmBtn = ({ label, color = "var(--cyan)", onClick, danger }) => (
  <button onClick={onClick} style={{
    padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
    border: "none", cursor: "pointer",
    background: danger ? "rgba(255,60,60,.15)" : `${color}22`,
    color: danger ? "#ff4444" : color,
  }}>{label}</button>
);

/* ═══════════════════ Dashboard Tab ═══════════════════ */
function DashboardTab() {
  const [data, setData] = useState(null);
  useEffect(() => { api.adminDashboard().then(setData).catch(() => {}); }, []);
  if (!data) return <div className="muted" style={{ textAlign: "center", padding: 40 }}>Loading...</div>;

  const stats = [
    { label: "Users", value: data.total_users },
    { label: "Active Listings", value: data.total_listings },
    { label: "Open Reports", value: data.open_reports },
    { label: "Signups (7d)", value: data.signups_7d },
    { label: "Items Sold", value: data.sold_count },
    { label: "Reviews", value: data.review_count },
  ];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{s.value}</div>
            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>
      <div style={{ height: 12 }} />
      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Recent Signups</div>
        {data.recent_signups.map(u => (
          <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{u.display_name || "—"}</div>
              <div className="muted" style={{ fontSize: 11 }}>{u.email}</div>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {u.is_pro && <span style={{ fontSize: 10, background: "rgba(62,224,255,.15)", color: "var(--cyan)", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>PRO</span>}
              {u.is_banned && <span style={{ fontSize: 10, background: "rgba(255,60,60,.15)", color: "#ff4444", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>BANNED</span>}
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}

/* ═══════════════════ Users Tab ═══════════════════ */
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = useCallback((p = 1, search = q) => {
    api.adminUsers({ q: search, page: p }).then(d => {
      setUsers(d.users); setPage(d.page); setPages(d.pages);
    }).catch(() => {});
  }, [q]);

  useEffect(() => { load(1); }, []);

  const action = async (fn, id) => { await fn(id); load(page); };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load(1)}
          placeholder="Search by email or name..."
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 13 }} />
        <button onClick={() => load(1)} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "var(--cyan)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Search</button>
      </div>
      {users.map(u => (
        <Card key={u.id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{u.display_name || "—"}</div>
              <div className="muted" style={{ fontSize: 11 }}>{u.email}</div>
              <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {u.is_pro && <span style={{ fontSize: 9, background: "rgba(62,224,255,.15)", color: "var(--cyan)", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>PRO</span>}
                {u.is_verified && <span style={{ fontSize: 9, background: "rgba(80,220,100,.15)", color: "#50dc64", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>VERIFIED</span>}
                {u.is_banned && <span style={{ fontSize: 9, background: "rgba(255,60,60,.15)", color: "#ff4444", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>BANNED</span>}
                {u.is_admin && <span style={{ fontSize: 9, background: "rgba(164,122,255,.15)", color: "var(--violet)", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>ADMIN</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <SmBtn label={u.is_banned ? "Unban" : "Ban"} danger={!u.is_banned} color="var(--cyan)" onClick={() => action(api.adminBanUser, u.id)} />
              <SmBtn label={u.is_pro ? "Remove Pro" : "Give Pro"} onClick={() => action(api.adminTogglePro, u.id)} />
              <SmBtn label={u.is_verified ? "Unverify" : "Verify"} color="var(--violet)" onClick={() => action(api.adminToggleVerified, u.id)} />
            </div>
          </div>
        </Card>
      ))}
      <Pager page={page} pages={pages} onPage={p => load(p)} />
    </>
  );
}

/* ═══════════════════ Listings Tab ═══════════════════ */
function ListingsTab() {
  const [listings, setListings] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = useCallback((p = 1, search = q) => {
    api.adminListings({ q: search, page: p }).then(d => {
      setListings(d.listings); setPage(d.page); setPages(d.pages);
    }).catch(() => {});
  }, [q]);

  useEffect(() => { load(1); }, []);

  const remove = async (id) => {
    if (!confirm("Delete this listing permanently?")) return;
    await api.adminDeleteListing(id);
    load(page);
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load(1)}
          placeholder="Search by title..."
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 13 }} />
        <button onClick={() => load(1)} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "var(--cyan)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Search</button>
      </div>
      {listings.map(l => (
        <Card key={l.id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {l.image_url && <img src={`${api.base}${l.image_url}`} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.title}</div>
              <div className="muted" style={{ fontSize: 11 }}>
                ${(l.price_cents / 100).toFixed(2)} &middot; {l.category} &middot; {l.seller_email}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                {l.is_sold && <span style={{ fontSize: 9, background: "rgba(255,60,60,.15)", color: "#ff4444", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>SOLD</span>}
                {l.is_draft && <span style={{ fontSize: 9, background: "rgba(255,200,60,.15)", color: "#e8b230", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>DRAFT</span>}
                {l.is_demo && <span style={{ fontSize: 9, background: "rgba(164,122,255,.15)", color: "var(--violet)", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>DEMO</span>}
              </div>
            </div>
            <SmBtn label="Remove" danger onClick={() => remove(l.id)} />
          </div>
        </Card>
      ))}
      <Pager page={page} pages={pages} onPage={p => load(p)} />
    </>
  );
}

/* ═══════════════════ Reports Tab ═══════════════════ */
function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [resolving, setResolving] = useState(null);
  const [notes, setNotes] = useState("");
  const [resolveStatus, setResolveStatus] = useState("resolved");

  const load = useCallback((p = 1, status = statusFilter) => {
    const params = { page: p };
    if (status) params.status = status;
    api.adminReports(params).then(d => {
      setReports(d.reports); setPage(d.page); setPages(d.pages);
    }).catch(() => {});
  }, [statusFilter]);

  useEffect(() => { load(1); }, []);

  const resolve = async () => {
    await api.adminResolveReport(resolving, { status: resolveStatus, admin_notes: notes });
    setResolving(null); setNotes(""); setResolveStatus("resolved");
    load(page);
  };

  const filterChange = (s) => { setStatusFilter(s); load(1, s); };

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
        {["", "open", "reviewed", "resolved"].map(s => (
          <Pill key={s} label={s || "All"} active={statusFilter === s} onClick={() => filterChange(s)} />
        ))}
      </div>
      {reports.map(r => (
        <Card key={r.id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                <span style={{
                  display: "inline-block", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, marginRight: 6,
                  background: r.status === "open" ? "rgba(255,60,60,.15)" : r.status === "reviewed" ? "rgba(255,200,60,.15)" : "rgba(80,220,100,.15)",
                  color: r.status === "open" ? "#ff4444" : r.status === "reviewed" ? "#e8b230" : "#50dc64",
                }}>{r.status.toUpperCase()}</span>
                {r.reporter_email} reported {r.reported_email || "a listing"}
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>{r.reason}</div>
              {r.admin_notes && <div style={{ fontSize: 11, marginTop: 4, color: "var(--cyan)" }}>Admin: {r.admin_notes}</div>}
              <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>{new Date(r.created_at).toLocaleDateString()}</div>
            </div>
            {r.status !== "resolved" && (
              <SmBtn label="Resolve" onClick={() => { setResolving(r.id); setNotes(""); setResolveStatus("resolved"); }} />
            )}
          </div>
        </Card>
      ))}
      <Pager page={page} pages={pages} onPage={p => load(p)} />

      {/* Resolve modal */}
      {resolving && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setResolving(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg)", borderRadius: 16, padding: 20, width: "100%", maxWidth: 360 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Resolve Report</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <Pill label="Resolved" active={resolveStatus === "resolved"} onClick={() => setResolveStatus("resolved")} />
              <Pill label="Reviewed" active={resolveStatus === "reviewed"} onClick={() => setResolveStatus("reviewed")} />
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Admin notes (optional)..."
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, minHeight: 80, resize: "vertical", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setResolving(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={resolve} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg, var(--cyan), var(--violet))", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════ Reviews Tab ═══════════════════ */
function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = useCallback((p = 1) => {
    api.adminReviews({ page: p }).then(d => {
      setReviews(d.reviews); setPage(d.page); setPages(d.pages);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(1); }, []);

  const remove = async (id) => {
    if (!confirm("Delete this review? Seller rating will be recalculated.")) return;
    await api.adminDeleteReview(id);
    load(page);
  };

  return (
    <>
      {reviews.map(rv => (
        <Card key={rv.id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: rv.is_positive ? "#50dc64" : "#ff4444",
                }} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{rv.is_positive ? "Positive" : "Negative"}</span>
              </div>
              {rv.comment && <div className="muted" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{rv.comment}</div>}
              <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
                By {rv.reviewer_email} &rarr; {rv.seller_email} &middot; {new Date(rv.created_at).toLocaleDateString()}
              </div>
            </div>
            <SmBtn label="Delete" danger onClick={() => remove(rv.id)} />
          </div>
        </Card>
      ))}
      <Pager page={page} pages={pages} onPage={p => load(p)} />
    </>
  );
}

/* ═══════════════════ Ads Tab ═══════════════════ */
function AdsTab() {
  const [ads, setAds] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | ad object
  const [form, setForm] = useState({ title: "", image_url: "", link_url: "", active: true });

  const load = () => { api.adminAds().then(d => setAds(d.ads)).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ title: "", image_url: "", link_url: "", active: true }); setEditing("new"); };
  const openEdit = (ad) => { setForm({ title: ad.title, image_url: ad.image_url || "", link_url: ad.link_url || "", active: ad.active }); setEditing(ad); };

  const save = async () => {
    if (editing === "new") {
      await api.adminCreateAd(form);
    } else {
      await api.adminUpdateAd(editing.id, form);
    }
    setEditing(null); load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this ad?")) return;
    await api.adminDeleteAd(id);
    load();
  };

  const toggleActive = async (ad) => {
    await api.adminUpdateAd(ad.id, { active: !ad.active });
    load();
  };

  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <button onClick={openNew} style={{
          padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, var(--cyan), var(--violet))", color: "#fff", fontWeight: 700, fontSize: 13,
        }}>+ New Ad</button>
      </div>
      {ads.map(ad => (
        <Card key={ad.id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{ad.title}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{ad.link_url || "No link"}</div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <SmBtn label={ad.active ? "Active" : "Inactive"} color={ad.active ? "#50dc64" : "var(--muted)"} onClick={() => toggleActive(ad)} />
              <SmBtn label="Edit" onClick={() => openEdit(ad)} />
              <SmBtn label="Delete" danger onClick={() => remove(ad.id)} />
            </div>
          </div>
        </Card>
      ))}

      {/* Create/Edit modal */}
      {editing !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setEditing(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg)", borderRadius: 16, padding: 20, width: "100%", maxWidth: 360 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{editing === "new" ? "Create Ad" : "Edit Ad"}</div>
            {[
              { key: "title", label: "Title", type: "text" },
              { key: "image_url", label: "Image URL", type: "text" },
              { key: "link_url", label: "Link URL", type: "text" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} />
              </div>
            ))}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
              Active
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setEditing(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={save} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg, var(--cyan), var(--violet))", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════ Main Admin Page ═══════════════════ */
export default function Admin({ me }) {
  const nav = useNavigate();
  const [tab, setTab] = useState("Dashboard");

  if (!me?.user?.is_admin) {
    return (
      <>
        <TopBar title="Admin" onBack={() => nav("/")} />
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)", fontSize: 14 }}>
          You don't have access to this page.
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Admin Panel" onBack={() => nav("/")} />
      <div style={{ height: 8 }} />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, marginBottom: 10 }}>
        {TABS.map(t => <Pill key={t} label={t} active={tab === t} onClick={() => setTab(t)} />)}
      </div>
      {tab === "Dashboard" && <DashboardTab />}
      {tab === "Users" && <UsersTab />}
      {tab === "Listings" && <ListingsTab />}
      {tab === "Reports" && <ReportsTab />}
      {tab === "Reviews" && <ReviewsTab />}
      {tab === "Ads" && <AdsTab />}
      <div style={{ height: 20 }} />
    </>
  );
}
