import { auth } from '@clerk/nextjs/server'
import { DashboardShell } from '@/components/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await auth.protect()

  return <DashboardShell>{children}</DashboardShell>
}