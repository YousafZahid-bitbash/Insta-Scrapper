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
  const verified = token ? await verifyJWT(token) : null;
  
  // Protect all /dashboard routes
  if (pathname.startsWith(DASHBOARD_PATH)) {
    if (!token || !verified) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }
  
  // Protect all /admin routes - require admin role
  if (pathname.startsWith(ADMIN_PATH)) {
    if (!token || !verified) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    
    // Check if user exists and is admin
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, is_admin')
        .eq('id', verified.user_id)
        .eq('is_active', true)
        .single();
        
      if (error || !user || !user.is_admin) {
        return NextResponse.redirect(new URL("/dashboard/new-extractions", request.url));
      }
    } catch (error) {
      console.error('Admin verification error:', error);
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // Prevent authenticated users from accessing auth pages
  if (AUTH_PATHS.includes(pathname) && verified) {
    // If user is already logged in, redirect to appropriate dashboard
    try {
      const { data: user } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', verified.user_id)
        .single();
      
      if (user?.is_admin) {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard/new-extractions", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/dashboard/new-extractions", request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/auth/:path*"],
};
