import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mailgun inbound webhook
// Configure in Mailgun: Routes → store and notify → POST to /api/webhooks/mailgun
export async function POST(req: Request) {
  try {
    const form = await req.formData()

    const from = (form.get('sender') as string) || (form.get('from') as string)
    const to = (form.get('recipient') as string) || (form.get('to') as string)
    const subject = (form.get('subject') as string) || '(no subject)'
    const body = (form.get('body-plain') as string) || ''
    const htmlBody = (form.get('body-html') as string) || null
    const messageId = (form.get('Message-Id') as string) || null

    if (!from || !to) {
      return NextResponse.json({ error: 'Missing from/to' }, { status: 400 })
    }

    // Extract local part and find user by inboxAddress
    const localPart = to.split('@')[0].toLowerCase()
    const user = await prisma.user.findFirst({
      where: {
        inboxAddress: {
          equals: to.toLowerCase(),
          mode: 'insensitive',
        },
      },
    })

    if (!user) {
      // Fallback: try matching just the local part if domain varies
      const fallback = await prisma.user.findFirst({
        where: {
          inboxAddress: {
            startsWith: localPart + '@',
            mode: 'insensitive',
          },
        },
      })
      if (!fallback) {
        return NextResponse.json({ ok: true, note: 'No matching user' })
      }
      await prisma.email.create({
        data: {
          userId: fallback.id,
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
    }

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
  } catch (e) {
    console.error('Mailgun webhook error', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
