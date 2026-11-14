import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { generateCoverLetter } from '@/lib/openai'

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, company, location, description, matchScore, url } = body

    if (!title || !company) {
      return NextResponse.json({ error: 'Missing job info' }, { status: 400 })
    }

    // Get or create user
    let user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      // In real app you sync from Clerk webhook. For now create minimal user.
      user = await prisma.user.create({
        data: {
          clerkId,
          email: `${clerkId}@placeholder.com`,
          name: 'User',
        },
      })
    }

    // Get profile (or use fallback resume text)
    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    const resumeText = profile?.resumeText || 'Experienced professional seeking new opportunities. Strong background in technology and problem solving.'

    // Generate cover letter
    const coverLetter = await generateCoverLetter({
      resumeText,
      jobTitle: title,
      company,
      jobDescription: description || `${title} at ${company}`,
    })

    // Save application
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        title,
        company,
        coverLetter,
        matchScore: matchScore || null,
        status: 'draft',
        source: 'ai',
      },
    })

    return NextResponse.json({ success: true, applicationId: application.id, coverLetter })
  } catch (error) {
    console.error('Apply error:', error)
    return NextResponse.json({ error: 'Failed to apply' }, { status: 500 })
  }
}
