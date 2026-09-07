import type { ActionResult, ActionState, FormErrors } from "@/types"

/** Builds a successful `ActionResult`. */
export function actionSuccess<TData>(
  message: string,
  data: TData
): ActionResult<TData> {
  return { success: true, message, data }
}

/** Builds a failed `ActionResult`. */
export function actionFailure(
  message: string,
  errors?: FormErrors
): ActionResult<never> {
  return { success: false, message, errors }
}

/**
 * Normalizes a thrown value into a failed `ActionResult`.
 *
 * Server Actions must not leak internal error details to the client, so only
 * `Error.message` is forwarded and anything unrecognized becomes a generic
 * message.
 */
export function actionError(error: unknown): ActionResult<never> {
  if (error instanceof Error) {
    return actionFailure(error.message)
  }

  return actionFailure("Something went wrong. Please try again.")
}

/** Extracts field errors from an action state for `<Form errors>`. */
export function formErrorsOf(state: ActionState<unknown>): FormErrors {
  if (!state || state.success) {
    return {}
  }

  return state.errors ?? {}
}
