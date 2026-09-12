import { getRolesAction } from "@/app/actions/roles"
import { getUsersAction } from "@/app/actions/users"
import { CreateUserDialog } from "@/components/dashboard/users/create-user-dialog"
import { UserTable } from "@/components/dashboard/users/user-table"
import { getSession } from "@/lib/dal"

export default async function UsersPage() {
  const session = await getSession()
  const [usersResult, rolesResult] = await Promise.all([
    getUsersAction(),
    getRolesAction(),
  ])

  if (!usersResult.success) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-destructive">{usersResult.message}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage your team members and their account privileges.
          </p>
        </div>
        {rolesResult.success ? (
          <CreateUserDialog roles={rolesResult.data} />
        ) : null}
      </div>

      {/* Role reassignment needs the role list. Reading roles requires
          roles:read, which a users-only administrator may not hold — so the
          table degrades to read-only rather than the page failing. */}
      {!rolesResult.success ? (
        <p className="text-sm text-muted-foreground">
          Roles could not be loaded ({rolesResult.message}) — role reassignment
          is unavailable.
        </p>
      ) : null}

      <UserTable
        users={usersResult.data}
        roles={rolesResult.success ? rolesResult.data : []}
        currentUserId={session?.user.id ?? ""}
      />
    </div>
  )
}
