import { auth } from '@clerk/nextjs/server'
import { loadMatchedJobs } from '@/lib/load-matched-jobs'
import { MatchesClient } from './matches-client'

export const dynamic = 'force-dynamic'

export default async function MatchesPage() {
  const { userId } = await auth()
  if (!userId) return null

  const initial = await loadMatchedJobs(userId)
  return <MatchesClient initial={initial} />
}
