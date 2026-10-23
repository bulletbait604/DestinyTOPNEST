'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { GuardianDirectoryCard } from '@/lib/destiny/guardianDirectory'
import type { QuickRateTarget } from '@/lib/destiny/quickRate'
import type { GuardianVoteType } from '@/lib/destiny/types'
import { startBungieLogin } from '@/lib/bungie/startBungieLogin'

export const QUICK_RATE_EVENT = 'topnest:quick-rate'

const VOTE_OPTIONS: { voteType: GuardianVoteType; label: string }[] = [
  { voteType: 'mvp', label: 'MVP' },
  { voteType: 'new_light', label: 'New Light' },
  { voteType: 'useless', label: 'Useless' },
]

type VoteCounts = { mvpVotes?: number; newLightVotes?: number; uselessVotes?: number }

const voteCountCache = new Map<string, Promise<VoteCounts | null>>()

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

function loadVoteCounts(membershipId: string): Promise<VoteCounts | null> {
  const cached = voteCountCache.get(membershipId)
  if (cached) return cached
  const pending = fetch(`/api/destiny/rate?membershipId=${encodeURIComponent(membershipId)}`, { credentials: 'include' })
    .then(async (response) => (response.ok ? response.json() : null))
    .then((json: VoteCounts | null) =>
      json
        ? {
            mvpVotes: json.mvpVotes,
            newLightVotes: json.newLightVotes,
            uselessVotes: json.uselessVotes,
          }
        : null
    )
    .catch(() => null)
  voteCountCache.set(membershipId, pending)
  return pending
}

function pillLabel(label: string, count: number | undefined): string {
  if (!count) return label
  return `${label} · ${count}`
}

export function VoteMvpButton({
  membershipId,
  displayName,
  membershipType,
  runId,
  mvpVotes,
  newLightVotes,
  uselessVotes,
  signedIn,
  onSubmitted,
}: QuickRateTarget & VoteCounts & { signedIn?: boolean; onSubmitted?: () => void }) {
  const [counts, setCounts] = useState<VoteCounts>({ mvpVotes, newLightVotes, uselessVotes })
  const [pressed, setPressed] = useState<GuardianVoteType | null>(null)
  const [saving, setSaving] = useState<GuardianVoteType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const target = { membershipId, displayName, membershipType, runId }

  useEffect(() => {
    setCounts((current) => ({
      mvpVotes: mvpVotes ?? current.mvpVotes,
      newLightVotes: newLightVotes ?? current.newLightVotes,
      uselessVotes: uselessVotes ?? current.uselessVotes,
    }))
  }, [mvpVotes, newLightVotes, uselessVotes])

  useEffect(() => {
    if (!membershipId) return
    if (mvpVotes != null && newLightVotes != null && uselessVotes != null) return
    let cancelled = false
    void loadVoteCounts(membershipId).then((value) => {
      if (!cancelled && value) setCounts((current) => ({ ...current, ...value }))
    })
    return () => {
      cancelled = true
    }
  }, [membershipId, mvpVotes, newLightVotes, uselessVotes])

  const countFor = (voteType: GuardianVoteType) => {
    if (voteType === 'new_light') return counts.newLightVotes
    if (voteType === 'useless') return counts.uselessVotes
    return counts.mvpVotes
  }

  const vote = async (voteType: GuardianVoteType) => {
    if (!membershipId) {
      if (typeof window !== 'undefined') window.location.assign(rateReturnPath(target))
      return
    }
    if (signedIn === false) {
      signInToVote(target)
      return
    }
    setSaving(voteType)
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
        body: JSON.stringify({
          membershipId,
          displayName,
          voteType,
          tags: voteType === 'mvp' ? ['mvp'] : [],
          runId,
        }),
      })
      const json = (await response.json().catch(() => ({}))) as VoteCounts & { error?: string; already?: boolean }
      if (!response.ok) throw new Error(json.error ?? 'Could not save that vote')
      setPressed(voteType)
      voteCountCache.delete(membershipId)
      if (typeof json.mvpVotes === 'number') {
        setCounts({ mvpVotes: json.mvpVotes, newLightVotes: json.newLightVotes, uselessVotes: json.uselessVotes })
      } else if (!json.already) {
        setCounts((current) => {
          const next = { ...current }
          if (voteType === 'new_light') next.newLightVotes = (current.newLightVotes ?? 0) + 1
          else if (voteType === 'useless') next.uselessVotes = (current.uselessVotes ?? 0) + 1
          else next.mvpVotes = (current.mvpVotes ?? 0) + 1
          return next
        })
      }
      onSubmitted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that vote')
    } finally {
      setSaving(null)
    }
  }

  return (
    <span className="gh-vote">
      {VOTE_OPTIONS.map((option) => (
        <button
          key={option.voteType}
          type="button"
          className="gh-vote-pill"
          aria-pressed={pressed === option.voteType}
          disabled={saving != null}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void vote(option.voteType)
          }}
        >
          {saving === option.voteType ? 'Sending…' : pillLabel(option.label, countFor(option.voteType))}
        </button>
      ))}
      {error ? (
        <span className="gh-alert" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  )
}

export function RateButton(props: QuickRateTarget & VoteCounts) {
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
  newLightVotes?: number
  uselessVotes?: number
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
    ).then((payloads: { entries?: { bungieMembershipId?: string; bungieDisplayName?: string; mvpVotes?: number; newLightVotes?: number; uselessVotes?: number }[] }[]) => {
      if (cancelled) return
      const rows: VoteRow[] = []
      for (const payload of payloads) {
        for (const entry of payload.entries ?? []) {
          if (!entry.bungieMembershipId || !entry.bungieDisplayName) continue
          rows.push({
            membershipId: entry.bungieMembershipId,
            displayName: entry.bungieDisplayName,
            mvpVotes: entry.mvpVotes,
            newLightVotes: entry.newLightVotes,
            uselessVotes: entry.uselessVotes,
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
        mvpVotes: card.mvpVotes ?? card.mvpCount,
        newLightVotes: card.newLightVotes,
        uselessVotes: card.uselessVotes,
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
            Pick a Guardian from your fireteam, Kick Guardians, or the season boards. Choose MVP, New Light, or Useless.
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
                newLightVotes={row.newLightVotes}
                uselessVotes={row.uselessVotes}
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
