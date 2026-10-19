'use client'

import { useCallback, useEffect, useState } from 'react'
import { Calendar, Loader2, Radio, Target } from 'lucide-react'
import { GlassCard, LoadingBlock, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import type { NightOpsEvent, WeeklyContractDefinition, WeeklyContractRule } from '@/lib/destiny/types'
import { cn } from '@/lib/utils'

const fieldClass =
  'w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500'
const saveClass =
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-400/20 text-amber-100 ring-1 ring-amber-400/30 disabled:opacity-60'

type GoalKind = WeeklyContractRule['kind']

interface GoalDraft {
  key: string
  id: string
  title: string
  description: string
  tierPoints: string
  kind: GoalKind
  minNewGuardians: string
}

interface EventDraft {
  key: string
  id: string
  title: string
  hostName: string
  startsAt: string
  endsAt: string
  activityName: string
  twitchUrl: string
  kickUrl: string
  notes: string
}

function utcInput(iso: string): string {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return ''
  return new Date(time).toISOString().slice(0, 16)
}

function fromInput(value: string): string {
  if (!value) return ''
  const time = Date.parse(`${value}Z`)
  return Number.isFinite(time) ? new Date(time).toISOString() : ''
}

function goalDraft(contract?: WeeklyContractDefinition): GoalDraft {
  const kind = contract?.rule.kind ?? 'help_first_timer'
  return {
    key: contract?.id ?? `new-${Math.random().toString(36).slice(2, 8)}`,
    id: contract?.id ?? '',
    title: contract?.title ?? '',
    description: contract?.description ?? '',
    tierPoints: String(contract?.tierPoints ?? 15),
    kind,
    minNewGuardians: contract?.rule.kind === 'featured_dungeon_new_guardians' ? String(contract.rule.minNewGuardians) : '2',
  }
}

function eventDraft(event?: NightOpsEvent): EventDraft {
  return {
    key: event?.id ?? `new-${Math.random().toString(36).slice(2, 8)}`,
    id: event?.id ?? '',
    title: event?.title ?? '',
    hostName: event?.hostName ?? '',
    startsAt: event ? utcInput(event.startsAt) : '',
    endsAt: event ? utcInput(event.endsAt) : '',
    activityName: event?.activityName ?? '',
    twitchUrl: event?.twitchUrl ?? '',
    kickUrl: event?.kickUrl ?? '',
    notes: event?.notes ?? '',
  }
}

async function postContent(body: unknown): Promise<{ error?: string }> {
  const res = await fetch('/api/destiny/admin/site-content', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) return { error: json.error || 'Could not save. Try again in a moment.' }
  return {}
}

export default function AdminContentSection({
  darkMode,
  onAction,
}: {
  darkMode: boolean
  onAction?: () => void
}) {
  const t = getDestinyTheme(darkMode)
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<GoalDraft[]>([])
  const [events, setEvents] = useState<EventDraft[]>([])
  const [bungieReady, setBungieReady] = useState(true)
  const [redirectUri, setRedirectUri] = useState('')
  const [goalMessage, setGoalMessage] = useState<string | null>(null)
  const [eventMessage, setEventMessage] = useState<string | null>(null)
  const [goalError, setGoalError] = useState<string | null>(null)
  const [eventError, setEventError] = useState<string | null>(null)
  const [savingGoals, setSavingGoals] = useState(false)
  const [savingEvents, setSavingEvents] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/destiny/admin/site-content', { credentials: 'include' })
      if (!res.ok) return
      const json = (await res.json()) as {
        contracts?: WeeklyContractDefinition[]
        events?: NightOpsEvent[]
        bungieReady?: boolean
        redirectUri?: string
      }
      setGoals((json.contracts ?? []).map(goalDraft))
      setEvents((json.events ?? []).map(eventDraft))
      setBungieReady(json.bungieReady !== false)
      setRedirectUri(json.redirectUri ?? '')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function saveGoals() {
    setSavingGoals(true)
    setGoalError(null)
    setGoalMessage(null)
    const result = await postContent({
      action: 'save_goals',
      contracts: goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        tierPoints: Number(goal.tierPoints),
        rule:
          goal.kind === 'featured_dungeon_new_guardians'
            ? { kind: goal.kind, minNewGuardians: Number(goal.minNewGuardians) }
            : { kind: goal.kind },
      })),
    })
    setSavingGoals(false)
    if (result.error) setGoalError(result.error)
    else {
      setGoalMessage('Weekly goals saved.')
      onAction?.()
      await load()
    }
  }

  async function restoreGoals() {
    setSavingGoals(true)
    setGoalError(null)
    setGoalMessage(null)
    const result = await postContent({ action: 'reset_goals' })
    setSavingGoals(false)
    if (result.error) setGoalError(result.error)
    else {
      setGoalMessage('Built-in weekly goals restored.')
      onAction?.()
      await load()
    }
  }

  async function saveEventList() {
    setSavingEvents(true)
    setEventError(null)
    setEventMessage(null)
    const result = await postContent({
      action: 'save_events',
      events: events.map((event) => ({
        id: event.id,
        title: event.title,
        hostName: event.hostName,
        startsAt: fromInput(event.startsAt),
        endsAt: fromInput(event.endsAt),
        activityName: event.activityName,
        twitchUrl: event.twitchUrl,
        kickUrl: event.kickUrl,
        notes: event.notes,
      })),
    })
    setSavingEvents(false)
    if (result.error) setEventError(result.error)
    else {
      setEventMessage(events.length ? 'Events saved.' : 'Event schedule cleared.')
      onAction?.()
      await load()
    }
  }

  if (loading) return <LoadingBlock darkMode={darkMode} label="Loading site content…" />

  return (
    <div className="space-y-4">
      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-amber-300" />
          <SectionTitle
            title="Weekly goals"
            subtitle="These are the three goals players see. Tier points change titles and frames, not the boards."
            darkMode={darkMode}
          />
        </div>
        <div className="space-y-3">
          {goals.map((goal, index) => (
            <div key={goal.key} className="rounded-xl p-3 bg-black/25 border border-white/10 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className={fieldClass}
                  value={goal.title}
                  aria-label={`Goal ${index + 1} title`}
                  placeholder="Title"
                  onChange={(event) =>
                    setGoals((rows) => rows.map((row) => (row.key === goal.key ? { ...row, title: event.target.value } : row)))
                  }
                />
                <input
                  className={fieldClass}
                  value={goal.tierPoints}
                  aria-label={`Goal ${index + 1} tier points`}
                  inputMode="numeric"
                  placeholder="Tier points"
                  onChange={(event) =>
                    setGoals((rows) =>
                      rows.map((row) => (row.key === goal.key ? { ...row, tierPoints: event.target.value } : row))
                    )
                  }
                />
              </div>
              <textarea
                className={fieldClass}
                rows={2}
                value={goal.description}
                aria-label={`Goal ${index + 1} description`}
                placeholder="What the player needs to do"
                onChange={(event) =>
                  setGoals((rows) =>
                    rows.map((row) => (row.key === goal.key ? { ...row, description: event.target.value } : row))
                  )
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  className={fieldClass}
                  value={goal.kind}
                  aria-label={`Goal ${index + 1} type`}
                  onChange={(event) =>
                    setGoals((rows) =>
                      rows.map((row) => (row.key === goal.key ? { ...row, kind: event.target.value as GoalKind } : row))
                    )
                  }
                >
                  <option value="featured_dungeon_new_guardians">Featured dungeon with new Guardians</option>
                  <option value="raid_mixed_clan">Raid with a clanmate and an outsider</option>
                  <option value="help_first_timer">Guide a first clear</option>
                </select>
                {goal.kind === 'featured_dungeon_new_guardians' ? (
                  <input
                    className={fieldClass}
                    value={goal.minNewGuardians}
                    aria-label={`Goal ${index + 1} new Guardians`}
                    inputMode="numeric"
                    placeholder="New Guardians"
                    onChange={(event) =>
                      setGoals((rows) =>
                        rows.map((row) => (row.key === goal.key ? { ...row, minNewGuardians: event.target.value } : row))
                      )
                    }
                  />
                ) : null}
              </div>
              <button
                type="button"
                className={cn('text-xs', t.muted)}
                onClick={() => setGoals((rows) => rows.filter((row) => row.key !== goal.key))}
              >
                Remove this goal
              </button>
            </div>
          ))}
        </div>
        {goalError ? <p className="text-sm text-red-300 mt-3">{goalError}</p> : null}
        {goalMessage ? <p className="text-sm text-emerald-300 mt-3">{goalMessage}</p> : null}
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="button" className={saveClass} onClick={() => setGoals((rows) => [...rows, goalDraft()])}>
            Add a goal
          </button>
          <button type="button" className={saveClass} disabled={savingGoals} onClick={() => void saveGoals()}>
            {savingGoals ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save weekly goals
          </button>
          <button type="button" className={cn(saveClass, 'bg-white/10 text-white ring-white/15')} disabled={savingGoals} onClick={() => void restoreGoals()}>
            Restore built-in goals
          </button>
        </div>
      </GlassCard>

      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-2">
          <Radio className="w-5 h-5 text-fuchsia-300" />
          <SectionTitle
            title="Events"
            subtitle="Community sessions. A player earns the badge when a verified clear falls inside the window. Times are UTC."
            darkMode={darkMode}
          />
        </div>
        {events.length === 0 ? <p className={cn('text-sm mb-3', t.muted)}>No events yet. Add one to show it on Events.</p> : null}
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={event.key} className="rounded-xl p-3 bg-black/25 border border-white/10 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className={fieldClass}
                  value={event.title}
                  aria-label={`Event ${index + 1} title`}
                  placeholder="Title"
                  onChange={(change) =>
                    setEvents((rows) => rows.map((row) => (row.key === event.key ? { ...row, title: change.target.value } : row)))
                  }
                />
                <input
                  className={fieldClass}
                  value={event.hostName}
                  aria-label={`Event ${index + 1} host`}
                  placeholder="Host"
                  onChange={(change) =>
                    setEvents((rows) => rows.map((row) => (row.key === event.key ? { ...row, hostName: change.target.value } : row)))
                  }
                />
                <input
                  className={fieldClass}
                  type="datetime-local"
                  value={event.startsAt}
                  aria-label={`Event ${index + 1} start`}
                  onChange={(change) =>
                    setEvents((rows) => rows.map((row) => (row.key === event.key ? { ...row, startsAt: change.target.value } : row)))
                  }
                />
                <input
                  className={fieldClass}
                  type="datetime-local"
                  value={event.endsAt}
                  aria-label={`Event ${index + 1} end`}
                  onChange={(change) =>
                    setEvents((rows) => rows.map((row) => (row.key === event.key ? { ...row, endsAt: change.target.value } : row)))
                  }
                />
                <input
                  className={fieldClass}
                  value={event.activityName}
                  aria-label={`Event ${index + 1} activity`}
                  placeholder="Activity, optional"
                  onChange={(change) =>
                    setEvents((rows) =>
                      rows.map((row) => (row.key === event.key ? { ...row, activityName: change.target.value } : row))
                    )
                  }
                />
                <input
                  className={fieldClass}
                  value={event.twitchUrl}
                  aria-label={`Event ${index + 1} Twitch`}
                  placeholder="https:// Twitch link"
                  onChange={(change) =>
                    setEvents((rows) => rows.map((row) => (row.key === event.key ? { ...row, twitchUrl: change.target.value } : row)))
                  }
                />
                <input
                  className={fieldClass}
                  value={event.kickUrl}
                  aria-label={`Event ${index + 1} Kick`}
                  placeholder="https:// Kick link"
                  onChange={(change) =>
                    setEvents((rows) => rows.map((row) => (row.key === event.key ? { ...row, kickUrl: change.target.value } : row)))
                  }
                />
              </div>
              <textarea
                className={fieldClass}
                rows={2}
                value={event.notes}
                aria-label={`Event ${index + 1} notes`}
                placeholder="Notes, optional"
                onChange={(change) =>
                  setEvents((rows) => rows.map((row) => (row.key === event.key ? { ...row, notes: change.target.value } : row)))
                }
              />
              <button
                type="button"
                className={cn('text-xs', t.muted)}
                onClick={() => setEvents((rows) => rows.filter((row) => row.key !== event.key))}
              >
                Remove this event
              </button>
            </div>
          ))}
        </div>
        {eventError ? <p className="text-sm text-red-300 mt-3">{eventError}</p> : null}
        {eventMessage ? <p className="text-sm text-emerald-300 mt-3">{eventMessage}</p> : null}
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="button" className={saveClass} onClick={() => setEvents((rows) => [...rows, eventDraft()])}>
            Add an event
          </button>
          <button type="button" className={saveClass} disabled={savingEvents} onClick={() => void saveEventList()}>
            {savingEvents ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save events
          </button>
        </div>
      </GlassCard>

      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-sky-300" />
          <SectionTitle
            title="Teachers and clans"
            subtitle="These lists fill in from verified clears. A teacher is someone who guided a first clear. A clan scores when clanmates finish together."
            darkMode={darkMode}
          />
        </div>
        <p className={cn('text-sm', t.muted)}>There is no separate list to type in. New clears show up on Teachers and Clans on their own.</p>
      </GlassCard>

      <GlassCard darkMode={darkMode}>
        <SectionTitle
          title="Bungie sign-in"
          subtitle={
            bungieReady
              ? 'Sign-in is connected. If Bungie rejects a login, this address has to match the one saved on the Bungie application.'
              : 'Sign-in is not ready yet. The site host still has to connect the Bungie application before anyone can sign in.'
          }
          darkMode={darkMode}
        />
        {redirectUri ? (
          <p className={cn('text-xs mt-3 break-all', t.body)}>{redirectUri}</p>
        ) : null}
      </GlassCard>
    </div>
  )
}
