import { startOfDay } from '@/lib/dispatch'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      profile: true,
      applications: {
        orderBy: { appliedAt: 'desc' },
        take: 5,
      },
    },
  })

  const applications = user?.applications ?? []
  const owner = { user: { clerkId } }
  const [sent, failed, attention, replies] = await Promise.all([
    prisma.application.count({ where: { ...owner, submittedAt: { gte: startOfDay() } } }),
    prisma.application.count({ where: { ...owner, failedAt: { gte: startOfDay() } } }),
    prisma.application.count({ where: { ...owner, delivery: 'draft', reviewReason: { not: null } } }),
    prisma.email.count({ where: { ...owner, direction: 'inbound', isRead: false } }),
  ])
  const hasResume = Boolean(
    user?.profile?.resumeText && user.profile.resumeText.length >= 20,
  )

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 sm:text-3xl">Dashboard</h1>
      <p className="text-slate-600 mb-8"><Link href="/dashboard/inbox">{replies} unread inbox messages</Link></p>

      {!hasResume && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          Upload your resume on{' '}
          <Link href="/dashboard/profile" className="font-medium underline">
            Profile
          </Link>{' '}
          to unlock better match scores and cover letters.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="text-2xl font-bold text-green-600">{sent}</div>
          <div className="text-sm text-slate-500">Submitted today (UTC)</div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="text-2xl font-bold text-amber-600">{failed}</div>
          <div className="text-sm text-slate-500">Failed today (UTC)</div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{attention}</div>
          <div className="text-sm text-slate-500"><Link href="/dashboard/applications?review=1">Need your review</Link></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/dashboard/matches"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-blue-700"
        >
          Browse matches
        </Link>
        <Link
          href="/dashboard/applications"
          className="border border-slate-300 bg-white px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50"
        >
          View all applications
        </Link>
      </div>

      <div className="bg-white p-6 rounded-xl border">
        <h2 className="font-semibold mb-4">Recent applications</h2>
        {applications.length === 0 ? (
          <p className="text-slate-500">
            No activity yet. Start on{' '}
            <Link href="/dashboard/matches" className="text-blue-600 underline">
              Job Matches
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y">
            {applications.map((app) => (
              <li key={app.id} className="py-3 flex justify-between gap-4 items-start">
                <div>
                  <p className="font-medium">{app.title}</p>
                  <p className="text-sm text-slate-500">
                    {app.company} · {new Date(app.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs capitalize px-2 py-1 rounded-full bg-slate-100 text-slate-600 shrink-0">
                  {app.delivery}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}