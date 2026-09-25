import Link from "next/link";
import type { CSSProperties } from "react";
import { api, DEMO_VIN, type Notification } from "@/lib/api";
import {
  dateParts,
  healthScore,
  numberFmt,
  relativeTime,
  TIME_ZONE,
  toneLabel,
  toneOfScore,
  toneOfSeverity,
  toneOfStatus,
  zoneLabel,
  zoneOrder,
} from "@/lib/format";
import { ArrowIcon, ToneIcon } from "@/components/icons";
import { Page, PageHeader } from "@/components/page";
import { Sparkline } from "@/components/sparkline";
import { VehicleExplorer } from "@/components/vehicle/vehicle-explorer";
import { markNotificationRead } from "./actions";
import styles from "./dashboard.module.css";

const FEED_SIZE = 5;

export default async function DashboardPage() {
  const [notifications, telemetry, upcoming, dealerships] = await Promise.all([
    api.notifications(DEMO_VIN),
    api.telemetry(DEMO_VIN),
    api.appointments(DEMO_VIN, "upcoming"),
    api.dealerships(),
  ]);

  const score = healthScore(telemetry.components);
  const scoreTone = toneOfScore(score);
  const unread = notifications.filter((n) => !n.read);
  const critical = telemetry.components.filter((c) => c.status === "critical");
  const flagged = telemetry.components.filter((c) => c.status !== "good");
  const next = upcoming[0];
  const nextDealership = dealerships.find((d) => d.id === next?.dealershipId);
  const feed = [...notifications].sort((a, b) => Number(a.read) - Number(b.read) || b.createdAt.localeCompare(a.createdAt));
  const { battery } = telemetry;
  const months = battery.history.map((_, i, all) => {
    const ago = all.length - 1 - i;
    return ago === 0 ? "This month" : `${ago} month${ago > 1 ? "s" : ""} ago`;
  });

  return (
    <Page>
      <PageHeader eyebrow={`VIN ${telemetry.vin} · synced ${relativeTime(telemetry.updatedAt)}`} title={telemetry.model} />

      <dl className={styles.stats}>
        <div>
          <dt>Vehicle health</dt>
          <dd className={styles.hero}>
            {score}
            <small>/100</small>
          </dd>
          <p className={styles.note} data-tone={scoreTone}>
            <ToneIcon tone={scoreTone} size={14} /> {flagged.length} of {telemetry.components.length} systems need attention
          </p>
        </div>
        <div>
          <dt>Battery</dt>
          <dd>{battery.healthPercent}%</dd>
          <p className={styles.note}>About {battery.estimatedMonthsLeft} months left</p>
        </div>
        <div>
          <dt>Odometer</dt>
          <dd>{numberFmt.format(telemetry.mileageKm)}</dd>
          <p className={styles.note}>km</p>
        </div>
        <div>
          <dt>Next service</dt>
          <dd>{next ? `${dateParts(next.scheduledAt).day} ${dateParts(next.scheduledAt).month}` : "—"}</dd>
          <p className={styles.note}>
            {next ? (
              `${next.service}, ${nextDealership?.name ?? ""}`
            ) : (
              <Link href="/schedule" className="link">
                Book a service
              </Link>
            )}
          </p>
        </div>
      </dl>

      {critical.length > 0 && (
        <div className={styles.callout} data-tone="critical">
          <ToneIcon tone="critical" size={16} />
          <p>
            <strong>{critical.map((c) => c.name).join(" and ")}</strong> {critical.length > 1 ? "need" : "needs"} service.
          </p>
          <Link href={`/schedule?service=${encodeURIComponent(`${critical[0].name} service`)}`} className="btn btn-sm">
            Book a fix
          </Link>
        </div>
      )}

      <section className={styles.section}>
        <VehicleExplorer components={telemetry.components} />
      </section>

      <div className={styles.columns}>
        <section className={styles.section}>
          <h2 className="section-title">Systems</h2>
          {zoneOrder.map((zone) => {
            const items = telemetry.components.filter((c) => c.zone === zone);
            if (items.length === 0) return null;
            return (
              <div key={zone} className={styles.zone}>
                <h3>{zoneLabel[zone]}</h3>
                <ul>
                  {items.map((c) => {
                    const tone = toneOfStatus[c.status];
                    return (
                      <li key={c.name} data-tone={tone}>
                        <span className={styles.systemName}>
                          <ToneIcon tone={tone} size={14} className="tone-icon" />
                          {c.name}
                          {tone !== "good" && <em>{toneLabel[tone]}</em>}
                        </span>
                        <span className="bar" style={{ "--v": c.health } as CSSProperties}>
                          <i />
                        </span>
                        <span className={styles.value}>{c.health}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>

        <div>
          <section className={styles.section}>
            <h2 className="section-title">Battery health, last 12 months</h2>
            <Sparkline values={battery.history} labels={months} unit="%" height={72} />
            <p className={styles.note}>
              {battery.history[0]}% → {battery.healthPercent}% · replace around{" "}
              {monthYear(telemetry.updatedAt, battery.estimatedMonthsLeft)}
            </p>
          </section>

          <section className={styles.section}>
            <h2 className="section-title">
              Alerts <span className="muted">{unread.length} unread</span>
            </h2>
            <ol className={styles.alerts}>
              {feed.slice(0, FEED_SIZE).map((n) => (
                <Alert key={n.id} n={n} />
              ))}
            </ol>
            {feed.length > FEED_SIZE && (
              <details className={styles.more}>
                <summary>
                  {feed.length - FEED_SIZE} older <ArrowIcon size={12} />
                </summary>
                <ol className={styles.alerts}>
                  {feed.slice(FEED_SIZE).map((n) => (
                    <Alert key={n.id} n={n} />
                  ))}
                </ol>
              </details>
            )}
          </section>
        </div>
      </div>
    </Page>
  );
}

function monthYear(fromIso: string, addMonths: number) {
  const d = new Date(fromIso);
  d.setMonth(d.getMonth() + addMonths);
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: TIME_ZONE }).format(d);
}

function Alert({ n }: { n: Notification }) {
  const tone = toneOfSeverity[n.severity];
  return (
    <li className={styles.alert} data-tone={tone} data-read={n.read || undefined}>
      <ToneIcon tone={tone} size={14} className="tone-icon" />
      <div>
        <p className={styles.alertHead}>
          <strong>{n.title}</strong>
          <time dateTime={n.createdAt}>{relativeTime(n.createdAt)}</time>
        </p>
        <p className="muted">{n.message}</p>
        {!n.read && (
          <form action={markNotificationRead}>
            <input type="hidden" name="id" value={n.id} />
            <button type="submit" className="link">
              Mark as read
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
