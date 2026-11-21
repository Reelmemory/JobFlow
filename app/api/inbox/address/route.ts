import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateInboxAddress } from '@/lib/inbox'
import { mailgunDomain } from '@/lib/mailgun'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const domain = mailgunDomain()
  const address = generateInboxAddress(userId, domain)

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: { inboxAddress: address },
    create: {
      clerkId: userId,
      email: `${userId}@placeholder.local`,
      inboxAddress: address,
    },
  })

  return NextResponse.json({ inboxAddress: user.inboxAddress })
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { inboxAddress: true },
  })

  return NextResponse.json({ inboxAddress: user?.inboxAddress || null })
}
