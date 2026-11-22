import { SignIn } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AuthFrame } from '@/components/auth-frame'
import { clerkAuthAppearance } from '@/lib/clerk-appearance'

export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <AuthFrame mode="signin">
      <SignIn routing="path" path="/sign-in" appearance={clerkAuthAppearance} />
    </AuthFrame>
  )
}
