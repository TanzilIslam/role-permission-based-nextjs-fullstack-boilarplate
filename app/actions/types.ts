"use server"

import { revalidatePath } from "next/cache"

import { actionFailure, actionSuccess } from "@/lib/action-result"
import { withPermission } from "@/lib/auth-wrapper"
import { insertType, listTypes, removeType, updateType } from "@/lib/data/types"
import { toFormErrors } from "@/lib/validations/form"
import { typeSchema, typeUpdateSchema } from "@/lib/validations/types"
import type { ActionResult, IType } from "@/types"
import { PermissionAction, Resource } from "@/types/enums"

export const getTypesAction = withPermission(
  Resource.TYPES,
  PermissionAction.READ,
  async (): Promise<ActionResult<IType[]>> =>
    actionSuccess("Types loaded.", await listTypes())
)

export const createTypeAction = withPermission(
  Resource.TYPES,
  PermissionAction.CREATE,
  async (_session, input: { name: string }): Promise<ActionResult<IType>> => {
    const validated = typeSchema.safeParse(input)

    if (!validated.success) {
      return actionFailure("Validation failed.", toFormErrors(validated.error))
    }

    const created = await insertType(validated.data.name)

    revalidatePath("/dashboard/types")
    return actionSuccess("Type created.", created)
  }
)

export const updateTypeAction = withPermission(
  Resource.TYPES,
  PermissionAction.UPDATE,
  async (
    _session,
    input: { id: string; name: string }
  ): Promise<ActionResult<IType>> => {
    const validated = typeUpdateSchema.safeParse(input)

    if (!validated.success) {
      return actionFailure("Validation failed.", toFormErrors(validated.error))
    }

    const updated = await updateType(validated.data.id, validated.data.name)
    if (!updated) {
      return actionFailure("Type not found.")
    }

    revalidatePath("/dashboard/types")
    return actionSuccess("Type updated.", updated)
  }
)

export const deleteTypeAction = withPermission(
  Resource.TYPES,
  PermissionAction.DELETE,
  async (_session, typeId: string) => {
    if (!(await removeType(typeId))) {
      return actionFailure("Type not found.")
    }

    revalidatePath("/dashboard/types")
    return actionSuccess("Type deleted.", undefined)
  }
)
