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

export async function linkInboundToApplication(params: {
  userId: string
  from: string
  subject: string
}) {
  const { userId, from, subject } = params
  const headerMatch = subject.match(/\[jf-([a-z0-9]+)\]/i)
  if (headerMatch) {
    const app = await prisma.application.findFirst({
      where: { userId, id: { startsWith: headerMatch[1] } },
    })
    if (app) return app.id
  }

  const fromLower = from.toLowerCase()
  const fromEmail = fromLower.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)?.[0]
  if (fromEmail) {
    const byApplyTo = await prisma.application.findFirst({
      where: { userId, applyEmail: { equals: fromEmail, mode: 'insensitive' } },
      orderBy: { appliedAt: 'desc' },
    })
    if (byApplyTo) return byApplyTo.id
  }

  const apps = await prisma.application.findMany({
    where: { userId },
    orderBy: { appliedAt: 'desc' },
    take: 40,
    select: { id: true, company: true, title: true },
  })
  const sub = subject.toLowerCase()
  return (
    apps.find((a) => a.company && sub.includes(a.company.toLowerCase()))?.id ??
    null
  )
}