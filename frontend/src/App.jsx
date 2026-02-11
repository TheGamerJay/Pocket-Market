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
import Observing from "./pages/Observing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Forgot from "./pages/Forgot.jsx";
import Reset from "./pages/Reset.jsx";
import SafeMeetup from "./pages/SafeMeetup.jsx";
import Notifications from "./pages/Notifications.jsx";
import Pro from "./pages/Pro.jsx";

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
  const authPages = ["/login", "/signup", "/forgot", "/reset"];
  const hideNav = authPages.includes(loc.pathname);

  return (
    <>
      <div className="container">
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
              <Post me={me} notify={notify} />
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
              <Messages me={me} notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/chat/:id" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Chat me={me} notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/profile" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Profile me={me} notify={notify} refreshMe={refreshMe} />
            </RequireAuth>
          }/>
          <Route path="/observing" element={
            <RequireAuth authed={me.authed} loading={me.loading}>
              <Observing me={me} notify={notify} />
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

          <Route path="/login" element={<Login notify={notify} refreshMe={refreshMe} />} />
          <Route path="/signup" element={<Signup notify={notify} />} />
          <Route path="/forgot" element={<Forgot notify={notify} />} />
          <Route path="/reset" element={<Reset notify={notify} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {!hideNav && <BottomNav unreadChats={unreadChats} />}
      <Toast text={toast} />
    </>
  );
}
