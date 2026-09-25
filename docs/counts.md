# App Counts

Snapshot of endpoints, validations, and forms as of `main`, after the Category module.
Update this whenever actions/forms/schemas are added or removed.

## Summary

| Metric                                     | Count |
| ------------------------------------------- | ----- |
| Backend API endpoints (Server Actions)     | 19    |
| REST API routes (`route.ts`)               | 0     |
| Backend Zod schemas defined                | 13    |
| Backend Zod schemas actively used           | 9     |
| Frontend forms                             | 4     |
| Frontend validation rules (HTML5/UI-level) | 10    |

## 1. Backend API endpoints (Server Actions)

No REST route handlers (`app/**/route.ts`) exist — all mutations/reads go through
Next.js Server Actions in `app/actions/`.

| # | Action                       | File                       | Wrapped in `withPermission` |
| - | ---------------------------- | --------------------------- | ---------------------------- |
| 1 | `loginAction`               | `app/actions/auth.ts`      | No (public)                 |
| 2 | `getCurrentUserAction`      | `app/actions/auth.ts`      | No (session read)           |
| 3 | `logoutAction`              | `app/actions/auth.ts`      | No (session clear)          |
| 4 | `getPermissionsAction`      | `app/actions/permissions.ts` | Yes                        |
| 5 | `getRolesAction`            | `app/actions/roles.ts`     | Yes                          |
| 6 | `createRoleAction`          | `app/actions/roles.ts`     | Yes                          |
| 7 | `deleteRoleAction`          | `app/actions/roles.ts`     | Yes                          |
| 8 | `updateRolePermissionsAction` | `app/actions/roles.ts`   | Yes                          |
| 9 | `getUsersAction`            | `app/actions/users.ts`     | Yes                          |
| 10 | `createUserAction`         | `app/actions/users.ts`     | Yes                          |
| 11 | `updateUserRoleAction`     | `app/actions/users.ts`     | Yes                          |
| 12 | `getTypesAction`           | `app/actions/types.ts`     | Yes                          |
| 13 | `createTypeAction`         | `app/actions/types.ts`     | Yes                          |
| 14 | `updateTypeAction`         | `app/actions/types.ts`     | Yes                          |
| 15 | `deleteTypeAction`         | `app/actions/types.ts`     | Yes                          |
| 16 | `getCategoriesAction`      | `app/actions/categories.ts` | Yes                        |
| 17 | `createCategoryAction`     | `app/actions/categories.ts` | Yes                        |
| 18 | `updateCategoryAction`     | `app/actions/categories.ts` | Yes                        |
| 19 | `deleteCategoryAction`     | `app/actions/categories.ts` | Yes                        |

**Total: 19**

## 2. Backend validation (Zod schemas)

Defined in `lib/validations/`.

| # | Schema                    | File                      | Used in                                             |
| - | -------------------------- | --------------------------- | ------------------------------------------------------ |
| 1 | `loginSchema`             | `lib/validations/auth.ts` | `loginAction`                                          |
| 2 | `registerSchema`          | `lib/validations/auth.ts` | Not wired to an action yet                             |
| 3 | `permissionSchema`        | `lib/validations/rbac.ts` | Not wired to an action yet                             |
| 4 | `roleSchema`              | `lib/validations/rbac.ts` | `createRoleAction`                                     |
| 5 | `userUpdateSchema`        | `lib/validations/rbac.ts` | Not wired to an action yet                             |
| 6 | `userRecordSchema`        | `lib/validations/rbac.ts` | Not wired to an action yet (reserved for Route Handlers) |
| 7 | `rolePermissionsSchema`   | `lib/validations/rbac.ts` | `updateRolePermissionsAction`                          |
| 8 | `createUserSchema`        | `lib/validations/rbac.ts` | `createUserAction`                                     |
| 9 | `userRoleUpdateSchema`    | `lib/validations/rbac.ts` | `updateUserRoleAction`                                 |
| 10 | `typeSchema`             | `lib/validations/types.ts` | `createTypeAction`                                    |
| 11 | `typeUpdateSchema`       | `lib/validations/types.ts` | `updateTypeAction`                                    |
| 12 | `categorySchema`         | `lib/validations/categories.ts` | `createCategoryAction`                           |
| 13 | `categoryUpdateSchema`   | `lib/validations/categories.ts` | `updateCategoryAction`                           |

**Total defined: 13 · Actively used: 9**

`lib/validations/form.ts` also exports `validateForm`/`toFormErrors` — helpers, not schemas.

## 3. Frontend forms

| # | Form               | File                                               | Submission style                                    |
| - | -------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| 1 | Login form          | `components/login-form.tsx`                        | Base UI `<Form>` + `useActionState(loginAction)`       |
| 2 | Create user dialog  | `components/dashboard/users/create-user-dialog.tsx` | Native `<form>` + `startTransition(createUserAction)` |
| 3 | Create type dialog  | `components/dashboard/types/create-type-dialog.tsx` | Native `<form>` + `startTransition(createTypeAction)` |
| 4 | Create category dialog | `components/dashboard/categories/create-category-dialog.tsx` | Native `<form>` + `startTransition(createCategoryAction)` |

**Total: 4**

`components/dashboard/roles/permission-matrix.tsx`, `components/dashboard/users/user-table.tsx`,
`components/dashboard/types/type-table.tsx`, and `components/dashboard/categories/category-table.tsx`
mutate state directly (checkbox toggles / selects / inline rename calling Server Actions)
without a `<form>` element.

## 4. Frontend validation rules

All real validation runs server-side (Zod, via the `errors` prop pattern in `lib/action-result.ts` /
`lib/validations/form.ts`). Client-side validation is limited to native HTML5 constraints:

| # | Field         | Form                | Constraint(s)                  |
| - | --------------- | --------------------- | --------------------------------- |
| 1 | Name           | Create user dialog  | `required`, `minLength={2}`     |
| 2 | Email          | Create user dialog  | `required`, `type="email"`      |
| 3 | Password       | Create user dialog  | `required`, `minLength={8}`     |
| 4 | Role           | Create user dialog  | `required` (Select)             |
| 5 | Name           | Create type dialog  | `required`, `minLength={1}`     |
| 6 | Name           | Create category dialog | `required`, `minLength={1}`  |

**Total constraints: 10** across **6** validated fields (Status has none; Login form has
none — it relies entirely on server-returned Zod errors; Category's `description` field
has none, matching that it's optional).
