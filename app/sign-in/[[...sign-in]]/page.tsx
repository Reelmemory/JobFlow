import { SignIn } from '@clerk/nextjs'
import { Suspense } from 'react'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading sign in…</p>}>
        <SignIn
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
        />
      </Suspense>
    </main>
  )
}
