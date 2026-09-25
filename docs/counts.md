# App Counts

Snapshot of endpoints, validations, and forms as of `main` (commit `5c7317d`).
Update this whenever actions/forms/schemas are added or removed.

## Summary

| Metric                                     | Count |
| ------------------------------------------- | ----- |
| Backend API endpoints (Server Actions)     | 11    |
| REST API routes (`route.ts`)               | 0     |
| Backend Zod schemas defined                | 9     |
| Backend Zod schemas actively used           | 5     |
| Frontend forms                             | 2     |
| Frontend validation rules (HTML5/UI-level) | 7     |

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

**Total: 11**

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

**Total defined: 9 · Actively used: 5**

`lib/validations/form.ts` also exports `validateForm`/`toFormErrors` — helpers, not schemas.

## 3. Frontend forms

| # | Form               | File                                               | Submission style                                    |
| - | -------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| 1 | Login form          | `components/login-form.tsx`                        | Base UI `<Form>` + `useActionState(loginAction)`       |
| 2 | Create user dialog  | `components/dashboard/users/create-user-dialog.tsx` | Native `<form>` + `startTransition(createUserAction)` |

**Total: 2**

`components/dashboard/roles/permission-matrix.tsx` and `components/dashboard/users/user-table.tsx`
mutate state directly (checkbox toggles / role selects calling Server Actions) without a `<form>` element.

## 4. Frontend validation rules

All real validation runs server-side (Zod, via the `errors` prop pattern in `lib/action-result.ts` /
`lib/validations/form.ts`). Client-side validation is limited to native HTML5 constraints:

| # | Field         | Form                | Constraint(s)                  |
| - | --------------- | --------------------- | --------------------------------- |
| 1 | Name           | Create user dialog  | `required`, `minLength={2}`     |
| 2 | Email          | Create user dialog  | `required`, `type="email"`      |
| 3 | Password       | Create user dialog  | `required`, `minLength={8}`     |
| 4 | Role           | Create user dialog  | `required` (Select)             |

**Total constraints: 7** across **4** validated fields (Status has none; Login form has none — it
relies entirely on server-returned Zod errors).
