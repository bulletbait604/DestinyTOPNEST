'use client'

import { FormEvent, useEffect, useState } from 'react'
import type { GuardianDirectoryCard } from '@/lib/destiny/guardianDirectory'
import {
  RATE_TAGS,
  RATE_TAG_LABELS,
  type QuickRateTarget,
  type RateTag,
} from '@/lib/destiny/quickRate'
import { startBungieLogin } from '@/lib/bungie/startBungieLogin'

export const QUICK_RATE_EVENT = 'topnest:quick-rate'

export function openQuickRate(target: QuickRateTarget) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(QUICK_RATE_EVENT, { detail: target }))
}

export function rateReturnPath(target: QuickRateTarget): string {
  const params = new URLSearchParams()
  if (target.membershipId) params.set('guardian', target.membershipId)
  if (target.displayName) params.set('q', target.displayName)
  if (target.runId) params.set('run', target.runId)
  const qs = params.toString()
  return qs ? `/rate?${qs}` : '/rate'
}

function signInToVote(target: QuickRateTarget) {
  startBungieLogin(rateReturnPath(target))
}

export function QuickRateForm({
  target,
  signedIn,
  compact = false,
  onSubmitted,
}: {
  target: QuickRateTarget
  signedIn: boolean
  compact?: boolean
  onSubmitted?: () => void
}) {
  const [tags, setTags] = useState<RateTag[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMessage(null)
    setError(null)
    if (!signedIn || !target.membershipId) return
    let cancelled = false
    void fetch(`/api/destiny/rate?membershipId=${encodeURIComponent(target.membershipId)}`, {
      credentials: 'include',
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((json: { mine?: { tags?: RateTag[]; note?: string } | null } | null) => {
        if (cancelled || !json?.mine) return
        if (Array.isArray(json.mine.tags)) setTags(json.mine.tags)
        if (typeof json.mine.note === 'string') setNote(json.mine.note)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [signedIn, target.membershipId])

  const toggle = (tag: RateTag) => {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]))
  }

  const submit = async () => {
    if (!target.membershipId) {
      setError('Pick a Guardian first.')
      return
    }
    if (!tags.length) {
      setError('Pick at least one tag.')
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/destiny/rate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId: target.membershipId,
          displayName: target.displayName,
          tags,
          note,
          runId: target.runId,
        }),
      })
      const json = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!response.ok) throw new Error(json.error ?? 'Could not save that rating')
      setMessage(json.message ?? `Rated ${target.displayName}.`)
      onSubmitted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that rating')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className={compact ? 'gh-rate-form gh-rate-form-compact' : 'gh-rate-form'}
      onSubmit={(event) => {
        event.preventDefault()
        if (signedIn) void submit()
      }}
    >
      <p className="gh-muted">Tap the tags that fit, then send.</p>
      <div className="gh-tags" role="group" aria-label="Rating tags">
        {RATE_TAGS.filter((tag) => tag !== 'mvp').map((tag) => (
          <button
            key={tag}
            type="button"
            className="gh-tag"
            aria-pressed={tags.includes(tag)}
            onClick={() => toggle(tag)}
          >
            {RATE_TAG_LABELS[tag]}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="gh-tag gh-mvp-toggle"
        aria-pressed={tags.includes('mvp')}
        onClick={() => toggle('mvp')}
      >
        Cast MVP Vote
      </button>
      <label className="gh-sr" htmlFor={`rate-note-${target.membershipId ?? 'new'}`}>
        Optional one-line note
      </label>
      <input
        id={`rate-note-${target.membershipId ?? 'new'}`}
        value={note}
        maxLength={120}
        placeholder="Optional one-line note"
        onChange={(event) => setNote(event.target.value)}
      />
      {message ? (
        <p className="gh-confirm" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="gh-alert" role="alert">
          {error}
        </p>
      ) : null}
      {signedIn ? (
        <button type="submit" className="gh-btn gh-btn-primary" disabled={saving}>
          {saving ? 'Sending…' : 'Submit Rating'}
        </button>
      ) : (
        <button type="button" className="gh-btn gh-btn-primary" onClick={() => signInToVote(target)}>
          Sign in with Bungie to submit your vote
        </button>
      )}
    </form>
  )
}

function pickLabel(card: { displayName: string; membershipId: string }) {
  return `${card.displayName}`
}

export function RateButton({
  membershipId,
  displayName,
  membershipType,
  runId,
}: QuickRateTarget) {
  return (
    <button
      type="button"
      className="gh-btn gh-btn-ghost gh-rate-btn"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        openQuickRate({ membershipId, displayName, membershipType, runId })
      }}
    >
      Rate
    </button>
  )
}

