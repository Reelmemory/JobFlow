'use client'

import { useState } from 'react'

const STATUSES = ['applied', 'viewed', 'interview', 'rejected', 'offer']

export function StatusSelect({ id, current }: { id: string; current: string }) {
  const [status, setStatus] = useState(current)
  const [saving, setSaving] = useState(false)

  async function update(newStatus: string) {
    setSaving(true)
    setStatus(newStatus)
    await fetch(`/api/applications/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setSaving(false)
  }

  return (
    <select
      value={status}
      onChange={e => update(e.target.value)}
      disabled={saving}
      className="w-full sm:w-auto min-h-[2.25rem] px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm capitalize border-0 cursor-pointer"
    >
      {STATUSES.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}
