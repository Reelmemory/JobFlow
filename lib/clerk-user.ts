import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function getOrCreateUser(clerkId: string) {
  const clerkUser = await currentUser()
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    `${clerkId}@users.clerk.jobflow`

  return prisma.user.upsert({
    where: { clerkId },
    update: {
      email,
      name: clerkUser?.fullName || clerkUser?.firstName || undefined,
    },
    create: {
      clerkId,
      email,
      name: clerkUser?.fullName || clerkUser?.firstName || 'User',
    },
    include: { profile: true },
  })
}
