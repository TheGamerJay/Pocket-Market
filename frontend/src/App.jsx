import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import BottomNav from "./components/BottomNav.jsx";
import Toast from "./components/Toast.jsx";
import { api } from "./api.js";

import Home from "./pages/Home.jsx";
import Search from "./pages/Search.jsx";
import Post from "./pages/Post.jsx";
import Listing from "./pages/Listing.jsx";
import Messages from "./pages/Messages.jsx";
import Chat from "./pages/Chat.jsx";
import Profile from "./pages/Profile.jsx";
import Saved from "./pages/Saved.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Forgot from "./pages/Forgot.jsx";
import Reset from "./pages/Reset.jsx";
import SafeMeetup from "./pages/SafeMeetup.jsx";
import Notifications from "./pages/Notifications.jsx";
import Pro from "./pages/Pro.jsx";
import Support from "./pages/Support.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import ProhibitedItems from "./pages/ProhibitedItems.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import Refunds from "./pages/Refunds.jsx";
import Info from "./pages/Info.jsx";
import SellerProfile from "./pages/SellerProfile.jsx";
import Footer from "./components/Footer.jsx";
import AdFooter from "./components/AdFooter.jsx";
import CookieConsent from "./components/CookieConsent.jsx";
import Purchases from "./pages/Purchases.jsx";
import Onboarding from "./components/Onboarding.jsx";
import MeetupConfirm from "./pages/MeetupConfirm.jsx";
import Verify from "./pages/Verify.jsx";
import Admin from "./pages/Admin.jsx";
import NotFound from "./pages/NotFound.jsx";

// Apply stored theme on load
(function(){
  const t = localStorage.getItem("pm_theme");
  if (t) document.documentElement.setAttribute("data-theme", t);
})();

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function registerPush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return;
    const res = await api.getVapidKey();
    const key = res.public_key;
    if (!key) return;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
    const subJson = sub.toJSON();
    await api.subscribePush({
      endpoint: subJson.endpoint,
      keys: { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth },
    });
  } catch {}
}

function RequireAuth({ authed, loading, children }){
  const loc = useLocation();
  if (loading) return null;
  if (!authed) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

export default function App(){
  const [me, setMe] = useState({ loading:true, authed:false, user:null });
  const [toast, setToast] = useState("");
  const [unreadChats, setUnreadChats] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.me();
        setMe({ loading:false, authed: !!res.authenticated, user: res.user || null });
      } catch {
        setMe({ loading:false, authed:false, user:null });
      }
    })();
  }, []);

  // Register push notifications after auth
  useEffect(() => {
    if (!me.authed) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((p) => { if (p === "granted") registerPush(); });
    } else if ("Notification" in window && Notification.permission === "granted") {
      registerPush();
    }
  }, [me.authed]);

  useEffect(() => {
    if (!me.authed) return;
    const check = async () => {
      try {
        const [convRes, notifRes] = await Promise.all([
          api.conversations(),
          api.unreadNotifCount(),
        ]);
        setUnreadChats((convRes.conversations || []).filter(c => c.unread_count > 0).length);
        setUnreadNotifs(notifRes.count || 0);
      } catch {}
    };
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [me.authed]);

  const notify = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 2400);
  };

  const refreshMe = async () => {
    const res = await api.me();
    setMe({ loading:false, authed: !!res.authenticated, user: res.user || null });
  };

  const loc = useLocation();

  // Google Analytics page view tracking
  useEffect(() => {
    if (window.gtag) window.gtag("event", "page_view", { page_path: loc.pathname });
  }, [loc.pathname]);

  const authPages = ["/login", "/signup", "/forgot", "/reset", "/verify"];
  const publicPages = ["/about", "/privacy", "/terms", "/contact", "/prohibited-items", "/how-it-works", "/refunds", "/info"];
  const hideNav = authPages.includes(loc.pathname) || publicPages.includes(loc.pathname) || loc.pathname === "/admin" || !me.authed;
  const showFooter = !authPages.includes(loc.pathname);

  return (
    <>
      <div className="container" style={me?.user?.is_test_account ? { paddingTop: 36 } : undefined}>
        <Routes>
          <Route path="/" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Home me={me} notify={notify} unreadNotifs={unreadNotifs} />
            </RequireAuth>
          }/>
          <Route path="/search" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Search me={me} notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/post" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              {me?.user?.is_test_account ? <Navigate to="/" replace /> : <Post me={me} notify={notify} />}
            </RequireAuth>
          }/>
          <Route path="/listing/:id" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Listing me={me} notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/listing/:id/meetup" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <SafeMeetup notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/messages" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              {me?.user?.is_test_account ? <Navigate to="/" replace /> : <Messages me={me} notify={notify} />}
            </RequireAuth>
          }/>
          <Route path="/chat/:id" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              {me?.user?.is_test_account ? <Navigate to="/" replace /> : <Chat me={me} notify={notify} />}
            </RequireAuth>
          }/>
          <Route path="/profile" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Profile me={me} notify={notify} refreshMe={refreshMe} />
            </RequireAuth>
          }/>
          <Route path="/saved" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Saved notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/notifications" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Notifications notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/pro" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Pro me={me} notify={notify} refreshMe={refreshMe} />
            </RequireAuth>
          }/>
          <Route path="/support" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Support me={me} notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/seller/:id" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <SellerProfile me={me} notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/purchases" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Purchases notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/meetup/:token" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <MeetupConfirm notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact notify={notify} />} />
          <Route path="/prohibited-items" element={<ProhibitedItems />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/info" element={<Info />} />
          <Route path="/admin" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Admin me={me} />
            </RequireAuth>
          }/>
          <Route path="/verify" element={<Verify notify={notify} />} />

          <Route path="/login" element={<Login notify={notify} refreshMe={refreshMe} />} />
          <Route path="/signup" element={<Signup notify={notify} />} />
          <Route path="/forgot" element={<Forgot notify={notify} />} />
          <Route path="/reset" element={<Reset notify={notify} />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        {showFooter && !publicPages.includes(loc.pathname) && <AdFooter isPro={me?.user?.is_pro} />}
        {showFooter && <Footer />}
      </div>

      {me?.user?.is_test_account && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          background: "linear-gradient(135deg, var(--cyan), var(--violet))",
          color: "#fff", textAlign: "center",
          padding: "6px 12px", fontSize: 12, fontWeight: 700,
          letterSpacing: 0.3,
        }}>
          Stripe Review Account &mdash; Read-Only Access
        </div>
      )}
      {!hideNav && <BottomNav unreadChats={unreadChats} isTestAccount={me?.user?.is_test_account} />}
      <Toast text={toast} />
      <CookieConsent />
      {me.authed && me.user && !me.user.onboarding_done && (
        <Onboarding me={me} refreshMe={refreshMe} notify={notify} />
      )}
    </>
  );
}
