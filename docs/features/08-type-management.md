# Type Management

**Status:** Complete
**Last updated:** 2026-09-25

## Overview

A name-only lookup list ("Type") with full CRUD, gated by the `types` resource
permission. Built as the first module to follow `docs/feature-boilerplate.md`.

## Business Logic

Plain CRUD — no invariants beyond `withPermission`. No uniqueness constraint on `name`;
duplicates are allowed since nothing else in the system depends on it being unique.

## File Paths

| Path                                                  | Purpose                                  |
| ------------------------------------------------------ | ------------------------------------------- |
| `prisma/schema.prisma`                                | `ResourceKey.types` + `Type` model        |
| `types/enums.ts`                                      | `Resource.TYPES`                          |
| `types/index.ts`                                      | `IType`                                   |
| `lib/validations/types.ts`                            | `typeSchema`, `typeUpdateSchema`         |
| `lib/data/types.ts`                                   | Prisma queries (`listTypes`, etc.)       |
| `app/actions/types.ts`                                | Server Actions, `withPermission`-wrapped |
| `app/dashboard/types/page.tsx`                        | Page                                     |
| `components/dashboard/types/create-type-dialog.tsx`   | Create form (dialog)                     |
| `components/dashboard/types/type-table.tsx`           | List, inline rename, delete              |
| `components/dashboard/sidebar.tsx`                    | Nav entry (`Types`)                      |
| `prisma/seed.ts`                                      | `ROLE_GRANTS.*.types`                    |

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
| `types`  | `create`, `read`, `update`, `delete` | SUPER_ADMIN/ADMIN: `manage`. MANAGER/USER: `read` only. |

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
