import * as z from "zod"

export const typeSchema = z.object({
  name: z.string().min(1, "Name is required"),
})

export type TypeInput = z.infer<typeof typeSchema>

export const typeUpdateSchema = z.object({
  id: z.string().min(1, "Type is required"),
  name: z.string().min(1, "Name is required"),
})

export type TypeUpdateInput = z.infer<typeof typeUpdateSchema>
