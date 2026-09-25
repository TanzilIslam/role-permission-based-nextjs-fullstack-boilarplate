# Docs Knowledgebase

Feature-level documentation for this app, maintained incrementally as features are built/changed.
Goal: any coding agent can read `docs/features/*.md` and understand the app's business logic,
file layout, and implementation details up to the latest point.

## How to write a feature doc

Each file in `docs/features/` should cover:

- **Overview** — what the feature does, in plain terms
- **Business logic** — rules, invariants, edge cases
- **File paths** — key files/dirs involved, with one-line purpose each
- **Data model** — relevant Prisma models/enums, if any
- **Flow** — step-by-step of how a request/action moves through the system
- **Related features** — links to other docs this depends on or affects

Keep entries up to date when the feature changes — treat this as living documentation, not a
one-time snapshot.

See [`feature-boilerplate.md`](./feature-boilerplate.md) for the step-by-step recipe to
follow when adding any new role/permission-controlled module.

## Feature index

| # | Doc | Status |
|---|-----|--------|
| 01 | [Authentication](./features/01-authentication.md) | empty |
| 02 | [RBAC Permission Model](./features/02-rbac-permission-model.md) | empty |
| 03 | [User Management](./features/03-user-management.md) | empty |
| 04 | [Role Management](./features/04-role-management.md) | empty |
| 05 | [Permission Management](./features/05-permission-management.md) | empty |
| 06 | [Dashboard & Settings](./features/06-dashboard-settings.md) | empty |
| 07 | [UI & Theming](./features/07-ui-theming.md) | empty |
