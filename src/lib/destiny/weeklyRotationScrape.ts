/**
 * Fallback when Destiny2/Milestones is unavailable.
 * Reads a trusted weekly reset post (the DestinyTheGame megathread, then TodayInDestiny)
 * and pulls the featured raid and dungeon lines.
 */

import { cleanActivityDisplayName, knownFeaturedActivity } from '@/lib/destiny/weeklyFeaturedSelection'
import type { FeaturedSelection } from '@/lib/destiny/weeklyFeaturedSelection'
import { getCurrentWeekResetStart, rotationWeekForDate } from '@/lib/destiny/weeklyRotation'

const REDDIT_SEARCH =
  'https://www.reddit.com/r/DestinyTheGame/search.json?q=title%3A%22Weekly%20Reset%20Thread%22&restrict_sr=1&sort=new&t=month&limit=5'
const TODAY_IN_DESTINY = 'https://www.todayindestiny.com/'

const RAID_LINE = /(?:^|\n)\s*(?:[-*]\s*)?(?:featured\s+)?raids?\s*:\s*\*{0,2}\s*([^\n*]+)/i
const DUNGEON_LINE = /(?:^|\n)\s*(?:[-*]\s*)?(?:featured\s+)?dungeons?\s*:\s*\*{0,2}\s*([^\n*]+)/i
const PANTHEON_LINE = /(?:^|\n)\s*(?:[-*]\s*)?(?:featured\s+)?pantheon\s*:\s*\*{0,2}\s*([^\n*]+)/i
const NIGHTFALL_LINE = /grandmaster(?:\s+nightfall)?\s*:\s*\*{0,2}\s*([^\n*]+)/i
/** Card layouts put the label and the activity pair on following lines, with no colon. */
const RAID_CARD = /featured\s+raids?\s*\n+\s*([^\n]+)/i
const DUNGEON_CARD = /featured\s+dungeons?\s*\n+\s*([^\n]+)/i
const PANTHEON_CARD = /featured\s+pantheon\s*\n+\s*([^\n]+)/i
const NIGHTFALL_CARD = /grandmaster\s*\n+\s*([^\n]+)/i

function capture(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1]?.trim()
    if (match) return match
  }
  return ''
}

function dedupe(names: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of names) {
    const key = name.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

function splitNames(raw: string): string[] {
  return raw
    .replace(/\*/g, '')
    .split(/\s*(?:,|&|\/|\+|\band\b)\s*/i)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 1)
}

function namesFor(raw: string, kind: 'raid' | 'dungeon'): string[] {
  const out: string[] = []
  for (const part of splitNames(raw)) {
    const known = knownFeaturedActivity(part)
    if (known) {
      if (known.kind === kind) out.push(known.display)
      continue
    }
    const cleaned = cleanActivityDisplayName(part)
    if (cleaned && cleaned.length <= 40 && !/[.]/.test(cleaned)) out.push(cleaned)
  }
  return dedupe(out).slice(0, 2)
}

function samePair(left: string[], right: string[]): boolean {
  if (left.length < 2 || right.length < 2) return false
  const keys = new Set(left.slice(0, 2).map((name) => name.toLowerCase()))
  return right.slice(0, 2).every((name) => keys.has(name.toLowerCase()))
}

/**
 * When a blog lists the same two activities in the other order, keep the
 * calendar order so the page does not flip names around.
 */
export function alignScrapedSelection(selection: FeaturedSelection, now: Date): FeaturedSelection {
  const calendar = rotationWeekForDate(getCurrentWeekResetStart(now))
  return {
    ...selection,
    raids: samePair(selection.raids, calendar.raids) ? [...calendar.raids] : selection.raids,
    dungeons: samePair(selection.dungeons, calendar.dungeons) ? [...calendar.dungeons] : selection.dungeons,
  }
}

/** Parse a weekly reset post. Returns null unless it names at least one featured pair. */
export function parseWeeklyResetText(text: string): FeaturedSelection | null {
  if (!text.trim()) return null
  const raids = namesFor(capture(text, [RAID_LINE, RAID_CARD]), 'raid')
  const dungeons = namesFor(capture(text, [DUNGEON_LINE, DUNGEON_CARD]), 'dungeon')
  const pantheonParts = splitNames(capture(text, [PANTHEON_LINE, PANTHEON_CARD]))
  const pantheon = pantheonParts.length ? pantheonParts.join(' · ') : undefined
  const nightfallRaw = capture(text, [NIGHTFALL_LINE, NIGHTFALL_CARD]).replace(/\*/g, '').trim()
  const nightfall = nightfallRaw ? cleanActivityDisplayName(nightfallRaw) : undefined
  if (raids.length < 2 && dungeons.length < 2 && !pantheon && !nightfall) return null
  return { raids, dungeons, pantheon, nightfall }
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;|&#x2019;/gi, "'")
    .replace(/&#8216;|&#x2018;/gi, "'")
}

interface RedditPost {
  title?: string
  selftext?: string
  created_utc?: number
}

function postsFromReddit(payload: unknown): RedditPost[] {
  if (!payload || typeof payload !== 'object') return []
  const children = (payload as { data?: { children?: Array<{ data?: RedditPost }> } }).data?.children
  if (!Array.isArray(children)) return []
  return children.map((child) => child?.data ?? {})
}

/** Pick the reset thread for this Tuesday. */
export function selectRedditResetPost(payload: unknown, now: Date): string | null {
  const weekStart = getCurrentWeekResetStart(now)
  const weekKey = weekStart.toISOString().slice(0, 10)
  const nextReset = weekStart.getTime() + 7 * 24 * 60 * 60 * 1000
  const posts = postsFromReddit(payload)
  const dated = posts.find((post) => `${post.title ?? ''} ${post.selftext ?? ''}`.includes(weekKey))
  const chosen =
    dated ??
    posts.find((post) => {
      const created = (post.created_utc ?? 0) * 1000
      return created >= weekStart.getTime() && created < nextReset && /weekly reset/i.test(post.title ?? '')
    })
  if (!chosen) return null
  return `${chosen.title ?? ''}\n${chosen.selftext ?? ''}`
}

function kyberWeekUrl(now: Date): string {
  const start = getCurrentWeekResetStart(now)
  const month = start.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }).toLowerCase()
  return `https://kyberscorner.com/destiny-2-weekly-reset-${month}-${start.getUTCDate()}-${start.getUTCFullYear()}/`
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'topnest-weekly-rotation/1.0 (https://topnest.app)',
        Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

/** Live weekly reset text. Null when both sources miss or cannot be parsed. */
export async function fetchScrapedFeaturedWeek(now: Date): Promise<FeaturedSelection | null> {
  const reddit = await fetchText(REDDIT_SEARCH, 6000)
  if (reddit) {
    try {
      const parsed = parseWeeklyResetText(selectRedditResetPost(JSON.parse(reddit), now) ?? '')
      if (parsed && parsed.raids.length >= 2 && parsed.dungeons.length >= 2) return alignScrapedSelection(parsed, now)
    } catch {
      /* Reddit sometimes returns a challenge page instead of JSON. */
    }
  }

  for (const url of [kyberWeekUrl(now), TODAY_IN_DESTINY]) {
    const page = await fetchText(url, 6000)
    if (!page) continue
    const parsed = parseWeeklyResetText(htmlToPlainText(page))
    if (parsed && parsed.raids.length >= 2 && parsed.dungeons.length >= 2) return alignScrapedSelection(parsed, now)
  }
  return null
}
