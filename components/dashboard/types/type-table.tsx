"use client"

import { useState, useTransition } from "react"
import { Pencil, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { deleteTypeAction, updateTypeAction } from "@/app/actions/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePermission } from "@/hooks/use-permission"
import type { IType } from "@/types"
import { Resource } from "@/types/enums"

interface TypeTableProps {
  types: IType[]
}

export function TypeTable({ types }: TypeTableProps) {
  const { canUpdate, canDelete } = usePermission()
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const canEdit = canUpdate(Resource.TYPES)
  const canRemove = canDelete(Resource.TYPES)

  function startEdit(type: IType) {
    setEditingId(type.id)
    setEditingName(type.name)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingName("")
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      const result = await updateTypeAction({ id, name: editingName })

      if (result.success) {
        toast.success(result.message)
        cancelEdit()
      } else {
        toast.error(result.message)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTypeAction(id)

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
            <TableHead>Name</TableHead>
            {canEdit || canRemove ? (
              <TableHead className="text-right">Actions</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canEdit || canRemove ? 2 : 1}
                className="text-center text-sm text-muted-foreground"
              >
                No types yet.
              </TableCell>
            </TableRow>
          ) : (
            types.map((type) => {
              const isEditing = editingId === type.id

              return (
                <TableRow key={type.id}>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 max-w-xs"
                        disabled={isPending}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium">{type.name}</span>
                    )}
                  </TableCell>

                  {canEdit || canRemove ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              disabled={isPending || !editingName.trim()}
                              onClick={() => saveEdit(type.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPending}
                              onClick={cancelEdit}
                            >
                              <X className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {canEdit ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isPending}
                                onClick={() => startEdit(type)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                            ) : null}
                            {canRemove ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={isPending}
                                onClick={() => handleDelete(type.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
