# Feature Boilerplate: Role/Permission-Backed CRUD Module

Worked example for adding a new RBAC-controlled module. Follow this exact order for every
new module so permission control stays consistent across the app. Example resource used
throughout: **Item** — a name-only list (`id`, `name`), CRUD.

Read `CLAUDE.md` first for the overall architecture. This doc is the step-by-step recipe;
that file is the "why".

## Checklist

1. Prisma: add enum member + model
2. `types/enums.ts`: add `Resource` member (must match Prisma enum value)
3. `types/index.ts`: add domain interface
4. `prisma/seed.ts`: grant the new resource to roles (catalogue is automatic; grants are not)
5. `lib/validations/`: Zod schema(s)
6. `lib/data/`: Prisma query functions (row -> domain mappers)
7. `app/actions/`: Server Actions, wrapped in `withPermission`
8. `app/dashboard/`: page, guarded by permission
9. `components/dashboard/`: list + form UI, gated with `usePermission`/`PermissionGuard`
10. `components/dashboard/sidebar.tsx`: nav entry
11. Migrate + seed + verify
12. Write/update `docs/features/<NN>-<module>.md` (standard template below) and the index
    in `docs/README.md`

---

## 1. Prisma schema

`prisma/schema.prisma` — add the resource to `ResourceKey` and add the model.

```prisma
enum ResourceKey {
  users
  roles
  permissions
  dashboard
  settings
  items          // + new resource
}

model Item {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Run `npx prisma migrate dev --name add_items` after this.

## 2. TypeScript enum

`types/enums.ts` — the string value **must** match the Prisma enum member exactly (the
DAL maps rows to domain types via direct assertion, not a lookup table).

```ts
export enum Resource {
  USERS = "users",
  ROLES = "roles",
  PERMISSIONS = "permissions",
  DASHBOARD = "dashboard",
  SETTINGS = "settings",
  ITEMS = "items", // + new resource
}
```

## 3. Domain type

`types/index.ts`:

```ts
export interface IItem {
  id: string
  name: string
  createdAt: Date
}
```

## 4. Seed grants

`prisma/seed.ts` — the permission **catalogue** (`items:create`, `items:read`, …) is
generated automatically from `ResourceKey` × `PermissionActionKey`, so nothing to do
there. But **role grants** are explicit — add `items` to whichever roles should have it in
`ROLE_GRANTS`:

```ts
const ROLE_GRANTS: Record<
  UserRoleKey,
  Partial<Record<ResourceKey, PermissionActionKey[]>>
> = {
  SUPER_ADMIN: {
    users: ["manage"],
    roles: ["manage"],
    permissions: ["manage"],
    dashboard: ["manage"],
    settings: ["manage"],
    items: ["manage"], // + new resource
  },
  ADMIN: {
    // ...unchanged...
    items: ["read", "create", "update"], // example: no delete
  },
  // MANAGER / USER: omit `items` entirely if they should have none
}
```

Re-run `npx prisma db seed` after editing.

## 5. Validation schema

`lib/validations/items.ts` (new file, one file per module — mirrors `rbac.ts`/`auth.ts`):

```ts
import * as z from "zod"

export const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
})

export type ItemInput = z.infer<typeof itemSchema>
```

## 6. Data access layer

`lib/data/items.ts` (new file — keep query functions out of Server Actions, per `lib/data/rbac.ts`):

```ts
import "server-only"

import { prisma } from "@/lib/prisma"
import type { IItem } from "@/types"
import type { Item as ItemRow } from "@/lib/generated/prisma/client"

function toItem(row: ItemRow): IItem {
  return { id: row.id, name: row.name, createdAt: row.createdAt }
}

export async function listItems(): Promise<IItem[]> {
  const rows = await prisma.item.findMany({ orderBy: { createdAt: "asc" } })
  return rows.map(toItem)
}

export async function insertItem(name: string): Promise<IItem> {
  const row = await prisma.item.create({ data: { name } })
  return toItem(row)
}

