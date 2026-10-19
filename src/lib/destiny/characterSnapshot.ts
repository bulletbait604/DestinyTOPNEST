import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'

/** Skip another Bungie pull when today's snapshot is newer than this. */
export const SNAPSHOT_FRESH_MS = 12 * 60 * 60 * 1000

const CLASS_BY_TYPE: Record<number, string> = {
  0: 'titan',
  1: 'hunter',
  2: 'warlock',
}

/** Equipment buckets we keep on a loadout snapshot. */
export const EQUIPMENT_BUCKETS = {
  1498876634: 'kinetic',
  2465295065: 'energy',
  953998645: 'power',
  3284755031: 'subclass',
  3448274439: 'helmet',
  3551918588: 'gauntlets',
  14239492: 'chest',
  20886954: 'legs',
  1585787867: 'classItem',
} as const

export type EquipmentBucket = (typeof EQUIPMENT_BUCKETS)[keyof typeof EQUIPMENT_BUCKETS]

export const SLOT_LABELS: Record<EquipmentBucket, string> = {
  kinetic: 'Kinetic',
  energy: 'Energy',
  power: 'Power',
  subclass: 'Subclass',
  helmet: 'Helmet',
  gauntlets: 'Gauntlets',
  chest: 'Chest',
  legs: 'Legs',
  classItem: 'Class item',
}

export interface ParsedEquipmentSlot {
  bucket: EquipmentBucket
  itemHash: number
}

export interface ParsedCharacterSnapshot {
  characterId: string
  className: string
  light: number
  subclassHash?: number
  emblemUrl?: string
  emblemBackgroundUrl?: string
  titleRecordHash?: number
  minutesPlayedTotal: number
  artifactPower?: number
  equipped: ParsedEquipmentSlot[]
}

export interface ParsedSnapshotProfile {
  guardianRank?: number
  triumphScore?: number
  collectionsOwned?: number
  characters: ParsedCharacterSnapshot[]
}

export interface ActivityClearCount {
  activityHash: number
  mode: 'raid' | 'dungeon'
  clears: number
}

export interface ParsedActivity {
  activityHash: number
  mode: 'raid' | 'dungeon'
  completed: boolean
  period?: string
}

export interface ParsedWeaponKill {
  itemHash: number
  kills: number
}

export interface StoredEquipmentSlot {
  bucket: EquipmentBucket
  name?: string
}

export interface StoredActivityClear {
  name: string
  mode: 'raid' | 'dungeon'
  clears: number
}

export interface StoredWeaponKill {
  name: string
  kills: number
}

export interface StoredHistoryEntry {
  name: string
  mode: 'raid' | 'dungeon'
  completed: boolean
  period?: string
}

/** One character on one UTC day. History is this collection over time. */
export interface CharacterSnapshotDoc {
  membershipId: string
  membershipType: number
  characterId: string
  day: string
  capturedAt: string
  className: string
  light: number
  subclassName?: string
  emblemUrl?: string
  emblemBackgroundUrl?: string
  titleName?: string
  minutesPlayedTotal: number
  guardianRank?: number
  artifactPower?: number
  triumphScore?: number
  collectionsOwned?: number
  equipped: StoredEquipmentSlot[]
  activityClears: StoredActivityClear[]
  weaponKills: StoredWeaponKill[]
  recentHistory: StoredHistoryEntry[]
}

export interface TrendPoint {
  day: string
  light: number
  triumphScore?: number
}

export interface DossierCharacter {
  characterId: string
  className: string
  light: number
  subclassName?: string
  emblemUrl?: string
  emblemBackgroundUrl?: string
  titleName?: string
  minutesPlayedTotal: number
  artifactPower?: number
  equipped: StoredEquipmentSlot[]
}

