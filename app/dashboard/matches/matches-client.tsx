'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useAuthedJson } from '@/lib/use-authed-json'
import { stripHtmlToPlainText } from '@/lib/strip-html'
import { refreshJobsAction } from './actions'

type Job = {
  id: string
  title: string
  company: string
  location: string
  description: string
  url: string
  source: string
  remote: boolean
  reason?: string
  needsReview?: boolean
  match?: number
  applied?: boolean
  applyEmail?: string | null
}

type JobsResponse = {
  jobs?: Job[]
  count?: number
  hasResume?: boolean
  profileComplete?: boolean
  fetchedTotal?: number
  sources?: Record<string, number>
  appliedCount?: number
  dbWarning?: string
  error?: string
}

function setAppliedLocal(jobs: Job[], jobId: string) {
  return jobs.map((j) => (j.id === jobId ? { ...j, applied: true } : j))
}

type SourceFilter = 'all' | 'remotive' | 'greenhouse' | 'lever' | 'techmap' | 'myjobmag'
type RemoteFilter = 'all' | 'remote' | 'onsite'

function matchColor(score: number) {
  if (score >= 75) return 'text-green-600 bg-green-50'
  if (score >= 55) return 'text-blue-600 bg-blue-50'
  return 'text-slate-600 bg-slate-100'
}

