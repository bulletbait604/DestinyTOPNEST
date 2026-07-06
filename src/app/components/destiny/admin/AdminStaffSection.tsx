'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Shield, UserMinus, UserPlus } from 'lucide-react'
import type { AdminStaffMember } from '@/lib/destiny/types'
import { PRIMARY_OWNER_BUNGIE_NAME } from '@/lib/home/roles'
import { GlassCard, LoadingBlock, SectionTitle, StatusPill } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

export default function AdminStaffSection({
  darkMode,
  onAction,
}: {
  darkMode: boolean
  onAction?: () => void
}) {
  const [staff, setStaff] = useState<AdminStaffMember[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = getDestinyTheme(darkMode)

  const loadStaff = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/destiny/admin/staff', { credentials: 'include' })
      if (!res.ok) {
        setError(res.status === 403 ? 'Admin access required.' : 'Failed to load staff.')
        return
      }
      const json = await res.json()
      setStaff(json.staff ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStaff()
  }, [loadStaff])

  async function postAction(action: 'grant_admin' | 'revoke_admin', username: string) {
    setActing(true)
    setError(null)
    try {
      const res = await fetch('/api/destiny/admin/staff', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, username }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Action failed.')
        return
      }
      if (action === 'grant_admin') setQuery('')
      await loadStaff()
      onAction?.()
    } finally {
      setActing(false)
    }
  }

  const delegatedAdmins = staff.filter((member) => !member.isPrimaryOwner)

  return (
    <div className="space-y-4">
      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-amber-400" />
          <SectionTitle
            title="Admin access"
            subtitle={`Primary owner: ${PRIMARY_OWNER_BUNGIE_NAME}. Grant or revoke admin for other guardians.`}
            darkMode={darkMode}
          />
        </div>

        {error ? <p className="text-red-400 text-sm mb-3">{error}</p> : null}

        {loading ? (
          <LoadingBlock darkMode={darkMode} label="Loading staff…" />
        ) : (
          <div className="space-y-3">
            <p className={cn('text-xs font-medium', t.caption)}>Current admins</p>
            {!staff.length ? (
              <p className={cn('text-sm', t.muted)}>No staff records yet.</p>
            ) : (
              staff.map((member) => (
                <div
                  key={member.userId}
                  className="rounded-lg px-3 py-2.5 bg-black/25 border border-white/[0.06] flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{member.bungieDisplayName}</span>
                      <StatusPill
                        label={member.isPrimaryOwner ? 'Primary owner' : 'Delegated admin'}
                        tone={member.isPrimaryOwner ? 'gold' : 'purple'}
                      />
                    </div>
                    <p className={cn('text-[10px] mt-0.5', t.muted)}>{member.userId}</p>
                  </div>
                  {!member.isPrimaryOwner ? (
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => void postAction('revoke_admin', member.userId)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-red-500/15 text-red-200 border border-red-500/30"
                    >
                      {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />}
                      Remove admin
                    </button>
                  ) : (
                    <span className={cn('text-[10px]', t.muted)}>Cannot be removed</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </GlassCard>

      <GlassCard darkMode={darkMode}>
        <SectionTitle
          title="Add admin"
          subtitle="Search by Bungie name or user id — they must have signed in at least once"
          darkMode={darkMode}
        />
        <form
          className="flex flex-wrap gap-2 mt-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!query.trim()) return
            void postAction('grant_admin', query.trim())
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Guardian name or membership id…"
            className="flex-1 min-w-[200px] rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={acting || !query.trim()}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 disabled:opacity-50"
          >
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Grant admin
          </button>
        </form>

        {delegatedAdmins.length === 0 && !loading ? (
          <p className={cn('text-xs mt-3', t.muted)}>
            Only {PRIMARY_OWNER_BUNGIE_NAME} has admin access until you grant it to someone else.
          </p>
        ) : null}
      </GlassCard>
    </div>
  )
}
