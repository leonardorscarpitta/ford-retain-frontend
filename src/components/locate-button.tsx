"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { PinIcon } from "./icons";

/** Asks the browser for the user's position and re-sorts dealerships around it. */
export function LocateButton({ active }: { active: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [error, setError] = useState<string>();
  const [locating, setLocating] = useState(false);
  const [pending, startTransition] = useTransition();

  const locate = () => {
    if (!("geolocation" in navigator)) return setError("Location isn't available in this browser.");
    setLocating(true);
    setError(undefined);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const q = new URLSearchParams(params);
        q.set("lat", coords.latitude.toFixed(4));
        q.set("lng", coords.longitude.toFixed(4));
        q.delete("id");
        startTransition(() => router.replace(`${pathname}?${q}`, { scroll: false }));
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Showing dealerships near São Paulo.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const busy = locating || pending;
  return (
    <span className="locate">
      <button type="button" className={active ? "btn btn-sm" : "btn btn-ghost btn-sm"} onClick={locate} disabled={busy}>
        <PinIcon size={14} /> {busy ? "Locating…" : active ? "Near you" : "Use my location"}
      </button>
      {error && <small role="status">{error}</small>}
    </span>
  );
}