export async function removeItem(itemId: string): Promise<boolean> {
  const result = await prisma.item.deleteMany({ where: { id: itemId } })
  return result.count > 0
}
```

## 7. Server Actions

`app/actions/items.ts` (new file). Every mutation goes through `withPermission` — this is
the actual security boundary, never skip it even if the UI already hides the control.

```ts
"use server"

import { revalidatePath } from "next/cache"

import { actionFailure, actionSuccess } from "@/lib/action-result"
import { withPermission } from "@/lib/auth-wrapper"
import { insertItem, listItems, removeItem } from "@/lib/data/items"
import { toFormErrors } from "@/lib/validations/form"
import { itemSchema } from "@/lib/validations/items"
import type { ActionResult, IItem } from "@/types"
import { PermissionAction, Resource } from "@/types/enums"

export const getItemsAction = withPermission(
  Resource.ITEMS,
  PermissionAction.READ,
  async () => actionSuccess("Items loaded.", await listItems())
)

export const createItemAction = withPermission(
  Resource.ITEMS,
  PermissionAction.CREATE,
  async (_session, input: { name: string }): Promise<ActionResult<IItem>> => {
    const validated = itemSchema.safeParse(input)

    if (!validated.success) {
      return actionFailure("Validation failed.", toFormErrors(validated.error))
    }

    const created = await insertItem(validated.data.name)

    revalidatePath("/dashboard/items")
    return actionSuccess("Item created.", created)
  }
)

export const deleteItemAction = withPermission(
  Resource.ITEMS,
  PermissionAction.DELETE,
  async (_session, itemId: string) => {
    if (!(await removeItem(itemId))) {
      return actionFailure("Item not found.")
    }

    revalidatePath("/dashboard/items")
    return actionSuccess("Item deleted.", undefined)
  }
)
```

Notice what's **absent** on purpose:

- No invariant guards (`lib/rbac-invariants.ts`) — those exist only because deleting the
  last admin locks out the whole system. A plain list doesn't need them. Add them only if
  your module has an equivalent "can this leave the system unusable" case.
- One action per resource/action pair. Don't fold create+update+delete into one handler.

## 8. Dashboard page

`app/dashboard/items/page.tsx` (new file) — read access is enforced by `getItemsAction`
itself (it's wrapped in `withPermission`), so the page doesn't need a separate guard for
the list; it does need one before rendering create/delete controls.

```tsx
import { getItemsAction } from "@/app/actions/items"
import { CreateItemDialog } from "@/components/dashboard/items/create-item-dialog"
import { ItemList } from "@/components/dashboard/items/item-list"

export default async function ItemsPage() {
  const result = await getItemsAction()

  if (!result.success) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Items</h1>
        <p className="text-sm text-destructive">{result.message}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Items</h1>
          <p className="text-sm text-muted-foreground">Manage the item list.</p>
        </div>
        <CreateItemDialog />
      </div>

      <ItemList items={result.data} />
    </div>
  )
}
```

## 9. Client components

Gate create/delete controls with `usePermission()` — **UI-only**, the real check already
happened in step 7. Mirror `components/dashboard/users/create-user-dialog.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createItemAction } from "@/app/actions/items"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePermission } from "@/hooks/use-permission"
import { Resource } from "@/types/enums"

export function CreateItemDialog() {
  const { canCreate } = usePermission()
  const [name, setName] = useState("")
  const [isPending, startTransition] = useTransition()

  if (!canCreate(Resource.ITEMS)) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createItemAction({ name })
      if (result.success) {
        toast.success(result.message)
        setName("")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        required
        minLength={1}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add Item"}
      </Button>
    </form>
  )
}
```

For read-only rendering of individual rows (e.g. hiding a delete button per-row), use the
server-side `PermissionGuard` instead when the list itself is rendered on the server:

```tsx
import { PermissionGuard } from "@/components/auth/permission-guard"
import { PermissionAction, Resource } from "@/types/enums"

<PermissionGuard resource={Resource.ITEMS} action={PermissionAction.DELETE}>
  <DeleteItemButton itemId={item.id} />
