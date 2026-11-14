import type { Metadata } from 'next'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'JobFlow — AI Job Applications',
  description: 'Find matches, tailor applications, track everything, and manage recruiter replies in one place.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-slate-50 text-slate-900 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
