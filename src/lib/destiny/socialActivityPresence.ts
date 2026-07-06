import { getPlayerProfile } from '@/lib/destiny/bungieClient'
import { resolveActivityByHash } from '@/lib/destiny/manifest'
import type { OnlineSocialMember } from '@/lib/destiny/types'

const ACTIVITY_CHUNK = 4
const MAX_ACTIVITY_LOOKUPS = 28

type CharacterActivitiesRow = {
  currentActivityHash?: number
  currentPlaylistActivityHash?: number
}

type ProfileWithActivities = {
  characterActivities?: {
    data?: Record<string, CharacterActivitiesRow>
  }
}

function pickActivityHash(rows: CharacterActivitiesRow[]): number | undefined {
  for (const row of rows) {
    const playlist = row.currentPlaylistActivityHash
    if (playlist && playlist > 0) return playlist
  }
  for (const row of rows) {
    const activity = row.currentActivityHash
    if (activity && activity > 0) return activity
  }
  return undefined
}

export async function fetchMemberCurrentActivity(
  membershipType: number,
  membershipId: string,
  accessToken?: string
): Promise<string | undefined> {
  try {
    const profile = (await getPlayerProfile(
      membershipType,
      membershipId,
      [100, 204],
      accessToken
    )) as ProfileWithActivities

    const hash = pickActivityHash(Object.values(profile.characterActivities?.data ?? {}))
    if (!hash) return undefined

    const def = await resolveActivityByHash(hash)
    const name = def.name?.trim()
    return name && name !== `Activity ${hash}` ? name : undefined
  } catch {
    return undefined
  }
}

function memberActivityPriority(member: OnlineSocialMember): number {
  if (member.inDestiny) return 0
  if (member.membershipType != null) return 1
  return 2
}

/** Batch-resolve current in-game activity names for online social members. */
export async function enrichMembersWithCurrentActivity(
  members: OnlineSocialMember[],
  accessToken?: string,
  maxLookups = MAX_ACTIVITY_LOOKUPS
): Promise<OnlineSocialMember[]> {
  if (!accessToken || !members.length) return members

  const queue = [...members]
    .filter((m) => m.membershipType != null)
    .sort((a, b) => memberActivityPriority(a) - memberActivityPriority(b))

  const targets: OnlineSocialMember[] = []
  const seen = new Set<string>()
  for (const member of queue) {
    if (targets.length >= maxLookups) break
    if (seen.has(member.membershipId)) continue
    seen.add(member.membershipId)
    targets.push(member)
  }

  const activityByMembershipId = new Map<string, string>()

  for (let i = 0; i < targets.length; i += ACTIVITY_CHUNK) {
    const chunk = targets.slice(i, i + ACTIVITY_CHUNK)
    await Promise.all(
      chunk.map(async (member) => {
        const activity = await fetchMemberCurrentActivity(
          member.membershipType!,
          member.membershipId,
          accessToken
        )
        if (activity) activityByMembershipId.set(member.membershipId, activity)
      })
    )
  }

  return members.map((member) => {
    const currentActivity = activityByMembershipId.get(member.membershipId)
    if (!currentActivity) return member
    return {
      ...member,
      currentActivity,
      inDestiny: true,
    }
  })
}

export async function enrichOnlineSocialLists(
  onlineFriends: OnlineSocialMember[],
  onlineClanMembers: OnlineSocialMember[],
  accessToken?: string
): Promise<{ onlineFriends: OnlineSocialMember[]; onlineClanMembers: OnlineSocialMember[] }> {
  const combined = new Map<string, OnlineSocialMember>()
  for (const member of [...onlineFriends, ...onlineClanMembers]) {
    combined.set(member.membershipId, member)
  }

  const enriched = await enrichMembersWithCurrentActivity(
    Array.from(combined.values()),
    accessToken
  )

  const byId = new Map(enriched.map((m) => [m.membershipId, m]))

  return {
    onlineFriends: onlineFriends.map((m) => byId.get(m.membershipId) ?? m),
    onlineClanMembers: onlineClanMembers.map((m) => byId.get(m.membershipId) ?? m),
  }
}
