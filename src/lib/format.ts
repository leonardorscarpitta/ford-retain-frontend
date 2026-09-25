import type { ComponentStatus, Severity, VehicleComponent, Zone } from "./api";

// Owners and dealerships are in Brazil; render every date in their time zone so
// server-rendered output doesn't depend on the container's clock settings.
export const TIME_ZONE = "America/Sao_Paulo";

/** The four reserved status roles used for color + icon + label. */
export type Tone = "good" | "warning" | "critical" | "info";

export const toneOfStatus: Record<ComponentStatus, Tone> = {
  good: "good",
  attention: "warning",
  critical: "critical",
};

export const toneOfSeverity: Record<Severity, Tone> = {
  info: "info",
  warning: "warning",
  critical: "critical",
};

export const toneLabel: Record<Tone, string> = {
  good: "Good",
  warning: "Attention",
  critical: "Critical",
  info: "Info",
};

export function toneOfScore(score: number): Tone {
  if (score >= 70) return "good";
  if (score >= 40) return "warning";
  return "critical";
}

export const zoneLabel: Record<Zone, string> = {
  "engine-bay": "Engine bay",
  "front-wheel": "Front axle",
  "rear-wheel": "Rear axle",
  underbody: "Underbody",
  cabin: "Cabin",
};

export const zoneOrder: Zone[] = ["engine-bay", "front-wheel", "rear-wheel", "underbody", "cabin"];

/** Overall health: the mean of every component's health. */
export function healthScore(components: VehicleComponent[]) {
  if (components.length === 0) return 0;
  return Math.round(components.reduce((sum, c) => sum + c.health, 0) / components.length);
}

const statusRank: Record<ComponentStatus, number> = { good: 0, attention: 1, critical: 2 };

/** The worst status among the given components. */
export function worstStatus(components: VehicleComponent[]): ComponentStatus {
  return components.reduce<ComponentStatus>(
    (worst, c) => (statusRank[c.status] > statusRank[worst] ? c.status : worst),
    "good",
  );
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function relativeTime(iso: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Parts for a calendar-style date block. */
export function dateParts(iso: string) {
  const d = new Date(iso);
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en", { timeZone: TIME_ZONE, ...o }).format(d);
  return {
    day: fmt({ day: "2-digit" }),
    month: fmt({ month: "short" }),
    year: fmt({ year: "numeric" }),
    weekday: fmt({ weekday: "short" }),
    time: fmt({ hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

export const numberFmt = new Intl.NumberFormat("en");
