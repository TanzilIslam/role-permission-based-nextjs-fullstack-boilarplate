"use server"

import { revalidatePath } from "next/cache"

import { actionFailure, actionSuccess } from "@/lib/action-result"
import { withPermission } from "@/lib/auth-wrapper"
import {
  findRoleByKey,
  insertRole,
  listRoles,
  removeRole,
} from "@/lib/data/rbac"
import { toFormErrors } from "@/lib/validations/form"
import { roleSchema } from "@/lib/validations/rbac"
import type { ActionState, IRole } from "@/types"
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
