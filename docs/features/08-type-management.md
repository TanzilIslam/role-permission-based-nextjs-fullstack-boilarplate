# Type Management

**Status:** Complete
**Last updated:** 2026-09-25

## Overview

A name-only lookup list ("Type") with full CRUD, gated by the `types` resource
permission. Built as the first module to follow `docs/feature-boilerplate.md`.

## Business Logic

Plain CRUD — no invariants beyond `withPermission`. No uniqueness constraint on `name`;
duplicates are allowed since nothing else in the system depends on it being unique.

Rollout: the migration SQL was pasted into Neon's SQL editor by hand (deploys don't run
Prisma commands — see `docs/feature-boilerplate.md`). `npx prisma db seed` was then run
once against Neon to create the `types:*` permission catalogue rows — but no role is
granted any of them by seed. Every role, including `SUPER_ADMIN`, starts with `types`
fully unchecked; a `SUPER_ADMIN` grants it per role from the Permission Matrix
(`/dashboard/roles`) and saves. This is the standard convention now (see
`docs/feature-boilerplate.md` step 4), not specific to this module.

Verified (before the unchecked-by-default change below): with `types:manage` granted,
SUPER_ADMIN can create, rename, and delete. With only `types:read`, USER sees a read-only
list with no Add/Edit/Delete controls. A USER calling `createTypeAction` directly without
`types:create` is rejected server-side with `missing "types:create" permission`.

## File Paths

| Path                                                  | Purpose                                  |
| ------------------------------------------------------ | ------------------------------------------- |
| `prisma/schema.prisma`                                | `ResourceKey.types` + `Type` model        |
| `prisma/migrations/20260925220014_add_type/`          | Adds enum value `types` + `Type` table; applied by hand via Neon's SQL editor |
| `types/enums.ts`                                      | `Resource.TYPES`                          |
| `types/index.ts`                                      | `IType`                                   |
| `lib/validations/types.ts`                            | `typeSchema`, `typeUpdateSchema`         |
| `lib/data/types.ts`                                   | Prisma queries (`listTypes`, etc.)       |
| `app/actions/types.ts`                                | Server Actions, `withPermission`-wrapped |
| `app/dashboard/types/page.tsx`                        | Page                                     |
| `components/dashboard/types/create-type-dialog.tsx`   | Create form (dialog)                     |
| `components/dashboard/types/type-table.tsx`           | List, inline rename, delete (icon buttons carry `aria-label`s) |
| `components/dashboard/sidebar.tsx`                    | Nav entry (`Types`)                      |
| `prisma/seed.ts`                                      | Generates the `types:*` permission rows only — no `ROLE_GRANTS` entry |

## Data Model

```prisma
model Type {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Permissions

| Resource | Actions used                    | Notes                                          |
| ---------- | ---------------------------------- | -------------------------------------------------- |
| `types`  | `create`, `read`, `update`, `delete` | Unchecked for every role by default. Grant per role via the Permission Matrix (`/dashboard/roles`). |

## Flow

1. Client calls `getTypesAction` / `createTypeAction` / `updateTypeAction` / `deleteTypeAction`.
2. `withPermission` checks the matching `types:<action>` grant (server-side; the UI's
   `usePermission` checks in `create-type-dialog.tsx`/`type-table.tsx` only hide controls).
3. Input is validated via `typeSchema` / `typeUpdateSchema` (`safeParse`).
4. `lib/data/types.ts` runs the Prisma query and maps the row to `IType`.
5. `revalidatePath("/dashboard/types")` refreshes the page; the action returns
   `ActionResult<IType | IType[] | undefined>`.

## Related Features

- [RBAC Permission Model](./02-rbac-permission-model.md) — `withPermission`, `hasPermission`
- `docs/feature-boilerplate.md` — the recipe this module was built from
