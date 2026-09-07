"use client"

import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { usePermission } from "@/hooks/use-permission"
import { Resource } from "@/types/enums"

interface DeleteUserButtonProps {
  userId: string
}

export function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  const { canDelete, isLoading } = usePermission()

  if (isLoading) {
    return <div className="h-8 w-24 animate-pulse rounded bg-muted" />
  }

  // Cosmetic only — `deleteUserAction` must still guard itself server-side,
  // since a disabled button does not stop a direct POST.
  const isAllowed = canDelete(Resource.USERS)

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={!isAllowed}
      onClick={() => {
        // TODO: swap for a shadcn AlertDialog and call deleteUserAction(userId)
        console.log("delete requested for", userId)
      }}
    >
      <Trash2 />
      {isAllowed ? "Delete User" : "Restricted"}
    </Button>
  )
}
