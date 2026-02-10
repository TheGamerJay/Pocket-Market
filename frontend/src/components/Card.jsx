export default function Card({ children, style }){
  return (
    <div className="panel" style={{ padding:14, ...style }}>
      {children}
    </div>
  );
}
