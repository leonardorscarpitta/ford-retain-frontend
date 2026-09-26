import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { api } from "./api";
import { SESSION_COOKIE } from "./cookies";

/**
 * The signed-in user, or null. Never redirects, so the layout can call it on
 * any page (including /login). The Go API is the real gatekeeper: every data
 * call is authorised there.
 */
export const getUser = cache(async () => {
  if (!(await cookies()).has(SESSION_COOKIE)) return null;
  try {
    return await api.me();
  } catch {
    return null; // expired session (api redirects by throwing) or API down
  }
});
