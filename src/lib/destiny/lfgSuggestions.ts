import type { FireteamLobby } from '@/lib/destiny/types'

export interface LfgCandidate {
  membershipId: string
  displayName: string
  siteUserId?: string
  source: 'open_lobby' | 'recent_player'
  lobbyId?: string
  activityName?: string
  lastActiveAt?: string
  newBond: boolean
}

export interface LfgLobbySuggestion {
  lobby: FireteamLobby
  /** Members in this lobby you've never cleared with. */
  newFaces: number
  score: number
}

/**
 * Rank open lobbies for the viewer: prefer rooms full of people you have never
 * cleared with (New Bonds potential), then rooms with free slots, then recency.
 */
export function rankLobbiesForNewBonds(
  lobbies: FireteamLobby[],
  viewerUserId: string,
  bondedSiteUserIds: Set<string>
): LfgLobbySuggestion[] {
  return lobbies
    .filter((l) => (l.status === 'open' || l.status === 'in_progress') && l.hostUserId !== viewerUserId)
    .filter((l) => !(l.memberUserIds ?? []).includes(viewerUserId))
    .map((lobby) => {
      const people = [lobby.hostUserId, ...(lobby.memberUserIds ?? [])]
      const newFaces = people.filter((id) => !bondedSiteUserIds.has(id)).length
      const freeSlots = Math.max(0, lobby.maxPlayers - lobby.currentPlayers)
      const ageHours = (Date.now() - Date.parse(lobby.createdAt)) / 3.6e6
      const score = newFaces * 10 + (freeSlots > 0 ? 5 : -50) - Math.min(10, Math.max(0, ageHours))
      return { lobby, newFaces, score }
    })
    .sort((a, b) => b.score - a.score)
}

/** Recently active site players you have not bonded with yet. */
export function pickNewFriendCandidates(
  players: { userId: string; bungieMembershipId: string; bungieDisplayName: string; updatedAt?: string }[],
  viewerMembershipId: string,
  bonded: Set<string>,
  limit = 12
): LfgCandidate[] {
  return players
    .filter((p) => p.bungieMembershipId && p.bungieMembershipId !== viewerMembershipId && !bonded.has(p.bungieMembershipId))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .slice(0, limit)
    .map((p) => ({
      membershipId: p.bungieMembershipId,
      displayName: p.bungieDisplayName || 'Guardian',
      siteUserId: p.userId,
      source: 'recent_player' as const,
      lastActiveAt: p.updatedAt,
      newBond: true,
    }))
}
