"use client";

import { useActionState, useRef } from "react";
import { scheduleAppointment, type ScheduleState } from "@/app/actions";
import type { Dealership } from "@/lib/api";
import { ArrowIcon, CheckIcon, CriticalIcon, ToneIcon } from "./icons";

type Suggestion = { label: string; tone: "critical" | "warning" };

export function ScheduleForm({
  dealerships,
  suggestions,
  defaultDealership,
  defaultService,
}: {
  dealerships: Dealership[];
  suggestions: Suggestion[];
  defaultDealership?: string;
  defaultService?: string;
}) {
  const [state, formAction, pending] = useActionState<ScheduleState, FormData>(scheduleAppointment, {});
  const serviceRef = useRef<HTMLInputElement>(null);

  // datetime-local has no zone: convert in the browser, where the owner's zone is known.
  const submit = (formData: FormData) => {
    const local = formData.get("scheduledAt");
    if (local) formData.set("scheduledAt", new Date(String(local)).toISOString());
    formAction(formData);
  };

  return (
    <form action={submit} className="schedule-form">
      <label className="field">
        <span>Service</span>
        <input ref={serviceRef} name="service" className="input" required defaultValue={defaultService} placeholder="e.g. Brake pad replacement" />
      </label>

      {suggestions.length > 0 && (
        <div className="suggestions">
          <p>Suggested from your telemetry</p>
          <div>
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                className="chip chip-button"
                data-tone={s.tone}
                onClick={() => {
                  if (serviceRef.current) serviceRef.current.value = `${s.label} service`;
                  serviceRef.current?.focus();
                }}
              >
                <ToneIcon tone={s.tone} size={13} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="field">
        <span>Dealership</span>
        <select name="dealershipId" className="input" required defaultValue={defaultDealership}>
          {dealerships.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — ★ {d.rating.toFixed(1)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Date &amp; time</span>
        <input type="datetime-local" name="scheduledAt" className="input" required />
      </label>

      <label className="field">
        <span>Notes for the technician</span>
        <textarea name="notes" className="input" rows={3} placeholder="Anything we should know?" />
      </label>

      <button type="submit" className="btn" disabled={pending}>
        {pending ? (
          <>
            <span className="spinner" /> Booking…
          </>
        ) : (
          <>
            Confirm booking <ArrowIcon size={16} />
          </>
        )}
      </button>

      <div aria-live="polite">
        {state.error && (
          <p className="form-msg" data-tone="critical">
            <CriticalIcon size={16} /> {state.error}
          </p>
        )}
        {state.ok && (
          <p className="form-msg" data-tone="good">
            <CheckIcon size={16} /> Booked! It&apos;s on your upcoming list.
          </p>
        )}
      </div>
    </form>
  );
}
