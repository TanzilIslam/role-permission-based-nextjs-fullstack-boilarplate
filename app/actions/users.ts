"use server"

import { revalidatePath } from "next/cache"

import { actionFailure, actionSuccess } from "@/lib/action-result"
import { withPermission } from "@/lib/auth-wrapper"
import {
  findRoleById,
  getUserById,
  listUsers,
  updateUser,
} from "@/lib/data/rbac"
import { hasPermission } from "@/lib/permissions"
import { toFormErrors } from "@/lib/validations/form"
import { userRoleUpdateSchema } from "@/lib/validations/rbac"
import type { ActionResult, IUser } from "@/types"
import { PermissionAction, Resource } from "@/types/enums"

export const getUsersAction = withPermission(
  Resource.USERS,
  PermissionAction.READ,
  async (): Promise<ActionResult<IUser[]>> =>
    actionSuccess("Users loaded.", await listUsers())
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

    const updated = await updateUser(userId, { roleId, status })

    revalidatePath("/dashboard/users")
    return actionSuccess(`${updated.name} updated.`, updated)
  }
)
