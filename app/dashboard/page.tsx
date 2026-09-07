import { getPermissionsAction } from "@/app/actions/permissions"
import { getRolesAction } from "@/app/actions/roles"
import { DeleteUserButton } from "@/components/users/delete-user-button"
import { getSession } from "@/lib/dal"

export default async function DashboardPage() {
  const session = await getSession()
  const [roles, permissions] = await Promise.all([
    getRolesAction(),
    getPermissionsAction(),
  ])

  const stats = [
    { label: "Roles", value: roles.success ? roles.data.length : "—" },
    {
      label: "Permissions",
      value: permissions.success ? permissions.data.length : "—",
    },
    { label: "Your grants", value: session?.user.permissions.length ?? 0 },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {session?.user.email} ({session?.user.role})
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Client-side permission state</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          This control reads the shared permission checker through
          usePermission, so it matches what the server would allow.
        </p>
        <DeleteUserButton userId={session?.user.id ?? ""} />
      </section>
    </div>
  )
}
