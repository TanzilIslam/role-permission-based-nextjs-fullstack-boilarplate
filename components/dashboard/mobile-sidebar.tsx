"use client"

import { useState } from "react"
import { Menu } from "lucide-react"

import { Sidebar } from "@/components/dashboard/sidebar"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation menu"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 max-w-[85vw] p-0">
        {/* Visually hidden — the Sidebar already renders its own visible
            "RBAC Engine" heading; these exist only so the popup has an
            accessible name/description. */}
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <SheetDescription className="sr-only">
          Dashboard navigation links
        </SheetDescription>
        <Sidebar
          className="h-full w-full border-r-0"
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
