# Category Management

**Status:** In Progress
**Last updated:** 2026-09-25

## Overview

A lookup list ("Category") with `name` (required) and `description` (optional), full CRUD,
gated by the `categories` resource permission. Second module built following
`docs/feature-boilerplate.md`, after Type — same shape, one extra optional field.

## Business Logic

Plain CRUD — no invariants beyond `withPermission`. No uniqueness constraint on `name`;
duplicates are allowed since nothing else in the system depends on it being unique.
`description` is genuinely optional end-to-end: empty string from the form is normalized to
`undefined` before hitting the Server Action, and the DB column is nullable.

Rollout: the migration SQL was generated offline (`prisma migrate diff`, no DB connection)
and needs to be pasted into Neon's SQL editor by hand — deploys don't run Prisma commands
(see `docs/feature-boilerplate.md`). Per the standing convention, `categories` was **not**
added to `ROLE_GRANTS` in `prisma/seed.ts` — every role, including `SUPER_ADMIN`, starts
unchecked. Access is turned on afterward per role from the Permission Matrix
(`/dashboard/roles`).

## File Paths

| Path | Purpose |
| --- | --- |
| `prisma/schema.prisma` | `ResourceKey.categories` + `Category` model |
| `prisma/migrations/20260925234038_add_category/` | Adds enum value `categories` + `Category` table; not yet applied to Neon |
| `types/enums.ts` | `Resource.CATEGORIES` |
| `types/index.ts` | `ICategory` |
| `lib/validations/categories.ts` | `categorySchema`, `categoryUpdateSchema` |
| `lib/data/categories.ts` | Prisma queries (`listCategories`, etc.) |
| `app/actions/categories.ts` | Server Actions, `withPermission`-wrapped |
| `app/dashboard/categories/page.tsx` | Page |
| `components/dashboard/categories/create-category-dialog.tsx` | Create form (dialog) |
| `components/dashboard/categories/category-table.tsx` | List, inline rename/re-describe, delete |
| `components/dashboard/sidebar.tsx` | Nav entry (`Categories`) |
| `prisma/seed.ts` | Unchanged — no `ROLE_GRANTS` entry added |

## Data Model

```prisma
model Category {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Permissions

| Resource | Actions used | Notes |
| --- | --- | --- |
| `categories` | `create`, `read`, `update`, `delete` | Unchecked for every role by default. Grant per role via the Permission Matrix (`/dashboard/roles`). |

## Flow

1. Client calls `getCategoriesAction` / `createCategoryAction` / `updateCategoryAction` /
   `deleteCategoryAction`.
2. `withPermission` checks the matching `categories:<action>` grant (server-side; the UI's
   `usePermission` checks in `create-category-dialog.tsx`/`category-table.tsx` only hide
   controls).
3. Input is validated via `categorySchema` / `categoryUpdateSchema` (`safeParse`).
4. `lib/data/categories.ts` runs the Prisma query and maps the row to `ICategory`.
5. `revalidatePath("/dashboard/categories")` refreshes the page; the action returns
   `ActionResult<ICategory | ICategory[] | undefined>`.

## Related Features

- [Type Management](./08-type-management.md) — same shape module, one field simpler
- [RBAC Permission Model](./02-rbac-permission-model.md) — `withPermission`, `hasPermission`
- `docs/feature-boilerplate.md` — the recipe this module was built from
