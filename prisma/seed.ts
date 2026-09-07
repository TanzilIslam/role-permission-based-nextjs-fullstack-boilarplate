import "dotenv/config"

import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

import {
  PermissionActionKey,
  PrismaClient,
  ResourceKey,
  UserRoleKey,
  UserStatusKey,
} from "../lib/generated/prisma/client"

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DIRECT_URL / DATABASE_URL is not set")
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

/** Which actions each role gets on each resource. */
const ROLE_GRANTS: Record<
  UserRoleKey,
  Partial<Record<ResourceKey, PermissionActionKey[]>>
> = {
  SUPER_ADMIN: {
    users: ["manage"],
    roles: ["manage"],
    permissions: ["manage"],
    dashboard: ["manage"],
    settings: ["manage"],
  },
  ADMIN: {
    users: ["manage"],
    roles: ["read"],
    permissions: ["read"],
    dashboard: ["read"],
    settings: ["read"],
  },
  MANAGER: {
    users: ["read", "update"],
    dashboard: ["read"],
  },
  USER: {
    dashboard: ["read"],
  },
}

const ROLE_NAMES: Record<UserRoleKey, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  MANAGER: "Manager",
  USER: "User",
}

async function main() {
  // 1. Full permission catalogue: every resource x every action.
  const catalogue = Object.values(ResourceKey).flatMap((resource) =>
    Object.values(PermissionActionKey).map((action) => ({
      resource,
      description: `${action} ${resource}`,
      action,
    }))
  )

  for (const permission of catalogue) {
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: permission.resource,
          action: permission.action,
        },
      },
      create: permission,
      update: { description: permission.description },
    })
  }
  console.log(`permissions: ${catalogue.length}`)

  // 2. Roles, each connected to its granted permissions.
  for (const key of Object.values(UserRoleKey)) {
    const grants = ROLE_GRANTS[key]
    const ids = await prisma.permission.findMany({
      where: {
        OR: Object.entries(grants).map(([resource, actions]) => ({
          resource: resource as ResourceKey,
          action: { in: actions as PermissionActionKey[] },
        })),
      },
      select: { id: true },
    })

    await prisma.role.upsert({
      where: { key },
      create: {
        key,
        name: ROLE_NAMES[key],
        permissions: { connect: ids },
      },
      update: {
        name: ROLE_NAMES[key],
        // `set` rather than `connect` so re-seeding cannot accumulate stale grants.
        permissions: { set: ids },
      },
    })
    console.log(`role ${key}: ${ids.length} permissions`)
  }

  // 3. A super admin to sign in with.
  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { key: UserRoleKey.SUPER_ADMIN },
  })

  const email = "tanzil@leapinglogic.com"
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!"

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Tanzil",
      passwordHash: await bcrypt.hash(password, 12),
      status: UserStatusKey.active,
      roleId: superAdminRole.id,
    },
    update: { roleId: superAdminRole.id, status: UserStatusKey.active },
  })
  console.log(`user ${email} -> SUPER_ADMIN`)

  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn(
      "\nWARNING: seeded with the default password. Set SEED_ADMIN_PASSWORD before seeding anywhere real."
    )
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
