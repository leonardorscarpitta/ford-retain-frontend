import type { CSSProperties } from "react";
import Link from "next/link";
import { api, type Dealership } from "@/lib/api";
import { ArrowIcon, CalendarIcon, ClockIcon, PinIcon, StarIcon } from "@/components/icons";
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
  const avgRating = all.reduce((s, d) => s + d.rating, 0) / all.length;

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
      <PageHeader eyebrow="Network" title="Find a Ford dealership">
        <span>
          <b className={styles.stat}>{all.length}</b> locations
        </span>
        <span>
          <b className={styles.stat}>{all[0]?.distanceKm} km</b> to the nearest {userPoint ? "(from you)" : "(from central São Paulo)"}
        </span>
        <span>
          <b className={styles.stat}>★ {avgRating.toFixed(1)}</b> average rating
        </span>
        <LocateButton active={Boolean(userPoint)} />
      </PageHeader>

      <nav className={`rise ${styles.filters}`} aria-label="Filter by service">
        <Link href={href({})} scroll={false} className={styles.filter} aria-current={!filter ? "true" : undefined}>
          All services
        </Link>
        {services.map((s) => (
          <Link key={s} href={href({ service: s })} scroll={false} className={styles.filter} aria-current={filter === s ? "true" : undefined}>
            {s}
          </Link>
        ))}
      </nav>

      <div className={styles.layout}>
        <ol className={styles.list}>
          {dealerships.map((d, i) => (
            <li key={d.id} className="rise" style={{ "--i": Math.min(i, 10) } as CSSProperties}>
              <Link
                href={href({ id: d.id, service: filter })}
                scroll={false}
                className={`panel ${styles.card}`}
                aria-current={d.id === selected?.id ? "true" : undefined}
              >
                <span className={styles.rank}>{String(i + 1).padStart(2, "0")}</span>
                <div className={styles.cardBody}>
                  <div className={styles.cardHead}>
                    <strong>{d.name}</strong>
                    <span className={styles.distance}>{d.distanceKm} km</span>
                  </div>
                  <span className="muted">{d.address}</span>
                  <div className={styles.meta}>
                    <Rating value={d.rating} />
                    <span className="muted">
                      <ClockIcon size={12} /> {d.hours}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>

        {selected && <MapPanel d={selected} />}
      </div>
    </Page>
  );
}

function MapPanel({ d }: { d: Dealership }) {
  return (
    <aside className={`panel rise ${styles.mapPanel}`} style={{ "--i": 2 } as CSSProperties}>
      <div className={styles.mapFrame}>
        <iframe key={d.id} className={styles.map} title={`Map of ${d.name}`} src={osmEmbedUrl(d.lat, d.lng)} loading="lazy" />
        <span className={styles.corners} aria-hidden />
        <span className={styles.coords}>
          {d.lat.toFixed(4)}, {d.lng.toFixed(4)}
        </span>
      </div>
      <div className={styles.details}>
        <div className={styles.detailsHead}>
          <div>
            <p className="eyebrow">Selected · {d.distanceKm} km away</p>
            <h2>{d.name}</h2>
          </div>
          <Rating value={d.rating} />
        </div>
        <p className="muted">
          <PinIcon size={14} /> {d.address}
        </p>
        <p className="muted">
          <ClockIcon size={14} /> {d.hours} · <span className="mono">{d.phone}</span>
        </p>
        <div className={styles.services}>
          {d.services.map((s) => (
            <span key={s} className="chip" data-tone="info">
              {s}
            </span>
          ))}
        </div>
        <div className={styles.actions}>
          <Link href={`/schedule?dealership=${d.id}`} className="btn">
            <CalendarIcon size={16} /> Book here
          </Link>
          <a
            href={`https://www.openstreetmap.org/directions?route=%3B${d.lat}%2C${d.lng}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
          >
            Directions <ArrowIcon size={16} />
          </a>
        </div>
      </div>
    </aside>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className={styles.rating} aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <StarIcon size={13} /> {value.toFixed(1)}
    </span>
  );
}

function osmEmbedUrl(lat: number, lng: number) {
  const d = 0.012;
  const bbox = [lng - d, lat - d, lng + d, lat + d].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}
