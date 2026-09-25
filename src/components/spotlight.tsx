"use client";

import { useEffect } from "react";

/** Lets `.panel` elements light up under the cursor by exposing its position as CSS vars. */
export function Spotlight() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const panel = (e.target as Element | null)?.closest?.<HTMLElement>(".panel");
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      panel.style.setProperty("--my", `${e.clientY - rect.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}
