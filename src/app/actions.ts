"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { SESSION_COOKIE, VEHICLE_COOKIE } from "@/lib/cookies";
import { getGarage } from "@/lib/garage";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // matches the API's session TTL

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };

  const session = await api.login(email, password);
  if (!session.ok && session.reason === "locked") {
    const minutes = Math.max(1, Math.ceil(session.retryAfterSeconds / 60));
    return { error: `Too many attempts. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`, email };
  }
  if (!session.ok) return { error: "That email and password don't match.", email };

  const jar = await cookies();
  jar.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
  });
  jar.delete(VEHICLE_COOKIE); // start on the new user's default vehicle
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  try {
    await api.logout();
  } catch {
    // Signing out locally still works if the API session is already gone.
  }
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(VEHICLE_COOKIE);
  redirect("/login");
}

/** Only allow redirects back into this app, never to another origin. */
function safeNext(next: FormDataEntryValue | null) {
  const path = typeof next === "string" ? next : "";
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : "/";
}

export async function selectVehicle(formData: FormData) {
  const vin = String(formData.get("vin"));
  const { vehicles } = await getGarage();
  if (!vehicles.some((v) => v.vin === vin)) return;
  (await cookies()).set(VEHICLE_COOKIE, vin, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  // Every page shows the selected vehicle, so refresh them all.
  revalidatePath("/", "layout");
}

export async function markNotificationRead(formData: FormData) {
  const { current } = await getGarage();
  await api.markNotificationRead(current.vin, String(formData.get("id")));
  revalidatePath("/");
}

export async function cancelAppointment(formData: FormData) {
  const { current } = await getGarage();
  await api.cancelAppointment(current.vin, String(formData.get("id")));
  revalidatePath("/schedule");
  revalidatePath("/");
}

export type ScheduleState = { error?: string; ok?: boolean };

export async function scheduleAppointment(
  _prev: ScheduleState,
  formData: FormData,
): Promise<ScheduleState> {
  const slot = String(formData.get("scheduledAt") ?? "");
  if (!slot) return { error: "Pick a time." };

  try {
    const { current } = await getGarage();
    await api.createAppointment(current.vin, {
      dealershipId: String(formData.get("dealershipId") ?? ""),
      scheduledAt: slot, // a slot start from the API, with its UTC offset
      service: String(formData.get("service") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) {
      const message = err.message.replace(/^invalid appointment: /, "");
      return { error: message.charAt(0).toUpperCase() + message.slice(1) + "." };
    }
    throw err;
  }
  revalidatePath("/schedule");
  return { ok: true };
}
