'use client'

import Link from 'next/link'
import { useCallback, useRef, useState } from 'react'
import { saveProfileAction, uploadResumeAction } from './actions'
import type { ProfileFormState } from '@/lib/profile-ops'

export function ProfileForm({ initial }: { initial: ProfileFormState }) {
  const [targetRoles, setTargetRoles] = useState(initial.targetRoles)
  const [locations, setLocations] = useState(initial.locations)
  const [remoteOnly, setRemoteOnly] = useState(initial.remoteOnly)
  const [country, setCountry] = useState(initial.country)
  const [experienceYears, setExperienceYears] = useState(initial.experienceYears)
  const [skills, setSkills] = useState<string[]>(initial.skills)
  const [resumeFileName, setResumeFileName] = useState<string | null>(initial.resumeFileName)
  const [resumePreview, setResumePreview] = useState<string | null>(initial.resumePreview)
  const [resumeTextLength, setResumeTextLength] = useState(initial.resumeTextLength)
  const [showPreview, setShowPreview] = useState(false)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadResume = useCallback(async (file: File) => {
    if (file.size > 4_000_000) { setError('Choose a file of 4 MB or less.'); return }
    setUploading(true)
    setError('')
    setMessage('')

    const form = new FormData()
    form.append('file', file)

    try {
      const data = await uploadResumeAction(form)

      if (!data || !('success' in data) || !data.success) {
        setError(('error' in data && data.error) || 'Upload failed')
        return
      }

      setResumeFileName(data.resumeFileName ?? null)
      setResumePreview(data.preview ?? null)
      setResumeTextLength(data.resumeTextLength ?? 0)
      if (data.profile) {
        if (data.profile.targetRoles?.length) {
          setTargetRoles(data.profile.targetRoles.join(', '))
        }
        if (data.profile.locations?.length) {
          setLocations(data.profile.locations.join(', '))
        }
        setSkills(data.profile.skills)
      }
      setMessage(
        'Resume uploaded. Review your extracted text and save any changes to your preferences.',
      )
    } catch {
      setError('Network error while uploading')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadResume(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadResume(file)
  }

  async function saveProfile() {
    setSaving(true)
    setMessage('')
    setError('')

    const data = await saveProfileAction({
      targetRoles: targetRoles.split(',').map((s) => s.trim()).filter(Boolean),
      locations: locations.split(',').map((s) => s.trim()).filter(Boolean),
      remoteOnly, country, experienceYears,
    })

    if (data && 'success' in data && data.success) {
      setMessage('Preferences saved. Job Matches scores update on the next refresh.')
    } else {
      setError(('error' in data && data.error) || 'Failed to save')
    }

    setSaving(false)
  }

  return (
    <div className="w-full max-w-2xl">
      <h1 className="text-2xl font-bold mb-2 sm:text-3xl">Profile</h1>
      <p className="text-slate-600 mb-4 text-sm sm:text-base">
        Attach your resume file. We extract the text and skills for matching and AI cover letters.
      </p>
      <p className="mb-6 text-sm">
        <Link href="/dashboard/matches" className="text-blue-600 hover:underline">
          Go to Job Matches →
        </Link>
      </p>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">{message}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-lg text-sm">{error}</div>
      )}

      <div className="bg-white p-4 sm:p-6 rounded-xl border space-y-6">
        <div className="space-y-3">
          <label className="block text-sm font-medium">Resume file</label>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={onFileChange}
            />
            {uploading ? (
              <p className="text-slate-600 text-sm">Reading and extracting your resume…</p>
            ) : (
              <>
                <p className="font-medium text-slate-800 mb-1">
                  Drop your resume here or click to browse
                </p>
                <p className="text-xs text-slate-500">PDF, DOCX, or TXT · max 4 MB</p>
              </>
            )}
          </div>

          {resumeFileName && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm bg-slate-50 rounded-lg p-3">
              <span className="truncate">
                <span className="text-slate-500">On file:</span>{' '}
                <a className="font-medium underline" href="/api/profile/resume">{resumeFileName}</a>
                {resumeTextLength > 0 && (
                  <span className="text-slate-400"> · {resumeTextLength.toLocaleString()} chars extracted</span>
                )}
              </span>
            </div>
          )}

          {skills.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Skills we detected</p>
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 24).map((skill) => (
                  <span
                    key={skill}
                    className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {resumePreview && (
            <div>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="text-sm text-blue-600 hover:underline"
              >
                {showPreview ? 'Hide extracted text' : 'Show extracted text preview'}
              </button>
              {showPreview && (
                <pre className="mt-2 text-xs text-slate-600 bg-slate-50 border rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {resumePreview}
                  {resumeTextLength > resumePreview.length ? '…' : ''}
                </pre>
              )}
            </div>
          )}
        </div>

        <div className="border-t pt-6 space-y-6">
          <p className="text-sm text-slate-500">
            These preferences also apply to Auto-Hunt.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1">Target roles (comma-separated)</label>
            <input
              value={targetRoles}
              onChange={(e) => setTargetRoles(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Frontend Engineer, DevOps, IT Support"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Locations / remote (comma-separated)</label>
            <input
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Remote, Lagos, UK"
            />
          </div>
          <label className="block">Country of residence<input className="block w-full rounded border p-2" value={country} onChange={e => setCountry(e.target.value)} /></label>
          <label className="block">Years of relevant experience<input className="block w-full rounded border p-2" type="number" min="0" max="60" value={experienceYears} onChange={e => setExperienceYears(Number(e.target.value))} /></label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className="rounded"
            />
            Only show remote jobs in matches
          </label>
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
