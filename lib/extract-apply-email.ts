const SKIP_HOSTS = [
  'remotive.com',
  'greenhouse.io',
  'lever.co',
  'sentry.io',
  'w3.org',
  'example.com',
  'jobflow',
]

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

export function extractApplyEmail(text: string | null | undefined): string | null {
  if (!text) return null
  const matches = text.match(EMAIL_RE) || []
  for (const raw of matches) {
    const email = raw.toLowerCase()
    if (SKIP_HOSTS.some((h) => email.includes(h))) continue
    if (email.endsWith('.png') || email.endsWith('.jpg') || email.endsWith('.gif')) continue
    return email
  }
  return null
}

export function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}