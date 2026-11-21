import { prisma } from '@/lib/prisma'
import { extractTextFromResume, validateResumeBuffer } from '@/lib/resume-extract'
import {
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
import { getOrCreateUser } from '@/lib/clerk-user'
import fs from 'fs/promises'
import path from 'path'

const PREVIEW_LEN = 600

export type ProfileFormState = {
  targetRoles: string
  locations: string
  remoteOnly: boolean
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
    targetRoles: (p?.targetRoles ?? []).join(', ') || 'Software Engineer, Full Stack Developer',
    locations: (p?.locations ?? []).join(', ') || 'Remote, Lagos, Nairobi',
    remoteOnly: Boolean(p?.remoteOnly),
    skills: p?.skills ?? [],
    resumeFileName: p?.resumeFileName ?? null,
    resumePreview: p?.resumeText?.slice(0, PREVIEW_LEN) ?? null,
    resumeTextLength: p?.resumeText?.length ?? 0,
  }
}

export async function saveProfilePreferences(
  clerkId: string,
  input: { targetRoles: string[]; locations: string[]; remoteOnly: boolean },
) {
  const user = await getOrCreateUser(clerkId)
  const current = await prisma.profile.findUnique({ where: { userId: user.id } })
  const skills = skillsFromResumeText(current?.resumeText)

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      targetRoles: input.targetRoles,
      locations: input.locations,
      remoteOnly: input.remoteOnly,
      ...(skills.length ? { skills } : {}),
    },
    create: {
      userId: user.id,
      targetRoles: input.targetRoles,
      locations: input.locations,
      remoteOnly: input.remoteOnly,
      skills,
    },
  })
}

export async function processResumeUpload(clerkId: string, file: File) {
  const buffer = Buffer.from(await file.arrayBuffer())
  const check = validateResumeBuffer(buffer, file.name)
  if (!check.ok) {
    return { error: check.error } as const
  }

  let resumeText: string
  try {
    resumeText = await extractTextFromResume(buffer, file.name)
  } catch (e) {
    console.error(e)
    return { error: 'Could not read this file. Try a different PDF or DOCX.' } as const
  }

  if (resumeText.length < 40) {
    return { error: 'Very little text was found. Upload a text-based PDF or DOCX.' } as const
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

  return {
    success: true as const,
    resumeFileName: file.name,
    resumeTextLength: resumeText.length,
    preview: resumeText.slice(0, PREVIEW_LEN),
    profile: {
      targetRoles: merged.targetRoles,
      locations: merged.locations,
      skills: merged.skills,
    },
  }
}
