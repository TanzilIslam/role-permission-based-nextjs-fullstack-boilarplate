import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { SESSION_COOKIE } from "@/lib/session-cookie"
import { verifySessionToken } from "@/lib/session-token"

const publicRoutes = ["/login", "/register"]
const protectedRoutePrefix = "/dashboard"

/**
 * Next.js 16 renamed the Middleware file convention to Proxy. A `middleware.ts`
 * still runs, but the build emits a deprecation warning.
 *
 * This is an OPTIMISTIC check only: it reads the session cookie and nothing
 * else. Proxy runs on every request including prefetches, so no database or
 * session-decryption work belongs here — real authorization happens in the DAL
 * (`requirePermission`) and is re-checked inside every Server Action.
 */
export async function proxy(request: NextRequest) {
  const { nextUrl } = request
  const path = nextUrl.pathname
  // Signature verification is pure crypto with no database round-trip, so it
  // is cheap enough to run on every request and still counts as an optimistic
  // check. A forged or expired cookie is now rejected here at the edge rather
  // than being waved through to the page.
  const payload = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value
  )
  const isAuthenticated = payload !== null

  // Exact match, not startsWith: "/login" must not also match "/login-help".
  const isPublicRoute = publicRoutes.includes(path)
  const isProtectedRoute =
    path === protectedRoutePrefix || path.startsWith(`${protectedRoutePrefix}/`)

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url)
    // Preserved so the user lands where they were headed after signing in.
    loginUrl.searchParams.set("from", path)

    const response = NextResponse.redirect(loginUrl)
    // Clear an invalid/expired cookie so the browser stops resending it.
    if (request.cookies.has(SESSION_COOKIE)) {
      response.cookies.delete(SESSION_COOKIE)
    }
    return response
  }

  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL(protectedRoutePrefix, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
}
