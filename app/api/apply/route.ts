import { auth } from '@clerk/nextjs/server'
import { getOrCreateUser } from '@/lib/clerk-user'
import { prepareDraft } from '@/lib/drafts'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (typeof id !== 'string') return Response.json({ error: 'Choose a listing.' }, { status: 400 })
  const owner = await getOrCreateUser(userId)
  const draft = await prepareDraft(owner.id, id)
  return Response.json({ success: true, applicationId: draft.id, coverLetter: draft.coverLetter, sent: false })
}
