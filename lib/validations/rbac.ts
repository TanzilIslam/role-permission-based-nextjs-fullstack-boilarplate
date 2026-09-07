import * as z from "zod"

import { PermissionAction, Resource, UserRole } from "@/types/enums"

export const permissionSchema = z.object({
  action: z.enum(PermissionAction),
  resource: z.enum(Resource),
  description: z.string().optional(),
})

export const roleSchema = z.object({
  name: z.string().min(3, "Role name is required"),
  // Constrained to UserRole so the schema matches `IRole["key"]`.
  key: z.enum(UserRole),
  permissionIds: z.array(z.string()).min(1, "Select at least one permission"),
})

export const userUpdateSchema = z.object({
  name: z.string().optional(),
  roleId: z.string().min(1, "Role assignment is required"),
  status: z.enum(["active", "inactive", "pending"]),
})

/**
 * Inbound `IUser` shape for Route Handlers. `createdAt` arrives as a JSON
 * string over HTTP, so it is coerced rather than typed as `Date`.
 */
export const userRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  image: z.string().optional(),
  status: z.enum(["active", "inactive", "pending"]),
  createdAt: z.coerce.date(),
})

export type PermissionInput = z.infer<typeof permissionSchema>
export type RoleInput = z.infer<typeof roleSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type UserRecord = z.infer<typeof userRecordSchema>
