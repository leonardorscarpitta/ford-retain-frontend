import { api, DEMO_VIN, type Appointment, type Dealership } from "@/lib/api";
import { dateParts, relativeTime } from "@/lib/format";
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
      <PageHeader eyebrow="Maintenance" title="Schedule a service" />

      <div className={styles.layout}>
        <section className={`panel ${styles.formPanel}`}>
          <h2 className="section-title">New appointment</h2>
          <ScheduleForm
            dealerships={dealerships}
            suggestions={suggestions}
            defaultDealership={typeof dealership === "string" ? dealership : undefined}
            defaultService={typeof service === "string" ? service : undefined}
          />
        </section>

        <div>
          <section className={styles.section}>
            <h2 className="section-title">
              Upcoming <span className="muted">{upcoming.length}</span>
            </h2>
            {upcoming.length === 0 ? (
              <p className="empty">No upcoming appointments.</p>
            ) : (
              <ul className={styles.list}>
                {upcoming.map((a) => (
                  <Upcoming key={a.id} a={a} dealership={byId.get(a.dealershipId)} />
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h2 className="section-title">
              History <span className="muted">{past.length}</span>
            </h2>
            {past.length === 0 ? (
              <p className="empty">No past appointments.</p>
            ) : (
              [...years].map(([year, items]) => (
                <div key={year} className={styles.year}>
                  <h3>{year}</h3>
                  <ul className={styles.list}>
                    {items.map((a) => {
                      const d = dateParts(a.scheduledAt);
                      return (
                        <li key={a.id} className={styles.row}>
                          <time dateTime={a.scheduledAt} className={styles.date}>
                            {d.day} {d.month}
                          </time>
                          <div>
                            <p>{a.service}</p>
                            <p className="muted">
                              {byId.get(a.dealershipId)?.name}
                              {a.notes && ` · ${a.notes}`}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </Page>
  );
}

function Upcoming({ a, dealership }: { a: Appointment; dealership?: Dealership }) {
  const d = dateParts(a.scheduledAt);
  return (
    <li className={styles.row}>
      <time dateTime={a.scheduledAt} className={styles.date}>
        {d.day} {d.month}
      </time>
      <div>
        <p>
          <strong>{a.service}</strong>
        </p>
        <p className="muted">
          {dealership?.name ?? a.dealershipId} · {d.weekday} {d.time} · {relativeTime(a.scheduledAt)}
        </p>
        {a.notes && <p className="muted">{a.notes}</p>}
      </div>
      <CancelButton id={a.id} />
    </li>
  );
}
