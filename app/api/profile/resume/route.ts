import { auth } from '@clerk/nextjs/server'
import { processResumeUpload } from '@/lib/profile-ops'
import { downloadResume } from '@/lib/resume-storage'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const file = (await req.formData()).get('file')
  if (!(file instanceof File)) return Response.json({ error: 'Choose a CV.' }, { status: 400 })
  const result = await processResumeUpload(userId, file)
  return Response.json(result, { status: 'error' in result ? 400 : 200 })
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return new Response(null, { status: 401 })
  const cv = await downloadResume(userId, new URL(req.url).searchParams.get('version'))
  if (!cv) return new Response('Upload a CV to enable private downloads.', { status: 404 })
  return new Response(new Uint8Array(cv.bytes), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(cv.filename),
    },
  })
}
