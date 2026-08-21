import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "sitetracker_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  // Protected paths that require authenticated role session
  const isProtectedPath =
    pathname.startsWith("/findings/new") ||
    pathname.startsWith("/pic/tasks");

  if (isProtectedPath && !sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/findings/new", "/pic/tasks/:path*"],
};
