import type { JobSource } from './jobs'

export type ProfileForMatch = {
  resumeText?: string | null
  targetRoles?: string[]
  locations?: string[]
  skills?: string[]
  remoteOnly?: boolean
  blacklist?: string[]
}

const KEYWORDS = [
  'react', 'next', 'node', 'typescript', 'javascript', 'python', 'java',
  'aws', 'docker', 'kubernetes', 'sql', 'postgres', 'mongodb', 'prisma',
  'frontend', 'backend', 'fullstack', 'devops', 'data', 'ml', 'ai',
  'engineer', 'developer', 'software', 'senior', 'lead', 'manager',
  'mobile', 'android', 'ios', 'swift', 'kotlin', 'go', 'golang', 'rust',
  'vue', 'angular', 'tailwind', 'graphql', 'api',
]

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
}

function tokenize(items: string[]) {
  return items.flatMap((s) => normalize(s).split(/\s+/).filter((t) => t.length > 2))
}

export function scoreJobForProfile(job: JobSource, profile: ProfileForMatch): number {
  const jobText = normalize(`${job.title} ${job.description} ${job.location}`)
  const resumeBlob = normalize(profile.resumeText || '')
  const roleTokens = tokenize(profile.targetRoles || [])
  const skillTokens = tokenize(profile.skills?.length ? profile.skills : [])

  let score = profile.resumeText && profile.resumeText.length >= 20 ? 35 : 25

  let kwMatches = 0
  for (const kw of KEYWORDS) {
    if (resumeBlob.includes(kw) && jobText.includes(kw)) kwMatches++
  }
  score += Math.min(30, kwMatches * 4)

  if (roleTokens.length) {
    const roleHits = roleTokens.filter((t) => jobText.includes(t)).length
    score += Math.min(20, roleHits * 5)
  }

  if (skillTokens.length) {
    const skillHits = skillTokens.filter((t) => jobText.includes(t)).length
    score += Math.min(15, skillHits * 4)
  }

  const locs = (profile.locations || []).map((l) => l.toLowerCase())
  if (locs.length) {
    const locText = job.location.toLowerCase()
    const wantsRemote = locs.some((l) => l.includes('remote'))
    if (job.remote && wantsRemote) score += 8
    if (locs.some((l) => locText.includes(l) || (l !== 'remote' && jobText.includes(l)))) score += 6
  }

  if (profile.remoteOnly && !job.remote) score -= 25

  return Math.max(5, Math.min(99, Math.round(score)))
}

export function filterJobsForProfile(jobs: JobSource[], profile: ProfileForMatch): JobSource[] {
  const blacklist = (profile.blacklist || []).map((b) => b.toLowerCase().trim()).filter(Boolean)

  return jobs.filter((job) => {
    const company = job.company.toLowerCase()
    if (blacklist.some((b) => company.includes(b))) return false
    if (profile.remoteOnly && !job.remote) return false
    return true
  })
}