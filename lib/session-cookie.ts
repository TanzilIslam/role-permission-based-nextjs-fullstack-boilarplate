/**
 * Shared session cookie name.
 *
 * Kept out of `lib/dal.ts` because that module is `server-only`, which cannot
 * be imported from `proxy.ts` (edge runtime).
 */
export const SESSION_COOKIE = "session_token"
