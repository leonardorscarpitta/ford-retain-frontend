import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/cookies";

// The sign-in flow is reachable without a session.
const PUBLIC = /^\/(login(\/|$)|auth\/)/;

export function proxy(request: NextRequest) {
  // Optimistic check only: no session cookie → sign in first. Whether the
  // session is actually valid (and what it may access) is decided by the API.
  if (!PUBLIC.test(request.nextUrl.pathname) && !request.cookies.has(SESSION_COOKIE)) {
    const url = new URL("/login", request.url);
    const next = request.nextUrl.pathname + request.nextUrl.search;
    if (next !== "/") url.searchParams.set("next", next);
    const res = NextResponse.redirect(url);
    res.headers.set("Content-Type", "text/plain; charset=utf-8");
    return res;
  }

  // Per-request nonce CSP: Next.js reads the nonce from the request header
  // and adds it to its scripts and inline styles. React `style` props become
  // style attributes, hence style-src-attr. Dev needs eval and injected CSS.
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    dev ? `style-src 'self' 'unsafe-inline'` : `style-src 'self' 'nonce-${nonce}'`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob: https://tile.openstreetmap.org`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  // Every page (for the CSP); static assets get their headers from next.config.ts.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
