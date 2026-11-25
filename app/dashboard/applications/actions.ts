'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { dispatch } from '@/lib/dispatch'
import { prepareDraft } from '@/lib/drafts'

export async function applicationAction(form: FormData) {
  const { userId: clerkId } = await auth.protect()
  const user = await prisma.user.findUniqueOrThrow({ where: { clerkId } })
  const app = await prisma.application.findFirstOrThrow({
    where: { id: String(form.get('id')), userId: user.id },
  })
  let message = 'Draft updated.'
  if (form.get('action') === 'prepare' && app.jobId)
    await prepareDraft(user.id, app.jobId, false, true)
  else
    message =
      (await dispatch(user.id, app.id, false, String(form.get('reviewed') || 'unreviewed'))) ||
      'Review application.'
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/applications')
  redirect('/dashboard/applications?message=' + encodeURIComponent(message) + '#app-' + app.id)
}
