import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { StatusSelect } from '@/components/status-select'

export default async function ApplicationsPage() {
  const { userId: clerkId } = await auth()

  let applications: any[] = []

  if (clerkId) {
    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (user) {
      applications = await prisma.application.findMany({
        where: { userId: user.id },
        orderBy: { appliedAt: 'desc' },
      })
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 sm:text-3xl">Applications</h1>
      <p className="text-slate-600 mb-6 text-sm sm:text-base">
        Every job applied to on your behalf. Open one to see the cover letter we generated.
      </p>

      {applications.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border text-center text-slate-500">
          No applications yet. Go to Job Matches and click “Apply with AI”.
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="bg-white p-4 sm:p-5 rounded-xl border">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                <div className="min-w-0">
                  <h3 className="font-semibold break-words">{app.title}</h3>
                  <p className="text-sm text-slate-500">{app.company}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {app.matchScore ? `${app.matchScore}% match · ` : ''}
                    {new Date(app.appliedAt).toLocaleDateString()}
                    {app.source === 'email' && app.applyEmail
                      ? ` · emailed ${app.applyEmail}`
                      : app.source === 'email'
                        ? ' · sent by email'
                        : ' · letter saved only'}
                  </p>
                </div>
                <div className="shrink-0 w-full sm:w-auto">
                  <StatusSelect id={app.id} current={app.status} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 items-center">
                {app.notes?.startsWith('http') && (
                  <a
                    href={app.notes}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 underline"
                  >
                    View job posting
                  </a>
                )}
                {app.coverLetter && (
                  <details>
                    <summary className="text-sm text-blue-600 cursor-pointer">View cover letter</summary>
                    <pre className="mt-2 text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded">
                      {app.coverLetter}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
