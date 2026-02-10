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

function RequireAuth({ authed, children }){
  const loc = useLocation();
  if (!authed) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

export default function App(){
  const [me, setMe] = useState({ loading:true, authed:false, user:null });
  const [toast, setToast] = useState("");

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

  const notify = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 2400);
  };

  const refreshMe = async () => {
    const res = await api.me();
    setMe({ loading:false, authed: !!res.authenticated, user: res.user || null });
  };

  return (
    <>
      <div className="container">
        <Routes>
          <Route path="/" element={<Home me={me} notify={notify} />} />
          <Route path="/search" element={<Search me={me} notify={notify} />} />
          <Route path="/post" element={
            <RequireAuth authed={me.authed}>
              <Post me={me} notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/listing/:id" element={<Listing me={me} notify={notify} />} />
          <Route path="/listing/:id/meetup" element={
            <RequireAuth authed={me.authed}>
              <SafeMeetup notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/messages" element={
            <RequireAuth authed={me.authed}>
              <Messages me={me} notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/chat/:id" element={
            <RequireAuth authed={me.authed}>
              <Chat me={me} notify={notify} />
            </RequireAuth>
          }/>
          <Route path="/profile" element={<Profile me={me} notify={notify} refreshMe={refreshMe} />} />
          <Route path="/observing" element={
            <RequireAuth authed={me.authed}>
              <Observing me={me} notify={notify} />
            </RequireAuth>
          }/>

          <Route path="/login" element={<Login notify={notify} refreshMe={refreshMe} />} />
          <Route path="/signup" element={<Signup notify={notify} refreshMe={refreshMe} />} />
          <Route path="/forgot" element={<Forgot notify={notify} />} />
          <Route path="/reset" element={<Reset notify={notify} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <BottomNav />
      <Toast text={toast} />
    </>
  );
}
