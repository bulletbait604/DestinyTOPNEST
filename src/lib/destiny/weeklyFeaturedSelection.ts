/**
 * Pure selection of the featured raid/dungeon pair from Bungie public milestones.
 * Destiny2/Milestones returns every active milestone; featured rotators are the
 * weekly ones, not each raid's permanent challenge.
 */

export const CANONICAL_RAIDS = [
  'Vault of Glass',
  'Last Wish',
  "King's Fall",
  'Garden of Salvation',
  'Deep Stone Crypt',
  "Crota's End",
  'Root of Nightmares',
  'Vow of the Disciple',
  "Salvation's Edge",
  'Crown of Sorrow',
] as const

export const CANONICAL_DUNGEONS = [
  'Shattered Throne',
  'Pit of Heresy',
  'Prophecy',
  'Grasp of Avarice',
  'Duality',
  'Spire of the Watcher',
  'Ghosts of the Deep',
  "Warlord's Ruin",
  "Vesper's Host",
  'Sundered Doctrine',
] as const

const RAID_KEYS = new Map(CANONICAL_RAIDS.map((name) => [normalize(name), name]))
const DUNGEON_KEYS = new Map(CANONICAL_DUNGEONS.map((name) => [normalize(name), name]))

/** Boss-only labels that show up on Pantheon milestones and must not count as raids. */
const PANTHEON_BOSS_KEYS = new Set([
  'gahlran',
  'consecrated mind',
  'rhulk',
  'warpriest',
  'oryx',
  'atraks',
  'taniks',
  'crota',
  'nezarec',
  'zydron',
  'aetheon',
  'atheon',
  'templar',
  'golgoroth',
  'daughters',
  'morgeth',
  'riven',
  'insurrection prime',
  'caretaker',
  'witness',
  'calus',
  'dominus ghaul',
])

export interface WeeklyMilestoneActivity {
  name?: string
  activityModeType?: number
}

export interface WeeklyMilestoneSnapshot {
  milestoneHash?: string
  name?: string
  friendlyName?: string
  description?: string
  order?: number
  startDate?: string
  endDate?: string
  activities?: WeeklyMilestoneActivity[]
}

export interface FeaturedSelection {
  raids: string[]
  dungeons: string[]
  pantheon?: string
  /** Earliest end of the milestones we actually used. */
  endsAtMs?: number
}

export const RAID_ACTIVITY_MODE = 4
export const DUNGEON_ACTIVITY_MODE = 82

function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/^the\s+/, '')
}

export function cleanActivityDisplayName(name: string): string {
  let cleaned = name.trim().replace(/[’‘]/g, "'")
  cleaned = cleaned.replace(/\s*:\s*(normal|master|legend|expert|hero|adept|guided).*$/i, '')
  cleaned = cleaned.replace(/\s+(normal|master)$/i, '')
  return cleaned.trim()
}

export function knownFeaturedActivity(name: string): { kind: 'raid' | 'dungeon'; display: string } | null {
  const key = normalize(cleanActivityDisplayName(name))
  const raid = RAID_KEYS.get(key)
  if (raid) return { kind: 'raid', display: raid }
  const dungeon = DUNGEON_KEYS.get(key)
  if (dungeon) return { kind: 'dungeon', display: dungeon }
  return null
}

function milestoneText(milestone: WeeklyMilestoneSnapshot): string {
  return `${milestone.name ?? ''} ${milestone.friendlyName ?? ''} ${milestone.description ?? ''}`.toLowerCase()
}

function isActive(milestone: WeeklyMilestoneSnapshot, now: Date): boolean {
  const time = now.getTime()
  if (milestone.startDate) {
    const start = Date.parse(milestone.startDate)
    if (Number.isFinite(start) && start > time) return false
  }
  if (milestone.endDate) {
    const end = Date.parse(milestone.endDate)
    if (Number.isFinite(end) && end <= time) return false
  }
  return true
}

function isIgnoredPlaylist(text: string): boolean {
  return /nightfall|strike|crucible|trials|gambit|iron banner|lost sector|vanguard ops|fireteam ops/.test(text)
}

function isPantheonMilestone(text: string): boolean {
  return /pantheon/.test(text)
}

function isFeaturedLabel(text: string): boolean {
  return /feature|rotator|pinnacle/.test(text)
}

