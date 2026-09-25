"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` on import, so load it in the browser only.
const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ width: "100%", aspectRatio: "16 / 10" }} />,
});

export type MapPoint = { id: string; name: string; lat: number; lng: number };

export function DealerMap(props: { dealerships: MapPoint[]; selectedId?: string; user?: { lat: number; lng: number } }) {
  return <MapView {...props} />;
}
