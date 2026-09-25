import "server-only"

import { prisma } from "@/lib/prisma"
import type { IType } from "@/types"
import type { Type as TypeRow } from "@/lib/generated/prisma/client"

function toType(row: TypeRow): IType {
  return { id: row.id, name: row.name, createdAt: row.createdAt }
}

export async function listTypes(): Promise<IType[]> {
  const rows = await prisma.type.findMany({ orderBy: { createdAt: "asc" } })
  return rows.map(toType)
}

export async function insertType(name: string): Promise<IType> {
  const row = await prisma.type.create({ data: { name } })
  return toType(row)
}

export async function updateType(
  id: string,
  name: string
): Promise<IType | null> {
  try {
    const row = await prisma.type.update({ where: { id }, data: { name } })
    return toType(row)
  } catch {
    return null
  }
}

export async function removeType(id: string): Promise<boolean> {
  const result = await prisma.type.deleteMany({ where: { id } })
  return result.count > 0
}
