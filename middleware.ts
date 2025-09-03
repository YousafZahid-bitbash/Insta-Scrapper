import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT, type JWTUserPayload } from "./src/services/hikerApi";
import { supabase } from "./src/supabaseClient";

const DASHBOARD_PATH = "/dashboard";
const ADMIN_PATH = "/admin";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protect all /dashboard routes
  if (pathname.startsWith(DASHBOARD_PATH)) {
    const token = request.cookies.get("token")?.value;
    const verified = token ? await verifyJWT(token) : null;
    if (!token || !verified) {
      // Debug: return token and verification result in response
      return new Response(
        JSON.stringify({ token, verified }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
      // To enable redirect again, comment out above and uncomment below:
      // return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }
  
  // Protect all /admin routes - require admin role
  if (pathname.startsWith(ADMIN_PATH)) {
    const token = request.cookies.get("token")?.value;
    const verified: JWTUserPayload | null = token ? await verifyJWT(token) : null;
    
    if (!token || !verified) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    
    // Check if user exists and is admin
    // TODO: Replace this with is_admin column check once the column is added
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', verified.user_id)
        .eq('is_active', true)
        .single();
        
      // Temporary: Define admin emails here until is_admin column is added
      const adminEmails = [
        'admin@example.com', // Replace with your actual admin email
        verified.email, // Allow the currently logged-in user for testing
      ];
        
      if (error || !user || !adminEmails.includes(user.email)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (error) {
      console.error('Admin verification error:', error);
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
