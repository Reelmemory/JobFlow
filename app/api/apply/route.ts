import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { generateCoverLetter } from '@/lib/ai'
import { prismaErrorMessage } from '@/lib/prisma-errors'
import { extractApplyEmail, looksLikeEmail } from '@/lib/extract-apply-email'
import { ensureInboxAddress } from '@/lib/inbox'
import { mailgunConfigured, sendApplicationEmail } from '@/lib/mailgun'
import { stripHtmlToPlainText } from '@/lib/strip-html'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      id: externalJobId,
      title,
      company,
      location,
      description: descriptionRaw,
      matchScore,
      url,
      source,
      applyTo: applyToRaw,
    } = body

    const description = stripHtmlToPlainText(String(descriptionRaw || ''))

    if (!title || !company) {
      return NextResponse.json({ error: 'Missing job info' }, { status: 400 })
    }

    const clerkUser = await currentUser()
    const personalEmail =
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress ||
      `${clerkId}@users.clerk.jobflow`

    const user = await prisma.user.upsert({
      where: { clerkId },
      update: {
        email: personalEmail,
        name: clerkUser?.fullName || clerkUser?.firstName || undefined,
      },
      create: {
        clerkId,
        email: personalEmail,
        name: clerkUser?.fullName || clerkUser?.firstName || 'User',
      },
    })

    const duplicate = await prisma.application.findFirst({
      where: {
        userId: user.id,
        title: { equals: title, mode: 'insensitive' },
        company: { equals: company, mode: 'insensitive' },
      },
    })

    if (duplicate) {
      return NextResponse.json({
        success: true,
        alreadyApplied: true,
        applicationId: duplicate.id,
        sent: duplicate.source === 'email',
      })
    }

    let applyTo =
      typeof applyToRaw === 'string' && looksLikeEmail(applyToRaw)
        ? applyToRaw.trim().toLowerCase()
        : extractApplyEmail(`${description || ''} ${url || ''}`)

    if (!applyTo) {
      return NextResponse.json({
        success: false,
        needsApplyEmail: true,
        error:
          'No employer email found on this posting. Paste the apply-to address and we will send from your JobFlow inbox.',
      })
    }

    let jobId: string | undefined
    if (externalJobId) {
      const existingJob = await prisma.job.findFirst({
        where: { externalId: externalJobId },
      })
      const job =
        existingJob ??
        (await prisma.job.create({
          data: {
            externalId: externalJobId,
            title,
            company,
            location: location || 'Unknown',
            description: description || '',
            url: url || '#',
            source: source || 'unknown',
          },
        }))
      jobId = job.id
    }

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    const resumeText =
      profile?.resumeText ||
      'Experienced professional seeking new opportunities. Strong background in technology and problem solving.'

    const coverLetter = await generateCoverLetter({
      resumeText,
      jobTitle: title,
      company,
      jobDescription: description || `${title} at ${company}`,
    })

    const inboxAddress = await ensureInboxAddress(user.id, clerkId)

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId,
        title,
        company,
        coverLetter,
        matchScore: matchScore || null,
        status: 'applied',
        source: mailgunConfigured() ? 'email' : 'ai',
        notes: url || null,
        applyEmail: applyTo,
      },
    })

    // Stamp the real application id into the subject tag for inbound matching
    const sendSubject = `Application: ${title} at ${company} [jf-${application.id.slice(0, 8)}]`

    let sent = false
    let sendWarning: string | undefined

    if (mailgunConfigured()) {
      try {
        await sendApplicationEmail({
          fromAddress: inboxAddress,
          fromName: user.name,
          to: applyTo,
          bcc: personalEmail,
          subject: sendSubject,
          text: `${coverLetter}\n\n---\nReplies to this email are forwarded to your JobFlow inbox (${inboxAddress}).`,
          applicationId: application.id,
          resumeUrl: profile?.resumeUrl,
          resumeFileName: profile?.resumeFileName,
        })
        sent = true

        await prisma.email.create({
          data: {
            userId: user.id,
            applicationId: application.id,
            from: inboxAddress,
            to: applyTo,
            subject: sendSubject,
            body: coverLetter,
            direction: 'outbound',
            isRead: true,
          },
        })
      } catch (sendErr) {
        console.error('Apply send error', sendErr)
        sendWarning =
          sendErr instanceof Error
            ? sendErr.message
            : 'Cover letter was saved but the email could not be sent.'
        await prisma.application.update({
          where: { id: application.id },
          data: { source: 'ai' },
        })
      }
    } else {
      sendWarning =
        'Mailgun is not configured. Cover letter saved — set MAILGUN_API_KEY and MAILGUN_DOMAIN to send from your JobFlow inbox.'
    }

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      coverLetter,
      sent,
      applyTo,
      inboxAddress,
      bcc: personalEmail,
      warning: sendWarning,
    })
  } catch (error) {
    console.error('Apply error:', error)
    const { message, code } = prismaErrorMessage(error)
    return NextResponse.json(
      { error: message || 'Failed to apply', code },
      { status: 500 },
    )
  }
}