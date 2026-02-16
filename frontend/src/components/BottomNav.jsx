import { NavLink } from "react-router-dom";
import { IconHome, IconEye, IconPlus, IconChat, IconPerson } from "./Icons.jsx";

const ALL_ITEMS = [
  { to: "/",         icon: IconHome,   label: "Home" },
  { to: "/saved",    icon: IconEye,    label: "Saved" },
  { to: "/post",     icon: IconPlus,   label: "Post", isCenter: true, writeOnly: true },
  { to: "/messages", icon: IconChat,   label: "Chats", badge: "chats", writeOnly: true },
  { to: "/profile",  icon: IconPerson, label: "Profile" },
];

export default function BottomNav({ unreadChats = 0, isTestAccount = false }){
  const items = isTestAccount ? ALL_ITEMS.filter(i => !i.writeOnly) : ALL_ITEMS;

  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0,
      padding: "8px 10px 12px",
      background: "var(--nav-bg)",
      borderTop: "1px solid var(--border)",
      backdropFilter: "blur(10px)",
      zIndex: 10,
    }}>
      <div style={{
        maxWidth: "var(--max)", margin: "0 auto",
        display: "flex", alignItems: "flex-end", justifyContent: "space-around",
      }}>
        {items.map(({ to, icon: Icon, label, isCenter, badge }) => (
          <NavLink key={to} to={to} end={to === "/"} style={({ isActive }) => ({
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: isActive ? "var(--cyan)" : "var(--muted)",
            fontSize: 10, fontWeight: 700, textDecoration: "none",
            position: "relative",
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
              <div style={{ position:"relative", display:"flex" }}>
                <Icon size={22} />
                {badge === "chats" && unreadChats > 0 && (
                  <div style={{
                    position:"absolute", top:-4, right:-6,
                    minWidth:16, height:16, borderRadius:8,
                    background:"var(--danger)", color:"#fff",
                    fontSize:9, fontWeight:800,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    padding:"0 4px",
                  }}>
                    {unreadChats > 9 ? "9+" : unreadChats}
                  </div>
                )}
              </div>
            )}
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
