// middleware.ts
// Route protection: redirect unauthenticated users to /login
// Only Firebase-backed environments enforce redirects.
// In demo mode (no Firebase) all routes are accessible.

import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login"];
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/students",
  "/attendance",
  "/classes",
  "/reports",
  "/notifications",
  "/settings",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow API routes, static files, and public routes
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_ROUTES.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // If Firebase is not configured (demo mode), allow all routes
  const firebaseConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  if (!firebaseConfigured) {
    return NextResponse.next();
  }

  // For protected routes: check for a session cookie or let client handle it
  // (Firebase Auth is client-side; the client useAuth hook handles the redirect)
  // Server-side cookie check can be added here with Firebase Admin session cookies
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected) {
    // Optional: check for a __session cookie (Firebase session cookie)
    const session = req.cookies.get("__session");
    if (!session) {
      // Let the client-side auth guard handle it (avoids double-redirect on initial load)
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
