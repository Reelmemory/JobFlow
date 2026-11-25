import { createHmac, timingSafeEqual } from 'node:crypto'
import { prisma } from './prisma'
import { detectOtp, mailgunDomain } from './mailgun'
import { recordOutcome } from './dispatch'

function signed(timestamp: string, token: string, signature: string) {
  const key = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
  if (!key || !/^\d+$/.test(timestamp) || !token || !/^[a-f0-9]{64}$/i.test(signature)) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 900) return false
  const digest = createHmac('sha256', key)
    .update(timestamp + token)
    .digest()
  return timingSafeEqual(digest, Buffer.from(signature, 'hex'))
}

export async function mailWebhook(req: Request) {
  if (req.headers.get('content-type')?.includes('application/json')) {
    const data = await req.json()
    const sig = data.signature || {}
    if (!signed(String(sig.timestamp), sig.token, sig.signature))
      return new Response(null, { status: 403 })
    const event = data['event-data']
    const attempt = event?.['user-variables']?.attempt
    if (typeof attempt === 'string') {
      const state =
        event.event === 'failed'
          ? event.severity === 'permanent'
            ? 'permanent_fail'
            : 'temporary_fail'
          : event.event
      await recordOutcome(attempt, state)
    }
    return new Response(null, { status: 200 })
  }
  const form = await req.formData()
  const field = (name: string) => String(form.get(name) || '')
  if (!signed(field('timestamp'), field('token'), field('signature')))
    return new Response(null, { status: 403 })
  const to = field('recipient').trim().toLowerCase()
  const [local, domain] = to.split('@')
  if (!domain || domain !== mailgunDomain().toLowerCase())
    return new Response(null, { status: 406 })
  const app = local.startsWith('reply-')
    ? await prisma.application.findFirst({
        where: { id: local.slice(6), attemptedAt: { not: null } },
        select: { id: true, userId: true },
      })
    : null
  const owner =
    app?.userId ||
    (await prisma.user.findUnique({ where: { inboxAddress: to }, select: { id: true } }))?.id
  if (!owner) return new Response(null, { status: 406 })
  const body = field('body-plain'),
    subject = field('subject') || '(no subject)'
  const messageId =
    owner + '|' + to + '|' + (field('Message-Id') || field('message-id') || field('token'))
  await prisma.email.createMany({
    skipDuplicates: true,
    data: [
      {
        userId: owner,
        applicationId: app?.id,
        to,
        from: field('sender'),
        subject,
        body,
        messageId,
        isOtp: detectOtp(subject, body),
      },
    ],
  })
  return new Response(null, { status: 200 })
}
