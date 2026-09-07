import type { ReactNode } from "react"

import { getSession } from "@/lib/dal"
import { hasPermission } from "@/lib/permissions"
import type { PermissionAction, Resource } from "@/types/enums"

interface PermissionGuardProps {
  resource: Resource
  action: PermissionAction
  /** Shown when the user lacks the grant. Defaults to rendering nothing. */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Declaratively hides UI a user may not act on, inside a Server Component.
 *
 * This is presentation only. It stops a control from being *shown*, not from
 * being *invoked* — the Server Action behind it must still guard itself with
 * `withPermission`.
 *
 * Reads the session through the DAL rather than a Server Action, so it is a
 * plain server-side call instead of a public POST endpoint. `getSession` is
 * request-cached, so several guards on one page share a single read.
 */
export async function PermissionGuard({
  resource,
  action,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const session = await getSession()

  if (!session || !hasPermission(session.user.permissions, resource, action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
