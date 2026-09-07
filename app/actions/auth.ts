"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { actionError, actionFailure, actionSuccess } from "@/lib/action-result"
import { findUserByEmail } from "@/lib/data/rbac"
import { getSession } from "@/lib/dal"
import { SESSION_COOKIE } from "@/lib/session-cookie"
import { SESSION_MAX_AGE_SECONDS, signSessionToken } from "@/lib/session-token"
import { loginSchema } from "@/lib/validations/auth"
import { toFormErrors } from "@/lib/validations/form"
import type { ActionResult, ActionState, AuthSession } from "@/types"
import bcrypt from "bcryptjs"

type LoginData = AuthSession["user"]

/**
 * Only same-origin absolute paths may be used as a post-login destination.
 * Rejecting "//evil.com" and absolute URLs prevents an open redirect via the
 * `from` parameter that Proxy attaches.
 */
function safeRedirectPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null
  }

  return value
}

/**
 * Validates login credentials and initiates a secure session.
 */
export async function loginAction(
  _prevState: ActionState<LoginData>,
  formData: FormData
): Promise<ActionResult<LoginData>> {
  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!validatedFields.success) {
    return actionFailure(
      "Please fix the validation errors.",
      toFormErrors(validatedFields.error)
    )
  }

  try {
    const record = await findUserByEmail(validatedFields.data.email)

    // Compare unconditionally against a dummy hash when the user is missing, so
    // a non-existent email and a wrong password take the same time to answer.
    const storedHash =
      record?.passwordHash ??
      "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv"
    const passwordMatches = await bcrypt.compare(
      validatedFields.data.password,
      storedHash
    )

    if (!record || !passwordMatches || record.status !== "active") {
      return actionFailure("Invalid email or password.")
    }

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, await signSessionToken(record.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    })

    revalidatePath("/dashboard")
  } catch {
    // Deliberately generic: never reveal whether the email or the password was
    // the part that did not match.
    return actionFailure("Invalid email or password.")
  }

  // `redirect()` signals by throwing, so it must run OUTSIDE the try/catch —
  // inside, the catch would swallow the redirect and report a login failure.
  // Always redirect on success. Doing it here rather than in a client effect
  // means there is no window where the form shows "signed in" but the browser
  // has not moved, and no useEffect/router.push round-trip to get wrong.
  redirect(safeRedirectPath(formData.get("from")) ?? "/dashboard")
}

/**
 * Retrieves the current authenticated session.
 *
 * Delegates to the `server-only` DAL, which is where the cookie is actually
 * read and verified.
 */
export async function getCurrentUserAction(): Promise<AuthSession | null> {
  return getSession()
}

/**
 * Destroys the current secure session.
 */
export async function logoutAction(): Promise<ActionResult<undefined>> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
    revalidatePath("/")
    return actionSuccess("Successfully logged out.", undefined)
  } catch (error) {
    return actionError(error)
  }
}
