// Known Nigerian tech companies that use public ATS boards
// Add more as you discover their board slugs
export const NIGERIAN_TECH_ATS = [
  { company: 'Moniepoint', ats: 'greenhouse', slug: 'moniepoint' },
  { company: 'Flutterwave', ats: 'greenhouse', slug: 'flutterwave' },
  { company: 'Andela', ats: 'greenhouse', slug: 'andela' },
  { company: 'Paystack', ats: 'lever', slug: 'paystack' },
  { company: 'PiggyVest', ats: 'greenhouse', slug: 'piggyvest' },
  // Add more here
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
  postedAt?: string
}

export async function fetchRemotiveJobs(search = 'software'): Promise<JobSource[]> {
  try {
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(search)}&limit=20`,
      { next: { revalidate: 3600 } } // cache 1 hour
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).map((j: any) => ({
      id: `remotive-${j.id}`,
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || 'Remote',
      description: j.description || '',
      url: j.url,
      source: 'remotive',
      remote: true,
      postedAt: j.publication_date,
    }))
  } catch (e) {
    console.error('Remotive error', e)
    return []
  }
}

export async function fetchATSJobs(): Promise<JobSource[]> {
  const jobs: JobSource[] = []

  for (const board of NIGERIAN_TECH_ATS) {
    try {
      let url = ''
      if (board.ats === 'greenhouse') {
        url = `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs?content=true`
      } else if (board.ats === 'lever') {
        url = `https://api.lever.co/v0/postings/${board.slug}?mode=json`
      } else {
        continue
      }

      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (!res.ok) continue
      const data = await res.json()

      if (board.ats === 'greenhouse') {
        for (const j of data.jobs || []) {
          jobs.push({
            id: `gh-${board.slug}-${j.id}`,
            title: j.title,
            company: board.company,
            location: j.location?.name || 'Nigeria',
            description: j.content || '',
            url: j.absolute_url,
            source: 'greenhouse',
            remote: false,
          })
        }
      } else if (board.ats === 'lever') {
        for (const j of data || []) {
          jobs.push({
            id: `lever-${board.slug}-${j.id}`,
            title: j.text,
            company: board.company,
            location: j.categories?.location || 'Nigeria',
            description: j.descriptionPlain || '',
            url: j.hostedUrl,
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
        next: { revalidate: 3600 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()

    // Filter to tech-ish roles
    const techKeywords = ['engineer', 'developer', 'software', 'tech', 'it ', 'data', 'devops', 'frontend', 'backend', 'fullstack']
    return (data.jobs || data.results || [])
      .filter((j: any) => {
        const text = `${j.title || ''} ${j.description || ''}`.toLowerCase()
        return techKeywords.some(k => text.includes(k))
      })
      .map((j: any) => ({
        id: `techmap-${j.id || j.jobId}`,
        title: j.title,
        company: j.company || j.companyName || 'Unknown',
        location: j.location || j.city || 'Nigeria',
        description: j.description || '',
        url: j.url || j.applyUrl || '#',
        source: 'techmap',
        remote: (j.workPlace || '').toLowerCase().includes('remote'),
        postedAt: j.dateCreated || j.postedAt,
      }))
  } catch (e) {
    console.error('Techmap error', e)
    return []
  }
}

export function scoreJob(job: JobSource, resumeText: string): number {
  if (!resumeText || resumeText.length < 20) return 50

  const resume = resumeText.toLowerCase()
  const jobText = `${job.title} ${job.description}`.toLowerCase()

  // Simple keyword overlap
  const keywords = [
    'react', 'next', 'node', 'typescript', 'javascript', 'python', 'java',
    'aws', 'docker', 'kubernetes', 'sql', 'postgres', 'mongodb',
    'frontend', 'backend', 'fullstack', 'devops', 'data', 'ml', 'ai',
    'engineer', 'developer', 'software', 'senior', 'lead', 'manager',
  ]

  let matches = 0
  for (const kw of keywords) {
    if (resume.includes(kw) && jobText.includes(kw)) matches++
  }

  // Base + overlap bonus, capped
  const score = Math.min(95, 40 + matches * 8)
  return score
}
  const [remotive, ats, techmap] = await Promise.all([
    fetchRemotiveJobs('software engineer'),
    fetchATSJobs(),
    fetchTechmapJobs(techmapKey),
  ])

  // Deduplicate roughly by title+company
  const seen = new Set<string>()
  const all = [...remotive, ...ats, ...techmap]
  return all.filter(j => {
    const key = `${j.title.toLowerCase()}-${j.company.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
