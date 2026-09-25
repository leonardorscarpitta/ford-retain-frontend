"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError, DEMO_VIN } from "@/lib/api";

export async function markNotificationRead(formData: FormData) {
  await api.markNotificationRead(String(formData.get("id")));
  revalidatePath("/");
}

export async function cancelAppointment(formData: FormData) {
  await api.cancelAppointment(DEMO_VIN, String(formData.get("id")));
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
    await api.createAppointment(DEMO_VIN, {
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
