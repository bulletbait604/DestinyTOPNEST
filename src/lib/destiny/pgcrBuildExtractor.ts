/**
 * Extract player loadout snapshots from Bungie PGCR extended weapon data.
 * Weapon hashes resolve via manifest (Phase 4 build intelligence).
 */

import { resolveInventoryBucketHash } from '@/lib/destiny/guardianBuild'
import { resolveInventoryItem } from '@/lib/destiny/manifest'
import type {
  BuildSnapshot,
  DestinyCharacterClass,
  Difficulty,
  RunRecord,
} from '@/lib/destiny/types'

interface PgcrWeapon {
  referenceId?: number
}

interface PgcrEntry {
  player?: {
    destinyUserInfo?: {
      membershipId?: number | string
      displayName?: string
    }
    characterClass?: string
    classHash?: number
  }
  characterClass?: string
  extended?: {
    weapons?: PgcrWeapon[]
    values?: Record<string, unknown>
  }
  values?: {
    deaths?: number
    kills?: number
  }
}

export interface PgcrPayload {
  activityDurationInSeconds?: number
  period?: string
  entries?: PgcrEntry[]
}

const CLASS_FROM_HASH: Record<number, DestinyCharacterClass> = {
  3655393761: 'titan',
  671679754: 'hunter',
  2271682572: 'warlock',
}

const WEAPON_BUCKETS: Record<number, 'kinetic' | 'energy' | 'power'> = {
  1498876634: 'kinetic',
  2465295065: 'energy',
  953998645: 'power',
}

const ARMOR_BUCKETS = new Set([14239492, 3551918588, 20886954, 1585787867, 2280036563])

function parseClass(entry: PgcrEntry): DestinyCharacterClass {
  const classHash = entry.player?.classHash
  if (classHash && CLASS_FROM_HASH[classHash]) return CLASS_FROM_HASH[classHash]
  const key = (entry.characterClass ?? entry.player?.characterClass ?? 'hunter').toLowerCase()
  if (key === 'titan' || key === 'warlock' || key === 'hunter') return key
  return 'hunter'
}

async function bucketPgcrWeapons(
  weapons: Array<{ name: string; tier?: string; hash: number }>
): Promise<{
  kinetic: string
  energy: string
  power: string
  exoticWeapon?: string
  exoticArmor: string
}> {
  let kinetic = 'Unknown kinetic'
  let energy = 'Unknown energy'
  let power = 'Unknown power'
  let exoticWeapon: string | undefined
  let exoticArmor = 'Unknown exotic'

  const weaponOnly: typeof weapons = []

  for (const weapon of weapons) {
    const bucket = await resolveInventoryBucketHash(weapon.hash)
    const isExotic = weapon.tier?.toLowerCase() === 'exotic'

    if (bucket && ARMOR_BUCKETS.has(bucket)) {
      if (isExotic) exoticArmor = weapon.name
      continue
    }

    weaponOnly.push(weapon)

    const slot = bucket ? WEAPON_BUCKETS[bucket] : undefined
    if (slot === 'kinetic') kinetic = weapon.name
    else if (slot === 'energy') energy = weapon.name
    else if (slot === 'power') power = weapon.name
    else if (isExotic && !exoticWeapon) exoticWeapon = weapon.name
  }

  const bucketed =
    kinetic !== 'Unknown kinetic' || energy !== 'Unknown energy' || power !== 'Unknown power'

  if (!bucketed && weaponOnly.length) {
    const exotics = weaponOnly.filter((w) => w.tier?.toLowerCase() === 'exotic')
    if (exotics[0]) exoticWeapon = exotics[0].name

    const legendaries = weaponOnly.filter((w) => w.tier?.toLowerCase() !== 'exotic')
    if (legendaries[0]) kinetic = legendaries[0].name
    if (legendaries[1]) energy = legendaries[1].name
    if (legendaries[2]) power = legendaries[2].name

    if (weaponOnly.length === 3 && !exoticWeapon) {
      kinetic = weaponOnly[0]?.name ?? kinetic
      energy = weaponOnly[1]?.name ?? energy
      power = weaponOnly[2]?.name ?? power
    }
  }

  return { kinetic, energy, power, exoticWeapon, exoticArmor }
}

export function parsePgcrDurationSeconds(pgcr: PgcrPayload): number {
  if (typeof pgcr.activityDurationInSeconds === 'number' && pgcr.activityDurationInSeconds > 0) {
    return pgcr.activityDurationInSeconds
  }

  for (const entry of pgcr.entries ?? []) {
    const values = entry.extended?.values ?? entry.values
    if (!values || typeof values !== 'object') continue
    const raw = (values as Record<string, unknown>).activityDurationSeconds
    if (typeof raw === 'number' && raw > 0) return raw
  }

  return 0
}

export async function extractBuildFromPgcr(
  pgcr: PgcrPayload,
  run: RunRecord,
  ownerMembershipId: string
): Promise<BuildSnapshot | null> {
  const entry = (pgcr.entries ?? []).find(
    (e) => String(e.player?.destinyUserInfo?.membershipId ?? '') === String(ownerMembershipId)
  )
  if (!entry) return null

  const weaponRows = entry.extended?.weapons ?? []
  if (!weaponRows.length) return null

  const resolved = await Promise.all(
    weaponRows
      .filter((w) => w.referenceId && w.referenceId > 0)
      .map(async (w) => {
        const info = await resolveInventoryItem(w.referenceId!, `Weapon ${w.referenceId}`)
        return { name: info.name, tier: info.tierLabel, hash: w.referenceId! }
      })
  )

  if (!resolved.length) return null

  const slots = await bucketPgcrWeapons(resolved)
  const characterClass = parseClass(entry)
  const deaths = entry.values?.deaths ?? 0

  const buildKey = [
    characterClass,
    slots.exoticArmor,
    slots.exoticWeapon ?? '',
    slots.kinetic,
    slots.energy,
    slots.power,
  ].join('|')

  return {
    id: `build-${run.id}-${ownerMembershipId}`,
    runId: run.id,
    userId: run.ownerUserId ?? '',
    characterClass,
    subclass: 'Unknown',
    super: 'Unknown',
    aspects: [],
    fragments: [],
    abilities: ['—', '—', '—', '—', '—'],
    exoticArmor: slots.exoticArmor,
    exoticWeapon: slots.exoticWeapon,
    kineticWeapon: slots.kinetic,
    energyWeapon: slots.energy,
    powerWeapon: slots.power,
    armorMods: [],
    artifactPerks: [],
    stats: {},
    activityId: run.activityId,
    activityName: run.activityName,
    difficulty: run.difficulty as Difficulty,
    completedAt: run.completedAt,
    durationSeconds: run.durationSeconds,
    deaths,
    fireteamComposition: run.isFullClanTeam ? 'full_clan' : run.clanMemberCount > 1 ? 'mixed' : 'pickup',
    buildSignature: buildKey,
    verificationStatus: run.verificationStatus,
  }
}