export interface GuardianDossier {
  capturedAt: string
  day: string
  triumphScore?: number
  collectionsOwned?: number
  guardianRank?: number
  characters: DossierCharacter[]
  activityClears: StoredActivityClear[]
  weaponKills: StoredWeaponKill[]
  recentHistory: StoredHistoryEntry[]
  trend: TrendPoint[]
  guidesFirstClears: boolean
}

export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function snapshotDocId(membershipId: string, characterId: string, day: string): string {
  return `${membershipId}:${characterId}:${day}`
}

export function snapshotIsFresh(capturedAt: string | undefined, now: Date, freshMs = SNAPSHOT_FRESH_MS): boolean {
  if (!capturedAt) return false
  const then = Date.parse(capturedAt)
  if (!Number.isFinite(then)) return false
  return now.getTime() - then < freshMs
}

export function shouldCaptureSnapshot(capturedAt: string | undefined, now = new Date()): boolean {
  return !snapshotIsFresh(capturedAt, now)
}

/** Drop manifest fallbacks so the profile never prints a raw item hash. */
export function cleanManifestName(name: string | undefined, hash: number): string | undefined {
  const trimmed = name?.trim()
  if (!trimmed) return undefined
  if (trimmed === String(hash)) return undefined
  if (trimmed === `Item ${hash}` || trimmed === `Hash ${hash}` || trimmed === `Activity ${hash}`) return undefined
  return trimmed
}

