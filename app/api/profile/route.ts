import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { resumeText, targetRoles, locations } = body

    let user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId,
          email: `${clerkId}@placeholder.com`,
          name: 'User',
        },
      })
    }

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        resumeText: resumeText || null,
        targetRoles: targetRoles || [],
        locations: locations || [],
      },
      create: {
        userId: user.id,
        resumeText: resumeText || null,
        targetRoles: targetRoles || [],
        locations: locations || [],
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
