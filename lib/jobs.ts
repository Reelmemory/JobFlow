// Known Nigerian tech companies that use public ATS boards.
export const NIGERIAN_TECH_ATS = [
  { company: 'Moniepoint', ats: 'greenhouse', slug: 'moniepoint' },
  { company: 'Flutterwave', ats: 'greenhouse', slug: 'flutterwave' },
  { company: 'Andela', ats: 'greenhouse', slug: 'andela' },
  { company: 'Paystack', ats: 'lever', slug: 'paystack' },
  { company: 'PiggyVest', ats: 'greenhouse', slug: 'piggyvest' },
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
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) {
      console.error('Remotive returned', res.status)
      return []
    }
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
  } catch (error) {
    console.error('Remotive error', error)
    return []
  }
}

export async function fetchATSJobs(): Promise<JobSource[]> {
  const jobs: JobSource[] = []

  for (const board of NIGERIAN_TECH_ATS) {
    try {
      const url =
        board.ats === 'greenhouse'
          ? `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs?content=true`
          : `https://api.lever.co/v0/postings/${board.slug}?mode=json`

      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (!res.ok) {
        console.error(`${board.company} ATS returned`, res.status)
        continue
      }
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
      } else {
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
    } catch (error) {
      console.error(`ATS error for ${board.company}`, error)
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
    if (!res.ok) {
      console.error('Techmap returned', res.status)
      return []
    }
    const data = await res.json()
    const techKeywords = [
      'engineer', 'developer', 'software', 'tech', 'it ', 'data',
      'devops', 'frontend', 'backend', 'fullstack',
    ]

    return (data.jobs || data.results || [])
      .filter((j: any) => {
        const text = `${j.title || ''} ${j.description || ''}`.toLowerCase()
        return techKeywords.some(keyword => text.includes(keyword))
      })
      .map((j: any) => ({
        id: `techmap-${j.id || j.jobId}`,
        title: j.title,
        company: j.company || j.companyName || 'Unknown',
        location: j.location || j.city || 'Nigeria',
        description: j.description || '',
        url: j.url || j.applyUrl || '',
        source: 'techmap',
        remote: (j.workPlace || '').toLowerCase().includes('remote'),
        postedAt: j.dateCreated || j.postedAt,
      }))
  } catch (error) {
    console.error('Techmap error', error)
    return []
  }
}

export function scoreJob(job: JobSource, resumeText: string): number {
  if (!resumeText || resumeText.trim().length < 20) return 0

  const resume = resumeText.toLowerCase()
  const jobText = `${job.title} ${job.description}`.toLowerCase()
  const keywords = [
    'react', 'next', 'node', 'typescript', 'javascript', 'python', 'java',
    'aws', 'docker', 'kubernetes', 'sql', 'postgres', 'mongodb',
    'frontend', 'backend', 'fullstack', 'devops', 'data', 'ml', 'ai',
    'engineer', 'developer', 'software', 'senior', 'lead', 'manager',
  ]

  const matches = keywords.filter(keyword =>
    resume.includes(keyword) && jobText.includes(keyword)
  ).length

  return Math.min(95, 40 + matches * 8)
}

export async function fetchAllJobs(apiKey?: string): Promise<JobSource[]> {
  const [remotive, ats, techmap] = await Promise.all([
    fetchRemotiveJobs('software engineer'),
    fetchATSJobs(),
    fetchTechmapJobs(apiKey),
  ])

  const seen = new Set<string>()
  return [...remotive, ...ats, ...techmap].filter(job => {
    const key = `${job.title.toLowerCase().trim()}-${job.company.toLowerCase().trim()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
