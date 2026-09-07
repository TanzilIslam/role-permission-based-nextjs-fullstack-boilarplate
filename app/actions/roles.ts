"use server"

import { revalidatePath } from "next/cache"

import { actionFailure, actionSuccess } from "@/lib/action-result"
import { withPermission } from "@/lib/auth-wrapper"
import {
  findPermissionsByIds,
  findRoleById,
  findRoleByKey,
  insertRole,
  listRoles,
  removeRole,
  setRolePermissions,
} from "@/lib/data/rbac"
import { toFormErrors } from "@/lib/validations/form"
import { flattenPermissions, hasPermission } from "@/lib/permissions"
import { rolePermissionsSchema, roleSchema } from "@/lib/validations/rbac"
import type { ActionResult, ActionState, IRole } from "@/types"
import { PermissionAction, Resource } from "@/types/enums"

export const getRolesAction = withPermission(
  Resource.ROLES,
  PermissionAction.READ,
  async () => actionSuccess("Roles loaded.", await listRoles())
)

export const createRoleAction = withPermission(
  Resource.ROLES,
  PermissionAction.MANAGE,
  async (_session, _prevState: ActionState<IRole>, formData: FormData) => {
    const validated = roleSchema.safeParse({
      name: formData.get("name"),
      key: formData.get("key"),
      permissionIds: formData.getAll("permissionIds"),
    })

    if (!validated.success) {
      return actionFailure("Validation failed.", toFormErrors(validated.error))
    }

    const { name, key, permissionIds } = validated.data

    // Role.key is @unique in the schema; check first so the user gets a field
    // error instead of a unique-constraint crash.
    if (await findRoleByKey(key)) {
      return actionFailure("Validation failed.", {
        key: [`A role with key "${key}" already exists.`],
      })
    }

    const created = await insertRole({ name, key, permissionIds })

    revalidatePath("/dashboard/roles")
    return actionSuccess("Role created successfully!", created)
  }
)

export const deleteRoleAction = withPermission(
  Resource.ROLES,
  PermissionAction.MANAGE,
  async (_session, roleId: string) => {
    if (!(await removeRole(roleId))) {
      return actionFailure("Role not found.")
    }

    revalidatePath("/dashboard/roles")
    return actionSuccess("Role deleted successfully.", undefined)
  }
)

export const updateRolePermissionsAction = withPermission(
  Resource.ROLES,
  PermissionAction.MANAGE,
  async (
    session,
    input: { roleId: string; permissionIds: string[] }
  ): Promise<ActionResult<IRole>> => {
    const validated = rolePermissionsSchema.safeParse(input)

    if (!validated.success) {
      return actionFailure("Validation failed.", toFormErrors(validated.error))
    }

    const { roleId, permissionIds } = validated.data

    const role = await findRoleById(roleId)
    if (!role) {
      return actionFailure("Role not found.")
    }

    // Reject unknown ids rather than letting Prisma throw a foreign-key error.
    const resolved = await findPermissionsByIds(permissionIds)
    if (resolved.length !== permissionIds.length) {
      return actionFailure("One or more permissions no longer exist.")
    }

    // Self-lockout guard.
    //
    // Editing your OWN role is the one change that can be irreversible through
    // the UI: strip `roles:manage` from yourself and nobody can reach this
    // screen again, leaving direct database access as the only repair. Grants
    // to other roles stay unrestricted.
    if (role.key === session.user.role) {
      const next = flattenPermissions(resolved)

      if (!hasPermission(next, Resource.ROLES, PermissionAction.MANAGE)) {
        return actionFailure(
          `This would remove "roles:manage" from your own role (${role.key}) and lock you out of role management. Grant it to another role first, or keep it enabled here.`
        )
      }
    }

    const updated = await setRolePermissions(roleId, permissionIds)

    revalidatePath("/dashboard/roles")
    return actionSuccess(`Permissions updated for ${updated.name}.`, updated)
  }
)
