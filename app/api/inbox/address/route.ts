import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

function generateInboxAddress(clerkId: string, domain: string) {
  const short = clerkId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase()
  const rand = Math.random().toString(36).slice(2, 6)
  return `${short}${rand}@${domain}`
}

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const domain = process.env.MAILGUN_DOMAIN || 'sandbox.mailgun.org'
  const address = generateInboxAddress(userId, domain)

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: { inboxAddress: address },
    create: {
      clerkId: userId,
      email: `${userId}@placeholder.local`, // Clerk will sync later
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
