import "server-only"

import { SignJWT, jwtVerify } from "jose"

import type { SessionTokenPayload } from "@/types"

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days
const ALGORITHM = "HS256"

/**
 * Signed session tokens.
 *
 * `jose` is used rather than a Node-only JWT library because this module is
 * also imported by `proxy.ts`, which runs on the edge runtime.
 *
 * The token carries only the user id. Permissions are deliberately NOT embedded
 * — they are loaded fresh from the database on every request, so revoking a
 * grant takes effect immediately instead of when the token expires.
 */
function getKey() {
  const secret = process.env.SESSION_SECRET

  // Fail loudly. A missing secret must never silently degrade to unsigned or
  // predictably-signed tokens.
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short (need >= 32 chars). Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\""
    )
  }

  return new TextEncoder().encode(secret)
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getKey())
}

/**
 * Returns the payload for a valid token, or null for anything else — a forged
 * signature, a tampered payload, an expired token, or junk. Callers must treat
 * null as "no session".
 */
export async function verifySessionToken(
  token: string | undefined
): Promise<SessionTokenPayload | null> {
  if (!token) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, getKey(), {
      // Pinning the algorithm blocks alg-confusion attacks, including "none".
      algorithms: [ALGORITHM],
    })

    if (typeof payload.sub !== "string" || !payload.sub) {
      return null
    }

    return { userId: payload.sub, expiresAt: payload.exp ?? null }
  } catch {
    return null
  }
}

export { SESSION_MAX_AGE_SECONDS }
