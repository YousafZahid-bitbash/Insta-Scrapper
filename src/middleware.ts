import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "./services/hikerApi";

const DASHBOARD_PATH = "/dashboard";
const ADMIN_PATH = "/admin";
const AUTH_PATHS = ["/auth/login", "/auth/signup", "/auth/forgot-password", "/auth/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const isAuthenticated = token && verifyJWT(token);

  // Protect all /dashboard and /admin routes
  if (pathname.startsWith(DASHBOARD_PATH) || pathname.startsWith(ADMIN_PATH)) {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // Prevent authenticated users from accessing auth pages
  if (AUTH_PATHS.includes(pathname) && isAuthenticated) {
    // If user is already logged in, redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard/new-extractions", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/auth/login", "/auth/signup", "/auth/forgot-password", "/auth/reset-password"],
};
