import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { detectOtp } from '@/lib/mailgun'
import { linkInboundToApplication } from '@/lib/inbox'

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

    const localPart = to.split('@')[0].toLowerCase()
    let user = await prisma.user.findFirst({
      where: {
        inboxAddress: {
          equals: to.toLowerCase(),
          mode: 'insensitive',
        },
      },
    })

    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          inboxAddress: {
            startsWith: localPart + '@',
            mode: 'insensitive',
          },
        },
      })
    }

    if (!user) {
      return NextResponse.json({ ok: true, note: 'No matching user' })
    }

    const applicationId = await linkInboundToApplication({
      userId: user.id,
      from,
      subject,
    })

    const isOtp = detectOtp(subject, body)

    await prisma.email.create({
      data: {
        userId: user.id,
        applicationId,
        from,
        to,
        subject,
        body,
        htmlBody,
        messageId,
        direction: 'inbound',
        isOtp,
      },
    })

    if (applicationId && isOtp) {
      await prisma.application.updateMany({
        where: { id: applicationId, status: 'applied' },
        data: { status: 'viewed' },
      })
    }

    return NextResponse.json({ ok: true, applicationId, isOtp })
  } catch (e) {
    console.error('Mailgun webhook error', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}