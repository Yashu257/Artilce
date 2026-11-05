import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/articles", "/documents", "/ai-assistant", "/admin", "/bookmarks"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();
  // Session lives in the httpOnly mkp_session cookie; the AppShell verifies it
  // authoritatively via GET /auth/me. Middleware only redirects when no cookie exists at all.
  if (!req.cookies.get("mkp_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/articles/:path*", "/documents/:path*", "/ai-assistant/:path*", "/admin/:path*", "/bookmarks/:path*"] };
