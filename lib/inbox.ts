import { prisma } from '@/lib/prisma'
import { mailgunDomain } from '@/lib/mailgun'

export function generateInboxAddress(clerkId: string, domain: string) {
  const short = clerkId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase()
  const rand = Math.random().toString(36).slice(2, 6)
  return `${short}${rand}@${domain}`
}

export async function ensureInboxAddress(userId: string, clerkId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.inboxAddress) return user.inboxAddress

  const address = generateInboxAddress(clerkId, mailgunDomain())
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { inboxAddress: address },
  })
  return updated.inboxAddress as string
}

