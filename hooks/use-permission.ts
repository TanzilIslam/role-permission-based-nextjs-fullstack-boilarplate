"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { PermissionAction, type Resource } from "@/types/enums"

/**
 * Verifies granular permissions inside Client Components.
 *
 * The CRUD shorthands do not need to also test `${resource}:manage` — the
 * shared `hasPermission` already treats a MANAGE grant as covering every action
 * on that resource.
 */
export function usePermission() {
  const { user, isLoading, hasPermission, hasAnyPermission, refreshSession } =
    useAuth()

  return {
    user,
    isLoading,
    hasPermission,
    hasAnyPermission,
    refreshSession,
    canCreate: (resource: Resource) =>
      hasPermission(resource, PermissionAction.CREATE),
    canRead: (resource: Resource) =>
      hasPermission(resource, PermissionAction.READ),
    canUpdate: (resource: Resource) =>
      hasPermission(resource, PermissionAction.UPDATE),
    canDelete: (resource: Resource) =>
      hasPermission(resource, PermissionAction.DELETE),
  }
}
