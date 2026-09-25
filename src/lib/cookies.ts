// Cookie names shared by the proxy, Server Actions and the API client.
// Kept free of server-only imports so proxy.ts can use it.

/** Opaque session token issued by the Go API. HTTP-only. */
export const SESSION_COOKIE = "session";

/** VIN of the vehicle the owner is currently looking at. */
export const VEHICLE_COOKIE = "vin";
