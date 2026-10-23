'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { GuardianDirectoryCard } from '@/lib/destiny/guardianDirectory'
import type { QuickRateTarget } from '@/lib/destiny/quickRate'
import { startBungieLogin } from '@/lib/bungie/startBungieLogin'

export const QUICK_RATE_EVENT = 'topnest:quick-rate'

const mvpCountCache = new Map<string, Promise<number | null>>()

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

function mvpCountLabel(count: number | undefined): string | null {
  if (count == null) return null
  return count === 1 ? '1 MVP vote' : `${count} MVP votes`
}

function loadMvpCount(membershipId: string): Promise<number | null> {
  const cached = mvpCountCache.get(membershipId)
  if (cached) return cached
  const pending = fetch(`/api/destiny/rate?membershipId=${encodeURIComponent(membershipId)}`, { credentials: 'include' })
    .then(async (response) => (response.ok ? response.json() : null))
    .then((json: { mvpVotes?: number } | null) => (typeof json?.mvpVotes === 'number' ? json.mvpVotes : null))
    .catch(() => null)
  mvpCountCache.set(membershipId, pending)
  return pending
}

export function VoteMvpButton({
  membershipId,
  displayName,
  membershipType,
  runId,
  mvpVotes,
  signedIn,
  onSubmitted,
}: QuickRateTarget & { mvpVotes?: number; signedIn?: boolean; onSubmitted?: () => void }) {
  const [count, setCount] = useState<number | undefined>(mvpVotes)
  const [voted, setVoted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const target = { membershipId, displayName, membershipType, runId }

  useEffect(() => {
    if (mvpVotes != null) setCount(mvpVotes)
  }, [mvpVotes])

  useEffect(() => {
    if (mvpVotes != null || !membershipId) return
    let cancelled = false
    void loadMvpCount(membershipId).then((value) => {
      if (!cancelled && value != null) setCount(value)
    })
    return () => {
      cancelled = true
    }
  }, [membershipId, mvpVotes])

  const vote = async () => {
    if (!membershipId) {
      if (typeof window !== 'undefined') window.location.assign(rateReturnPath(target))
      return
    }
    if (signedIn === false) {
      signInToVote(target)
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (signedIn !== true) {
        const session = await fetch('/api/auth/session', { credentials: 'include' })
        if (!session.ok) {
          signInToVote(target)
          return
        }
      }
      const response = await fetch('/api/destiny/rate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId, displayName, tags: ['mvp'], runId }),
      })
      const json = (await response.json().catch(() => ({}))) as { error?: string; mvpStatus?: string }
      if (!response.ok) throw new Error(json.error ?? 'Could not save that MVP vote')
      setVoted(true)
      if (json.mvpStatus === 'saved') setCount((current) => (current ?? 0) + 1)
      onSubmitted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that MVP vote')
    } finally {
      setSaving(false)
    }
  }

  const countText = mvpCountLabel(count)

  return (
    <span className="gh-vote">
      <button
        type="button"
        className="gh-btn gh-btn-primary gh-rate-btn"
        disabled={saving}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void vote()
        }}
      >
        {saving ? 'Sending…' : voted ? 'Voted MVP ✓' : 'Vote MVP ⭐'}
      </button>
      {countText ? <span className="gh-mvp-count">{countText}</span> : null}
      {error ? (
        <span className="gh-alert" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  )
}

export function RateButton(props: QuickRateTarget & { mvpVotes?: number }) {
  return <VoteMvpButton {...props} />
}

export function QuickRateForm({
  target,
  signedIn,
  onSubmitted,
}: {
  target: QuickRateTarget
  signedIn: boolean
  compact?: boolean
  onSubmitted?: () => void
}) {
  return (
    <div className="gh-vote-block">
      {signedIn ? null : <p className="gh-muted">Sign in with Bungie to submit your vote</p>}
      <VoteMvpButton {...target} signedIn={signedIn} onSubmitted={onSubmitted} />
    </div>
  )
}

type VoteRow = {
  membershipId: string
  displayName: string
  membershipType?: number
  mvpVotes?: number
  runId?: string
}

