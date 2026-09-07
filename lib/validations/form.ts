import type * as z from "zod"

/**
 * Adapts a Zod failure into the `errors` object Base UI's `<Form>` expects,
 * keyed by the `name` on each `<Field.Root>`.
 */
export function toFormErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}

  for (const issue of error.issues) {
    // Nested paths (e.g. ["address", "city"]) flatten to "address.city".
    const name = issue.path.join(".")
    if (!name) {
      continue
    }
    ;(fieldErrors[name] ??= []).push(issue.message)
  }

  return fieldErrors
}

/**
 * Validates raw `<Form>` values against a schema, returning either parsed data
 * or errors already shaped for the `errors` prop.
 */
export function validateForm<TSchema extends z.ZodType>(
  schema: TSchema,
  values: unknown
):
  | { success: true; data: z.output<TSchema> }
  | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(values)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, errors: toFormErrors(result.error) }
}
