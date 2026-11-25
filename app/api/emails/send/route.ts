import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { canSend, getMailgunClient, mailgunDomain } from '@/lib/mailgun'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { replyToEmailId, body } = await req.json()
  if (typeof replyToEmailId !== 'string' || typeof body !== 'string' || !body.trim())
    return Response.json({ error: 'Choose a message and enter a reply.' }, { status: 400 })
  const original = await prisma.email.findFirst({
    where: { id: replyToEmailId, direction: 'inbound', user: { clerkId: userId } },
  })
  if (!original?.to) return Response.json({ error: 'Message unavailable.' }, { status: 404 })
  const to = original.from
  const client = getMailgunClient()
  if (!client || !canSend(to))
    return Response.json({ error: 'Mail is unavailable for this recipient.' }, { status: 400 })
  const subject = 'Re: ' + original.subject
  try {
    const result = await client.messages.create(mailgunDomain(), {
      from: original.to,
      to: [to],
      subject,
      text: body,
      'h:Reply-To': original.to,
    })
    await prisma.email.create({
      data: {
        userId: original.userId,
        applicationId: original.applicationId,
        from: original.to,
        to,
        subject,
        body,
        direction: 'outbound',
        isRead: true,
        messageId: result.id,
      },
    })
    return Response.json({ success: true })
  } catch {
    return Response.json(
      { error: 'Could not confirm the reply. Check the provider before retrying.' },
      { status: 502 },
    )
  }
}
