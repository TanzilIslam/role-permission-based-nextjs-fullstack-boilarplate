import "server-only"

import { prisma } from "@/lib/prisma"
import type { ICategory } from "@/types"
import type { Category as CategoryRow } from "@/lib/generated/prisma/client"

function toCategory(row: CategoryRow): ICategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.createdAt,
  }
}

export async function listCategories(): Promise<ICategory[]> {
  const rows = await prisma.category.findMany({ orderBy: { createdAt: "asc" } })
  return rows.map(toCategory)
}

export async function insertCategory(input: {
  name: string
  description?: string
}): Promise<ICategory> {
  const row = await prisma.category.create({
    data: { name: input.name, description: input.description },
  })
  return toCategory(row)
}

export async function updateCategory(
  id: string,
  input: { name: string; description?: string }
): Promise<ICategory | null> {
  try {
    const row = await prisma.category.update({
      where: { id },
      data: { name: input.name, description: input.description },
    })
    return toCategory(row)
  } catch {
    // Prisma throws (P2025) rather than returning null when the row is gone —
    // swallow it so the action can return a normal "not found".
    return null
  }
}

export async function removeCategory(id: string): Promise<boolean> {
  const result = await prisma.category.deleteMany({ where: { id } })
  return result.count > 0
}
