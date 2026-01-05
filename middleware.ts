import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const isInternal = host.startsWith("internal.");

  const { pathname } = req.nextUrl;

  // -------------------------
  // INTERNAL DOMAIN RULES
  // -------------------------
  if (isInternal) {
    // Allow internal login + internal root
    if (pathname === "/login" || pathname === "/") {
      return NextResponse.next();
    }

    // Block everything else
    return NextResponse.redirect(
      new URL("/login", req.url)
    );
  }

  // -------------------------
  // PUBLIC DOMAIN RULES
  // -------------------------
  // Block internal login on public site
  if (pathname === "/login" && host.startsWith("internal.")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};