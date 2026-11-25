'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { UserButton, useAuth } from '@clerk/nextjs'
import { BrandMark } from '@/components/brand-mark'

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/matches', label: 'Job Matches' },
  { href: '/dashboard/applications', label: 'Applications' },
  { href: '/dashboard/inbox', label: 'Inbox' },
  { href: '/dashboard/profile', label: 'Profile' },
]

function NavLinks({
  onNavigate,
  className = '',
}: {
  onNavigate?: () => void
  className?: string
}) {
  const pathname = usePathname()

  return (
    <nav className={`space-y-1 ${className}`}>
      {nav.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? 'bg-blue-600 text-white'
                : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload() }
    window.addEventListener("pageshow", restored)
    if (isLoaded && !isSignedIn) window.location.replace("/sign-in")
    return () => window.removeEventListener("pageshow", restored)
  }, [isLoaded, isSignedIn])
  const pathname = usePathname()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const menuOpen = openPath === pathname
  const setMenuOpen = (open: boolean) => setOpenPath(open ? pathname : null)

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  if (!isLoaded || !isSignedIn) return null
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <BrandMark href="/dashboard" size="sm" onDark={false} />
        <div className="shrink-0">
          <UserButton />
        </div>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-slate-900 p-4 text-white shadow-xl transition-transform duration-200 ease-out md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 md:shadow-none ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between md:block">
          <BrandMark href="/dashboard" size="md" onDark />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 md:hidden"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <NavLinks onNavigate={() => setMenuOpen(false)} />
        </div>

        <div className="hidden border-t border-slate-700 pt-4 md:block">
          <UserButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}