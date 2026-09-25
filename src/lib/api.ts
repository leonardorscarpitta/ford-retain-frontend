import "server-only";
import { connection } from "next/server";

// Server-side client for the Go API. The browser never calls the API directly:
// pages fetch in Server Components and mutate through Server Actions.
const API_URL = process.env.API_URL ?? "http://localhost:8080";

// Until authentication exists, the app shows a single seeded vehicle.
export const DEMO_VIN = process.env.DEMO_VIN ?? "1FTFW1E50NFA00001";

export type Severity = "info" | "warning" | "critical";

export type Notification = {
  id: string;
  vin: string;
  title: string;
  message: string;
  severity: Severity;
  channel: string;
  read: boolean;
  createdAt: string;
};

export type ComponentStatus = "good" | "attention" | "critical";
export type Zone = "engine-bay" | "front-wheel" | "rear-wheel" | "underbody" | "cabin";

export type VehicleComponent = {
  name: string;
  zone: Zone;
  health: number;
  status: ComponentStatus;
};

export type Telemetry = {
  vin: string;
  model: string;
  mileageKm: number;
  battery: { healthPercent: number; estimatedMonthsLeft: number; history: number[] };
  components: VehicleComponent[];
  updatedAt: string;
};

export type Dealership = {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  rating: number;
  hours: string;
  services: string[];
  distanceKm?: number;
};

export type Appointment = {
  id: string;
  vin: string;
  dealershipId: string;
  scheduledAt: string;
  service: string;
  notes?: string;
  createdAt: string;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  await connection(); // always render with fresh data at request time
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  notifications: (vin: string) => request<Notification[]>(`/api/vehicles/${vin}/notifications`),
  markNotificationRead: (id: string) =>
    request<Notification>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  telemetry: (vin: string) => request<Telemetry>(`/api/vehicles/${vin}/telemetry`),
  dealerships: (near?: { lat: number; lng: number }) =>
    request<Dealership[]>(`/api/dealerships${near ? `?lat=${near.lat}&lng=${near.lng}` : ""}`),
  appointments: (vin: string, when?: "upcoming" | "past") =>
    request<Appointment[]>(`/api/vehicles/${vin}/appointments${when ? `?when=${when}` : ""}`),
  createAppointment: (
    vin: string,
    input: { dealershipId: string; scheduledAt: string; service: string; notes: string },
  ) =>
    request<Appointment>(`/api/vehicles/${vin}/appointments`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
