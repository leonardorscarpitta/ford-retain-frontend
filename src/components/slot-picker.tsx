"use client";

import { useState } from "react";
import type { Availability } from "@/lib/api";
import styles from "./slot-picker.module.css";

/**
 * Pick a day, then one of its hourly slots. Submits the slot's start time as
 * `scheduledAt`. Days with nothing free are disabled; full slots stay visible
 * but can't be chosen.
 */
export function SlotPicker({ availability }: { availability: Availability }) {
  const { days, timeZone } = availability;
  const firstOpen = days.findIndex((d) => d.slots.some((s) => s.available));
  const [dayIndex, setDayIndex] = useState(Math.max(firstOpen, 0));
  const day = days[dayIndex];

  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en", { timeZone, ...o }).format(new Date(iso));
  // Midday keeps the calendar date stable in any zone.
  const dateLabel = (date: string, o: Intl.DateTimeFormatOptions) => fmt(`${date}T12:00:00Z`, o);

  if (firstOpen === -1) return <p className="muted">No free times in the next two weeks. Try another dealership.</p>;

  return (
    <fieldset className={styles.picker}>
      <legend>Date &amp; time</legend>
      <div className={styles.days} role="radiogroup" aria-label="Day">
        {days.map((d, i) => {
          const free = d.slots.filter((s) => s.available).length;
          return (
            <button
              key={d.date}
              type="button"
              role="radio"
              aria-checked={i === dayIndex}
              disabled={free === 0}
              className={styles.day}
              onClick={() => setDayIndex(i)}
              title={d.slots.length === 0 ? "Closed" : free === 0 ? "Fully booked" : `${free} free`}
            >
              <span>{dateLabel(d.date, { weekday: "short" })}</span>
              <b>{dateLabel(d.date, { day: "numeric" })}</b>
              <span>{dateLabel(d.date, { month: "short" })}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.slots}>
        {day.slots.map((s) => (
          <label key={s.start} className={styles.slot} data-full={!s.available || undefined}>
            <input type="radio" name="scheduledAt" value={s.start} disabled={!s.available} required />
            {fmt(s.start, { hour: "2-digit", minute: "2-digit", hour12: false })}
            {!s.available && <span className="sr-only"> (full)</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
