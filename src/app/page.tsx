import type { CSSProperties } from "react";
import Link from "next/link";
import { api, DEMO_VIN } from "@/lib/api";
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
import { CountUp } from "@/components/count-up";
import { ArrowIcon, BellIcon, BoltIcon, CalendarIcon, GaugeIcon, ToneIcon, WrenchIcon } from "@/components/icons";
import { Page, PageHeader } from "@/components/page";
import { RingGauge } from "@/components/ring-gauge";
import { VehicleExplorer } from "@/components/vehicle/vehicle-explorer";
import { Sparkline } from "@/components/sparkline";
import { markNotificationRead } from "./actions";
import styles from "./dashboard.module.css";

const FEED_SIZE = 6;

export default async function DashboardPage() {
  const [notifications, telemetry, upcoming, dealerships] = await Promise.all([
    api.notifications(DEMO_VIN),
    api.telemetry(DEMO_VIN),
    api.appointments(DEMO_VIN, "upcoming"),
    api.dealerships(),
  ]);

  const score = healthScore(telemetry.components);
  const scoreTone = toneOfScore(score);
  const batteryTone = toneOfScore(telemetry.battery.healthPercent);
  const unread = notifications.filter((n) => !n.read);
  const critical = telemetry.components.filter((c) => c.status === "critical");
  const flagged = telemetry.components.filter((c) => c.status !== "good");
  const next = upcoming[0];
  const nextDealership = dealerships.find((d) => d.id === next?.dealershipId);
  const feed = [...notifications].sort((a, b) => Number(a.read) - Number(b.read) || b.createdAt.localeCompare(a.createdAt));
  const history = telemetry.battery.history;
  const monthlyLoss = history.length > 1 ? (history[0] - history[history.length - 1]) / (history.length - 1) : 0;
  const replaceBy = monthYear(telemetry.updatedAt, telemetry.battery.estimatedMonthsLeft);
  const months = history.map((_, i, all) => {
    const ago = all.length - 1 - i;
    return ago === 0 ? "This month" : `${ago} month${ago > 1 ? "s" : ""} ago`;
  });

  return (
    <Page>
      <PageHeader eyebrow={`VIN ${telemetry.vin}`} title={telemetry.model}>
        <span className="chip" data-tone={scoreTone}>
          <ToneIcon tone={scoreTone} size={14} />
          {flagged.length} systems need attention
        </span>
        <span className="mono">Synced {relativeTime(telemetry.updatedAt)}</span>
      </PageHeader>

      <div className={styles.bento}>
        {/* Hero: overall health + vehicle diagram */}
        <section className={`panel rise ${styles.hero}`} style={{ "--i": 0 } as CSSProperties}>
          <div className={styles.heroScore}>
            <RingGauge value={score} tone={scoreTone} size={210} label={`Vehicle health ${score} of 100`}>
              <CountUp value={score} className={styles.heroFigure} />
              <span className={styles.heroUnit}>/ 100</span>
            </RingGauge>
            <div>
              <p className="panel-title">
                <GaugeIcon size={16} /> Vehicle health
              </p>
              <p className={styles.heroVerdict}>
                {scoreTone === "good" ? "Running strong." : scoreTone === "warning" ? "Service recommended." : "Needs attention now."}
              </p>
              <p className="muted">
                Average across {telemetry.components.length} monitored systems.{" "}
                {critical.length > 0 && (
                  <>
                    <b className={styles.criticalText}>{critical.map((c) => c.name).join(", ")}</b> {critical.length > 1 ? "are" : "is"} critical.
                  </>
                )}
              </p>
              {critical.length > 0 && (
                <Link href={`/schedule?service=${encodeURIComponent(critical[0].name + " service")}`} className="btn" style={{ marginTop: 18 }}>
                  <WrenchIcon size={16} /> Book a fix <ArrowIcon size={16} />
                </Link>
              )}
            </div>
          </div>
          <VehicleExplorer components={telemetry.components} />
        </section>

        {/* Battery */}
        <section className={`panel rise ${styles.battery}`} style={{ "--i": 1 } as CSSProperties}>
          <p className="panel-title">
            <BoltIcon size={16} /> Battery
          </p>
          <div className={styles.batteryTop}>
            <RingGauge value={telemetry.battery.healthPercent} tone={batteryTone} size={132} label={`Battery health ${telemetry.battery.healthPercent}%`}>
              <span className={styles.ringValue}>
                <CountUp value={telemetry.battery.healthPercent} />%
              </span>
            </RingGauge>
            <div>
              <p className={styles.bigNumber}>
                ~<CountUp value={telemetry.battery.estimatedMonthsLeft} />
                <small>months</small>
              </p>
              <p className="muted">estimated life remaining</p>
            </div>
          </div>
          <dl className={styles.batteryStats}>
            <div>
              <dt>Monthly loss</dt>
              <dd>−{monthlyLoss.toFixed(1)}%</dd>
            </div>
            <div>
              <dt>Past year</dt>
              <dd>−{history[0] - telemetry.battery.healthPercent} pts</dd>
            </div>
            <div>
              <dt>Replace around</dt>
              <dd>{replaceBy}</dd>
            </div>
          </dl>
          <div className={styles.sparkWrap}>
            <div className={styles.sparkHead}>
              <span className="muted">12-month health</span>
              <span className="mono">
                {history[0]}% → {telemetry.battery.healthPercent}%
              </span>
            </div>
            <Sparkline values={history} labels={months} unit="%" height={110} />
          </div>
        </section>

        {/* KPI row */}
        <div className={styles.kpis}>
          <Kpi i={2} icon={<BellIcon size={18} />} label="Unread alerts" value={<CountUp value={unread.length} />} note={`${notifications.length} total via WhatsApp`} />
          <Kpi i={3} icon={<ToneIcon tone="critical" size={18} />} label="Critical systems" value={<CountUp value={critical.length} />} note={critical.length ? "Service required" : "All clear"} tone={critical.length ? "critical" : "good"} />
          <Kpi i={4} icon={<GaugeIcon size={18} />} label="Odometer" value={numberFmt.format(telemetry.mileageKm)} note="kilometres" />
          <Link href="/schedule" className={styles.kpiLink}>
            <Kpi
              i={5}
              icon={<CalendarIcon size={18} />}
              label="Next service"
              value={next ? `${dateParts(next.scheduledAt).day} ${dateParts(next.scheduledAt).month}` : "—"}
              note={next ? `${next.service} · ${nextDealership?.name ?? ""}` : "Nothing booked — schedule now"}
            />
          </Link>
        </div>

        {/* Systems */}
        <section className={`panel rise ${styles.systems}`} style={{ "--i": 6 } as CSSProperties}>
          <p className="panel-title">
            <WrenchIcon size={16} /> <span className="grow">Systems</span>
            <span>{telemetry.components.length} sensors</span>
          </p>
          <div className={styles.zones}>
            {zoneOrder.map((zone) => {
              const items = telemetry.components.filter((c) => c.zone === zone);
              if (items.length === 0) return null;
              return (
                <div key={zone} className={styles.zone}>
                  <h3>{zoneLabel[zone]}</h3>
                  <ul>
                    {items.map((c, i) => {
                      const tone = toneOfStatus[c.status];
                      return (
                        <li key={c.name} data-tone={tone} className={styles.system}>
                          <ToneIcon tone={tone} size={16} className={styles.systemIcon} />
                          <span className={styles.systemName}>{c.name}</span>
                          <span className="bar" style={{ "--v": c.health, "--i": i } as CSSProperties}>
                            <i />
                          </span>
                          <span className={styles.systemValue}>{c.health}%</span>
                          <span className={styles.systemLabel}>{toneLabel[tone]}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Alerts feed */}
        <section className={`panel rise ${styles.feed}`} style={{ "--i": 7 } as CSSProperties}>
          <p className="panel-title">
            <BellIcon size={16} /> <span className="grow">Alerts</span>
            <span className="chip" data-tone="info">
              WhatsApp
            </span>
          </p>
          <ol className={styles.timeline}>
            {feed.slice(0, FEED_SIZE).map((n) => (
              <Alert key={n.id} n={n} />
            ))}
          </ol>
          {feed.length > FEED_SIZE && (
            <details className={styles.more}>
              <summary>
                Show {feed.length - FEED_SIZE} older alerts <ArrowIcon size={14} />
              </summary>
              <ol className={styles.timeline}>
                {feed.slice(FEED_SIZE).map((n) => (
                  <Alert key={n.id} n={n} />
                ))}
              </ol>
            </details>
          )}
        </section>
      </div>
    </Page>
  );
}

function monthYear(fromIso: string, addMonths: number) {
  const d = new Date(fromIso);
  d.setMonth(d.getMonth() + addMonths);
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: TIME_ZONE }).format(d);
}

function Kpi({
  i,
  icon,
  label,
  value,
  note,
  tone = "info",
}: {
  i: number;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  note: string;
  tone?: "info" | "good" | "critical";
}) {
  return (
    <div className={`panel rise ${styles.kpi}`} data-tone={tone} style={{ "--i": i } as CSSProperties}>
      <span className={styles.kpiIcon}>{icon}</span>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={styles.kpiValue}>{value}</p>
      <p className={styles.kpiNote}>{note}</p>
    </div>
  );
}

function Alert({ n }: { n: Awaited<ReturnType<typeof api.notifications>>[number] }) {
  const tone = toneOfSeverity[n.severity];
  return (
    <li className={styles.alert} data-tone={tone} data-unread={!n.read || undefined}>
      <span className={styles.alertIcon}>
        <ToneIcon tone={tone} size={16} />
      </span>
      <div className={styles.alertBody}>
        <div className={styles.alertHead}>
          <strong>{n.title}</strong>
          <time dateTime={n.createdAt} className="mono">
            {relativeTime(n.createdAt)}
          </time>
        </div>
        <p>{n.message}</p>
        <div className={styles.alertFoot}>
          <span className="chip" data-tone={tone}>
            {toneLabel[tone]}
          </span>
          {!n.read && (
            <form action={markNotificationRead}>
              <input type="hidden" name="id" value={n.id} />
              <button type="submit" className="btn btn-ghost btn-sm">
                Mark read
              </button>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}
