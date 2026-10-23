'use client'

import { FormEvent, useState } from 'react'

type AskSource = { title: string; url: string; site: string }

type AskEvent =
  | { type: 'meta'; sources: AskSource[]; answerId: string }
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export default function AskGuide({ compact = false }: { compact?: boolean }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<AskSource[]>([])
  const [answerId, setAnswerId] = useState('live')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  const [voteNote, setVoteNote] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setAnswer('')
    setSources([])
    setVote(null)
    setVoteNote(null)
    try {
      const response = await fetch('/api/destiny/ask', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      if (!response.ok || !response.body) {
        const json = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error || 'Ask TopNest could not start.')
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const step = await reader.read()
        if (step.done) break
        buffer += decoder.decode(step.value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''
        for (const chunk of chunks) {
          const line = chunk.trim()
          if (!line.startsWith('data:')) continue
          const payload = JSON.parse(line.slice(5).trim()) as AskEvent
          if (payload.type === 'meta') {
            setSources(payload.sources ?? [])
            setAnswerId(payload.answerId || 'live')
          } else if (payload.type === 'delta') {
            setAnswer((current) => current + payload.text)
          } else if (payload.type === 'error') {
            setError(payload.message)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ask TopNest could not finish.')
    } finally {
      setBusy(false)
    }
  }

  async function sendVote(next: 'up' | 'down') {
    setVote(next)
    const response = await fetch('/api/destiny/ask/feedback', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, vote: next, answerId }),
    })
    setVoteNote(response.ok ? 'Saved for review.' : 'Could not save that rating.')
  }

  return (
    <section className={compact ? 'gh-ask' : 'gh-stack gh-ask'} aria-labelledby="gh-ask-title">
      {compact ? null : (
        <header className="gh-page-head">
          <p className="gh-kicker">Ask TopNest</p>
          <h1 id="gh-ask-title">Ask a Destiny question</h1>
          <p className="gh-lede">Short steps, with links to the pages they came from.</p>
        </header>
      )}
      {compact ? <h2 id="gh-ask-title">Ask TopNest</h2> : null}
      <form onSubmit={(event) => void onSubmit(event)}>
        <label className="gh-sr" htmlFor={compact ? 'ask-home' : 'ask-page'}>
          Ask TopNest
        </label>
        <input
          id={compact ? 'ask-home' : 'ask-page'}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="How do I unlock an ability on a second character?"
          maxLength={400}
        />
        <button type="submit" className="gh-btn gh-btn-primary" disabled={busy}>
          {busy ? 'Looking…' : 'Ask'}
        </button>
      </form>
      {error ? <p className="gh-alert">{error}</p> : null}
      {answer ? <p className="gh-ask-answer">{answer}</p> : null}
      {sources.length > 0 ? (
        <details className="gh-disclosure" open>
          <summary>Sources</summary>
          <ul className="gh-list">
            {sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} rel="noreferrer">
                  {source.title}
                </a>
                <span className="gh-muted">{source.site}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {answer && !busy ? (
        <div className="gh-actions">
          <button type="button" className="gh-btn gh-btn-ghost" aria-pressed={vote === 'up'} onClick={() => void sendVote('up')}>
            Helpful
          </button>
          <button type="button" className="gh-btn gh-btn-ghost" aria-pressed={vote === 'down'} onClick={() => void sendVote('down')}>
            Not helpful
          </button>
          {voteNote ? <span className="gh-muted">{voteNote}</span> : null}
        </div>
      ) : null}
      {compact ? (
        <p className="gh-muted">
          <a href="/ask">Open the full Ask page</a>
        </p>
      ) : null}
    </section>
  )
}
