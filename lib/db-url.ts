/**
 * Normalizes Neon DATABASE_URL for Prisma on Windows (drops channel_binding=require).
 */
export function normalizeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url
  let out = url
  out = out.replace(/[&?]channel_binding=require/gi, '')
  out = out.replace(/\?&/, '?')
  out = out.replace(/\?$/, '')
  if (!out.includes('connect_timeout=')) {
    out += out.includes('?') ? '&connect_timeout=15' : '?connect_timeout=15'
  }
  if (!out.includes('sslmode=')) {
    out += out.includes('?') ? '&sslmode=require' : '?sslmode=require'
  }
  return out
}