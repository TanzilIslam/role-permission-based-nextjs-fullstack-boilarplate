import { getPermissionsAction } from "@/app/actions/permissions"
import { getRolesAction } from "@/app/actions/roles"
import { PermissionMatrix } from "@/components/dashboard/roles/permission-matrix"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function RolesPage() {
  const [rolesResult, permsResult] = await Promise.all([
    getRolesAction(),
    getPermissionsAction(),
  ])

  if (!rolesResult.success || !permsResult.success) {
    const message = !rolesResult.success
      ? rolesResult.message
      : permsResult.message

    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Role Management</h1>
        <p className="text-sm text-destructive">{message}</p>
      </div>
    )
  }

  const roles = rolesResult.data
  const allPermissions = permsResult.data

  if (roles.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Role Management</h1>
        <p className="text-sm text-muted-foreground">No roles defined yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Role Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage system roles and their associated permissions.
        </p>
      </div>

      {/* roles[0], not roles — the array itself has no id. */}
      <Tabs defaultValue={roles[0].id} className="w-full">
        <TabsList className="mb-4">
          {roles.map((role) => (
            <TabsTrigger key={role.id} value={role.id}>
              {role.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {roles.map((role) => (
          <TabsContent key={role.id} value={role.id}>
            <PermissionMatrix
              role={role}
              availablePermissions={allPermissions}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
