import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { sandboxListing } from '@/lib/sandbox-listing'

export default async function SandboxListingPage() {
  const { userId } = await auth.protect()
  const job = sandboxListing(userId)
  if (!job) notFound()
  return (
    <article className="rounded-xl bg-white border p-5">
      <h1 className="text-2xl font-bold">{job.title}</h1>
      <p>
        {job.company} · {job.location}
      </p>
      <p className="mt-3">{job.description}</p>
    </article>
  )
}
