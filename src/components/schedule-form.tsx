"use client";

import { useActionState } from "react";
import { scheduleAppointment, type ScheduleState } from "@/app/actions";
import type { Dealership } from "@/lib/api";

export function ScheduleForm({ dealerships }: { dealerships: Dealership[] }) {
  const [state, formAction, pending] = useActionState<ScheduleState, FormData>(
    scheduleAppointment,
    {},
  );

  return (
    <form action={formAction} className="form">
      <label>
        Service
        <input name="service" required placeholder="e.g. Brake pad replacement" />
      </label>
      <label>
        Dealership
        <select name="dealershipId" required>
          {dealerships.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Date and time
        <input type="datetime-local" name="scheduledAt" required />
      </label>
      <label>
        Notes
        <textarea name="notes" rows={2} />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Scheduling…" : "Schedule"}
      </button>
      {state.error && <p className="error">{state.error}</p>}
      {state.ok && <p className="success">Appointment scheduled.</p>}
    </form>
  );
}