function dedupe(names: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of names) {
    const key = normalize(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

function classifiedActivities(
  milestone: WeeklyMilestoneSnapshot,
  allowUnknownModes: boolean
): Array<{ kind: 'raid' | 'dungeon'; display: string }> {
  const found: Array<{ kind: 'raid' | 'dungeon'; display: string }> = []
  for (const activity of milestone.activities ?? []) {
    if (!activity.name) continue
    const display = cleanActivityDisplayName(activity.name)
    const known = knownFeaturedActivity(display)
    if (known) {
      found.push(known)
      continue
    }
    if (!allowUnknownModes) continue
    const key = normalize(display)
    if (!key || PANTHEON_BOSS_KEYS.has(key) || key === 'pantheon') continue
    if (activity.activityModeType === RAID_ACTIVITY_MODE) found.push({ kind: 'raid', display })
    else if (activity.activityModeType === DUNGEON_ACTIVITY_MODE) found.push({ kind: 'dungeon', display })
  }
  const raids = dedupe(found.filter((entry) => entry.kind === 'raid').map((entry) => entry.display))
  const dungeons = dedupe(found.filter((entry) => entry.kind === 'dungeon').map((entry) => entry.display))
  return [
    ...raids.map((display) => ({ kind: 'raid' as const, display })),
    ...dungeons.map((display) => ({ kind: 'dungeon' as const, display })),
  ]
}

function pantheonLabel(milestone: WeeklyMilestoneSnapshot): string | undefined {
  const names = dedupe(
    (milestone.activities ?? [])
      .map((activity) => (activity.name ? cleanActivityDisplayName(activity.name) : ''))
      .filter((name) => {
        if (!name) return false
        const key = normalize(name)
        if (!key || key === 'pantheon' || knownFeaturedActivity(name)) return false
        return true
      })
  )
  if (names.length) return names.join(' · ')
  const title = cleanActivityDisplayName(milestone.name ?? '').replace(/^pantheon[:\s-]*/i, '').trim()
  return title || undefined
}

function pickPair(groups: string[][]): string[] {
  const exact = groups.find((group) => group.length === 2)
  if (exact) return exact
  const flat = dedupe(groups.flat())
  return flat.length >= 2 ? flat.slice(0, 2) : []
}

function endMs(milestone: WeeklyMilestoneSnapshot): number | undefined {
  if (!milestone.endDate) return undefined
  const time = Date.parse(milestone.endDate)
  return Number.isFinite(time) ? time : undefined
}

function byOrder(milestones: WeeklyMilestoneSnapshot[]): WeeklyMilestoneSnapshot[] {
  return [...milestones].sort((a, b) => {
    const ao = a.order ?? Number.MAX_SAFE_INTEGER
    const bo = b.order ?? Number.MAX_SAFE_INTEGER
    if (ao !== bo) return ao - bo
    return (a.milestoneHash ?? '').localeCompare(b.milestoneHash ?? '')
  })
}

/**
 * Choose this week's featured raids and dungeons.
 * Returns null when the payload has no usable weekly pair (caller keeps the schedule).
 */
export function selectFeaturedWeeklyActivities(
  milestones: WeeklyMilestoneSnapshot[],
  now: Date
): FeaturedSelection | null {
  const active = byOrder(milestones.filter((milestone) => isActive(milestone, now)))
  const ends: number[] = []
  let pantheon: string | undefined

  const featuredRaidGroups: string[][] = []
  const featuredDungeonGroups: string[][] = []

  for (const milestone of active) {
    const text = milestoneText(milestone)
    if (isIgnoredPlaylist(text)) continue
    if (isPantheonMilestone(text)) {
      pantheon = pantheonLabel(milestone) ?? pantheon
      const end = endMs(milestone)
      if (end) ends.push(end)
      continue
    }
    if (!isFeaturedLabel(text)) continue
    const activities = classifiedActivities(milestone, true)
    const raids = activities.filter((entry) => entry.kind === 'raid').map((entry) => entry.display)
    const dungeons = activities.filter((entry) => entry.kind === 'dungeon').map((entry) => entry.display)
    const saysRaid = /raid/.test(text)
    const saysDungeon = /dungeon/.test(text)
    if (saysRaid && !saysDungeon) {
      if (raids.length) featuredRaidGroups.push(raids)
    } else if (saysDungeon && !saysRaid) {
      if (dungeons.length) featuredDungeonGroups.push(dungeons)
    } else {
      if (raids.length) featuredRaidGroups.push(raids)
      if (dungeons.length) featuredDungeonGroups.push(dungeons)
    }
    const end = endMs(milestone)
    if (end && (raids.length || dungeons.length)) ends.push(end)
  }

  let raids = pickPair(featuredRaidGroups)
  let dungeons = pickPair(featuredDungeonGroups)

  const weekHorizon = now.getTime() + 8 * 24 * 60 * 60 * 1000
  const heuristic = active.filter((milestone) => {
    const text = milestoneText(milestone)
    if (isIgnoredPlaylist(text) || isPantheonMilestone(text)) return false
    const end = endMs(milestone)
    if (!end || end > weekHorizon) return false
    const activities = classifiedActivities(milestone, false)
    return activities.length > 0 && activities.length <= 4
  })

  if (raids.length < 2) {
    const groups = heuristic
      .map((milestone) => {
        const activities = classifiedActivities(milestone, false)
        const raidNames = activities.filter((entry) => entry.kind === 'raid').map((entry) => entry.display)
        const dungeonNames = activities.filter((entry) => entry.kind === 'dungeon').map((entry) => entry.display)
        return { milestone, raidNames, dungeonNames }
      })
      .filter((entry) => entry.raidNames.length === 2 && entry.dungeonNames.length === 0)
    const chosen = preferLabeled(groups, /raid|feature|rotator/)
    if (chosen) {
      raids = chosen.raidNames
      const end = endMs(chosen.milestone)
      if (end) ends.push(end)
    }
  }

  if (dungeons.length < 2) {
    const groups = heuristic
      .map((milestone) => {
        const activities = classifiedActivities(milestone, false)
        const raidNames = activities.filter((entry) => entry.kind === 'raid').map((entry) => entry.display)
        const dungeonNames = activities.filter((entry) => entry.kind === 'dungeon').map((entry) => entry.display)
        return { milestone, raidNames, dungeonNames }
      })
      .filter((entry) => entry.dungeonNames.length === 2 && entry.raidNames.length === 0)
    const chosen = preferLabeled(groups, /dungeon|feature|rotator/)
    if (chosen) {
      dungeons = chosen.dungeonNames
      const end = endMs(chosen.milestone)
      if (end) ends.push(end)
    }
  }

  if (raids.length < 2 || dungeons.length < 2) {
    const both = heuristic
      .map((milestone) => {
        const activities = classifiedActivities(milestone, false)
        return {
          milestone,
          raidNames: activities.filter((entry) => entry.kind === 'raid').map((entry) => entry.display),
          dungeonNames: activities.filter((entry) => entry.kind === 'dungeon').map((entry) => entry.display),
        }
      })
      .filter((entry) => entry.raidNames.length === 2 && entry.dungeonNames.length === 2)
    const chosen = preferLabeled(both, /feature|rotator|raid|dungeon/)
    if (chosen) {
      if (raids.length < 2) raids = chosen.raidNames
      if (dungeons.length < 2) dungeons = chosen.dungeonNames
      const end = endMs(chosen.milestone)
      if (end) ends.push(end)
    }
  }

  if (raids.length < 2 && dungeons.length < 2 && !pantheon) return null
  const finiteEnds = ends.filter((value) => Number.isFinite(value))
  return {
    raids: raids.slice(0, 2),
    dungeons: dungeons.slice(0, 2),
    pantheon,
    endsAtMs: finiteEnds.length ? Math.min(...finiteEnds) : undefined,
  }
}

function preferLabeled<T extends { milestone: WeeklyMilestoneSnapshot }>(
  groups: T[],
  pattern: RegExp
): T | undefined {
  if (!groups.length) return undefined
  const labeled = groups.filter((entry) => pattern.test(milestoneText(entry.milestone)))
  const pool = labeled.length ? labeled : groups
  return [...pool].sort((a, b) => (endMs(a.milestone) ?? Number.MAX_SAFE_INTEGER) - (endMs(b.milestone) ?? Number.MAX_SAFE_INTEGER))[0]
}
