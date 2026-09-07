import "server-only"

import { prisma } from "@/lib/prisma"
import type { IPermission, IRole, IUser, UserStatus } from "@/types"
import { PermissionAction, Resource, UserRole } from "@/types/enums"
import type {
  Permission as PermissionRow,
  Role as RoleRow,
  User as UserRow,
} from "@/lib/generated/prisma/client"

/**
 * Row -> domain mappers.
 *
 * The Prisma enum members are declared with the same string values as the
 * TypeScript enums, so these are assertions rather than lookups. That identity
 * is load-bearing: changing a value on either side without the other silently
 * breaks the mapping, so keep `prisma/schema.prisma` and `types/enums.ts` in
 * step.
 */
function toPermission(row: PermissionRow): IPermission {
  return {
    id: row.id,
    action: row.action as PermissionAction,
    resource: row.resource as Resource,
    description: row.description ?? undefined,
  }
}

function toRole(row: RoleRow & { permissions: PermissionRow[] }): IRole {
  return {
    id: row.id,
    name: row.name,
    key: row.key as UserRole,
    permissions: row.permissions.map(toPermission),
  }
}

export function toUser(
  row: UserRow & { role: RoleRow & { permissions: PermissionRow[] } }
): IUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image ?? undefined,
    role: toRole(row.role),
    status: row.status as UserStatus,
    createdAt: row.createdAt,
  }
}

const withPermissions = { permissions: true } as const

export async function listRoles(): Promise<IRole[]> {
  const rows = await prisma.role.findMany({
    include: withPermissions,
    orderBy: { name: "asc" },
  })
  return rows.map(toRole)
}

export async function findRoleByKey(key: UserRole): Promise<IRole | null> {
  const row = await prisma.role.findUnique({
    where: { key },
    include: withPermissions,
  })
  return row ? toRole(row) : null
}

export async function insertRole(input: {
  name: string
  key: UserRole
  permissionIds: string[]
}): Promise<IRole> {
  const row = await prisma.role.create({
    data: {
      name: input.name,
      key: input.key,
      permissions: { connect: input.permissionIds.map((id) => ({ id })) },
    },
    include: withPermissions,
  })
  return toRole(row)
}

/**
 * Replaces a role's permission set wholesale.
 *
 * `set` rather than `connect`, so unchecking a box actually removes the grant
 * instead of leaving it attached.
 */
export async function setRolePermissions(
  roleId: string,
  permissionIds: string[]
): Promise<IRole> {
  const row = await prisma.role.update({
    where: { id: roleId },
    data: { permissions: { set: permissionIds.map((id) => ({ id })) } },
    include: withPermissions,
  })
  return toRole(row)
}

export async function findRoleById(roleId: string): Promise<IRole | null> {
  const row = await prisma.role.findUnique({
    where: { id: roleId },
    include: withPermissions,
  })
  return row ? toRole(row) : null
}

/** Resolves permission ids to rows, so unknown ids can be rejected up front. */
export async function findPermissionsByIds(
  ids: string[]
): Promise<IPermission[]> {
  const rows = await prisma.permission.findMany({ where: { id: { in: ids } } })
  return rows.map(toPermission)
}

export async function removeRole(roleId: string): Promise<boolean> {
  const result = await prisma.role.deleteMany({ where: { id: roleId } })
  return result.count > 0
}

export async function listPermissions(): Promise<IPermission[]> {
  const rows = await prisma.permission.findMany({
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  })
  return rows.map(toPermission)
}

export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: withPermissions } },
  })
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: { role: { include: withPermissions } },
  })
}
