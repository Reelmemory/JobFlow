import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { fetchAllJobs, scoreJob } from '@/lib/jobs'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { profile: true },
    })

    const resumeText = user?.profile?.resumeText || ''
    const techmapKey = process.env.TECHMAP_RAPIDAPI_KEY
    const rawJobs = await fetchAllJobs(techmapKey)

    const jobs = rawJobs.map(j => ({
      ...j,
      match: scoreJob(j, resumeText),
    })).sort((a, b) => (b.match || 0) - (a.match || 0))

    return NextResponse.json({
      jobs,
      count: jobs.length,
      sources: {
        remotive: jobs.filter(j => j.source === 'remotive').length,
        ats: jobs.filter(j => j.source === 'greenhouse' || j.source === 'lever').length,
        techmap: jobs.filter(j => j.source === 'techmap').length,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
