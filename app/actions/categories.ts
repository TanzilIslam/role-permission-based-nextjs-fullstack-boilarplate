"use server"

import { revalidatePath } from "next/cache"

import { actionFailure, actionSuccess } from "@/lib/action-result"
import { withPermission } from "@/lib/auth-wrapper"
import {
  insertCategory,
  listCategories,
  removeCategory,
  updateCategory,
} from "@/lib/data/categories"
import { toFormErrors } from "@/lib/validations/form"
import {
  categorySchema,
  categoryUpdateSchema,
} from "@/lib/validations/categories"
import type { ActionResult, ICategory } from "@/types"
import { PermissionAction, Resource } from "@/types/enums"

export const getCategoriesAction = withPermission(
  Resource.CATEGORIES,
  PermissionAction.READ,
  async (): Promise<ActionResult<ICategory[]>> =>
    actionSuccess("Categories loaded.", await listCategories())
)

export const createCategoryAction = withPermission(
  Resource.CATEGORIES,
  PermissionAction.CREATE,
  async (
    _session,
    input: { name: string; description?: string }
  ): Promise<ActionResult<ICategory>> => {
    const validated = categorySchema.safeParse(input)

    if (!validated.success) {
      return actionFailure("Validation failed.", toFormErrors(validated.error))
    }

    const created = await insertCategory(validated.data)

    revalidatePath("/dashboard/categories")
    return actionSuccess("Category created.", created)
  }
)

export const updateCategoryAction = withPermission(
  Resource.CATEGORIES,
  PermissionAction.UPDATE,
  async (
    _session,
    input: { id: string; name: string; description?: string }
  ): Promise<ActionResult<ICategory>> => {
    const validated = categoryUpdateSchema.safeParse(input)

    if (!validated.success) {
      return actionFailure("Validation failed.", toFormErrors(validated.error))
    }

    const { id, ...data } = validated.data
    const updated = await updateCategory(id, data)
    if (!updated) {
      return actionFailure("Category not found.")
    }

    revalidatePath("/dashboard/categories")
    return actionSuccess("Category updated.", updated)
  }
)

export const deleteCategoryAction = withPermission(
  Resource.CATEGORIES,
  PermissionAction.DELETE,
  async (_session, categoryId: string) => {
    if (!(await removeCategory(categoryId))) {
      return actionFailure("Category not found.")
    }

    revalidatePath("/dashboard/categories")
    return actionSuccess("Category deleted.", undefined)
  }
)
