import {
  getActivityHistory,
  getDestinyEntityDefinition,
  getPlayerProfile,
  getUniqueWeaponStats,
} from '@/lib/destiny/bungieClient'
import {
  cleanManifestName,
  parseActivityHistory,
  parseCharacterSnapshotProfile,
  parseWeaponKills,
  primaryCharacter,
  shouldCaptureSnapshot,
  utcDayKey,
  type CharacterSnapshotDoc,
  type StoredActivityClear,
  type StoredHistoryEntry,
  type StoredWeaponKill,
} from '@/lib/destiny/characterSnapshot'
import { latestSnapshotCapturedAt, saveCharacterSnapshots } from '@/lib/destiny/characterSnapshotStore'
import { getValidAccessToken, listOauthDestinyUsers } from '@/lib/destiny/destinyUserStore'
import { resolveActivityByHash, resolveInventoryItem } from '@/lib/destiny/manifest'

const PROFILE_COMPONENTS = [100, 104, 200, 202, 205, 800, 900]
const PROFILE_FALLBACK = [100, 200, 202, 205]
const HISTORY_COUNT = 25
const CALL_GAP_MS = 280
const NAME_GAP_MS = 120
const CRON_GAP_MS = 900
const MAX_CAPTURES = 6
const SCAN_LIMIT = 24

