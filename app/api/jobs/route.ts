import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { fetchAllJobs } from '@/lib/jobs'
import { filterJobsForProfile, scoreJobForProfile, type ProfileForMatch } from '@/lib/match'
import { jobFingerprint } from '@/lib/job-fingerprint'
import { extractApplyEmail } from '@/lib/extract-apply-email'
import { prismaErrorMessage } from '@/lib/prisma-errors'
import { stripHtmlToPlainText } from '@/lib/strip-html'

const EMPTY_PROFILE: ProfileForMatch = {
  resumeText: '',
  targetRoles: [],
  locations: [],
  skills: [],
  remoteOnly: false,
  blacklist: [],
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let profileForMatch: ProfileForMatch = { ...EMPTY_PROFILE }
    let appliedFingerprints = new Set<string>()
    let hasResume = false
    let profileComplete = false
    let dbWarning: string | undefined

    try {
      const clerkUser = await currentUser()
      const email =
        clerkUser?.primaryEmailAddress?.emailAddress ||
        clerkUser?.emailAddresses?.[0]?.emailAddress ||
        `${userId}@users.clerk.jobflow`

      const user = await prisma.user.upsert({
        where: { clerkId: userId },
        update: {
          email,
          name: clerkUser?.fullName || clerkUser?.firstName || undefined,
        },
        create: {
          clerkId: userId,
          email,
          name: clerkUser?.fullName || clerkUser?.firstName || 'User',
        },
        include: { profile: true },
      })

      const profile = user.profile
      profileForMatch = {
        resumeText: profile?.resumeText,
        targetRoles: profile?.targetRoles ?? [],
        locations: profile?.locations ?? [],
        skills: profile?.skills ?? [],
        remoteOnly: profile?.remoteOnly ?? false,
        blacklist: profile?.blacklist ?? [],
      }

      const applications = await prisma.application.findMany({
        where: { userId: user.id },
        select: { title: true, company: true },
      })
      appliedFingerprints = new Set(
        applications.map((a) => jobFingerprint(a.title, a.company)),
      )

      hasResume = Boolean(profile?.resumeText && profile.resumeText.length >= 20)
      profileComplete = hasResume && (profile?.targetRoles?.length ?? 0) > 0
    } catch (dbErr) {
      const { message, code } = prismaErrorMessage(dbErr)
      console.error('Jobs API DB error:', dbErr)
      if (code === 'P1001') {
        dbWarning = message
      } else {
        return NextResponse.json({ error: message, code }, { status: 500 })
      }
    }

    const techmapKey = process.env.TECHMAP_RAPIDAPI_KEY
    const rawJobs = await fetchAllJobs(techmapKey)
    const filtered = filterJobsForProfile(rawJobs, profileForMatch)

    const jobs = filtered
      .map((j) => {
        const description = stripHtmlToPlainText(j.description)
        return {
          ...j,
          description,
          match: scoreJobForProfile({ ...j, description }, profileForMatch),
          applied: appliedFingerprints.has(jobFingerprint(j.title, j.company)),
          applyEmail: extractApplyEmail(description),
        }
      })
      .sort((a, b) => (b.match || 0) - (a.match || 0))

    return NextResponse.json({
      jobs,
      count: jobs.length,
      hasResume,
      profileComplete,
      dbWarning,
      sources: {
        remotive: jobs.filter((j) => j.source === 'remotive').length,
        greenhouse: jobs.filter((j) => j.source === 'greenhouse').length,
        lever: jobs.filter((j) => j.source === 'lever').length,
        techmap: jobs.filter((j) => j.source === 'techmap').length,
      },
      fetchedTotal: rawJobs.length,
      appliedCount: jobs.filter((j) => j.applied).length,
    })
  } catch (e: unknown) {
    console.error('Jobs API error:', e)
    const { message, code } = prismaErrorMessage(e)
    return NextResponse.json(
      { error: message, code },
      { status: 500 },
    )
  }
}