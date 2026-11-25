import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { preferences } from '@/lib/preferences'
import { saveProfilePreferences } from '@/lib/profile-ops'

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const p = await prisma.profile.findFirst({ where: { user: { clerkId } } })
  return Response.json({ profile: p && { ...p, hasResumeFile: Boolean(p.currentResumeId), resumePreview: p.resumeText?.slice(0,600), resumeTextLength: p.resumeText?.length || 0 } })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = preferences.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Check your roles, locations and experience.' }, { status: 400 })
  await saveProfilePreferences(userId, parsed.data)
  return Response.json({ success: true })
}
