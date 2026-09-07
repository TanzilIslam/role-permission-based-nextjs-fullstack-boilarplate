import { PermissionGuard } from "@/components/auth/permission-guard"
import { PermissionAction, Resource } from "@/types/enums"

export default async function UsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Users</h1>

      {/* Guard rather than a bare requirePermission(): throwing ForbiddenError
          from a Server Component surfaces as a 500. Next's forbidden() would be
          the tidier primitive but is still behind the experimental
          `authInterrupts` flag. */}
      <PermissionGuard
        resource={Resource.USERS}
        action={PermissionAction.READ}
        fallback={
          <p className="text-sm text-destructive">
            You do not have permission to view users.
          </p>
        }
      >
        <p className="text-sm text-muted-foreground">
          User management table goes here next.
        </p>
      </PermissionGuard>
    </div>
  )
}
