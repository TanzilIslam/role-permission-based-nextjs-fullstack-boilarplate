# UI & Theming

**Status:** Complete
**Last updated:** 2026-09-25

## Overview

Covers the dashboard shell (desktop sidebar + mobile nav drawer) and dark/light theming.
Not a permission-gated resource itself — this is app chrome shared by every dashboard page.

## Business Logic

- Theming: `next-themes` with `attribute="class"`, `defaultTheme="system"`. A global `d`
  keydown hotkey toggles light/dark (ignored while typing in an input/textarea/select or a
  contentEditable element) — a deliberate template feature, not a bug.
- Mobile nav: below the `md` breakpoint the desktop `<aside>` sidebar is `hidden`. Until
  this was fixed, there was **no** way to reach any nav link on a phone — no menu icon
  existed at all. The fix reuses the same `Sidebar` component inside a slide-in drawer
  rather than maintaining a second nav list.
- No invariants beyond what `Sidebar`'s route list already encodes (each route declares
  its own `resource`/`action`; the nav filters itself via `hasPermission` — see
  RBAC Permission Model).

## File Paths

| Path | Purpose |
| --- | --- |
| `app/dashboard/layout.tsx` | Dashboard shell: desktop `<Sidebar>` + mobile header with `<MobileSidebar>` |
| `components/dashboard/sidebar.tsx` | The nav itself — `routes` array, permission filtering, sign-out. Takes `onNavigate` so a drawer can close on link click |
| `components/dashboard/mobile-sidebar.tsx` | Hamburger trigger + `Sheet` drawer, renders `<Sidebar>` inside it |
| `components/ui/sheet.tsx` | Slide-in drawer primitive (base-ui `Dialog` + `tw-animate-css` slide classes) — hand-built to match `dialog.tsx`'s pattern, since the shadcn CLI's registry host is blocked by this environment's network policy |
| `components/theme-provider.tsx` | `next-themes` wrapper + the `d` hotkey |
| `app/globals.css` | Tailwind v4 theme tokens, `@theme inline` mappings, dark mode via `.dark` class |

## Data Model

N/A — no database involvement.

## Permissions

N/A — the shell itself isn't permission-gated. Individual nav entries are (see
`components/dashboard/sidebar.tsx`'s `routes` array): each is filtered by
`hasPermission(route.resource, route.action)`, same check the server enforces.

## Flow

**Mobile nav open → navigate → close:**
1. `MobileSidebar` renders a `Menu` icon button as a `Sheet`/`SheetTrigger` (visible only
   in the `md:hidden` mobile header in `app/dashboard/layout.tsx`).
2. Clicking it sets `open=true`; `SheetContent side="left"` slides in over the page,
   rendering `<Sidebar className="h-full w-full border-r-0" onNavigate={() => setOpen(false)}>`.
3. Clicking a nav `Link` calls `onNavigate` (closes the drawer) and navigates normally —
   the drawer doesn't intercept routing, it just closes alongside it.
4. Clicking the `X` button or the overlay closes it the same way any base-ui `Dialog` does.

## Related Features

- [RBAC Permission Model](./02-rbac-permission-model.md) — `hasPermission`, per-route gating
- `docs/feature-boilerplate.md` § 10 — adding a sidebar entry for a new module needs no
  separate mobile-nav work; `MobileSidebar` reuses the same `Sidebar`/`routes` array