export function formatPlayed(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'
  const hours = Math.floor(minutes / 60)
  if (hours < 1) return `${Math.round(minutes)}m`
  return `${hours.toLocaleString('en-US')}h`
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function readFinite(source: unknown, keys: string[]): number | undefined {
  if (!source || typeof source !== 'object') return undefined
  const row = source as Record<string, unknown>
  for (const key of keys) {
    const value = asNumber(row[key])
    if (value != null) return value
  }
  return undefined
}

/** Owned collectibles have the NotAcquired bit clear. Profile and character lists are combined once. */
export function countOwnedCollectibles(profile: unknown): number | undefined {
  const root = (profile ?? {}) as {
    profileCollectibles?: { data?: { collectibles?: Record<string, { state?: unknown }> } }
    characterCollectibles?: { data?: Record<string, { collectibles?: Record<string, { state?: unknown }> }> }
  }
  const bags = [root.profileCollectibles?.data?.collectibles]
  for (const block of Object.values(root.characterCollectibles?.data ?? {})) {
    bags.push(block?.collectibles)
  }
  const seen = new Set<string>()
  let sawAny = false
  for (const bag of bags) {
    if (!bag) continue
    sawAny = true
    for (const [hash, entry] of Object.entries(bag)) {
      const state = asNumber(entry?.state)
      if (state == null) continue
      if ((state & 1) === 0) seen.add(hash)
    }
  }
  return sawAny ? seen.size : undefined
}

/** Characters, triumph score, collections, guardian rank, and artifact power from one GetProfile. */
export function parseCharacterSnapshotProfile(profile: unknown): ParsedSnapshotProfile {
  const root = (profile ?? {}) as {
    profile?: { data?: { currentGuardianRank?: unknown } }
    profileProgression?: { data?: { currentGuardianRank?: unknown } }
    profileRecords?: { data?: { activeScore?: unknown; score?: unknown } }
    characters?: { data?: Record<string, Record<string, unknown>> }
    characterEquipment?: { data?: Record<string, { items?: Array<{ itemHash?: unknown; bucketHash?: unknown }> }> }
    characterProgressions?: { data?: Record<string, { seasonalArtifact?: { powerBonus?: unknown } }> }
  }

  const guardianRank =
    readFinite(root.profile?.data, ['currentGuardianRank']) ??
    readFinite(root.profileProgression?.data, ['currentGuardianRank'])
  const triumphScore = readFinite(root.profileRecords?.data, ['activeScore', 'score'])
  const collectionsOwned = countOwnedCollectibles(profile)

  const characters: ParsedCharacterSnapshot[] = Object.entries(root.characters?.data ?? {}).map(([id, character]) => {
    const characterId = String(character.characterId || id)
    const equipped: ParsedEquipmentSlot[] = []
    const seen = new Set<EquipmentBucket>()
    let subclassHash: number | undefined
    for (const item of root.characterEquipment?.data?.[characterId]?.items ?? root.characterEquipment?.data?.[id]?.items ?? []) {
      const bucketHash = asNumber(item.bucketHash)
      const itemHash = asNumber(item.itemHash)
      if (!bucketHash || !itemHash) continue
      const bucket = EQUIPMENT_BUCKETS[bucketHash as keyof typeof EQUIPMENT_BUCKETS]
      if (!bucket || seen.has(bucket)) continue
      seen.add(bucket)
      if (bucket === 'subclass') subclassHash = itemHash
      equipped.push({ bucket, itemHash })
    }
    const artifactPower = asNumber(
      root.characterProgressions?.data?.[characterId]?.seasonalArtifact?.powerBonus ??
        root.characterProgressions?.data?.[id]?.seasonalArtifact?.powerBonus
    )
    const classType = asNumber(character.classType)
    return {
      characterId,
      className: classType != null ? (CLASS_BY_TYPE[classType] ?? 'guardian') : 'guardian',
      light: asNumber(character.light) ?? 0,
      subclassHash,
      emblemUrl: buildBungieIconUrl(typeof character.emblemPath === 'string' ? character.emblemPath : undefined),
      emblemBackgroundUrl: buildBungieIconUrl(
        typeof character.emblemBackgroundPath === 'string' ? character.emblemBackgroundPath : undefined
      ),
      titleRecordHash: asNumber(character.titleRecordHash),
      minutesPlayedTotal: asNumber(character.minutesPlayedTotal) ?? 0,
      artifactPower,
      equipped,
    }
  })

  characters.sort((a, b) => b.light - a.light)
  return { guardianRank, triumphScore, collectionsOwned, characters }
}

export function primaryCharacter<T extends { light: number }>(characters: T[]): T | undefined {
  return [...characters].sort((a, b) => b.light - a.light)[0]
}

function activityRows(history: unknown): Array<{
  period?: string
  activityDetails?: { referenceId?: unknown; directorActivityHash?: unknown }
  values?: { completed?: { basic?: { value?: unknown } } }
}> {
  if (!history || typeof history !== 'object') return []
  const activities = (history as { activities?: unknown }).activities
  return Array.isArray(activities) ? activities : []
}

/** Completed raid or dungeon runs in a short history window, grouped by activity. */
export function parseActivityHistory(
  history: unknown,
  mode: 'raid' | 'dungeon'
): { clears: ActivityClearCount[]; recent: ParsedActivity[] } {
  const counts = new Map<number, number>()
  const recent: ParsedActivity[] = []
  for (const row of activityRows(history)) {
    const activityHash =
      asNumber(row.activityDetails?.directorActivityHash) ?? asNumber(row.activityDetails?.referenceId)
    if (!activityHash) continue
    const completedValue = asNumber(row.values?.completed?.basic?.value)
    const completed = completedValue != null && completedValue > 0
    recent.push({ activityHash, mode, completed, period: row.period })
    if (!completed) continue
    counts.set(activityHash, (counts.get(activityHash) ?? 0) + 1)
  }
  recent.sort((a, b) => (b.period ?? '').localeCompare(a.period ?? ''))
  const clears = Array.from(counts.entries())
    .map(([activityHash, clears]) => ({ activityHash, mode, clears }))
    .sort((a, b) => b.clears - a.clears)
  return { clears, recent: recent.slice(0, 8) }
}

/** Top weapon kills from UniqueWeapons. */
export function parseWeaponKills(payload: unknown, limit = 5): ParsedWeaponKill[] {
  if (!payload || typeof payload !== 'object') return []
  const weapons = (payload as { weapons?: unknown }).weapons
  if (!Array.isArray(weapons)) return []
  const parsed: ParsedWeaponKill[] = []
  for (const weapon of weapons) {
    if (!weapon || typeof weapon !== 'object') continue
    const itemHash = asNumber((weapon as { referenceId?: unknown }).referenceId)
    const kills = asNumber(
      (weapon as { values?: { uniqueWeaponKills?: { basic?: { value?: unknown } } } }).values?.uniqueWeaponKills?.basic
        ?.value
    )
    if (!itemHash || !kills || kills <= 0) continue
    parsed.push({ itemHash, kills })
  }
  return parsed.sort((a, b) => b.kills - a.kills).slice(0, limit)
}

export function buildSnapshotTrend(
  rows: Array<{ day: string; light: number; triumphScore?: number }>
): TrendPoint[] {
  const byDay = new Map<string, TrendPoint>()
  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.day) || !Number.isFinite(row.light)) continue
    const current = byDay.get(row.day)
    if (!current || row.light > current.light) {
      byDay.set(row.day, {
        day: row.day,
        light: row.light,
        triumphScore: row.triumphScore ?? current?.triumphScore,
      })
    } else if (current.triumphScore == null && row.triumphScore != null) {
      current.triumphScore = row.triumphScore
    }
  }
  return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day)).slice(-40)
}

