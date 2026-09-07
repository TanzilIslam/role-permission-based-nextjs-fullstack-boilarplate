# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About this project

This is a Next.js + shadcn/ui boilerplate/template repository (`nextjs-boilarplate`). It is intentionally minimal — a starting point for new apps, not a feature-complete product. Expect most directories to be near-empty scaffolding (`hooks/`, `lib/`, `public/`, `components/` contain only `.gitkeep` placeholders alongside the few real files).

## Important: this is not the Next.js you know

This repo pins `next@16.2.6`, a version with breaking API/convention/file-structure changes relative to what training data assumes. **Before writing or changing any Next.js-specific code (routing, data fetching, config, etc.), consult the bundled docs in `node_modules/next/dist/docs/` first** and follow any deprecation notices found there rather than assuming older Next.js patterns apply.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm start` — run the production build
- `npm run lint` — ESLint (flat config via `eslint.config.mjs`, using `eslint-config-next`'s core-web-vitals + typescript rule sets)
- `npm run typecheck` — `tsc --noEmit`
- `npm run format` — Prettier write across `**/*.{ts,tsx}`

There is no test setup in this repo currently.

## Adding shadcn/ui components

Components are added via the shadcn CLI, not hand-written from scratch:

```bash
npx shadcn@latest add <component>
```

This drops generated components into `components/ui/`. Import app code as `@/components/ui/<name>`.

## Architecture notes

- **Path alias**: `@/*` maps to the repo root (see `tsconfig.json`), e.g. `@/components/...`, `@/lib/...`.
- **`components.json`** drives shadcn generation: style `base-nova`, base color `neutral`, icon library `lucide`, no Tailwind prefix, CSS variables enabled, and CSS lives at `app/globals.css`. The `aliases` block there is the source of truth for where generated files land (`components`, `ui`, `lib`, `hooks`).
- **Styling**: Tailwind v4, configured CSS-first (no `tailwind.config.*`) — theme tokens and `@theme inline` mappings live directly in `app/globals.css`, which also imports `tw-animate-css` and `shadcn/tailwind.css`. Dark mode is the `.dark` class variant (`@custom-variant dark`), driven by `next-themes`.
- **Theming**: `components/theme-provider.tsx` wraps the app in `next-themes`' `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`) and additionally wires a global `d` keydown hotkey (`ThemeHotkey`) that toggles light/dark, ignoring keypresses inside editable/typing targets. This hotkey is a deliberate feature of the template, not incidental.
- **`lib/utils.ts`** re-exports `cn` from the `cn` package (not the more common hand-rolled `clsx`/`tailwind-merge` combo) — use `cn(...)` for conditional class merging, matching the `tailwindFunctions` list in `.prettierrc` (`cn`, `cva`) so Prettier sorts Tailwind classes inside those calls correctly.
- **UI primitives**: built on `@base-ui/react` primitives (e.g. `components/ui/button.tsx` wraps `@base-ui/react/button`) styled with `class-variance-authority` (`cva`) variants, not Radix.
- Formatting: Prettier config has `semi: false`, double quotes, `printWidth: 80`, and the `prettier-plugin-tailwindcss` plugin pointed at `app/globals.css` — match this style in new code.
