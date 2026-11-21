import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { skillsFromResumeText } from '@/lib/resume-profile'
import { prismaErrorMessage } from '@/lib/prisma-errors'

export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { profile: true },
    })

    if (!user?.profile) {
      return NextResponse.json({ profile: null })
    }

    const {
      resumeText,
      resumeUrl,
      resumeFileName,
      targetRoles,
      locations,
      skills,
      remoteOnly,
    } = user.profile

    return NextResponse.json({
      profile: {
        resumeText,
        resumeUrl,
        resumeFileName,
        hasResumeFile: Boolean(resumeUrl),
        resumePreview: resumeText?.slice(0, 600) ?? null,
        resumeTextLength: resumeText?.length ?? 0,
        targetRoles,
        locations,
        skills,
        remoteOnly,
      },
    })
  } catch (error) {
    console.error(error)
    const { message, code } = prismaErrorMessage(error)
    return NextResponse.json(
      { error: message || 'Failed to load profile', code },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { targetRoles, locations, remoteOnly } = body

    const clerkUser = await currentUser()
    const email =
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress ||
      `${clerkId}@users.clerk.jobflow`

    const user = await prisma.user.upsert({
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
    })

    const current = await prisma.profile.findUnique({ where: { userId: user.id } })
    const skills = skillsFromResumeText(current?.resumeText)

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        targetRoles: targetRoles || [],
        locations: locations || [],
        remoteOnly: Boolean(remoteOnly),
        ...(skills.length ? { skills } : {}),
      },
      create: {
        userId: user.id,
        targetRoles: targetRoles || [],
        locations: locations || [],
        remoteOnly: Boolean(remoteOnly),
        skills,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    const { message, code } = prismaErrorMessage(error)
    return NextResponse.json(
      { error: message || 'Failed to save profile', code },
      { status: 500 },
    )
  }
}
