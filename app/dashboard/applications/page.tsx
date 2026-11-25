import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { applicationAction } from './actions'
import { StatusSelect } from '@/components/status-select'

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; review?: string }>
}) {
  const { userId: clerkId } = await auth.protect()
  const params = await searchParams
  const apps = await prisma.application.findMany({
    where: {
      user: { clerkId },
      ...(params.review ? { delivery: 'draft', reviewReason: { not: null } } : {}),
    },
    orderBy: { appliedAt: 'desc' },
  })
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Applications</h1>
      <div className="flex gap-4 text-blue-700 underline mb-5">
        <Link href="/dashboard/applications">All applications</Link>
        <Link href="?review=1">Needs review</Link>
      </div>
      {params.message && (
        <p role="status" className="rounded border bg-white p-3 mb-4">
          {params.message}
        </p>
      )}
      {!apps.length && <p>No applications here yet.</p>}
      {apps.map((a) => (
        <article
          id={'app-' + a.id}
          key={a.id}
          className="bg-white rounded-xl border p-5 mb-3 space-y-2"
        >
          <h2 className="font-semibold">
            {a.title} · {a.company}
          </h2>
          <p className="text-sm capitalize">
            {a.delivery} · {a.source}
          </p>
          {a.reviewReason && <p className="text-sm text-amber-800">{a.reviewReason}</p>}
          {a.applyEmail && <p className="text-sm">Application address · {a.applyEmail}</p>}
          <div className="flex gap-4 text-sm text-blue-700 underline">
            {(a.jobUrl || a.notes)?.match(/^https?:\/\//i) && (
              <a href={(a.jobUrl || a.notes)!} target="_blank" rel="noreferrer">
                Original listing
              </a>
            )}
            {a.resumeId && (
              <a href={'/api/profile/resume?version=' + a.resumeId}>Download attached CV</a>
            )}
          </div>
          {a.coverLetter && (
            <details>
              <summary>Review cover letter</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm">{a.coverLetter}</p>
            </details>
          )}
          {a.submittedAt && <StatusSelect id={a.id} current={a.status} />}
          <form action={applicationAction}>
            <input type="hidden" name="id" value={a.id} />
            {!a.coverLetter && a.jobId && (
              <button className="text-blue-700 underline" name="action" value="prepare">
                Prepare letter again
              </button>
            )}
            {a.coverLetter &&
              a.resumeId &&
              a.applyEmail &&
              ['draft', 'failed'].includes(a.delivery) && (
                <button
                  name="action"
                  value="send"
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
                >
                  Send reviewed application
                </button>
              )}
            {a.delivery === 'queued' && (
              <button name="action" value="check" className="underline">
                Check provider status
              </button>
            )}
          </form>
        </article>
      ))}
    </div>
  )
}
