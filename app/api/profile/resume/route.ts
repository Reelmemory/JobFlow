import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { extractTextFromResume, validateResumeBuffer } from '@/lib/resume-extract'
import {
  absoluteResumePath,
  clearUserResumes,
  ensureResumeDir,
  relativeResumePath,
  resumeDirForUser,
  safeResumeFileName,
} from '@/lib/resume-storage'
import {
  extractProfileFromResumeText,
  mergeExtractedIntoProfile,
  skillsFromResumeText,
} from '@/lib/resume-profile'
import { prismaErrorMessage } from '@/lib/prisma-errors'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

const PREVIEW_LEN = 600

async function getOrCreateUser(clerkId: string) {
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

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const check = validateResumeBuffer(buffer, file.name)
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }

    let resumeText: string
    try {
      resumeText = await extractTextFromResume(buffer, file.name)
    } catch (e) {
      console.error(e)
      return NextResponse.json(
        { error: 'Could not read this file. Try a different PDF or DOCX.' },
        { status: 400 },
      )
    }

    if (resumeText.length < 40) {
      return NextResponse.json(
        { error: 'Very little text was found. Upload a text-based PDF or DOCX.' },
        { status: 400 },
      )
    }

    const user = await getOrCreateUser(clerkId)
    await ensureResumeDir(user.id)
    await clearUserResumes(user.id)

    const storedName = safeResumeFileName(file.name)
    const filePath = path.join(resumeDirForUser(user.id), storedName)
    await fs.writeFile(filePath, buffer)

    const relativePath = relativeResumePath(user.id, storedName)
    const keywordSkills = skillsFromResumeText(resumeText)
    const extracted = await extractProfileFromResumeText(resumeText)

    const existing = {
      targetRoles: user.profile?.targetRoles ?? [],
      locations: user.profile?.locations ?? [],
      skills: user.profile?.skills ?? [],
    }
    const merged = mergeExtractedIntoProfile(existing, extracted, keywordSkills)

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        resumeText,
        resumeUrl: relativePath,
        resumeFileName: file.name,
        targetRoles: merged.targetRoles,
        locations: merged.locations,
        skills: merged.skills,
      },
      create: {
        userId: user.id,
        resumeText,
        resumeUrl: relativePath,
        resumeFileName: file.name,
        targetRoles: merged.targetRoles,
        locations: merged.locations,
        skills: merged.skills,
      },
    })

    return NextResponse.json({
      success: true,
      resumeFileName: file.name,
      storedFileName: storedName,
      resumeTextLength: resumeText.length,
      preview: resumeText.slice(0, PREVIEW_LEN),
      extracted: extracted ?? {
        targetRoles: merged.targetRoles,
        skills: merged.skills,
        locations: merged.locations,
      },
      profile: {
        targetRoles: merged.targetRoles,
        locations: merged.locations,
        skills: merged.skills,
      },
    })
  } catch (error) {
    console.error(error)
    const { message, code } = prismaErrorMessage(error)
    return NextResponse.json({ error: message || 'Failed to process resume', code }, { status: 500 })
  }
}

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

    if (!user?.profile?.resumeUrl) {
      return NextResponse.json({ error: 'No resume on file' }, { status: 404 })
    }

    const abs = absoluteResumePath(user.profile.resumeUrl)
    const data = await fs.readFile(abs)
    const fileName = path.basename(user.profile.resumeUrl)

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${user.profile.resumeFileName || fileName}"`,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }
}