import { prisma } from './prisma'
import { discover } from './discovery'
import { prepareDraft } from './drafts'
import { dispatch, reconcile } from './dispatch'

export async function runHunt() {
  const pending = await prisma.application.findMany({
    where: { delivery: 'queued', attemptKey: { not: null } },
    select: { attemptKey: true },
  })
  let errors = 0
  for (const item of pending) {
    try {
      await reconcile(item.attemptKey!)
    } catch {
      errors++
    }
  }
  const users = await prisma.user.findMany({
    where: { autoHunt: true, huntResumeId: { not: null } },
    include: { profile: true },
  })
  let processed = 0
  for (const user of users) {
    try {
      const matches = await discover(user.profile, user.clerkId)
      for (const job of matches) {
        try {
          const app = await prepareDraft(user.id, job.id, true)
          if (!app.reviewReason && ['draft', 'failed'].includes(app.delivery))
            await dispatch(user.id, app.id, true)
          processed++
        } catch {
          errors++
        }
      }
    } catch {
      errors++
    }
  }
  return { accounts: users.length, processed, errors }
}