</PermissionGuard>
```

## 10. Sidebar entry

`components/dashboard/sidebar.tsx` — add to the `routes` array (permission-filtered
automatically, same list the server enforces against):

```ts
{
  label: "Items",
  icon: List, // import from lucide-react
  href: "/dashboard/items",
  resource: Resource.ITEMS,
  action: PermissionAction.READ,
},
```

## 11. Verify

- `npx prisma migrate dev` then `npx prisma generate`
- `npx prisma db seed`
- `npm run typecheck`
- Log in as each seeded role and confirm: nav item shows/hides correctly, create/delete
  buttons show/hide correctly, and — most importantly — calling the Server Action directly
  as a role that lacks the grant is still rejected server-side.

## 12. Write the feature doc

### When to write it

A feature counts as "complete" — and gets its `docs/features/*.md` written or updated —
once all of these are true:

- Migration applied and seed grants updated (steps 1–4)
- Server Actions exist and are all `withPermission`-wrapped (step 7)
- UI exists and is permission-gated (steps 8–10)
- `npm run typecheck` and `npm run lint` pass
- You've manually verified it works, and is correctly hidden/rejected, for at least one
  role that has the grant and one that doesn't (step 11)

Don't wait for the whole module to be "perfect" — write the doc as soon as the above is
true, then keep it updated on every later change (new field, new invariant, new role
grant). A stale doc is worse than no doc, because an agent will trust it.

### Standard format — every `docs/features/*.md` must use this structure

Different modules will always tempt you into a different shape ("this one needs a
diagram", "this one has no data model") — resist that. Same section order, same headings,
every time, even if a section is just "N/A — read-only, no invariants." A coding agent
reading 10 feature docs benefits far more from predictable structure than from any single
doc being "more complete."

```markdown
# <Feature Name>

**Status:** Planned | In Progress | Complete
**Last updated:** <YYYY-MM-DD>

## Overview

1-3 sentences: what this feature does and why it exists, in plain terms.

## Business Logic

Rules, invariants, edge cases. If there are none beyond plain CRUD, say so explicitly
("Plain CRUD — no invariants beyond `withPermission`.") rather than leaving it blank.

## File Paths

| Path | Purpose |
| --- | --- |
| `app/actions/items.ts` | Server Actions |
| `lib/data/items.ts` | Prisma queries |
| `lib/validations/items.ts` | Zod schema |
| `app/dashboard/items/page.tsx` | Page |
| `components/dashboard/items/` | List + form UI |

## Data Model

Relevant Prisma model(s)/enum(s), or a pointer to `prisma/schema.prisma` if reproducing it
here would just go stale.

## Permissions

| Resource | Actions used | Notes |
| --- | --- | --- |
| `items` | `create`, `read`, `update`, `delete` | e.g. which roles get which, per `prisma/seed.ts` |

## Flow

Numbered steps for the main path(s) — e.g. "1. Client calls `createItemAction` → 2.
`withPermission` checks `items:create` → 3. `itemSchema.safeParse` → 4. `insertItem` →
5. `revalidatePath`."

## Related Features

Links to other `docs/features/*.md` this depends on or affects (e.g. Authentication,
RBAC Permission Model).
```

After writing it, update the table in `docs/README.md` (`## Feature index`): add the row
if it's new, or flip its `Status` if it changed.

---

## Rules that don't change per-module

- **Every mutation** goes through `withPermission(resource, action, handler)`. No
  exceptions, no "it's just an internal tool" shortcuts.
- **Client checks (`usePermission`, `PermissionGuard`) only hide UI.** They are never the
  enforcement layer.
- **One Zod schema per shape**, in `lib/validations/<module>.ts`, `safeParse`'d inside the
  action — never trust `FormData`/client input un-validated.
- **DB queries live in `lib/data/<module>.ts`**, not inline in the action. Actions stay
  thin: validate → call data layer → guard invariants (if any) → revalidate → return.
- **`Resource` enum value === Prisma `ResourceKey` value.** This identity is load-bearing;
  don't let them drift.
- Every `docs/features/*.md` follows the **same** section order (see step 12) — no
  per-module deviation.
- Update `docs/counts.md` once the module is real (new Server Actions, schemas, forms).
