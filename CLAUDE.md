# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About this project

A Next.js full-stack RBAC (Role-Based Access Control) boilerplate with a permission management dashboard. Built on Next.js + shadcn/ui + Prisma + PostgreSQL. Features granular `resource:action` permissions, a permission matrix editor, user management, and invariant-protected mutations.

## Important: this is not the Next.js you know

This repo pins `next@16.2.6`, a version with breaking API/convention/file-structure changes relative to what training data assumes. **Before writing or changing any Next.js-specific code (routing, data fetching, config, etc.), consult the bundled docs in `node_modules/next/dist/docs/` first** and follow any deprecation notices found there rather than assuming older Next.js patterns apply.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm start` — run the production build
- `npm run lint` — ESLint (flat config via `eslint.config.mjs`, using `eslint-config-next`'s core-web-vitals + typescript rule sets)
- `npm run typecheck` — `tsc --noEmit`
- `npm run format` — Prettier write across `**/*.{ts,tsx}`
- `npx prisma migrate dev` — run pending migrations
- `npx prisma db seed` — seed roles, permissions, and super-admin user
- `npx prisma generate` — regenerate Prisma client (output: `lib/generated/prisma/`)

There is no test setup in this repo currently.

## Environment variables


| Variable              | Required | Purpose                                                 |
| ----------------------- | ---------- | --------------------------------------------------------- |
| `DATABASE_URL`        | Yes      | PostgreSQL pooled endpoint (app runtime)                |
| `DIRECT_URL`          | Yes      | PostgreSQL unpooled endpoint (Prisma migrations)        |
| `SESSION_SECRET`      | Yes      | HMAC key for JWT signing (≥32 bytes, base64url)        |
| `SEED_ADMIN_PASSWORD` | No       | Seeded super-admin password (defaults to`ChangeMe123!`) |

## Architecture: RBAC system

### Permission model

Permissions are `resource:action` pairs (e.g. `"users:create"`, `"roles:manage"`). The `manage` action is a wildcard — holding `users:manage` grants all actions on users.

Enums in `types/enums.ts` (TypeScript) **must stay in sync** with Prisma schema enums. Mapping between them uses direct type assertion (`row.action as PermissionAction`), so any mismatch silently breaks the system.

### Authentication flow

1. `loginAction` (Server Action) validates credentials, sets an HTTP-only `session_token` cookie containing a signed JWT (jose, HMAC-SHA256, 7-day expiry)
2. `getSession()` in `lib/dal.ts` (wrapped in React `cache()` for per-request deduplication) reads the cookie, verifies JWT, and loads user + role + permissions fresh from DB every request — permissions are never embedded in the token, so revocation is immediate
3. Dashboard layout checks session server-side; missing/invalid session redirects to `/login`

### Data Access Layer (DAL) — `lib/dal.ts`

Server-only module. Key exports:

- `getSession()` — cached session read (shared across layout, page, Server Actions per request)
- `requireSession()` — throws `UnauthorizedError` if no session
- `requirePermission(resource, action)` — throws `ForbiddenError` if permission missing
- Database queries delegate to `lib/data/rbac.ts`

### Server Actions — `app/actions/*.ts`

All mutations use the `withPermission(resource, action, handler)` wrapper (`lib/auth-wrapper.ts`) which calls `requirePermission` then passes the verified session to the handler. Return type is always `ActionResult<T>` — a discriminated union (`{ success: true, data } | { success: false, message }`).

### RBAC invariant guards — `lib/rbac-invariants.ts`

Four guards run before any user/role mutation:

1. **Downward-authority**: can't modify users whose current role has permissions you lack
2. **Privilege-escalation**: can't assign a role more powerful than your own
3. **Self-demotion**: can't demote yourself out of user-management capability
4. **Last-administrator**: prevents removing the last active holder of critical capabilities (`users:manage`, `roles:manage`)

### Client-side permissions

`components/providers/auth-provider.tsx` seeds session from the server (no fetch-on-mount). The `usePermission()` hook (`hooks/use-permission.ts`) exposes `hasPermission`, `canRead`, `canUpdate`, etc. **Client checks only hide UI** — all enforcement is server-side.

`components/auth/permission-guard.tsx` is a Server Component that conditionally renders children based on permissions.

### Database (Prisma + PostgreSQL)

Schema: `prisma/schema.prisma`. Three core models: `User`, `Role`, `Permission` (many-to-many between Role↔Permission). Prisma client is generated to `lib/generated/prisma/` and instantiated as a singleton with PgBouncer adapter in `lib/prisma.ts`.

Seed script (`prisma/seed.ts`) creates 25 permissions (5 resources × 5 actions), 4 roles (SUPER_ADMIN, ADMIN, MANAGER, USER) with graduated grants, and one super-admin user.

## Architecture: UI & styling

- **Path alias**: `@/*` maps to the repo root (see `tsconfig.json`).
- **`components.json`** drives shadcn generation: style `base-nova`, base color `neutral`, icon library `lucide`, CSS variables enabled. The `aliases` block is the source of truth for where generated files land.
- **Styling**: Tailwind v4, configured CSS-first (no `tailwind.config.*`) — theme tokens and `@theme inline` mappings live in `app/globals.css`. Dark mode uses `.dark` class variant, driven by `next-themes`.
- **Theming**: `components/theme-provider.tsx` wraps the app in `next-themes`' `ThemeProvider` and wires a global `d` keydown hotkey that toggles light/dark. This hotkey is a deliberate feature of the template.
- **`lib/utils.ts`** re-exports `cn` from the `cn` package (not `clsx`/`tailwind-merge` combo) — use `cn(...)` for conditional class merging.
- **UI primitives**: built on `@base-ui/react` primitives styled with `class-variance-authority` (`cva`) variants, not Radix.
- **Adding components**: `npx shadcn@latest add <component>` — drops into `components/ui/`.
- **Formatting**: Prettier: `semi: false`, double quotes, `printWidth: 80`, `prettier-plugin-tailwindcss`. Match this style.

## Key file map


| File/Dir                  | Purpose                                                    |
| --------------------------- | ------------------------------------------------------------ |
| `app/actions/`            | Server Actions (auth, users, roles, permissions)           |
| `app/dashboard/`          | Protected dashboard pages (users, roles, settings)         |
| `lib/dal.ts`              | Data Access Layer — session, auth checks                  |
| `lib/data/rbac.ts`        | Database queries for users/roles/permissions               |
| `lib/auth-wrapper.ts`     | `withPermission` Server Action decorator                   |
| `lib/permissions.ts`      | Permission check logic (MANAGE wildcard)                   |
| `lib/rbac-invariants.ts`  | Mutation guard logic                                       |
| `lib/session-token.ts`    | JWT sign/verify with jose                                  |
| `lib/prisma.ts`           | Prisma client singleton                                    |
| `lib/validations/`        | Zod schemas (auth, rbac, form helpers)                     |
| `types/enums.ts`          | TypeScript enums mirroring Prisma enums                    |
| `types/`                  | Shared interfaces (IUser, IRole, IPermission, AuthSession) |
| `components/providers/`   | AuthProvider (client session context)                      |
| `components/auth/`        | PermissionGuard (server component)                         |
| `hooks/use-permission.ts` | Client permission checking hook                            |
