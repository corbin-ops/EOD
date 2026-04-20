import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSafeRedirect, hasValidSession } from "@/lib/auth";

const PUBLIC_PATH_PREFIXES = ["/_next", "/favicon.ico", "/login", "/api/auth/login"];
const ALWAYS_ALLOWED_PATHS = new Set(["/api/auth/logout"]);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    ALWAYS_ALLOWED_PATHS.has(pathname)
  ) {
    return NextResponse.next();
  }

  const authenticated = await hasValidSession(request.cookies);

  if (authenticated) {
    return NextResponse.next();
  }

  const redirectTarget = getSafeRedirect(`${pathname}${search}`);
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirectTo", redirectTarget);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
