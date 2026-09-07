import { redirect } from "next/navigation"

import { Sidebar } from "@/components/dashboard/sidebar"
import { AuthProvider } from "@/components/providers/auth-provider"
import { getSession } from "@/lib/dal"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read once on the server and hand it to the client provider, so the sidebar
  // has permissions on first paint with no fetch-on-mount flash.
  const session = await getSession()

  // Proxy only checks that a cookie exists (an optimistic check, by design).
  // This is the authoritative one: a forged, stale or revoked token gets the
  // user sent to /login rather than a dashboard full of "Unauthorized".
  if (!session) {
    redirect("/login")
  }

  return (
    <AuthProvider initialSession={session}>
      <div className="flex h-svh overflow-hidden bg-background">
        <Sidebar className="hidden shrink-0 md:flex" />

        <div className="flex flex-1 flex-col overflow-y-auto">
          <header className="flex h-16 items-center border-b px-6 md:hidden">
            <h1 className="text-lg font-bold">RBAC Dashboard</h1>
          </header>

          <main className="flex-1 p-6 md:p-8">{children}</main>
        </div>
      </div>
    </AuthProvider>
  )
}
