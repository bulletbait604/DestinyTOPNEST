'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { GuardianDirectoryCard } from '@/lib/destiny/guardianDirectory'
import { RATE_TAGS, RATE_TAG_LABELS, type QuickRateTarget, type RateTag } from '@/lib/destiny/quickRate'
import type { ActivityRunForVote } from '@/lib/destiny/types'
import { startBungieLogin } from '@/lib/bungie/startBungieLogin'

export const QUICK_RATE_EVENT = 'topnest:quick-rate'

type VoteCounts = { mvpVotes?: number; newLightVotes?: number; uselessVotes?: number }
type TagCounts = Partial<Record<RateTag, number>>

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

export function MvpCountBadge({ count }: { count?: number }) {
  if (!count || count <= 0) return null
  return <span className="gh-mvp-badge">{count} MVP</span>
}

export function RankLink({ membershipId, displayName, runId }: QuickRateTarget) {
  return (
    <a className="gh-text-btn" href={rateReturnPath({ membershipId, displayName, runId })}>
      Rank
    </a>
  )
}

/** Read-only MVP crowns plus a link into the guardian rank. Never mixes New Light or Useless in. */
export function RateButton({ membershipId, displayName, membershipType, runId, mvpVotes }: QuickRateTarget & VoteCounts) {
  const [count, setCount] = useState(mvpVotes)
  useEffect(() => {
    setCount(mvpVotes)
  }, [mvpVotes])
  useEffect(() => {
    if (!membershipId || mvpVotes != null) return
    let cancelled = false
    void loadVoteCounts(membershipId).then((value) => {
      if (!cancelled && typeof value?.mvpVotes === 'number') setCount(value.mvpVotes)
    })
    return () => {
      cancelled = true
    }
  }, [membershipId, mvpVotes])
  return (
    <span className="gh-vote">
      <MvpCountBadge count={count} />
      <RankLink membershipId={membershipId} displayName={displayName} membershipType={membershipType} runId={runId} />
    </span>
  )
}

