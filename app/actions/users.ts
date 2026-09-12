"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

import { actionFailure, actionSuccess } from "@/lib/action-result"
import { withPermission } from "@/lib/auth-wrapper"
import {
  createUser,
  findRoleById,
  findUserByEmail,
  getUserById,
  listUsers,
  updateUser,
} from "@/lib/data/rbac"
import { hasPermission } from "@/lib/permissions"
import {
  CRITICAL_CAPABILITIES,
  breaksInvariant,
  countActiveHolders,
  grantsCapability,
} from "@/lib/rbac-invariants"
import { toFormErrors } from "@/lib/validations/form"
import { createUserSchema, userRoleUpdateSchema } from "@/lib/validations/rbac"
import type { ActionResult, IUser } from "@/types"
import { PermissionAction, Resource } from "@/types/enums"

export const getUsersAction = withPermission(
  Resource.USERS,
  PermissionAction.READ,
  async (): Promise<ActionResult<IUser[]>> =>
    actionSuccess("Users loaded.", await listUsers())
)

export const createUserAction = withPermission(
  Resource.USERS,
  PermissionAction.CREATE,
  async (
    session,
    input: {
      name: string
      email: string
      password: string
      roleId: string
      status?: string
    }
  ): Promise<ActionResult<IUser>> => {
    const validated = createUserSchema.safeParse(input)

    if (!validated.success) {
      return actionFailure("Validation failed.", toFormErrors(validated.error))
    }

    const { name, email, password, roleId, status } = validated.data

    const existing = await findUserByEmail(email)
    if (existing) {
      return actionFailure("A user with this email already exists.")
    }

    // Privilege-escalation guard: can't assign a role more powerful than yours.
    const targetRole = await findRoleById(roleId)
    if (!targetRole) {
      return actionFailure("Role not found.")
    }

    const escalations = targetRole.permissions.filter(
      (permission) =>
        !hasPermission(
          session.user.permissions,
          permission.resource,
          permission.action
        )
    )

    if (escalations.length > 0) {
      const list = escalations
        .map((p) => `${p.resource}:${p.action}`)
        .join(", ")
      return actionFailure(
        `You cannot assign "${targetRole.name}" because it grants permissions you do not hold yourself: ${list}.`
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await createUser({
      name,
      email,
      passwordHash,
      roleId,
      status,
    })

    revalidatePath("/dashboard/users")
    return actionSuccess(`${user.name} created.`, user)
  }
)

export const updateUserRoleAction = withPermission(
  Resource.USERS,
  PermissionAction.MANAGE,
  async (
    session,
    input: { userId: string; roleId?: string; status?: string }
  ): Promise<ActionResult<IUser>> => {
    const validated = userRoleUpdateSchema.safeParse(input)

    if (!validated.success) {
      return actionFailure("Validation failed.", toFormErrors(validated.error))
    }

    const { userId, roleId, status } = validated.data

    const target = await getUserById(userId)
    if (!target) {
      return actionFailure("User not found.")
    }

    const isSelf = userId === session.user.id

    // Downward-authority guard.
    //
    // The escalation check below stops you handing out more power than you
    // hold, but says nothing about acting on someone who already has more. An
    // ADMIN with users:manage could otherwise demote or deactivate every
    // SUPER_ADMIN, leaving nobody able to manage roles and no way back without
    // direct database access. You may only modify accounts whose current role
    // sits within your own permissions. (For your own account this is trivially
    // true, so self-edits fall through to the self-guards below.)
    const targetAuthority = target.role.permissions.filter(
      (permission) =>
        !hasPermission(
          session.user.permissions,
          permission.resource,
          permission.action
        )
    )

    if (targetAuthority.length > 0) {
      const list = targetAuthority
        .map((p) => `${p.resource}:${p.action}`)
        .join(", ")
      return actionFailure(
        `You cannot modify ${target.name}: their role "${target.role.name}" holds permissions you do not (${list}).`
      )
    }

    // Privilege-escalation guard.
    //
    // `users:manage` alone would otherwise be enough to hand out ANY role,
    // including one more powerful than the actor's own. An ADMIN holding
    // users:manage but not roles:manage could assign themselves SUPER_ADMIN and
    // acquire it. Rule: you may only grant a role whose permissions you already
    // hold yourself.
    if (roleId) {
      const nextRole = await findRoleById(roleId)
      if (!nextRole) {
        return actionFailure("Role not found.")
      }

      const escalations = nextRole.permissions.filter(
        (permission) =>
          !hasPermission(
            session.user.permissions,
            permission.resource,
            permission.action
          )
      )

      if (escalations.length > 0) {
        const list = escalations
          .map((p) => `${p.resource}:${p.action}`)
          .join(", ")
        return actionFailure(
          `You cannot assign "${nextRole.name}" because it grants permissions you do not hold yourself: ${list}.`
        )
      }

      // Self-demotion guard: mirrors the matrix. Moving yourself to a role
      // without users:manage locks you out of this screen irreversibly.
      if (isSelf) {
        const keepsUserManagement = nextRole.permissions.some(
          (permission) =>
            permission.resource === Resource.USERS &&
            (permission.action === PermissionAction.MANAGE ||
              permission.action === PermissionAction.UPDATE)
        )

        if (!keepsUserManagement) {
          return actionFailure(
            `This would move your own account to "${nextRole.name}", which cannot manage users, locking you out of this screen. Ask another administrator to make this change.`
          )
        }
      }
    }

    // Deactivating yourself ends your own session on the next request.
    if (isSelf && status && status !== "active") {
      return actionFailure(
        `You cannot set your own account to "${status}" — it would end your session immediately.`
      )
    }

    // Last-administrator invariant.
    //
    // The guards above stop you dismantling your OWN access; this stops the
    // system as a whole losing its last active administrator. Two SUPER_ADMINs
    // could otherwise demote or deactivate each other down to zero, leaving a
    // dashboard nobody can administer.
    const nextRoleForCheck = roleId ? await findRoleById(roleId) : target.role
    const nextStatus = status ?? target.status
    const wasActive = target.status === "active"
    const willBeActive = nextStatus === "active"

    for (const capability of CRITICAL_CAPABILITIES) {
      const othersHold = await countActiveHolders(capability, { userId })

      const heldBefore =
        wasActive && grantsCapability(target.role.permissions, capability)
      const heldAfter =
        willBeActive &&
        Boolean(nextRoleForCheck) &&
        grantsCapability(nextRoleForCheck!.permissions, capability)

      if (breaksInvariant({ othersHold, heldBefore, heldAfter })) {
        return actionFailure(
          `This would leave nobody able to ${capability.label}. ${target.name} is the last active user who can — assign that capability to another active user first.`
        )
      }
    }

    const updated = await updateUser(userId, { roleId, status })

    revalidatePath("/dashboard/users")
    return actionSuccess(`${updated.name} updated.`, updated)
  }
)
