'use server'

import { auth } from '@clerk/nextjs/server'
import { loadMatchedJobs } from '@/lib/load-matched-jobs'

export async function refreshJobsAction() {
  const { userId } = await auth()
  if (!userId) {
    return { error: 'Unauthorized', jobs: [] as Awaited<ReturnType<typeof loadMatchedJobs>>['jobs'] }
  }
  return loadMatchedJobs(userId)
}
