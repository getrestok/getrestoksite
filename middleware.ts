import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";

  const isInternal = host.startsWith("internal.");

  // If someone tries to hit /internal on public domain → block
  if (!isInternal && req.nextUrl.pathname.startsWith("/internal")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If internal subdomain → allow ONLY /internal routes
  if (isInternal && !req.nextUrl.pathname.startsWith("/internal")) {
    return NextResponse.redirect(new URL("/internal", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};