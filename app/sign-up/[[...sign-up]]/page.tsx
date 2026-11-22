import { SignUp } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AuthFrame } from '@/components/auth-frame'
import { clerkAuthAppearance } from '@/lib/clerk-appearance'

export const dynamic = 'force-dynamic'

export default async function SignUpPage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <AuthFrame mode="signup">
      <SignUp routing="path" path="/sign-up" appearance={clerkAuthAppearance} />
    </AuthFrame>
  )
}
