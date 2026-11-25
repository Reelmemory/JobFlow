import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/clerk-user'

async function configure(form: FormData) {
  'use server'
  const { userId: clerkId } = await auth.protect()
  const user = await getOrCreateUser(clerkId)
  if (form.get('mode') === 'pause')
    await prisma.user.update({ where: { id: user.id }, data: { autoHunt: false } })
  else {
    const cap = Number(form.get('cap')),
      resumeId = String(form.get('cv'))
    if (!Number.isInteger(cap) || cap < 1 || cap > 100)
      throw new Error('Choose a daily cap from 1 to 100.')
    await prisma.resume.findFirstOrThrow({
      where: { id: resumeId, userId: user.id },
      select: { id: true },
    })
    await prisma.user.update({
      where: { id: user.id },
      data: { autoHunt: true, dailyQuota: cap, huntResumeId: resumeId },
    })
  }
  revalidatePath('/dashboard/profile')
}

export async function HuntSettings({ clerkId }: { clerkId: string }) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      resumes: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, filename: true, createdAt: true },
      },
    },
  })
  return (
    <section className="mt-6 max-w-2xl rounded-xl bg-white border p-5 space-y-3">
      <h2 className="font-semibold">Auto-Hunt · {user?.autoHunt ? 'Enabled' : 'Paused'}</h2>
      <p className="text-sm">
        Auto-Hunt uses your saved preferences and emails eligible employers with the CV you choose.
        Portal listings and uncertain matches go to Applications for review.
      </p>
      <form action={configure} className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          CV version
          <select
            required
            name="cv"
            defaultValue={user?.huntResumeId || user?.resumes[0]?.id}
            className="block rounded border p-2"
          >
            {user?.resumes.map((cv) => (
              <option key={cv.id} value={cv.id}>
                {cv.filename} · {cv.createdAt.toISOString().slice(0, 16)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Daily cap (UTC)
          <input
            className="block w-20 rounded border p-2"
            name="cap"
            type="number"
            min="1"
            max="100"
            required
            defaultValue={user?.dailyQuota ?? 3}
          />
        </label>
        <button
          disabled={!user?.resumes.length}
          className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
        >
          {user?.autoHunt ? 'Save Auto-Hunt' : 'Enable Auto-Hunt'}
        </button>
      </form>
      {user?.autoHunt && (
        <form action={configure}>
          <button name="mode" value="pause" className="underline">
            Pause Auto-Hunt
          </button>
        </form>
      )}
    </section>
  )
}