export function MatchesClient({ initial }: { initial: JobsResponse }) {
  const [jobs, setJobs] = useState<Job[]>(initial.jobs || [])
  const [meta, setMeta] = useState<JobsResponse>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initial.error || '')
  const [applying, setApplying] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [remoteFilter, setRemoteFilter] = useState<RemoteFilter>('all')
  const [minMatch, setMinMatch] = useState(0)
  const [hideApplied, setHideApplied] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dbWarning, setDbWarning] = useState(initial.dbWarning || '')
  const { request } = useAuthedJson()

  const loadJobs = useCallback(async () => {
    setLoading(true)
    setError('')
    setDbWarning('')

    const data = await refreshJobsAction()

    if (!data || data.error) {
      setError(data?.error || 'Failed to load jobs')
      setJobs([])
      setMeta({})
    } else {
      setJobs(
        (data.jobs || []).map((job) => ({
          ...job,
          description: stripHtmlToPlainText(job.description || ''),
        })),
      )
      setMeta(data)
      if (data.dbWarning) setDbWarning(data.dbWarning)
    }
    setLoading(false)
  }, [])

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (hideApplied && job.applied) return false
      const score = job.match ?? 0
      if (score < minMatch) return false
      if (sourceFilter !== 'all' && job.source !== sourceFilter) return false
      if (remoteFilter === 'remote' && !job.remote) return false
      if (remoteFilter === 'onsite' && job.remote) return false
      return true
    })
  }, [jobs, minMatch, sourceFilter, remoteFilter, hideApplied])

  async function applyWithAI(job: Job) {
    setApplying(job.id)
    try {
      const { ok, error } = await request('/api/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: job.id }) })
      if (!ok) { setMessage(error || 'Could not prepare draft'); return }
      setJobs(prev => setAppliedLocal(prev, job.id))
      setMessage('Draft saved. Open Applications to review the letter and CV.')
    } finally { setApplying(null) }
  }

  const sourceSummary = meta.sources
    ? Object.entries(meta.sources)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${n} ${k}`)
        .join(' · ')
    : ''

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2 sm:text-3xl">Job Matches</h1>
          <p className="text-slate-600 max-w-2xl text-sm sm:text-base">
            Live listings from MyJobMag Nigeria, Remotive, public Greenhouse/Lever boards, and Techmap (if configured).
            Scores use your profile resume, roles, and locations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadJobs()}
          disabled={loading}
          className="w-full sm:w-auto border border-slate-300 bg-white px-4 py-2 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 shrink-0"
        >
          {loading ? 'Refreshing…' : 'Refresh jobs'}
        </button>
      </div>

      {!meta.hasResume && !loading && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          Upload your resume on{' '}
          <Link href="/dashboard/profile" className="font-medium underline">
            Profile
          </Link>{' '}
          for accurate match scores and better cover letters.
        </div>
      )}

      {dbWarning && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          <p className="font-medium mb-1">Database offline — showing live jobs only</p>
          <p>{dbWarning}</p>
          <p className="mt-2 text-xs text-amber-800">
            Match scores and “tracked jobs” need the DB. Wake Neon in the console, fix{' '}
            <code className="bg-amber-100 px-1 rounded">DATABASE_URL</code>, restart{' '}
            <code className="bg-amber-100 px-1 rounded">npm run dev</code>.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-lg text-sm">{error}</div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">{message}</div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end bg-white p-4 rounded-xl border">
        <label className="text-sm">
          <span className="block text-slate-500 mb-1">Source</span>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
            className="border rounded-lg px-3 py-1.5 text-sm w-full sm:w-auto min-w-[10rem]"
          >
            <option value="all">All sources</option>
            <option value="myjobmag">MyJobMag Nigeria</option>
            <option value="remotive">Remotive</option>
            <option value="greenhouse">Greenhouse (NG)</option>
            <option value="lever">Lever (NG)</option>
            <option value="techmap">Techmap</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-500 mb-1">Work style</span>
          <select
            value={remoteFilter}
            onChange={(e) => setRemoteFilter(e.target.value as RemoteFilter)}
            className="border rounded-lg px-3 py-1.5 text-sm w-full sm:w-auto min-w-[10rem]"
          >
            <option value="all">Remote + on-site</option>
            <option value="remote">Remote only</option>
            <option value="onsite">On-site only</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-500 mb-1">Min match %</span>
          <input
            type="number"
            min={0}
            max={99}
            value={minMatch}
            onChange={(e) => setMinMatch(Number(e.target.value) || 0)}
            className="border rounded-lg px-3 py-1.5 text-sm w-24"
          />
        </label>
        <label className="flex items-center gap-2 text-sm self-end pb-1">
          <input
            type="checkbox"
            checked={hideApplied}
            onChange={(e) => setHideApplied(e.target.checked)}
            className="rounded"
          />
          Hide tracked jobs
        </label>
        {!loading && (
          <p className="text-xs text-slate-500 sm:ml-auto sm:self-center w-full sm:w-auto">
            Showing {filteredJobs.length} of {meta.count ?? jobs.length} matched
            {sourceSummary ? ` (${sourceSummary})` : ''}
            {typeof meta.fetchedTotal === 'number' ? ` · ${meta.fetchedTotal} fetched` : ''}
            {typeof meta.appliedCount === 'number' && meta.appliedCount > 0
              ? ` · ${meta.appliedCount} tracked jobs`
              : ''}
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-slate-500">Loading jobs from sources…</div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border text-center text-slate-500">
          {jobs.length === 0
            ? 'No jobs returned. Check your network or try Refresh.'
            : 'No jobs match your filters. Lower min match % or change source.'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => {
            const score = job.match ?? 50
            const expanded = expandedId === job.id
            return (
              <article
                key={job.id}
                className="bg-white p-5 rounded-xl border shadow-sm flex flex-col sm:flex-row justify-between items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <p className="text-sm text-slate-500">
                    {job.company} · {job.location}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {job.remote ? 'Remote' : 'On-site'} · via {job.source}
                    {job.applyEmail ? ` · apply ${job.applyEmail}` : ''}
                  </p>
                  <p className="text-sm mt-2">{job.needsReview && <strong>Needs review · </strong>}{job.reason}</p>
                  <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">
                    {expanded ? job.description : `${job.description.slice(0, 280)}${job.description.length > 280 ? '…' : ''}`}
                  </p>
                  {job.description.length > 280 && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : job.id)}
                      className="text-xs text-blue-600 mt-2 hover:underline"
                    >
                      {expanded ? 'Show less' : 'Show full description'}
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto">
                  <span
                    className={`text-sm font-semibold px-2 py-1 rounded-md self-start sm:self-end ${matchColor(score)}`}
                  >
                    {score}% match
                  </span>
                  {job.applied ? (
                    <span className="text-sm font-medium text-slate-500 px-4 py-2 rounded-lg bg-slate-100 text-center">
                      In Applications
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => applyWithAI(job)}
                      disabled={applying === job.id}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {applying === job.id ? 'Preparing…' : 'Prepare draft'}
                    </button>
                  )}
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-500 underline text-center sm:text-right"
                  >
                    View original posting
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}