function mergeRows(groups: VoteRow[][]): VoteRow[] {
  const seen = new Set<string>()
  const rows: VoteRow[] = []
  for (const group of groups) {
    for (const row of group) {
      const membershipId = row.membershipId?.trim()
      if (!membershipId || seen.has(membershipId)) continue
      seen.add(membershipId)
      rows.push({ ...row, membershipId })
    }
  }
  return rows
}

export function RatePage() {
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [guardians, setGuardians] = useState<GuardianDirectoryCard[]>([])
  const [teammates, setTeammates] = useState<VoteRow[]>([])
  const [leaders, setLeaders] = useState<VoteRow[]>([])
  const [signedIn, setSignedIn] = useState(false)
  const [runId, setRunId] = useState<string | undefined>()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const displayName = params.get('q') ?? ''
    const nextRun = params.get('run') ?? undefined
    if (displayName) {
      setDraft(displayName)
      setQuery(displayName)
    }
    setRunId(nextRun)
    void fetch('/api/auth/session', { credentials: 'include' })
      .then((response) => setSignedIn(response.ok))
      .catch(() => setSignedIn(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.all(
      (['raid', 'dungeon', 'new_bonds'] as const).map((category) =>
        fetch(`/api/destiny/leaderboards/public?category=${category}&period=season`)
          .then(async (response) => (response.ok ? response.json() : { entries: [] }))
          .catch(() => ({ entries: [] }))
      )
    ).then((payloads: { entries?: { bungieMembershipId?: string; bungieDisplayName?: string; mvpVotes?: number }[] }[]) => {
      if (cancelled) return
      const rows: VoteRow[] = []
      for (const payload of payloads) {
        for (const entry of payload.entries ?? []) {
          if (!entry.bungieMembershipId || !entry.bungieDisplayName) continue
          rows.push({
            membershipId: entry.bungieMembershipId,
            displayName: entry.bungieDisplayName,
            mvpVotes: entry.mvpVotes,
          })
        }
      }
      setLeaders(rows)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams({ suggest: '1' })
    if (query.trim()) params.set('q', query.trim())
    const timer = window.setTimeout(() => {
      void fetch(`/api/destiny/rate?${params.toString()}`, { credentials: 'include' })
        .then(async (response) => (response.ok ? response.json() : { guardians: [], teammates: [] }))
        .then((json: { guardians?: GuardianDirectoryCard[]; teammates?: VoteRow[] }) => {
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

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const leaderRows = needle
      ? leaders.filter((row) => row.displayName.toLowerCase().includes(needle))
      : leaders
    return mergeRows([
      teammates.map((row) => ({ ...row, runId })),
      guardians.map((card) => ({
        membershipId: card.membershipId,
        displayName: card.displayName,
        membershipType: card.membershipType,
        mvpVotes: card.mvpCount,
        runId,
      })),
      leaderRows.map((row) => ({ ...row, runId })),
    ])
  }, [guardians, leaders, query, runId, teammates])

  const search = (event: FormEvent) => {
    event.preventDefault()
    setQuery(draft.trim())
  }

  return (
    <section className="gh-stack" aria-labelledby="rate-title">
      <header className="gh-hero">
        <div>
          <p className="gh-kicker">One click</p>
          <h1 id="rate-title">Vote MVP</h1>
          <p className="gh-lede">
            Pick a Guardian from your fireteam, Kick Guardians, or the season boards. One button sends the MVP vote.
          </p>
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
      {rows.length ? (
        <ul className="gh-directory">
          {rows.map((row) => (
            <li key={row.membershipId} className="gh-row-with-rate">
              <span className="gh-person-name">{row.displayName}</span>
              <VoteMvpButton
                membershipId={row.membershipId}
                displayName={row.displayName}
                membershipType={row.membershipType}
                mvpVotes={row.mvpVotes}
                runId={row.runId}
                signedIn={signedIn}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="gh-muted">Guardians from your fireteam and the season boards show up here.</p>
      )}
    </section>
  )
}

export function QuickRateHost() {
  return null
}
