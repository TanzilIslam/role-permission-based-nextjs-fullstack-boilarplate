"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react"

import { logoutAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { usePermission } from "@/hooks/use-permission"
import { cn } from "@/lib/utils"
import { PermissionAction, Resource } from "@/types/enums"

// Permissions are enum pairs rather than "roles:read" strings, so a typo is a
// compile error and MANAGE grants resolve through the same shared checker the
// server uses.
const routes = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    href: "/dashboard",
    resource: Resource.DASHBOARD,
    action: PermissionAction.READ,
  },
  {
    label: "Users",
    icon: Users,
    href: "/dashboard/users",
    resource: Resource.USERS,
    action: PermissionAction.READ,
  },
  {
    label: "Roles & Permissions",
    icon: ShieldCheck,
    href: "/dashboard/roles",
    resource: Resource.ROLES,
    action: PermissionAction.READ,
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
    resource: Resource.SETTINGS,
    action: PermissionAction.READ,
  },
] as const

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, hasPermission } = usePermission()

  async function handleLogout() {
    await logoutAction()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside
      className={cn(
        "flex h-svh w-64 flex-col border-r bg-card text-card-foreground",
        className
      )}
    >
      <div className="flex h-16 items-center border-b px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <ShieldAlert className="size-5 text-primary" />
          <span>RBAC Engine</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-4 py-6">
        {routes
          .filter((route) => hasPermission(route.resource, route.action))
          .map((route) => {
            // Exact match for the index route, prefix for the rest — otherwise
            // "/dashboard" stays highlighted on every child page.
            const isActive =
              route.href === "/dashboard"
                ? pathname === route.href
                : pathname.startsWith(route.href)

            return (
              <Link
                key={route.href}
                href={route.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <route.icon className="size-4" />
                {route.label}
              </Link>
            )
          })}
      </nav>

      {user ? (
        <div className="flex flex-col gap-3 border-t p-4">
          <div className="flex flex-col px-2">
            <span className="truncate text-sm font-semibold">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.role}
            </span>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </div>
      ) : null}
    </aside>
  )
}
