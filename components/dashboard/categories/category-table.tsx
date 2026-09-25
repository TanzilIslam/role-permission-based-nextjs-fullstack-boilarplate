"use client"

import { useState, useTransition } from "react"
import { Pencil, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import {
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/actions/categories"
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
import type { ICategory } from "@/types"
import { Resource } from "@/types/enums"

interface CategoryTableProps {
  categories: ICategory[]
}

export function CategoryTable({ categories }: CategoryTableProps) {
  const { canUpdate, canDelete } = usePermission()
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingDescription, setEditingDescription] = useState("")

  const canEdit = canUpdate(Resource.CATEGORIES)
  const canRemove = canDelete(Resource.CATEGORIES)

  function startEdit(category: ICategory) {
    setEditingId(category.id)
    setEditingName(category.name)
    setEditingDescription(category.description ?? "")
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingName("")
    setEditingDescription("")
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      const result = await updateCategoryAction({
        id,
        name: editingName,
        description: editingDescription.trim() || undefined,
      })

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
      const result = await deleteCategoryAction(id)

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
            <TableHead>Description</TableHead>
            {canEdit || canRemove ? (
              <TableHead className="text-right">Actions</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canEdit || canRemove ? 3 : 2}
                className="text-center text-sm text-muted-foreground"
              >
                No categories yet.
              </TableCell>
            </TableRow>
          ) : (
            categories.map((category) => {
              const isEditing = editingId === category.id

              return (
                <TableRow key={category.id}>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 max-w-xs"
                        disabled={isPending}
                        aria-label="Category name"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {category.name}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        className="h-8 max-w-sm"
                        disabled={isPending}
                        placeholder="(optional)"
                        aria-label="Category description"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {category.description || "—"}
                      </span>
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
                              onClick={() => saveEdit(category.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPending}
                              onClick={cancelEdit}
                              aria-label="Cancel editing"
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
                                onClick={() => startEdit(category)}
                                aria-label={`Edit ${category.name}`}
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
                                onClick={() => handleDelete(category.id)}
                                aria-label={`Delete ${category.name}`}
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
