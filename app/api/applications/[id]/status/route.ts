
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { status } = await req.json()

  const allowed = [
    'applied',
    'viewed',
    'interview',
    'rejected',
    'offer',
  ]

  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: 'Invalid status' },
      { status: 400 }
    )
  }

  const application = await prisma.application.updateMany({
    where: {
      id,
      user: { clerkId: userId }, submittedAt: { not: null },
    },
    data: { status },
  })

  if (application.count === 0) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}
