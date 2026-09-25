# Docs Knowledgebase

Feature-level documentation for this app, maintained incrementally as features are built/changed.
Goal: any coding agent can read `docs/features/*.md` and understand the app's business logic,
file layout, and implementation details up to the latest point.

## How to write a feature doc

Every file in `docs/features/` uses the **same standard format** — see
[`feature-boilerplate.md`](./feature-boilerplate.md#12-write-the-feature-doc) for the
exact template (`Status`/`Last updated` header, then Overview, Business Logic, File
Paths, Data Model, Permissions, Flow, Related Features, in that order) and for when a
feature counts as "complete" enough to document. Don't deviate per-module — predictable
structure across docs matters more than any single doc being more detailed.

Keep entries up to date when the feature changes — treat this as living documentation, not a
one-time snapshot.

See [`feature-boilerplate.md`](./feature-boilerplate.md) for the step-by-step recipe to
follow when adding any new role/permission-controlled module.

## Feature index

| # | Doc | Status |
|---|-----|--------|
| 01 | [Authentication](./features/01-authentication.md) | Planned |
| 02 | [RBAC Permission Model](./features/02-rbac-permission-model.md) | Planned |
| 03 | [User Management](./features/03-user-management.md) | Planned |
| 04 | [Role Management](./features/04-role-management.md) | Planned |
| 05 | [Permission Management](./features/05-permission-management.md) | Planned |
| 06 | [Dashboard & Settings](./features/06-dashboard-settings.md) | Planned |
| 07 | [UI & Theming](./features/07-ui-theming.md) | Complete |
| 08 | [Type Management](./features/08-type-management.md) | Complete |
