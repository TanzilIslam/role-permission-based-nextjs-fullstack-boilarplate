import "server-only"

import { actionError } from "@/lib/action-result"
import { requirePermission } from "@/lib/dal"
import type { ActionResult, AuthSession } from "@/types"
import type { PermissionAction, Resource } from "@/types/enums"

/**
 * Wraps a Server Action so it cannot run without the required grant.
 *
 * Server Actions are reachable by direct POST, so this check must live on the
 * server side of the boundary — it is the real gate, not the UI.
 *
 * Authorization goes through `requirePermission`, which is wildcard-aware: a
 * `MANAGE` grant satisfies every action on that resource. A plain
 * `permissions.includes("roles:read")` check would reject a user holding
 * `roles:manage`.
 *
 * The handler receives the verified session as its first argument, so it never
 * has to re-fetch it.
 */
export function withPermission<TArgs extends unknown[], TData>(
  resource: Resource,
  action: PermissionAction,
  handler: (
    session: AuthSession,
    ...args: TArgs
  ) => Promise<ActionResult<TData>>
): (...args: TArgs) => Promise<ActionResult<TData>> {
  return async function guarded(...args: TArgs) {
    try {
      const session = await requirePermission(resource, action)
      return await handler(session, ...args)
    } catch (error) {
      // Logged server-side; only the message crosses back to the client.
      console.error(`Action denied for [${resource}:${action}]:`, error)
      return actionError(error)
    }
  }
}