function pause(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadProfile(membershipType: number, membershipId: string, accessToken: string) {
  try {
    return await getPlayerProfile(membershipType, membershipId, PROFILE_COMPONENTS, accessToken)
  } catch {
    return getPlayerProfile(membershipType, membershipId, PROFILE_FALLBACK, accessToken)
  }
}

async function itemName(hash: number): Promise<string | undefined> {
  try {
    const item = await resolveInventoryItem(hash)
    return cleanManifestName(item.name, hash)
  } catch {
    return undefined
  }
}

async function activityName(hash: number): Promise<string | undefined> {
  try {
    const activity = await resolveActivityByHash(hash)
    return cleanManifestName(activity.name, hash)
  } catch {
    return undefined
  }
}

async function titleName(hash: number | undefined): Promise<string | undefined> {
  if (!hash) return undefined
  try {
    const def = (await getDestinyEntityDefinition('DestinyRecordDefinition', hash)) as {
      titleInfo?: { titlesByGender?: Record<string, string> }
      displayProperties?: { name?: string }
    }
    const titled = def?.titleInfo?.titlesByGender?.Male ?? Object.values(def?.titleInfo?.titlesByGender ?? {})[0]
    return cleanManifestName(titled || def?.displayProperties?.name, hash)
  } catch {
    return undefined
  }
}

/**
 * One profile pull plus a short raid/dungeon history and weapon-kill list.
 * Upserts a row per character for the UTC day. A fresh snapshot skips Bungie entirely.
 */
export async function captureCharacterSnapshot(input: {
  membershipType: number
  membershipId: string
  accessToken: string
  now?: Date
  callGapMs?: number
  nameGapMs?: number
}): Promise<{ saved: number; skipped: boolean }> {
  const now = input.now ?? new Date()
  const callGap = input.callGapMs ?? CALL_GAP_MS
  const nameGap = input.nameGapMs ?? NAME_GAP_MS
  const latest = await latestSnapshotCapturedAt(input.membershipId)
  if (!shouldCaptureSnapshot(latest, now)) return { saved: 0, skipped: true }

  const profile = await loadProfile(input.membershipType, input.membershipId, input.accessToken)
  const parsed = parseCharacterSnapshotProfile(profile)
  const lead = primaryCharacter(parsed.characters)
  if (!lead) return { saved: 0, skipped: false }

  await pause(callGap)
  const weaponsPayload = await getUniqueWeaponStats(
    input.membershipType,
    input.membershipId,
    lead.characterId,
    input.accessToken
  ).catch(() => null)
  await pause(callGap)
  const raidHistory = await getActivityHistory(
    input.membershipType,
    input.membershipId,
    lead.characterId,
    4,
    HISTORY_COUNT,
    input.accessToken
  ).catch(() => null)
  await pause(callGap)
  const dungeonHistory = await getActivityHistory(
    input.membershipType,
    input.membershipId,
    lead.characterId,
    82,
    HISTORY_COUNT,
    input.accessToken
  ).catch(() => null)

  const weaponKills = parseWeaponKills(weaponsPayload)
  const raids = parseActivityHistory(raidHistory, 'raid')
  const dungeons = parseActivityHistory(dungeonHistory, 'dungeon')
  const clears = [...raids.clears, ...dungeons.clears].sort((a, b) => b.clears - a.clears).slice(0, 6)
  const recent = [...raids.recent, ...dungeons.recent]
    .sort((a, b) => (b.period ?? '').localeCompare(a.period ?? ''))
    .slice(0, 8)

  const itemHashes = new Set<number>()
  for (const character of parsed.characters) {
    if (character.subclassHash) itemHashes.add(character.subclassHash)
    for (const slot of character.equipped) {
      if (slot.bucket !== 'subclass') itemHashes.add(slot.itemHash)
    }
  }
  for (const weapon of weaponKills) itemHashes.add(weapon.itemHash)

  const activityHashes = new Set<number>([
    ...clears.map((row) => row.activityHash),
    ...recent.map((row) => row.activityHash),
  ])
  const titleHashes = Array.from(
    new Set(
      parsed.characters
        .map((character) => character.titleRecordHash)
        .filter((hash): hash is number => Boolean(hash))
    )
  ).slice(0, 3)

  const items = new Map<number, string>()
  for (const hash of Array.from(itemHashes).slice(0, 24)) {
    const name = await itemName(hash)
    if (name) items.set(hash, name)
    await pause(nameGap)
  }
  const activities = new Map<number, string>()
  for (const hash of Array.from(activityHashes).slice(0, 8)) {
    const name = await activityName(hash)
    if (name) activities.set(hash, name)
    await pause(nameGap)
  }
  const titles = new Map<number, string>()
  for (const hash of titleHashes) {
    const name = await titleName(hash)
    if (name) titles.set(hash, name)
    await pause(nameGap)
  }

  const namedClears: StoredActivityClear[] = clears
    .map((row) => ({ name: activities.get(row.activityHash) ?? '', mode: row.mode, clears: row.clears }))
    .filter((row) => row.name)
  const namedWeapons: StoredWeaponKill[] = weaponKills
    .map((row) => ({ name: items.get(row.itemHash) ?? '', kills: row.kills }))
    .filter((row) => row.name)
  const namedHistory: StoredHistoryEntry[] = recent
    .map((row) => ({
      name: activities.get(row.activityHash) ?? '',
      mode: row.mode,
      completed: row.completed,
      period: row.period,
    }))
    .filter((row) => row.name)

  const day = utcDayKey(now)
  const capturedAt = now.toISOString()
  const docs: CharacterSnapshotDoc[] = parsed.characters.map((character) => {
    const isLead = character.characterId === lead.characterId
    return {
      membershipId: input.membershipId,
      membershipType: input.membershipType,
      characterId: character.characterId,
      day,
      capturedAt,
      className: character.className,
      light: character.light,
      subclassName: character.subclassHash ? items.get(character.subclassHash) : undefined,
      emblemUrl: character.emblemUrl,
      emblemBackgroundUrl: character.emblemBackgroundUrl,
      titleName: character.titleRecordHash ? titles.get(character.titleRecordHash) : undefined,
      minutesPlayedTotal: character.minutesPlayedTotal,
      guardianRank: parsed.guardianRank,
      artifactPower: character.artifactPower,
      triumphScore: parsed.triumphScore,
      collectionsOwned: parsed.collectionsOwned,
      equipped: character.equipped
        .filter((slot) => slot.bucket !== 'subclass')
        .map((slot) => ({ bucket: slot.bucket, name: items.get(slot.itemHash) })),
      activityClears: isLead ? namedClears : [],
      weaponKills: isLead ? namedWeapons : [],
      recentHistory: isLead ? namedHistory : [],
    }
  })

  const saved = await saveCharacterSnapshots(docs)
  return { saved, skipped: false }
}

/** A few linked accounts per run, with a pause after each live Bungie capture. */
export async function refreshDueCharacterSnapshots(options?: {
  now?: Date
  maxCaptures?: number
  scanLimit?: number
  callGapMs?: number
  cronGapMs?: number
}): Promise<{ refreshed: number; skipped: number; failed: number }> {
  const maxCaptures = options?.maxCaptures ?? MAX_CAPTURES
  const users = await listOauthDestinyUsers(options?.scanLimit ?? SCAN_LIMIT)
  let refreshed = 0
  let skipped = 0
  let failed = 0
  for (const user of users) {
    if (refreshed >= maxCaptures) break
    const membershipType = user.destinyMembershipType
    const membershipId = user.bungieMembershipId
    if (!membershipType || !membershipId) continue
    const accessToken = await getValidAccessToken(user)
    if (!accessToken) {
      failed += 1
      continue
    }
    try {
      const result = await captureCharacterSnapshot({
        membershipType,
        membershipId,
        accessToken,
        now: options?.now,
        callGapMs: options?.callGapMs,
      })
      if (result.skipped) {
        skipped += 1
      } else {
        refreshed += 1
        await pause(options?.cronGapMs ?? CRON_GAP_MS)
      }
    } catch (error) {
      console.warn('[character-snapshots] refresh failed', membershipId, error)
      failed += 1
    }
  }
  return { refreshed, skipped, failed }
}
