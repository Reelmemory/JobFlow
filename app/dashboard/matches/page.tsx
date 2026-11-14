'use client'

import { useEffect, useState } from 'react'

type Job = {
  id: string
  title: string
  company: string
  location: string
  description: string
  url: string
  source: string
  remote: boolean
  match?: number
}

export default function MatchesPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then(data => {
        setJobs(data.jobs || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function applyWithAI(job: Job) {
    setApplying(job.id)
    setMessage('')

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          matchScore: job.match || 0,
          url: job.url,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setMessage(`Cover letter prepared for ${job.title} at ${job.company}. Open your draft in Applications, then submit it on the employer's website.`)
      } else {
        setMessage(data.error || 'Failed')
      }
    } catch {
      setMessage('Network error')
    } finally {
      setApplying(null)
    }
  }

  if (loading) {
    return <div className="text-slate-500">Loading jobs...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Job Matches</h1>
      <p className="text-slate-600 mb-6">
        Remote (Remotive) + Nigerian tech company boards + Techmap (if key set). Tech roles only.
      </p>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">{message}</div>
      )}

      {jobs.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border text-center text-slate-500">
          No jobs loaded. Check the API or add a Techmap key.
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.slice(0, 30).map((job) => (
            <div key={job.id} className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-start gap-4">
              <div className="flex-1">
                <h3 className="font-semibold">{job.title}</h3>
                <p className="text-sm text-slate-500">{job.company} · {job.location}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {job.remote ? 'Remote' : 'On-site'} · via {job.source}
                </p>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{job.description.slice(0, 180)}...</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-sm font-medium text-blue-600">{job.match ?? 0}% match</span>
                <button
                  onClick={() => applyWithAI(job)}
                  disabled={applying === job.id}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {applying === job.id ? 'Preparing...' : 'Generate cover letter'}
                </button>
                <a href={job.url} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">
                  View original
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
