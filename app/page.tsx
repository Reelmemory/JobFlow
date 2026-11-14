import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-blue-600 mb-4">Talonn</h1>
        <p className="text-xl text-slate-600 mb-8">AI that applies. You interview.</p>
        <div className="space-x-4">
          <Link href="/sign-up" className="bg-blue-600 text-white px-6 py-3 rounded-lg">
            Get Started
          </Link>
          <Link href="/sign-in" className="border border-slate-300 px-6 py-3 rounded-lg">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
