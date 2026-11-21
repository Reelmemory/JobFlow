'use client'

import { useState } from 'react'

export default function ProfilePage() {
  const [resumeText, setResumeText] = useState('')
  const [targetRoles, setTargetRoles] = useState('Software Engineer, Full Stack, IT Support')
  const [locations, setLocations] = useState('Remote, Lagos, Nairobi')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function saveProfile() {
    setSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          targetRoles: targetRoles.split(',').map(s => s.trim()).filter(Boolean),
          locations: locations.split(',').map(s => s.trim()).filter(Boolean),
        }),
      })

      const data = await res.json()
      if (data.success) {
        setMessage('Profile saved. Future applications will use this resume.')
      } else {
        setMessage(data.error || 'Failed to save')
      }
    } catch {
      setMessage('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Profile</h1>
      <p className="text-slate-600 mb-8">
        Paste your resume text and set preferences. The AI uses this for every “Apply with AI”.
      </p>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">{message}</div>
      )}

      <div className="bg-white p-6 rounded-xl border space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Target Roles (comma separated)</label>
          <input
            value={targetRoles}
            onChange={(e) => setTargetRoles(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Locations / Remote (comma separated)</label>
          <input
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Resume (paste plain text)</label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={12}
            placeholder="Paste your resume text here. This is what the AI will use to write cover letters."
            className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
          />
        </div>
        <button
          onClick={saveProfile}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}
