import type { CSSProperties } from "react";
import { api, DEMO_VIN, type Appointment, type Dealership } from "@/lib/api";
import { dateParts, relativeTime } from "@/lib/format";
import { CalendarIcon, ClockIcon, PinIcon, WrenchIcon } from "@/components/icons";
import { Page, PageHeader } from "@/components/page";
import { CancelButton } from "@/components/cancel-button";
import { ScheduleForm } from "@/components/schedule-form";
import styles from "./schedule.module.css";

export default async function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  const { dealership, service } = await searchParams;
  const [dealerships, upcoming, past, telemetry] = await Promise.all([
    api.dealerships(),
    api.appointments(DEMO_VIN, "upcoming"),
    api.appointments(DEMO_VIN, "past"),
    api.telemetry(DEMO_VIN),
  ]);
  const byId = new Map(dealerships.map((d) => [d.id, d]));
  const suggestions = telemetry.components
    .filter((c) => c.status !== "good")
    .sort((a, b) => a.health - b.health)
    .map((c) => ({ label: c.name, tone: c.status === "critical" ? ("critical" as const) : ("warning" as const) }));

  // Group service history by year, newest first (the API already sorts it).
  const years = new Map<string, Appointment[]>();
  for (const a of past) {
    const y = dateParts(a.scheduledAt).year;
    years.set(y, [...(years.get(y) ?? []), a]);
  }

  return (
    <Page>
      <PageHeader eyebrow="Maintenance" title="Book your next service">
        <span>
          {upcoming.length} upcoming · {past.length} completed visits
        </span>
      </PageHeader>

      <div className={styles.layout}>
        <section className={`panel rise ${styles.formPanel}`}>
          <p className="panel-title">
            <WrenchIcon size={16} /> New appointment
          </p>
          <ScheduleForm
            dealerships={dealerships}
            suggestions={suggestions}
            defaultDealership={typeof dealership === "string" ? dealership : undefined}
            defaultService={typeof service === "string" ? service : undefined}
          />
        </section>

        <div className={styles.side}>
          <section className="panel rise" style={{ "--i": 1 } as CSSProperties}>
            <p className="panel-title">
              <CalendarIcon size={16} /> <span className="grow">Upcoming</span>
              <span>{upcoming.length}</span>
            </p>
            {upcoming.length === 0 ? (
              <div className="empty">
                <CalendarIcon size={28} />
                No upcoming appointments.
              </div>
            ) : (
              <ul className={styles.upcoming}>
                {upcoming.map((a, i) => (
                  <UpcomingCard key={a.id} a={a} dealership={byId.get(a.dealershipId)} i={i} />
                ))}
              </ul>
            )}
          </section>

          <section className="panel rise" style={{ "--i": 2 } as CSSProperties}>
            <p className="panel-title">
              <ClockIcon size={16} /> <span className="grow">Service history</span>
              <span>{past.length}</span>
            </p>
            {past.length === 0 ? (
              <div className="empty">No past appointments.</div>
            ) : (
              [...years].map(([year, items]) => (
                <div key={year} className={styles.year}>
                  <h3 className={styles.yearLabel}>{year}</h3>
                  <ol className={styles.history}>
                    {items.map((a) => {
                      const d = dateParts(a.scheduledAt);
                      return (
                        <li key={a.id}>
                          <time dateTime={a.scheduledAt} className="mono">
                            {d.day} {d.month}
                          </time>
                          <div>
                            <strong>{a.service}</strong>
                            <span className="muted">
                              {byId.get(a.dealershipId)?.name}
                              {a.notes && ` · ${a.notes}`}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </Page>
  );
}

function UpcomingCard({ a, dealership, i }: { a: Appointment; dealership?: Dealership; i: number }) {
  const d = dateParts(a.scheduledAt);
  return (
    <li className={`rise ${styles.card}`} style={{ "--i": i + 2 } as CSSProperties} data-first={i === 0 || undefined}>
      <div className={styles.dateBlock}>
        <span>{d.month}</span>
        <b>{d.day}</b>
        <span>{d.weekday}</span>
      </div>
      <div className={styles.cardBody}>
        <strong>{a.service}</strong>
        <span className="muted">
          <PinIcon size={13} /> {dealership?.name ?? a.dealershipId}
        </span>
        <span className="muted">
          <ClockIcon size={13} /> {d.time} · <span className={styles.countdown}>{relativeTime(a.scheduledAt)}</span>
        </span>
        {a.notes && <em className={styles.notes}>{a.notes}</em>}
      </div>
      <div className={styles.cardActions}>
        <CancelButton id={a.id} />
      </div>
    </li>
  );
}
