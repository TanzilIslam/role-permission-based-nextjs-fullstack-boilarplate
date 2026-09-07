import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"

import { findUserById } from "@/lib/data/rbac"
import { flattenPermissions, hasPermission } from "@/lib/permissions"
import { SESSION_COOKIE } from "@/lib/session-cookie"
import type { AuthSession } from "@/types"
import type { PermissionAction, Resource, UserRole } from "@/types/enums"

/**
 * Data Access Layer for the current session.
 *
 * This module is `server-only` on purpose: it is NOT a `"use server"` file, so
 * nothing here is reachable as a public POST endpoint. Server Actions stay thin
 * and delegate their auth/authz checks here, per the Next.js data-security
 * guidance.
 *
 * `cache()` dedupes the lookup across a single request, so a layout, a page and
 * an action all share one session read.
 */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (!token) {
    return null
  }

  // TODO: the cookie currently carries the raw user id. Replace with a signed,
  // expiring token (JWT or an opaque id backed by a Session table) and verify
  // it here — today anyone who guesses an id can mint a session.
  const user = await findUserById(token)

  if (!user || user.status !== "active") {
    return null
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.key as UserRole,
      permissions: flattenPermissions(
        user.role.permissions.map((permission) => ({
          id: permission.id,
          action: permission.action as PermissionAction,
          resource: permission.resource as Resource,
        }))
      ),
    },
  }
})

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized. Please sign in.") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends Error {
  constructor(
    message = "Forbidden: You do not have permission to perform this action."
  ) {
    super(message)
    this.name = "ForbiddenError"
  }
}

/** Asserts a session exists, returning it. */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession()

  if (!session) {
    throw new UnauthorizedError()
  }

  return session
}

/**
 * Asserts the current user may perform `action` on `resource`.
 *
 * Goes through `hasPermission`, so a `MANAGE` grant satisfies every action on
 * that resource — a plain `permissions.includes("roles:read")` check would
 * wrongly reject a user holding `roles:manage`.
 */
export async function requirePermission(
  resource: Resource,
  action: PermissionAction
): Promise<AuthSession> {
  const session = await requireSession()

  if (!hasPermission(session.user.permissions, resource, action)) {
    throw new ForbiddenError(
      `Forbidden: missing "${resource}:${action}" permission.`
    )
  }

  return session
}
