'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import {
  flierTeamActivitiesForKind,
  type FlierTeamActivityKind,
} from '@/lib/destiny/flierTeamActivities'
import {
  FLIER_TEAM_REQUIREMENT_CATEGORIES,
  type FlierTeamRequirementSelection,
} from '@/lib/destiny/flierTeamRequirements'
import { GlassCard, StatusPill } from '@/app/components/destiny/DestinyUi'
import {
  destinyPrimaryBtn,
  destinySecondaryBtn,
  getDestinyTheme,
} from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const STEPS = ['Activity', 'Encounter', 'Requirements', 'Room settings'] as const

interface Props {
  darkMode: boolean
  onClose: () => void
  onCreated: () => void
}

export default function FlierTeamCreateWizard({ darkMode, onClose, onCreated }: Props) {
  const t = getDestinyTheme(darkMode)
  const [step, setStep] = useState(0)
  const [kind, setKind] = useState<FlierTeamActivityKind>('raid')
  const [activityId, setActivityId] = useState('')
  const [encounterId, setEncounterId] = useState('')
  const [selections, setSelections] = useState<FlierTeamRequirementSelection[]>([])
  const [customRequirements, setCustomRequirements] = useState('')
  const [roomNotes, setRoomNotes] = useState('')
  const [joinMode, setJoinMode] = useState<'instant' | 'apply'>('instant')
  const [micRequired, setMicRequired] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activities = useMemo(() => flierTeamActivitiesForKind(kind), [kind])
  const selectedActivity = activities.find((a) => a.id === activityId)
  const encounters = selectedActivity?.encounters ?? []

  const toggleOption = (categoryId: string, optionId: string, multi: boolean) => {
    setSelections((prev) => {
      const existing = prev.find((s) => s.categoryId === categoryId)
      if (!existing) {
        return [...prev, { categoryId, optionIds: [optionId] }]
      }
      let nextIds: string[]
      if (multi) {
        nextIds = existing.optionIds.includes(optionId)
          ? existing.optionIds.filter((id) => id !== optionId)
          : [...existing.optionIds, optionId]
      } else {
        nextIds = existing.optionIds.includes(optionId) ? [] : [optionId]
      }
      if (!nextIds.length) {
        return prev.filter((s) => s.categoryId !== categoryId)
      }
      return prev.map((s) =>
        s.categoryId === categoryId ? { ...s, optionIds: nextIds } : s
      )
    })
  }

  const isSelected = (categoryId: string, optionId: string) =>
    selections.find((s) => s.categoryId === categoryId)?.optionIds.includes(optionId) ?? false

  const canNext =
    step === 0
      ? Boolean(activityId)
      : step === 1
        ? Boolean(encounterId)
        : true

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/destiny/fireteam', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityKind: kind,
          activityId,
          encounterId,
          joinMode,
          requirementSelections: selections,
          customRequirements: customRequirements.trim() || undefined,
          roomNotes: roomNotes.trim() || undefined,
          micRequired,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not create room')
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <GlassCard darkMode={darkMode} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Create FlierTeam room</h2>
            <p className={cn('text-sm mt-0.5', t.muted)}>
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 mb-6">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={cn(
                'h-1 flex-1 rounded-full',
                i <= step ? 'bg-amber-500/80' : 'bg-white/10'
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['raid', 'dungeon', 'pantheon'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setKind(k)
                    setActivityId('')
                    setEncounterId('')
                  }}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors',
                    kind === k ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50' : 'bg-white/5 text-white/70 border border-white/10'
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {activities.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setActivityId(a.id)
                    setEncounterId('')
                  }}
                  className={cn(
                    'text-left px-3 py-2 rounded-xl border text-sm transition-colors',
                    activityId === a.id
                      ? 'border-amber-500/50 bg-amber-500/10 text-white'
                      : 'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
                  )}
                >
                  {a.name}
                  <span className={cn('block text-xs mt-0.5', t.muted)}>{a.maxPlayers} players</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {encounters.map((enc) => (
              <button
                key={enc.id}
                type="button"
                onClick={() => setEncounterId(enc.id)}
                className={cn(
                  'text-left px-3 py-2 rounded-xl border text-sm transition-colors',
                  encounterId === enc.id
                    ? 'border-amber-500/50 bg-amber-500/10 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]'
                )}
              >
                {enc.name}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
            {FLIER_TEAM_REQUIREMENT_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <p className="text-sm font-semibold text-white">{cat.label}</p>
                {cat.description ? (
                  <p className={cn('text-xs mt-0.5 mb-2', t.muted)}>{cat.description}</p>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  {cat.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOption(cat.id, opt.id, cat.multiSelect)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                        isSelected(cat.id, opt.id)
                          ? 'border-purple-400/60 bg-purple-500/20 text-purple-100'
                          : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="text-sm font-semibold text-white mb-1">Custom requirements</p>
              <textarea
                value={customRequirements}
                onChange={(e) => setCustomRequirements(e.target.value)}
                placeholder="e.g. Must have Touch of Malice catalyst, no hunters"
                className="w-full min-h-[72px] rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-white mb-2">Join mode</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setJoinMode('instant')}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-semibold border',
                    joinMode === 'instant'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                      : 'border-white/10 text-white/70'
                  )}
                >
                  Instant join — straight into the room
                </button>
                <button
                  type="button"
                  onClick={() => setJoinMode('apply')}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-semibold border',
                    joinMode === 'apply'
                      ? 'border-sky-500/50 bg-sky-500/10 text-sky-100'
                      : 'border-white/10 text-white/70'
                  )}
                >
                  Apply to join — host approves
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={micRequired}
                onChange={(e) => setMicRequired(e.target.checked)}
                className="rounded"
              />
              Mic required
            </label>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Room notes</p>
              <textarea
                value={roomNotes}
                onChange={(e) => setRoomNotes(e.target.value)}
                placeholder="Anything else for your fireteam…"
                className="w-full min-h-[72px] rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedActivity ? (
                <StatusPill label={selectedActivity.name} tone="blue" />
              ) : null}
              {encounters.find((e) => e.id === encounterId) ? (
                <StatusPill
                  label={encounters.find((e) => e.id === encounterId)!.name}
                  tone="purple"
                />
              ) : null}
              <StatusPill label={joinMode === 'instant' ? 'Instant join' : 'Apply to join'} tone="green" />
            </div>
          </div>
        )}

        {error ? <p className="text-sm text-red-300 mt-4">{error}</p> : null}

        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-white/10">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={cn(destinySecondaryBtn(darkMode), step === 0 && 'opacity-40 cursor-not-allowed')}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className={cn(destinyPrimaryBtn(darkMode), !canNext && 'opacity-40 cursor-not-allowed')}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving || !activityId || !encounterId}
              onClick={() => void submit()}
              className={cn(destinyPrimaryBtn(darkMode), saving && 'opacity-70')}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create room
            </button>
          )}
        </div>
      </GlassCard>
    </div>
  )
}
