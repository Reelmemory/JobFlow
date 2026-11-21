import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getMailgunClient } from '@/lib/mailgun'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, subject, body, replyToEmailId } = await req.json()

  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user?.inboxAddress) {
    return NextResponse.json({ error: 'No inbox address set' }, { status: 400 })
  }

  const domain = process.env.MAILGUN_DOMAIN
  const client = getMailgunClient()
  if (!client || !domain) {
    return NextResponse.json({ error: 'Mailgun not configured' }, { status: 500 })
  }

  try {

    await client.messages.create(domain, {
      from: user.inboxAddress,
      to: [to],
      subject,
      text: body,
      'h:Reply-To': user.inboxAddress,
    })

    // Save outbound email
    await prisma.email.create({
      data: {
        userId: user.id,
        from: user.inboxAddress,
        to,
        subject,
        body,
        direction: 'outbound',
        isRead: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Send error', e)
    return NextResponse.json({ error: e.message || 'Failed to send' }, { status: 500 })
  }
}