export function GuardianRankPills({
  membershipId,
  displayName,
  runId,
  signedIn,
  onSubmitted,
}: QuickRateTarget & { signedIn?: boolean; onSubmitted?: () => void }) {
  const [counts, setCounts] = useState<TagCounts>({})
  const [mine, setMine] = useState<RateTag[]>([])
  const [saving, setSaving] = useState<RateTag | null>(null)
  const [error, setError] = useState<string | null>(null)
  const target = { membershipId, displayName, runId }

  useEffect(() => {
    if (!membershipId) return
    let cancelled = false
    void fetch(`/api/destiny/rate?membershipId=${encodeURIComponent(membershipId)}`, { credentials: 'include' })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((json: { counts?: TagCounts; mine?: { tags?: RateTag[] } } | null) => {
        if (cancelled || !json) return
        if (json.counts) setCounts(json.counts)
        if (json.mine?.tags) setMine(json.mine.tags)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [membershipId])

  const toggle = async (tag: RateTag) => {
    if (!membershipId) {
      if (typeof window !== 'undefined') window.location.assign(rateReturnPath(target))
      return
    }
    if (signedIn === false) {
      signInToVote(target)
      return
    }
    setSaving(tag)
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
        body: JSON.stringify({ membershipId, displayName, tags: [tag], toggle: true, runId }),
      })
      const json = (await response.json().catch(() => ({}))) as {
        error?: string
        tags?: RateTag[]
        counts?: TagCounts
      }
      if (!response.ok) throw new Error(json.error ?? 'Could not save that rank')
      if (json.tags) setMine(json.tags)
      if (json.counts) setCounts(json.counts)
      onSubmitted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that rank')
    } finally {
      setSaving(null)
    }
  }

  return (
    <span className="gh-vote">
      {RATE_TAGS.map((tag) => (
        <button
          key={tag}
          type="button"
          className="gh-vote-pill"
          aria-pressed={mine.includes(tag)}
          disabled={saving != null}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void toggle(tag)
          }}
        >
          {saving === tag ? 'Saving…' : pillLabel(RATE_TAG_LABELS[tag], counts[tag])}
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
      {signedIn ? null : <p className="gh-muted">Sign in with Bungie to rank this Guardian</p>}
      <GuardianRankPills {...target} signedIn={signedIn} onSubmitted={onSubmitted} />
    </div>
  )
}

type CrownRun = {
  id: string
  label: string
  teammates: { membershipId: string; displayName: string }[]
  selectedMembershipId?: string
}

export function RunCrownList({
  signedIn,
  runs = [],
  focusRunId,
}: {
  signedIn: boolean
  runs?: CrownRun[]
  focusRunId?: string
}) {
  const [rows, setRows] = useState<CrownRun[]>(runs)
  const [open, setOpen] = useState<string | null>(focusRunId ?? null)
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setRows((current) => (runs.length ? mergeCrownRuns(current, runs) : current))
  }, [runs])

  useEffect(() => {
    if (focusRunId) setOpen(focusRunId)
  }, [focusRunId])

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    void fetch('/api/destiny/runs', { credentials: 'include' })
      .then(async (response) => (response.ok ? response.json() : { activities: [] }))
      .then((json: { activities?: ActivityRunForVote[] }) => {
        if (cancelled) return
        const mapped = (json.activities ?? []).map((activity) => ({
          id: activity.runId,
          label: `${activity.activityName} · ${new Date(activity.completedAt).toLocaleDateString()}`,
          selectedMembershipId: activity.selectedMembershipId,
          teammates: activity.guardians
            .filter((guardian) => guardian.canVoteFor)
            .map((guardian) => ({ membershipId: guardian.membershipId, displayName: guardian.displayName })),
        }))
        if (!mapped.length) return
        setRows((current) => mergeCrownRuns(current, mapped))
        setPicked((current) => {
          const next = { ...current }
          for (const row of mapped) {
            if (row.selectedMembershipId) next[row.id] = row.selectedMembershipId
          }
          return next
        })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [signedIn])

  const pick = async (runId: string, teammate: { membershipId: string; displayName: string }) => {
    if (!signedIn) {
      signInToVote({ membershipId: teammate.membershipId, displayName: teammate.displayName, runId })
      return
    }
    const key = `${runId}:${teammate.membershipId}`
    setBusy(key)
    setMessage(null)
    try {
      const response = await fetch('/api/destiny/mvp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, membershipId: teammate.membershipId, category: 'mvp', action: 'set' }),
      })
      const json = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!response.ok) throw new Error(json.error ?? 'Could not save that MVP')
      setPicked((current) => ({ ...current, [runId]: teammate.membershipId }))
      setMessage(json.message ?? `${teammate.displayName} is your MVP for this run.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save that MVP')
    } finally {
      setBusy(null)
    }
  }

  if (!signedIn) {
    return <p className="gh-muted">Sign in with Bungie to pick one MVP on a run you played.</p>
  }
  if (!rows.length) {
    return <p className="gh-muted">Score a run, then crown one teammate as MVP.</p>
  }

  return (
    <div className="gh-stack">
      {message ? <p className="gh-confirm">{message}</p> : null}
      <ul className="gh-list">
        {rows.map((run) => {
          const expanded = open === run.id
          const chosen = picked[run.id]
          return (
            <li key={run.id}>
              <button type="button" className="gh-text-btn" onClick={() => setOpen(expanded ? null : run.id)}>
                {run.label}
                {chosen ? ' · MVP picked' : ''}
              </button>
              {expanded ? (
                <ul className="gh-list">
                  {run.teammates.length ? (
                    run.teammates.map((teammate) => {
                      const selected = chosen === teammate.membershipId
                      const label = selected ? 'MVP ✓' : chosen ? 'Change MVP' : 'Pick MVP'
                      return (
                        <li key={`${run.id}-${teammate.membershipId}`} className="gh-row-with-rate">
                          <span>{teammate.displayName}</span>
                          <button
                            type="button"
                            className="gh-btn gh-btn-ghost"
                            disabled={selected || busy != null}
                            onClick={() => void pick(run.id, teammate)}
                          >
                            {busy === `${run.id}:${teammate.membershipId}` ? 'Saving…' : label}
                          </button>
                        </li>
                      )
                    })
                  ) : (
                    <li className="gh-muted">No other guardians on this clear.</li>
                  )}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function mergeCrownRuns(base: CrownRun[], extra: CrownRun[]): CrownRun[] {
  const map = new Map<string, CrownRun>()
  for (const row of base) map.set(row.id, row)
  for (const row of extra) {
    const prev = map.get(row.id)
    map.set(
      row.id,
      prev
        ? {
            ...prev,
            ...row,
            teammates: row.teammates.length ? row.teammates : prev.teammates,
            label: row.label || prev.label,
          }
        : row
    )
  }
  return Array.from(map.values())
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
          <p className="gh-kicker">Two different things</p>
          <h1 id="rate-title">Rank</h1>
          <p className="gh-lede">Crown one MVP on a run you played. Rank a Guardian with a separate set of tags.</p>
        </div>
      </header>
      <section className="gh-card" aria-labelledby="crown-mvp">
        <h2 id="crown-mvp">Crown Run MVP (1 per run)</h2>
        <p className="gh-muted">One teammate gets the crown. Picking someone else replaces your MVP for that run.</p>
        <RunCrownList signedIn={signedIn} focusRunId={runId} />
      </section>
      <section className="gh-card" aria-labelledby="rank-guardian">
        <h2 id="rank-guardian">Rank a Guardian</h2>
        <p className="gh-muted">
          Sherpa / Teacher · Clutch · Helpful · Chill · Great Comms · New Light · Useless
        </p>
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
                <MvpCountBadge count={row.mvpVotes} />
                <GuardianRankPills
                  membershipId={row.membershipId}
                  displayName={row.displayName}
                  membershipType={row.membershipType}
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
    </section>
  )
}

export function QuickRateHost() {
  return null
}
