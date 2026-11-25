import { fetchNigeriaJobs } from './nigeria-jobs'
import { jobFingerprint } from './job-fingerprint'
import { stripHtmlToPlainText } from '@/lib/strip-html'

function jobDescription(raw: string): string {
  return stripHtmlToPlainText(raw || '')
}

// Public employer boards with Nigerian vacancies.
const ATS_BOARDS = [
  { company: 'Moniepoint', ats: 'greenhouse', slug: 'moniepoint' },
  { company: 'Yassir', ats: 'lever', slug: 'Yassir' },
] as const

export type JobSource = {
  id: string
  title: string
  company: string
  location: string
  description: string
  url: string
  source: string
  remote: boolean
  expiresAt?: string
  postedAt?: string
}

export async function fetchRemotiveJobs(): Promise<JobSource[]> {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=150', {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 21600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).map((j: any) => ({
      id: `remotive-${j.id}`,
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || 'Remote',
      description: jobDescription(j.description),
      url: j.url,
      source: 'remotive',
      remote: true,
      postedAt: j.publication_date,
      expiresAt: j.expiration_date || j.validThrough,
    }))
  } catch (e) {
    console.error('Remotive error', e)
    return []
  }
}

export async function fetchATSJobs(): Promise<JobSource[]> {
  const jobs: JobSource[] = []

  for (const board of ATS_BOARDS) {
    try {
      let url = ''
      if (board.ats === 'greenhouse') {
        url = `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs?content=true`
      } else if (board.ats === 'lever') {
        url = `https://api.lever.co/v0/postings/${board.slug}?mode=json`
      } else {
        continue
      }

      const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' })
      if (!res.ok) continue
      const data = await res.json()

      if (board.ats === 'greenhouse') {
        for (const j of data.jobs || []) {
          const locName = j.location?.name || 'Unknown'
          const locLower = locName.toLowerCase()
          jobs.push({
            id: `gh-${board.slug}-${j.id}`,
            title: j.title,
            company: board.company,
            location: locName,
            description: jobDescription(j.content),
            url: j.absolute_url,
            expiresAt: j.validThrough || j.expires_at,
            source: 'greenhouse',
            remote: locLower.includes('remote') || locLower.includes('anywhere'),
          })
        }
      } else if (board.ats === 'lever') {
        for (const j of data || []) {
          jobs.push({
            id: `lever-${board.slug}-${j.id}`,
            title: j.text,
            company: board.company,
            location: j.categories?.location || 'Unknown',
            description: jobDescription(j.descriptionPlain || j.description),
            url: j.hostedUrl,
            expiresAt: j.validThrough || j.expiresAt,
            source: 'lever',
            remote: j.workplaceType === 'remote',
          })
        }
      }
    } catch (e) {
      console.error(`ATS error ${board.company}`, e)
    }
  }

  return jobs
}

export async function fetchTechmapJobs(apiKey?: string): Promise<JobSource[]> {
  if (!apiKey) return []

  try {
    const res = await fetch(
      'https://daily-international-job-postings.p.rapidapi.com/api/v2/jobs/search?countryCode=ng&limit=10&sort=newest',
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'daily-international-job-postings.p.rapidapi.com',
        },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      },
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.jobs || data.results || []).map((j: any) => ({
      id: `techmap-${j.id || j.jobId}`,
      title: j.title,
      company: j.company || j.companyName || 'Unknown',
      location: j.location || j.city || 'Unknown',
      description: jobDescription(j.description),
      url: j.url || j.applyUrl || '#',
      source: 'techmap',
      remote: (j.workPlace || '').toLowerCase().includes('remote'),
      expiresAt: j.validThrough || j.expiresAt,
      postedAt: j.dateCreated || j.postedAt,
    }))
  } catch (e) {
    console.error('Techmap error', e)
    return []
  }
}

export async function fetchAllJobs(techmapKey?: string): Promise<JobSource[]> {
  const [remotive, ats, techmap, nigeria] = await Promise.all([
    fetchRemotiveJobs(),
    fetchATSJobs(),
    fetchTechmapJobs(techmapKey),
    fetchNigeriaJobs(),
  ])

  const seen = new Set<string>()
  const urls = new Set<string>()
  const all = [...ats, ...nigeria, ...remotive, ...techmap]

  return all.filter((j) => {
    if (
      !j.title ||
      !j.company ||
      !/^https?:\/\//i.test(j.url) ||
      (j.expiresAt && !(Date.parse(j.expiresAt) > Date.now())) ||
      /(?:applications (?:are )?closed|no longer accepting applications)/i.test(j.description)
    )
      return false
    const url = URL.parse(j.url)
    if (!url) return false
    url.hash = ''
    for (const name of [...url.searchParams.keys()])
      if (name.startsWith('utm_')) url.searchParams.delete(name)
    const key = jobFingerprint(j.title, j.company)
    if (seen.has(key) || urls.has(url.href)) return false
    urls.add(url.href)
    seen.add(key)
    return true
  })
}
