import { listingVersion } from './listing-version'
import { sandboxListing } from './sandbox-listing'
import { prisma } from './prisma'
import { assess } from './discovery'
import { generateCoverLetter } from './ai'

export async function prepareDraft(
  userId: string,
  jobId: string,
  automatic = false,
  regenerate = false,
) {
  const [user, job] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } }),
    prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
  ])
  if (!job.fingerprint || (job.expiresAt && job.expiresAt <= new Date()))
    throw new Error('Listing expired or unavailable.')
  if (job.source === 'sandbox' && !sandboxListing(user.clerkId))
    throw new Error('Fixture unavailable.')
  const previous = await prisma.application.findFirst({
    where: {
      userId,
      OR: [
        { fingerprint: job.fingerprint },
        {
          title: { equals: job.title, mode: 'insensitive' },
          company: { equals: job.company, mode: 'insensitive' },
        },
      ],
    },
  })
  const version = listingVersion(job)
  const fit = assess(job, user.profile)
  const resumeId = automatic ? user.huntResumeId : user.profile?.currentResumeId
  if (previous) {
    if (
      previous.delivery !== 'draft' ||
      !previous.fingerprint ||
      (automatic && previous.source === 'manual')
    )
      return previous
    if (
      !regenerate &&
      previous.coverLetter &&
      previous.listingVersion === version &&
      (!automatic || previous.resumeId === resumeId)
    )
      return previous
  }
  const cv =
    resumeId &&
    (await prisma.resume.findFirst({ where: { id: resumeId, userId }, select: { text: true } }))
  const reasons = fit?.needsReview ? [fit.reason] : []
  if (!fit) reasons.push('Listing is outside the saved preferences.')
  let coverLetter = ''
  if (!cv) reasons.push('Upload and select a CV.')
  else if (!job.description.trim()) reasons.push('The listing has no description.')
  else {
    try {
      const result = await generateCoverLetter({
        resumeText: cv.text,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.description,
      })
      coverLetter = result.letter
      reasons.push(...result.missing)
    } catch {
      reasons.push('The AI provider could not prepare a verified draft. Retry preparation.')
    }
  }
  const data = {
    jobId,
    title: job.title,
    company: job.company,
    jobUrl: job.url,
    listingVersion: version,
    resumeId: resumeId || null,
    coverLetter,
    applyEmail: fit?.applyEmail,
    reviewReason: reasons.join(' ') || null,
    source: automatic ? 'auto-hunt' : 'manual',
  }
  const key = { userId, fingerprint: job.fingerprint }
  await prisma.application.createMany({ data: [{ ...key, ...data }], skipDuplicates: true })
  if (previous) {
    await prisma.application.updateMany({
      where: {
        ...key,
        delivery: 'draft',
        listingVersion: previous.listingVersion,
        coverLetter: previous.coverLetter,
      },
      data,
    })
  }
  return prisma.application.findUniqueOrThrow({ where: { userId_fingerprint: key } })
}
