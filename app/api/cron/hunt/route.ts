import { runHunt } from '@/lib/hunt'
export const maxDuration = 300
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get('authorization') !== 'Bearer ' + process.env.CRON_SECRET
  )
    return new Response(null, { status: 401 })
  const result = await runHunt()
  return Response.json(result, {
    status: result.errors ? 503 : 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