function GuardianChoices({
  guardians,
  teammates,
  onPick,
}: {
  guardians: GuardianDirectoryCard[]
  teammates: { membershipId: string; displayName: string }[]
  onPick: (target: QuickRateTarget) => void
}) {
  return (
    <div className="gh-stack">
      {teammates.length > 0 ? (
        <div>
          <p className="gh-kicker">Recent teammates</p>
          <ul className="gh-directory">
            {teammates.map((teammate) => (
              <li key={teammate.membershipId}>
                <button type="button" className="gh-person-main" onClick={() => onPick(teammate)}>
                  {pickLabel(teammate)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="gh-muted">Recent teammates show up after a verified clear.</p>
      )}
      {guardians.length > 0 ? (
        <ul className="gh-directory">
          {guardians.map((card) => (
            <li key={card.membershipId}>
              <button
                type="button"
                className="gh-person-main"
                onClick={() =>
                  onPick({
                    membershipId: card.membershipId,
                    displayName: card.displayName,
                    membershipType: card.membershipType,
                  })
                }
              >
                {card.displayName}
                {card.clanTag ? ` [${card.clanTag}]` : ''}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function RatePage() {
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [guardians, setGuardians] = useState<GuardianDirectoryCard[]>([])
  const [teammates, setTeammates] = useState<{ membershipId: string; displayName: string }[]>([])
  const [target, setTarget] = useState<QuickRateTarget>({ displayName: '' })
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const membershipId = params.get('guardian') ?? undefined
    const displayName = params.get('q') ?? ''
    const runId = params.get('run') ?? undefined
    if (displayName) setDraft(displayName)
    if (membershipId || displayName) {
      setTarget({ membershipId: membershipId || undefined, displayName, runId })
      if (displayName) setQuery(displayName)
    }
    void fetch('/api/auth/session', { credentials: 'include' })
      .then((response) => setSignedIn(response.ok))
      .catch(() => setSignedIn(false))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams({ suggest: '1' })
    if (query.trim()) params.set('q', query.trim())
    const timer = window.setTimeout(() => {
      void fetch(`/api/destiny/rate?${params.toString()}`, { credentials: 'include' })
        .then(async (response) => (response.ok ? response.json() : { guardians: [], teammates: [] }))
        .then((json: { guardians?: GuardianDirectoryCard[]; teammates?: { membershipId: string; displayName: string }[] }) => {
          setGuardians(json.guardians ?? [])
          setTeammates(json.teammates ?? [])
        })
        .catch(() => {
          setGuardians([])
          setTeammates([])
        })
    }, 200)
    return () => window.clearTimeout(timer)
  }, [query])

  const search = (event: FormEvent) => {
    event.preventDefault()
    setQuery(draft.trim())
  }

  return (
    <section className="gh-stack" aria-labelledby="rate-title">
      <header className="gh-hero">
        <div>
          <p className="gh-kicker">Vote MVP</p>
          <h1 id="rate-title">Rate a Guardian</h1>
          <p className="gh-lede">Search a Bungie name, or pick someone you just played with. One screen, then send.</p>
        </div>
      </header>
      <form className="gh-rate-search" onSubmit={search}>
        <label className="gh-sr" htmlFor="rate-search">
          Search guardians
        </label>
        <input
          id="rate-search"
          value={draft}
          placeholder="Bungie name or Name#1234"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="gh-btn gh-btn-primary">
          Search
        </button>
      </form>
      <GuardianChoices guardians={guardians} teammates={teammates} onPick={setTarget} />
      <section className="gh-card" aria-label={target.displayName ? `Rate ${target.displayName}` : 'Rating'}>
        <h2>{target.displayName ? target.displayName : 'Pick a Guardian'}</h2>
        <QuickRateForm target={target} signedIn={signedIn} />
      </section>
    </section>
  )
}

export function QuickRateHost() {
  const [target, setTarget] = useState<QuickRateTarget | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [matches, setMatches] = useState<GuardianDirectoryCard[]>([])

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<QuickRateTarget>).detail
      if (!detail) return
      setTarget(detail)
      setMatches([])
    }
    window.addEventListener(QUICK_RATE_EVENT, open)
    return () => window.removeEventListener(QUICK_RATE_EVENT, open)
  }, [])

  useEffect(() => {
    if (!target) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTarget(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target])

  useEffect(() => {
    if (!target) return
    let cancelled = false
    void fetch('/api/auth/session', { credentials: 'include' })
      .then((response) => {
        if (!cancelled) setSignedIn(response.ok)
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false)
      })
    if (!target.membershipId && target.displayName.trim().length >= 2) {
      const params = new URLSearchParams({ suggest: '1', q: target.displayName.trim() })
      void fetch(`/api/destiny/rate?${params.toString()}`)
        .then(async (response) => (response.ok ? response.json() : { guardians: [] }))
        .then((json: { guardians?: GuardianDirectoryCard[] }) => {
          if (!cancelled) setMatches(json.guardians ?? [])
        })
        .catch(() => {
          if (!cancelled) setMatches([])
        })
    }
    return () => {
      cancelled = true
    }
  }, [target])

  if (!target) return null

  return (
    <div className="gh-drawer-backdrop" onClick={() => setTarget(null)}>
      <div
        className="gh-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-rate-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="gh-section-head">
          <h2 id="quick-rate-title">Rate {target.displayName || 'a Guardian'}</h2>
          <button type="button" className="gh-btn gh-btn-ghost" onClick={() => setTarget(null)}>
            Close
          </button>
        </div>
        {!target.membershipId ? (
          <GuardianChoices
            guardians={matches}
            teammates={[]}
            onPick={(next) => setTarget({ ...target, ...next })}
          />
        ) : null}
        <QuickRateForm target={target} signedIn={signedIn} />
      </div>
    </div>
  )
}
