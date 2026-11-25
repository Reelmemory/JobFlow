import { sandboxListing } from './sandbox-listing'
import type { Profile } from '@prisma/client'
import { prisma } from './prisma'
import { DEFAULT_ROLES } from './preferences'
import { fetchAllJobs, type JobSource } from './jobs'
import { jobFingerprint } from './job-fingerprint'
import { extractApplyEmail } from './extract-apply-email'
import { scoreJobForProfile } from './match'

type Listing = Pick<JobSource, 'title' | 'company' | 'location' | 'description' | 'remote'>
const words = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/helpdesk/g, 'help desk')
    .replace(/internship/g, 'intern')
    .match(/[a-z0-9]+/g) || []
export function assess(job: Listing, profile: Profile | null) {
  const roles = profile?.targetRoles.length ? profile.targetRoles : DEFAULT_ROLES
  const title = words(job.title)
  const role = roles.find((r) =>
    words(r)
      .filter((w) => !['junior', 'entry', 'level', 'computing'].includes(w))
      .every((w) => title.includes(w)),
  )
  if (
    !role ||
    profile?.blacklist.some((b) => job.company.toLowerCase().includes(b.toLowerCase())) ||
    (profile?.remoteOnly && !job.remote)
  )
    return null
  const country = profile?.country || 'Nigeria'
  const location = job.location.toLowerCase().trim()
  const locations = (profile?.locations.length ? profile.locations : [country, 'Remote']).map((l) =>
    l.toLowerCase(),
  )
  const locationFits = job.remote
    ? locations.includes('remote') &&
      (location.includes(country.toLowerCase()) ||
        /^(worldwide|anywhere|global|worldwide remote)$/i.test(location))
    : locations.some((l) => l !== 'remote' && location.includes(l))
  const reasons = []
  if (
    !locationFits ||
    /\b(?:excluding|except|outside|only)\b/i.test(location) ||
    /\b(?:reside|resident|work authori[sz]ation|citizen|based in|only applicants|located in|must live|residency|only candidates|(?:US|UK|EU|USA)[- ]only|excluding|except)\b/i.test(
      job.description,
    )
  )
    reasons.push('Confirm location and work eligibility for ' + country + '.')
  const years = Array.from(
    job.description.matchAll(/\b(\d+)(?:\s*[-–]\s*\d+|\+)?\s*years?\b/gi),
    (m) => Number(m[1]),
  )
  if (
    years.some((y) => y > (profile?.experienceYears || 0)) ||
    /\b(senior|lead|manager|principal)\b/i.test(job.title)
  )
    reasons.push('Experience requirement needs review.')
  if (
    !years.length &&
    !/\b(junior|entry.level|intern(ship)?|trainee|training|no experience)\b/i.test(
      job.title + ' ' + job.description,
    )
  )
    reasons.push('Required experience is unclear.')
  const email = extractApplyEmail(job.description)
  if (!email) reasons.push('Use the original posting to confirm how to apply.')
  return {
    reason: reasons.join(' ') || role + ' matches your role, location and experience preferences.',
    needsReview: reasons.length > 0,
    applyEmail: email,
  }
}

export async function discover(profile: Profile | null, clerkId?: string) {
  const roles = profile?.targetRoles.length ? profile.targetRoles : DEFAULT_ROLES
  const fixture = sandboxListing(clerkId)
  const listings = fixture ? [fixture] : await fetchAllJobs(roles, process.env.TECHMAP_RAPIDAPI_KEY)
  const matches = []
  for (const job of listings) {
    const fit = assess(job, profile)
    if (!fit) continue
    const fingerprint = jobFingerprint(job.title, job.company)
    const data = {
      externalId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      url: job.url,
      source: job.source,
      remote: job.remote,
      expiresAt: job.expiresAt ? new Date(job.expiresAt) : null,
    }
    const saved = await prisma.job.upsert({
      where: { fingerprint },
      create: { fingerprint, ...data },
      update: data,
    })
    matches.push({ ...job, ...fit, id: saved.id, match: scoreJobForProfile(job, profile || {}) })
  }
  return matches.sort((a, b) => b.match - a.match)
}
