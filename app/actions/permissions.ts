"use server"

import { actionSuccess } from "@/lib/action-result"
import { withPermission } from "@/lib/auth-wrapper"
import { listPermissions } from "@/lib/data/rbac"
import { PermissionAction, Resource } from "@/types/enums"

export const getPermissionsAction = withPermission(
  Resource.PERMISSIONS,
  PermissionAction.READ,
  async () => actionSuccess("Permissions loaded.", await listPermissions())
)
