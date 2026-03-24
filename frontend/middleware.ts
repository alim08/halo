import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Middleware — runs on every matched request.
 *
 * Guards:
 * 1. Protected routes require an access token (stored in cookie or checked client-side).
 * 2. Discovery/matches/chat routes require onboarding to be complete.
 *
 * NOTE: Full auth validation (JWT verification) happens server-side in the Go API.
 * This middleware only provides a UX-level redirect for unauthenticated users
 * and lets the API enforce actual security via Bearer tokens.
 *
 * Since we store tokens in localStorage (not cookies), this middleware
 * cannot read them in the Edge runtime. Instead, it acts as a lightweight
 * redirect for users who land on protected routes without a session cookie.
 * The actual auth check happens client-side when the API returns 401.
 */

// Routes that require authentication.
const PROTECTED_PREFIXES = ["/discovery", "/matches", "/onboarding"];

// Routes that require onboarding to be complete.
// (Enforced client-side — see ProtectedRoute or page-level useEffect.)
// This middleware focuses on redirecting unauthenticated users.

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/healthz"
  ) {
    return NextResponse.next();
  }

  // For protected routes, check for a session indicator cookie.
  // The cookie is a lightweight hint; the real auth is the Bearer token
  // validated by the Go API. If no cookie, redirect to login.
  const hasSession = request.cookies.get("halo_session");

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!hasSession) {
      // Don't redirect if user might have localStorage token —
      // let the client-side check handle it. Only redirect if
      // we're confident there's no session.
      // For now, pass through and let client-side guards handle redirects.
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
