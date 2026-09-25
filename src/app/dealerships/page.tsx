import Link from "next/link";
import { api } from "@/lib/api";

// Default search point (São Paulo) until we ask the browser for a location.
const DEFAULT_POINT = { lat: -23.5505, lng: -46.6333 };

export default async function DealershipsPage({ searchParams }: PageProps<"/dealerships">) {
  const { id } = await searchParams;
  const dealerships = await api.dealerships(DEFAULT_POINT);
  const selected = dealerships.find((d) => d.id === id) ?? dealerships[0];

  return (
    <>
      <h1>Nearby dealerships</h1>
      <div className="split">
        <ul className="list card">
          {dealerships.map((d) => (
            <li key={d.id} className={d.id === selected?.id ? "selected" : undefined}>
              <Link href={`/dealerships?id=${d.id}`} className="grow">
                <strong>{d.name}</strong>
                <br />
                <span className="muted">
                  {d.address} · {d.phone}
                </span>
              </Link>
              <span>{d.distanceKm} km</span>
            </li>
          ))}
        </ul>
        {selected && (
          <iframe
            className="map card"
            title={`Map of ${selected.name}`}
            src={osmEmbedUrl(selected.lat, selected.lng)}
          />
        )}
      </div>
    </>
  );
}

function osmEmbedUrl(lat: number, lng: number) {
  const d = 0.01;
  const bbox = [lng - d, lat - d, lng + d, lat + d].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}
