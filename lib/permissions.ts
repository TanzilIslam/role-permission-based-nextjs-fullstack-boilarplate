import type { IPermission, PermissionKey } from "@/types"
import { PermissionAction, Resource } from "@/types/enums"

/** Builds the canonical `resource:action` key. */
export function toPermissionKey(
  resource: Resource,
  action: PermissionAction
): PermissionKey {
  return `${resource}:${action}`
}

/** Flattens role permissions into the string list carried on `AuthSession`. */
export function flattenPermissions(
  permissions: readonly IPermission[]
): PermissionKey[] {
  return permissions.map((permission) =>
    toPermissionKey(permission.resource, permission.action)
  )
}

/**
 * Checks a flattened permission list.
 *
 * `PermissionAction.MANAGE` acts as a wildcard: holding `users:manage` grants
 * every action on `users`, so it must be checked before the exact key.
 */
export function hasPermission(
  granted: readonly string[],
  resource: Resource,
  action: PermissionAction
): boolean {
  return (
    granted.includes(toPermissionKey(resource, PermissionAction.MANAGE)) ||
    granted.includes(toPermissionKey(resource, action))
  )
}

export function hasAnyPermission(
  granted: readonly string[],
  resource: Resource,
  actions: readonly PermissionAction[]
): boolean {
  return actions.some((action) => hasPermission(granted, resource, action))
}

export function hasAllPermissions(
  granted: readonly string[],
  resource: Resource,
  actions: readonly PermissionAction[]
): boolean {
  return actions.every((action) => hasPermission(granted, resource, action))
}

/**
 * Every resource at `MANAGE` level.
 *
 * This is how a super admin gets blanket access. A client-only master key such
 * as `"*:*"` would be honoured by the UI but ignored by `requirePermission` on
 * the server, so the button would enable and the action would still refuse.
 * Granting real `MANAGE` keys keeps one source of truth on both sides.
 */
export function superAdminPermissions(): PermissionKey[] {
  return Object.values(Resource).map((resource) =>
    toPermissionKey(resource, PermissionAction.MANAGE)
  )
}
