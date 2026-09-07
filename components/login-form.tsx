"use client"

import { useActionState } from "react"
import { useSearchParams } from "next/navigation"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Loader2, Lock, Mail } from "lucide-react"

import { loginAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formErrorsOf } from "@/lib/action-result"
import type { ActionState, AuthSession } from "@/types"

const initialState: ActionState<AuthSession["user"]> = null

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  )
  // Set by Proxy when it bounced an unauthenticated request off /dashboard/*.
  // Forwarded back so loginAction can return the user where they were headed.
  const from = useSearchParams().get("from")

  const failed = state && !state.success

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Welcome back
        </CardTitle>
        <CardDescription>
          Enter your email to sign in to your admin dashboard
        </CardDescription>
      </CardHeader>

      {/* `errors` is keyed by each Field.Root `name`, so the server's Zod issues
          land on the right control with no resolver package involved. */}
      <Form action={formAction} errors={formErrorsOf(state)}>
        <CardContent className="flex flex-col gap-4">
          {failed && state.message ? (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {state.message}
            </div>
          ) : null}

          {from ? <input type="hidden" name="from" value={from} /> : null}

          <Field.Root name="email" className="flex flex-col gap-2">
            <Field.Label className="text-sm font-medium">
              Email address
            </Field.Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="email"
                type="email"
                placeholder="name@example.com"
                className="pl-9"
                autoComplete="email"
                disabled={isPending}
              />
            </div>
            <Field.Error className="text-xs text-destructive" />
          </Field.Root>

          <Field.Root name="password" className="flex flex-col gap-2">
            <Field.Label className="text-sm font-medium">Password</Field.Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                autoComplete="current-password"
                disabled={isPending}
              />
            </div>
            <Field.Error className="text-xs text-destructive" />
          </Field.Root>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Authenticating…
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          {/* Dev-only. Never ship seeded credentials to a production page. */}
          {process.env.NODE_ENV !== "production" ? (
            <p className="text-center text-xs text-muted-foreground">
              Seeded account:{" "}
              <span className="font-mono font-medium text-foreground">
                tanzil@leapinglogic.com
              </span>{" "}
              /{" "}
              <span className="font-mono font-medium text-foreground">
                ChangeMe123!
              </span>
            </p>
          ) : null}
        </CardFooter>
      </Form>
    </Card>
  )
}
