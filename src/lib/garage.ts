import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { api } from "./api";
import { VEHICLE_COOKIE } from "./cookies";

/**
 * The signed-in owner's vehicles and the one currently selected (from the cookie,
 * falling back to the first). Cached per request, so pages, the layout and
 * actions can all call it freely.
 */
export const getGarage = cache(async () => {
  const [vehicles, jar] = await Promise.all([api.vehicles(), cookies()]);
  if (vehicles.length === 0) throw new Error("No vehicles in this garage");
  const chosen = jar.get(VEHICLE_COOKIE)?.value;
  const current = vehicles.find((v) => v.vin === chosen) ?? vehicles[0];
  return { vehicles, current };
});
