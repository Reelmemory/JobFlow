import { auth } from '@clerk/nextjs/server'
import { loadProfileForm } from '@/lib/profile-ops'
import { ProfileForm } from './profile-form'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) return null

  const initial = await loadProfileForm(userId)
  return <ProfileForm initial={initial} />
}
