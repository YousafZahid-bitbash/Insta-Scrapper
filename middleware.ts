import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "./src/services/hikerApi";

const DASHBOARD_PATH = "/dashboard";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Protect all /dashboard routes
  if (pathname.startsWith(DASHBOARD_PATH)) {
    const token = request.cookies.get("token")?.value;
    if (!token || !verifyJWT(token)) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