function mergeClears(rows: StoredActivityClear[]): StoredActivityClear[] {
  const map = new Map<string, StoredActivityClear>()
  for (const row of rows) {
    const name = row.name?.trim()
    if (!name || row.clears <= 0) continue
    const key = `${row.mode}:${name.toLowerCase()}`
    const existing = map.get(key)
    if (existing) existing.clears += row.clears
    else map.set(key, { name, mode: row.mode, clears: row.clears })
  }
  return Array.from(map.values()).sort((a, b) => b.clears - a.clears).slice(0, 8)
}

/** Latest UTC day plus a light/triumph trend. Blank activity names are left out. */
export function dossierFromSnapshots(docs: CharacterSnapshotDoc[], sherpaPoints: number): GuardianDossier | null {
  if (!docs.length) return null
  const latestDay = docs.reduce((max, doc) => (doc.day > max ? doc.day : max), docs[0]!.day)
  const latest = docs.filter((doc) => doc.day === latestDay).sort((a, b) => b.light - a.light)
  const head = latest[0]
  if (!head) return null
  const historySeen = new Set<string>()
  const recentHistory: StoredHistoryEntry[] = []
  for (const doc of latest) {
    for (const entry of doc.recentHistory ?? []) {
      const name = entry.name?.trim()
      if (!name) continue
      const key = `${entry.mode}:${name}:${entry.period ?? ''}`
      if (historySeen.has(key)) continue
      historySeen.add(key)
      recentHistory.push({ ...entry, name })
      if (recentHistory.length >= 8) break
    }
  }
  return {
    capturedAt: head.capturedAt,
    day: latestDay,
    triumphScore: head.triumphScore,
    collectionsOwned: head.collectionsOwned,
    guardianRank: head.guardianRank,
    characters: latest.map((doc) => ({
      characterId: doc.characterId,
      className: doc.className,
      light: doc.light,
      subclassName: doc.subclassName,
      emblemUrl: doc.emblemUrl,
      emblemBackgroundUrl: doc.emblemBackgroundUrl,
      titleName: doc.titleName,
      minutesPlayedTotal: doc.minutesPlayedTotal,
      artifactPower: doc.artifactPower,
      equipped: (doc.equipped ?? []).filter((slot) => SLOT_LABELS[slot.bucket]),
    })),
    activityClears: mergeClears(latest.flatMap((doc) => doc.activityClears ?? [])),
    weaponKills: [...(head.weaponKills ?? [])]
      .filter((weapon) => weapon.name?.trim() && weapon.kills > 0)
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 5),
    recentHistory,
    trend: buildSnapshotTrend(docs),
    guidesFirstClears: sherpaPoints > 0,
  }
}
