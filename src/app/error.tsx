"use client";

import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ maxWidth: 480, margin: "12vh auto", display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 600 }}>We can&apos;t reach your vehicle data</h1>
      <p className="muted">The Ford Retain API didn&apos;t respond. Check that the back-end is running, then try again.</p>
      <div>
        <button className="btn" onClick={() => retry()}>
          Try again
        </button>
      </div>
    </div>
  );
}
