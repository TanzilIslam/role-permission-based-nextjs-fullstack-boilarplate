import "server-only"

import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/lib/generated/prisma/client"

/**
 * Prisma 7 requires a driver adapter — `datasourceUrl` no longer exists.
 * `@prisma/adapter-pg` speaks plain TCP, which is what Neon's pooled endpoint
 * expects from the Node runtime. The Neon serverless driver
 * (`@prisma/adapter-neon`) is only needed on edge, and nothing here runs there.
 *
 * Note this uses DATABASE_URL (pooled) while migrations use DIRECT_URL.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

// Dev server HMR re-evaluates modules, which would otherwise open a new pool on
// every reload until Neon refuses connections.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
