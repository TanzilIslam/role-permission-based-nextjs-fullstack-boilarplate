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
4. `prisma/seed.ts`: nothing to add — catalogue is automatic, grants start unchecked for
   every role and are set later via the Permission Matrix
5. `lib/validations/`: Zod schema(s)
6. `lib/data/`: Prisma query functions (row -> domain mappers)
7. `app/actions/`: Server Actions, wrapped in `withPermission`
8. `app/dashboard/`: page, guarded by permission
9. `components/dashboard/`: list + form UI, gated with `usePermission`/`PermissionGuard`
10. `components/dashboard/sidebar.tsx`: nav entry
11. Generate the migration SQL, paste it into Neon's SQL editor, seed, verify
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

Then generate the migration SQL (step 11) and paste it into Neon's SQL editor by hand.
Deploys don't touch the database — a schema change isn't real until you've run its SQL
against Neon yourself.

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

## 4. Seed grants — leave the new resource out

`prisma/seed.ts` — the permission **catalogue** (`items:create`, `items:read`, …) is
generated automatically from `ResourceKey` × `PermissionActionKey`, so nothing to do there.

**Do not add the new resource to `ROLE_GRANTS`.** Every new module starts fully unchecked
for every role, including `SUPER_ADMIN` — nobody gets automatic access. An admin who holds
`roles:manage` (only `SUPER_ADMIN` does, by default) grants it explicitly afterward, per
role, from the Permission Matrix on `/dashboard/roles`, then clicks Save. Whatever ends up
checked there is what that role can do — there is no seeded default to keep in sync.

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
    // items: nothing here — granted later via the Permission Matrix, not seeded
  },
  ADMIN: {
    // ...unchanged...
  },
  // MANAGER / USER: unchanged too
}
```

This means right after deploying a new module, nobody can reach it yet — that's expected,
not a bug. The one exception is if the module needs to be usable immediately with no manual
step; say so explicitly if that's the case, since it's a deliberate deviation from the
default.

Re-run `npx prisma db seed` after editing.

## 5. Validation schema

`lib/validations/items.ts` (new file, one file per module — mirrors `rbac.ts`/`auth.ts`):

```ts
import * as z from "zod"

export const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
})

export type ItemInput = z.infer<typeof itemSchema>

// A separate schema for update, not a `.partial()` of itemSchema — update needs
// the `id`, and reusing the same shape would make `id` optional on create too.
export const itemUpdateSchema = z.object({
  id: z.string().min(1, "Item is required"),
  name: z.string().min(1, "Name is required"),
})

export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>
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

export async function updateItem(
  id: string,
  name: string
): Promise<IItem | null> {
  try {
    const row = await prisma.item.update({ where: { id }, data: { name } })
    return toItem(row)
  } catch {
    // Prisma throws (P2025) rather than returning null when the row is
    // gone — swallow it so the action can return a normal "not found".
    return null
  }
}

export async function removeItem(itemId: string): Promise<boolean> {
  const result = await prisma.item.deleteMany({ where: { id: itemId } })
  return result.count > 0
}
```

`deleteMany`/count and `update`/try-catch are two different idioms for the same problem
("did this id exist?") — `deleteMany` naturally reports a count, `update` doesn't, so it
needs the try/catch instead. Don't `findUnique` first just to avoid the catch; that's an
extra round trip for no benefit.

## 7. Server Actions

`app/actions/items.ts` (new file). Every mutation goes through `withPermission` — this is
the actual security boundary, never skip it even if the UI already hides the control.

```ts
"use server"

import { revalidatePath } from "next/cache"

import { actionFailure, actionSuccess } from "@/lib/action-result"
import { withPermission } from "@/lib/auth-wrapper"
import {
  insertItem,
  listItems,
  removeItem,
  updateItem,
} from "@/lib/data/items"
import { toFormErrors } from "@/lib/validations/form"
import { itemSchema, itemUpdateSchema } from "@/lib/validations/items"
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

