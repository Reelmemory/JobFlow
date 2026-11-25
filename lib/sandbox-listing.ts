import type { JobSource } from './jobs'

export function sandboxListing(clerkId?: string): JobSource | null {
  const recipient = process.env.MAILGUN_TEST_RECIPIENT
  if (
    !clerkId ||
    clerkId !== process.env.JOBFLOW_SANDBOX_CLERK_ID ||
    process.env.MAIL_MODE !== 'sandbox' ||
    !recipient
  )
    return null
  return {
    id: 'jobflow-sandbox-support',
    source: 'sandbox',
    company: 'JobFlow Sandbox',
    title: 'Junior IT Support Trainee',
    location: 'Worldwide',
    remote: true,
    description:
      'Synthetic training vacancy. Open worldwide, including Nigeria. No previous experience required. Send your CV to ' +
      recipient +
      '.',
    url:
      (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000') +
      '/dashboard/sandbox-listing',
  }
}
