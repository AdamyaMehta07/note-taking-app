import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

// Only /notes/* needs a logged-in user. /share/[token] is intentionally public -
// anyone with the link should be able to reach it (that's the whole point of a
// share link), auth/access checks for that happen inside the page itself.
export const config = {
  matcher: ["/notes/:path*"],
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
