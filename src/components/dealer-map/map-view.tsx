"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { MapPoint } from "./dealer-map";
import styles from "./map.module.css";

// Plain CSS dots (styled in globals.css): no marker images to bundle.
const pin = (active: boolean) =>
  L.divIcon({ className: "", html: `<span class="map-pin${active ? " map-pin-active" : ""}"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] });
const youIcon = L.divIcon({ className: "", html: '<span class="map-you"></span>', iconSize: [16, 16], iconAnchor: [8, 8] });

const ZOOM = 12;

export default function MapView({
  dealerships,
  selectedId,
  user,
}: {
  dealerships: MapPoint[];
  selectedId?: string;
  user?: { lat: number; lng: number };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = dealerships.find((d) => d.id === selectedId) ?? dealerships[0];
  const center: [number, number] = selected ? [selected.lat, selected.lng] : [-23.55, -46.63];

  const select = (id: string) => {
    const q = new URLSearchParams(params);
    q.set("id", id);
    router.replace(`${pathname}?${q}`, { scroll: false });
  };

  return (
    <MapContainer center={center} zoom={ZOOM} className={styles.map} scrollWheelZoom={false}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {dealerships.map((d) => (
        <Marker
          key={d.id}
          position={[d.lat, d.lng]}
          icon={pin(d.id === selected?.id)}
          zIndexOffset={d.id === selected?.id ? 1000 : 0}
          eventHandlers={{ click: () => select(d.id) }}
          title={d.name}
          alt={d.name}
          keyboard
        >
          <Tooltip direction="top" offset={[0, -8]}>
            {d.name}
          </Tooltip>
        </Marker>
      ))}
      {user && (
        <Marker position={[user.lat, user.lng]} icon={youIcon} keyboard={false}>
          <Tooltip direction="top" offset={[0, -8]}>
            You
          </Tooltip>
        </Marker>
      )}
      {selected && <FlyTo lat={selected.lat} lng={selected.lng} />}
    </MapContainer>
  );
}

/** Glides to the selected dealership whenever the selection changes. */
function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), ZOOM), { duration: 0.6 });
  }, [map, lat, lng]);
  return null;
}
