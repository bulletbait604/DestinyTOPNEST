import type { NightOpsBoard, NightOpsCard, NightOpsEvent, RunRecord } from '@/lib/destiny/types'
import { dedupeRuns, isFullClearStampEligible, runIncludesViewer, type FireteamViewer } from '@/lib/destiny/passport'

export const DEFAULT_NIGHT_OPS: NightOpsEvent[] = []

function namesMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

/** Live links are optional. Only https URLs are kept so a bad catalog value cannot become a script link. */
function httpsUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:') return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

function sanitizeEvent(event: NightOpsEvent): NightOpsEvent {
  return {
    ...event,
    kickUrl: httpsUrl(event.kickUrl),
    twitchUrl: httpsUrl(event.twitchUrl),
  }
}

export function isNightOpsEvent(value: unknown): value is NightOpsEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as NightOpsEvent
  if (typeof event.id !== 'string' || !event.id.trim()) return false
  if (typeof event.title !== 'string' || !event.title.trim()) return false
  if (typeof event.hostName !== 'string' || !event.hostName.trim()) return false
  if (typeof event.startsAt !== 'string' || typeof event.endsAt !== 'string') return false
  const start = new Date(event.startsAt).getTime()
  const end = new Date(event.endsAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return false
  if (event.kickUrl != null && typeof event.kickUrl !== 'string') return false
  if (event.twitchUrl != null && typeof event.twitchUrl !== 'string') return false
  return true
}

/** Built-in list, replaced by FIRETEAM_HQ_NIGHT_OPS_JSON when that value is valid. */
export function resolveNightOpsCatalog(events?: NightOpsEvent[]): NightOpsEvent[] {
  if (events) return events.filter(isNightOpsEvent).map(sanitizeEvent)
  const raw = process.env.FIRETEAM_HQ_NIGHT_OPS_JSON?.trim()
  if (!raw) return DEFAULT_NIGHT_OPS
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || !parsed.every(isNightOpsEvent)) return DEFAULT_NIGHT_OPS
    return parsed.map(sanitizeEvent)
  } catch {
    return DEFAULT_NIGHT_OPS
  }
}

function eventStatus(event: NightOpsEvent, now: Date): NightOpsCard['status'] {
  const time = now.getTime()
  if (time < new Date(event.startsAt).getTime()) return 'upcoming'
  if (time > new Date(event.endsAt).getTime()) return 'ended'
  return 'live'
}

function attendanceRun(event: NightOpsEvent, runs: RunRecord[], viewer: FireteamViewer): RunRecord | undefined {
  const start = new Date(event.startsAt).getTime()
  const end = new Date(event.endsAt).getTime()
  return dedupeRuns(runs).find((run) => {
    if (!isFullClearStampEligible(run) || !runIncludesViewer(run, viewer)) return false
    const completed = new Date(run.completedAt).getTime()
    if (completed < start || completed > end) return false
    if (event.activityName && !namesMatch(event.activityName, run.activityName)) return false
    return true
  })
}

/**
 * Community Night Ops attendance. A badge requires a verified full clear whose
 * PGCR completion time falls inside the event window.
 */
export function evaluateNightOps(input: {
  runs: RunRecord[]
  viewer: FireteamViewer
  now?: Date
  events?: NightOpsEvent[]
}): NightOpsBoard {
  const now = input.now ?? new Date()
  const cards: NightOpsCard[] = resolveNightOpsCatalog(input.events)
    .slice()
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .map((event) => {
      const evidence = attendanceRun(event, input.runs, input.viewer)
      return {
        event,
        status: eventStatus(event, now),
        attended: Boolean(evidence),
        badgeLabel: evidence ? `Night Ops — ${event.title}` : null,
        evidenceRunId: evidence?.id,
      }
    })

  return {
    events: cards,
    badges: cards.map((card) => card.badgeLabel).filter((badge): badge is string => Boolean(badge)),
  }
}
