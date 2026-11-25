import { prisma } from '@/lib/prisma'
import { DEFAULT_ROLES, preferences } from '@/lib/preferences'
import { skillsFromResumeText } from '@/lib/resume-profile'
import { storeResume } from '@/lib/resume-storage'
import { getOrCreateUser } from '@/lib/clerk-user'

const PREVIEW_LEN = 600

export type ProfileFormState = {
  targetRoles: string
  locations: string
  remoteOnly: boolean
  country: string
  experienceYears: number
  skills: string[]
  resumeFileName: string | null
  resumePreview: string | null
  resumeTextLength: number
}

export async function loadProfileForm(clerkId: string): Promise<ProfileFormState> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { profile: true },
  })
  const p = user?.profile
  return {
    targetRoles: (p?.targetRoles ?? []).join(', ') || DEFAULT_ROLES.join(', '),
    locations: (p?.locations ?? []).join(', ') || 'Nigeria, Remote',
    remoteOnly: Boolean(p?.remoteOnly),
    country: p?.country ?? 'Nigeria',
    experienceYears: p?.experienceYears ?? 0,
    skills: p?.skills ?? [],
    resumeFileName: p?.resumeFileName ?? null,
    resumePreview: p?.resumeText?.slice(0, PREVIEW_LEN) ?? null,
    resumeTextLength: p?.resumeText?.length ?? 0,
  }
}

export async function saveProfilePreferences(
  clerkId: string,
  input: { targetRoles: string[]; locations: string[]; remoteOnly: boolean; country?: string; experienceYears?: number },
) {
  input = preferences.parse(input)
  const user = await getOrCreateUser(clerkId)
  const current = await prisma.profile.findUnique({ where: { userId: user.id } })
  const skills = skillsFromResumeText(current?.resumeText)

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      targetRoles: input.targetRoles,
      locations: input.locations,
      remoteOnly: input.remoteOnly,
      country: input.country,
      experienceYears: input.experienceYears,
      ...(skills.length ? { skills } : {}),
    },
    create: {
      userId: user.id,
      targetRoles: input.targetRoles,
      locations: input.locations,
      remoteOnly: input.remoteOnly,
      country: input.country,
      experienceYears: input.experienceYears,
      skills,
    },
  })
}


export async function processResumeUpload(clerkId: string, file: File) {
  const user = await getOrCreateUser(clerkId)
  return storeResume(user.id, file)
}
