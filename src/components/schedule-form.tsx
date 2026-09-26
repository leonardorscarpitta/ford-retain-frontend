"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useRef, useTransition } from "react";
import { scheduleAppointment, type ScheduleState } from "@/app/actions";
import type { Availability, Dealership } from "@/lib/api";
import { CheckIcon, CriticalIcon, ToneIcon } from "./icons";
import { SlotPicker } from "./slot-picker";

type Suggestion = { label: string; tone: "critical" | "warning" };

export function ScheduleForm({
  dealerships,
  suggestions,
  dealershipId,
  availability,
  defaultService,
}: {
  dealerships: Dealership[];
  suggestions: Suggestion[];
  dealershipId: string;
  availability: Availability;
  defaultService?: string;
}) {
  const [state, formAction, pending] = useActionState<ScheduleState, FormData>(scheduleAppointment, {});
  const serviceRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [loadingSlots, startLoading] = useTransition();

  // Availability is rendered on the server for the dealership in the URL.
  const chooseDealership = (id: string) => {
    const q = new URLSearchParams(params);
    q.set("dealership", id);
    startLoading(() => router.replace(`${pathname}?${q}`, { scroll: false }));
  };

  return (
    <form action={formAction} className="schedule-form">
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
        {/* Keyed so its default follows the URL: React resets the form after a
            booking, which would otherwise snap back to the first-rendered dealership
            while the slots shown belong to the new one. */}
        <select
          key={dealershipId}
          name="dealershipId"
          className="input"
          required
          defaultValue={dealershipId}
          onChange={(e) => chooseDealership(e.target.value)}
        >
          {dealerships.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — ★ {d.rating.toFixed(1)}
            </option>
          ))}
        </select>
      </label>

      <div aria-busy={loadingSlots} style={{ opacity: loadingSlots ? 0.5 : 1 }}>
        {/* Keyed so the chosen day resets when the dealership changes. */}
        <SlotPicker key={availability.dealershipId} availability={availability} />
      </div>

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
            Confirm booking
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
