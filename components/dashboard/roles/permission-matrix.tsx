"use client"

import { useMemo, useState, useTransition } from "react"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { updateRolePermissionsAction } from "@/app/actions/roles"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { IPermission, IRole } from "@/types"
import { PermissionAction, Resource } from "@/types/enums"

interface PermissionMatrixProps {
  role: IRole
  availablePermissions: IPermission[]
}

const RESOURCES = Object.values(Resource)
const ACTIONS = [
  PermissionAction.READ,
  PermissionAction.CREATE,
  PermissionAction.UPDATE,
  PermissionAction.DELETE,
  PermissionAction.MANAGE,
]

export function PermissionMatrix({
  role,
  availablePermissions,
}: PermissionMatrixProps) {
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role.permissions.map((permission) => permission.id))
  )

  // resource -> action -> permission id
  const byCell = useMemo(() => {
    const map = new Map<string, string>()
    for (const permission of availablePermissions) {
      map.set(`${permission.resource}:${permission.action}`, permission.id)
    }
    return map
  }, [availablePermissions])

  const manageIdFor = (resource: Resource) =>
    byCell.get(`${resource}:${PermissionAction.MANAGE}`)

  /** MANAGE is a wildcard server-side, so it implies every other action here. */
  const isManaged = (resource: Resource) => {
    const id = manageIdFor(resource)
    return Boolean(id && selected.has(id))
  }

  function toggle(permissionId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(permissionId)) {
        next.delete(permissionId)
      } else {
        next.add(permissionId)
      }
      return next
    })
  }

  const dirty = useMemo(() => {
    const original = new Set(role.permissions.map((p) => p.id))
    if (original.size !== selected.size) return true
    for (const id of original) if (!selected.has(id)) return true
    return false
  }, [role.permissions, selected])

  function handleSave() {
    startTransition(async () => {
      const result = await updateRolePermissionsAction({
        roleId: role.id,
        permissionIds: [...selected],
      })

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Permissions for {role.name}</h3>
          <p className="text-sm text-muted-foreground">
            Configure granular access for this role. Checking{" "}
            <span className="font-medium">manage</span> grants every action on
            that resource.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isPending || !dirty}>
          {isPending ? <Loader2 className="animate-spin" /> : <Save />}
          {dirty ? "Save Changes" : "Saved"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Resource</TableHead>
              {ACTIONS.map((action) => (
                <TableHead key={action} className="text-center capitalize">
                  {action}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {RESOURCES.map((resource) => {
              const managed = isManaged(resource)

              return (
                <TableRow key={resource}>
                  <TableCell className="font-medium capitalize">
                    {resource}
                  </TableCell>
                  {ACTIONS.map((action) => {
                    const id = byCell.get(`${resource}:${action}`)

                    if (!id) {
                      return (
                        <TableCell key={action} className="text-center">
                          <span className="text-muted-foreground/40">—</span>
                        </TableCell>
                      )
                    }

                    // Anything other than MANAGE is implied once MANAGE is on.
                    // Showing it checked-and-locked keeps the grid honest about
                    // effective access instead of implying it can be revoked.
                    const impliedByManage =
                      managed && action !== PermissionAction.MANAGE

                    return (
                      <TableCell key={action} className="text-center">
                        <Checkbox
                          checked={impliedByManage || selected.has(id)}
                          onCheckedChange={() => toggle(id)}
                          disabled={isPending || impliedByManage}
                          aria-label={
                            impliedByManage
                              ? `${resource}:${action} — granted via ${resource}:manage`
                              : `${resource}:${action}`
                          }
                          title={
                            impliedByManage
                              ? `Granted by ${resource}:manage`
                              : undefined
                          }
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
