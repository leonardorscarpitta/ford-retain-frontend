import { api, DEMO_VIN } from "@/lib/api";
import { markNotificationRead } from "./actions";

export default async function DashboardPage() {
  const [notifications, telemetry] = await Promise.all([
    api.notifications(DEMO_VIN),
    api.telemetry(DEMO_VIN),
  ]);
  const unread = notifications.filter((n) => !n.read);

  return (
    <>
      <h1>My vehicle</h1>
      <p className="muted">
        VIN {telemetry.vin} · {telemetry.mileageKm.toLocaleString()} km
      </p>

      <section className="card">
        <h2>Notifications ({unread.length} unread)</h2>
        <ul className="list">
          {notifications.map((n) => (
            <li key={n.id} className={n.read ? "muted" : undefined}>
              <span className={`badge ${n.severity}`}>{n.severity}</span>{" "}
              <strong>{n.title}</strong> — {n.message}
              {!n.read && (
                <form action={markNotificationRead} className="inline">
                  <input type="hidden" name="id" value={n.id} />
                  <button type="submit">Mark read</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Battery</h2>
        <p>
          Health {telemetry.battery.healthPercent}% · about{" "}
          {telemetry.battery.estimatedMonthsLeft} months remaining
        </p>
        <meter min={0} max={100} low={30} high={70} optimum={100} value={telemetry.battery.healthPercent} />
      </section>

      <section className="card">
        <h2>Component health</h2>
        <ul className="list">
          {telemetry.components.map((c) => (
            <li key={c.name}>
              <span className="grow">{c.name}</span>
              <meter min={0} max={100} low={30} high={70} optimum={100} value={c.health} />
              <span className={`badge ${c.status}`}>{c.health}%</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
