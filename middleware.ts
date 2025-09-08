import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT, type JWTUserPayload } from "./src/services/hikerApi";
import { supabase } from "./src/supabaseClient";

const DASHBOARD_PATH = "/dashboard";
const ADMIN_PATH = "/admin";
const AUTH_PATHS = ["/auth/login", "/auth/signup", "/auth/forgot-password", "/auth/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  
  try {
    // Quick token verification only
    const verified = token ? await verifyJWT(token) : null;
    
    // Protect all /dashboard routes - basic auth only
    if (pathname.startsWith(DASHBOARD_PATH)) {
      if (!token || !verified) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
      // Let the page handle detailed user checks
    }
    
    // Protect all /admin routes - basic auth only
    if (pathname.startsWith(ADMIN_PATH)) {
      if (!token || !verified) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
      // Let the admin page handle admin permission checks
    }

    // Prevent authenticated users from accessing auth pages
    if (AUTH_PATHS.includes(pathname) && verified) {
      return NextResponse.redirect(new URL("/dashboard/new-extractions", request.url));
    }
    
    return NextResponse.next();
    
  } catch (error) {
    console.error('Middleware error:', error);
    // On any error, let auth pages handle it
    if (pathname.startsWith(DASHBOARD_PATH) || pathname.startsWith(ADMIN_PATH)) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/auth/:path*"],
};
