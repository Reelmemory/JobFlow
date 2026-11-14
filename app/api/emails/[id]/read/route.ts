import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.email.updateMany({
    where: { id: params.id, user: { clerkId: userId } },
    data: { isRead: true },
  })

  return NextResponse.json({ ok: true })
}
