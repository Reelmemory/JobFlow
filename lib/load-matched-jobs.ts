import { prisma } from './prisma'
import { discover } from './discovery'
import { getOrCreateUser } from './clerk-user'
import { jobFingerprint } from './job-fingerprint'

export async function loadMatchedJobs(clerkId: string) {
  const user = await getOrCreateUser(clerkId)
  const matches = await discover(user.profile, user.clerkId)
  const apps = await prisma.application.findMany({
    where: { userId: user.id },
    select: { title: true, company: true },
  })
  const tracked = new Set(apps.map((a) => jobFingerprint(a.title, a.company)))
  const jobs = matches.map((j) => ({
    ...j,
    applied: tracked.has(jobFingerprint(j.title, j.company)),
  }))
  return {
    jobs,
    count: jobs.length,
    hasResume: Boolean(user.profile?.currentResumeId),
    profileComplete: Boolean(user.profile?.targetRoles.length),
    dbWarning: undefined,
    error: undefined,
  }
}
