import { SignUp } from '@clerk/nextjs'
import { Suspense } from 'react'

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading sign up…</p>}>
        <SignUp
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
        />
      </Suspense>
    </main>
  )
}
