'use client'

import { useEffect, useState } from 'react'
import type { PublicHubSnapshot } from '@/lib/destiny/publicHub'
import {
  activitiesFromNames,
  clearStatusLabel,
  SIGNED_OUT_MESSAGE,
  WEEK_CLEAR_NOTE,
  type ClearState,
  type PersonalWeekStatus,
  type WeekChecklistActivity,
  type WeekPayload,
} from '@/lib/destiny/weekChecklist'

export interface WeekViewModel {
  weekLabel: string
  resetsInLabel: string
  sourceLabel: string
  note: string
  activities: WeekChecklistActivity[]
  personal: PersonalWeekStatus | { status: 'loading'; message: string }
  error?: string
}

function formatWhen(iso?: string): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

export function weekViewFromSnapshot(snapshot: PublicHubSnapshot | null, signedIn: boolean): WeekViewModel {
  return {
    weekLabel: snapshot?.weekLabel ?? '',
    resetsInLabel: snapshot?.resetsInLabel ?? '',
    sourceLabel: snapshot ? 'Loading the weekly source…' : 'Loading this week…',
    note: WEEK_CLEAR_NOTE,
    activities: snapshot ? activitiesFromNames(snapshot.featuredRaids, snapshot.featuredDungeons) : [],
    personal: signedIn
      ? { status: 'loading', message: 'Checking your clears…' }
      : { status: 'signed_out', message: SIGNED_OUT_MESSAGE },
  }
}

function viewFromPayload(payload: WeekPayload): WeekViewModel {
  return {
    weekLabel: payload.weekLabel,
    resetsInLabel: payload.resetsInLabel,
    sourceLabel: payload.sourceLabel,
    note: payload.note,
    activities: payload.activities,
    personal: payload.personal,
  }
}

function rowState(model: WeekViewModel, activity: WeekChecklistActivity): ClearState | 'not_checked' {
  const personal = model.personal
  if (personal.status !== 'ready') return 'not_checked'
  return personal.clears[activity.key]?.state ?? 'unknown'
}

export function WeekChecklistView({
  model,
  onLogin,
  onRetry,
  heading = 'page',
}: {
  model: WeekViewModel
  onLogin?: () => void
  onRetry?: () => void
  heading?: 'page' | 'section'
}) {
  const showSignIn = model.personal.status === 'signed_out' || model.personal.status === 'needs_link'
  const TitleTag = heading === 'page' ? 'h1' : 'h2'
  return (
    <section className="gh-week" aria-labelledby="gh-week-title">
      <div className="gh-section-head">
        <TitleTag id="gh-week-title">
          {heading === 'page' ? 'This week' : 'Featured clears'}
        </TitleTag>
        {model.weekLabel ? (
          <p className="gh-week-when">
            {model.weekLabel}
            {model.resetsInLabel ? ` · resets in ${model.resetsInLabel}` : ''}
          </p>
        ) : null}
      </div>
      <p className="gh-week-note">{model.note}</p>
      <p className="gh-week-source">{model.sourceLabel}</p>
      {model.error ? (
        <p className="gh-alert" role="alert">
          {model.error}{' '}
          {onRetry ? (
            <button type="button" className="gh-text-btn" onClick={onRetry}>
              Try again
            </button>
          ) : null}
        </p>
      ) : null}
      {model.activities.length ? (
        <ul className="gh-week-list">
          {model.activities.map((activity) => {
            const state = rowState(model, activity)
            const completedAt =
              model.personal.status === 'ready' ? model.personal.clears[activity.key]?.completedAt : undefined
            const when = formatWhen(completedAt)
            return (
              <li key={activity.key} className="gh-week-row">
                <span
                  className="gh-week-art"
                  aria-hidden="true"
                  style={activity.iconUrl ? { backgroundImage: `url(${activity.iconUrl})` } : undefined}
                />
                <span className="gh-week-copy">
                  <span className="gh-week-kind">{activity.kind === 'raid' ? 'Raid' : 'Dungeon'}</span>
                  <strong>{activity.name}</strong>
                  {when ? <span className="gh-muted">{when}</span> : null}
                </span>
                <span className={`gh-week-status is-${state}`}>{clearStatusLabel(state)}</span>
              </li>
            )
          })}
        </ul>
      ) : model.sourceLabel.startsWith('Loading') || model.personal.status === 'loading' ? (
        <p className="gh-muted">Loading this week…</p>
      ) : (
        <p className="gh-empty-card">No featured raids or dungeons are listed for this week yet.</p>
      )}
      <p className="gh-week-personal" role="status">
        {model.personal.message}
      </p>
      {showSignIn && onLogin ? (
        <button type="button" className="gh-btn gh-btn-primary" onClick={onLogin}>
          {model.personal.status === 'needs_link' ? 'Link Bungie again' : 'Sign in to check your clears'}
        </button>
      ) : null}
      <p className="gh-muted">
        <a href="/passport">Passport</a> keeps older verified clears. Scoring and votes stay on their own pages.
      </p>
    </section>
  )
}

export default function WeekChecklist({
  snapshot,
  signedIn,
  onLogin,
  heading = 'page',
}: {
  snapshot: PublicHubSnapshot | null
  signedIn: boolean
  onLogin?: () => void
  heading?: 'page' | 'section'
}) {
  const [model, setModel] = useState<WeekViewModel>(() => weekViewFromSnapshot(snapshot, signedIn))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setModel((current) => {
      const seeded = weekViewFromSnapshot(snapshot, signedIn)
      return {
        ...current,
        weekLabel: current.weekLabel || seeded.weekLabel,
        resetsInLabel: current.resetsInLabel || seeded.resetsInLabel,
        activities: current.activities.length ? current.activities : seeded.activities,
        personal: current.personal.status === 'loading' ? seeded.personal : current.personal,
      }
    })
  }, [snapshot, signedIn])

  useEffect(() => {
    let cancelled = false
    fetch('/api/destiny/week', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('The weekly list could not be checked.')
        return (await response.json()) as WeekPayload
      })
      .then((payload) => {
        if (cancelled) return
        if (!payload?.activities || !payload.personal) throw new Error('The weekly list came back incomplete.')
        setModel(viewFromPayload(payload))
      })
      .catch(() => {
        if (cancelled) return
        setModel((current) => ({
          ...current,
          activities: current.activities.length
            ? current.activities
            : activitiesFromNames(snapshot?.featuredRaids ?? [], snapshot?.featuredDungeons ?? []),
          weekLabel: current.weekLabel || snapshot?.weekLabel || '',
          resetsInLabel: current.resetsInLabel || snapshot?.resetsInLabel || '',
          sourceLabel: snapshot
            ? 'Showing the public weekly list. The live check failed.'
            : 'The weekly list could not be loaded.',
          error: 'Your clears could not be checked just now.',
          personal:
            current.personal.status === 'ready'
              ? current.personal
              : {
                  status: 'unavailable',
                  message: 'Your clears could not be checked just now.',
                },
        }))
      })
    return () => {
      cancelled = true
    }
  }, [attempt, signedIn, snapshot])

  return (
    <WeekChecklistView
      model={model}
      onLogin={onLogin}
      heading={heading}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  )
}
