/** Skeleton shown while a page's data streams in. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 14, width: 180, marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 52, width: "min(520px, 80%)", marginBottom: 32 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton" style={{ height: i < 2 ? 320 : 160, animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
    </div>
  );
}
