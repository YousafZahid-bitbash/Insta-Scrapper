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
    
    // Check if user is active (not banned)
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, is_active')
        .eq('id', verified.user_id)
        .single();
        
      if (error || !user) {
        // User not found, redirect to login
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
      
      if (!user.is_active) {
        // User is banned, clear token and redirect to login with message
        const response = NextResponse.redirect(new URL("/auth/login?banned=true", request.url));
        response.cookies.delete("token");
        // Add header to signal frontend to clear localStorage
        response.headers.set('X-User-Banned', 'true');
        return response;
      }
    } catch (error) {
      console.error('User verification error:', error);
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }
  
  // Protect all /admin routes - require admin role
  if (pathname.startsWith(ADMIN_PATH)) {
    if (!token || !verified) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    
    // Check if user exists, is active, and is admin
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, is_admin, is_active')
        .eq('id', verified.user_id)
        .single();
        
      if (error || !user) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
      
      if (!user.is_active) {
        // User is banned, clear token and redirect to login with message
        const response = NextResponse.redirect(new URL("/auth/login?banned=true", request.url));
        response.cookies.delete("token");
        // Add header to signal frontend to clear localStorage  
        response.headers.set('X-User-Banned', 'true');
        return response;
      }
      
      if (!user.is_admin) {
        // User is not admin, redirect to regular dashboard
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
