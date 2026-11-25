import { listingVersion, reviewVersion } from './listing-version'
import { sandboxListing } from './sandbox-listing'
import { randomUUID } from 'node:crypto'
import { prisma } from './prisma'
import { assess } from './discovery'
import { canSend, getMailgunClient, mailgunDomain, sendApplicationEmail } from './mailgun'

export function reconciliationCutoff() {
  // Let an in-flight provider call (15s timeout) finish before polling its events.
  return new Date(Date.now() - 60_000)
}

export function startOfDay() {
  const day = new Date()
  day.setUTCHours(0, 0, 0, 0)
  return day
}

export async function recordOutcome(attempt: string, event: string, providerId?: string) {
  const accepted = ['accepted', 'delivered', 'permanent_fail', 'temporary_fail'].includes(event)
  if (!accepted) return
  const delivery = (
    {
      delivered: 'delivered',
      permanent_fail: 'bounced',
      temporary_fail: 'deferred',
      accepted: 'submitted',
    } as Record<string, string>
  )[event]
  const from = event === 'accepted' ? ['queued'] : ['queued', 'submitted', 'deferred']
  const app = await prisma.application.findUnique({ where: { attemptKey: attempt } })
  if (!app) return
  await prisma.$transaction(async (tx) => {
    const changed = await tx.application.updateMany({
      where: { id: app.id, attemptKey: attempt, delivery: { in: from } },
      data: {
        delivery,
        submittedAt: app.submittedAt || app.attemptedAt || new Date(),
        providerId: providerId || undefined,
        failedAt: delivery === 'bounced' ? new Date() : undefined,
        status: app.submittedAt ? undefined : 'applied',
      },
    })
    if (changed.count)
      await tx.email.createMany({
        skipDuplicates: true,
        data: [
          {
            userId: app.userId,
            applicationId: app.id,
            direction: 'outbound',
            isRead: true,
            messageId: 'application-send:' + attempt,
            from: 'applications@' + mailgunDomain(),
            to: app.applyEmail,
            subject: 'Application for ' + app.title,
            body: app.coverLetter,
          },
        ],
      })
  })
}

// An HTTP timeout can happen after Mailgun accepted the request. Absence of an event is inconclusive.
export async function reconcile(attempt: string) {
  const client = getMailgunClient()
  if (!client) return
  const events = await client.events.get(mailgunDomain(), {
    'message-id': attempt + '@' + mailgunDomain(),
  })
  for (const item of events.items) {
    const event =
      item.event === 'failed'
        ? item.severity === 'permanent'
          ? 'permanent_fail'
          : 'temporary_fail'
        : item.event
    await recordOutcome(attempt, event)
  }
}

export async function dispatch(userId: string, id: string, automatic: boolean, reviewed?: string) {
  const claim = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      include: { profile: true },
    })
    const app = await tx.application.findFirst({ where: { userId, id }, include: { job: true } })
    if (!app) return { message: 'Application unavailable.' } as const
    if (app.delivery === 'queued' && app.attemptKey) {
      if (app.attemptedAt && app.attemptedAt > reconciliationCutoff()) return { message: 'Send in progress.' } as const
      return { pending: app.attemptKey } as const
    }
    if (!['draft', 'failed'].includes(app.delivery))
      return { message: 'Already processed.' } as const
    if (
      !app.job ||
      !app.applyEmail ||
      !app.resumeId ||
      !app.coverLetter ||
      !canSend(app.applyEmail)
    )
      return {
        message: 'Review the CV, draft, application address and mail configuration.',
      } as const
    if (reviewed && reviewed !== reviewVersion(app))
      return { message: 'The draft changed. Review its latest letter and CV.' } as const
    if (listingVersion(app.job) !== app.listingVersion)
      return { message: 'The listing changed. Prepare the letter again.' } as const
    if (app.job.expiresAt && app.job.expiresAt <= new Date())
      return { message: 'Listing has expired.' } as const
    if (app.job.source === 'sandbox' && !sandboxListing(user.clerkId))
      return { message: 'Sandbox fixture is disabled.' } as const
    const fit = assess(app.job, user.profile)
    if (fit?.applyEmail !== app.applyEmail)
      return { message: 'Application address or preferences changed. Review the listing.' } as const
    if (automatic) {
      if (
        !user.autoHunt ||
        user.huntResumeId !== app.resumeId ||
        fit.needsReview ||
        app.reviewReason ||
        app.source !== 'auto-hunt'
      )
        return { message: 'Paused or needs review.' } as const
      const reserved = await tx.application.count({
        where: { userId, attemptedAt: { gte: startOfDay() }, delivery: { not: 'failed' } },
      })
      if (reserved >= user.dailyQuota) return { message: 'Daily cap reached.' } as const
    }
    const cv = await tx.resume.findFirst({
      where: { id: app.resumeId, userId },
      select: { filename: true, bytes: true },
    })
    if (!cv) return { message: 'Selected CV unavailable.' } as const
    const attemptKey = randomUUID()
    await tx.application.update({
      where: { id },
      data: { delivery: 'queued', attemptKey, attemptedAt: new Date(), failedAt: null },
    })
    return { app: { ...app, applyEmail: app.applyEmail, attemptKey }, cv } as const
  })
  if ('pending' in claim && claim.pending) {
    await reconcile(claim.pending)
    return 'Checked provider status.'
  }
  if (!claim.app) return claim.message
  let result
  try {
    result = await sendApplicationEmail(claim.app, claim.cv)
  } catch (error) {
    const status = (error as { status?: number }).status
    if (status && [400, 401, 402, 403, 404, 413, 422, 429].includes(status)) {
      await prisma.application.updateMany({
        where: { id, delivery: 'queued', attemptKey: claim.app.attemptKey },
        data: { delivery: 'failed', failedAt: new Date() },
      })
      return 'Provider rejected the send.'
    }
    return 'Awaiting provider confirmation.'
  }
  await recordOutcome(claim.app.attemptKey, 'accepted', result.id)
  return 'Submitted to provider.'
}
