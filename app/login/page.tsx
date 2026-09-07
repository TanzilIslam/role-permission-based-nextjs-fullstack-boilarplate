import { Suspense } from "react"

import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-12">
      {/* LoginForm reads `?from=` via useSearchParams; without this boundary the
          route fails to prerender (missing-suspense-with-csr-bailout). */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
