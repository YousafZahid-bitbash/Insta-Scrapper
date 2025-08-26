import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "./src/services/hikerApi";

const DASHBOARD_PATH = "/dashboard";

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
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
