import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { BrandMark } from '@/components/brand-mark'

const steps = [
  {
    n: '01',
    title: 'Match jobs to your profile',
    body: 'Listings are scored against your resume, roles, and locations.',
  },
  {
    n: '02',
    title: 'Apply with a tailored letter',
    body: 'Send a cover letter written for that role, then keep the trail.',
  },
  {
    n: '03',
    title: 'Track replies in Inbox',
    body: 'Recruiter mail comes back to one place, next to the application.',
  },
]

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <div className="h-0.5 w-full bg-blue-700" aria-hidden />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <BrandMark onDark={false} />
        <Link
          href="/sign-in"
          className="text-sm text-slate-500 transition-colors hover:text-blue-800"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-10 sm:pt-16">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Job applications,{' '}
          <span className="text-blue-700">in one place.</span>
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-500 sm:text-lg">
          Match roles to your profile, send applications, and keep recruiter replies together.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-full bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>

        <section className="mt-24 border-t border-slate-100 pt-12 sm:mt-28" aria-labelledby="how-it-works">
          <h2
            id="how-it-works"
            className="text-sm font-medium tracking-wide text-slate-400"
          >
            How it works
          </h2>
          <ol className="mt-8 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {steps.map((step) => (
              <li key={step.n} className="min-w-0">
                <p className="font-mono text-xs text-blue-700">{step.n}</p>
                <h3 className="mt-3 text-base font-medium tracking-tight text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl border-t border-slate-100 px-6 py-6 text-xs text-slate-400">
        <span className="text-blue-700">JobFlow</span>
      </footer>
    </div>
  )
}
