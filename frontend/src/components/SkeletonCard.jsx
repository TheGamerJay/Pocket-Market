export default function SkeletonCard(){
  return (
    <div className="panel" style={{ borderRadius:"var(--radius)", overflow:"hidden" }}>
      <div className="skeleton" style={{ width:"100%", height:120, borderRadius:0 }} />
      <div style={{ padding:"8px 10px" }}>
        <div className="skeleton" style={{ width:"75%", height:12, marginBottom:6 }} />
        <div className="skeleton" style={{ width:"40%", height:12 }} />
      </div>
    </div>
  );
}
