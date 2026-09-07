import "server-only"

import { prisma } from "@/lib/prisma"
import type { IPermission } from "@/types"
import { PermissionAction, Resource } from "@/types/enums"

/**
 * Capabilities the system cannot function without.
 *
 * Lose every active holder of one of these and the corresponding screen becomes
 * unreachable for everyone, with direct database access as the only repair.
 */
export const CRITICAL_CAPABILITIES = [
  {
    resource: Resource.USERS,
    action: PermissionAction.MANAGE,
    label: "manage users",
  },
  {
    resource: Resource.ROLES,
    action: PermissionAction.MANAGE,
    label: "manage roles and permissions",
  },
] as const

export type CriticalCapability = (typeof CRITICAL_CAPABILITIES)[number]

/** Widened so callers can pass any resource/action pair, not just the consts. */
export interface Capability {
  resource: Resource
  action: PermissionAction
}

/** True if this permission set satisfies the capability (MANAGE is a wildcard). */
export function grantsCapability(
  permissions: readonly Pick<IPermission, "resource" | "action">[],
  capability: Capability
): boolean {
  return permissions.some(
    (permission) =>
      permission.resource === capability.resource &&
      (permission.action === PermissionAction.MANAGE ||
        permission.action === capability.action)
  )
}

/**
 * Counts active users who hold `capability`, ignoring a given user and/or role.
 *
 * The exclusions let a caller ask "if this user or role stopped providing it,
 * would anyone else still have it?" — which is the question both mutation
 * paths need to answer before committing.
 */
export async function countActiveHolders(
  capability: Capability,
  exclude: { userId?: string; roleId?: string } = {}
): Promise<number> {
  return prisma.user.count({
    where: {
      status: "active",
      ...(exclude.userId ? { id: { not: exclude.userId } } : {}),
      role: {
        ...(exclude.roleId ? { id: { not: exclude.roleId } } : {}),
        permissions: {
          some: {
            resource: capability.resource,
            // MANAGE covers the requested action, so accept either.
            action: { in: [capability.action, PermissionAction.MANAGE] },
          },
        },
      },
    },
  })
}

/**
 * Blocks a change only when it removes the LAST active holder of a capability.
 *
 * Deliberately compares before and after: if nobody holds it already, the
 * change cannot make things worse and is allowed through, so a system that is
 * somehow already in that state stays repairable.
 */
export function breaksInvariant(input: {
  othersHold: number
  heldBefore: boolean
  heldAfter: boolean
}): boolean {
  const satisfiedBefore = input.othersHold > 0 || input.heldBefore
  const satisfiedAfter = input.othersHold > 0 || input.heldAfter
  return satisfiedBefore && !satisfiedAfter
}

/** Active users currently assigned to a role. */
export async function countActiveUsersInRole(roleId: string): Promise<number> {
  return prisma.user.count({ where: { status: "active", roleId } })
}
