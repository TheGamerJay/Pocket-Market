export default function Modal({ open, onClose, children }){
  if (!open) return null;
  return (
    <div style={{
      position:"fixed",
      inset:0,
      zIndex:50,
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      background:"rgba(0,0,0,.6)",
      backdropFilter:"blur(4px)"
    }} onClick={onClose}>
      <div className="panel" style={{
        padding:18,
        maxWidth:"min(520px, 92vw)",
        width:"100%"
      }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
