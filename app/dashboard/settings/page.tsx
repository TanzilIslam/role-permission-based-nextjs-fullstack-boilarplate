import { PermissionGuard } from "@/components/auth/permission-guard"
import { Button } from "@/components/ui/button"
import { PermissionAction, Resource } from "@/types/enums"

export default async function SettingsPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Workspace Settings</h1>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Profile Settings</h2>
        <p className="text-sm text-muted-foreground">
          Modify your public details here.
        </p>
      </section>

      <PermissionGuard
        resource={Resource.ROLES}
        action={PermissionAction.MANAGE}
        fallback={
          <p className="text-sm text-destructive">
            Access restricted to System Administrators.
          </p>
        }
      >
        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">
            Security &amp; RBAC Controls
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Edit custom user roles and permissions.
          </p>
          <Button variant="destructive">Configure Policy Matrices</Button>
        </section>
      </PermissionGuard>

      <PermissionGuard
        resource={Resource.SETTINGS}
        action={PermissionAction.MANAGE}
        fallback={
          <p className="text-sm text-muted-foreground">
            (Billing panel hidden — requires settings:manage, which the mock
            session does not grant.)
          </p>
        }
      >
        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Billing</h2>
        </section>
      </PermissionGuard>
    </div>
  )
}
