import { getRolesAction } from "@/app/actions/roles"

export default async function RolesPage() {
  const roles = await getRolesAction()

  if (!roles.success) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Roles &amp; Permissions</h1>
        <p className="text-sm text-destructive">{roles.message}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Roles &amp; Permissions</h1>
        <p className="text-sm text-muted-foreground">
          {roles.data.length} roles, loaded from Postgres.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Key</th>
              <th className="p-3 font-medium">Grants</th>
            </tr>
          </thead>
          <tbody>
            {roles.data.map((role) => (
              <tr key={role.id} className="border-b last:border-0">
                <td className="p-3">{role.name}</td>
                <td className="p-3">
                  <code className="text-xs">{role.key}</code>
                </td>
                <td className="p-3 text-muted-foreground">
                  {role.permissions
                    .map((p) => `${p.resource}:${p.action}`)
                    .join(", ") || "none"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        The editable permission matrix goes here next.
      </p>
    </div>
  )
}
