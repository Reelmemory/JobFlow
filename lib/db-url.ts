export function normalizeDatabaseUrl(value: string | undefined) {
  if (!value) return value
  const url = new URL(value)
  url.searchParams.delete('channel_binding')
  if (!url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout','15')
  if (!url.searchParams.has('sslmode')) url.searchParams.set('sslmode','require')
  if (process.env.VERCEL_ENV === 'preview' && process.env.JOBFLOW_PREVIEW_SCHEMA) {
    url.searchParams.set('schema',process.env.JOBFLOW_PREVIEW_SCHEMA)
  }
  return url.toString()
}
