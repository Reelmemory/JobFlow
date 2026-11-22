import Link from 'next/link'
import { BrandMark } from '@/components/brand-mark'

export function AuthFrame({
  mode,
  children,
}: {
  mode: 'signin' | 'signup'
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="h-0.5 w-full bg-blue-700" aria-hidden />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <BrandMark href="/" size="sm" onDark={false} />
          <Link href="/" className="text-sm text-slate-500 hover:text-blue-800">
            Back
          </Link>
        </div>
        <div className={`auth-${mode} rounded-2xl border border-slate-200 bg-white p-5 sm:p-7`}>
          <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">
            {mode === 'signin' ? 'Sign in to JobFlow' : 'Join JobFlow'}
          </h1>
          {children}
        </div>
      </div>
    </div>
  )
}
