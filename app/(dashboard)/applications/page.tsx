import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export default async function ApplicationsPage() {
  const { userId: clerkId } = auth()

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
      <h1 className="text-3xl font-bold mb-2">Applications</h1>
      <p className="text-slate-600 mb-6">Every job applied to on your behalf. Open one to see the cover letter we generated.</p>

      {applications.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border text-center text-slate-500">
          No applications yet. Go to Job Matches and click “Apply with AI”.
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="bg-white p-5 rounded-xl border">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{app.title}</h3>
                  <p className="text-sm text-slate-500">{app.company}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {app.matchScore ? `${app.matchScore}% match · ` : ''}
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusSelect id={app.id} current={app.status} />
              </div>
              {app.coverLetter && (
                <details className="mt-3">
                  <summary className="text-sm text-blue-600 cursor-pointer">View cover letter</summary>
                  <pre className="mt-2 text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded">
                    {app.coverLetter}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
