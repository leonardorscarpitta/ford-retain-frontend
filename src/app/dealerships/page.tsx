import Link from "next/link";
import { api, type Dealership } from "@/lib/api";
import { DealerMap } from "@/components/dealer-map/dealer-map";
import { LocateButton } from "@/components/locate-button";
import { Page, PageHeader } from "@/components/page";
import styles from "./dealerships.module.css";

// Default search point (São Paulo) until we ask the browser for a location.
const DEFAULT_POINT = { lat: -23.5505, lng: -46.6333 };

function parsePoint(lat: unknown, lng: unknown) {
  const la = Number(lat);
  const ln = Number(lng);
  if (typeof lat !== "string" || typeof lng !== "string" || !Number.isFinite(la) || !Number.isFinite(ln)) return undefined;
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return undefined;
  return { lat: la, lng: ln };
}

export default async function DealershipsPage({ searchParams }: PageProps<"/dealerships">) {
  const { id, service, lat, lng } = await searchParams;
  const userPoint = parsePoint(lat, lng);
  const all = await api.dealerships(userPoint ?? DEFAULT_POINT);
  const services = [...new Set(all.flatMap((d) => d.services))].sort();
  const filter = typeof service === "string" && services.includes(service) ? service : undefined;
  const dealerships = filter ? all.filter((d) => d.services.includes(filter)) : all;
  const selected = dealerships.find((d) => d.id === id) ?? dealerships[0];

  const href = (params: { id?: string; service?: string }) => {
    const q = new URLSearchParams();
    if (params.service) q.set("service", params.service);
    if (params.id) q.set("id", params.id);
    if (userPoint) {
      q.set("lat", String(userPoint.lat));
      q.set("lng", String(userPoint.lng));
    }
    const s = q.toString();
    return `/dealerships${s ? `?${s}` : ""}`;
  };

  return (
    <Page>
      <PageHeader eyebrow={`${all.length} locations`} title="Dealerships">
        <span>Sorted by distance from {userPoint ? "your location" : "central São Paulo"}</span>
        <LocateButton active={Boolean(userPoint)} />
      </PageHeader>

      <nav className={styles.filters} aria-label="Filter by service">
        <Link href={href({})} scroll={false} className="chip chip-button" aria-current={!filter ? "true" : undefined}>
          All
        </Link>
        {services.map((s) => (
          <Link key={s} href={href({ service: s })} scroll={false} className="chip chip-button" aria-current={filter === s ? "true" : undefined}>
            {s}
          </Link>
        ))}
      </nav>

      <div className={styles.layout}>
        <ol className={styles.list}>
          {dealerships.map((d) => (
            <li key={d.id}>
              <Link
                href={href({ id: d.id, service: filter })}
                scroll={false}
                className={styles.row}
                aria-current={d.id === selected?.id ? "true" : undefined}
              >
                <span className={styles.rowHead}>
                  <strong>{d.name}</strong>
                  <span className="muted">{d.distanceKm} km</span>
                </span>
                <span className="muted">{d.address}</span>
              </Link>
            </li>
          ))}
        </ol>

        {selected && (
          <aside className={styles.details}>
            <DealerMap
              dealerships={dealerships.map(({ id, name, lat, lng }) => ({ id, name, lat, lng }))}
              selectedId={selected.id}
              user={userPoint}
            />
            <Details d={selected} />
          </aside>
        )}
      </div>
    </Page>
  );
}

function Details({ d }: { d: Dealership }) {
  return (
    <div className={styles.info}>
      <h2>{d.name}</h2>
      <p className="muted">{d.address}</p>
      <dl>
        <dt>Distance</dt>
        <dd>{d.distanceKm} km</dd>
        <dt>Rating</dt>
        <dd>{d.rating.toFixed(1)} / 5</dd>
        <dt>Hours</dt>
        <dd>{d.hours}</dd>
        <dt>Phone</dt>
        <dd>{d.phone}</dd>
        <dt>Services</dt>
        <dd>{d.services.join(", ")}</dd>
      </dl>
      <div className={styles.actions}>
        <Link href={`/schedule?dealership=${d.id}`} className="btn">
          Book here
        </Link>
        <a href={`https://www.openstreetmap.org/directions?route=%3B${d.lat}%2C${d.lng}`} target="_blank" rel="noreferrer" className="btn btn-ghost">
          Directions
        </a>
      </div>
    </div>
  );
}
