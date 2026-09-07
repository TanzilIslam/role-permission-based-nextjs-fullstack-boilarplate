"use client"

import * as React from "react"

import { getCurrentUserAction } from "@/app/actions/auth"
import { hasPermission as checkPermission } from "@/lib/permissions"
import type { AuthSession } from "@/types"
import type { PermissionAction, Resource } from "@/types/enums"

interface AuthContextType {
  user: AuthSession["user"] | null
  /** True only while an explicit `refreshSession()` is in flight. */
  isLoading: boolean
  hasPermission: (resource: Resource, action: PermissionAction) => boolean
  hasAnyPermission: (
    resource: Resource,
    actions: readonly PermissionAction[]
  ) => boolean
  refreshSession: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

/**
 * Client-side session cache for interactive components.
 *
 * The session is seeded from the server via `initialSession` rather than
 * fetched in an effect. Fetching on mount would round-trip on every page load,
 * flash a loading state, and trip `react-hooks/set-state-in-effect` — which is
 * an error in this project's lint config.
 *
 * This layer is convenience only. It decides what a user *sees*; every Server
 * Action still re-checks with `withPermission`.
 */
export function AuthProvider({
  initialSession,
  children,
}: {
  initialSession: AuthSession | null
  children: React.ReactNode
}) {
  const [user, setUser] = React.useState<AuthSession["user"] | null>(
    initialSession?.user ?? null
  )
  const [isLoading, setIsLoading] = React.useState(false)

  const refreshSession = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const session = await getCurrentUserAction()
      setUser(session?.user ?? null)
    } catch (error) {
      console.error("Failed to refresh session:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Delegates to the same `hasPermission` the server uses, so a MANAGE grant
  // behaves identically on both sides and the UI can never disagree with the
  // action it triggers.
  const hasPermission = React.useCallback(
    (resource: Resource, action: PermissionAction) =>
      user ? checkPermission(user.permissions, resource, action) : false,
    [user]
  )

  const hasAnyPermission = React.useCallback(
    (resource: Resource, actions: readonly PermissionAction[]) =>
      actions.some((action) => hasPermission(resource, action)),
    [hasPermission]
  )

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      hasPermission,
      hasAnyPermission,
      refreshSession,
    }),
    [user, isLoading, hasPermission, hasAnyPermission, refreshSession]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
