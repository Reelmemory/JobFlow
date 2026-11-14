import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/matches', label: 'Job Matches' },
  { href: '/dashboard/applications', label: 'Applications' },
  { href: '/dashboard/inbox', label: 'Inbox' },
  { href: '/dashboard/profile', label: 'Profile' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-4 flex flex-col">
        <div className="text-xl font-bold mb-8 text-blue-400">JobFlow</div>
        <nav className="flex-1 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded hover:bg-slate-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="pt-4 border-t border-slate-700">
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
