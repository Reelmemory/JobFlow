'use client'

import { useEffect, useState } from 'react'

type Email = {
  id: string
  from: string
  to: string
  subject: string
  body: string
  isRead: boolean
  receivedAt: string
}

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([])
  const [selected, setSelected] = useState<Email | null>(null)
  const [loading, setLoading] = useState(true)
  const [inboxAddress, setInboxAddress] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/emails').then(r => r.json()),
      fetch('/api/inbox/address').then(r => r.json()),
    ]).then(([emailData, addrData]) => {
      setEmails(emailData.emails || [])
      setInboxAddress(addrData.inboxAddress)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function generateAddress() {
    setGenerating(true)
    const res = await fetch('/api/inbox/address', { method: 'POST' })
    const data = await res.json()
    setInboxAddress(data.inboxAddress)
    setGenerating(false)
  }

  async function markRead(id: string) {
    await fetch(`/api/emails/${id}/read`, { method: 'POST' })
    setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e))
  }

  if (loading) return <div className="text-slate-500">Loading inbox...</div>

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-80 bg-white border rounded-xl overflow-y-auto flex flex-col">
        <div className="p-4 border-b">
          <div className="font-semibold mb-2">Inbox</div>
          {inboxAddress ? (
            <div className="text-xs bg-slate-50 p-2 rounded break-all">
              <span className="text-slate-500">Your address:</span><br />
              <span className="font-mono">{inboxAddress}</span>
            </div>
          ) : (
            <button
              onClick={generateAddress}
              disabled={generating}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate inbox address'}
            </button>
          )}
        </div>
        {emails.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No emails yet</div>
        ) : (
          emails.map(email => (
            <button
              key={email.id}
              onClick={() => {
                setSelected(email)
                if (!email.isRead) markRead(email.id)
              }}
              className={`w-full text-left p-4 border-b hover:bg-slate-50 ${!email.isRead ? 'bg-blue-50' : ''}`}
            >
              <div className="font-medium text-sm truncate">{email.subject}</div>
              <div className="text-xs text-slate-500 truncate">{email.from}</div>
              <div className="text-xs text-slate-400">{new Date(email.receivedAt).toLocaleDateString()}</div>
            </button>
          ))
        )}
      </div>

      <div className="flex-1 bg-white border rounded-xl p-6 overflow-y-auto flex flex-col">
        {selected ? (
          <>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-1">{selected.subject}</h2>
              <p className="text-sm text-slate-500 mb-4">From: {selected.from}</p>
              <pre className="whitespace-pre-wrap text-sm text-slate-700 mb-6">{selected.body}</pre>
            </div>
            <ReplyForm to={selected.from} subject={`Re: ${selected.subject}`} />
          </>
        ) : (
          <div className="text-slate-400 text-center mt-20">Select an email</div>
        )}
      </div>
    </div>
  )
}

function ReplyForm({ to, subject }: { to: string; subject: string }) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')

  async function send() {
    if (!body.trim()) return
    setSending(true)
    setMsg('')
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg('Sent')
        setBody('')
      } else {
        setMsg(data.error || 'Failed')
      }
    } catch {
      setMsg('Error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t pt-4">
      <div className="text-sm font-medium mb-2">Reply</div>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write your reply..."
        className="w-full border rounded-lg p-3 text-sm h-24 mb-2"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={send}
          disabled={sending || !body.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
        {msg && <span className="text-sm text-slate-600">{msg}</span>}
      </div>
    </div>
  )
}