export default function Card({ children, style, noPadding }){
  return (
    <div className="panel" style={{ padding: noPadding ? 0 : 14, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}
