import { api, DEMO_VIN, type Appointment } from "@/lib/api";
import { ScheduleForm } from "@/components/schedule-form";

export default async function SchedulePage() {
  const [dealerships, upcoming, past] = await Promise.all([
    api.dealerships(),
    api.appointments(DEMO_VIN, "upcoming"),
    api.appointments(DEMO_VIN, "past"),
  ]);
  const dealershipName = new Map(dealerships.map((d) => [d.id, d.name]));

  return (
    <>
      <h1>Schedule maintenance</h1>
      <section className="card">
        <ScheduleForm dealerships={dealerships} />
      </section>

      <section className="card">
        <h2>Upcoming appointments</h2>
        <AppointmentList appointments={upcoming} dealershipName={dealershipName} empty="No upcoming appointments." />
      </section>

      <section className="card">
        <h2>Past appointments</h2>
        <AppointmentList appointments={past} dealershipName={dealershipName} empty="No past appointments." />
      </section>
    </>
  );
}

function AppointmentList({
  appointments,
  dealershipName,
  empty,
}: {
  appointments: Appointment[];
  dealershipName: Map<string, string>;
  empty: string;
}) {
  if (appointments.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="list">
      {appointments.map((a) => (
        <li key={a.id}>
          <strong>{a.service}</strong> at {dealershipName.get(a.dealershipId)} —{" "}
          {new Date(a.scheduledAt).toLocaleString()}
          {a.notes && <span className="muted">({a.notes})</span>}
        </li>
      ))}
    </ul>
  );
}
