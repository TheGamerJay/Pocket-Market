import { NavLink } from "react-router-dom";
import { IconHome, IconSearch, IconCamera, IconChat, IconPerson } from "./Icons.jsx";

const items = [
  { to: "/",         icon: IconHome,   label: "Home" },
  { to: "/search",   icon: IconSearch, label: "Search" },
  { to: "/post",     icon: IconCamera, label: "Post", isCenter: true },
  { to: "/messages", icon: IconChat,   label: "Chats" },
  { to: "/profile",  icon: IconPerson, label: "Profile" },
];

export default function BottomNav(){
  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0,
      padding: "8px 10px 12px",
      background: "rgba(14,18,26,.97)",
      borderTop: "1px solid var(--border)",
      backdropFilter: "blur(10px)",
      zIndex: 10,
    }}>
      <div style={{
        maxWidth: "var(--max)", margin: "0 auto",
        display: "flex", alignItems: "flex-end", justifyContent: "space-around",
      }}>
        {items.map(({ to, icon: Icon, label, isCenter }) => (
          <NavLink key={to} to={to} end={to === "/"} style={({ isActive }) => ({
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: isActive ? "var(--cyan)" : "var(--muted)",
            fontSize: 10, fontWeight: 700, textDecoration: "none",
            ...(isCenter ? { marginTop: -14 } : {}),
          })}>
            {isCenter ? (
              <div style={{
                width: 50, height: 50, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--cyan), var(--violet))",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 18px rgba(62,224,255,.40)",
              }}>
                <Icon size={24} color="#fff" />
              </div>
            ) : (
              <Icon size={22} />
            )}
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
