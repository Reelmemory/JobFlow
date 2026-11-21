import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function isValidMailgunSignature(timestamp: string, token: string, signature: string) {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
  if (!signingKey || !timestamp || !token || !signature) return false

  const expected = createHmac('sha256', signingKey)
    .update(timestamp + token)
    .digest('hex')

  const expectedBuffer = Buffer.from(expected, 'utf8')
  const receivedBuffer = Buffer.from(signature, 'utf8')
  return expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const timestamp = String(form.get('timestamp') || '')
    const token = String(form.get('token') || '')
    const signature = String(form.get('signature') || '')

    if (!isValidMailgunSignature(timestamp, token, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    const from = String(form.get('sender') || form.get('from') || '')
    const to = String(form.get('recipient') || form.get('to') || '')
    const subject = String(form.get('subject') || '(no subject)')
    const body = String(form.get('body-plain') || '')
    const htmlBody = form.get('body-html') ? String(form.get('body-html')) : null
    const messageId = form.get('Message-Id') ? String(form.get('Message-Id')) : null

    if (!from || !to) {
      return NextResponse.json({ error: 'Missing from/to' }, { status: 400 })
    }

    if (messageId) {
      const existing = await prisma.email.findUnique({ where: { messageId } })
      if (existing) return NextResponse.json({ ok: true, duplicate: true })
    }

    const user = await prisma.user.findFirst({
      where: { inboxAddress: { equals: to, mode: 'insensitive' } },
    })

    if (!user) return NextResponse.json({ ok: true, note: 'No matching user' })

    await prisma.email.create({
      data: {
        userId: user.id,
        from,
        to,
        subject,
        body,
        htmlBody,
        messageId,
        direction: 'inbound',
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Mailgun webhook error', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
