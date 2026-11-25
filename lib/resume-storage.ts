import { prisma } from '@/lib/prisma'
import { DEFAULT_ROLES } from '@/lib/preferences'
import { skillsFromResumeText } from '@/lib/resume-profile'
import { readResume } from '@/lib/resume-extract'

export async function storeResume(userId: string, file: File) {
  let parsed: Awaited<ReturnType<typeof readResume>>
  try {
    parsed = await readResume(file)
  } catch {
    return {
      error:
        'Choose a readable PDF, DOCX, or UTF-8 TXT CV up to 4 MB with selectable text (40–200,000 characters).',
    } as const
  }
  return prisma.$transaction(async (tx) => {
    const cv = await tx.resume.create({ data: { userId, ...parsed }, select: { id: true } })
    const values = {
      currentResumeId: cv.id,
      resumeText: parsed.text,
      resumeFileName: parsed.filename,
      resumeUrl: '/api/profile/resume?version=' + cv.id,
      skills: skillsFromResumeText(parsed.text),
    }
    const profile = await tx.profile.upsert({
      where: { userId },
      update: values,
      create: { userId, ...values, targetRoles: DEFAULT_ROLES, locations: ['Nigeria', 'Remote'] },
      select: { targetRoles: true, locations: true, skills: true },
    })
    return {
      success: true,
      resumeFileName: parsed.filename,
      resumeTextLength: parsed.text.length,
      preview: parsed.text.slice(0, 600),
      profile,
    } as const
  })
}

export async function downloadResume(clerkId: string, version: string | null) {
  const current =
    version ||
    (
      await prisma.profile.findFirst({
        where: { user: { clerkId } },
        select: { currentResumeId: true },
      })
    )?.currentResumeId
  if (!current) return null
  return prisma.resume.findFirst({
    where: { id: current, user: { clerkId } },
    select: { filename: true, bytes: true },
  })
}
