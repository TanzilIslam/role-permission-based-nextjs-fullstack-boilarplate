"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { updateUserRoleAction } from "@/app/actions/users"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { IRole, IUser, UserStatus } from "@/types"

interface UserTableProps {
  users: IUser[]
  roles: IRole[]
  /** Used to mark the current user's own row and disable self-edits. */
  currentUserId: string
}

const STATUSES: UserStatus[] = ["active", "inactive", "pending"]

/** "Tanzil Islam" -> "TI". AvatarFallback should be initials, not the name. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function UserTable({ users, roles, currentUserId }: UserTableProps) {
  const [isPending, startTransition] = useTransition()

  function handleUpdate(
    userId: string,
    updates: { roleId?: string; status?: UserStatus }
  ) {
    startTransition(async () => {
      const result = await updateUserRoleAction({ userId, ...updates })

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Set status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId

            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      {user.image ? (
                        <AvatarImage src={user.image} alt="" />
                      ) : null}
                      <AvatarFallback>{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {user.name}
                        {isSelf ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (you)
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Select
                    // Self-edits are blocked server-side; disabling here just
                    // avoids offering an action that will be refused.
                    disabled={isPending || isSelf}
                    value={user.role.id}
                    onValueChange={(value) =>
                      handleUpdate(user.id, { roleId: String(value) })
                    }
                  >
                    <SelectTrigger className="h-8 w-[160px] text-xs">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell>
                  <Badge
                    variant={user.status === "active" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {user.status}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <Select
                    disabled={isPending || isSelf}
                    value={user.status}
                    onValueChange={(value) =>
                      handleUpdate(user.id, { status: value as UserStatus })
                    }
                  >
                    <SelectTrigger className="ml-auto h-8 w-[130px] text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem
                          key={status}
                          value={status}
                          className="capitalize"
                        >
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
