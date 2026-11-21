import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4 sm:text-5xl">JobFlow</h1>
        <p className="text-lg text-slate-600 mb-8 sm:text-xl">AI that applies. You interview.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/sign-up"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg text-center hover:bg-blue-700"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="border border-slate-300 bg-white px-6 py-3 rounded-lg text-center hover:bg-slate-50"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
