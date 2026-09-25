import * as z from "zod"

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
})

export type CategoryInput = z.infer<typeof categorySchema>

// A separate schema for update, not a `.partial()` of categorySchema — update
// needs the `id`, and reusing the same shape would make `id` optional on create too.
export const categoryUpdateSchema = z.object({
  id: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
})

export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>
