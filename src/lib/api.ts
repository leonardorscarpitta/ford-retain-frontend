import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SESSION_COOKIE } from "./cookies";

// Server-side client for the Go API. The browser never calls the API directly:
// pages fetch in Server Components and mutate through Server Actions.
const API_URL = process.env.API_URL ?? "http://localhost:8080";

export type User = {
  id: string;
  email: string;
  name: string;
};

export type Vehicle = {
  vin: string;
  model: string;
  paintName: string;
  paintHex: string;
};

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

/**
 * Calls the API as the signed-in user (the session cookie becomes a bearer
 * token). A 401 means the session is gone: send the user to sign in again.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  await connection(); // always render with fresh data at request time
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) redirect("/auth/expired");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Exchanges credentials for a session token; null when they're wrong. */
async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return (await res.json()) as { token: string; user: User };
}

export const api = {
  login,
  me: () => request<User>("/api/auth/me"),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  vehicles: () => request<Vehicle[]>("/api/vehicles"),
  notifications: (vin: string) => request<Notification[]>(`/api/vehicles/${vin}/notifications`),
  markNotificationRead: (vin: string, id: string) =>
    request<Notification>(`/api/vehicles/${vin}/notifications/${id}/read`, { method: "PATCH" }),
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
  cancelAppointment: (vin: string, id: string) =>
    request<void>(`/api/vehicles/${vin}/appointments/${id}`, { method: "DELETE" }),
};
