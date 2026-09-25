"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { createTypeAction } from "@/app/actions/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePermission } from "@/hooks/use-permission"
import { Resource } from "@/types/enums"

export function CreateTypeDialog() {
  const { canCreate } = usePermission()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState("")

  if (!canCreate(Resource.TYPES)) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      const result = await createTypeAction({ name })

      if (result.success) {
        toast.success(result.message)
        setName("")
        setOpen(false)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="mr-1.5 size-4" />
            Add Type
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Type</DialogTitle>
          <DialogDescription>Add a new type to the list.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="create-type-name">Name</Label>
            <Input
              id="create-type-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Invoice"
              required
              minLength={1}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Creating..." : "Create Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
