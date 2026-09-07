import { PermissionAction, Resource, UserRole } from "./enums"

/**
 * Canonical flattened permission format: `resource:action` (e.g. "users:create").
 * Kept as a template literal type so typos fail at compile time.
 */
export type PermissionKey = `${Resource}:${PermissionAction}`

export type UserStatus = "active" | "inactive" | "pending"

export interface IPermission {
  id: string
  action: PermissionAction
  resource: Resource
  description?: string
}

export interface IRole {
  id: string
  name: string
  key: UserRole
  permissions: IPermission[]
}

export interface IUser {
  id: string
  name: string
  email: string
  image?: string
  role: IRole
  status: UserStatus
  createdAt: Date
}

export interface AuthSession {
  user: {
    id: string
    name: string
    email: string
    role: UserRole
    /** Flattened permissions, e.g. ["users:create", "roles:read"]. */
    permissions: PermissionKey[]
  }
}

/** Field-keyed validation errors, shaped for Base UI's `<Form errors>` prop. */
export type FormErrors = Record<string, string[]>

/**
 * Uniform Server Action return value. A discriminated union so `success`
 * narrows the shape — this replaces an untyped `any` action state.
 */
export type ActionResult<TData = undefined> =
  | { success: true; message: string; data: TData }
  | { success: false; message: string; errors?: FormErrors }

/** Initial/idle state for `useActionState`. */
export type ActionState<TData = undefined> = ActionResult<TData> | null
