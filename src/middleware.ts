import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

const allowGuestWhileAuthDisabled =
  process.env.NEXT_PUBLIC_ALLOW_GUEST_WITHOUT_DB !== "false";

export default auth((req) => {
  const path = req.nextUrl.pathname;

  if (
    path.startsWith("/api/auth") ||
    path.startsWith("/api/v1/auth/") ||
    path.startsWith("/api/v1/webhooks/") ||
    path.startsWith("/guest-login") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const dbConfigured = Boolean(process.env.DATABASE_URL);

  if (!dbConfigured && allowGuestWhileAuthDisabled) {
    return NextResponse.next();
  }

  const requireAuth =
    process.env.NEXT_PUBLIC_REQUIRE_AUTH === "true" ||
    process.env.REQUIRE_AUTH === "true";

  if (!requireAuth) {
    return NextResponse.next();
  }

  if (!req.auth?.user?.id) {
    const url = req.nextUrl.clone();
    url.pathname = "/guest-login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/studio/:path*",
    "/dj/:path*",
    /*
     * Include `/api/v1` itself so `/api/v1/projects` matches (no trailing segment).
     * `:path*` alone does not match zero segments on some Next versions.
     */
    "/api/v1",
    "/api/v1/:path*",
  ],
};
