import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/cookies";

// Optimistic check only: no session cookie → sign in first. Whether the
// session is actually valid (and what it may access) is decided by the API.
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const url = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the sign-in flow and static assets.
  matcher: ["/((?!login|auth/|_next/static|_next/image|favicon.ico).*)"],
};
