"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { getGarage, VEHICLE_COOKIE } from "@/lib/garage";

export async function selectVehicle(formData: FormData) {
  const vin = String(formData.get("vin"));
  const { vehicles } = await getGarage();
  if (!vehicles.some((v) => v.vin === vin)) return;
  (await cookies()).set(VEHICLE_COOKIE, vin, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  // Every page shows the selected vehicle, so refresh them all.
  revalidatePath("/", "layout");
}

export async function markNotificationRead(formData: FormData) {
  await api.markNotificationRead(String(formData.get("id")));
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
  const date = String(formData.get("scheduledAt") ?? "");
  if (!date) return { error: "Pick a date and time." };

  try {
    const { current } = await getGarage();
    await api.createAppointment(current.vin, {
      dealershipId: String(formData.get("dealershipId") ?? ""),
      // datetime-local has no timezone; treat it as the server's local time.
      scheduledAt: new Date(date).toISOString(),
      service: String(formData.get("service") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { error: err.message };
    throw err;
  }
  revalidatePath("/schedule");
  return { ok: true };
}