export const updateItemAction = withPermission(
  Resource.ITEMS,
  PermissionAction.UPDATE,
  async (
    _session,
    input: { id: string; name: string }
  ): Promise<ActionResult<IItem>> => {
    const validated = itemUpdateSchema.safeParse(input)

    if (!validated.success) {
      return actionFailure("Validation failed.", toFormErrors(validated.error))
    }

    const updated = await updateItem(validated.data.id, validated.data.name)
    if (!updated) {
      return actionFailure("Item not found.")
    }

    revalidatePath("/dashboard/items")
    return actionSuccess("Item updated.", updated)
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
- One action per resource/action pair, one action per permission action
  (`getItemsAction`→`READ`, `createItemAction`→`CREATE`, `updateItemAction`→`UPDATE`,
  `deleteItemAction`→`DELETE`). Don't fold create+update+delete into one handler, and
  don't reach for `PermissionAction.MANAGE` on an individual action just because a role
  happens to hold it — `MANAGE` is a wildcard *grant*, not something an action checks for;
  `hasPermission`/`withPermission` already treat a `MANAGE` grant as satisfying every
  narrower action for you.

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

Gate create/update/delete controls with `usePermission()` — **UI-only**, the real check
already happened in step 7. Mirror `components/dashboard/users/create-user-dialog.tsx`:

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

For a list with inline edit/delete per row, gate each action independently — a viewer might
have `update` but not `delete`, or neither. Keep one `editingId` in state rather than an
edit flag per row, so only one row can be in edit mode at a time:

```tsx
"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteItemAction, updateItemAction } from "@/app/actions/items"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePermission } from "@/hooks/use-permission"
import type { IItem } from "@/types"
import { Resource } from "@/types/enums"

export function ItemList({ items }: { items: IItem[] }) {
  const { canUpdate, canDelete } = usePermission()
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const canEdit = canUpdate(Resource.ITEMS)
  const canRemove = canDelete(Resource.ITEMS)

  function saveEdit(id: string) {
    startTransition(async () => {
      const result = await updateItemAction({ id, name: editingName })
      if (result.success) {
        toast.success(result.message)
        setEditingId(null)
      } else {
        toast.error(result.message)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteItemAction(id)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2">
          {editingId === item.id ? (
            <>
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                disabled={isPending}
                autoFocus
              />
              <Button size="sm" onClick={() => saveEdit(item.id)}>
                Save
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1">{item.name}</span>
              {canEdit ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(item.id)
                    setEditingName(item.name)
                  }}
                >
                  Edit
                </Button>
              ) : null}
              {canRemove ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
                </Button>
              ) : null}
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
```

If a row action is icon-only (e.g. `<Pencil />` / `<Trash2 />` instead of text), give it
an `aria-label` that names the row, like `aria-label={\`Delete ${item.name}\`}`. Screen
readers need it, and it's the only stable way for a browser test to target that specific
row's button.

For read-only rendering of individual rows (e.g. hiding a delete button per-row) in a
Server Component instead, use `PermissionGuard`:

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

This is the only nav change needed. The mobile hamburger drawer
(`components/dashboard/mobile-sidebar.tsx`) renders the same `Sidebar` component and the
same `routes` array — it isn't a separate list to keep in sync.

## 11. Apply the migration in Neon, seed, and verify

**Deploys never touch the database.** `npm run build` is plain `next build` — no Prisma
command runs during deploy. You apply schema changes to Neon yourself, deliberately, by
pasting SQL into its SQL editor. This is the entire process:

1. **Generate the migration SQL.** If you have a working `DIRECT_URL`/`DATABASE_URL` (e.g.
   `.env.local` is filled in), just run:
   ```bash
   npx prisma migrate dev --name add_<module>
   ```
   This both writes `prisma/migrations/<timestamp>_add_<module>/migration.sql` and applies
   it to whatever database your env vars point at — if that's your real Neon database,
   you're done, skip to step 3.

   If you don't want `migrate dev` touching the database yet (e.g. you're not sure the env
   points at the right one, or there's no DB connection at all in your sandbox), generate
   the SQL without connecting to anything:
   ```bash
   git show <commit-before-your-change>:prisma/schema.prisma > /tmp/schema.before.prisma
   TS=$(date -u +%Y%m%d%H%M%S)
   mkdir -p prisma/migrations/${TS}_add_<module>
   npx prisma migrate diff --from-schema /tmp/schema.before.prisma \
     --to-schema prisma/schema.prisma --script \
     -o prisma/migrations/${TS}_add_<module>/migration.sql
   ```
   `migrate diff` only compares two schema files — no DB connection needed either way.

2. **Paste it into Neon.** Open the Neon console → your project → SQL Editor, paste the
   contents of `migration.sql`, and run it. If it contains `ALTER TYPE ... ADD VALUE`
   (adding a `Resource`/enum member), run **that line alone first** and let it commit
   before running the rest — Postgres won't let a new enum value be used in the same
   transaction that added it.

3. **Seed once:** `npx prisma db seed` (pointed at Neon via your env vars) creates the new
   `<resource>:*` permissions and role grants. Safe to re-run, but it also resets the
   seeded super-admin's password/role each time, so only run it when you mean to.

4. **Commit the migration folder** either way (from `migrate dev` or generated by hand) —
   it's the record of what changed, even though nothing auto-applies it.

Then, **only if asked** — per CLAUDE.md's "Agent workflow" rule, don't run these
proactively after an edit:

- `npm run typecheck`
- `npm run lint`
- `npm run format` (or `npx prettier --check <changed files>`)
- Log in as each seeded role and confirm: nav item shows/hides correctly, create/update/
  delete buttons show/hide correctly per-action, and calling the Server Action directly as
  a role that lacks the grant is rejected server-side (its `ActionResult` comes back
  `{"success":false,"message":"Forbidden: missing \"<resource>:<action>\" permission."}`).

Right after deploying, every role — including `SUPER_ADMIN` — will see "missing
`<resource>:read` permission" on the new page. That's expected (§ 4), not a failure: open
the Permission Matrix, check the boxes for the roles that should have access, and save.

## 12. Write the feature doc

### When to write it

A feature counts as "complete" — and gets its `docs/features/*.md` written or updated —
once all of these are true:

- Migration SQL has been run against Neon (step 1, 11). No seed change is expected — grants
  start unchecked for every role by design (step 4)
- Server Actions exist and are all `withPermission`-wrapped (step 7)
- UI exists and is permission-gated (steps 8–10)
- `npm run typecheck`, `npm run lint`, and `npm run format`/`prettier --check` would pass
  (step 11) — verify this when asked to, per CLAUDE.md's "Agent workflow" rule; don't run
  it unprompted, but the module isn't actually done until it's true
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
| `items` | `create`, `read`, `update`, `delete` | Starts unchecked for every role; granted per role via the Permission Matrix (`/dashboard/roles`), not seeded |

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

## Troubleshooting

**A cell in the Permission Matrix shows "—" instead of a checkbox for the new resource.**
That's different from unchecked — it means the `Permission` catalogue itself has no row for
that `resource:action` pair (the matrix can't find an id to toggle). It shouldn't happen
from normal seeding (upserts never delete rows), only if something deleted them directly.
Check with:
```sql
SELECT action FROM "Permission" WHERE resource = '<resource>';
```
If that's empty, re-create the 5 catalogue rows (this grants nothing — `_RolePermissions`
is untouched):
```sql
INSERT INTO "Permission" (id, action, resource, description)
SELECT gen_random_uuid()::text, a, '<resource>'::"ResourceKey", a::text || ' <resource>'
FROM unnest(ARRAY['create','read','update','delete','manage']::"PermissionActionKey"[]) AS a
ON CONFLICT (resource, action) DO NOTHING;
```

**Nobody (including `SUPER_ADMIN`) can see the new page after deploying.** Expected — see
§ 4 and § 11. Not a bug; grant it via the Permission Matrix.

**You want to revoke a resource's grants without a full re-seed** (a full `prisma db seed`
also resets the super-admin's password/role, which you may not want mid-debugging):
```sql
DELETE FROM "_RolePermissions"
WHERE "A" IN (SELECT id FROM "Permission" WHERE resource = '<resource>');
```

**A migration was already applied by hand to one database but you're not sure about
another** (e.g. you ran `migrate dev` against a local/dev DB, and separately pasted SQL
into Neon for prod) — nothing keeps these in sync automatically. Each environment needs the
SQL run against it individually; check with `SELECT action FROM "Permission" WHERE resource
= '<resource>'` (or `\d "<Model>"` for the table) on whichever database you're unsure about.

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
