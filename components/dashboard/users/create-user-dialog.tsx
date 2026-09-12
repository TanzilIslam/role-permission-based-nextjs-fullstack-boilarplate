"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { createUserAction } from "@/app/actions/users"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePermission } from "@/hooks/use-permission"
import type { IRole, UserStatus } from "@/types"
import { Resource } from "@/types/enums"

const STATUSES: UserStatus[] = ["active", "inactive", "pending"]

interface CreateUserDialogProps {
  roles: IRole[]
}

export function CreateUserDialog({ roles }: CreateUserDialogProps) {
  const { canCreate } = usePermission()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [roleId, setRoleId] = useState("")
  const [status, setStatus] = useState<UserStatus>("active")

  if (!canCreate(Resource.USERS)) return null

  function resetForm() {
    setName("")
    setEmail("")
    setPassword("")
    setRoleId("")
    setStatus("active")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      const result = await createUserAction({
        name,
        email,
        password,
        roleId,
        status,
      })

      if (result.success) {
        toast.success(result.message)
        resetForm()
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
            Add User
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Add a new user to the system with a role and status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="create-name">Name</Label>
            <Input
              id="create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              minLength={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-password">Password</Label>
            <Input
              id="create-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              minLength={8}
            />
          </div>

          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={roleId} onValueChange={(v) => v && setRoleId(v)} required>
              <SelectTrigger>
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
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => v && setStatus(v as UserStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || !roleId}>
              {isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
