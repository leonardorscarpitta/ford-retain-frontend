import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, VEHICLE_COOKIE } from "@/lib/cookies";

// The API rejected our session (expired, or the API restarted). Server
// Components can't delete cookies, so they redirect here to clear it.
export async function GET() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(VEHICLE_COOKIE);
  redirect("/login?expired=1");
}
