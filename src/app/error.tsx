"use client";

import { useEffect } from "react";
import { CriticalIcon } from "@/components/icons";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="panel rise" data-tone="critical" style={{ maxWidth: 560, margin: "10vh auto", textAlign: "center", display: "grid", gap: 14, justifyItems: "center" }}>
      <CriticalIcon size={40} style={{ color: "var(--critical)", filter: "drop-shadow(0 0 12px var(--critical))" }} />
      <p className="eyebrow">Signal lost</p>
      <h1 style={{ fontSize: "1.8rem", letterSpacing: "-0.03em" }}>We can&apos;t reach your vehicle data</h1>
      <p className="muted">The Ford Retain API didn&apos;t respond. Check that the back-end is running, then try again.</p>
      <button className="btn" onClick={() => retry()}>
        Reconnect
      </button>
    </div>
  );
}
