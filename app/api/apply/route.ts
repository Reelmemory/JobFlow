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
    const { title, company, location, description, matchScore } = body

    if (typeof title !== 'string' || !title.trim() ||
        typeof company !== 'string' || !company.trim()) {
      return NextResponse.json({ error: 'Valid job title and company are required' }, { status: 400 })
    }

    let user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId,
          email: `${clerkId}@placeholder.com`,
          name: 'User',
        },
      })
    }

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    const resumeText = profile?.resumeText?.trim()
    if (!resumeText) {
      return NextResponse.json(
        { error: 'Add your resume to your profile before generating a cover letter.' },
        { status: 400 }
      )
    }

    const coverLetter = await generateCoverLetter({
      resumeText,
      jobTitle: title.trim(),
      company: company.trim(),
      jobDescription: typeof description === 'string' ? description : `${title} at ${company}`,
    })

    if (!coverLetter.trim()) {
      return NextResponse.json({ error: 'The cover letter could not be generated. Please try again.' }, { status: 502 })
    }

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        title: title.trim(),
        company: company.trim(),
        coverLetter,
        matchScore: Number.isInteger(matchScore) ? matchScore : null,
        status: 'draft',
        source: 'ai',
      },
    })

    return NextResponse.json({ success: true, applicationId: application.id, coverLetter })
  } catch (error) {
    console.error('Cover letter generation error:', error)
    return NextResponse.json({ error: 'Failed to generate cover letter' }, { status: 500 })
  }
}
