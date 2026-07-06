'use client'

import { useCallback, useEffect, useState } from 'react'
import { Ban, Loader2, Search, UserCheck } from 'lucide-react'
import type { AdminUserDetail, AdminUserSummary } from '@/lib/destiny/types'
import { GlassCard, LoadingBlock, SectionTitle, StatusPill } from '@/app/components/destiny/DestinyUi'
import { formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

type BannedRow = {
  username: string
  bannedAt: string
  bannedBy?: string
  reason?: string
}

export default function AdminUsersSection({
  darkMode,
  onAction,
}: {
  darkMode: boolean
  onAction?: () => void
}) {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [banned, setBanned] = useState<BannedRow[]>([])
  const [selected, setSelected] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [acting, setActing] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [staffNote, setStaffNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const t = getDestinyTheme(darkMode)

  const loadList = useCallback(async (q = '') => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/destiny/admin/users?${params}`, { credentials: 'include' })
      if (!res.ok) {
        setError(res.status === 403 ? 'Admin access required.' : 'Failed to load users.')
        return
      }
      const json = await res.json()
      setUsers(json.users ?? [])
      setBanned(json.banned ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (userId: string) => {
    setDetailLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/destiny/admin/users?userId=${encodeURIComponent(userId)}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        setError('Could not load user detail.')
        return
      }
      const json = await res.json()
      setSelected(json.user ?? null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  async function postAction(action: 'ban' | 'unban' | 'note', username: string) {
    setActing(true)
    setError(null)
    try {
      const res = await fetch('/api/destiny/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          username,
          reason: action === 'ban' ? banReason : undefined,
          note: action === 'note' ? staffNote : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Action failed.')
        return
      }
      if (action === 'note') setStaffNote('')
      if (action === 'ban') setBanReason('')
      await loadList(query)
      if (selected?.userId === username.toLowerCase()) {
        await loadDetail(username)
      }
      onAction?.()
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="space-y-4">
      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-blue-400" />
          <SectionTitle
            title="User moderation"
            subtitle="Search guardians, review activity, ban or unban accounts"
            darkMode={darkMode}
          />
        </div>

        <form
          className="flex flex-wrap gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault()
            void loadList(query)
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, user id, or membership id…"
            className="flex-1 min-w-[200px] rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm bg-blue-500/20 text-blue-100 border border-blue-500/30"
          >
            Search
          </button>
        </form>

        {error ? <p className="text-red-400 text-sm mb-3">{error}</p> : null}

        {loading ? (
          <LoadingBlock darkMode={darkMode} label="Loading users…" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="space-y-2 max-h-72 overflow-y-auto">
              <p className={cn('text-xs font-medium', t.caption)}>Guardians</p>
              {!users.length ? (
                <p className={cn('text-sm', t.muted)}>No users found.</p>
              ) : (
                users.map((user) => (
                  <button
                    key={user.userId}
                    type="button"
                    onClick={() => void loadDetail(user.userId)}
                    className={cn(
                      'w-full text-left rounded-lg px-3 py-2 border transition-colors',
                      selected?.userId === user.userId
                        ? 'bg-blue-500/15 border-blue-500/30'
                        : 'bg-black/25 border-white/[0.06] hover:border-white/15'
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{user.bungieDisplayName}</span>
                      {user.isBanned ? <StatusPill label="Banned" tone="red" /> : null}
                      {user.flaggedRunCount > 0 ? (
                        <StatusPill label={`${user.flaggedRunCount} flagged`} tone="gold" />
                      ) : null}
                    </div>
                    <p className={cn('text-[10px] mt-0.5', t.muted)}>
                      {user.userId} · {user.verifiedRunCount} verified
                      {user.siteRole ? ` · ${user.siteRole}` : ''}
                    </p>
                  </button>
                ))
              )}
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              <p className={cn('text-xs font-medium', t.caption)}>Banned accounts</p>
              {!banned.length ? (
                <p className={cn('text-sm', t.muted)}>No banned users.</p>
              ) : (
                banned.map((row) => (
                  <div
                    key={row.username}
                    className="rounded-lg px-3 py-2 bg-red-500/10 border border-red-500/20 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{row.username}</p>
                      {row.reason ? <p className={cn('text-xs', t.muted)}>{row.reason}</p> : null}
                    </div>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => void postAction('unban', row.username)}
                      className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                    >
                      Unban
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </GlassCard>

      {detailLoading ? (
        <LoadingBlock darkMode={darkMode} label="Loading profile…" />
      ) : selected ? (
        <GlassCard darkMode={darkMode}>
          <SectionTitle title={selected.bungieDisplayName} subtitle="Manual user review" darkMode={darkMode} />
          <div className="flex flex-wrap gap-2 mb-3">
            {selected.isBanned ? <StatusPill label="Banned" tone="red" /> : <StatusPill label="Active" tone="green" />}
            <StatusPill label={`${selected.verifiedRunCount} verified`} tone="neutral" />
            <StatusPill label={`${selected.mvpVotesReceived} MVP votes`} tone="purple" />
          </div>
          <p className={cn('text-xs mb-4', t.muted)}>
            ID {selected.userId}
            {selected.bungieMembershipId ? ` · Bungie ${selected.bungieMembershipId}` : ''}
            {selected.siteRole ? ` · role ${selected.siteRole}` : ''}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className={cn('text-xs font-medium mb-2', t.caption)}>Recent runs</p>
              {!selected.recentRuns.length ? (
                <p className={cn('text-xs', t.muted)}>No synced runs.</p>
              ) : (
                selected.recentRuns.slice(0, 6).map((run) => (
                  <div key={run.id} className="text-xs py-1 border-b border-white/5">
                    <span className={t.body}>{run.activityName}</span>
                    <span className={cn('ml-2', t.muted)}>
                      {run.verificationStatus} · {formatDuration(run.durationSeconds)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div>
              <p className={cn('text-xs font-medium mb-2', t.caption)}>Peer reviews</p>
              <p className={cn('text-xs', t.muted)}>
                Reputation: {selected.reputationReviews.length} · Trust: {selected.trustReviews.length}
              </p>
              {selected.reputationReviews.slice(0, 3).map((r) => (
                <p key={r.id} className={cn('text-[10px] mt-1', t.muted)}>
                  Rep from {r.reviewerId} · would play again: {r.wouldPlayAgain ? 'yes' : 'no'}
                </p>
              ))}
            </div>
          </div>

          {selected.adminNotes.length > 0 ? (
            <div className="mb-4">
              <p className={cn('text-xs font-medium mb-2', t.caption)}>Staff notes</p>
              {selected.adminNotes.map((n) => (
                <p key={n.id} className={cn('text-xs py-1 border-b border-white/5', t.muted)}>
                  {n.detail} — {n.actorLabel ?? n.actorId}
                </p>
              ))}
            </div>
          ) : null}

          <div className="space-y-3 border-t border-white/10 pt-4">
            {!selected.isBanned ? (
              <div className="flex flex-wrap gap-2 items-end">
                <input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Ban reason (optional)"
                  className="flex-1 min-w-[180px] rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void postAction('ban', selected.userId)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs bg-red-500/20 text-red-200 border border-red-500/40"
                >
                  {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                  Ban user
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={acting}
                onClick={() => void postAction('unban', selected.userId)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
              >
                <UserCheck className="w-3 h-3" /> Unban user
              </button>
            )}

            <div className="flex flex-wrap gap-2 items-end">
              <textarea
                value={staffNote}
                onChange={(e) => setStaffNote(e.target.value)}
                placeholder="Add internal staff note…"
                rows={2}
                className="flex-1 min-w-[180px] rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
              />
              <button
                type="button"
                disabled={acting || !staffNote.trim()}
                onClick={() => void postAction('note', selected.userId)}
                className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 text-gray-200"
              >
                Save note
              </button>
            </div>
          </div>
        </GlassCard>
      ) : null}
    </div>
  )
}
