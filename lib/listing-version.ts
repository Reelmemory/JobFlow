import { createHash } from 'node:crypto'
import type { Job } from '@prisma/client'

export function listingVersion(job: Job) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        job.title,
        job.company,
        job.location,
        job.remote,
        job.description,
        job.url,
        job.expiresAt,
      ]),
    )
    .digest('hex')
}

export function reviewVersion(app: {
  resumeId: string | null
  coverLetter: string
  applyEmail: string | null
  listingVersion: string | null
}) {
  return createHash('sha256')
    .update(JSON.stringify([app.resumeId, app.coverLetter, app.applyEmail, app.listingVersion]))
    .digest('hex')
}
