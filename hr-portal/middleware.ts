import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login", "/_next", "/favicon", "/api/auth/login"]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isPublic(pathname) || pathname.startsWith("/api/")) return NextResponse.next()

  const hasSession = request.cookies.has("hr_portal_session")
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
